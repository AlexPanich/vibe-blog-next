/*
  Написано руками вместо сгенерированного: drizzle-kit пересобирал posts ради CHECK, а
  DROP TABLE posts в транзакции миграции падает на внешних ключах (см. 0009_post_types.sql).
  CHECK на колонке по смыслу равен табличному posts_lead_check из schema.ts
*/
ALTER TABLE `posts` ADD `lead` text CONSTRAINT "posts_lead_check" CHECK("lead" IS NULL OR length("lead") BETWEEN 20 AND 200);
