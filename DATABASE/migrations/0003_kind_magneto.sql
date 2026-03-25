CREATE TABLE `lottery_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` int,
	`predictedNumbers` json NOT NULL,
	`actualNumbers` json NOT NULL,
	`actualBonus` int,
	`matchCount` int NOT NULL DEFAULT 0,
	`bonusMatch` int NOT NULL DEFAULT 0,
	`resonanceScore` int NOT NULL DEFAULT 0,
	`dayPillar` varchar(4) NOT NULL,
	`dateString` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lottery_results_id` PRIMARY KEY(`id`)
);
