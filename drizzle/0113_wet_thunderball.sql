CREATE TABLE `party_battle_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`party_id` int NOT NULL,
	`battle_id` varchar(64) NOT NULL,
	`initiator_agent_id` int NOT NULL,
	`monster_id` varchar(128) NOT NULL,
	`monster_name` varchar(100) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`responses` json,
	`expires_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `party_battle_invites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `game_battle_participants` ADD `row_position` varchar(10) DEFAULT 'front' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_battles` ADD `party_id` int;