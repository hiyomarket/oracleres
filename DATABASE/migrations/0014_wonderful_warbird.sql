CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`ruleType` enum('discount','giveaway') NOT NULL,
	`ruleTarget` json NOT NULL,
	`ruleValue` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(10),
	`category` enum('core','addon') NOT NULL DEFAULT 'addon',
	`sortOrder` int NOT NULL DEFAULT 0,
	`containedFeatures` json NOT NULL DEFAULT ('[]'),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` varchar(50) NOT NULL,
	`moduleId` varchar(50) NOT NULL,
	CONSTRAINT `plan_modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_module_idx` UNIQUE(`planId`,`moduleId`)
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` varchar(50),
	`planExpiresAt` timestamp,
	`customModules` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `price` decimal(10,2) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `plans` ADD `isActive` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;