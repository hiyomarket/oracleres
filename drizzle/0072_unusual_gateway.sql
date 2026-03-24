CREATE TABLE `admin_game_control` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`infinite_stamina` tinyint NOT NULL DEFAULT 0,
	`infinite_ap` tinyint NOT NULL DEFAULT 0,
	`infinite_hp` tinyint NOT NULL DEFAULT 0,
	`infinite_mp` tinyint NOT NULL DEFAULT 0,
	`infinite_gold` tinyint NOT NULL DEFAULT 0,
	`is_banned` tinyint NOT NULL DEFAULT 0,
	`ban_reason` text,
	`admin_note` text,
	`last_modified_by` varchar(255),
	`updated_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `admin_game_control_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_game_control_agent_id_unique` UNIQUE(`agent_id`)
);
--> statement-breakpoint
CREATE TABLE `game_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` text NOT NULL,
	`value_type` varchar(20) NOT NULL DEFAULT 'number',
	`label` varchar(100) NOT NULL,
	`description` text,
	`category` varchar(50) NOT NULL DEFAULT 'system',
	`min_value` float,
	`max_value` float,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`updated_by` varchar(255),
	`updated_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_config_config_key_unique` UNIQUE(`config_key`)
);
