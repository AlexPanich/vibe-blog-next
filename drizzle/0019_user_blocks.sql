CREATE TABLE `user_blocks` (
	`user_id` integer NOT NULL,
	`blocked_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `blocked_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_blocks_not_self" CHECK("user_blocks"."user_id" <> "user_blocks"."blocked_id")
);
--> statement-breakpoint
CREATE INDEX `user_blocks_blocked_idx` ON `user_blocks` (`blocked_id`);