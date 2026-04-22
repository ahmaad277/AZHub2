import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  // When true, Drizzle Kit may prompt for confirmations during `push` (bad for CI / Windows shells).
  strict: false,
});
