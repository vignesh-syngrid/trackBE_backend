export function errorHandler(err, req, res, next) {
  // Sequelize DB error for undefined column (Postgres code 42703)
  const pgCode = err?.original?.code || err?.parent?.code;
  const msg = String(err?.message || "");
  const detail = String(
    err?.original?.detail || err?.parent?.detail || err?.original?.message || ""
  );

  if (pgCode === "42501") {
    return res.status(403).json({
      message:
        "Insufficient privileges to perform this operation. Ask admin to check your database role.",
      code: "INSUFFICIENT_PRIVILEGE",
    });
  }

  // Unique constraint violation (duplicate key)
  if (pgCode === "23505" || err?.name === "SequelizeUniqueConstraintError") {
    // Try to extract (column) and (value) from Postgres detail:
    // e.g. 'Key (email)=(company2@itrack.com) already exists.'
    const detail = String(
      err?.original?.detail || err?.parent?.detail || err?.original?.message || err?.message || ""
    );

    let column;
    let value;

    // PG detail format
    const m = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/i);
    if (m) {
      column = m[1];
      value = m[2];
    }

    // Sequelize fallback (its .errors often contain path/value)
    if (!column && Array.isArray(err?.errors) && err.errors[0]) {
      column = err.errors[0].path;
      value = err.errors[0].value;
    }

    // Constraint-name fallback => infer likely column
    // e.g. "Company_email_key269" -> "email"
    if (!column && err?.original?.constraint) {
      const c = String(err.original.constraint);
      const guess = c.match(/_(email|phone|username|name|code|slug)_/i)?.[1];
      if (guess) column = guess.toLowerCase();
    }

    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "Field");

    const field = column || "field";
    const message = `${cap(field)} already exists`;

    // Optional: structured field map (handy for form validation UIs)
    const fields = { [field]: message, ...(value ? { value } : {}) };

    return res.status(409).json({
      message,
      code: "UNIQUE_CONSTRAINT_VIOLATION",
      field,
      ...(value ? { value } : {}),
    });
  }

  // If granular duration columns are missing, return a clear message
  const mentionsGranular = /estimated_days|estimated_hours|estimated_minutes/i.test(
    msg + " " + detail
  );
  if (pgCode === "42703" && mentionsGranular) {
    return res.status(400).json({
      message: "Granular duration fields are not available on the server yet",
      error:
        "Database schema is out of sync. Ask admin to add estimated_days, estimated_hours, estimated_minutes or restart server to sync.",
      code: "MISSING_COLUMNS",
    });
  }

  // Generic undefined column error
  if (pgCode === "42703") {
    return res.status(400).json({
      message: "Invalid column referenced in query",
      error: err?.original?.message || err?.message,
      code: "UNDEFINED_COLUMN",
    });
  }

  // FK violation (e.g., trying to delete a record referenced elsewhere)
  if (pgCode === "23503") {
    return res.status(409).json({
      message: "Operation violates a foreign key constraint",
      error: err?.original?.message || err?.message,
      code: "FK_CONSTRAINT_VIOLATION",
    });
  }

  // NOT NULL violation
  if (pgCode === "23502" || /notNull Violation/i.test(msg)) {
    const errors = Array.isArray(err?.errors) ? err.errors : [];

    const firstErrorPath = errors.find((item) => item?.path)?.path;
    const columnFromErrorArray = firstErrorPath
      ? String(firstErrorPath).split(".").pop()
      : undefined;
    const columnFromOriginal =
      err?.original?.column ||
      err?.parent?.column ||
      (err?.fields && Object.keys(err.fields || {})[0]);

    // Try to extract column name from detail like: "null value in column \"email\" of relation ..."
    const matchDetail = detail.match(/column \"([^\"]+)\"/i);
    const matchMessage = msg.match(/\.(\w+) cannot be null/i);

    const column =
      columnFromErrorArray ||
      columnFromOriginal ||
      (matchDetail ? matchDetail[1] : undefined) ||
      (matchMessage ? matchMessage[1] : undefined);

    const cleanField = (value) => {
      if (!value) return undefined;
      const plain = String(value).trim();
      if (!plain) return undefined;
      return plain.split(".").pop();
    };

    const field = cleanField(column) || "field";
    const nice = (s) =>
      s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/[_\.]/g, " ") : "Field";
    const message = `${nice(field)} is required`;

    const payload = { message, field, code: "NOT_NULL_VIOLATION" };
    if (field && field !== "field") {
      payload.fields = { [field]: message };
    } else if (errors.length) {
      const entries = errors
        .filter((item) => item?.path)
        .map((item) => {
          const k = cleanField(item.path);
          return [k || item.path, item.message || `${nice(k || item.path)} is required`];
        });
      if (entries.length) payload.fields = Object.fromEntries(entries);
    }

    return res.status(400).json(payload);
  }

  // Multer file upload errors
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File too large", code: err.code });
    }
    return res.status(400).json({ message: err.message || "Upload error", code: err.code });
  }
  if (err?.code === "INVALID_UPLOAD_TYPE") {
    return res.status(400).json({ message: err.message, code: err.code });
  }

  // Sequelize validation errors (fallback for controllers not using crudFactory)
  if (err?.name === "SequelizeValidationError") {
    const items = err.errors || [];
    const mapField = (path, validatorKey, value, defaultMsg) => {
      const v = value == null ? "" : String(value).trim();
      const lower = String(path || "").toLowerCase();
      const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "Field");
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

  // Invalid text representation (e.g., invalid UUID)
  if (pgCode === "22P02") {
    return res.status(400).json({
      message: "Invalid value for field type",
      error: err?.original?.message || err?.message,
      code: "INVALID_TEXT_REPRESENTATION",
    });
  }

  // Validation style errors that set err.status
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }

  // Postgres numeric value out of range (e.g., DECIMAL overflow)
  if (pgCode === "22003" || /numeric field overflow/i.test(msg)) {
    return res.status(400).json({
      message: "Numeric value out of range",
      error: msg,
      code: "NUMERIC_OUT_OF_RANGE",
    });
  }

  res.status(500).json({ message: "Internal Server Error", error: err?.message });
}
