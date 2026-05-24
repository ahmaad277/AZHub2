import { db } from "./db/index";
import { investments, cashflows } from "./db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const invs = await db.select().from(investments);
  const sukuk1 = invs.find(i => i.name === "Sukuk 1" || i.name === "صكوك 1" || i.name.includes("Sukuk"));
  console.log("Sukuk 1:", sukuk1);
  if (sukuk1) {
    const cfs = await db.select().from(cashflows).where(eq(cashflows.investmentId, sukuk1.id));
    console.log("Cashflows:", cfs);
  }
  process.exit(0);
}
run().catch(console.error);