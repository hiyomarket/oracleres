CREATE TABLE `game_shop_purchase_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`shop_type` varchar(20) NOT NULL,
	`shop_item_id` int NOT NULL,
	`item_key` varchar(100) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`purchased_at` bigint NOT NULL,
	CONSTRAINT `game_shop_purchase_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `game_spirit_shop` ADD `purchase_limit` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_virtual_shop` ADD `purchase_limit` int DEFAULT 0 NOT NULL;