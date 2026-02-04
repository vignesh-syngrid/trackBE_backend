import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      user_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      company_id: { type: DataTypes.UUID },
      photo: { type: DataTypes.STRING },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      phone: { type: DataTypes.STRING, allowNull: false, unique: true },
      emergency_contact: { type: DataTypes.STRING },
      password: { type: DataTypes.STRING, allowNull: false },
      address_1: { type: DataTypes.STRING },
      country_id: { type: DataTypes.INTEGER },
      state_id: { type: DataTypes.UUID },
      city: { type: DataTypes.STRING },
      postal_code: { type: DataTypes.STRING },
      region_ids: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
      supervisor_id: { type: DataTypes.UUID },
      vendor_id: { type: DataTypes.UUID },
      region_id: { type: DataTypes.UUID },
      shift_id: { type: DataTypes.UUID },
      proof: { type: DataTypes.STRING },
      role_id: { type: DataTypes.UUID },
      status: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      hooks: {
        beforeCreate: (u) => {
          if (u.password) u.password = bcrypt.hashSync(u.password, 10);
        },
        beforeUpdate: (u) => {
          if (u.changed("password")) u.password = bcrypt.hashSync(u.password, 10);
        },
      },
    }
  );
  return User;
};
