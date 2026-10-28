CREATE TABLE `comment_moderations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`decision` text NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "comment_moderations_hidden_comment" CHECK("comment_moderations"."decision" <> 'hidden' OR length(trim(coalesce("comment_moderations"."comment", ''))) > 0)
);
--> statement-breakpoint
CREATE INDEX `comment_moderations_comment_idx` ON `comment_moderations` (`comment_id`);--> statement-breakpoint
CREATE TABLE `comment_reactions` (
	`comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`value` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`comment_id`, `user_id`),
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "comment_reactions_value" CHECK("comment_reactions"."value" IN (1, -1))
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`parent_id` integer,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	`deleted_at` integer,
	`hidden_at` integer,
	`hidden_by` integer,
	`hide_reason` text,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hidden_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "comments_hidden_reason" CHECK("comments"."hidden_at" IS NULL OR length(trim(coalesce("comments"."hide_reason", ''))) > 0)
);
--> statement-breakpoint
CREATE INDEX `comments_post_idx` ON `comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `comments_user_idx` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `comments_parent_idx` ON `comments` (`parent_id`);