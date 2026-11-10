ALTER TABLE `author_requests` ADD `link` text CONSTRAINT "author_requests_link" CHECK(`link` IS NULL OR length(`link`) <= 300);
