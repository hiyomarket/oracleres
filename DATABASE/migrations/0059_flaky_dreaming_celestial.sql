CREATE TABLE `game_daily_aura` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordDate` varchar(10) NOT NULL,
	`score` int NOT NULL,
	`blessingLevel` varchar(20) NOT NULL DEFAULT 'none',
	`equippedWuxing` text,
	`recommendedWuxing` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_daily_aura_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_wardrobe` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemId` int NOT NULL DEFAULT 0,
	`layer` varchar(20) NOT NULL,
	`imageUrl` text NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`rarity` varchar(10) NOT NULL DEFAULT 'common',
	`isEquipped` tinyint NOT NULL DEFAULT 0,
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_wardrobe_id` PRIMARY KEY(`id`)
);
