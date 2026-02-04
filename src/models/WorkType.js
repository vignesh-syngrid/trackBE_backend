import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WorkType = sequelize.define(
    "WorkType",
    {
      worktype_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      company_id: { type: DataTypes.UUID },
      worktype_name: { type: DataTypes.STRING, allowNull: false },
      worktype_description: { type: DataTypes.STRING },
      status: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      hooks: {
        beforeValidate: (w) => {
          if (typeof w.worktype_name === "string") w.worktype_name = w.worktype_name.trim();
        },
      },
      tableName: "WorkType",
      freezeTableName: true,
    }
  );
  return WorkType;
};
