CREATE TABLE `daily_energy_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`wood` int NOT NULL DEFAULT 0,
	`fire` int NOT NULL DEFAULT 0,
	`earth` int NOT NULL DEFAULT 0,
	`metal` int NOT NULL DEFAULT 0,
	`water` int NOT NULL DEFAULT 0,
	`dominantElement` varchar(10) NOT NULL,
	`weakestElement` varchar(10) NOT NULL,
	`strategy` varchar(20),
	`tenGod` varchar(10),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `daily_energy_logs_id` PRIMARY KEY(`id`)
);
