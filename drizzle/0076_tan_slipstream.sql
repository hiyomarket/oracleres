CREATE TABLE `agent_skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`skill_id` varchar(20) NOT NULL,
	`awake_tier` int NOT NULL DEFAULT 0,
	`use_count` int NOT NULL DEFAULT 0,
	`installed_slot` varchar(20),
	`acquired_at` timestamp DEFAULT (now()),
	CONSTRAINT `agent_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `awake_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`material_type` varchar(30) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `awake_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `global_first_triggers` (
	`skill_id` varchar(20) NOT NULL,
	`first_agent_id` int NOT NULL,
	`first_agent_name` varchar(50) NOT NULL,
	`triggered_at` timestamp DEFAULT (now()),
	CONSTRAINT `global_first_triggers_skill_id` PRIMARY KEY(`skill_id`)
);
--> statement-breakpoint
CREATE TABLE `hidden_shop_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`node_id` varchar(50) NOT NULL,
	`trigger_reason` varchar(30) NOT NULL DEFAULT 'world_tick',
	`items` json NOT NULL,
	`start_at` bigint NOT NULL,
	`expires_at` bigint NOT NULL,
	`is_closed` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `hidden_shop_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hidden_skill_trackers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`tracker_id` varchar(50) NOT NULL,
	`current_value` int NOT NULL DEFAULT 0,
	`target_value` int NOT NULL,
	`is_unlocked` tinyint NOT NULL DEFAULT 0,
	`unlocked_at` timestamp,
	CONSTRAINT `hidden_skill_trackers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skill_books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`skill_id` varchar(20) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`obtained_at` timestamp DEFAULT (now()),
	CONSTRAINT `skill_books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skill_templates` (
	`id` varchar(20) NOT NULL,
	`name` varchar(50) NOT NULL,
	`element` varchar(10) NOT NULL,
	`category` varchar(20) NOT NULL,
	`rarity` varchar(20) NOT NULL,
	`tier` int NOT NULL DEFAULT 0,
	`mp_cost` int NOT NULL DEFAULT 0,
	`cooldown` int NOT NULL DEFAULT 0,
	`effect_desc` text NOT NULL,
	`effect_value` float NOT NULL DEFAULT 1,
	`status_effect` varchar(50),
	`status_chance` float DEFAULT 0,
	`target_type` varchar(20) NOT NULL DEFAULT 'single',
	`acquire_method` varchar(20) NOT NULL,
	`combo_tags` varchar(100),
	`is_active` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `skill_templates_id` PRIMARY KEY(`id`)
);
