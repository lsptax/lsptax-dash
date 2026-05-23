import "dotenv/config";
import { defineConfig } from "prisma/config";

/** Placeholder for `prisma generate` when `.env` is not set yet (no DB connection needed). */
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://localhost:5432/lsptax?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: DATABASE_URL,
  },
});

