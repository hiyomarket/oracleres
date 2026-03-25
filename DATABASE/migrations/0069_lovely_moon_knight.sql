CREATE TABLE `game_equipment_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equip_id` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`slot` varchar(20) NOT NULL DEFAULT 'weapon',
	`tier` varchar(20) NOT NULL DEFAULT '初階',
	`level_required` int NOT NULL DEFAULT 1,
	`base_stats` varchar(300) DEFAULT '',
	`special_effect` text,
	`craft_materials` varchar(300) DEFAULT '',
	`rarity` varchar(20) NOT NULL DEFAULT 'common',
	`image_url` text DEFAULT (''),
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_equipment_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_equipment_catalog_equip_id_unique` UNIQUE(`equip_id`)
);
--> statement-breakpoint
CREATE TABLE `game_item_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`category` varchar(30) NOT NULL DEFAULT 'material_basic',
	`source` varchar(200) DEFAULT '',
	`effect` text,
	`rarity` varchar(20) NOT NULL DEFAULT 'common',
	`image_url` text DEFAULT (''),
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_item_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_item_catalog_item_id_unique` UNIQUE(`item_id`)
);
--> statement-breakpoint
CREATE TABLE `game_monster_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monster_id` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`level_range` varchar(20) NOT NULL DEFAULT '1-5',
	`base_hp` int NOT NULL DEFAULT 50,
	`base_attack` int NOT NULL DEFAULT 10,
	`base_defense` int NOT NULL DEFAULT 5,
	`base_speed` int NOT NULL DEFAULT 10,
	`description` text,
	`drop_items` json DEFAULT ('[]'),
	`rarity` varchar(20) NOT NULL DEFAULT 'common',
	`image_url` text DEFAULT (''),
	`catch_rate` float NOT NULL DEFAULT 0.1,
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_monster_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_monster_catalog_monster_id_unique` UNIQUE(`monster_id`)
);
--> statement-breakpoint
CREATE TABLE `game_skill_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skill_id` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`category` varchar(30) NOT NULL DEFAULT 'active_combat',
	`tier` varchar(20) NOT NULL DEFAULT '初階',
	`mp_cost` int NOT NULL DEFAULT 0,
	`description` text,
	`skill_type` varchar(20) NOT NULL DEFAULT 'attack',
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_skill_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_skill_catalog_skill_id_unique` UNIQUE(`skill_id`)
);
