import { DataTypes } from "sequelize";
export default (sequelize) =>
  sequelize.define("SubscriptionType", {
    subscription_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    subscription_title: { type: DataTypes.STRING, allowNull: false },
    subscription_status: { type: DataTypes.BOOLEAN, defaultValue: true },
  });
