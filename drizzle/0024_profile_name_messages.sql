/*
  Написано руками вместо сгенерированного: drizzle-kit пересобирал users ради CHECK и DROP
  COLUMN, а DROP TABLE users в транзакции миграции падает на внешних ключах (см. 0021, 0023).
  CHECK на колонке по смыслу равен табличному users_messages_from_check из schema.ts.
  DROP COLUMN без пересборки: у messages_friends_only нет индекса, UNIQUE, FK и CHECK
*/
ALTER TABLE `users` ADD `messages_from` text DEFAULT 'all' NOT NULL CONSTRAINT "users_messages_from_check" CHECK("messages_from" IN ('all', 'following', 'nobody'));--> statement-breakpoint
UPDATE `users` SET `messages_from` = 'following' WHERE `messages_friends_only` = 1;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `messages_friends_only`;--> statement-breakpoint
ALTER TABLE `users` ADD `name_changed_at` integer;
