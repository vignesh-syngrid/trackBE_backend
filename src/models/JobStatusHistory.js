import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("JobStatusHistory", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    job_id: { type: DataTypes.UUID, allowNull: false },
    job_status_id: { type: DataTypes.UUID },
    is_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
    remarks: { type: DataTypes.TEXT },
  });
