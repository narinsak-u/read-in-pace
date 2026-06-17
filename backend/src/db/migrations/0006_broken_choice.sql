ALTER TABLE "comments" ADD COLUMN "parent_id" text REFERENCES "comments"("id") ON DELETE CASCADE;--> statement-breakpoint
