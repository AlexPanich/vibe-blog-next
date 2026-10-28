ALTER TABLE `posts` ADD `reviewer_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `posts` ADD `review_started_at` integer;