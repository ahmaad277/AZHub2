/**
 * Opt-in route timing for isolating auth vs DB latency. Enable with DB_ROUTE_TIMING=1.
 */
export function createDbRouteTimer(routeLabel: string) {
  const enabled = process.env.DB_ROUTE_TIMING === "1";
  const t0 = Date.now();
  return {
    mark(phase: string) {
      if (!enabled) return;
      console.log(
        `[db-route-timing] ${routeLabel} ${phase} +${Date.now() - t0}ms`,
      );
    },
  };
}
