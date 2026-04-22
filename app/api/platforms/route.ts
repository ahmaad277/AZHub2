import { NextRequest } from "next/server";
import { db } from "@/db";
import { platforms, insertPlatformSchema } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { asc } from "drizzle-orm";

export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    return db.select().from(platforms).orderBy(asc(platforms.name));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const parsed = insertPlatformSchema.parse(body);
    const [row] = await db.insert(platforms).values(parsed).returning();
    return row;
  });
}
