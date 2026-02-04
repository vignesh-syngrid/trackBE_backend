import express from "express";
import {
  NatureOfWork,
  JobStatus,
  SubscriptionType,
  BusinessType,
  WorkType,
  JobType,
  Region,
  Shift,
  Role,
  Screen,
  RoleScreenPermission,
  User,
  Job,
  Company,
  Vendor,
} from "../models/index.js";
import { rbac } from "../middleware/rbac.js";
import { Sequelize } from "sequelize";
import { buildCrudRoutes } from "../utils/crudFactory.js";
import { Op } from "sequelize";

export const masterRouter = express.Router();

/* ---------- Nature of Work (under Settings) ---------- */
masterRouter.use(
  "/nature-of-work",
  buildCrudRoutes({
    model: NatureOfWork,
    screen: "Settings",
    searchFields: ["now_name"],
    exactFields: ["now_status"],
    statusFieldName: "now_status",
    normalize: (body) => {
      if (typeof body.now_name === "string") body.now_name = body.now_name.trim();
    },
    findExistingWhere: (req) => ({
      now_name: (req.body.now_name || "").trim(),
    }),
  })
);

/* ---------- Job Statuses (under Manage Job) ---------- */
// Ordered list endpoint (ASC by job_status_order)
masterRouter.get("/job-statuses/ordered", rbac("Manage Job", "view"), async (req, res, next) => {
  try {
    const rows = await JobStatus.findAll({ where: { status: true } });
    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
    const desiredOrder = {
      notstarted: 1,
      waitingforapproval: 2,
      assignedtech: 3,
      enroute: 4,
      onsite: 5,
      onhold: 6,
      onresume: 7,
      completed: 8,
      cancelled: 9,
      unresolved: 10,
      // reject is outside main flow
      rejected: 99,
    };

    // Self-heal missing orders
    for (const r of rows) {
      const key = normalize(r.job_status_title);
      const ord = desiredOrder[key];
      if (ord && r.job_status_order !== ord) {
        await r.update({ job_status_order: ord });
      }
    }

    const sorted = rows
      .map((r) => ({ row: r, key: normalize(r.job_status_title) }))
      .sort(
        (a, b) =>
          (a.row.job_status_order || desiredOrder[a.key] || 999) -
          (b.row.job_status_order || desiredOrder[b.key] || 999)
      )
      .map(({ row, key }) => ({
        job_status_id: row.job_status_id,
        job_status_title: row.job_status_title,
        job_status_color_code: row.job_status_color_code,
        job_status_order: row.job_status_order ?? desiredOrder[key] ?? null,
        order: row.job_status_order ?? desiredOrder[key] ?? null,
        key,
      }));

    return res.json({ data: sorted });
  } catch (e) {
    return next(e);
  }
});
masterRouter.use(
  "/job-statuses",
  buildCrudRoutes({
    model: JobStatus,
    screen: "Manage Job",
    searchFields: ["job_status_title"],
    exactFields: ["status"],
    statusFieldName: "status",
    normalize: (body) => {
      if (typeof body.job_status_title === "string")
        body.job_status_title = body.job_status_title.trim();
    },
    findExistingWhere: (req) => ({
      job_status_title: (req.body.job_status_title || "").trim(),
    }),
  })
);

/* ---------- Subscription Types (under Settings) ---------- */
masterRouter.use(
  "/subscription-types",
  buildCrudRoutes({
    model: SubscriptionType,
    screen: "Settings",
    searchFields: ["subscription_title"],
    exactFields: ["subscription_status"],
    statusFieldName: "subscription_status",
    normalize: (body) => {
      if (typeof body.subscription_title === "string")
        body.subscription_title = body.subscription_title.trim();
    },
    findExistingWhere: (req) => ({
      subscription_title: (req.body.subscription_title || "").trim(),
    }),
  })
);

/* ---------- Business Types (under Settings) ---------- */
masterRouter.use(
  "/business-types",
  buildCrudRoutes({
    model: BusinessType,
    screen: "Settings",
    searchFields: ["business_typeName"],
    exactFields: ["status"],
    statusFieldName: "status",
    normalize: (body) => {
      if (typeof body.business_typeName === "string")
        body.business_typeName = body.business_typeName.trim();
    },
    findExistingWhere: (req) => ({
      business_typeName: (req.body.business_typeName || "").trim(),
    }),
  })
);

/* ---------- Work Types (org-scoped) ---------- */
masterRouter.use(
  "/work-types",
  buildCrudRoutes({
    model: WorkType,
    screen: "Work Type",
    searchFields: ["worktype_name", "worktype_description"],
    exactFields: ["status", "company_id"], // super_admin can filter; org users auto-scoped
    statusFieldName: "status",
    listInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    viewInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    listAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },
    viewAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },
    normalize: (body) => {
      if (typeof body.worktype_name === "string") body.worktype_name = body.worktype_name.trim();
    },
    findExistingWhere: (req) => ({
      company_id: req.user?.role_slug !== "super_admin" ? req.user.company_id : req.body.company_id,
      worktype_name: (req.body.worktype_name || "").trim(),
    }),
  })
);

/* ---------- Job Types (org-scoped) ---------- */
masterRouter.use(
  "/job-types",
  buildCrudRoutes({
    model: JobType,
    screen: "Job Type",
    searchFields: ["jobtype_name", "description"],
    exactFields: ["status", "company_id", "worktype_id"],
    statusFieldName: "status",
    listInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    viewInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    listAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },
    viewAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },
    normalize: (body) => {
      if (typeof body.jobtype_name === "string") body.jobtype_name = body.jobtype_name.trim();
    },
    findExistingWhere: (req) => ({
      company_id: req.user?.role_slug !== "super_admin" ? req.user.company_id : req.body.company_id,
      worktype_id: req.body.worktype_id,
      jobtype_name: (req.body.jobtype_name || "").trim(),
    }),
  })
);

masterRouter.use(
  "/regions",
  buildCrudRoutes({
    model: Region,
    screen: "Region",
    searchFields: ["region_name"],
    exactFields: ["status", "company_id", "country_id", "state_id", "district_id"],
    statusFieldName: "status",
    listInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    viewInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    listAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },
    viewAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },

    normalize: (body) => {
      if (typeof body.region_name === "string") body.region_name = body.region_name.trim();

      // Normalize & de-duplicate pincodes: keep only digits and uppercase (if any letters slip in)
      const norm = (p) =>
        String(p)
          .replace(/\s+/g, "")
          .toUpperCase()
          .replace(/[^0-9A-Z]/g, "");
      if (Array.isArray(body.pincodes)) {
        body.pincodes = [...new Set(body.pincodes.map(norm).filter(Boolean))];
      }
    },

    findExistingWhere: (req) => ({
      company_id: req.user?.role_slug !== "super_admin" ? req.user.company_id : req.body.company_id,
      region_name: (req.body.region_name || "").trim(),
    }),

    // ---------- CREATE: company-scoped pincode uniqueness ----------
    preCreate: async (req, body) => {
      if (!Array.isArray(body.pincodes) || body.pincodes.length === 0) return;

      const norm = (p) =>
        String(p)
          .replace(/\s+/g, "")
          .toUpperCase()
          .replace(/[^0-9A-Z]/g, "");
      const cleaned = [...new Set(body.pincodes.map(norm).filter(Boolean))];

      // Resolve company in which we’re creating
      const companyId =
        req.user?.role_slug !== "super_admin" ? req.user?.company_id : body.company_id;
      if (!companyId) {
        const e = new Error("Company is required to map pincodes");
        e.status = 400;
        e.code = "COMPANY_REQUIRED";
        throw e;
      }

      // Fetch only regions of the same company
      const regions = await Region.findAll({
        attributes: ["region_id", "region_name", "pincodes", "company_id"],
        where: { company_id: companyId },
        raw: true,
      });

      // Build index: PIN -> [ {region_id, region_name}... ]
      const index = new Map();
      for (const r of regions) {
        for (const p of r.pincodes || []) {
          const pin = norm(p);
          if (!pin) continue;
          if (!index.has(pin)) index.set(pin, []);
          index.get(pin).push({ region_id: r.region_id, region_name: r.region_name });
        }
      }

      // Find conflicts only within this company
      const conflicts = cleaned
        .map((pin) => ({ pin, holders: index.get(pin) || [] }))
        .filter((x) => x.holders.length > 0);

      if (conflicts.length) {
        // Craft friendly message. If single conflict → specific sentence, else list pairs.
        let message;
        if (conflicts.length === 1 && conflicts[0].holders.length === 1) {
          const { pin, holders } = conflicts[0];
          message = `Pincode ${pin} is already linked in "${holders[0].region_name}" region`;
        } else {
          const list = conflicts
            .map(
              ({ pin, holders }) =>
                `${pin} → ${holders.map((h) => `"${h.region_name}"`).join(", ")}`
            )
            .join("; ");
          message = `Pincode(s) already mapped in this company: ${list}`;
        }

        const e = new Error(message);
        e.status = 400;
        e.code = "PINCODE_ALREADY_MAPPED";
        e.meta = { company_id: companyId, conflicts };
        throw e;
      }
    },

    // ---------- UPDATE: company-scoped pincode uniqueness (exclude self) ----------
    preUpdate: async (req, body, row) => {
      if (!Array.isArray(body.pincodes) || body.pincodes.length === 0) return;

      const norm = (p) =>
        String(p)
          .replace(/\s+/g, "")
          .toUpperCase()
          .replace(/[^0-9A-Z]/g, "");
      const cleaned = [...new Set(body.pincodes.map(norm).filter(Boolean))];

      const companyId =
        req.user?.role_slug !== "super_admin"
          ? req.user?.company_id
          : (body.company_id ?? row.company_id);
      if (!companyId) {
        const e = new Error("Company is required to map pincodes");
        e.status = 400;
        e.code = "COMPANY_REQUIRED";
        throw e;
      }

      const regions = await Region.findAll({
        attributes: ["region_id", "region_name", "pincodes", "company_id"],
        where: { company_id: companyId },
        raw: true,
      });

      const index = new Map();
      for (const r of regions) {
        if (r.region_id === row.region_id) continue; // exclude the row being updated
        for (const p of r.pincodes || []) {
          const pin = norm(p);
          if (!pin) continue;
          if (!index.has(pin)) index.set(pin, []);
          index.get(pin).push({ region_id: r.region_id, region_name: r.region_name });
        }
      }

      const conflicts = cleaned
        .map((pin) => ({ pin, holders: index.get(pin) || [] }))
        .filter((x) => x.holders.length > 0);

      if (conflicts.length) {
        let message;
        if (conflicts.length === 1 && conflicts[0].holders.length === 1) {
          const { pin, holders } = conflicts[0];
          message = `Pincode ${pin} is already linked in ${holders[0].region_name} region`;
        } else {
          const list = conflicts
            .map(
              ({ pin, holders }) =>
                `${pin} → ${holders.map((h) => `"${h.region_name}"`).join(", ")}`
            )
            .join("; ");
          message = `Pincode(s) already mapped in this company: ${list}`;
        }

        const e = new Error(message);
        e.status = 400;
        e.code = "PINCODE_ALREADY_MAPPED";
        e.meta = { company_id: companyId, conflicts };
        throw e;
      }
    },
  })
);

/* ---------- Shifts (org-scoped) ---------- */
masterRouter.use(
  "/shifts",
  buildCrudRoutes({
    model: Shift,
    screen: "Shift",
    searchFields: ["shift_name", "description"],
    exactFields: ["status", "company_id"],
    statusFieldName: "status",
    listInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    viewInclude: [
      { model: Company, as: "company", attributes: ["company_id", "name"], required: false },
    ],
    listAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },
    viewAttributes: {
      include: [[Sequelize.col("company.name"), "company_name"]],
    },
    normalize: (body) => {
      if (typeof body.shift_name === "string") body.shift_name = body.shift_name.trim();
      if (typeof body.shift_startTime === "string")
        body.shift_startTime = body.shift_startTime.trim();
      if (typeof body.shift_endTime === "string") body.shift_endTime = body.shift_endTime.trim();
    },
    findExistingWhere: (req) => ({
      company_id: req.user?.role_slug !== "super_admin" ? req.user.company_id : req.body.company_id,
      shift_name: (req.body.shift_name || "").trim(),
      shift_startTime: (req.body.shift_startTime || "").trim(),
      shift_endTime: (req.body.shift_endTime || "").trim(),
    }),
  })
);

/* ---------- Roles (global) ---------- */
masterRouter.use(
  "/roles",
  buildCrudRoutes({
    model: Role,
    screen: "Roles",
    searchFields: ["role_name", "role_slug"],
    exactFields: ["status"],
    statusFieldName: "status",
    normalize: (body) => {
      if (typeof body.role_name === "string") body.role_name = body.role_name.trim();
      if (typeof body.role_slug === "string") body.role_slug = body.role_slug.trim().toLowerCase();
    },
    findExistingWhere: (req) => ({
      role_slug: (req.body.role_slug || "").trim().toLowerCase(),
    }),
    listWhere: (req) => {
      const actor = req.user?.role_slug;

      // map of who can assign what
      const allow = {
        super_admin: null, // all
        company_admin: ["vendor", "supervisor", "technician"],
        vendor: ["supervisor", "technician"],
        supervisor: ["technician"],
        technician: [], // none
      };

      const slugs = allow[actor];
      if (!slugs) return {}; // super_admin → no extra filter (see all)
      return slugs.length
        ? { role_slug: { [Op.in]: slugs } }
        : { role_slug: { [Op.in]: ["__none__"] } }; // return empty for technicians
    },
  })
);

/* ---------- Screens list ---------- */
masterRouter.get("/screens", rbac("Roles", "view"), async (_req, res, next) => {
  try {
    const rows = await Screen.findAll({ order: [["name", "ASC"]] });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

/* ---------- Role ↔ Screen permissions upsert ---------- */
masterRouter.put(
  "/roles/:role_id/screens/:screen_id",
  rbac("Roles", "edit"),
  async (req, res, next) => {
    try {
      const { role_id, screen_id } = req.params;
      const payload = {
        can_view: !!req.body.can_view,
        can_add: !!req.body.can_add,
        can_edit: !!req.body.can_edit,
        can_delete: !!req.body.can_delete,
      };
      const [row, created] = await RoleScreenPermission.findOrCreate({
        where: { role_id, screen_id },
        defaults: payload,
      });
      if (!created) await row.update(payload);
      res.json(row);
    } catch (e) {
      next(e);
    }
  }
);

masterRouter.get("/dashboard/counts", rbac("Dashboard", "view"), async (req, res, next) => {
  try {
    const isSuperAdmin = req.user?.role_slug === "super_admin";
    const requestedCompanyId =
      typeof req.query?.company_id === "string" && req.query.company_id.trim()
        ? req.query.company_id.trim()
        : null;
    const companyId = isSuperAdmin ? requestedCompanyId : req.user?.company_id || null;

    const activeRolesWhere = {
      status: true,
      role_slug: { [Op.ne]: "super_admin" },
    };

    const userWhere = {
      status: true,
      role_id: { [Op.ne]: null },
    };
    if (companyId) userWhere.company_id = companyId;

    const jobWhere = {};
    if (companyId) jobWhere.company_id = companyId;

    const companyWhere = { status: true };
    const vendorWhere = { status: true };
    if (companyId) {
      companyWhere.company_id = companyId;
      vendorWhere.company_id = companyId;
    }

    const [roles, roleCountsRaw, vendorCountsRaw, companyTotal, completedStatus, totalJobs] =
      await Promise.all([
        Role.findAll({
          attributes: ["role_id", "role_name", "role_slug"],
          where: activeRolesWhere,
          order: [["role_name", "ASC"]],
        }),
        User.findAll({
          attributes: ["role_id", [Sequelize.fn("COUNT", Sequelize.col("User.user_id")), "count"]],
          where: userWhere,
          group: ["role_id"],
        }),
        Vendor.findAll({
          attributes: [
            "role_id",
            [Sequelize.fn("COUNT", Sequelize.col("Vendor.vendor_id")), "count"],
          ],
          where: vendorWhere,
          group: ["role_id"],
        }),
        Company.count({ where: companyWhere }),
        JobStatus.findOne({
          attributes: ["job_status_id"],
          where: {
            status: true,
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("job_status_title")),
                "completed"
              ),
            ],
          },
        }),
        Job.count({ where: jobWhere }),
      ]);

    const countsMap = new Map();

    const setMaxCount = (roleId, value) => {
      if (!roleId) return;
      const safeValue = Number(value || 0);
      const prev = countsMap.get(roleId) || 0;
      countsMap.set(roleId, Math.max(prev, safeValue));
    };

    for (const row of roleCountsRaw) {
      setMaxCount(row.get("role_id"), row.get("count"));
    }

    for (const row of vendorCountsRaw) {
      setMaxCount(row.get("role_id"), row.get("count"));
    }

    const companyAdminRole = roles.find((r) => r.role_slug === "company_admin");
    if (companyAdminRole) {
      setMaxCount(companyAdminRole.role_id, companyTotal);
    }

    const roleSummaries = roles.map((role) => {
      const data = role.toJSON();
      return {
        role_name: data.role_name,
        count: countsMap.get(data.role_id) || 0,
      };
    });

    let completedJobs = 0;
    if (completedStatus) {
      completedJobs = await Job.count({
        where: { ...jobWhere, job_status_id: completedStatus.get("job_status_id") },
      });
    }

    res.json({
      company_id: companyId,
      roles: roleSummaries,
      total_jobs: totalJobs,
      completed_jobs: completedJobs,
    });
  } catch (e) {
    next(e);
  }
});
