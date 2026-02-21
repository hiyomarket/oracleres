CREATE TABLE `scratch_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`denomination` int NOT NULL,
	`storeAddress` varchar(500),
	`purchaseHour` varchar(10),
	`resonanceScore` int,
	`isWon` int NOT NULL DEFAULT 0,
	`wonAmount` int DEFAULT 0,
	`note` varchar(300),
	`purchasedAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scratch_logs_id` PRIMARY KEY(`id`)
);
