CREATE TABLE `bracelet_wear_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`wearDate` varchar(12) NOT NULL,
	`braceletId` varchar(10) NOT NULL,
	`braceletName` varchar(100) NOT NULL,
	`hand` enum('left','right') NOT NULL,
	`dayStem` varchar(4),
	`tenGod` varchar(10),
	`scratchLogId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bracelet_wear_logs_id` PRIMARY KEY(`id`)
);
