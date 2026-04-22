-- Migration: Backfill faceValue and durationMonths before dropping amount
-- This migration safely consolidates the amount and faceValue fields

BEGIN;

-- Step 1: Backfill face_value from amount where face_value is null
UPDATE investments 
SET face_value = COALESCE(face_value, amount)
WHERE face_value IS NULL OR face_value = '0';

-- Step 2: Add durationMonths column (temporarily nullable for backfill)
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS duration_months INTEGER;

-- Step 3: Calculate and backfill duration_months from dates
-- Ensures minimum 1 month for any positive duration (handles short-term investments)
UPDATE investments
SET duration_months = GREATEST(
  1,
  EXTRACT(YEAR FROM AGE(end_date, start_date)) * 12 +
  EXTRACT(MONTH FROM AGE(end_date, start_date)) +
  CASE WHEN EXTRACT(DAY FROM end_date) > EXTRACT(DAY FROM start_date) THEN 1 ELSE 0 END
)
WHERE duration_months IS NULL;

-- Step 4: Make duration_months NOT NULL now that all rows have values
ALTER TABLE investments
ALTER COLUMN duration_months SET NOT NULL;

-- Step 5: Drop the amount column (now redundant)
ALTER TABLE investments
DROP COLUMN IF EXISTS amount;

COMMIT;
