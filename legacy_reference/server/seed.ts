import { db } from "./db";
import { platforms } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Check if platforms already exist
  const existingPlatforms = await db.select().from(platforms);
  
  if (existingPlatforms.length === 0) {
    // Seed platforms
    await db.insert(platforms).values([
      {
        name: "Sukuk",
        type: "sukuk",
        logoUrl: null,
      },
      {
        name: "Manfa'a",
        type: "manfaa",
        logoUrl: null,
      },
      {
        name: "Lendo",
        type: "lendo",
        logoUrl: null,
      },
    ]);
    console.log("✅ Platforms seeded successfully");
  } else {
    console.log("ℹ️  Platforms already exist, skipping seed");
  }

  console.log("Database seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
