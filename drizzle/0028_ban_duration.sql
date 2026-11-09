ALTER TABLE `users` ADD `banned_until` integer;--> statement-breakpoint
ALTER TABLE `user_admin_actions` ADD `until` integer CHECK (`until` IS NULL OR `action` = 'banned');
