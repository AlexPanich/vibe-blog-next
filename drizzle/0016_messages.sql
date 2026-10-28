CREATE TABLE `dialogs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_low_id` integer NOT NULL,
	`user_high_id` integer NOT NULL,
	`last_message_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_low_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_high_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "dialogs_pair_order" CHECK("dialogs"."user_low_id" < "dialogs"."user_high_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dialogs_pair_uq` ON `dialogs` (`user_low_id`,`user_high_id`);--> statement-breakpoint
CREATE INDEX `dialogs_high_idx` ON `dialogs` (`user_high_id`);--> statement-breakpoint
CREATE TABLE `message_ignores` (
	`user_id` integer NOT NULL,
	`ignored_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `ignored_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ignored_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "message_ignores_not_self" CHECK("message_ignores"."user_id" <> "message_ignores"."ignored_id")
);
--> statement-breakpoint
CREATE TABLE `message_restrictions` (
	`user_id` integer NOT NULL,
	`restricted_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `restricted_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`restricted_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "message_restrictions_not_self" CHECK("message_restrictions"."user_id" <> "message_restrictions"."restricted_id")
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dialog_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`dialog_id`) REFERENCES `dialogs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_dialog_idx` ON `messages` (`dialog_id`,`id`);--> statement-breakpoint
ALTER TABLE `notifications` ADD `dialog_id` integer;--> statement-breakpoint
CREATE INDEX `notifications_dialog_idx` ON `notifications` (`dialog_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `messages_friends_only` integer DEFAULT false NOT NULL;