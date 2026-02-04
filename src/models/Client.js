import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Client",
    {
      client_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      company_id: { type: DataTypes.UUID, allowNull: false },
      photo: DataTypes.STRING,
      business_typeId: DataTypes.UUID,
      firstName: { type: DataTypes.STRING, allowNull: false },
      lastName: DataTypes.STRING,
      email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
      phone: { type: DataTypes.STRING, allowNull: false },
      address_1: DataTypes.STRING,
      country_id: DataTypes.INTEGER,
      state_id: DataTypes.UUID,
      city: DataTypes.STRING,
      postal_code: DataTypes.STRING,
      lat: DataTypes.DECIMAL(10, 7),
      lng: DataTypes.DECIMAL(10, 7),
      visiting_startTime: DataTypes.TIME,
      visiting_endTime: DataTypes.TIME,
      available_status: { type: DataTypes.BOOLEAN, defaultValue: true },
      status: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      hooks: {
        beforeValidate: (c) => {
          if (c.email) c.email = c.email.trim().toLowerCase();
          if (c.phone) c.phone = String(c.phone).replace(/\D+/g, "");
          if (c.firstName) c.firstName = c.firstName.trim();
          if (c.lastName) c.lastName = c.lastName?.trim();
          if (c.city) c.city = c.city?.trim();
        },
      },
      indexes: [
        { unique: true, fields: ["company_id", "email"] },
        { unique: true, fields: ["company_id", "phone"] },
      ],
      tableName: "Client",
      freezeTableName: true,
    }
  );
