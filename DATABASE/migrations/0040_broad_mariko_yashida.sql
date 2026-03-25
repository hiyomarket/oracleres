CREATE TABLE `site_banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(100) NOT NULL,
	`content` varchar(300) NOT NULL,
	`linkUrl` varchar(500),
	`linkText` varchar(50),
	`icon` varchar(50) DEFAULT '🔔',
	`type` enum('info','warning','success','promo') NOT NULL DEFAULT 'info',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_banners_id` PRIMARY KEY(`id`)
);
