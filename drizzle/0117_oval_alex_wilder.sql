CREATE TABLE `expert_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`expertId` int NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `expert_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expert_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expertId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'info',
	`isRead` tinyint NOT NULL DEFAULT 0,
	`relatedId` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `expert_notifications_id` PRIMARY KEY(`id`)
);
