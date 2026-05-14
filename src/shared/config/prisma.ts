import { PrismaClient } from "../../../generated/prisma/client.js";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  globalThis.prisma ||
  // @ts-expect-error Prisma Accelerate configuration
  new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;

// Graceful shutdown
// Shuts down the Prisma Client when the application receives a SIGINT signal (e.g., when you press Ctrl+C in the terminal).
// This means that the application will disconnect from the database and exit cleanly,
// preventing potential issues with open connections or incomplete transactions.
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
