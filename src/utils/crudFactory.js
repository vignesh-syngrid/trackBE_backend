import express from "express";
import multer from "multer";
import { buildWhere } from "./filters.js";
import { parseListQuery } from "../middleware/pagination.js";
import { rbac } from "../middleware/rbac.js";

/* -------------------- DB error helpers -------------------- */
export function isUniqueError(err) {
  if (err?.name === "SequelizeUniqueConstraintError") return true;

  const codes = [err?.original?.code, err?.parent?.code, err?.code];
  if (codes.some((code) => String(code || "").trim() === "23505")) return true;

  if (Array.isArray(err?.errors)) {
    const hasUniqueValidator = err.errors.some((item) => {
      const key = String(item?.validatorKey || item?.type || item?.origin || "").toLowerCase();
      return key.includes("unique");
    });
    if (hasUniqueValidator) return true;
  }

  const constraint = String(err?.constraint || err?.original?.constraint || "").toLowerCase();
  if (constraint.includes("unique")) return true;

  const routines = [err?.routine, err?.original?.routine, err?.parent?.routine];
  if (routines.some((routine) => String(routine || "").toLowerCase() === "unique_violation"))
    return true;

  const detail = String(err?.original?.detail || err?.detail || "").toLowerCase();
  if (detail.includes("already exists") || detail.includes("is not unique")) return true;

  const messages = [err?.message, err?.original?.message, err?.parent?.message];
  if (
    messages.some((msg) =>
      String(msg || "")
        .toLowerCase()
        .includes("duplicate key value")
    )
  )
    return true;

  return false;
}
function isFkError(err) {
  return (
    err?.name === "SequelizeForeignKeyConstraintError" ||
    err?.original?.code === "23503" ||
    err?.parent?.code === "23503"
  );
}
function isValidationError(err) {
  return err?.name === "SequelizeValidationError";
}

function formatFieldLabel(field) {
  if (!field) return "Field";
  const clean = String(field).trim();
  if (!clean) return "Field";
  const spaced = clean.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function buildUniqueErrorPayload(err, model) {
  const entityRaw = model?.options?.name?.singular || model?.name || model?.tableName || "Record";
  const entity = formatFieldLabel(entityRaw);
  const items = Array.isArray(err?.errors) ? err.errors : [];
  const fields = {};
  let firstKey;

  for (const item of items) {
    const key = item?.path || item?.column || item?.value?.path;
    if (!key) continue;
    if (!firstKey) firstKey = key;
    const label = formatFieldLabel(key);
    fields[key] = `${label} already exists`;
  }

  if (!firstKey && err?.fields && typeof err.fields === "object") {
    for (const key of Object.keys(err.fields)) {
      if (!key) continue;
      if (!firstKey) firstKey = key;
      const label = formatFieldLabel(key);
      fields[key] = `${label} already exists`;
    }
  }

  if (!firstKey) {
    const detail = String(err?.original?.detail || err?.detail || "");
    const match = detail.match(/\(([^)]+)\)=/);
    if (match?.[1]) {
      firstKey = match[1];
      const label = formatFieldLabel(firstKey);
      fields[firstKey] = `${label} already exists`;
    }
  }

  if (!firstKey) {
    const constraint = String(err?.constraint || err?.original?.constraint || "");
    const match = constraint.match(/(?:^|[_\.])([a-z0-9]+)_key/i);
    if (match?.[1]) {
      firstKey = match[1];
      const label = formatFieldLabel(firstKey);
      fields[firstKey] = `${label} already exists`;
    }
  }

  const label = formatFieldLabel(firstKey);
  const message = firstKey
    ? `${entity} already exists with this ${label.toLowerCase()}`
    : `${entity} already exists`;

  const payload = { message };
  if (Object.keys(fields).length) payload.fields = fields;
  return payload;
}

export function buildFkErrorPayload(err, model) {
  const entityRaw = model?.options?.name?.singular || model?.name || model?.tableName || "Record";
  const entity = formatFieldLabel(entityRaw);
  const detail = String(err?.original?.detail || err?.detail || "");
  const tableMatch = detail.match(/table "([^"]+)"/i);
  const columnMatch = detail.match(/Key \(([^)]+)\)/i);
  const tableLabel = tableMatch?.[1] ? formatFieldLabel(tableMatch[1]) : null;
  const columnLabel = columnMatch?.[1] ? formatFieldLabel(columnMatch[1]) : null;

  let reason = "referenced by other data";
  if (tableLabel) {
    reason = `referenced by ${tableLabel}`;
    if (columnLabel) reason += ` via ${columnLabel.toLowerCase()}`;
  }

  const message = `${entity} cannot be deleted because it is ${reason}.`;

  const payload = { message };
  if (detail) payload.detail = detail;
  return payload;
}

/* -------------------- Org-scope enforcement -------------------- */
function makeOrgScope(model, { orgScoped }) {
  if (!orgScoped) {
    // Not org-scoped (e.g., Company)
    return (_req, _res, next) => next();
  }

  const hasCompanyId =
    model.getAttributes &&
    Object.prototype.hasOwnProperty.call(model.getAttributes(), "company_id");

  return (req, _res, next) => {
    if (!hasCompanyId) return next();
    if (req.user?.role_slug !== "super_admin") {
      req.scopeWhere = { ...(req.scopeWhere || {}), company_id: req.user.company_id };
    }
    next();
  };
}

function enforceOrgOwnership(model, req, body, { orgScoped, forbidChangeOnUpdate = true } = {}) {
  if (!orgScoped) return; // Skip for non-tenant models (e.g., Company)

  const hasCompanyId =
    model.getAttributes &&
    Object.prototype.hasOwnProperty.call(model.getAttributes(), "company_id");
  if (!hasCompanyId) return;

  const isSuper = req.user?.role_slug === "super_admin";

  if (!isSuper) {
    // Force company from token; prevent cross-tenant writes
    if (body.company_id && body.company_id !== req.user.company_id) {
      const err = new Error("Cross-tenant write forbidden");
      err.status = 403;
      throw err;
    }
    body.company_id = req.user.company_id;
  } else if (req.method === "POST" && (body.company_id === undefined || body.company_id === null)) {
    // super_admin must specify company_id on create for org-scoped models
    const err = new Error("company_id is required for super_admin");
    err.status = 400;
    throw err;
  }

  // Never allow changing tenant on update
  if (req.method === "PUT" && forbidChangeOnUpdate) {
    delete body.company_id;
  }
}

/**
 * Reusable CRUD route factory.
 *
 * Options:
 * - model              (required) Sequelize model
 * - screen             (required) RBAC screen name
 * - searchFields       array<string>  fuzzy search on ?searchParam=
 * - exactFields        array<string>  exact match filters (e.g., ids)
 * - statusFieldName    string         boolean status column (default "status")
 * - caseInsensitive    boolean        iLike vs like for search (default true)
 * - normalize          function(body, ctx)   mutate body before create/update; ctx='create'|'update'
 * - preCreate          async function(req, body)  perform business-rule validation before create
 * - preUpdate          async function(req, body, row)  perform business-rule validation before update
 * - findExistingWhere  function(req)  (optional) idempotent POST lookup; omit to fail duplicates with 409
 * - orgScoped          boolean        enable company_id scoping/enforcement (default true)
 * - listWhere          (async) function(req) -> whereClause  // extra list filter (e.g. role-based)
 * - preDelete         async function(req, row)  cleanup before destroy
 */
export function buildCrudRoutes({
  model,
  screen,
  searchFields = [],
  exactFields = [],
  statusFieldName = "status",
  caseInsensitive = true,
  normalize, // optional
  preCreate, // optional
  preUpdate, // optional
  findExistingWhere, // optional (leave undefined to strictly 409 on duplicates)
  orgScoped = true,
  listWhere, // <<< NEW
  preDelete, // optional
  listInclude, // NEW
  viewInclude, // NEW
  listAttributes, // NEW
  viewAttributes, // NEW
}) {
  if (!model) throw new Error("buildCrudRoutes: model is required");
  if (!screen) throw new Error("buildCrudRoutes: screen is required");

  const router = express.Router();
  // Parse multipart form-data (without files) so FormData submissions retain fields
  const multipartParser = multer().none();
  router.use((req, res, next) => {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();
    const type = String(req.headers["content-type"] || "").toLowerCase();
    if (!type.includes("multipart/form-data")) return next();

    if (req.file || (req.files && Object.keys(req.files).length)) return next();

    multipartParser(req, res, (err) => {
      if (!err) return next();
      if (err?.code === "LIMIT_UNEXPECTED_FILE") {
        const fileErr = new Error(
          "File uploads are not supported on this endpoint. Use the designated upload route."
        );
        fileErr.status = 400;
        return next(fileErr);
      }
      return next(err);
    });
  });
  const PK = model.primaryKeyAttribute || Object.keys(model.primaryKeys || {})[0] || "id";

  const orgScope = makeOrgScope(model, { orgScoped });

  /* ========================= LIST ========================= */
  router.get("/", rbac(screen, "view"), parseListQuery, orgScope, async (req, res, next) => {
    try {
      const { limit, offset, sortBy, order, page } = req.listQuery;

      const whereBase = buildWhere(req.query, searchFields, exactFields, {
        statusFieldName,
        caseInsensitive,
      });

      // allow a per-route hook to further restrict list results (can be async)
      const extraWhere =
        typeof listWhere === "function" ? (await Promise.resolve(listWhere(req))) || {} : {};

      const where = { ...whereBase, ...(req.scopeWhere || {}), ...(extraWhere || {}) };

      // safe sort
      const attrs = model.getAttributes ? model.getAttributes() : {};
      const sortField = attrs?.[sortBy] ? sortBy : PK;

      // build options, enabling include/attributes if provided
      const listOpts = {
        where,
        limit,
        offset,
        order: [[sortField, order]],
      };
      if (listInclude) {
        listOpts.include = listInclude;
        listOpts.distinct = true; // avoid inflated counts when joining
      }
      if (listAttributes) {
        listOpts.attributes = listAttributes;
      }

      const { rows, count } = await model.findAndCountAll(listOpts);
      return res.json({ data: rows, page, limit, total: count });
    } catch (e) {
      return next(e);
    }
  });

  /* ========================= GET ONE ========================= */
  router.get("/:id", rbac(screen, "view"), orgScope, async (req, res, next) => {
    try {
      const where = { [PK]: req.params.id, ...(req.scopeWhere || {}) };

      const viewOpts = { where };
      if (viewInclude) viewOpts.include = viewInclude;
      if (viewAttributes) viewOpts.attributes = viewAttributes;

      const row = await model.findOne(viewOpts);
      if (!row) return res.status(404).json({ message: "Not found" });
      return res.json(row);
    } catch (e) {
      return next(e);
    }
  });

  /* ========================= CREATE ========================= */
  router.post("/", rbac(screen, "add"), orgScope, async (req, res, next) => {
    try {
      const body = { ...req.body };

      // Normalize first so org enforcement sees properly coerced values
      if (typeof normalize === "function") normalize(body, "create");
      enforceOrgOwnership(model, req, body, { orgScoped });

      if (typeof preCreate === "function") {
        await preCreate(req, body); // business-rule validation hook
      }

      const created = await model.create(body);
      return res.status(201).json(created);
    } catch (e) {
      if (isUniqueError(e)) {
        // Optional idempotent POST: only if caller provided a finder
        if (typeof findExistingWhere === "function") {
          try {
            const existing = await model.findOne({ where: findExistingWhere(req) });
            if (existing) return res.status(200).json(existing);
          } catch {
            /* ignore */
          }
        }
        const conflict = buildUniqueErrorPayload(e, model);
        return res.status(409).json(conflict);
      }
      if (isValidationError(e)) {
        const items = e.errors || [];
        const mapField = (path, validatorKey, value, defaultMsg) => {
          const v = value == null ? "" : String(value).trim();
          const lower = String(path || "").toLowerCase();
          const cap = (s) =>
            s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "Field";
          if (/notnull/i.test(validatorKey || "")) return `${cap(lower)} is required`;
          if (lower === "email") return v ? "Invalid email" : "Email is required";
          if (lower === "phone") return v ? "Invalid phone" : "Phone is required";
          return defaultMsg || `Invalid ${cap(lower)}`;
        };
        const errors = items.map((it) =>
          mapField(it.path, it.validatorKey || it.type, it.value, it.message)
        );
        const fields = Object.fromEntries(
          items.map((it) => [
            it.path,
            mapField(it.path, it.validatorKey || it.type, it.value, it.message),
          ])
        );
        return res.status(400).json({ message: "Validation error", errors, fields });
      }
      if (e?.status) {
        const payload = { message: e.message };
        if (e.field) payload.field = e.field;
        return res.status(e.status).json(payload);
      }
      return next(e);
    }
  });

  /* ========================= UPDATE ========================= */
  router.put("/:id", rbac(screen, "edit"), orgScope, async (req, res, next) => {
    try {
      const where = { [PK]: req.params.id, ...(req.scopeWhere || {}) };
      const row = await model.findOne({ where });
      if (!row) return res.status(404).json({ message: "Not found" });

      const body = { ...req.body };
      // Normalize first so org enforcement sees properly coerced values
      if (typeof normalize === "function") normalize(body, "update");
      enforceOrgOwnership(model, req, body, { orgScoped });
      delete body.company_id; // never allow changing tenant

      if (typeof preUpdate === "function") {
        await preUpdate(req, body, row); // business-rule validation hook
      }

      await row.update(body);
      return res.json(row);
    } catch (e) {
      if (isUniqueError(e)) {
        const conflict = buildUniqueErrorPayload(e, model);
        return res.status(409).json(conflict);
      }
      if (isValidationError(e)) {
        const items = e.errors || [];
        const mapField = (path, validatorKey, value, defaultMsg) => {
          const v = value == null ? "" : String(value).trim();
          const lower = String(path || "").toLowerCase();
          const cap = (s) =>
            s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "Field";
          if (/notnull/i.test(validatorKey || "")) return `${cap(lower)} is required`;
          if (lower === "email") return v ? "Invalid email" : "Email is required";
          if (lower === "phone") return v ? "Invalid phone" : "Phone is required";
          return defaultMsg || `Invalid ${cap(lower)}`;
        };
        const errors = items.map((it) =>
          mapField(it.path, it.validatorKey || it.type, it.value, it.message)
        );
        const fields = Object.fromEntries(
          items.map((it) => [
            it.path,
            mapField(it.path, it.validatorKey || it.type, it.value, it.message),
          ])
        );
        return res.status(400).json({ message: "Validation error", errors, fields });
      }
      if (e?.status) {
        const payload = { message: e.message };
        if (e.field) payload.field = e.field;
        return res.status(e.status).json(payload);
      }
      return next(e);
    }
  });

  /* ========================= DELETE ========================= */
  router.delete("/:id", rbac(screen, "delete"), orgScope, async (req, res, next) => {
    try {
      const where = { [PK]: req.params.id, ...(req.scopeWhere || {}) };
      const row = await model.findOne({ where });
      if (!row) return res.status(404).json({ message: "Not found" });

      if (typeof preDelete === "function") {
        const result = await preDelete(req, row);
        if (result === false) {
          return;
        }
      }

      await row.destroy();
      return res.json({ message: "Deleted" });
    } catch (e) {
      if (isFkError(e)) {
        const conflict = buildFkErrorPayload(e, model);
        return res.status(409).json(conflict);
      }
      return next(e);
    }
  });

  return router;
}
