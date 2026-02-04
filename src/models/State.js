import { DataTypes } from "sequelize";

export default (sequelize) => {
  const State = sequelize.define(
    "State",
    {
      state_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      country_id: { type: DataTypes.INTEGER, allowNull: false },
      state_name: { type: DataTypes.STRING, allowNull: false },
      state_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "State",
      freezeTableName: true,
      indexes: [
        { unique: true, fields: ["country_id", "state_name"], name: "State_country_name_uq" },
      ],
      hooks: {
        beforeValidate(s) {
          if (typeof s.state_name === "string") s.state_name = s.state_name.trim();
        },
      },
    }
  );
  return State;
};
