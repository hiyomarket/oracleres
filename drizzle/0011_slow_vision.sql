CREATE TABLE `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`feature` varchar(50) NOT NULL,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`expiresAt` timestamp,
	`note` varchar(200),
	`grantedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_feature_idx` UNIQUE(`userId`,`feature`)
);
