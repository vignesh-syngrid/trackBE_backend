import { DataTypes } from "sequelize";

export default (sequelize) =>
  sequelize.define(
    "JobAttachment",
    {
      attachment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      job_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      file_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content_type: {
        type: DataTypes.STRING,
      },
      file_size: {
        type: DataTypes.INTEGER,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      s3_key: {
        type: DataTypes.STRING,
      },
      uploaded_by: {
        type: DataTypes.UUID,
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      indexes: [{ fields: ["job_id"] }],
    }
  );
