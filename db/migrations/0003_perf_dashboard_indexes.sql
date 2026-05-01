CREATE INDEX IF NOT EXISTS "investments_created_at_idx" ON "investments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cashflows_status_due_date_idx" ON "cashflows" USING btree ("status","due_date");--> statement-breakpoint
