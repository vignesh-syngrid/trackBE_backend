import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("Shift", {
    shift_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    company_id: { type: DataTypes.UUID },
    shift_name: { type: DataTypes.STRING, allowNull: false },
    shift_startTime: { type: DataTypes.TIME, allowNull: false },
    shift_endTime: { type: DataTypes.TIME, allowNull: false },
    description: { type: DataTypes.STRING },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
