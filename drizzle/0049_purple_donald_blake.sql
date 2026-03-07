CREATE TABLE `team_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`direction` enum('user_to_team','team_to_user') NOT NULL DEFAULT 'user_to_team',
	`isRead` tinyint NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `private_messages` ADD `isRead` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `private_messages` ADD `readAt` timestamp;