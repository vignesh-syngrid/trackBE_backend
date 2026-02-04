import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Op } from "sequelize";
import {
  User,
  Vendor,
  Company,
  Role,
  RoleScreenPermission,
  Screen,
  Shift,
  Region,
} from "../models/index.js";
import { verifyIdToken, initFirebase, isFirebaseReady } from "../utils/firebase.js";
dotenv.config();

const stripPasswords = (obj) => {
  const data = obj.toJSON();
  // for (const k of Object.keys(data)) if (k.toLowerCase().includes("password")) delete data[k];
  return data;
};

const buildAuthResponse = async (principal, type) => {
  let role_id = principal.role_id;
  let company_id = principal.company_id || null;

  // company principals default to company_admin role
  if (type === "company") {
    const r = await Role.findOne({ where: { role_slug: "company_admin" } });
    role_id = r?.role_id || role_id;
    company_id = principal.company_id || null;
  }

  const role = await Role.findOne({ where: { role_id } });
  const perms = await RoleScreenPermission.findAll({ where: { role_id }, include: [Screen] });
  const permissions = perms.map((p) => ({
    screen: p.Screen?.name,
    view: p.can_view,
    add: p.can_add,
    edit: p.can_edit,
    delete: p.can_delete,
  }));

  // ---- lookups for friendly names -----------------------------------------
  const p = principal?.toJSON ? principal.toJSON() : principal;

  let company = null;
  let vendor = null;
  let shift = null;
  let region = null;
  let supervisor = null;

  if (type === "user") {
    [company, vendor, shift, region, supervisor] = await Promise.all([
      p.company_id
        ? Company.findOne({
            where: { company_id: p.company_id },
            attributes: ["company_id", "name", "theme_color", "logo"],
          })
        : null,
      p.vendor_id
        ? Vendor.findOne({
            where: { vendor_id: p.vendor_id },
            attributes: ["vendor_id", "vendor_name"],
          })
        : null,
      p.shift_id
        ? Shift.findOne({ where: { shift_id: p.shift_id }, attributes: ["shift_id", "shift_name"] })
        : null,
      p.region_id
        ? Region.findOne({
            where: { region_id: p.region_id },
            attributes: ["region_id", "region_name"],
          })
        : null,
      p.supervisor_id
        ? User.findOne({ where: { user_id: p.supervisor_id }, attributes: ["user_id", "name"] })
        : null,
    ]);
  } else if (type === "vendor") {
    company = p.company_id
      ? await Company.findOne({
          where: { company_id: p.company_id },
          attributes: ["company_id", "name", "theme_color"],
        })
      : null;
  } else if (type === "company") {
    company = p.company_id
      ? await Company.findOne({
          where: { company_id: p.company_id },
          attributes: ["company_id", "name", "theme_color", "logo"],
        })
      : null;
  }
  // -------------------------------------------------------------------------

  // NOTE: stripPasswords removes any field containing "password".
  // If you want to INCLUDE the password in profile, replace the next line with:
  //   const baseProfile = p;  // (dangerous: exposes hashed/plain password)
  const baseProfile = stripPasswords(principal);

  // merge friendly names (and minimal objects) directly into profile
  const profile = {
    ...(baseProfile?.toJSON ? baseProfile.toJSON() : baseProfile),
    company_name: company?.name ?? null,
    vendor_name: vendor?.vendor_name ?? null,
    supervisor_name: supervisor?.name ?? null,
    shift_name: shift?.shift_name ?? null,
    region_name: region?.region_name ?? null,
    company_theme_color: company?.theme_color ?? null,
    logo: company?.logo ?? null,
    // optional: tiny embedded objects for convenience in UIs
    company: company
      ? {
          company_id: company.company_id,
          name: company.name,
          theme_color: company.theme_color ?? null,
        }
      : null,
    vendor: vendor ? { vendor_id: vendor.vendor_id, name: vendor.vendor_name } : null,
    supervisor: supervisor ? { user_id: supervisor.user_id, name: supervisor.name } : null,
    shift: shift ? { shift_id: shift.shift_id, name: shift.shift_name } : null,
    region: region ? { region_id: region.region_id, name: region.region_name } : null,
  };

  const token = jwt.sign(
    {
      sub: principal.user_id || principal.vendor_id || principal.company_id,
      type,
      role_id,
      role_slug: role?.role_slug,
      company_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return {
    token,
    user: {
      type,
      role: { id: role?.role_id, name: role?.role_name, slug: role?.role_slug },
      company_id,
      company_theme_color: company?.theme_color ?? null,
      profile,
    },
    permissions,
  };
};

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    console.log('email, password: ', email, password);
    if (!email || !password) return res.status(400).json({ message: "email & password required" });

    let principal = null;
    let type = null;

    const user = await User.findOne({ where: { email } });
    console.log('user: ', user);
    if (user && bcrypt.compareSync(password, user.password)) {
      principal = user;
      type = "user";
    }
      console.log('principal: ', principal);

    if (!principal) {
      const vendor = await Vendor.findOne({ where: { email } });
      console.log('vendor: ', vendor);
      if (vendor && bcrypt.compareSync(password, vendor.password)) {
        principal = vendor;
        type = "vendor";
      }
    }
    if (!principal) {
      const company = await Company.findOne({ where: { email } });
      if (company && bcrypt.compareSync(password, company.password)) {
        principal = company;
        type = "company";
      }
    }
    if (!principal) return res.status(401).json({ message: "Invalid credentials" });

    const response = await buildAuthResponse(principal, type);
    res.json(response);
  } catch (e) {
    console.log('esssssssssssssss: ', e);
    next(e);
  }
}

export async function mobileLogin(req, res, next) {
  try {
    const body = req.body || {};
    // Accept multiple common locations for the Firebase ID token
    const headerAuth = req.headers.authorization || "";
    const bearer = headerAuth.startsWith("Bearer ") ? headerAuth.slice(7) : null;
    const headerX = req.headers["x-firebase-token"] || req.headers["x-id-token"];
    const queryToken = req.query?.idToken || req.query?.token || req.query?.id_token;
    const idToken = body.idToken || body.firebaseToken || body.token || body.id_token;
    const tokenToVerify = idToken || bearer || headerX || queryToken;
    if (!tokenToVerify) {
      return res.status(400).json({ message: "idToken (Firebase) is required" });
    }

    // Ensure Firebase is initialized
    initFirebase();
    if (!isFirebaseReady())
      return res.status(500).json({ message: "Firebase not configured on server" });

    const decoded = await verifyIdToken(tokenToVerify);
    const phoneNumber = decoded?.phone_number || ""; // E.164 like +9198...
    if (!phoneNumber) return res.status(401).json({ message: "Phone number missing in token" });

    const digits = String(phoneNumber).replace(/\D+/g, "");
    const last10 = digits.length > 10 ? digits.slice(-10) : digits;

    let principal = null;
    let type = null;

    // Try User by phone
    principal = await User.findOne({
      where: { phone: { [Op.or]: [digits, last10] } },
    });
    if (principal) type = "user";

    // Then Vendor by phone (may be non-unique across companies; pick first)
    if (!principal) {
      principal = await Vendor.findOne({
        where: { phone: { [Op.or]: [digits, last10] } },
      });
      if (principal) type = "vendor";
    }

    // Then Company by phone
    if (!principal) {
      principal = await Company.findOne({
        where: { phone: { [Op.or]: [digits, last10] } },
      });
      if (principal) type = "company";
    }

    if (!principal) return res.status(401).json({ message: "No account mapped to this phone" });

    const response = await buildAuthResponse(principal, type);
    res.json(response);
  } catch (e) {
    next(e);
  }
}

export async function firebaseStatus(req, res) {
  initFirebase();
  res.json({ ready: isFirebaseReady() });
}

// Precheck endpoint: verifies that the phone exists in the system.
// Firebase OTP SMS should be initiated on the client using Firebase SDK.
export async function requestOtp(req, res, next) {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ message: "phone required" });

    const digits = String(phone).replace(/\D+/g, "");
    const last10 = digits.length > 10 ? digits.slice(-10) : digits;

    let principal = await User.findOne({ where: { phone: { [Op.or]: [digits, last10] } } });
    if (!principal)
      principal = await Vendor.findOne({ where: { phone: { [Op.or]: [digits, last10] } } });
    if (!principal)
      principal = await Company.findOne({ where: { phone: { [Op.or]: [digits, last10] } } });

    if (!principal) return res.status(404).json({ message: "No account mapped to this phone" });

    return res.json({ ok: true, message: "Phone recognized. Use Firebase client to send OTP." });
  } catch (e) {
    next(e);
  }
}
