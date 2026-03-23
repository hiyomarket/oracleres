CREATE TABLE `game_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(50) NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`condition_type` varchar(50) NOT NULL,
	`condition_value` int NOT NULL,
	`reward_type` varchar(50) NOT NULL,
	`reward_amount` int NOT NULL,
	`icon_url` varchar(500) NOT NULL DEFAULT '',
	`is_active` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_gatherables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`rarity` varchar(20) NOT NULL,
	`spawn_rate` float NOT NULL DEFAULT 0.5,
	`image_url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_gatherables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_map_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`lat` float NOT NULL,
	`lng` float NOT NULL,
	`node_type` varchar(50) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`is_active` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_map_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_merchant_pool` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`price_stones` int NOT NULL,
	`appearance_rate` float NOT NULL DEFAULT 0.1,
	`is_active` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_merchant_pool_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_monsters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`base_hp` int NOT NULL,
	`base_attack` int NOT NULL,
	`base_defense` int NOT NULL,
	`base_speed` int NOT NULL,
	`image_url` text NOT NULL,
	`catch_rate` float NOT NULL DEFAULT 0.1,
	`is_active` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_monsters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_random_quests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`required_wuxing` varchar(10),
	`reward_type` varchar(50) NOT NULL,
	`reward_amount` int NOT NULL,
	`is_active` tinyint DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_random_quests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`wuxing` varchar(10) NOT NULL,
	`mp_cost` int NOT NULL,
	`damage_multiplier` float NOT NULL,
	`skill_type` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`achievement_id` int NOT NULL,
	`unlocked_at` timestamp DEFAULT (now()),
	`is_equipped` tinyint DEFAULT 0,
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`)
);
