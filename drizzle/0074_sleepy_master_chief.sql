CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`agent_name` varchar(50) NOT NULL,
	`agent_element` varchar(10) NOT NULL DEFAULT 'wood',
	`agent_level` int NOT NULL DEFAULT 1,
	`content` varchar(100) NOT NULL,
	`msg_type` enum('normal','system','world_event') NOT NULL DEFAULT 'normal',
	`created_at` bigint NOT NULL,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pvp_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challenger_agent_id` int NOT NULL,
	`challenger_name` varchar(50) NOT NULL,
	`defender_agent_id` int NOT NULL,
	`defender_name` varchar(50) NOT NULL,
	`result` enum('challenger_win','defender_win','draw') NOT NULL,
	`battle_log` json,
	`gold_reward` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	CONSTRAINT `pvp_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_champions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`week_key` varchar(10) NOT NULL,
	`champion_type` enum('level','combat') NOT NULL,
	`agent_id` int NOT NULL,
	`agent_name` varchar(50) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`badge_granted` tinyint NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	CONSTRAINT `weekly_champions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `world_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` enum('weather_change','global_blessing','hidden_npc','hidden_quest','elemental_surge','meteor_shower','divine_arrival','ap_regen','manual') NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`affected_node_id` varchar(50),
	`affected_element` varchar(10),
	`expires_at` bigint,
	`meteor_active` tinyint NOT NULL DEFAULT 0,
	`blessing_type` varchar(20),
	`blessing_multiplier` int NOT NULL DEFAULT 150,
	`triggered_by` varchar(255),
	`created_at` bigint NOT NULL,
	CONSTRAINT `world_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `game_agents` ADD `movement_mode` enum('roaming','stationary') DEFAULT 'roaming' NOT NULL;