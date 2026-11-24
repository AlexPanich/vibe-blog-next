CREATE TABLE `post_embeddings` (
	`post_id` integer PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`text_hash` text NOT NULL,
	`vector` blob NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
