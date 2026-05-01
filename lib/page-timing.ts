/**
 * Opt-in wall-clock logs for document RSC + middleware when PAGE_TIMING=1.
 */
export type PageTiming = {
  log: (phase: string) => void;
};

export function createPageTiming(): PageTiming | null {
  if (process.env.PAGE_TIMING !== "1") return null;
  const t0 = Date.now();
  return {
    log(phase: string) {
      console.log(`[page-timing] ${phase} +${Date.now() - t0}ms (wall)`);
    },
  };
}
