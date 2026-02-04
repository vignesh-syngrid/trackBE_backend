import { Op } from "sequelize";

// escape % and _ for LIKE/iLIKE
const esc = (s) => String(s).replace(/[\\%_]/g, (m) => `\\${m}`);

const truthy = new Set(["1", "true", "t", "yes", "y"]);
const falsy = new Set(["0", "false", "f", "no", "n"]);

export function buildWhere(query, searchFields = [], exactFields = [], opts = {}) {
  const where = {};
  const { statusFieldName = "status", caseInsensitive = true } = opts;

  // 1) status= true|false|1|0|yes|no -> maps to the provided status column
  if (query.status !== undefined) {
    const raw = String(query.status).toLowerCase();
    if (truthy.has(raw)) where[statusFieldName] = true;
    else if (falsy.has(raw)) where[statusFieldName] = false;
  }

  // 2) exact field equality (country_id, state_id, district_id, pincode, etc.)
  for (const f of exactFields) {
    if (query[f] !== undefined && query[f] !== "") {
      where[f] = query[f];
    }
  }

  // 3) searchParam across the given searchFields (iLike on Postgres)
  if (query.searchParam && searchFields.length) {
    const q = esc(String(query.searchParam).trim());
    if (q) {
      const likeOp = caseInsensitive ? Op.iLike : Op.like;
      where[Op.or] = searchFields.map((f) => ({ [f]: { [likeOp]: `%${q}%` } }));
    }
  }

  return where;
}
