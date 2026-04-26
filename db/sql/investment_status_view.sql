-- =============================================================================
-- investment_status_view
-- -----------------------------------------------------------------------------
-- Computed (non-materialized) view that derives each investment's operational
-- status without requiring a manual column. This is the SINGLE SOURCE OF TRUTH
-- for investment status.
--
-- Rules:
--   completed  : all cashflows are received (or investment has no cashflows and
--                end_date is in the past — defensive fallback)
--   defaulted  : pending principal cashflow is overdue by more than 90 days
--   late       : pending principal cashflow is overdue by 1..90 days
--   active     : otherwise (upcoming pending cashflows or end_date in future)
--
-- The `overdue_days` column reports the longest overdue stretch of pending
-- principal cashflows for that investment (0 if nothing is overdue).
-- =============================================================================

CREATE OR REPLACE VIEW investment_status_view AS
WITH cf_stats AS (
  SELECT
    c.investment_id,
    COUNT(*) FILTER (WHERE c.status = 'pending')                   AS pending_count,
    COUNT(*) FILTER (WHERE c.status = 'received')                  AS received_count,
    COUNT(*)                                                       AS total_count,
    MAX(EXTRACT(EPOCH FROM (NOW() - c.due_date)) / 86400)
      FILTER (
        WHERE c.status = 'pending'
          AND c.type = 'principal'
          AND c.due_date < NOW()
      )                                                            AS max_overdue_days
  FROM cashflows c
  GROUP BY c.investment_id
)
SELECT
  i.id                                                             AS investment_id,
  CASE
    WHEN COALESCE(cf.total_count, 0) = 0 AND i.end_date < NOW()    THEN 'completed'
    WHEN COALESCE(cf.pending_count, 0) = 0
         AND COALESCE(cf.received_count, 0) > 0                    THEN 'completed'
    WHEN COALESCE(cf.max_overdue_days, 0) > 90                     THEN 'defaulted'
    WHEN COALESCE(cf.max_overdue_days, 0) > 0                      THEN 'late'
    ELSE 'active'
  END                                                              AS derived_status,
  COALESCE(cf.pending_count, 0)::int                                AS pending_count,
  COALESCE(cf.received_count, 0)::int                               AS received_count,
  COALESCE(cf.total_count, 0)::int                                  AS total_count,
  COALESCE(cf.max_overdue_days, 0)::int                             AS overdue_days
FROM investments i
LEFT JOIN cf_stats cf ON cf.investment_id = i.id;

-- End of investment_status_view.sql
