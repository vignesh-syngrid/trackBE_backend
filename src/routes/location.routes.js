import express from "express";
import { Country, State, District, Pincode, Region } from "../models/index.js";
import { buildCrudRoutes } from "../utils/crudFactory.js";
import { Op, Sequelize } from "sequelize";

export const locationRouter = express.Router();

// helper: allow only super_admin to create
const onlySuperAdminCreate = async (req) => {
  if (req.user?.role_slug !== "super_admin") {
    const err = new Error("Only super_admin can create locations");
    err.status = 403;
    throw err;
  }
};

locationRouter.use(
  "/countries",
  buildCrudRoutes({
    model: Country,
    screen: "Settings",
    searchFields: ["country_name", "country_code"],
    exactFields: ["country_id", "country_code", "country_status"],
    statusFieldName: "country_status",
    preCreate: onlySuperAdminCreate, // 👈 create restricted to super_admin
    // If you also want to block edits to non-super:
    // preUpdate: onlySuperAdminCreate,
    // Filter availability via ?available=true|false
    listWhere: async (req) => {
      const raw = String(req.query.available ?? "").toLowerCase();
      const truthy = new Set(["1", "true", "t", "yes", "y"]);
      const falsy = new Set(["0", "false", "f", "no", "n"]);
      if (!truthy.has(raw) && !falsy.has(raw)) return {};
      const regions = await Region.findAll({ attributes: ["pincodes"], raw: true });
      const used = new Set();
      for (const r of regions) {
        for (const p of r.pincodes || []) {
          const norm = String(p).replace(/\s+/g, "").toUpperCase();
          if (norm) used.add(norm);
        }
      }
      const arr = Array.from(used);
      // Normalize DB value: UPPER(REGEXP_REPLACE(pincode, '\\s+', '', 'g'))
      const normCol = Sequelize.fn(
        "upper",
        Sequelize.fn("regexp_replace", Sequelize.col("pincode"), "\\s+", "", "g")
      );
      if (truthy.has(raw)) {
        return arr.length ? { [Op.and]: [Sequelize.where(normCol, { [Op.notIn]: arr })] } : {};
      }
      return arr.length
        ? { [Op.and]: [Sequelize.where(normCol, { [Op.in]: arr })] }
        : { [Op.and]: [Sequelize.where(normCol, { [Op.in]: ["__none__match__"] })] };
    },
  })
);

locationRouter.use(
  "/states",
  buildCrudRoutes({
    model: State,
    screen: "Settings",
    searchFields: ["state_name"],
    exactFields: ["country_id", "state_id", "state_status"],
    statusFieldName: "state_status",
    preCreate: onlySuperAdminCreate, // 👈
    // preUpdate: onlySuperAdminCreate,
  })
);

locationRouter.use(
  "/districts",
  buildCrudRoutes({
    model: District,
    screen: "Settings",
    searchFields: ["district_name"],
    exactFields: ["country_id", "state_id", "district_id", "district_status"],
    statusFieldName: "district_status",
    preCreate: onlySuperAdminCreate, // 👈
    // preUpdate: onlySuperAdminCreate,
  })
);

locationRouter.use(
  "/pincodes",
  buildCrudRoutes({
    model: Pincode,
    screen: "Settings",
    searchFields: ["pincode"],
    exactFields: ["country_id", "state_id", "district_id", "pincode"],
    // normalize PIN format
    normalize: (body) => {
      if (body.pincode != null) {
        body.pincode = String(body.pincode).replace(/\s+/g, "").toUpperCase();
      }
    },
    // keep your idempotent behavior if you want to avoid hard 409s for duplicates:
    findExistingWhere: (req) => ({
      country_id: req.body.country_id,
      pincode: String(req.body.pincode).replace(/\s+/g, "").toUpperCase(),
    }),
    preCreate: onlySuperAdminCreate, // 👈
    // preUpdate: onlySuperAdminCreate,
  })
);
