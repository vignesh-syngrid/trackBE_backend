import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("JobType", {
    jobtype_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    company_id: { type: DataTypes.UUID },
    worktype_id: { type: DataTypes.UUID },
    jobtype_name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    estimated_duration: { type: DataTypes.INTEGER },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
