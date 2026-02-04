import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
console.log("working-----", process.env.NODE_ENV);
if (!dbUrl) throw new Error("Missing DATABASE_URL");

export const sequelize = new Sequelize(dbUrl, {
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialect: "postgres",
  define: { freezeTableName: true },
});
