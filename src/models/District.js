import { DataTypes } from "sequelize";

export default (sequelize) => {
  const District = sequelize.define(
    "District",
    {
      district_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      country_id: { type: DataTypes.INTEGER, allowNull: false },
      state_id: { type: DataTypes.UUID, allowNull: false },
      district_name: { type: DataTypes.STRING, allowNull: false },
      district_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "District",
      freezeTableName: true,
      indexes: [
        { unique: true, fields: ["state_id", "district_name"], name: "District_state_name_uq" },
      ],
      hooks: {
        beforeValidate(d) {
          if (typeof d.district_name === "string") d.district_name = d.district_name.trim();
        },
      },
    }
  );
  return District;
};
