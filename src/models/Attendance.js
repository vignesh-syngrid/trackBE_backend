import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "Attendance",
    {
      attendance_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      company_id: { type: DataTypes.UUID, allowNull: false },
      user_id: { type: DataTypes.UUID, allowNull: false },
      mode: { type: DataTypes.ENUM("bike", "bus"), allowNull: false },
      check_in_at: { type: DataTypes.DATE, allowNull: false },
      check_in_km: { type: DataTypes.INTEGER },
      check_in_photo_url: { type: DataTypes.STRING },
      check_out_at: { type: DataTypes.DATE },
      check_out_km: { type: DataTypes.INTEGER },
      check_out_photo_url: { type: DataTypes.STRING },
      total_minutes: { type: DataTypes.INTEGER },
    },
    {
      tableName: "Attendance",
      freezeTableName: true,
      indexes: [
        { fields: ["company_id"] },
        { fields: ["user_id"] },
        { fields: ["check_in_at"] },
      ],
    }
  );

