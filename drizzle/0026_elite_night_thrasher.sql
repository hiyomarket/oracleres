CREATE TABLE `aura_engine_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(50) NOT NULL,
	`configKey` varchar(80) NOT NULL,
	`configValue` text NOT NULL,
	`label` varchar(100) NOT NULL,
	`description` varchar(300),
	`valueType` varchar(20) NOT NULL DEFAULT 'number',
	`minValue` decimal(10,2),
	`maxValue` decimal(10,2),
	`step` decimal(10,2),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aura_engine_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_bracelets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`element` varchar(10) NOT NULL,
	`color` varchar(100) NOT NULL,
	`functionDesc` varchar(200) NOT NULL,
	`tacticalRoles` text NOT NULL DEFAULT ('{}'),
	`enabled` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 99,
	`isBuiltin` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_bracelets_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_bracelets_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` varchar(50) NOT NULL,
	`label` varchar(50) NOT NULL,
	`emoji` varchar(10) NOT NULL DEFAULT '🍽️',
	`types` text NOT NULL DEFAULT ('["restaurant"]'),
	`textSuffix` varchar(50),
	`sortOrder` int NOT NULL DEFAULT 99,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`isDefault` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurant_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurant_categories_categoryId_unique` UNIQUE(`categoryId`)
);
