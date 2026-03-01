CREATE TABLE `divination_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topic` varchar(20) NOT NULL,
	`topicName` varchar(20) NOT NULL,
	`question` text,
	`adviceJson` text NOT NULL,
	`contextJson` text NOT NULL,
	`dateString` varchar(12) NOT NULL,
	`energyScore` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `divination_sessions_id` PRIMARY KEY(`id`)
);
