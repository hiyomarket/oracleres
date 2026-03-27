CREATE TABLE `game_parties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`party_name` varchar(100),
	`leader_id` int NOT NULL,
	`leader_name` varchar(100) NOT NULL,
	`member_ids` json NOT NULL,
	`member_names` json NOT NULL,
	`status` enum('waiting','active','disbanded') NOT NULL DEFAULT 'waiting',
	`max_members` int NOT NULL DEFAULT 4,
	`is_public` tinyint NOT NULL DEFAULT 1,
	`current_battle_id` varchar(36),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_parties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_party_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`party_id` int NOT NULL,
	`invitee_id` int NOT NULL,
	`invitee_name` varchar(100) NOT NULL,
	`inviter_id` int NOT NULL,
	`inviter_name` varchar(100) NOT NULL,
	`status` enum('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_party_invites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `game_agents` ADD `resist_wood` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `resist_fire` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `resist_earth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `resist_metal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `resist_water` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `free_stat_points` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `base_mp` int DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `gold_drop` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `minion_ids` json;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `resist_wood` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `resist_fire` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `resist_earth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `resist_metal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roaming_boss_catalog` ADD `resist_water` int DEFAULT 0 NOT NULL;