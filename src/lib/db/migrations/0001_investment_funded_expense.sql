-- Track expenses funded by withdrawing from investments.
-- This does NOT create a separate transaction; it annotates the EXPENSE row.

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "investment_used_amount" numeric(14, 2);
--> statement-breakpoint
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "investment_used_category_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "investment_used_parent_category_id" uuid;
--> statement-breakpoint
DO $e$ BEGIN
  ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_investment_used_category_id_categories_id_fk"
    FOREIGN KEY ("investment_used_category_id")
    REFERENCES "public"."categories"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $e$;
--> statement-breakpoint
DO $e$ BEGIN
  ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_investment_used_parent_category_id_categories_id_fk"
    FOREIGN KEY ("investment_used_parent_category_id")
    REFERENCES "public"."categories"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $e$;

