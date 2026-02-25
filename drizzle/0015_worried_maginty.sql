CREATE TABLE `redemption_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`isUsed` tinyint NOT NULL DEFAULT 0,
	`usedBy` int,
	`usedAt` timestamp,
	`isVoided` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `redemption_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `redemption_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `subscription_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operatorId` int NOT NULL,
	`targetUserId` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `availableDiscounts` json;