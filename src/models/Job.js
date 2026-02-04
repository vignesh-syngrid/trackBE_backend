import { DataTypes } from "sequelize";

/** @param {import('sequelize').Sequelize} sequelize */
export default (sequelize) => {
  const Job = sequelize.define(
    "Job",
    {
      // UUID primary key
      job_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },

      company_id: { type: DataTypes.UUID },
      client_id: { type: DataTypes.UUID, allowNull: false },
      reference_number: { type: DataTypes.STRING, allowNull: true },

      worktype_id: { type: DataTypes.UUID },
      jobtype_id: { type: DataTypes.UUID },
      job_description: { type: DataTypes.TEXT },
      job_photo: { type: DataTypes.STRING },

      estimated_duration: { type: DataTypes.INTEGER },
      estimated_days: { type: DataTypes.INTEGER, defaultValue: 0 },
      estimated_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
      estimated_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },

      scheduledDateAndTime: { type: DataTypes.DATE },
      supervisor_id: { type: DataTypes.UUID },
      now_id: { type: DataTypes.UUID },
      technician_id: { type: DataTypes.UUID },
      job_status_id: { type: DataTypes.UUID },
      job_assigned: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      hooks: {},
    }
  );

  return Job;
};
