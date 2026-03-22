CREATE TABLE `game_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`gender` varchar(10) NOT NULL DEFAULT 'female',
	`layer` varchar(20) NOT NULL,
	`view` varchar(10) NOT NULL DEFAULT 'front',
	`wuxing` varchar(10) NOT NULL,
	`wuxingColor` varchar(10) NOT NULL DEFAULT '#888888',
	`rarity` varchar(10) NOT NULL DEFAULT 'common',
	`currencyType` varchar(20) NOT NULL DEFAULT 'initial',
	`price` int NOT NULL DEFAULT 0,
	`isInitial` tinyint NOT NULL DEFAULT 0,
	`isOnSale` tinyint NOT NULL DEFAULT 0,
	`imageUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_items_id` PRIMARY KEY(`id`)
);
