CREATE TABLE `achievements` (
	`id` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`desc` text NOT NULL,
	`icon` varchar(10) NOT NULL DEFAULT '🏅',
	`type` enum('level','pvp','combat','gather','explore','legendary','weekly','chat','special') NOT NULL DEFAULT 'special',
	`condition` json NOT NULL,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`achievement_id` varchar(50) NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`unlocked` tinyint NOT NULL DEFAULT 0,
	`unlocked_at` bigint,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `agent_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_pvp_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`agent_name` varchar(50) NOT NULL,
	`agent_element` varchar(10) NOT NULL DEFAULT 'wood',
	`agent_level` int NOT NULL DEFAULT 1,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`draws` int NOT NULL DEFAULT 0,
	`current_streak` int NOT NULL DEFAULT 0,
	`max_streak` int NOT NULL DEFAULT 0,
	`last_challenge_at` bigint,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `agent_pvp_stats_id` PRIMARY KEY(`id`)
);
