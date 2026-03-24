CREATE TABLE `auction_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seller_agent_id` int NOT NULL,
	`seller_name` varchar(50) NOT NULL,
	`item_id` varchar(50) NOT NULL,
	`item_name` varchar(100) NOT NULL,
	`item_rarity` varchar(20) NOT NULL DEFAULT 'common',
	`item_element` varchar(20) NOT NULL DEFAULT '',
	`quantity` int NOT NULL DEFAULT 1,
	`price` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`buyer_agent_id` int,
	`buyer_name` varchar(50),
	`sold_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `auction_listings_id` PRIMARY KEY(`id`)
);
