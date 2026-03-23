CREATE TABLE `game_hidden_shop_pool` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_key` varchar(100) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`description` text,
	`currency_type` enum('coins','stones') NOT NULL DEFAULT 'coins',
	`price` int NOT NULL DEFAULT 0,
	`quantity` int NOT NULL DEFAULT 1,
	`weight` int NOT NULL DEFAULT 10,
	`rarity` enum('common','rare','epic','legendary') NOT NULL DEFAULT 'rare',
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_hidden_shop_pool_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_key` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`item_type` enum('consumable','equipment','weapon','material','special') NOT NULL DEFAULT 'consumable',
	`sub_type` varchar(50) DEFAULT '',
	`wuxing` varchar(10) DEFAULT '',
	`rarity` enum('common','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`emoji` varchar(10) NOT NULL DEFAULT '📦',
	`stat_bonus` json,
	`use_effect` json,
	`equip_slot` varchar(30) DEFAULT '',
	`max_stack` int NOT NULL DEFAULT 99,
	`is_tradable` tinyint NOT NULL DEFAULT 1,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_inventory_items_item_key_unique` UNIQUE(`item_key`)
);
--> statement-breakpoint
CREATE TABLE `game_spirit_shop` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_key` varchar(100) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`description` text,
	`price_stones` int NOT NULL DEFAULT 0,
	`quantity` int NOT NULL DEFAULT 1,
	`rarity` enum('common','rare','epic','legendary') NOT NULL DEFAULT 'rare',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_on_sale` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_spirit_shop_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_virtual_shop` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_key` varchar(100) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`description` text,
	`price_coins` int NOT NULL DEFAULT 0,
	`quantity` int NOT NULL DEFAULT 1,
	`stock` int NOT NULL DEFAULT -1,
	`node_id` varchar(50) DEFAULT '',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_on_sale` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_virtual_shop_id` PRIMARY KEY(`id`)
);
