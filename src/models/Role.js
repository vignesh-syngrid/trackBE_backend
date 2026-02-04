import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("Role", {
    role_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    role_name: { type: DataTypes.STRING, allowNull: false },
    role_slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
