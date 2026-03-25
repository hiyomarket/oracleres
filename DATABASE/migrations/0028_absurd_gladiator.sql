CREATE TABLE `aura_rule_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotLabel` varchar(100) NOT NULL,
	`snapshotData` text NOT NULL,
	`createdBy` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aura_rule_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `custom_bracelets` ADD `pairingItems` text DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurant_categories` ADD `scheduleEnabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurant_categories` ADD `scheduleStartHour` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurant_categories` ADD `scheduleEndHour` int DEFAULT 23 NOT NULL;