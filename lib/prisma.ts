import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not configured."
  );
}

const adapter = new PrismaPg({
  connectionString,

  // Keep the pool small for local development
  max: 5,

  // 5 seconds to establish a connection
  connectionTimeoutMillis: 5000,

  // Keep idle connections alive longer
  idleTimeoutMillis: 300000,
});

const globalForPrisma =
  globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalForPrisma.prisma = prisma;
}