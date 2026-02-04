import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fn, col, where as sqlWhere } from "sequelize";
import { sequelize } from "../config/database.js";

import {
  Role,
  Screen,
  RoleScreenPermission,
  User,
  Country,
  State,
  District,
  Pincode,
  // Masters:
  BusinessType,
  SubscriptionType,
  NatureOfWork,
  JobStatus,
} from "../models/index.js";

/* ========================= RBAC ========================= */

const RBAC_PATH = path.resolve("src/rbac/rbac_config.json");

const SLUG_MAP = {
  "Super Admin": "super_admin",
  "Company Admin": "company_admin",
  "Vendor / Contractor": "vendor",
  "Supervisor / Dispatcher": "supervisor",
  Technician: "technician",
};

async function ensureRbacUniqueIndexes() {
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND indexname='RoleScreenPermission_role_screen_uq'
      ) THEN
        CREATE UNIQUE INDEX "RoleScreenPermission_role_screen_uq"
          ON "RoleScreenPermission"(role_id, screen_id);
      END IF;
    END$$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname='public' AND indexname='Screen_name_uq'
      ) THEN
        CREATE UNIQUE INDEX "Screen_name_uq" ON "Screen"(name);
      END IF;
    END$$;
  `);
}

async function seedRolesAndScreens() {
  const raw = JSON.parse(fs.readFileSync(RBAC_PATH, "utf-8"));
  const screenNames = [...new Set(raw.roles.flatMap((r) => r.screens.map((s) => s.name)))];

  const screenMap = {};
  for (const name of screenNames) {
    const [row] = await Screen.findOrCreate({ where: { name }, defaults: { name } });
    screenMap[name] = row;
  }

  for (const roleDef of raw.roles) {
    const role_slug = SLUG_MAP[roleDef.name] || roleDef.name.toLowerCase().replace(/\W+/g, "_");
    const [role] = await Role.findOrCreate({
      where: { role_slug },
      defaults: { role_name: roleDef.name, role_slug },
    });

    for (const s of roleDef.screens) {
      const scr = screenMap[s.name];
      const [perm] = await RoleScreenPermission.findOrCreate({
        where: { role_id: role.role_id, screen_id: scr.id },
        defaults: {
          can_view: !!s.permissions.view,
          can_add: !!s.permissions.add,
          can_edit: !!s.permissions.edit,
          can_delete: !!s.permissions.delete,
        },
      });
      await perm.update({
        can_view: !!s.permissions.view,
        can_add: !!s.permissions.add,
        can_edit: !!s.permissions.edit,
        can_delete: !!s.permissions.delete,
      });
    }
  }
}

/* ========================= Super Admin ========================= */

async function seedSuperAdmin() {
  const superRole = await Role.findOne({ where: { role_slug: "super_admin" } });
  if (!superRole) throw new Error("super_admin role missing after seeding RBAC");

  const email = String(process.env.SUPERADMIN_EMAIL || "superadmin@itrack.com")
    .trim()
    .toLowerCase();
  const phone = String(process.env.SUPERADMIN_PHONE || "9999999999").trim();
  const plainPassword = String(process.env.SUPERADMIN_PASSWORD || "Admin@123");

  let user = await User.findOne({ where: sqlWhere(fn("lower", col("email")), email) });

  if (!user) {
    user = await User.create({
      name: "Super Admin",
      email,
      phone,
      password: plainPassword, // plaintext; model hook will hash once
      role_id: superRole.role_id,
      status: true,
    });
  } else {
    await user.update({
      name: "Super Admin",
      email,
      phone,
      password: plainPassword, // plaintext; model hook will hash once
      role_id: superRole.role_id,
      status: true,
    });
  }
}

/* ========================= Locations (stable IDs) ========================= */

const IDS = {
  COUNTRY: { INDIA: 91 },
  STATE: {
    ANDHRA: "1578ddb7-2a14-4eda-92bb-e01aaf23cd3f", // known ID you use
    TAMILNADU: "9a7b0d9b-e687-4c3f-9d3f-4c6e6d3ecb3a",
  },
  DISTRICT: {
    CHITTOOR: "1fc185b5-8a33-440e-8910-2cac1574e6c8", // known ID you use
    CHENNAI: "d1b4d3de-7f7e-4a02-9a3c-c8c5b9efb5aa",
  },
};

async function ensureCountryIndia() {
  const [row] = await Country.findOrCreate({
    where: { country_id: IDS.COUNTRY.INDIA },
    defaults: { country_id: 91, country_name: "India", country_code: "IN", country_status: true },
  });
  return row;
}

async function ensureState({ state_id, country_id, state_name, state_status = true }) {
  let row = await State.findByPk(state_id);
  if (row) return row;
  row = await State.findOne({ where: { country_id, state_name } });
  if (row) return row;
  row = await State.create({ state_id, country_id, state_name, state_status });
  return row;
}

async function ensureDistrict({
  district_id,
  country_id,
  state_id,
  district_name,
  district_status = true,
}) {
  let row = await District.findByPk(district_id);
  if (row) return row;
  row = await District.findOne({ where: { country_id, state_id, district_name } });
  if (row) return row;
  row = await District.create({
    district_id,
    country_id,
    state_id,
    district_name,
    district_status,
  });
  return row;
}

async function ensurePincode({
  country_id,
  state_id,
  district_id,
  pincode,
  lat = null,
  lng = null,
}) {
  const [row] = await Pincode.findOrCreate({
    where: { country_id, state_id, district_id, pincode: String(pincode) },
    defaults: { country_id, state_id, district_id, pincode: String(pincode), lat, lng },
  });
  return row;
}

async function seedIndiaLocations() {
  const country = await ensureCountryIndia();

  const andhra = await ensureState({
    state_id: IDS.STATE.ANDHRA,
    country_id: country.country_id,
    state_name: "Andhra Pradesh",
  });

  const tamilnadu = await ensureState({
    state_id: IDS.STATE.TAMILNADU,
    country_id: country.country_id,
    state_name: "Tamil Nadu",
  });

  const chittoor = await ensureDistrict({
    district_id: IDS.DISTRICT.CHITTOOR,
    country_id: country.country_id,
    state_id: andhra.state_id,
    district_name: "Chittoor",
  });

  const chennai = await ensureDistrict({
    district_id: IDS.DISTRICT.CHENNAI,
    country_id: country.country_id,
    state_id: tamilnadu.state_id,
    district_name: "Chennai",
  });

  await ensurePincode({
    country_id: country.country_id,
    state_id: andhra.state_id,
    district_id: chittoor.district_id,
    pincode: "517415",
    lat: 13.0907,
    lng: 78.6084,
  });
  await ensurePincode({
    country_id: country.country_id,
    state_id: andhra.state_id,
    district_id: chittoor.district_id,
    pincode: "517501",
  });
  await ensurePincode({
    country_id: country.country_id,
    state_id: tamilnadu.state_id,
    district_id: chennai.district_id,
    pincode: "600006",
  });
}

/* ========================= Masters ========================= */

async function seedMasters() {
  // Business Types
  for (const name of ["Business", "Individual"]) {
    const [row] = await BusinessType.findOrCreate({
      where: { business_typeName: name },
      defaults: { business_typeName: name, status: true },
    });
    if (!row.status) await row.update({ status: true });
  }

  // Subscription Types
  for (const title of ["Free", "Paid"]) {
    const [row] = await SubscriptionType.findOrCreate({
      where: { subscription_title: title },
      defaults: { subscription_title: title, subscription_status: true },
    });
    if (!row.subscription_status) await row.update({ subscription_status: true });
  }

  // Nature of Works
  for (const now of ["Phone Call", "Field Work"]) {
    const [row] = await NatureOfWork.findOrCreate({
      where: { now_name: now },
      defaults: { now_name: now, now_status: true },
    });
    if (!row.now_status) await row.update({ now_status: true });
  }

  // Job Statuses (optional colors; tweak as you like)
  const jobStatuses = [
    { title: "Not Started", color: "#2F80ED", order: 1 },
    { title: "Waiting For Approval", color: "#F2C94C", order: 2 },
    { title: "Assigned Tech", color: "#47A63A", order: 3 },
    { title: "EnRoute", color: "#6366F1", order: 4 },
    { title: "OnSite", color: "#0EA5E9", order: 5 },
    { title: "OnHold", color: "#2F80ED", order: 6 },
    { title: "OnResume", color: "#2F80ED", order: 7 },
    { title: "Completed", color: "#47A63A", order: 8 },
    { title: "Cancelled", color: "#ADADAD", order: 9 },
    { title: "UnResolved", color: "#F97316", order: 10 },
    // Keep Rejected for decline action (not in main order)
    { title: "Rejected", color: "#FF7878", order: 99 },
  ];
  // Normalize existing statuses and update or create accordingly
  const normalize = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  const existing = await JobStatus.findAll();
  const map = Object.fromEntries(existing.map((r) => [normalize(r.job_status_title), r]));
  for (const js of jobStatuses) {
    const key = normalize(js.title);
    const row = map[key];
    if (row) {
      const updates = {};
      if (!row.status) updates.status = true;
      if (row.job_status_color_code !== js.color) updates.job_status_color_code = js.color;
      if (row.job_status_order !== js.order) updates.job_status_order = js.order;
      if (Object.keys(updates).length) await row.update(updates);
    } else {
      await JobStatus.create({
        job_status_title: js.title,
        status: true,
        job_status_color_code: js.color,
        job_status_order: js.order,
      });
    }
  }
}

/* ========================= Runner ========================= */

(async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    await ensureRbacUniqueIndexes();
    await seedRolesAndScreens();
    await seedSuperAdmin();
    await seedIndiaLocations();
    await seedMasters();

    console.log("✅ Seeding completed.");
    // process.exit(0);
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  }
})();
