CREATE TABLE `oracle_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`query` text NOT NULL,
	`result` enum('sheng','xiao','yin','li') NOT NULL,
	`dayPillarStem` varchar(4) NOT NULL,
	`dayPillarBranch` varchar(4) NOT NULL,
	`dayPillarStemElement` varchar(4) NOT NULL,
	`dayPillarBranchElement` varchar(4) NOT NULL,
	`energyLevel` varchar(20) NOT NULL,
	`queryType` varchar(20) NOT NULL,
	`interpretation` text NOT NULL,
	`energyResonance` text NOT NULL,
	`weights` json,
	`isSpecialEgg` int NOT NULL DEFAULT 0,
	`dateString` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oracle_sessions_id` PRIMARY KEY(`id`)
);
