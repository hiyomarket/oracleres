CREATE TABLE `wealth_journal` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`lotteryScore` int NOT NULL DEFAULT 5,
	`tenGod` varchar(20) DEFAULT '',
	`note` varchar(500) DEFAULT '',
	`didBuyLottery` tinyint DEFAULT 0,
	`lotteryAmount` int DEFAULT 0,
	`lotteryResult` varchar(20) DEFAULT 'pending',
	`winAmount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wealth_journal_id` PRIMARY KEY(`id`)
);
