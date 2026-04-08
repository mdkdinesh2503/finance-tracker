CREATE TYPE "public"."borrow_link_type" AS ENUM('BORROW', 'REPAYMENT');--> statement-breakpoint
CREATE TABLE "borrow_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrow_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrow_account_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"type" "borrow_link_type" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "borrow_accounts" ADD CONSTRAINT "borrow_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_links" ADD CONSTRAINT "borrow_links_borrow_account_id_borrow_accounts_id_fk" FOREIGN KEY ("borrow_account_id") REFERENCES "public"."borrow_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrow_links" ADD CONSTRAINT "borrow_links_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "borrow_links_transaction_id_uq" ON "borrow_links" USING btree ("transaction_id");