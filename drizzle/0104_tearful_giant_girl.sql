ALTER TABLE `game_equipment_catalog` ADD `stackable` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_item_catalog` ADD `stackable` tinyint DEFAULT 1 NOT NULL;