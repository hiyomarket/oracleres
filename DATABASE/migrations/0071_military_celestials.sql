CREATE TABLE `agent_drop_counters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`no_drop_streak` int NOT NULL DEFAULT 0,
	`no_mid_streak` int NOT NULL DEFAULT 0,
	`no_high_streak` int NOT NULL DEFAULT 0,
	`total_battles` int NOT NULL DEFAULT 0,
	`total_drops` int NOT NULL DEFAULT 0,
	`last_updated` bigint NOT NULL,
	CONSTRAINT `agent_drop_counters_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_drop_counters_agent_id_unique` UNIQUE(`agent_id`)
);
--> statement-breakpoint
CREATE TABLE `agent_set_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`set_id` varchar(30) NOT NULL,
	`pieces_owned` int NOT NULL DEFAULT 0,
	`is_activated` tinyint NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `agent_set_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_templates` (
	`id` varchar(20) NOT NULL,
	`name` varchar(50) NOT NULL,
	`element` enum('wood','fire','earth','metal','water') NOT NULL,
	`tier` enum('basic','mid','high','legendary') NOT NULL DEFAULT 'basic',
	`slot` enum('weapon','helmet','armor','boots','accessory') NOT NULL,
	`level_req` int NOT NULL DEFAULT 1,
	`hp_bonus` int NOT NULL DEFAULT 0,
	`atk_bonus` int NOT NULL DEFAULT 0,
	`def_bonus` int NOT NULL DEFAULT 0,
	`spd_bonus` int NOT NULL DEFAULT 0,
	`matk_bonus` int NOT NULL DEFAULT 0,
	`mp_bonus` int NOT NULL DEFAULT 0,
	`affixes` json,
	`set_id` varchar(30),
	`set_piece` int,
	`shop_price` int,
	`npc_sell_price` int NOT NULL DEFAULT 10,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `equipment_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monster_drop_tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monster_id` varchar(20) NOT NULL,
	`equipment_id` varchar(20) NOT NULL,
	`base_drop_rate` int NOT NULL,
	`weight` int NOT NULL DEFAULT 100,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `monster_drop_tables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_inventory` ADD `is_equipped` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_inventory` ADD `equipped_slot` varchar(20);--> statement-breakpoint
ALTER TABLE `agent_inventory` ADD `obtained_at` bigint NOT NULL;