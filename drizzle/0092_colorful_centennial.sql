ALTER TABLE `game_equipment_catalog` ADD `shop_price` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `in_normal_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `in_spirit_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` ADD `in_secret_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `in_normal_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `in_spirit_shop` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `game_skill_catalog` ADD `in_secret_shop` tinyint DEFAULT 0;