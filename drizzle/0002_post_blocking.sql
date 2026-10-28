PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post_moderations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`decision` text NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_moderations_required_comment" CHECK("__new_post_moderations"."decision" NOT IN ('rejected', 'blocked') OR length(trim(coalesce("__new_post_moderations"."comment", ''))) > 0)
);
--> statement-breakpoint
INSERT INTO `__new_post_moderations`("id", "post_id", "user_id", "decision", "comment", "created_at") SELECT "id", "post_id", "user_id", "decision", "comment", "created_at" FROM `post_moderations`;--> statement-breakpoint
DROP TABLE `post_moderations`;--> statement-breakpoint
ALTER TABLE `__new_post_moderations` RENAME TO `post_moderations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `post_moderations_post_created_idx` ON `post_moderations` (`post_id`,`created_at`);