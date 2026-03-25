CREATE TABLE `game_monster_skill_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monster_skill_id` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`skill_type` varchar(20) NOT NULL DEFAULT 'attack',
	`rarity` varchar(20) NOT NULL DEFAULT 'common',
	`power_percent` int NOT NULL DEFAULT 100,
	`mp_cost` int NOT NULL DEFAULT 0,
	`cooldown` int NOT NULL DEFAULT 0,
	`accuracy_mod` int NOT NULL DEFAULT 100,
	`additional_effect` json DEFAULT ('null'),
	`ai_condition` json DEFAULT ('null'),
	`description` text,
	`is_active` tinyint DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_monster_skill_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_monster_skill_catalog_monster_skill_id_unique` UNIQUE(`monster_skill_id`)
);
--> statement-breakpoint
ALTER TABLE `game_achievements` ADD `ach_id` varchar(20) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_achievements` ADD `ach_rarity` varchar(20) DEFAULT 'common' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_achievements` ADD `condition_params` json DEFAULT ('{}');--> statement-breakpoint
ALTER TABLE `game_achievements` ADD `reward_content` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `game_achievements` ADD `title_reward` varchar(50) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_achievements` ADD `glow_effect` varchar(50) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `quality` varchar(20) DEFAULT 'white' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `hp_bonus` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `attack_bonus` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `defense_bonus` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `speed_bonus` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `resist_bonus` json DEFAULT ('{"wood":0,"fire":0,"earth":0,"metal":0,"water":0}');--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `affix_1` json DEFAULT ('null');--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `affix_2` json DEFAULT ('null');--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `affix_3` json DEFAULT ('null');--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `affix_4` json DEFAULT ('null');--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `affix_5` json DEFAULT ('null');--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `craft_materials_list` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `set_id` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `stack_limit` int DEFAULT 99 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `shop_price` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `in_normal_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `in_spirit_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `in_secret_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `is_monster_drop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `drop_monster_id` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `drop_rate` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `gather_locations` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `use_effect` json DEFAULT ('null');--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `base_accuracy` int DEFAULT 80 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `base_magic_attack` int DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `resist_wood` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `resist_fire` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `resist_earth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `resist_metal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `resist_water` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `counter_bonus` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `skill_id_1` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `skill_id_2` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `skill_id_3` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `ai_level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `growth_rate` float DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_item_1` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_rate_1` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_item_2` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_rate_2` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_item_3` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_rate_3` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_item_4` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_rate_4` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_item_5` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_rate_5` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `drop_gold` json DEFAULT ('{"min":5,"max":15}');--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `legendary_drop` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `legendary_drop_rate` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `destiny_clue` text;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `spawn_nodes` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `rarity` varchar(20) DEFAULT 'common' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `cooldown` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `power_percent` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `learn_level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `acquire_type` varchar(20) DEFAULT 'shop' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `shop_price` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `drop_monster_id` varchar(20) DEFAULT null;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `hidden_trigger` text;