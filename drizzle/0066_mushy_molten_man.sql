CREATE TABLE `agent_titles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`title_key` varchar(100) NOT NULL,
	`is_equipped` tinyint NOT NULL DEFAULT 0,
	`acquired_at` bigint NOT NULL,
	CONSTRAINT `agent_titles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_hidden_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`node_id` varchar(50) NOT NULL,
	`event_type` enum('hidden_shop','hidden_npc','hidden_quest') NOT NULL,
	`event_data` json NOT NULL,
	`perception_threshold` int NOT NULL DEFAULT 30,
	`remaining_ticks` int NOT NULL DEFAULT 5,
	`is_discovered` tinyint NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`expires_at` bigint NOT NULL,
	CONSTRAINT `game_hidden_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_titles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title_key` varchar(100) NOT NULL,
	`title_name` varchar(50) NOT NULL,
	`title_desc` text,
	`title_type` enum('natal','achievement','event','special') NOT NULL DEFAULT 'natal',
	`color` varchar(20) DEFAULT '#f59e0b',
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_titles_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_titles_title_key_unique` UNIQUE(`title_key`)
);
