import express from "express";
import multer from "multer";
import { rbac } from "../middleware/rbac.js";
import { parseListQuery } from "../middleware/pagination.js";
import { applyOrgScope } from "../middleware/orgScope.js";
import { buildWhere } from "../utils/filters.js";
import { uploadBufferToS3 } from "../utils/s3.js";
import { Op, Sequelize } from "sequelize";
import { sequelize } from "../config/database.js";
import {
  Job,
  Client,
  User,
  WorkType,
  JobType,
  NatureOfWork,
  JobStatus,
  JobStatusHistory,
  JobChat,
  JobAttachment,
  Role,
  Region,
  Company,
  Vendor,
  Country,
  State,
} from "../models/index.js";

export const jobRouter = express.Router();

// Table description cache and helpers to avoid undefined-column errors
let jobTableDesc = null;
async function getJobTableDesc() {
  if (jobTableDesc) return jobTableDesc;
  try {
    jobTableDesc = await sequelize.getQueryInterface().describeTable("Job");
  } catch {
    jobTableDesc = {};
  }
  return jobTableDesc;
}
async function getJobColumnAvailability() {
  const desc = await getJobTableDesc();
  return {
    estimated_days: !!desc.estimated_days,
    estimated_hours: !!desc.estimated_hours,
    estimated_minutes: !!desc.estimated_minutes,
    job_photo: !!desc.job_photo,
  };
}
async function getJobAttributesList() {
  const desc = await getJobTableDesc();
  const keys = Object.keys(desc || {});
  return keys.length ? keys : undefined; // undefined lets Sequelize default
}

// Ensure days/hours/minutes are present on a job-like object using estimated_duration
function ensureGranularDurationFields(obj) {
  const hasD = Number.isFinite(Number(obj?.estimated_days));
  const hasH = Number.isFinite(Number(obj?.estimated_hours));
  const hasM = Number.isFinite(Number(obj?.estimated_minutes));
  const total = Number(obj?.estimated_duration);
  if ((!hasD || !hasH || !hasM) && Number.isFinite(total)) {
    const d = Math.floor(total / (24 * 60));
    const h = Math.floor((total % (24 * 60)) / 60);
    const m = Math.floor(total % 60);
    if (!hasD) obj.estimated_days = d;
    if (!hasH) obj.estimated_hours = h;
    if (!hasM) obj.estimated_minutes = m;
  }
  return obj;
}

function attachLocationLabels(entity) {
  if (!entity || typeof entity !== "object") return entity;
  const setIfMissing = (target, key, value) => {
    if (target[key] == null && value != null) target[key] = value;
  };
  if (entity.state) {
    setIfMissing(entity, "state_id", entity.state.state_id);
    setIfMissing(entity, "state_name", entity.state.state_name);
  }
  if (entity.country) {
    setIfMissing(entity, "country_id", entity.country.country_id);
    setIfMissing(entity, "country_name", entity.country.country_name);
  }
  delete entity.state;
  delete entity.country;
  return entity;
}

function normalizeChatPayload(chat) {
  if (!chat) return null;
  const plain = chat?.toJSON ? chat.toJSON() : chat;
  const vendor = plain.vendor_author || plain.vendorAuthor;
  const company = plain.company_author || plain.companyAuthor;
  const actorTypeRaw = plain.author_type || plain.actor_type;
  const actorType = actorTypeRaw
    ? String(actorTypeRaw).toLowerCase()
    : company
      ? "company"
      : vendor
        ? "vendor"
        : "user";
  const displayName = plain.author?.name || vendor?.vendor_name || company?.name || null;
  return {
    id: plain.id,
    actor_type: actorType,
    author_type: actorType,
    user_id: plain.user_id ?? null,
    vendor_id: plain.vendor_id ?? vendor?.vendor_id ?? null,
    company_id: plain.company_id ?? company?.company_id ?? null,
    user_name: displayName,
    user_photo: plain.author?.photo || null,
    company_theme_color: company?.theme_color || null,
    company: company
      ? {
          company_id: company.company_id,
          name: company.name,
          theme_color: company.theme_color || null,
        }
      : null,
    vendor: vendor ? { vendor_id: vendor.vendor_id, name: vendor.vendor_name } : null,
    message: plain.message,
    sent_at: plain.createdAt,
  };
}

function normalizeAttachment(att) {
  if (!att) return null;
  const plain = att?.toJSON ? att.toJSON() : att;
  return {
    attachment_id: plain.attachment_id,
    file_name: plain.file_name,
    content_type: plain.content_type,
    file_size: plain.file_size,
    url: plain.url,
    s3_key: plain.s3_key || null,
    uploaded_by: plain.uploaded_by,
    uploaded_at: plain.createdAt,
    remark: plain.remark || null,
    uploader: plain.uploader
      ? {
          user_id: plain.uploader.user_id,
          name: plain.uploader.name,
          photo: plain.uploader.photo,
        }
      : null,
  };
}

async function fetchJobAttachments(jobId) {
  if (!jobId) return [];
  const rows = await JobAttachment.findAll({
    where: { job_id: jobId },
    order: [["createdAt", "DESC"]],
    include: [{ model: User, as: "uploader", attributes: ["user_id", "name", "photo"] }],
  });
  return rows.map((att) => normalizeAttachment(att)).filter(Boolean);
}

const normalizeStatusKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const MAX_JOB_ATTACHMENT_BYTES = Number(
  process.env.JOB_ATTACHMENT_MAX_BYTES || process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024
);
const MAX_JOB_ATTACHMENT_FILES = Number(process.env.JOB_ATTACHMENT_MAX_FILES || 5);
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_JOB_ATTACHMENT_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = [/^image\//i, /^application\//i, /^text\//i];
    if (!allowed.some((rx) => rx.test(file.mimetype))) {
      const err = new Error("Unsupported attachment type");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

const JOB_PHOTO_FIELD_NAMES = ["job_photo", "jobphoto", "jobPhoto"];
const JOB_PHOTO_REMOVE_KEYS = [
  "remove_job_photo",
  "job_photo_remove",
  "job_photo_clear",
  "jobPhotoRemove",
  "jobPhotoClear",
];
const JOB_PHOTO_ALLOWED_MIME = /^image\//i;

const JOB_PHOTO_REMOVE_VALUES = new Set(["1", "true", "yes", "y", "remove", "clear"]);

function getJobPhotoKeyPrefix() {
  return process.env.S3_KEY_PREFIX_JOB_PHOTO || "uploads/jobs/photo/";
}

function findJobPhotoFile(files) {
  if (!Array.isArray(files) || !files.length) return null;
  return (
    files.find((file) => {
      const field = String(file?.fieldname || "").toLowerCase();
      return JOB_PHOTO_FIELD_NAMES.includes(field);
    }) || null
  );
}

function coerceTruthyFlag(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "number") return value === 1;
  const normalized = String(value).trim().toLowerCase();
  return JOB_PHOTO_REMOVE_VALUES.has(normalized);
}

function consumeJobPhotoRemovalFlag(target = {}) {
  let shouldRemove = false;
  for (const key of JOB_PHOTO_REMOVE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      if (coerceTruthyFlag(target[key])) shouldRemove = true;
      delete target[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(target, "job_photo")) {
    const value = target.job_photo;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        delete target.job_photo;
        shouldRemove = true;
      } else {
        target.job_photo = trimmed;
      }
    } else if (value == null) {
      delete target.job_photo;
      shouldRemove = true;
    }
  }
  return shouldRemove;
}

async function applyJobPhotoMutation({ files, target, allowPersistPhoto }) {
  if (!target) return;
  const shouldRemove = consumeJobPhotoRemovalFlag(target);
  if (!allowPersistPhoto) {
    delete target.job_photo;
    return;
  }
  const file = findJobPhotoFile(files);
  if (file) {
    if (!JOB_PHOTO_ALLOWED_MIME.test(file.mimetype || "")) {
      const err = new Error("Job photo must be an image file");
      err.status = 400;
      throw err;
    }
    const upload = await uploadBufferToS3({
      buffer: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
      keyPrefix: getJobPhotoKeyPrefix(),
    });
    target.job_photo = upload.url;
    return;
  }
  if (shouldRemove) {
    target.job_photo = null;
  } else if (target.job_photo === undefined) {
    delete target.job_photo;
  }
}

async function saveJobAttachments({ jobId, files, actorId, keyPrefix, defaultRemark }) {
  const items = Array.isArray(files) ? files.filter((f) => f && f.buffer) : [];
  if (!items.length) return [];
  if (items.length > MAX_JOB_ATTACHMENT_FILES) {
    const err = new Error(`Too many attachments (max ${MAX_JOB_ATTACHMENT_FILES})`);
    err.status = 400;
    throw err;
  }
  const prefix =
    keyPrefix || process.env.S3_KEY_PREFIX_JOB_ATTACHMENTS || "uploads/jobs/attachments/";
  const created = [];
  for (const file of items) {
    const { buffer, mimetype, originalname, size } = file;
    const remark =
      typeof file?.remark === "string" && file.remark.trim()
        ? file.remark.trim()
        : typeof defaultRemark === "string" && defaultRemark.trim()
          ? defaultRemark.trim()
          : null;
    const result = await uploadBufferToS3({
      buffer,
      contentType: mimetype,
      filename: originalname,
      keyPrefix: prefix,
    });
    const attachment = await JobAttachment.create({
      job_id: jobId,
      file_name: originalname,
      content_type: result.contentType || mimetype,
      file_size: size,
      url: result.url,
      s3_key: result.key,
      uploaded_by: actorId || null,
      remark,
    });
    await attachment.reload({
      include: [{ model: User, as: "uploader", attributes: ["user_id", "name", "photo"] }],
    });
    created.push(normalizeAttachment(attachment));
  }
  return created;
}

function normalizeAttachmentMetadata(raw) {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      list = parsed;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const url = typeof item.url === "string" ? item.url.trim() : null;
      const key = typeof item.key === "string" ? item.key.trim() : null;
      if (!url && !key) return null;
      const deriveName = () => {
        if (typeof item.name === "string" && item.name.trim()) return item.name.trim();
        if (key) return key.split("/").pop();
        if (url) {
          try {
            const pathname = new URL(url).pathname;
            const parts = pathname.split("/").filter(Boolean);
            return parts[parts.length - 1] || "attachment";
          } catch {
            return url.split("/").pop() || "attachment";
          }
        }
        return "attachment";
      };
      const contentType =
        typeof item.contentType === "string"
          ? item.contentType
          : typeof item.content_type === "string"
            ? item.content_type
            : typeof item.mimeType === "string"
              ? item.mimeType
              : typeof item.mimetype === "string"
                ? item.mimetype
                : null;
      const fileSize =
        typeof item.file_size === "number"
          ? item.file_size
          : typeof item.size === "number"
            ? item.size
            : null;
      return {
        url,
        s3_key: key || null,
        file_name: deriveName(),
        content_type: contentType,
        file_size: fileSize,
        remark: typeof item.remark === "string" && item.remark.trim() ? item.remark.trim() : null,
      };
    })
    .filter(Boolean);
}

async function saveAttachmentMetadataRecords({ jobId, attachments, actorId, defaultRemark }) {
  if (!jobId || !Array.isArray(attachments) || !attachments.length) return [];
  const created = [];
  for (const att of attachments) {
    if (!att?.url && !att?.s3_key) continue;
    const payload = {
      job_id: jobId,
      url: att.url,
      s3_key: att.s3_key || null,
      file_name: att.file_name || "attachment",
      content_type: att.content_type || null,
      file_size: att.file_size ?? null,
      uploaded_by: actorId || null,
      remark:
        typeof att.remark === "string" && att.remark.trim()
          ? att.remark.trim()
          : typeof defaultRemark === "string" && defaultRemark.trim()
            ? defaultRemark.trim()
            : null,
    };
    const row = await JobAttachment.create(payload);
    created.push(row);
  }
  return created;
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function buildJobIdentifierClause(rawId) {
  const id = String(rawId ?? "").trim();
  if (!id || !UUID_REGEX.test(id)) return null;
  return { job_id: id.toLowerCase() };
}

/**
 * GET /jobs
 * Query params supported:
 * - searchParam                (fuzzy)    -> on reference_number (add more if your schema has them)
 * - client_id, worktype_id, jobtype_id, supervisor_id, technician_id, now_id, job_status_id (exact)
 * - from, to                   (ISO date) -> filters scheduledDateAndTime between [from, to]
 * - page, limit, sortBy, order
 */
jobRouter.get(
  "/",
  rbac("Manage Job", "view"),
  parseListQuery,
  applyOrgScope,
  async (req, res, next) => {
    try {
      const { limit, offset, sortBy, order, page } = req.listQuery;

      // Fuzzy fields: keep conservative (reference_number exists for sure)
      const searchFields = ["reference_number"];
      const exactFields = [
        "client_id",
        "worktype_id",
        "jobtype_id",
        "supervisor_id",
        "technician_id",
        "now_id",
        "job_status_id",
      ];

      const whereBase = buildWhere(req.query, searchFields, exactFields);

      // Allow direct job_id matches when full UUID provided
      const sp = String(req.query.searchParam || "").trim();
      if (sp && UUID_REGEX.test(sp)) {
        const orArr = whereBase[Op.or] || [];
        orArr.push({ job_id: sp.toLowerCase() });
        whereBase[Op.or] = orArr;
      }

      // Additional text filters: client name, assignee name, region name
      const clientName = String(req.query.client_name || "")
        .trim()
        .toLowerCase();
      const assigneeName = String(req.query.assignee_name || "")
        .trim()
        .toLowerCase();
      const regionName = String(req.query.region || "")
        .trim()
        .toLowerCase();

      // Date range on scheduledDateAndTime
      if (req.query.from || req.query.to) {
        whereBase.scheduledDateAndTime = {};
        if (req.query.from) whereBase.scheduledDateAndTime[Op.gte] = new Date(req.query.from);
        if (req.query.to) whereBase.scheduledDateAndTime[Op.lte] = new Date(req.query.to);
      }

      const andConds = [];
      // Restrict technicians to only their assigned or supervised jobs (based on token)
      const roleSlug = String(req.user?.role_slug || "")
        .trim()
        .toLowerCase();
      if (roleSlug === "technician") {
        const actorId = req.user?.sub || req.user?.user_id;
        if (actorId) {
          andConds.push({
            [Op.or]: [{ technician_id: actorId }, { supervisor_id: actorId }],
          });
        }
      }
      if (clientName) {
        andConds.push({
          [Op.or]: [
            Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("client.firstName")), {
              [Op.like]: `%${clientName}%`,
            }),
            Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("client.lastName")), {
              [Op.like]: `%${clientName}%`,
            }),
          ],
        });
      }

      if (assigneeName) {
        andConds.push({
          [Op.or]: [
            Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("technician.name")), {
              [Op.like]: `%${assigneeName}%`,
            }),
            Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("supervisor.name")), {
              [Op.like]: `%${assigneeName}%`,
            }),
          ],
        });
      }

      // Region filter by name -> resolve to region_ids then filter technician/supervisor.region_id
      if (regionName) {
        try {
          const regions = await Region.findAll({
            where: Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("region_name")), {
              [Op.like]: `%${regionName}%`,
            }),
            attributes: ["region_id"],
          });
          const regionIds = regions.map((r) => r.region_id);
          if (regionIds.length) {
            andConds.push({
              [Op.or]: [
                Sequelize.where(Sequelize.col("technician.region_id"), { [Op.in]: regionIds }),
                Sequelize.where(Sequelize.col("supervisor.region_id"), { [Op.in]: regionIds }),
              ],
            });
          } else {
            // No matching regions -> force empty result
            andConds.push({ job_id: null });
          }
        } catch {
          /* ignore region filter errors */
        }
      }

      // Exact ID filters from FE (assignee_id -> match either technician or supervisor)
      if (req.query.assignee_id) {
        andConds.push({
          [Op.or]: [
            { technician_id: req.query.assignee_id },
            { supervisor_id: req.query.assignee_id },
          ],
        });
      }

      if (req.query.region_id) {
        andConds.push({
          [Op.or]: [
            Sequelize.where(Sequelize.col("technician.region_id"), req.query.region_id),
            Sequelize.where(Sequelize.col("supervisor.region_id"), req.query.region_id),
          ],
        });
      }

      // Safe sort fallback
      const attrs = Job.getAttributes ? Job.getAttributes() : {};
      const safeSort = attrs?.[sortBy]
        ? sortBy
        : attrs?.createdAt
          ? "createdAt"
          : Object.keys(attrs)[0];

      const where = {
        ...whereBase,
        ...(req.scopeWhere || {}),
        ...(andConds.length ? { [Op.and]: andConds } : {}),
      };

      const include = [
        { model: Client, as: "client" },
        { model: User, as: "technician", attributes: { exclude: ["password"] } },
        { model: User, as: "supervisor", attributes: { exclude: ["password"] } },
        { model: WorkType, as: "work_type" },
        { model: JobType, as: "job_type" },
        { model: NatureOfWork, as: "nature_of_work" },
        { model: JobStatus, as: "job_status" },
      ];

      const jobAttrs = await getJobAttributesList();
      const { rows, count } = await Job.findAndCountAll({
        where,
        limit,
        offset,
        order: [[safeSort, order]],
        include,
        attributes: jobAttrs,
      });

      const data = rows.map((r) => {
        const o = r?.toJSON ? r.toJSON() : r;
        ensureGranularDurationFields(o);
        if (o?.technician) delete o.technician.password;
        if (o?.supervisor) delete o.supervisor.password;
        return o;
      });

      res.json({ data, page, limit, total: count });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /jobs/summary:
 *   get:
 *     summary: Summary counts of jobs for the logged-in context
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 yet_to_accept:
 *                   type: integer
 *                   description: Jobs with status Not Started
 *                 total_jobs:
 *                   type: integer
 *                   description: Jobs with status Assigned Tech
 *                 completed:
 *                   type: integer
 *                   description: Jobs with status Completed
 *                 panding:
 *                   type: integer
 *                   description: Jobs with status EnRoute, OnSite, or OnHold
 */
jobRouter.get("/summary", rbac("Manage Job", "view"), applyOrgScope, async (req, res, next) => {
  try {
    const roleSlug = String(req.user?.role_slug || "")
      .trim()
      .toLowerCase();
    const actorId = req.user?.sub || req.user?.user_id;

    // Map status titles -> IDs
    const statuses = await JobStatus.findAll({ where: { status: true } });
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    const idByKey = Object.fromEntries(
      statuses.map((s) => [norm(s.job_status_title), s.job_status_id])
    );

    const notStartedId = idByKey["notstarted"];
    const completedId = idByKey["completed"];
    const cancelledId = idByKey["cancelled"];
    const rejectedId = idByKey["rejected"];
    const assignedTechId = idByKey["assignedtech"];
    const pendingSet = [idByKey["enroute"], idByKey["onsite"], idByKey["onhold"]].filter(Boolean);

    // Base where respecting org scope
    const baseWhere = { ...(req.scopeWhere || {}) };
    // Restrict technicians to their assigned/supervised jobs
    if (roleSlug === "technician" && actorId) {
      baseWhere[Op.or] = [{ technician_id: actorId }, { supervisor_id: actorId }];
    }

    // yet_to_accept: Not Started
    const yetToAccept = notStartedId
      ? await Job.count({ where: { ...baseWhere, job_status_id: notStartedId } })
      : 0;

    // completed: Completed
    const completed = completedId
      ? await Job.count({ where: { ...baseWhere, job_status_id: completedId } })
      : 0;

    // total_jobs: Assigned Tech
    const total_jobs = assignedTechId
      ? await Job.count({ where: { ...baseWhere, job_status_id: assignedTechId } })
      : 0;

    // pending: EnRoute, OnSite, OnHold
    const pending = pendingSet.length
      ? await Job.count({ where: { ...baseWhere, job_status_id: { [Op.in]: pendingSet } } })
      : 0;

    // overdue: scheduledDateAndTime + estimated duration < now and not in terminal statuses
    const jobDesc = await getJobTableDesc();
    const durationSegments = [];
    if (jobDesc?.estimated_days) {
      durationSegments.push(`COALESCE("Job"."estimated_days", 0) * 24 * 60`);
    }
    if (jobDesc?.estimated_hours) {
      durationSegments.push(`COALESCE("Job"."estimated_hours", 0) * 60`);
    }
    if (jobDesc?.estimated_minutes) {
      durationSegments.push(`COALESCE("Job"."estimated_minutes", 0)`);
    }
    const fallbackDurationExpr = durationSegments.length ? durationSegments.join(" + ") : "0";
    const durationExpr = jobDesc?.estimated_duration
      ? `COALESCE("Job"."estimated_duration", ${fallbackDurationExpr})`
      : fallbackDurationExpr;
    const deadlineExpr = `"Job"."scheduledDateAndTime" + (${durationExpr} * INTERVAL '1 minute')`;

    const now = new Date();
    const excludeSet = [completedId, cancelledId, rejectedId].filter(Boolean);
    const overdueWhere = {
      ...baseWhere,
      scheduledDateAndTime: { [Op.ne]: null },
      ...(excludeSet.length ? { job_status_id: { [Op.notIn]: excludeSet } } : {}),
    };
    const overdueCondition = Sequelize.where(Sequelize.literal(deadlineExpr), { [Op.lt]: now });
    if (overdueWhere[Op.and]) {
      overdueWhere[Op.and] = Array.isArray(overdueWhere[Op.and])
        ? [...overdueWhere[Op.and], overdueCondition]
        : [overdueWhere[Op.and], overdueCondition];
    } else {
      overdueWhere[Op.and] = [overdueCondition];
    }
    const overdue = await Job.count({
      where: overdueWhere,
    });

    res.json({ yet_to_accept: yetToAccept, total_jobs, completed, pending, overdue });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /jobs
 * - Org scoping: non-super_admin company_id is forced from token.
 * - reference_number auto-generated if absent.
 * - Supports optional job_photo upload (multipart).
 * - Creates a JobStatusHistory entry when an initial job_status_id is provided.
 */
jobRouter.post(
  "/",
  rbac("Manage Job", "add"),
  applyOrgScope,
  attachmentUpload.any(),
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      const files = Array.isArray(req.files) ? req.files : [];
      const columnAvailability = await getJobColumnAvailability();
      await applyJobPhotoMutation({
        files,
        target: body,
        allowPersistPhoto: columnAvailability.job_photo,
      });

      if (req.user?.role_slug !== "super_admin") body.company_id = req.user.company_id;
      const companyId = body.company_id;

      // Require assignment to a technician and supervisor on create
      if (!body.technician_id) {
        const err = new Error("technician_id is required to create a job");
        err.status = 400;
        throw err;
      }
      if (!body.supervisor_id) {
        const err = new Error("supervisor_id is required to create a job");
        err.status = 400;
        throw err;
      }

      // Validate technician exists in same company and has technician role
      const technician = await User.findOne({
        where: { user_id: body.technician_id, company_id: companyId },
      });
      if (!technician) {
        const err = new Error("technician_id does not exist or is not in the same company");
        err.status = 400;
        throw err;
      }
      if (technician.role_id) {
        const tRole = await Role.findOne({ where: { role_id: technician.role_id } });
        if (!tRole || String(tRole.role_slug || "").toLowerCase() !== "technician") {
          const err = new Error("technician_id must belong to a user with technician role");
          err.status = 400;
          throw err;
        }
      }

      // Validate supervisor exists in same company and has supervisor role
      const supervisor = await User.findOne({
        where: { user_id: body.supervisor_id, company_id: companyId },
      });
      if (!supervisor) {
        const err = new Error("supervisor_id does not exist or is not in the same company");
        err.status = 400;
        throw err;
      }
      if (supervisor.role_id) {
        const sRole = await Role.findOne({ where: { role_id: supervisor.role_id } });
        if (!sRole || String(sRole.role_slug || "").toLowerCase() !== "supervisor") {
          const err = new Error("supervisor_id must belong to a user with supervisor role");
          err.status = 400;
          throw err;
        }
      }

      if (!body.reference_number) {
        // Keep human-friendly reference_number but ensure short numeric ID is also generated by model hook
        body.reference_number = `JOB-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;
      }

      // Default initial job status to "Not Started" if not provided
      if (!body.job_status_id) {
        try {
          const notStarted = await JobStatus.findOne({
            where: {
              status: true,
              [Op.and]: [
                Sequelize.where(
                  Sequelize.fn("LOWER", Sequelize.col("job_status_title")),
                  "not started"
                ),
              ],
            },
          });
          if (notStarted) body.job_status_id = notStarted.job_status_id;
        } catch {
          /* ignore defaulting errors */
        }
      }

      // Normalize estimated duration: accept either (days/hours/minutes) or total minutes
      const hasGranular = ["estimated_days", "estimated_hours", "estimated_minutes"].some(
        (k) => body[k] !== undefined && body[k] !== null
      );

      if (hasGranular) {
        const d = Number.isFinite(Number(body.estimated_days)) ? Number(body.estimated_days) : 0;
        const h = Number.isFinite(Number(body.estimated_hours)) ? Number(body.estimated_hours) : 0;
        const m = Number.isFinite(Number(body.estimated_minutes))
          ? Number(body.estimated_minutes)
          : 0;

        if (
          d < 0 ||
          h < 0 ||
          m < 0 ||
          !Number.isInteger(d) ||
          !Number.isInteger(h) ||
          !Number.isInteger(m)
        ) {
          const err = new Error("estimated_days/hours/minutes must be non-negative integers");
          err.status = 400;
          throw err;
        }
        if (h > 23 || m > 59) {
          const err = new Error("estimated_hours must be 0-23 and estimated_minutes 0-59");
          err.status = 400;
          throw err;
        }
        body.estimated_days = d;
        body.estimated_hours = h;
        body.estimated_minutes = m;
        body.estimated_duration = d * 24 * 60 + h * 60 + m;
      } else if (body.estimated_duration !== undefined && body.estimated_duration !== null) {
        const total = Number(body.estimated_duration);
        if (!Number.isFinite(total) || total < 0) {
          const err = new Error("estimated_duration must be a non-negative number of minutes");
          err.status = 400;
          throw err;
        }
        const d = Math.floor(total / (24 * 60));
        const h = Math.floor((total % (24 * 60)) / 60);
        const m = Math.floor(total % 60);
        body.estimated_days = d;
        body.estimated_hours = h;
        body.estimated_minutes = m;
        body.estimated_duration = Math.floor(total);
      }

      // Drop granular fields if DB columns are not available yet
      if (!columnAvailability.estimated_days) delete body.estimated_days;
      if (!columnAvailability.estimated_hours) delete body.estimated_hours;
      if (!columnAvailability.estimated_minutes) delete body.estimated_minutes;
      if (!columnAvailability.job_photo) delete body.job_photo;

      const created = await Job.create(body, { returning: false });

      // Reload with only existing columns to avoid undefined-column errors
      const jobAttrs = await getJobAttributesList();
      const createdFresh = await Job.findOne({
        where: { job_id: created.job_id },
        attributes: jobAttrs,
      });

      if (created.job_status_id) {
        const statusRow = await JobStatus.findOne({
          where: { job_status_id: created.job_status_id },
        });
        const rawRemark = body.remark ?? body.remarks ?? body.status_remark ?? body.note ?? null;
        const remark = typeof rawRemark === "string" && rawRemark.trim() ? rawRemark.trim() : null;
        await JobStatusHistory.create({
          job_id: created.job_id,
          job_status_id: created.job_status_id,
          is_completed: normalizeStatusKey(statusRow?.job_status_title) === "completed",
          remarks: remark,
        });
      }

      res.status(201).json(createdFresh || created);
    } catch (e) {
      next(e);
    }
  }
);

jobRouter.get(
  "/:id/attachments",
  rbac("Manage Job", "view"),
  applyOrgScope,
  async (req, res, next) => {
    try {
      const idClause = buildJobIdentifierClause(req.params.id);
      if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
      const job = await Job.findOne({
        where: { ...(req.scopeWhere || {}), ...idClause },
        attributes: ["job_id"],
      });
      if (!job) return res.status(404).json({ message: "Not found" });
      const attachments = await fetchJobAttachments(job.job_id);
      res.json(attachments);
    } catch (e) {
      next(e);
    }
  }
);

jobRouter.post(
  "/:id/attachments",
  rbac("Manage Job", "edit"),
  applyOrgScope,
  attachmentUpload.array("files", MAX_JOB_ATTACHMENT_FILES),
  async (req, res, next) => {
    try {
      const idClause = buildJobIdentifierClause(req.params.id);
      if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
      const job = await Job.findOne({
        where: { ...(req.scopeWhere || {}), ...idClause },
        attributes: ["job_id"],
      });
      if (!job) return res.status(404).json({ message: "Not found" });

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        const err = new Error("At least one attachment file is required");
        err.status = 400;
        throw err;
      }

      const actorId = req.user?.sub || req.user?.user_id || null;
      const keyPrefix = process.env.S3_KEY_PREFIX_JOB_ATTACHMENTS || "uploads/jobs/attachments/";
      const created = await saveJobAttachments({
        jobId: job.job_id,
        files,
        actorId,
        keyPrefix,
      });

      res.status(201).json(created);
    } catch (e) {
      if (String(e?.message || "").includes("Unsupported attachment type")) {
        e.status = e.status || 400;
      }
      next(e);
    }
  }
);

jobRouter.delete(
  "/:id/attachments/:attachmentId",
  rbac("Manage Job", "edit"),
  applyOrgScope,
  async (req, res, next) => {
    try {
      const idClause = buildJobIdentifierClause(req.params.id);
      if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
      const job = await Job.findOne({
        where: { ...(req.scopeWhere || {}), ...idClause },
        attributes: ["job_id"],
      });
      if (!job) return res.status(404).json({ message: "Not found" });

      const attachmentId = String(req.params.attachmentId || "").trim();
      if (!UUID_REGEX.test(attachmentId)) {
        return res.status(400).json({ message: "Invalid attachment identifier" });
      }

      const attachment = await JobAttachment.findOne({
        where: { attachment_id: attachmentId, job_id: job.job_id },
      });
      if (!attachment) return res.status(404).json({ message: "Not found" });

      await attachment.destroy();
      res.json({ message: "Deleted" });
    } catch (e) {
      next(e);
    }
  }
);

jobRouter.get("/:id/chats", rbac("Manage Job", "view"), applyOrgScope, async (req, res, next) => {
  try {
    const idClause = buildJobIdentifierClause(req.params.id);
    if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
    const job = await Job.findOne({
      where: { ...(req.scopeWhere || {}), ...idClause },
      attributes: ["job_id", "technician_id", "supervisor_id", "company_id"],
    });
    if (!job) return res.status(404).json({ message: "Not found" });

    const roleSlug = String(req.user?.role_slug || "")
      .trim()
      .toLowerCase();
    const actorId = req.user?.sub || req.user?.user_id;
    if (roleSlug === "technician" && actorId) {
      const jobPlain = job?.toJSON ? job.toJSON() : job;
      if (jobPlain.technician_id !== actorId && jobPlain.supervisor_id !== actorId) {
        return res.status(404).json({ message: "Not found" });
      }
    }

    const messages = await JobChat.findAll({
      where: { job_id: job.job_id },
      order: [["createdAt", "ASC"]],
      attributes: [
        "id",
        "job_id",
        "user_id",
        "vendor_id",
        "company_id",
        "author_type",
        "message",
        "createdAt",
      ],
      include: [
        { model: User, as: "author", attributes: ["user_id", "name", "photo"] },
        { model: Vendor, as: "vendor_author", attributes: ["vendor_id", "vendor_name"] },
        { model: Company, as: "company_author", attributes: ["company_id", "name", "theme_color"] },
      ],
    });

    res.json(messages.map((msg) => normalizeChatPayload(msg)).filter(Boolean));
  } catch (e) {
    next(e);
  }
});

jobRouter.post("/:id/chats", rbac("Manage Job", "view"), applyOrgScope, async (req, res, next) => {
  try {
    const idClause = buildJobIdentifierClause(req.params.id);
    if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
    const job = await Job.findOne({
      where: { ...(req.scopeWhere || {}), ...idClause },
      attributes: ["job_id", "technician_id", "supervisor_id"],
    });
    if (!job) return res.status(404).json({ message: "Not found" });

    const roleSlug = String(req.user?.role_slug || "")
      .trim()
      .toLowerCase();
    const actorId = req.user?.sub || req.user?.user_id;
    if (!actorId) return res.status(401).json({ message: "Unauthenticated" });
    if (roleSlug === "technician") {
      const jobPlain = job?.toJSON ? job.toJSON() : job;
      if (jobPlain.technician_id !== actorId && jobPlain.supervisor_id !== actorId) {
        return res.status(404).json({ message: "Not found" });
      }
    }

    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ message: "Message is required" });
    if (message.length > 2000) return res.status(400).json({ message: "Message too long" });

    const accountType = String(req.user?.type || roleSlug || "")
      .trim()
      .toLowerCase();
    const chatData = {
      job_id: job.job_id,
      message,
      author_type: accountType || "user",
      company_id: null,
      vendor_id: null,
      user_id: null,
    };

    if (accountType === "vendor") {
      chatData.vendor_id = actorId;
      chatData.company_id = req.user?.company_id || job.company_id || null;
    } else if (accountType === "company") {
      chatData.company_id = req.user?.company_id || actorId;
    } else {
      chatData.user_id = actorId;
      chatData.company_id = req.user?.company_id || job.company_id || null;
    }

    if (!chatData.user_id && !chatData.vendor_id && !chatData.company_id) {
      return res.status(400).json({ message: "Unable to determine chat author" });
    }

    const created = await JobChat.create(chatData);
    await created.reload({
      attributes: [
        "id",
        "job_id",
        "user_id",
        "vendor_id",
        "company_id",
        "author_type",
        "message",
        "createdAt",
      ],
      include: [
        { model: User, as: "author", attributes: ["user_id", "name", "photo"] },
        { model: Vendor, as: "vendor_author", attributes: ["vendor_id", "vendor_name"] },
        { model: Company, as: "company_author", attributes: ["company_id", "name", "theme_color"] },
      ],
    });

    res.status(201).json(normalizeChatPayload(created));
  } catch (e) {
    next(e);
  }
});

// moved earlier above the ":id" route to avoid param capture

/**
 * GET /jobs/:id
 * Returns the job plus a normalized status history timeline.
 */
jobRouter.get("/:id", rbac("Manage Job", "view"), applyOrgScope, async (req, res, next) => {
  try {
    const jobAttrs = await getJobAttributesList();
    const idClause = buildJobIdentifierClause(req.params.id);
    if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
    const job = await Job.findOne({
      where: { ...(req.scopeWhere || {}), ...idClause },
      attributes: jobAttrs,
      include: [
        {
          model: Client,
          as: "client",
          include: [
            { model: State, as: "state", attributes: ["state_id", "state_name"], required: false },
            {
              model: Country,
              as: "country",
              attributes: ["country_id", "country_name"],
              required: false,
            },
          ],
        },
        {
          model: User,
          as: "technician",
          attributes: { exclude: ["password"] },
          include: [
            { model: State, as: "state", attributes: ["state_id", "state_name"], required: false },
            {
              model: Country,
              as: "country",
              attributes: ["country_id", "country_name"],
              required: false,
            },
          ],
        },
        {
          model: User,
          as: "supervisor",
          attributes: { exclude: ["password"] },
          include: [
            { model: State, as: "state", attributes: ["state_id", "state_name"], required: false },
            {
              model: Country,
              as: "country",
              attributes: ["country_id", "country_name"],
              required: false,
            },
          ],
        },
        { model: WorkType, as: "work_type" },
        { model: JobType, as: "job_type" },
        { model: NatureOfWork, as: "nature_of_work" },
        { model: JobStatus, as: "job_status" },
        {
          model: JobChat,
          as: "chats",
          separate: true,
          order: [["createdAt", "ASC"]],
          attributes: [
            "id",
            "job_id",
            "user_id",
            "vendor_id",
            "company_id",
            "author_type",
            "message",
            "createdAt",
          ],
          include: [
            { model: User, as: "author", attributes: ["user_id", "name", "photo"] },
            { model: Vendor, as: "vendor_author", attributes: ["vendor_id", "vendor_name"] },
            {
              model: Company,
              as: "company_author",
              attributes: ["company_id", "name", "theme_color"],
            },
          ],
        },
        {
          model: JobAttachment,
          as: "attachments",
          separate: true,
          order: [["createdAt", "DESC"]],
          attributes: [
            "attachment_id",
            "job_id",
            "file_name",
            "content_type",
            "file_size",
            "url",
            "s3_key",
            "uploaded_by",
            "createdAt",
            "remark",
          ],
          include: [{ model: User, as: "uploader", attributes: ["user_id", "name", "photo"] }],
        },
      ],
    });

    if (!job) return res.status(404).json({ message: "Not found" });

    const history = await JobStatusHistory.findAll({
      where: { job_id: job.job_id },
      include: [{ model: JobStatus }],
      order: [["createdAt", "ASC"]],
    });

    const jobPlain = job?.toJSON ? job.toJSON() : job;
    ensureGranularDurationFields(jobPlain);
    attachLocationLabels(jobPlain?.client);
    attachLocationLabels(jobPlain?.technician);
    attachLocationLabels(jobPlain?.supervisor);
    const chats = Array.isArray(jobPlain.chats)
      ? jobPlain.chats.map((chat) => normalizeChatPayload(chat)).filter(Boolean)
      : [];
    let attachments = Array.isArray(jobPlain.attachments)
      ? jobPlain.attachments.map((att) => normalizeAttachment(att)).filter(Boolean)
      : [];
    delete jobPlain.chats;
    delete jobPlain.attachments;
    if (!attachments.length) {
      attachments = await fetchJobAttachments(job.job_id);
    }
    // Build actions based on current status
    const allStatuses = await JobStatus.findAll({ where: { status: true } });
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    const byKey = Object.fromEntries(allStatuses.map((s) => [norm(s.job_status_title), s]));
    const currentKey = norm(jobPlain?.job_status?.job_status_title);

    const actions = [];
    // Accept/Reject from Not Started
    if (currentKey === "notstarted") {
      if (byKey["assignedtech"])
        actions.push({
          action: "accept",
          to_status_id: byKey["assignedtech"].job_status_id,
          to_status_title: byKey["assignedtech"].job_status_title,
        });
      if (byKey["rejected"])
        actions.push({
          action: "reject",
          to_status_id: byKey["rejected"].job_status_id,
          to_status_title: byKey["rejected"].job_status_title,
        });
    } else {
      // After assignment
      const next = ["enroute", "onsite", "completed", "unresolved"];
      for (const k of next) {
        if (byKey[k])
          actions.push({
            action: k,
            to_status_id: byKey[k].job_status_id,
            to_status_title: byKey[k].job_status_title,
          });
      }
      // Toggle hold/resume
      if (currentKey === "onhold") {
        if (byKey["onresume"])
          actions.push({
            action: "resume",
            to_status_id: byKey["onresume"].job_status_id,
            to_status_title: byKey["onresume"].job_status_title,
          });
      } else {
        if (byKey["onhold"])
          actions.push({
            action: "onhold",
            to_status_id: byKey["onhold"].job_status_id,
            to_status_title: byKey["onhold"].job_status_title,
          });
      }
    }

    // Single object with embedded status_history and available actions
    const response = {
      ...jobPlain,
      status_history: history.map((h) => ({
        id: h.id,
        job_status_id: h.job_status_id,
        job_status_title: h.JobStatus?.job_status_title,
        job_status_color_code: h.JobStatus?.job_status_color_code,
        is_completed: h.is_completed,
        remarks: h.remarks ?? null,
        completed: norm(h.JobStatus?.job_status_title) === "completed",
        at: h.createdAt,
      })),
      available_actions: actions,
      chats,
      attachments,
    };
    if (!Array.isArray(response.attachments)) response.attachments = [];
    if (!Array.isArray(response.status_history)) response.status_history = [];
    if (response.status_history.length) {
      response.latest_status_history = response.status_history[response.status_history.length - 1];
      response.latest_remarks = response.latest_status_history?.remarks ?? null;
    } else {
      response.latest_status_history = null;
      response.latest_remarks = null;
    }

    // Ensure no passwords leak in nested users
    if (response.technician) delete response.technician.password;
    if (response.supervisor) delete response.supervisor.password;

    res.json(response);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /jobs/summary:
 *   get:
 *     summary: Summary counts of jobs for the logged-in context
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 yet_to_accept:
 *                   type: integer
 *                 completed:
 *                   type: integer
 *                 overdue:
 *                   type: integer
 *                 waiting_for_submission:
 *                   type: integer
 */
jobRouter.get("/summary", rbac("Manage Job", "view"), applyOrgScope, async (req, res, next) => {
  try {
    const roleSlug = String(req.user?.role_slug || "")
      .trim()
      .toLowerCase();
    const actorId = req.user?.sub || req.user?.user_id;

    // Map status titles -> IDs
    const statuses = await JobStatus.findAll({ where: { status: true } });
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    const idByKey = Object.fromEntries(
      statuses.map((s) => [norm(s.job_status_title), s.job_status_id])
    );

    const notStartedId = idByKey["notstarted"];
    const completedId = idByKey["completed"];
    const cancelledId = idByKey["cancelled"];
    const rejectedId = idByKey["rejected"];
    const waitingSet = [
      idByKey["assignedtech"],
      idByKey["enroute"],
      idByKey["onsite"],
      idByKey["onresume"],
      idByKey["onhold"],
    ].filter(Boolean);

    // Base where respecting org scope
    const baseWhere = { ...(req.scopeWhere || {}) };
    // Restrict technicians to their assigned/supervised jobs
    if (roleSlug === "technician" && actorId) {
      baseWhere[Op.or] = [{ technician_id: actorId }, { supervisor_id: actorId }];
    }

    // yet_to_accept: Not Started
    const yetToAccept = notStartedId
      ? await Job.count({ where: { ...baseWhere, job_status_id: notStartedId } })
      : 0;

    // completed: Completed
    const completed = completedId
      ? await Job.count({ where: { ...baseWhere, job_status_id: completedId } })
      : 0;

    // waiting_for_submission: in waitingSet statuses
    const waiting_for_submission = waitingSet.length
      ? await Job.count({ where: { ...baseWhere, job_status_id: { [Op.in]: waitingSet } } })
      : 0;

    // overdue: scheduledDateAndTime + estimated duration < now and not in terminal statuses
    const jobDesc = await getJobTableDesc();
    const durationSegments = [];
    if (jobDesc?.estimated_days) {
      durationSegments.push(`COALESCE("Job"."estimated_days", 0) * 24 * 60`);
    }
    if (jobDesc?.estimated_hours) {
      durationSegments.push(`COALESCE("Job"."estimated_hours", 0) * 60`);
    }
    if (jobDesc?.estimated_minutes) {
      durationSegments.push(`COALESCE("Job"."estimated_minutes", 0)`);
    }
    const fallbackDurationExpr = durationSegments.length ? durationSegments.join(" + ") : "0";
    const durationExpr = jobDesc?.estimated_duration
      ? `COALESCE("Job"."estimated_duration", ${fallbackDurationExpr})`
      : fallbackDurationExpr;
    const deadlineExpr = `"Job"."scheduledDateAndTime" + (${durationExpr} * INTERVAL '1 minute')`;

    const now = new Date();
    const excludeSet = [completedId, cancelledId, rejectedId].filter(Boolean);
    const overdueWhere = {
      ...baseWhere,
      scheduledDateAndTime: { [Op.ne]: null },
      ...(excludeSet.length ? { job_status_id: { [Op.notIn]: excludeSet } } : {}),
    };
    const overdueCondition = Sequelize.where(Sequelize.literal(deadlineExpr), { [Op.lt]: now });
    if (overdueWhere[Op.and]) {
      overdueWhere[Op.and] = Array.isArray(overdueWhere[Op.and])
        ? [...overdueWhere[Op.and], overdueCondition]
        : [overdueWhere[Op.and], overdueCondition];
    } else {
      overdueWhere[Op.and] = [overdueCondition];
    }
    const overdue = await Job.count({
      where: overdueWhere,
    });

    res.json({ yet_to_accept: yetToAccept, completed, overdue, waiting_for_submission });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /jobs/:id
 * - Updates job fields.
 * - If job_status_id changes, appends a new JobStatusHistory row.
 */
jobRouter.put(
  "/:id",
  rbac("Manage Job", "edit"),
  applyOrgScope,
  attachmentUpload.any(),
  async (req, res, next) => {
    try {
      const idClause = buildJobIdentifierClause(req.params.id);
      if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
      const job = await Job.findOne({
        where: { ...(req.scopeWhere || {}), ...idClause },
      });
      if (!job) return res.status(404).json({ message: "Not found" });

      // Technicians can only access their own assigned/supervised jobs
      const roleSlug = String(req.user?.role_slug || "")
        .trim()
        .toLowerCase();
      const actorId = req.user?.sub || req.user?.user_id;
      if (roleSlug === "technician" && actorId) {
        const j = job?.toJSON ? job.toJSON() : job;
        if (j.technician_id !== actorId && j.supervisor_id !== actorId) {
          return res.status(404).json({ message: "Not found" });
        }
      }

      const prevStatus = job.job_status_id;
      const columnAvailability = await getJobColumnAvailability();

      // Normalize estimated duration on updates
      const updates = { ...req.body };
      const rawFiles = Array.isArray(req.files) ? req.files : [];
      await applyJobPhotoMutation({
        files: rawFiles,
        target: updates,
        allowPersistPhoto: columnAvailability.job_photo,
      });
      const metadataAttachments = normalizeAttachmentMetadata(
        req.body?.attachments ?? req.body?.attachment_metadata ?? null
      );
      delete updates.attachments;
      delete updates.files;
      for (const key of Object.keys(updates)) {
        if (/^files(\[\d*\])?$/i.test(key) || /^attachments(\[\d*\])?$/i.test(key)) {
          delete updates[key];
        }
      }

      const attachmentFiles = rawFiles.filter((file) => {
        const name = String(file?.fieldname || "").toLowerCase();
        return /^files(\[\d*\])?$/.test(name) || /^attachments(\[\d*\])?$/.test(name);
      });
      const hasGranular = ["estimated_days", "estimated_hours", "estimated_minutes"].some(
        (k) => updates[k] !== undefined && updates[k] !== null
      );
      if (hasGranular) {
        const d =
          updates.estimated_days !== undefined
            ? Number(updates.estimated_days)
            : job.estimated_days || 0;
        const h =
          updates.estimated_hours !== undefined
            ? Number(updates.estimated_hours)
            : job.estimated_hours || 0;
        const m =
          updates.estimated_minutes !== undefined
            ? Number(updates.estimated_minutes)
            : job.estimated_minutes || 0;

        if (
          d < 0 ||
          h < 0 ||
          m < 0 ||
          !Number.isInteger(d) ||
          !Number.isInteger(h) ||
          !Number.isInteger(m)
        ) {
          const err = new Error("estimated_days/hours/minutes must be non-negative integers");
          err.status = 400;
          throw err;
        }
        if (h > 23 || m > 59) {
          const err = new Error("estimated_hours must be 0-23 and estimated_minutes 0-59");
          err.status = 400;
          throw err;
        }
        updates.estimated_days = d;
        updates.estimated_hours = h;
        updates.estimated_minutes = m;
        updates.estimated_duration = d * 24 * 60 + h * 60 + m;
      } else if (updates.estimated_duration !== undefined && updates.estimated_duration !== null) {
        const total = Number(updates.estimated_duration);
        if (!Number.isFinite(total) || total < 0) {
          const err = new Error("estimated_duration must be a non-negative number of minutes");
          err.status = 400;
          throw err;
        }
        const d = Math.floor(total / (24 * 60));
        const h = Math.floor((total % (24 * 60)) / 60);
        const m = Math.floor(total % 60);
        updates.estimated_days = d;
        updates.estimated_hours = h;
        updates.estimated_minutes = m;
        updates.estimated_duration = Math.floor(total);
      }

      // Drop granular fields if DB columns are not available yet
      if (!columnAvailability.estimated_days) delete updates.estimated_days;
      if (!columnAvailability.estimated_hours) delete updates.estimated_hours;
      if (!columnAvailability.estimated_minutes) delete updates.estimated_minutes;
      if (!columnAvailability.job_photo) delete updates.job_photo;

      await job.update(updates, { returning: false });

      let newHistoryEntry = null;
      let newStatusRow = null;
      if (req.body.job_status_id && req.body.job_status_id !== prevStatus) {
        newStatusRow = await JobStatus.findOne({
          where: { job_status_id: req.body.job_status_id },
        });
        const statusKey = normalizeStatusKey(newStatusRow?.job_status_title);
        const rawRemark =
          req.body.remark ?? req.body.remarks ?? req.body.status_remark ?? req.body.note ?? null;
        const remark = typeof rawRemark === "string" && rawRemark.trim() ? rawRemark.trim() : null;

        newHistoryEntry = await JobStatusHistory.create({
          job_id: job.job_id,
          job_status_id: req.body.job_status_id,
          is_completed: statusKey === "completed",
          remarks: remark,
        });
      }

      const jobRemark =
        typeof req.body.remark === "string" && req.body.remark.trim()
          ? req.body.remark.trim()
          : null;

      if (attachmentFiles.length) {
        await saveJobAttachments({
          jobId: job.job_id,
          files: attachmentFiles,
          actorId,
          defaultRemark: jobRemark,
        });
      }
      if (metadataAttachments.length) {
        await saveAttachmentMetadataRecords({
          jobId: job.job_id,
          attachments: metadataAttachments,
          actorId,
          defaultRemark: jobRemark,
        });
      }

      const jobAttrs = await getJobAttributesList();
      const reloaded = await Job.findOne({ where: { job_id: job.job_id }, attributes: jobAttrs });

      let payload;
      if (reloaded && typeof reloaded.toJSON === "function") {
        payload = reloaded.toJSON();
      } else if (reloaded) {
        payload = reloaded;
      } else if (job && typeof job.toJSON === "function") {
        payload = job.toJSON();
      } else {
        payload = job;
      }

      payload.attachments = await fetchJobAttachments(job.job_id);
      if (!Array.isArray(payload.attachments)) payload.attachments = [];

      const historyRows = await JobStatusHistory.findAll({
        where: { job_id: job.job_id },
        include: [{ model: JobStatus }],
        order: [["createdAt", "ASC"]],
      });
      payload.status_history = historyRows.map((h) => ({
        id: h.id,
        job_status_id: h.job_status_id,
        job_status_title: h.JobStatus?.job_status_title,
        job_status_color_code: h.JobStatus?.job_status_color_code,
        is_completed: h.is_completed,
        remarks: h.remarks ?? null,
        completed: normalizeStatusKey(h.JobStatus?.job_status_title) === "completed",
        at: h.createdAt,
      }));
      if (!Array.isArray(payload.status_history)) payload.status_history = [];

      let latestHistoryRow = null;
      if (newHistoryEntry) {
        if (!newStatusRow && newHistoryEntry.job_status_id) {
          newStatusRow = await JobStatus.findOne({
            where: { job_status_id: newHistoryEntry.job_status_id },
          });
        }
        const historyEntry = {
          id: newHistoryEntry.id,
          job_status_id: newHistoryEntry.job_status_id,
          is_completed: newHistoryEntry.is_completed,
          remarks: newHistoryEntry.remarks ?? null,
          job_status_title: newStatusRow?.job_status_title,
          job_status_color_code: newStatusRow?.job_status_color_code,
          completed: normalizeStatusKey(newStatusRow?.job_status_title) === "completed",
          at: newHistoryEntry.createdAt,
        };
        latestHistoryRow = historyEntry;
        payload.latest_status_history = historyEntry;
        payload.latest_remarks = historyEntry.remarks ?? null;
      } else {
        const latest = await JobStatusHistory.findOne({
          where: { job_id: job.job_id },
          order: [["createdAt", "DESC"]],
          include: [{ model: JobStatus }],
        });
        if (latest) {
          latestHistoryRow = {
            id: latest.id,
            job_status_id: latest.job_status_id,
            is_completed: latest.is_completed,
            remarks: latest.remarks ?? null,
            job_status_title: latest.JobStatus?.job_status_title,
            job_status_color_code: latest.JobStatus?.job_status_color_code,
            completed: normalizeStatusKey(latest.JobStatus?.job_status_title) === "completed",
            at: latest.createdAt,
          };
          payload.latest_status_history = latestHistoryRow;
          payload.latest_remarks = latestHistoryRow.remarks ?? null;
        } else {
          payload.latest_status_history = null;
          payload.latest_remarks = null;
        }
      }

      res.json(payload);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * DELETE /jobs/:id
 */
jobRouter.delete("/:id", rbac("Manage Job", "delete"), applyOrgScope, async (req, res, next) => {
  try {
    const idClause = buildJobIdentifierClause(req.params.id);
    if (!idClause) return res.status(400).json({ message: "Invalid job identifier" });
    const job = await Job.findOne({
      where: { ...(req.scopeWhere || {}), ...idClause },
    });
    if (!job) return res.status(404).json({ message: "Not found" });

    // Delete within a transaction to avoid FK violations
    await sequelize.transaction(async (t) => {
      await JobStatusHistory.destroy({ where: { job_id: job.job_id }, transaction: t });
      await job.destroy({ transaction: t });
    });

    res.json({ message: "Deleted" });
  } catch (e) {
    next(e);
  }
});
