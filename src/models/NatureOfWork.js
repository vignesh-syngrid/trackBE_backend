import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("NatureOfWork", {
    now_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    now_name: { type: DataTypes.STRING, allowNull: false },
    now_status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
