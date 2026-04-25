# A.Z Finance Hub v2 - Release Notes

## Recommended Version: v2.1.0

Reason: this milestone ships a substantial set of stability and UX hardening fixes plus performance tuning and release governance improvements, while avoiding breaking changes to core finance logic, schema, and auth.

### Changelog Title
Stability and Performance Hardening

### Changelog Highlights
- Fixed Supabase pooler/database URL connectivity issues.
- Resolved key mobile/RTL UI regressions (sidebar and dialog positioning).
- Removed major crash paths (Add Cash Select, dashboard client crash, snapshot restore date).
- Improved runtime behavior via service worker disablement and reduced React Query refetching.
- Strengthened release safety with guard system enforcement and green CI.

## Major Fixes
- Database URL and Supabase pooler reliability fixed.
- Mobile sidebar behavior fixed.
- Dialog positioning fixed for RTL and mobile layouts.
- Add Cash Select crash fixed.
- Dashboard client-side crash fixed.
- Snapshot restore date crash fixed.
- Investment delete action added.
- Clean portfolio reset snapshot added.

## Stability Improvements
- Multiple crash vectors eliminated across dashboard, snapshots, and cashflow flows.
- Safer snapshot/reset workflows for portfolio recovery and iteration.
- Hardcoded UI strings centralized into dictionary for more predictable UI behavior.

## Performance Improvements
- Service Worker disabled to reduce runtime overhead and stale behavior risks.
- React Query refetching reduced to lower unnecessary network and render churn.

## Guard and CI Improvements
- Code guard system is active for safer incremental delivery.
- CI pipeline status is green after recent fixes, indicating stable integration health.

## Known Remaining Issues
- Continue monitoring edge-case RTL/mobile interactions in less-traveled screens.
- Track any residual data synchronization timing issues under unstable network conditions.
- Watch for additional i18n text coverage gaps during future feature work.

## Recommended Next Batches
- Batch 1: targeted UX polish for low-traffic RTL/mobile screens.
- Batch 2: focused observability pass (error logging and runtime signal quality).
- Batch 3: selective performance micro-optimizations in highest-traffic dashboard paths.
- Batch 4: dictionary/i18n completeness sweep for newly touched UI areas.
