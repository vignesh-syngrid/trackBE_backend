import express from "express";
import multer from "multer";
import { rbac } from "../middleware/rbac.js";
import { Op, fn, col, literal } from "sequelize";
import { buildCrudRoutes } from "../utils/crudFactory.js";
import { parseListQuery } from "../middleware/pagination.js";
import {
  Company,
  Vendor,
  User,
  Client,
  Role,
  Shift,
  Region,
  Attendance,
  WorkType,
  JobType,
} from "../models/index.js";
import { uploadBufferToS3 } from "../utils/s3.js";

export const adminRouter = express.Router();

// Multer instance for mixed uploads (images and PDFs)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024) },
  fileFilter: (_req, file, cb) => {
    // If the client sent an empty file field or no mimetype, ignore it gracefully
    const name = String(file?.originalname || "").trim();
    const type = String(file?.mimetype || "")
      .trim()
      .toLowerCase();
    if (!name || !type) return cb(null, false);

    const isImage = /^image\//i.test(type);
    const isPdf = type === "application/pdf";
    if (!isImage && !isPdf) {
      const err = new Error("Only image or PDF uploads are allowed");
      err.status = 400;
      err.code = "INVALID_UPLOAD_TYPE";
      return cb(err);
    }
    return cb(null, true);
  },
});

// Helpers to safely coerce multipart string fields
function isBlank(v) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}
function toOptBool(v) {
  if (isBlank(v)) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return undefined;
}
function toOptInt(v) {
  if (isBlank(v)) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}
function toOptFloat(v) {
  if (isBlank(v)) return undefined;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}
function toOptDate(v) {
  if (isBlank(v)) return undefined;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : undefined;
}
function toOptUuid(v) {
  if (isBlank(v)) return undefined;
  const s = String(v).trim();
  if (["null", "undefined"].includes(s.toLowerCase())) return undefined;
  return s;
}

async function attachUserUploads(
  req,
  body,
  {
    photoField = "photo",
    photoPrefixEnv = "S3_KEY_PREFIX_USER_PHOTO",
    photoDefaultPrefix = "uploads/user/photo/",
    includeDoc = true,
    docField = "proof",
    docPrefixEnv = "S3_KEY_PREFIX_USER_KYC",
    docDefaultPrefix = "uploads/user/kyc/",
  } = {}
) {
  const files = req.files || {};
  if (req.file && (!files.photo || !files.photo.length)) {
    files.photo = [req.file];
  }

  if (files.photo?.[0]) {
    const f = files.photo[0];
    const { url } = await uploadBufferToS3({
      buffer: f.buffer,
      filename: f.originalname,
      contentType: f.mimetype,
      keyPrefix: process.env[photoPrefixEnv] || photoDefaultPrefix,
    });
    body[photoField] = url;
  }

  if (includeDoc) {
    const docFile = files.kyc?.[0] || files.proof?.[0];
    if (docFile) {
      const { url } = await uploadBufferToS3({
        buffer: docFile.buffer,
        filename: docFile.originalname,
        contentType: docFile.mimetype,
        keyPrefix: process.env[docPrefixEnv] || docDefaultPrefix,
      });
      body[docField] = url;
    }
  }
}

/**
 * Pagination & filters supported (handled by crudFactory):
 * - ?page=1&limit=20               -> pagination
 * - ?searchParam=term              -> fuzzy search on searchFields
 * - ?sortBy=name&order=ASC|DESC    -> sorting (defaults safe to PK)
 * - exact field filters            -> any key in exactFields, e.g. ?status=true
 */

/* ======================= COMPANIES (super_admin only) ======================= */

/**
 * @openapi
 * /admin/companies:
 *   post:
 *     summary: Create a company (supports multipart with logo and proof)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Company logo image
 *               proof:
 *                 type: string
 *                 format: binary
 *                 description: Proof image or PDF
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: Super admin only; others ignored
 *               name:
 *                 type: string
 *               gst:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               address_1:
 *                 type: string
 *               country_id:
 *                 type: integer
 *               state_id:
 *                 type: string
 *                 format: uuid
 *               city:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               lat:
 *                 type: number
 *                 format: float
 *               lng:
 *                 type: number
 *                 format: float
 *               subscription_id:
 *                 type: string
 *                 format: uuid
 *               no_of_users:
 *                 type: integer
 *               subscription_startDate:
 *                 type: string
 *                 format: date-time
 *               subscription_endDate:
 *                 type: string
 *                 format: date-time
 *               subscription_amountPerUser:
 *                 type: number
 *               remarks:
 *                 type: string
 *               theme_color:
 *                 type: string
 *               status:
 *                 type: boolean
 *           encoding:
 *             logo:
 *               contentType: image/png, image/jpeg
 *             proof:
 *               contentType: image/png, image/jpeg, application/pdf
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_id:
 *                 type: string
 *                 format: uuid
 *               logo:
 *                 type: string
 *               name:
 *                 type: string
 *               gst:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address_1:
 *                 type: string
 *               country_id:
 *                 type: integer
 *               state_id:
 *                 type: string
 *                 format: uuid
 *               city:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               proof:
 *                 type: string
 *               subscription_id:
 *                 type: string
 *                 format: uuid
 *               no_of_users:
 *                 type: integer
 *               subscription_startDate:
 *                 type: string
 *                 format: date-time
 *               subscription_endDate:
 *                 type: string
 *                 format: date-time
 *               subscription_amountPerUser:
 *                 type: number
 *               remarks:
 *                 type: string
 *               theme_color:
 *                 type: string
 *               status:
 *                 type: boolean
 *             example:
 *               company_id: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *               logo: https://cdn.example.com/uploads/company/logo/2025-09-09/logo.png
 *               name: Firetminds
 *               gst: GSTABCD1234
 *               email: info@firetminds.com
 *               phone: "9876543210"
 *               address_1: Address line 1
 *               country_id: 91
 *               state_id: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *               city: Chennai
 *               postal_code: "600006"
 *               lat: 13.0907
 *               lng: 78.6084
 *               proof: https://cdn.example.com/uploads/company/proof/2025-09-09/proof.pdf
 *               subscription_id: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *               no_of_users: 10
 *               subscription_startDate: 2025-09-09T04:54:21.227Z
 *               subscription_endDate: 2026-09-09T04:54:21.227Z
 *               subscription_amountPerUser: 299.5
 *               remarks: Some remarks
 *               theme_color: "#47A63A"
 *               status: true
 *     responses:
 *       201:
 *         description: Created company
 */
adminRouter.post(
  "/companies",
  rbac("Company", "add"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "proof", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      // Normalize
      if (typeof body.name === "string") body.name = body.name.trim();
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (typeof body.gst === "string") body.gst = body.gst.trim().toUpperCase();

      // Coerce optionals from multipart strings safely
      if (body.company_id !== undefined) {
        const v = toOptUuid(body.company_id);
        if (v === undefined) delete body.company_id;
        else body.company_id = v;
      }
      if (body.subscription_id !== undefined) {
        const v = toOptUuid(body.subscription_id);
        if (v === undefined) delete body.subscription_id;
        else body.subscription_id = v;
      }
      if (body.state_id !== undefined) {
        const v = toOptUuid(body.state_id);
        if (v === undefined) delete body.state_id;
        else body.state_id = v;
      }
      if (body.country_id !== undefined) body.country_id = toOptInt(body.country_id);
      if (body.no_of_users !== undefined) body.no_of_users = toOptInt(body.no_of_users);
      if (body.subscription_amountPerUser !== undefined)
        body.subscription_amountPerUser = toOptFloat(body.subscription_amountPerUser);
      if (body.lat !== undefined) body.lat = toOptFloat(body.lat);
      if (body.lng !== undefined) body.lng = toOptFloat(body.lng);
      if (body.status !== undefined) body.status = toOptBool(body.status);
      if (body.subscription_startDate !== undefined)
        body.subscription_startDate = toOptDate(body.subscription_startDate);
      if (body.subscription_endDate !== undefined)
        body.subscription_endDate = toOptDate(body.subscription_endDate);

      // Guard common numeric ranges to avoid DB numeric overflow
      const bad = (message) => {
        const err = new Error(message);
        err.status = 400;
        throw err;
      };
      if (body.lat !== undefined && (body.lat < -90 || body.lat > 90)) {
        bad("lat must be between -90 and 90");
      }
      if (body.lng !== undefined && (body.lng < -180 || body.lng > 180)) {
        bad("lng must be between -180 and 180");
      }
      if (body.subscription_amountPerUser !== undefined) {
        const v = body.subscription_amountPerUser;
        if (v < 0) bad("subscription_amountPerUser must be >= 0");
        if (v > 99999999.99) bad("subscription_amountPerUser exceeds maximum allowed value");
      }
      if (body.no_of_users !== undefined) {
        const n = body.no_of_users;
        if (!Number.isInteger(n) || n < 0) bad("no_of_users must be a non-negative integer");
      }

      const files = req.files || {};
      if (files.logo?.[0]) {
        const f = files.logo[0];
        const { url } = await uploadBufferToS3({
          buffer: f.buffer,
          filename: f.originalname,
          contentType: f.mimetype,
          keyPrefix: process.env.S3_KEY_PREFIX_LOGO || "uploads/company/logo/",
        });
        body.logo = url;
      }
      if (files.proof?.[0]) {
        const f = files.proof[0];
        const { url } = await uploadBufferToS3({
          buffer: f.buffer,
          filename: f.originalname,
          contentType: f.mimetype,
          keyPrefix: process.env.S3_KEY_PREFIX_PROOF || "uploads/company/proof/",
        });
        body.proof = url;
      }

      const created = await Company.create(body);
      return res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);
adminRouter.use(
  "/companies",
  buildCrudRoutes({
    model: Company,
    screen: "Company",
    searchFields: ["name", "email", "phone", "gst", "city"],
    exactFields: ["country_id", "state_id", "subscription_id", "status"],
    statusFieldName: "status",
    orgScoped: false, // not tenant-scoped; only super_admin should have this screen
    preDelete: async (_req, row) => {
      // delete dependents explicitly
      await Promise.all([
        WorkType.destroy({ where: { company_id: row.company_id }, individualHooks: true }),
        JobType.destroy({ where: { company_id: row.company_id }, individualHooks: true }),
        Region.destroy({ where: { company_id: row.company_id }, individualHooks: true }),
        Shift.destroy({ where: { company_id: row.company_id }, individualHooks: true }),
        Vendor.destroy({ where: { company_id: row.company_id }, individualHooks: true }),
        User.destroy({ where: { company_id: row.company_id }, individualHooks: true }),
        Client.destroy({ where: { company_id: row.company_id }, individualHooks: true }),
      ]);
    },
    normalize: (body) => {
      if (typeof body.name === "string") body.name = body.name.trim();
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (typeof body.theme_color === "string")
        body.theme_color = body.theme_color.trim().toLowerCase();
      if (typeof body.gst === "string") body.gst = body.gst.trim().toUpperCase();
      if (typeof body.city === "string") body.city = body.city.trim();
      if (typeof body.address_1 === "string") body.address_1 = body.address_1.trim();
      if (typeof body.postal_code === "string") body.postal_code = body.postal_code.trim();
    },
  })
);

adminRouter.post(
  "/companies/with-files",
  rbac("Company", "add"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "proof", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      // Text fields available from multipart
      const body = { ...req.body };

      // Optional: normalize a few known fields similar to CRUD route
      if (typeof body.name === "string") body.name = body.name.trim();
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (typeof body.gst === "string") body.gst = body.gst.trim().toUpperCase();

      // Coerce optionals from multipart strings safely
      if (body.company_id !== undefined) {
        const v = toOptUuid(body.company_id);
        if (v === undefined) delete body.company_id;
        else body.company_id = v;
      }
      if (body.subscription_id !== undefined) {
        const v = toOptUuid(body.subscription_id);
        if (v === undefined) delete body.subscription_id;
        else body.subscription_id = v;
      }
      if (body.state_id !== undefined) {
        const v = toOptUuid(body.state_id);
        if (v === undefined) delete body.state_id;
        else body.state_id = v;
      }
      if (body.country_id !== undefined) body.country_id = toOptInt(body.country_id);
      if (body.no_of_users !== undefined) body.no_of_users = toOptInt(body.no_of_users);
      if (body.subscription_amountPerUser !== undefined)
        body.subscription_amountPerUser = toOptFloat(body.subscription_amountPerUser);
      if (body.lat !== undefined) body.lat = toOptFloat(body.lat);
      if (body.lng !== undefined) body.lng = toOptFloat(body.lng);
      if (body.status !== undefined) body.status = toOptBool(body.status);
      if (body.subscription_startDate !== undefined)
        body.subscription_startDate = toOptDate(body.subscription_startDate);
      if (body.subscription_endDate !== undefined)
        body.subscription_endDate = toOptDate(body.subscription_endDate);

      // Guard common numeric ranges to avoid DB numeric overflow
      const bad = (message) => {
        const err = new Error(message);
        err.status = 400;
        throw err;
      };
      if (body.lat !== undefined && (body.lat < -90 || body.lat > 90)) {
        bad("lat must be between -90 and 90");
      }
      if (body.lng !== undefined && (body.lng < -180 || body.lng > 180)) {
        bad("lng must be between -180 and 180");
      }
      if (body.subscription_amountPerUser !== undefined) {
        const v = body.subscription_amountPerUser;
        if (v < 0) bad("subscription_amountPerUser must be >= 0");
        if (v > 99999999.99) bad("subscription_amountPerUser exceeds maximum allowed value");
      }
      if (body.no_of_users !== undefined) {
        const n = body.no_of_users;
        if (!Number.isInteger(n) || n < 0) bad("no_of_users must be a non-negative integer");
      }

      // Upload files if provided
      const files = req.files || {};
      if (files.logo?.[0]) {
        const f = files.logo[0];
        const { url } = await uploadBufferToS3({
          buffer: f.buffer,
          filename: f.originalname,
          contentType: f.mimetype,
          keyPrefix: process.env.S3_KEY_PREFIX_LOGO || "uploads/company/logo/",
        });
        body.logo = url;
      }
      if (files.proof?.[0]) {
        const f = files.proof[0];
        const { url } = await uploadBufferToS3({
          buffer: f.buffer,
          filename: f.originalname,
          contentType: f.mimetype,
          keyPrefix: process.env.S3_KEY_PREFIX_PROOF || "uploads/company/proof/",
        });
        body.proof = url;
      }

      const created = await Company.create(body);
      return res.status(201).json(created);
    } catch (e) {
      if (String(e?.message || "").includes("uploads are allowed")) e.status = 400;
      next(e);
    }
  }
);

adminRouter.post(
  "/clients/with-photo",
  rbac("Clients/Customer", "add"),
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const isSuper = req.user?.role_slug === "super_admin";
      const body = { ...req.body };
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (!isSuper) body.company_id = req.user?.company_id;
      if (isSuper && !body.company_id) {
        const err = new Error("company_id is required for super_admin");
        err.status = 400;
        throw err;
      }

      await attachUserUploads(req, body, {
        photoPrefixEnv: "S3_KEY_PREFIX_CLIENT_PHOTO",
        photoDefaultPrefix: "uploads/client/photo/",
        includeDoc: false,
      });

      const created = await Client.create(body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

adminRouter.post(
  "/vendors/with-photo",
  rbac("Vendor / Contractor", "add"),
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const isSuper = req.user?.role_slug === "super_admin";
      const body = { ...req.body };
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (!isSuper) body.company_id = req.user?.company_id;
      if (isSuper && !body.company_id) {
        const err = new Error("company_id is required for super_admin");
        err.status = 400;
        throw err;
      }

      if (req.file) {
        const up = await uploadBufferToS3({
          buffer: req.file.buffer,
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          keyPrefix: process.env.S3_KEY_PREFIX_VENDOR_PHOTO || "uploads/vendor/photo/",
        });
        body.photo = up.url;
      }

      const created = await Vendor.create(body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

adminRouter.post(
  "/users/with-files",
  rbac("Technician", "add"),
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "kyc", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const isSuper = req.user?.role_slug === "super_admin";
      const body = { ...req.body };
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (!isSuper) body.company_id = req.user?.company_id;
      if (isSuper && !body.company_id) {
        const err = new Error("company_id is required for super_admin");
        err.status = 400;
        throw err;
      }

      await attachUserUploads(req, body);

      const created = await User.create(body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

adminRouter.put("/users/:id", (req, res, next) => {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  if (!type.includes("multipart/form-data")) return next();

  const parser = upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "kyc", maxCount: 1 },
    { name: "proof", maxCount: 1 },
  ]);

  parser(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        const fileErr = new Error("Only photo or KYC uploads are allowed");
        fileErr.status = 400;
        return next(fileErr);
      }
      return next(err);
    }

    try {
      await attachUserUploads(req, req.body);
      return next();
    } catch (uploadErr) {
      return next(uploadErr);
    }
  });
});
// Pre-upload middleware then delegate to CRUD create for validations
adminRouter.post("/vendors", upload.single("photo"), async (req, _res, next) => {
  try {
    if (req.file) {
      const up = await uploadBufferToS3({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        keyPrefix: process.env.S3_KEY_PREFIX_VENDOR_PHOTO || "uploads/vendor/photo/",
      });
      req.body.photo = up.url;
    }
    return next();
  } catch (e) {
    return next(e);
  }
});

/* ======================= VENDORS (org-scoped; company REQUIRED) ======================= */
adminRouter.use(
  "/vendors",
  buildCrudRoutes({
    model: Vendor,
    screen: "Vendor / Contractor",
    searchFields: ["vendor_name", "email", "phone"],
    exactFields: ["company_id", "country_id", "state_id", "region_id"],
    normalize: (body) => {
      if (typeof body.vendor_name === "string") body.vendor_name = body.vendor_name.trim();
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (typeof body.postal_code === "string") body.postal_code = body.postal_code.trim();
      if (typeof body.address_1 === "string") body.address_1 = body.address_1.trim();

      // Coerce common multipart string fields to proper types
      if (body.company_id !== undefined) body.company_id = toOptUuid(body.company_id);
      if (body.role_id !== undefined) body.role_id = toOptUuid(body.role_id);
      if (body.region_id !== undefined) body.region_id = toOptUuid(body.region_id);
      if (body.state_id !== undefined) body.state_id = toOptUuid(body.state_id);
      if (body.country_id !== undefined) body.country_id = toOptInt(body.country_id);
    },

    listInclude: [
      { model: Company, attributes: ["company_id", "name"] }, // alias "Company"
      { model: Role, attributes: ["role_id", "role_name", "role_slug"] }, // alias "Role"
    ],
    listAttributes: {
      exclude: ["password"],
      include: [
        [col("Company.name"), "company_name"],
        [col("Role.role_name"), "role_name"],
      ],
    },

    // GET /vendors/:id enrichment
    viewInclude: [
      { model: Company, attributes: ["company_id", "name", "email", "phone"] },
      { model: Role, attributes: ["role_id", "role_name", "role_slug"] },
    ],
    viewAttributes: {
      exclude: ["password"],
      include: [
        [col("Company.name"), "company_name"],
        [col("Role.role_name"), "role_name"],
      ],
    },
    // company required (super_admin must pass; org users auto-filled)
    preCreate: async (req, body) => {
      // Required fields validation (before hitting DB)
      if (isBlank(body.vendor_name)) {
        const err = new Error("vendor_name is required");
        err.status = 400;
        err.field = "vendor_name";
        throw err;
      }
      if (isBlank(body.email)) {
        const err = new Error("email is required");
        err.status = 400;
        err.field = "email";
        throw err;
      }
      if (isBlank(body.phone)) {
        const err = new Error("phone is required");
        err.status = 400;
        err.field = "phone";
        throw err;
      }
      if (isBlank(body.password)) {
        const err = new Error("password is required");
        err.status = 400;
        err.field = "password";
        throw err;
      }

      const isSuper = req.user?.role_slug === "super_admin";
      const companyId = isSuper ? body.company_id : req.user?.company_id;
      if (!companyId) {
        const err = new Error("company_id is required to create a vendor");
        err.status = 400;
        err.field = "company_id";
        throw err;
      }
      // Verify company exists
      const company = await Company.findOne({ where: { company_id: companyId } });
      if (!company) {
        const err = new Error("company_id does not exist");
        err.status = 400;
        err.field = "company_id";
        throw err;
      }
      body.company_id = companyId;

      // Optional: validate role_id if provided
      if (body.role_id) {
        const role = await Role.findOne({ where: { role_id: body.role_id } });
        if (!role) {
          const err = new Error("role_id does not exist");
          err.status = 400;
          err.field = "role_id";
          throw err;
        }
      }
    },
    preUpdate: async (_req, body) => {
      if (body.company_id) delete body.company_id; // never move tenant
    },
    preDelete: async (_req, row) => {
      await Promise.all([
        User.destroy({ where: { vendor_id: row.vendor_id }, individualHooks: true }),
      ]);
    },
  })
);

/**
 * @openapi
 * /admin/vendors:
 *   post:
 *     summary: Create a vendor (supports multipart with photo)
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               vendor_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: Super admin only; others ignored
 *     responses:
 *       201:
 *         description: Created vendor
 */

/* ======================= USERS (org-scoped) ======================= */
/* Listing users: ALWAYS restrict to roles 'supervisor' & 'technician' */
adminRouter.post(
  "/users",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "kyc", maxCount: 1 },
    { name: "proof", maxCount: 1 },
  ]),
  async (req, _res, next) => {
    try {
      await attachUserUploads(req, req.body);
      return next();
    } catch (e) {
      return next(e);
    }
  }
);

adminRouter.use(
  "/users",
  buildCrudRoutes({
    model: User,
    screen: "Technician",
    searchFields: ["name", "email", "phone", "city"],
    exactFields: ["company_id", "role_id", "vendor_id", "shift_id", "region_id", "supervisor_id"],
    // No explicit status field on User in your model; add one if needed.
    normalize: (body) => {
      if (typeof body.name === "string") body.name = body.name.trim();
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (typeof body.city === "string") body.city = body.city.trim();
      if (typeof body.address_1 === "string") body.address_1 = body.address_1.trim();
      if (typeof body.postal_code === "string") body.postal_code = body.postal_code.trim();

      // Coerce ID and numeric fields from multipart
      if (body.company_id !== undefined) body.company_id = toOptUuid(body.company_id);
      if (body.role_id !== undefined) body.role_id = toOptUuid(body.role_id);
      if (body.vendor_id !== undefined) body.vendor_id = toOptUuid(body.vendor_id);
      if (body.supervisor_id !== undefined) body.supervisor_id = toOptUuid(body.supervisor_id);
      if (body.shift_id !== undefined) body.shift_id = toOptUuid(body.shift_id);
      if (body.region_id !== undefined) body.region_id = toOptUuid(body.region_id);
      if (body.country_id !== undefined) body.country_id = toOptInt(body.country_id);

      // region_ids can arrive as JSON string or comma-separated list
      if (typeof body.region_ids === "string") {
        try {
          const parsed = JSON.parse(body.region_ids);
          if (Array.isArray(parsed)) body.region_ids = parsed.map(toOptUuid).filter(Boolean);
        } catch {
          body.region_ids = String(body.region_ids)
            .split(",")
            .map((s) => toOptUuid(s))
            .filter(Boolean);
        }
      }
    },

    listInclude: [
      { model: Company, attributes: ["company_id", "name"] }, // alias "Company"
      { model: Role, attributes: ["role_id", "role_name", "role_slug"] }, // alias "Role"
      { model: Region, as: "region", attributes: ["region_id", "region_name"] },
    ],
    listAttributes: {
      exclude: ["password"],
      include: [
        [col("Company.name"), "company_name"],
        [col("Role.role_name"), "role_name"],
        [col("region.region_name"), "region_name"],
      ],
    },

    viewInclude: [
      { model: Company, attributes: ["company_id", "name"] },
      { model: Role, attributes: ["role_id", "role_name", "role_slug"] },
      { model: Vendor, attributes: ["vendor_id", "vendor_name"] },
      { model: Shift, attributes: ["shift_id", "shift_name"] },
      { model: Region, as: "region", attributes: ["region_id", "region_name"] },
      { model: User, as: "supervisor", attributes: ["user_id", "name"] },
    ],
    viewAttributes: {
      exclude: ["password"],
      include: [
        [col("Company.name"), "company_name"],
        [col("Role.role_name"), "role_name"],
        [col("Vendor.vendor_name"), "vendor_name"],
        [col("Shift.shift_name"), "shift_name"],
        [col("region.region_name"), "region_name"],
        [col("supervisor.name"), "supervisor_name"],
      ],
    },

    // 🔒 List hook: only show Supervisor + Technician
    listWhere: async () => {
      const roles = await Role.findAll({
        where: { role_slug: { [Op.in]: ["supervisor", "technician"] } },
        attributes: ["role_id"],
      });
      const roleIds = roles.map((r) => r.role_id);
      // If seed/DB somehow missing these roles, return impossible filter to yield empty list.
      return roleIds.length ? { role_id: { [Op.in]: roleIds } } : { role_id: { [Op.in]: [] } };
    },

    // Enforce required vendor for these roles
    preCreate: async (req, body) => {
      // Required fields validation (before hitting DB)
      if (isBlank(body.name)) {
        const err = new Error("name is required");
        err.status = 400;
        err.field = "name";
        throw err;
      }
      if (isBlank(body.email)) {
        const err = new Error("email is required");
        err.status = 400;
        err.field = "email";
        throw err;
      }
      if (isBlank(body.phone)) {
        const err = new Error("phone is required");
        err.status = 400;
        err.field = "phone";
        throw err;
      }
      if (isBlank(body.password)) {
        const err = new Error("password is required");
        err.status = 400;
        err.field = "password";
        throw err;
      }

      const isSuper = req.user?.role_slug === "super_admin";
      const companyId = isSuper ? body.company_id : req.user?.company_id;
      if (!companyId) {
        const err = new Error("company_id is required to create a user");
        err.status = 400;
        err.field = "company_id";
        throw err;
      }
      // Verify company exists
      const company = await Company.findOne({ where: { company_id: companyId } });
      if (!company) {
        const err = new Error("company_id does not exist");
        err.status = 400;
        throw err;
      }
      body.company_id = companyId;

      if (!body.role_id) {
        const err = new Error("role_id is required");
        err.status = 400;
        err.field = "role_id";
        throw err;
      }
      const role = await Role.findOne({ where: { role_id: body.role_id } });
      if (!role) {
        const err = new Error("role_id does not exist");
        err.status = 400;
        err.field = "role_id";
        throw err;
      }
      const slug = String(role.role_slug || "").toLowerCase();

      if (slug === "technician" || slug === "supervisor") {
        if (!body.vendor_id) {
          const err = new Error("vendor_id is required for technician/supervisor");
          err.status = 400;
          err.field = "vendor_id";
          throw err;
        }
        const vendor = await Vendor.findOne({
          where: { vendor_id: body.vendor_id, company_id: companyId },
        });
        if (!vendor) {
          const err = new Error("vendor_id does not exist or does not belong to the same company");
          err.status = 400;
          err.field = "vendor_id";
          throw err;
        }
      }

      // If role is technician, supervisor is mandatory and must be a supervisor in same company
      if (slug === "technician") {
        if (!body.supervisor_id) {
          const err = new Error("supervisor_id is required for technician");
          err.status = 400;
          err.field = "supervisor_id";
          throw err;
        }
        const supervisor = await User.findOne({
          where: { user_id: body.supervisor_id, company_id: companyId },
        });
        if (!supervisor) {
          const err = new Error("supervisor_id does not exist or is not in the same company");
          err.status = 400;
          err.field = "supervisor_id";
          throw err;
        }
        if (supervisor.role_id) {
          const sRole = await Role.findOne({ where: { role_id: supervisor.role_id } });
          if (!sRole || String(sRole.role_slug || "").toLowerCase() !== "supervisor") {
            const err = new Error("supervisor_id must belong to a user with supervisor role");
            err.status = 400;
            err.field = "supervisor_id";
            throw err;
          }
        }
      }

      // Optional: validate shift_id
      if (body.shift_id) {
        const shift = await Shift.findOne({ where: { shift_id: body.shift_id } });
        if (!shift) {
          const err = new Error("shift_id does not exist");
          err.status = 400;
          err.field = "shift_id";
          throw err;
        }
      }
      // Optional: validate supervisor_id (must be in same company)
      if (body.supervisor_id) {
        const supervisor = await User.findOne({
          where: { user_id: body.supervisor_id, company_id: companyId },
        });
        if (!supervisor) {
          const err = new Error("supervisor_id does not exist or is not in the same company");
          err.status = 400;
          err.field = "supervisor_id";
          throw err;
        }
      }
      // Optional: validate region_id
      if (body.region_id) {
        const region = await Region.findOne({ where: { region_id: body.region_id } });
        if (!region) {
          const err = new Error("region_id does not exist");
          err.status = 400;
          err.field = "region_id";
          throw err;
        }
      }
      // Optional: validate region_ids array
      if (Array.isArray(body.region_ids) && body.region_ids.length) {
        const regions = await Region.findAll({
          where: { region_id: { [Op.in]: body.region_ids } },
        });
        if (regions.length !== body.region_ids.length) {
          const err = new Error("One or more region_ids do not exist");
          err.status = 400;
          err.field = "region_ids";
          throw err;
        }
      }
    },

    preUpdate: async (_req, body, row) => {
      // company is fixed; if role/vendor changes, validate again
      if (body.role_id || body.vendor_id) {
        const roleId = body.role_id ?? row.role_id;
        const role = await Role.findOne({ where: { role_id: roleId } });
        if (!role) {
          const err = new Error("Invalid role_id");
          err.status = 400;
          throw err;
        }
        const slug = String(role.role_slug || "").toLowerCase();
        if (slug === "technician" || slug === "supervisor") {
          const vendorId = body.vendor_id ?? row.vendor_id;
          if (!vendorId) {
            const err = new Error("vendor_id is required for technician/supervisor");
            err.status = 400;
            throw err;
          }
          const vendor = await Vendor.findOne({
            where: { vendor_id: vendorId, company_id: row.company_id },
          });
          if (!vendor) {
            const err = new Error("vendor_id must belong to the same company");
            err.status = 400;
            throw err;
          }
          if (slug === "technician") {
            const supervisorId = body.supervisor_id ?? row.supervisor_id;
            if (!supervisorId) {
              const err = new Error("supervisor_id is required for technician");
              err.status = 400;
              throw err;
            }
            const supervisor = await User.findOne({
              where: { user_id: supervisorId, company_id: row.company_id },
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
          }
        }
      }
      if (body.company_id) delete body.company_id; // never allow tenant change
    },
    preDelete: async (_req, row) => {
      await Promise.all([
        User.destroy({ where: { supervisor_id: row.supervisor_id }, individualHooks: true }),
      ]);
    },
  })
);

/**
 * @openapi
 * /admin/users:
 *   post:
 *     summary: Create a user (supports multipart with photo and KYC)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               kyc:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role_id:
 *                 type: string
 *                 format: uuid
 *               vendor_id:
 *                 type: string
 *                 format: uuid
 *               supervisor_id:
 *                 type: string
 *                 format: uuid
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: Super admin only; others ignored
 *     responses:
 *       201:
 *         description: Created user
 */
adminRouter.post(
  "/users",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "kyc", maxCount: 1 },
  ]),
  async (req, _res, next) => {
    try {
      if (req.files?.photo?.[0]) {
        const f = req.files.photo[0];
        const up = await uploadBufferToS3({
          buffer: f.buffer,
          filename: f.originalname,
          contentType: f.mimetype,
          keyPrefix: process.env.S3_KEY_PREFIX_USER_PHOTO || "uploads/user/photo/",
        });
        req.body.photo = up.url;
      }
      if (req.files?.kyc?.[0]) {
        const f = req.files.kyc[0];
        const up = await uploadBufferToS3({
          buffer: f.buffer,
          filename: f.originalname,
          contentType: f.mimetype,
          keyPrefix: process.env.S3_KEY_PREFIX_USER_KYC || "uploads/user/kyc/",
        });
        req.body.proof = up.url;
      }
      return next();
    } catch (e) {
      return next(e);
    }
  }
);

/* ======================= CLIENTS (org-scoped; company required) ======================= */
adminRouter.post("/clients", upload.single("photo"), async (req, _res, next) => {
  try {
    await attachUserUploads(req, req.body, {
      photoPrefixEnv: "S3_KEY_PREFIX_CLIENT_PHOTO",
      photoDefaultPrefix: "uploads/client/photo/",
      includeDoc: false,
    });
    return next();
  } catch (e) {
    return next(e);
  }
});

adminRouter.use(
  "/clients",
  buildCrudRoutes({
    model: Client,
    screen: "Clients/Customer",
    searchFields: ["firstName", "lastName", "email", "phone", "city"],
    exactFields: ["company_id", "business_typeId", "country_id", "state_id", "available_status"],
    statusFieldName: "available_status",
    normalize: (body) => {
      if (typeof body.firstName === "string") body.firstName = body.firstName.trim();
      if (typeof body.lastName === "string") body.lastName = body.lastName.trim();
      if (typeof body.email === "string") body.email = body.email.trim().toLowerCase();
      if (typeof body.phone === "string") body.phone = String(body.phone).replace(/\D+/g, "");
      if (typeof body.city === "string") body.city = body.city.trim();
      if (typeof body.address_1 === "string") body.address_1 = body.address_1.trim();
      if (typeof body.postal_code === "string") body.postal_code = body.postal_code.trim();

      // Coerce IDs and numeric/boolean fields
      if (body.company_id !== undefined) body.company_id = toOptUuid(body.company_id);
      if (body.business_typeId !== undefined)
        body.business_typeId = toOptUuid(body.business_typeId);
      if (body.state_id !== undefined) body.state_id = toOptUuid(body.state_id);
      if (body.country_id !== undefined) body.country_id = toOptInt(body.country_id);
      if (body.lat !== undefined) body.lat = toOptFloat(body.lat);
      if (body.lng !== undefined) body.lng = toOptFloat(body.lng);
      if (body.available_status !== undefined)
        body.available_status = toOptBool(body.available_status);
      if (body.visiting_startTime === "") delete body.visiting_startTime;
      if (body.visiting_endTime === "") delete body.visiting_endTime;
    },
    viewInclude: [{ model: Company, attributes: ["company_id", "name"] }],
    viewAttributes: {
      exclude: ["password"],
      include: [[col("Company.name"), "company_name"]],
    },
    preCreate: async (req, body) => {
      // Required client fields
      if (isBlank(body.firstName)) {
        const err = new Error("firstName is required");
        err.status = 400;
        err.field = "firstName";
        throw err;
      }
      if (isBlank(body.email)) {
        const err = new Error("email is required");
        err.status = 400;
        err.field = "email";
        throw err;
      }
      if (isBlank(body.phone)) {
        const err = new Error("phone is required");
        err.status = 400;
        err.field = "phone";
        throw err;
      }

      const isSuper = req.user?.role_slug === "super_admin";
      const companyId = isSuper ? body.company_id : req.user?.company_id;
      if (!companyId) {
        const err = new Error("company_id is required to create a client");
        err.status = 400;
        err.field = "company_id";
        throw err;
      }
      body.company_id = companyId;
    },
    preUpdate: async (_req, body) => {
      if (body.company_id) delete body.company_id;
    },
  })
);

/**
 * @openapi
 * /admin/attendance:
 *   get:
 *     summary: List attendance records (admin)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated attendance
 */
adminRouter.get(
  "/attendance",
  rbac("Attendance", "view"),
  parseListQuery,
  async (req, res, next) => {
    try {
      const { limit, offset, order } = req.listQuery;
      const isSuper = req.user?.role_slug === "super_admin";
      const where = {};
      if (!isSuper) where.company_id = req.user?.company_id;
      if (req.query.company_id && isSuper) where.company_id = String(req.query.company_id);
      if (req.query.user_id) where.user_id = String(req.query.user_id);
      if (req.query.from || req.query.to) {
        where.check_in_at = {};
        if (req.query.from) where.check_in_at[Op.gte] = new Date(req.query.from);
        if (req.query.to) where.check_in_at[Op.lte] = new Date(req.query.to);
      }

      const { rows, count } = await Attendance.findAndCountAll({
        where,
        include: [
          { model: User, as: "user", attributes: ["user_id", "name", "email", "phone", "photo"] },
        ],
        order: [["check_in_at", order]],
        limit,
        offset,
      });

      res.json({ data: rows, total: count, page: req.listQuery.page, limit });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * @openapi
 * /admin/attendance/summary:
 *   get:
 *     summary: Attendance summary by day or user (admin)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         required: true
 *         schema: { type: string, enum: [day, user] }
 *       - in: query
 *         name: company_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Summary rows
 */
adminRouter.get("/attendance/summary", rbac("Attendance", "view"), async (req, res, next) => {
  try {
    const isSuper = req.user?.role_slug === "super_admin";
    const where = {};
    if (!isSuper) where.company_id = req.user?.company_id;
    if (req.query.company_id && isSuper) where.company_id = String(req.query.company_id);
    if (req.query.user_id) where.user_id = String(req.query.user_id);
    if (req.query.from || req.query.to) {
      where.check_in_at = {};
      if (req.query.from) where.check_in_at[Op.gte] = new Date(req.query.from);
      if (req.query.to) where.check_in_at[Op.lte] = new Date(req.query.to);
    }

    const groupBy = String(req.query.groupBy || "").toLowerCase();
    if (!["day", "user"].includes(groupBy)) {
      return res.status(400).json({ message: "groupBy must be 'day' or 'user'" });
    }

    if (groupBy === "day") {
      const rows = await Attendance.findAll({
        where,
        attributes: [
          [fn("date_trunc", "day", col("check_in_at")), "day"],
          [fn("sum", col("total_minutes")), "total_minutes"],
        ],
        group: [fn("date_trunc", "day", col("check_in_at"))],
        order: [[literal("day"), "ASC"]],
        raw: true,
      });
      return res.json({ data: rows });
    }

    // group by user
    const rows = await Attendance.findAll({
      where,
      attributes: ["user_id", [fn("sum", col("total_minutes")), "total_minutes"]],
      group: ["user_id"],
      raw: true,
    });

    // join minimal user info
    const userIds = rows.map((r) => r.user_id);
    const users = await User.findAll({
      where: { user_id: { [Op.in]: userIds } },
      attributes: ["user_id", "name", "email", "photo"],
    });
    const map = Object.fromEntries(users.map((u) => [u.user_id, u.toJSON ? u.toJSON() : u]));
    const out = rows.map((r) => ({ ...r, user: map[r.user_id] || null }));
    return res.json({ data: out });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /admin/clients:
 *   post:
 *     summary: Create a client (supports multipart with photo)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: Super admin only; others ignored
 *     responses:
 *       201:
 *         description: Created client
 */
adminRouter.post("/clients", upload.single("photo"), async (req, _res, next) => {
  try {
    if (req.file) {
      const up = await uploadBufferToS3({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        keyPrefix: process.env.S3_KEY_PREFIX_CLIENT_PHOTO || "uploads/client/photo/",
      });
      req.body.photo = up.url;
    }
    return next();
  } catch (e) {
    return next(e);
  }
});
