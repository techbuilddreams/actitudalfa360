CREATE TYPE "public"."order_status" AS ENUM('paid', 'fulfillment_pending', 'fulfillment_processing', 'fulfillment_created', 'fulfillment_failed');--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_number" integer GENERATED ALWAYS AS IDENTITY (sequence name "orders_order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 10001 CACHE 1),
	"payment_ref" varchar(255) NOT NULL,
	"status" "order_status" NOT NULL,
	"lines" jsonb NOT NULL,
	"total_cents" integer NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"currency" char(3) NOT NULL,
	"email" text,
	"phone" varchar(40),
	"shipping" jsonb,
	"fulfillment_ref" varchar(64),
	"claimed_at" timestamp with time zone,
	"claim_token" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_cents_ck" CHECK ("orders"."total_cents" >= 0),
	CONSTRAINT "orders_subtotal_cents_ck" CHECK ("orders"."subtotal_cents" >= 0),
	CONSTRAINT "orders_discount_cents_ck" CHECK ("orders"."discount_cents" >= 0),
	CONSTRAINT "orders_shipping_cents_ck" CHECK ("orders"."shipping_cents" >= 0),
	CONSTRAINT "orders_tax_cents_ck" CHECK ("orders"."tax_cents" >= 0),
	CONSTRAINT "orders_currency_ck" CHECK ("orders"."currency" = 'usd'),
	CONSTRAINT "orders_lines_ck" CHECK (CASE WHEN jsonb_typeof("orders"."lines") = 'array' THEN jsonb_array_length("orders"."lines") > 0 ELSE false END),
	CONSTRAINT "orders_amounts_ck" CHECK (("orders"."subtotal_cents" = 0 AND "orders"."discount_cents" = 0 AND "orders"."shipping_cents" = 0 AND "orders"."tax_cents" = 0) OR "orders"."subtotal_cents"::bigint + "orders"."shipping_cents" + "orders"."tax_cents" = "orders"."total_cents"::bigint + "orders"."discount_cents"),
	CONSTRAINT "orders_processing_claim_ck" CHECK ("orders"."status" <> 'fulfillment_processing' OR ("orders"."claimed_at" IS NOT NULL AND "orders"."claim_token" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_uq" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payment_ref_uq" ON "orders" USING btree ("payment_ref");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree ("email");