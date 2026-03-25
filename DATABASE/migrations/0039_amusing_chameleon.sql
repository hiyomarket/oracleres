CREATE TABLE `feature_plans` (
	`id` varchar(50) NOT NULL,
	`moduleId` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`points3Days` int,
	`points7Days` int,
	`points15Days` int,
	`points30Days` int,
	`shopUrl` varchar(500),
	`allowPointsRedemption` tinyint NOT NULL DEFAULT 1,
	`allowPurchase` tinyint NOT NULL DEFAULT 1,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`featurePlanId` varchar(50) NOT NULL,
	`moduleId` varchar(50) NOT NULL,
	`durationDays` int NOT NULL,
	`pointsSpent` int NOT NULL DEFAULT 0,
	`source` enum('points','purchase','admin') NOT NULL DEFAULT 'points',
	`previousExpiresAt` timestamp,
	`newExpiresAt` timestamp NOT NULL,
	`note` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`featurePlanId` varchar(50) NOT NULL,
	`moduleId` varchar(50) NOT NULL,
	`durationDays` int NOT NULL,
	`externalOrderId` varchar(200) NOT NULL,
	`userNote` varchar(500),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectReason` varchar(300),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
