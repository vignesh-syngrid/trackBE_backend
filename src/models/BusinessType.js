import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("BusinessType", {
    business_typeId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    business_typeName: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
