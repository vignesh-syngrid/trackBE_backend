import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("Region", {
    company_id: { type: DataTypes.UUID },
    region_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    region_name: { type: DataTypes.STRING, allowNull: false },
    country_id: { type: DataTypes.INTEGER },
    state_id: { type: DataTypes.UUID },
    district_id: { type: DataTypes.UUID },
    pincodes: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
