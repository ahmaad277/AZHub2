import { desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { portfolioSnapshots } from "@/db/schema";

/** Snapshot index rows for /snapshots UI — invalidated on create/delete snapshot (not on restore). */
export const getCachedSnapshotsList = unstable_cache(
  async () =>
    db
      .select({
        id: portfolioSnapshots.id,
        name: portfolioSnapshots.name,
        entityCounts: portfolioSnapshots.entityCounts,
        byteSize: portfolioSnapshots.byteSize,
        createdAt: portfolioSnapshots.createdAt,
      })
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.createdAt)),
  ["portfolio-snapshots-table-list"],
  { tags: ["snapshots-list"], revalidate: 3600 },
);
