CREATE TABLE `author_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`decided_by` integer,
	`decided_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "author_requests_status" CHECK("author_requests"."status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "author_requests_reason" CHECK("author_requests"."status" <> 'rejected' OR length(trim(coalesce("author_requests"."reason", ''))) > 0),
	CONSTRAINT "author_requests_decided" CHECK(("author_requests"."status" = 'pending') = ("author_requests"."decided_at" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `author_requests_pending_uq` ON `author_requests` (`user_id`) WHERE "author_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `author_requests_user_idx` ON `author_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `author_requests_status_idx` ON `author_requests` (`status`,`created_at`);