ALTER TABLE "books" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "crop" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "shelf" text NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_slug_unique" UNIQUE("slug");