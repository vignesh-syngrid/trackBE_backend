import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("RoleScreenPermission", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    can_view: { type: DataTypes.BOOLEAN, defaultValue: false },
    can_add: { type: DataTypes.BOOLEAN, defaultValue: false },
    can_edit: { type: DataTypes.BOOLEAN, defaultValue: false },
    can_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
  });
