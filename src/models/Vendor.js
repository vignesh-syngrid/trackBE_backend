import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";

export default (sequelize) => {
  const Vendor = sequelize.define(
    "Vendor",
    {
      vendor_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      company_id: { type: DataTypes.UUID, allowNull: false }, // must belong to a company
      vendor_name: { type: DataTypes.STRING, allowNull: false },
      photo: DataTypes.STRING,
      address_1: DataTypes.STRING,
      email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
      phone: { type: DataTypes.STRING, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      country_id: DataTypes.INTEGER,
      state_id: DataTypes.UUID,
      region: DataTypes.STRING,
      postal_code: DataTypes.STRING,
      role_id: DataTypes.UUID,
      region_id: DataTypes.UUID,
      city: DataTypes.STRING,
      status: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      hooks: {
        beforeValidate: (v) => {
          if (v.email) v.email = v.email.trim().toLowerCase();
          if (v.phone) v.phone = String(v.phone).replace(/\D+/g, "");
        },
        beforeCreate: (v) => {
          if (v.password && !v.password.startsWith("$2"))
            v.password = bcrypt.hashSync(v.password, 10);
        },
        beforeUpdate: (v) => {
          if (v.changed("password") && v.password && !v.password.startsWith("$2")) {
            v.password = bcrypt.hashSync(v.password, 10);
          }
          if (v.changed("email") && v.email) v.email = v.email.trim().toLowerCase();
          if (v.changed("phone") && v.phone) v.phone = String(v.phone).replace(/\D+/g, "");
        },
      },
      indexes: [
        { unique: true, fields: ["company_id", "email"] },
        { unique: true, fields: ["company_id", "phone"] },
      ],
      tableName: "Vendor",
      freezeTableName: true,
    }
  );
  return Vendor;
};
