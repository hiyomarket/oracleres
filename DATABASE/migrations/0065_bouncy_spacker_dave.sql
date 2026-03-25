ALTER TABLE `game_agents` ADD `gather_power` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `forge_power` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `carry_weight` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `refine_power` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `treasure_hunting` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `heal_power` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `magic_attack` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `hit_rate` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `equipped_necklace` varchar(100);--> statement-breakpoint
ALTER TABLE `game_agents` ADD `equipped_amulet` varchar(100);