ALTER TABLE `game_quest_skill_catalog` ADD `target_type` varchar(20) DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_quest_skill_catalog` ADD `scale_stat` varchar(10) DEFAULT 'atk' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_quest_skill_catalog` ADD `pet_learnable` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_quest_skill_catalog` ADD `player_learnable` tinyint DEFAULT 1 NOT NULL;