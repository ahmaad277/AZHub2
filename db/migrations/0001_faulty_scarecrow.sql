CREATE TYPE "public"."auth_login_event_type" AS ENUM('created', 'email_sent', 'approved', 'completed', 'expired', 'rejected', 'callback_failed');--> statement-breakpoint
CREATE TYPE "public"."pending_login_status" AS ENUM('pending', 'approved', 'consumed', 'rejected', 'expired');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_login_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"request_id" text NOT NULL,
	"event_type" "auth_login_event_type" NOT NULL,
	"actor_user_id" text,
	"device_id" text,
	"ip_hash" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_login_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"owner_email" text NOT NULL,
	"status" "pending_login_status" DEFAULT 'pending' NOT NULL,
	"origin_device_id" text NOT NULL,
	"origin_label" text,
	"origin_user_agent" text,
	"origin_ip_hash" text,
	"request_token_hash" text NOT NULL,
	"completion_token_hash" text,
	"approved_by_user_id" text,
	"approved_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_login_events" ADD CONSTRAINT "auth_login_events_request_id_pending_login_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."pending_login_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_login_events_request_idx" ON "auth_login_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_login_events_type_idx" ON "auth_login_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_login_owner_status_idx" ON "pending_login_requests" USING btree ("owner_email","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_login_origin_device_idx" ON "pending_login_requests" USING btree ("origin_device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_login_expires_at_idx" ON "pending_login_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_login_request_token_uq" ON "pending_login_requests" USING btree ("request_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_login_completion_token_uq" ON "pending_login_requests" USING btree ("completion_token_hash");
--> statement-breakpoint
COMMENT ON TABLE "pending_login_requests" IS 'Short-lived authentication requests that let one device start login and another device approve it before the waiting browser completes Supabase sign-in.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."owner_email" IS 'Normalized owner email for this login request. Must match OWNER_EMAIL.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."status" IS 'Current request lifecycle state: pending, approved, consumed, rejected, or expired.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."origin_device_id" IS 'Stable browser-generated device identifier for the device that initiated login.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."origin_label" IS 'Human-readable device hint shown in logs and diagnostics.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."origin_user_agent" IS 'User agent captured when the initiating device created the login request.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."origin_ip_hash" IS 'SHA-256 hash of the originating IP address for audit and replay analysis without storing the raw IP.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."request_token_hash" IS 'SHA-256 hash of the opaque request token used by public status and callback routes.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."completion_token_hash" IS 'SHA-256 hash of the one-time completion token used to finish laptop sign-in after approval.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."approved_by_user_id" IS 'Supabase auth user id that approved the request after opening the email link.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."approved_at" IS 'Timestamp when the request was approved on a signed-in device.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."consumed_at" IS 'Timestamp when the waiting device finished sign-in using the completion bridge.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."expires_at" IS 'Absolute expiry time after which the request can no longer be approved or completed.';--> statement-breakpoint
COMMENT ON COLUMN "pending_login_requests"."last_error" IS 'Latest human-readable auth error associated with this request.';--> statement-breakpoint
COMMENT ON TABLE "auth_login_events" IS 'Append-only audit log for cross-device authentication request lifecycle events.';--> statement-breakpoint
COMMENT ON COLUMN "auth_login_events"."request_id" IS 'Foreign key to the pending login request that this audit event belongs to.';--> statement-breakpoint
COMMENT ON COLUMN "auth_login_events"."event_type" IS 'Lifecycle event name such as created, approved, completed, expired, or callback_failed.';--> statement-breakpoint
COMMENT ON COLUMN "auth_login_events"."actor_user_id" IS 'Supabase auth user id responsible for the event when an authenticated actor exists.';--> statement-breakpoint
COMMENT ON COLUMN "auth_login_events"."device_id" IS 'Browser-generated initiating device id associated with the event.';--> statement-breakpoint
COMMENT ON COLUMN "auth_login_events"."ip_hash" IS 'SHA-256 hash of the request IP tied to the event for audit and abuse analysis.';--> statement-breakpoint
COMMENT ON COLUMN "auth_login_events"."user_agent" IS 'User agent string captured when the event was recorded.';--> statement-breakpoint
COMMENT ON COLUMN "auth_login_events"."metadata" IS 'Structured event metadata for debugging and security review.';