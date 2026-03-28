ALTER TABLE `game_monster_catalog` ADD `is_capturable` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `base_capture_rate` int DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `base_bp` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_pet_catalog` ADD `source_monster_key` varchar(30) DEFAULT '';