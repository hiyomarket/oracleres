ALTER TABLE `game_agents` ADD `potential_wood` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `potential_fire` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `potential_earth` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `potential_metal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `potential_water` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_map_nodes` ADD `node_key` varchar(100);--> statement-breakpoint
ALTER TABLE `game_agents` DROP COLUMN `potential_hp`;--> statement-breakpoint
ALTER TABLE `game_agents` DROP COLUMN `potential_mp`;--> statement-breakpoint
ALTER TABLE `game_agents` DROP COLUMN `potential_atk`;--> statement-breakpoint
ALTER TABLE `game_agents` DROP COLUMN `potential_def`;--> statement-breakpoint
ALTER TABLE `game_agents` DROP COLUMN `potential_spd`;--> statement-breakpoint
ALTER TABLE `game_agents` DROP COLUMN `potential_matk`;