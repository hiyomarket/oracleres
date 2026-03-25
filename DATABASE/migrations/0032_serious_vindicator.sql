CREATE TABLE `strategy_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`strategyName` varchar(20) NOT NULL,
	`description` varchar(200) NOT NULL,
	`primaryTarget` varchar(20) NOT NULL,
	`weakThreshold` int NOT NULL DEFAULT 15,
	`strongThreshold` int NOT NULL DEFAULT 30,
	`priority` int NOT NULL DEFAULT 99,
	`enabled` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategy_thresholds_id` PRIMARY KEY(`id`),
	CONSTRAINT `strategy_thresholds_strategyName_unique` UNIQUE(`strategyName`)
);
