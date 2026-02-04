import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("Country", {
    country_id: { type: DataTypes.INTEGER, primaryKey: true }, // dialing code
    country_name: { type: DataTypes.STRING, allowNull: false },
    country_code: { type: DataTypes.STRING(4), allowNull: false },
    country_status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
