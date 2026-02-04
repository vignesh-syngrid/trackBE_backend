import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Pincode = sequelize.define(
    "Pincode",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      country_id: { type: DataTypes.INTEGER, allowNull: false },
      state_id: { type: DataTypes.UUID, allowNull: false },
      district_id: { type: DataTypes.UUID, allowNull: false },

      pincode: { type: DataTypes.STRING, allowNull: false },
      lat: { type: DataTypes.DECIMAL(10, 7) },
      lng: { type: DataTypes.DECIMAL(10, 7) },
    },
    {
      tableName: "Pincode",
      freezeTableName: true,
      indexes: [
        // Unique per country (change to ["district_id","pincode"] if you prefer stricter)
        { unique: true, fields: ["country_id", "pincode"], name: "Pincode_country_pincode_uq" },
      ],
      hooks: {
        beforeValidate(p) {
          if (typeof p.pincode !== "undefined")
            p.pincode = String(p.pincode).replace(/\s+/g, "").toUpperCase();
        },
      },
    }
  );
  return Pincode;
};
