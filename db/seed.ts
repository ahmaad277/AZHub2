/**
 * Seeds the three default platforms (Sukuk, Manafa, Lendo) and ensures a
 * user_settings row exists for the owner email.
 *
 * Run with: `npm run db:seed`
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  const defaults: Array<typeof schema.platforms.$inferInsert> = [
    { name: "Sukuk", type: "sukuk", feePercentage: "0", deductFees: false, color: "emerald" },
    { name: "Manafa", type: "manfaa", feePercentage: "1.5", deductFees: true, color: "violet" },
    { name: "Lendo", type: "lendo", feePercentage: "2.5", deductFees: true, color: "amber" },
  ];

  for (const p of defaults) {
    const exists = await db
      .select({ id: schema.platforms.id })
      .from(schema.platforms)
      .where(eq(schema.platforms.name, p.name))
      .limit(1);
    if (exists.length === 0) {
      await db.insert(schema.platforms).values(p);
      console.log(`[seed] inserted platform: ${p.name}`);
    } else {
      console.log(`[seed] platform already exists: ${p.name}`);
    }
  }

  const ownerEmail = process.env.OWNER_EMAIL ?? "owner@example.com";
  const existingSettings = await db
    .select({ id: schema.userSettings.id })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.ownerEmail, ownerEmail))
    .limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schema.userSettings).values({ ownerEmail });
    console.log(`[seed] created user_settings for: ${ownerEmail}`);
  } else {
    console.log(`[seed] user_settings already exists for: ${ownerEmail}`);
  }

  await client.end();
  console.log("[seed] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
