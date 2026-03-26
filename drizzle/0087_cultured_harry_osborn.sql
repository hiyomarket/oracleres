CREATE TABLE `game_balance_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`catalog_type` varchar(30) NOT NULL,
	`rarity` varchar(30) NOT NULL,
	`field` varchar(30) NOT NULL,
	`min_value` float NOT NULL,
	`max_value` float NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `game_balance_rules_id` PRIMARY KEY(`id`)
);
