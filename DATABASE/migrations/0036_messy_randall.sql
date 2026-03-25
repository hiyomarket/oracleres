CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(100) NOT NULL,
	`type` enum('wbc_result','system','reward','announcement') NOT NULL DEFAULT 'system',
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`linkUrl` varchar(500),
	`isRead` tinyint NOT NULL DEFAULT 0,
	`relatedId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
