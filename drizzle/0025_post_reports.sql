CREATE TABLE `post_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`reason` text NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by` integer,
	`resolution` text,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_reports_resolution" CHECK(("post_reports"."resolved_at" IS NULL) = ("post_reports"."resolution" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_reports_post_user_uq` ON `post_reports` (`post_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `post_reports_open_idx` ON `post_reports` (`resolved_at`,`created_at`);