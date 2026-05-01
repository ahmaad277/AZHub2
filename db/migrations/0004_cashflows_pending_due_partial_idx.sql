CREATE INDEX IF NOT EXISTS "cashflows_pending_due_date_partial_idx" ON "cashflows" USING btree ("due_date") WHERE "status" = 'pending';--> statement-breakpoint
