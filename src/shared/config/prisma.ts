import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, Prisma } from "../../../generated/prisma/client.ts";

const databaseUrl = process.env["DATABASE_URL"];
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;

const host =
  parsedDatabaseUrl?.hostname ||
  process.env["MYSQL_HOST"] ||
  process.env["DB_HOST"] ||
  "localhost";

const user =
  (parsedDatabaseUrl?.username
    ? decodeURIComponent(parsedDatabaseUrl.username)
    : undefined) ||
  process.env["MYSQL_USER"] ||
  process.env["DB_USER"] ||
  "root";

const password =
  (parsedDatabaseUrl?.password
    ? decodeURIComponent(parsedDatabaseUrl.password)
    : undefined) ||
  process.env["MYSQL_PASSWORD"] ||
  process.env["DB_PASSWORD"] ||
  "";

const port = parsedDatabaseUrl?.port
  ? Number(parsedDatabaseUrl.port)
  : process.env["MYSQL_PORT"]
    ? Number(process.env["MYSQL_PORT"])
    : undefined;

const database =
  parsedDatabaseUrl?.pathname.replace(/^\//, "") ||
  process.env["MYSQL_DATABASE"] ||
  process.env["DB_NAME"] ||
  "enginex_db";

const allowPublicKeyRetrieval =
  process.env["MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL"] === "true" ||
  (process.env["MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL"] !== "false" &&
    ["127.0.0.1", "localhost", "::1"].includes(host));

const adapter = new PrismaMariaDb({
  host,
  ...(port ? { port } : {}),
  user,
  password,
  database,
  connectionLimit: 5,
  allowPublicKeyRetrieval,
});
const prisma = new PrismaClient({ adapter });

export { prisma, Prisma };
