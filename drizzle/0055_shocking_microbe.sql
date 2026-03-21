CREATE TABLE `token_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token_id` int NOT NULL,
	`ip` varchar(64),
	`path` varchar(255) DEFAULT '/ai-view',
	`accessed_at` timestamp DEFAULT (now()),
	CONSTRAINT `token_access_logs_id` PRIMARY KEY(`id`)
);
