import { sequelize } from "../config/database.js";

// Init functions
import CountryInit from "./Country.js";
import StateInit from "./State.js";
import DistrictInit from "./District.js";
import PincodeInit from "./Pincode.js";
import NatureOfWorkInit from "./NatureOfWork.js";
import JobStatusInit from "./JobStatus.js";
import SubscriptionTypeInit from "./SubscriptionType.js";
import BusinessTypeInit from "./BusinessType.js";
import RoleInit from "./Role.js";
import ScreenInit from "./Screen.js";
import RoleScreenPermissionInit from "./RoleScreenPermission.js";
import CompanyInit from "./Company.js";
import VendorInit from "./Vendor.js";
import ShiftInit from "./Shift.js";
import RegionInit from "./Region.js";
import WorkTypeInit from "./WorkType.js";
import JobTypeInit from "./JobType.js";
import UserInit from "./User.js";
import ClientInit from "./Client.js";
import JobInit from "./Job.js";
import JobStatusHistoryInit from "./JobStatusHistory.js";
import AttendanceInit from "./Attendance.js";
import JobChatInit from "./JobChat.js";
import JobAttachmentInit from "./JobAttachment.js";

// Create models
export const Country = CountryInit(sequelize);
export const State = StateInit(sequelize);
export const District = DistrictInit(sequelize);
export const Pincode = PincodeInit(sequelize);
export const NatureOfWork = NatureOfWorkInit(sequelize);
export const JobStatus = JobStatusInit(sequelize);
export const SubscriptionType = SubscriptionTypeInit(sequelize);
export const BusinessType = BusinessTypeInit(sequelize);
export const Role = RoleInit(sequelize);
export const Screen = ScreenInit(sequelize);
export const RoleScreenPermission = RoleScreenPermissionInit(sequelize);
export const Company = CompanyInit(sequelize);
export const Vendor = VendorInit(sequelize);
export const Shift = ShiftInit(sequelize);
export const Region = RegionInit(sequelize);
export const WorkType = WorkTypeInit(sequelize);
export const JobType = JobTypeInit(sequelize);
export const User = UserInit(sequelize);
export const Client = ClientInit(sequelize);
export const Job = JobInit(sequelize);
export const JobStatusHistory = JobStatusHistoryInit(sequelize);
export const Attendance = AttendanceInit(sequelize);
export const JobChat = JobChatInit(sequelize);
export const JobAttachment = JobAttachmentInit(sequelize);

// Associations
State.belongsTo(Country, { foreignKey: "country_id" });
Country.hasMany(State, { foreignKey: "country_id" });

District.belongsTo(State, { foreignKey: "state_id" });
District.belongsTo(Country, { foreignKey: "country_id" });
State.hasMany(District, { foreignKey: "state_id" });

Pincode.belongsTo(Country, { foreignKey: "country_id" });
Pincode.belongsTo(State, { foreignKey: "state_id" });
Pincode.belongsTo(District, { foreignKey: "district_id" });

Company.belongsTo(SubscriptionType, { foreignKey: "subscription_id" });
Company.belongsTo(Country, { foreignKey: "country_id" });
Company.belongsTo(State, { foreignKey: "state_id" });

Vendor.belongsTo(Company, { foreignKey: "company_id" });
Vendor.belongsTo(Role, { foreignKey: "role_id" });
Vendor.belongsTo(Region, {
  as: "region_obj",
  foreignKey: { name: "region_id", allowNull: true },
  targetKey: "region_id",
  onDelete: "SET NULL", // recommended
  onUpdate: "CASCADE",
});

Client.belongsTo(Company, { foreignKey: "company_id" });
Client.belongsTo(BusinessType, { foreignKey: "business_typeId" });
Client.belongsTo(State, { foreignKey: "state_id", as: "state" });
Client.belongsTo(Country, { foreignKey: "country_id", as: "country" });

User.belongsTo(Company, { foreignKey: "company_id" });
User.belongsTo(Role, { foreignKey: "role_id" });
User.belongsTo(User, { as: "supervisor", foreignKey: "supervisor_id" });
User.belongsTo(Vendor, { foreignKey: "vendor_id" });
User.belongsTo(Shift, { foreignKey: "shift_id" });
User.belongsTo(Region, { foreignKey: "region_id", as: "region" });
User.belongsTo(State, { foreignKey: "state_id", as: "state" });
User.belongsTo(Country, { foreignKey: "country_id", as: "country" });

Job.belongsTo(Company, { foreignKey: "company_id" });
Job.belongsTo(Client, { foreignKey: "client_id", as: "client" });
Job.belongsTo(WorkType, { foreignKey: "worktype_id", as: "work_type" });
Job.belongsTo(JobType, { foreignKey: "jobtype_id", as: "job_type" });
Job.belongsTo(User, { as: "supervisor", foreignKey: "supervisor_id" });
Job.belongsTo(User, { as: "technician", foreignKey: "technician_id" });
Job.belongsTo(NatureOfWork, { foreignKey: "now_id", as: "nature_of_work" });
Job.belongsTo(JobStatus, { foreignKey: "job_status_id", as: "job_status" });

JobStatusHistory.belongsTo(Job, { foreignKey: "job_id", onDelete: "CASCADE" });
Job.hasMany(JobStatusHistory, { foreignKey: "job_id", onDelete: "CASCADE", hooks: true });
// Link history entries to their status record for eager loading
JobStatusHistory.belongsTo(JobStatus, { foreignKey: "job_status_id" });
JobStatus.hasMany(JobStatusHistory, { foreignKey: "job_status_id" });

Job.hasMany(JobChat, { as: "chats", foreignKey: "job_id", onDelete: "CASCADE", hooks: true });
JobChat.belongsTo(Job, { foreignKey: "job_id", onDelete: "CASCADE" });

Job.hasMany(JobAttachment, { as: "attachments", foreignKey: "job_id", onDelete: "CASCADE", hooks: true });
JobAttachment.belongsTo(Job, { foreignKey: "job_id", onDelete: "CASCADE" });
JobAttachment.belongsTo(User, { as: "uploader", foreignKey: "uploaded_by", onDelete: "SET NULL" });
JobChat.belongsTo(User, { as: "author", foreignKey: "user_id", onDelete: "SET NULL" });
User.hasMany(JobChat, { as: "job_chats", foreignKey: "user_id" });
JobChat.belongsTo(Vendor, { as: "vendor_author", foreignKey: "vendor_id", onDelete: "SET NULL" });
Vendor.hasMany(JobChat, { as: "job_chats", foreignKey: "vendor_id" });
JobChat.belongsTo(Company, { as: "company_author", foreignKey: "company_id", onDelete: "SET NULL" });
Company.hasMany(JobChat, { as: "company_job_chats", foreignKey: "company_id" });
User.hasMany(JobAttachment, { as: "uploaded_attachments", foreignKey: "uploaded_by" });

// Attendance associations
Attendance.belongsTo(Company, { foreignKey: "company_id" });

WorkType.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Company.hasMany(WorkType, { foreignKey: "company_id", as: "work_types" });

JobType.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Company.hasMany(JobType, { foreignKey: "company_id", as: "job_types" });

Region.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Company.hasMany(Region, { foreignKey: "company_id", as: "regions" });

Shift.belongsTo(Company, { foreignKey: "company_id", as: "company" });
Company.hasMany(Shift, { foreignKey: "company_id", as: "shifts" });
Attendance.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Attendance, { foreignKey: "user_id" });

RoleScreenPermission.belongsTo(Role, { foreignKey: "role_id" });
Role.hasMany(RoleScreenPermission, { foreignKey: "role_id" });
RoleScreenPermission.belongsTo(Screen, { foreignKey: "screen_id" });
Screen.hasMany(RoleScreenPermission, { foreignKey: "screen_id" });

export async function syncAll() {
  await convertLegacyJobIds();
  await cleanupLegacyJobNo();
  await sequelize.sync({ alter: true });
}

const uuidFromColumn = (columnRef) => `(
  substr(md5(${columnRef}::text || 'JobUUID'), 1, 8) || '-' ||
  substr(md5(${columnRef}::text || 'JobUUID'), 9, 4) || '-' ||
  substr(md5(${columnRef}::text || 'JobUUID'), 13, 4) || '-' ||
  substr(md5(${columnRef}::text || 'JobUUID'), 17, 4) || '-' ||
  substr(md5(${columnRef}::text || 'JobUUID'), 21, 12)
)::uuid`;

async function getColumnType(table, column) {
  try {
    const [rows] = await sequelize.query(
      `SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'`
    );
    const rec = Array.isArray(rows) ? rows[0] : rows;
    return rec?.data_type ? String(rec.data_type).toLowerCase() : null;
  } catch (err) {
    console.warn(`Column lookup failed for ${table}.${column}`, err?.message || err);
    return null;
  }
}

async function getJobRelations() {
  try {
    const [rows] = await sequelize.query(`
      SELECT tc.table_name AS table_name, tc.constraint_name AS constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND kcu.column_name = 'job_id'
        AND ccu.table_name = 'Job';
    `);
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      table: r.table_name,
      constraint: r.constraint_name,
    }));
  } catch (err) {
    console.warn('Job relation lookup failed:', err?.message || err);
    return [];
  }
}

async function convertLegacyJobIds() {
  const jobType = await getColumnType('Job', 'job_id');
  const relations = await getJobRelations();

  const relationsToConvert = [];
  for (const rel of relations) {
    const relType = await getColumnType(rel.table, 'job_id');
    if (relType && relType !== 'uuid') {
      relationsToConvert.push(rel);
    }
  }

  const needsJob = !!jobType && jobType !== 'uuid';

  if (!needsJob && relationsToConvert.length === 0) return;

  if (needsJob) {
    await convertJobTableToUuid(relationsToConvert);
  } else if (relationsToConvert.length) {
    await convertJobRelationsToUuid(relationsToConvert);
  }

  try {
    await sequelize.query('DROP SEQUENCE IF EXISTS job_id_seq');
  } catch (e) {
    console.warn('job_id_seq cleanup failed:', e?.message || e);
  }
}

async function convertJobTableToUuid(relations) {
  const jobUuidExpr = uuidFromColumn('job_id');

  try {
    await sequelize.transaction(async (transaction) => {
      for (const rel of relations) {
        if (rel.constraint) {
          await sequelize.query(`ALTER TABLE "${rel.table}" DROP CONSTRAINT IF EXISTS "${rel.constraint}"`, {
            transaction,
          });
        }
      }

      await sequelize.query('ALTER TABLE "Job" DROP CONSTRAINT IF EXISTS "Job_pkey"', { transaction });
      await sequelize.query('ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS job_uuid uuid', { transaction });
      await sequelize.query(`UPDATE "Job" SET job_uuid = ${jobUuidExpr} WHERE job_uuid IS NULL`, { transaction });
      await sequelize.query('ALTER TABLE "Job" ALTER COLUMN job_uuid SET NOT NULL', { transaction });

      for (const rel of relations) {
        await convertRelationTable(rel, { transaction, jobTableHasUuidColumn: true });
      }

      await sequelize.query('ALTER TABLE "Job" DROP COLUMN job_id', { transaction });
      await sequelize.query('ALTER TABLE "Job" RENAME COLUMN job_uuid TO job_id', { transaction });
      await sequelize.query('ALTER TABLE "Job" ADD PRIMARY KEY (job_id)', { transaction });

      for (const rel of relations) {
        const constraintName = rel.constraint || `${rel.table}_job_id_fkey`;
        await sequelize.query(
          `ALTER TABLE "${rel.table}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY (job_id) REFERENCES "Job"(job_id) ON DELETE CASCADE`,
          { transaction }
        );
      }
    });
  } catch (e) {
    console.warn('Job UUID migration failed:', e?.message || e);
  }
}

async function convertRelationTable({ table, constraint }, { transaction, jobTableHasUuidColumn }) {
  const alias = 'rel';
  const computedUuid = uuidFromColumn(`${alias}.job_id`);
  const existingFromJob = jobTableHasUuidColumn
    ? `(SELECT job_uuid FROM "Job" j WHERE j.job_id::text = ${alias}.job_id::text LIMIT 1)`
    : `(SELECT job_id FROM "Job" j WHERE j.job_id = ${computedUuid} LIMIT 1)`;
  const fallbackFromJob = jobTableHasUuidColumn
    ? `(SELECT job_uuid FROM "Job" j WHERE j.job_uuid = ${computedUuid} LIMIT 1)`
    : `(SELECT job_id FROM "Job" j WHERE j.job_id = ${computedUuid} LIMIT 1)`;

  if (constraint) {
    await sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`, { transaction });
  }

  await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS job_uuid uuid`, { transaction });
  await sequelize.query(
    `UPDATE "${table}" AS ${alias}
     SET job_uuid = COALESCE(job_uuid, ${existingFromJob}, ${fallbackFromJob}, ${computedUuid})`,
    { transaction }
  );
  await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN job_uuid SET NOT NULL`, { transaction });
  await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN job_id`, { transaction });
  await sequelize.query(`ALTER TABLE "${table}" RENAME COLUMN job_uuid TO job_id`, { transaction });
}

async function convertJobRelationsToUuid(relations) {
  if (!relations.length) return;

  try {
    await sequelize.transaction(async (transaction) => {
      for (const rel of relations) {
        await convertRelationTable(rel, { transaction, jobTableHasUuidColumn: false });
        const constraintName = rel.constraint || `${rel.table}_job_id_fkey`;
        await sequelize.query(
          `ALTER TABLE "${rel.table}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY (job_id) REFERENCES "Job"(job_id) ON DELETE CASCADE`,
          { transaction }
        );
      }
    });
  } catch (e) {
    console.warn('Job relation UUID migration failed:', e?.message || e);
  }
}

async function cleanupLegacyJobNo() {
  const jobType = await getColumnType('Job', 'job_id');
  if (!jobType) return;
  try {
    await sequelize.query('DROP INDEX IF EXISTS job_job_no_unique');
  } catch (e) {
    console.warn('job_job_no_unique drop failed:', e?.message || e);
  }
  try {
    await sequelize.query('ALTER TABLE "Job" DROP COLUMN IF EXISTS job_no');
  } catch (e) {
    console.warn('job_no column drop failed:', e?.message || e);
  }
  try {
    await sequelize.query('DROP SEQUENCE IF EXISTS job_no_seq');
  } catch (e) {
    console.warn('job_no_seq drop failed:', e?.message || e);
  }
}
