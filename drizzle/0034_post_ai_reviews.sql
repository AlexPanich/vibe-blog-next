CREATE TABLE `post_ai_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`verdict` text,
	`summary` text,
	`issues` text,
	`reject_comment` text,
	`model` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`error` text,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_ai_reviews_done_check" CHECK(("post_ai_reviews"."status" = 'done') = ("post_ai_reviews"."verdict" IS NOT NULL AND "post_ai_reviews"."summary" IS NOT NULL AND "post_ai_reviews"."issues" IS NOT NULL)),
	CONSTRAINT "post_ai_reviews_failed_check" CHECK(("post_ai_reviews"."status" = 'failed') = ("post_ai_reviews"."error" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `post_ai_reviews_post_idx` ON `post_ai_reviews` (`post_id`,`id`);