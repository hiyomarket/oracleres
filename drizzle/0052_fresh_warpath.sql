CREATE TABLE `access_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(300),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`expiresAt` timestamp,
	`lastUsedAt` timestamp,
	`useCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_tokens_token_unique` UNIQUE(`token`)
);
