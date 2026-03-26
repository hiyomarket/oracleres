CREATE TABLE `game_learned_quest_skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`skill_id` int NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`exp` int NOT NULL DEFAULT 0,
	`is_equipped` tinyint NOT NULL DEFAULT 0,
	`slot_index` int NOT NULL DEFAULT 0,
	`learned_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_learned_quest_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_npc_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`title` varchar(200),
	`location` varchar(200),
	`pos_x` int DEFAULT 0,
	`pos_y` int DEFAULT 0,
	`region` varchar(30) DEFAULT '初界',
	`avatar_url` text,
	`description` text,
	`is_hidden` tinyint NOT NULL DEFAULT 0,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_npc_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_quest_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`skill_id` int NOT NULL,
	`current_step` int NOT NULL DEFAULT 0,
	`step_progress` json,
	`status` varchar(20) NOT NULL DEFAULT 'not_started',
	`started_at` bigint,
	`completed_at` bigint,
	`skill_level` int NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_quest_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_quest_skill_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`quest_title` varchar(200),
	`category` varchar(20) NOT NULL,
	`skill_type` varchar(20) NOT NULL DEFAULT 'attack',
	`description` text,
	`wuxing` varchar(10) DEFAULT '無',
	`power_percent` int NOT NULL DEFAULT 100,
	`mp_cost` int NOT NULL DEFAULT 10,
	`cooldown` int NOT NULL DEFAULT 3,
	`max_level` int NOT NULL DEFAULT 10,
	`level_up_bonus` int NOT NULL DEFAULT 10,
	`additional_effect` json,
	`special_mechanic` json,
	`learn_cost` json,
	`prerequisites` json,
	`npc_id` int,
	`rarity` varchar(20) NOT NULL DEFAULT 'rare',
	`icon_url` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_quest_skill_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_quest_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skill_id` int NOT NULL,
	`step_number` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`dialogue` text,
	`objective` text,
	`location` varchar(200),
	`objectives` json,
	`rewards` json,
	`special_note` text,
	`npc_id` int,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_quest_steps_id` PRIMARY KEY(`id`)
);
