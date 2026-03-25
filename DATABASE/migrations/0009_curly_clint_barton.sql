CREATE TABLE `invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`createdBy` int NOT NULL,
	`usedBy` int,
	`label` varchar(100),
	`isUsed` tinyint NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100),
	`birthPlace` varchar(100),
	`birthDate` varchar(12),
	`birthTime` varchar(8),
	`birthHour` varchar(4),
	`yearPillar` varchar(8),
	`monthPillar` varchar(8),
	`dayPillar` varchar(8),
	`hourPillar` varchar(8),
	`dayMasterElement` varchar(20),
	`favorableElements` varchar(100),
	`unfavorableElements` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
