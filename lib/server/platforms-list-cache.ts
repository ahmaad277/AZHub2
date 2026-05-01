import { unstable_cache } from "next/cache";
import { fetchPlatformsList } from "@/lib/server/dashboard-summary-data";

/** Owner platforms master list — invalidated only when platforms CRUD or portfolio restore changes platforms. */
export const getCachedPlatformsList = unstable_cache(
  async () => fetchPlatformsList(),
  ["owner-platforms-list"],
  { tags: ["platforms-list"], revalidate: 3600 },
);
