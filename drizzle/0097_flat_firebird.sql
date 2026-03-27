CREATE TABLE `game_guide` (
	`id` int AUTO_INCREMENT NOT NULL,
	`icon` varchar(20) NOT NULL DEFAULT '📖',
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`category` varchar(50) DEFAULT 'general',
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_guide_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_guide_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` text NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_guide_config_id` PRIMARY KEY(`id`)
);
