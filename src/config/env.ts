import mysql from "mysql2";
import dotenv from "dotenv";
import type { Pool } from "mysql2";

dotenv.config();

export const env = {
  DB_HOST: process.env["DB_HOST"] || "localhost",
  DB_USER: process.env["DB_USER"] || "root",
  DB_PASSWORD: process.env["DB_PASSWORD"] || "",
  DB_NAME: process.env["DB_NAME"] || "enginex_db",
  MYSQL_HOST:
    process.env["MYSQL_HOST"] || process.env["DB_HOST"] || "localhost",
  MYSQL_USER: process.env["MYSQL_USER"] || process.env["DB_USER"] || "root",
  MYSQL_PASSWORD:
    process.env["MYSQL_PASSWORD"] || process.env["DB_PASSWORD"] || "",
  MYSQL_DATABASE:
    process.env["MYSQL_DATABASE"] || process.env["DB_NAME"] || "enginex_db",
  DATABASE_URL:
    process.env["DATABASE_URL"] ||
    "mysql://root:09444788590@localhost:3306/enginex_db",
  PORT: process.env["PORT"] ? parseInt(process.env["PORT"], 10) : 5000,
  NODE_ENV: process.env["NODE_ENV"] || "development",
  ACCESS_TOKEN_SECRET:
    process.env["ACCESS_TOKEN_SECRET"] || "enginex_access_secret",
  REFRESH_TOKEN_SECRET:
    process.env["REFRESH_TOKEN_SECRET"] || "enginex_refresh_secret",
};

const pool: Pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
