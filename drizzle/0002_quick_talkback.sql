CREATE TABLE `lottery_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`numbers` json NOT NULL,
	`bonusNumbers` json NOT NULL,
	`luckyDigits` json NOT NULL,
	`dayPillar` varchar(4) NOT NULL,
	`hourPillar` varchar(4) NOT NULL,
	`moonPhase` varchar(20) NOT NULL,
	`todayElement` varchar(10) NOT NULL,
	`overallLuck` int NOT NULL,
	`recommendation` text NOT NULL,
	`dateString` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lottery_sessions_id` PRIMARY KEY(`id`)
);
