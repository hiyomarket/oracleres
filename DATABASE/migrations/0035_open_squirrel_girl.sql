CREATE TABLE `currency_exchange_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`direction` enum('points_to_coins','coins_to_points') NOT NULL,
	`pointsAmount` int NOT NULL,
	`gameCoinsAmount` int NOT NULL,
	`exchangeRate` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `currency_exchange_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(50) NOT NULL,
	`configValue` json NOT NULL,
	`description` varchar(200),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketing_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketing_config_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `wbc_bets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`matchId` int NOT NULL,
	`betType` enum('winlose','spread','combo') NOT NULL DEFAULT 'winlose',
	`betOn` varchar(30) NOT NULL,
	`amount` int NOT NULL,
	`appliedRate` decimal(5,2) NOT NULL,
	`potentialWin` int NOT NULL,
	`status` enum('placed','won','lost','cancelled') NOT NULL DEFAULT 'placed',
	`actualWin` int NOT NULL DEFAULT 0,
	`comboMatchIds` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wbc_bets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wbc_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamA` varchar(50) NOT NULL,
	`teamB` varchar(50) NOT NULL,
	`teamAFlag` varchar(10) NOT NULL DEFAULT '🏳️',
	`teamBFlag` varchar(10) NOT NULL DEFAULT '🏳️',
	`matchTime` bigint NOT NULL,
	`venue` varchar(100) NOT NULL DEFAULT '',
	`poolGroup` varchar(20) NOT NULL DEFAULT '',
	`rateA` decimal(5,2) NOT NULL DEFAULT '1.90',
	`rateB` decimal(5,2) NOT NULL DEFAULT '1.90',
	`status` enum('pending','live','finished','cancelled') NOT NULL DEFAULT 'pending',
	`winningTeam` varchar(5),
	`finalScore` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wbc_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `gameCoins` int DEFAULT 0 NOT NULL;