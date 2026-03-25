CREATE TABLE `expert_calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expertId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`eventDate` timestamp NOT NULL,
	`endDate` timestamp,
	`eventType` enum('offline','online','announcement') NOT NULL DEFAULT 'offline',
	`location` varchar(300),
	`maxAttendees` int,
	`price` int DEFAULT 0,
	`isPublic` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expert_calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`description` varchar(300),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `endTime` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `paymentNote` text;--> statement-breakpoint
ALTER TABLE `experts` ADD `slug` varchar(100);--> statement-breakpoint
ALTER TABLE `experts` ADD `bioHtml` text;--> statement-breakpoint
ALTER TABLE `experts` ADD `sectionTitle` varchar(100);--> statement-breakpoint
ALTER TABLE `experts` ADD CONSTRAINT `experts_slug_unique` UNIQUE(`slug`);