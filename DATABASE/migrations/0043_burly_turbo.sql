CREATE TABLE `expert_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`publicName` varchar(100) NOT NULL,
	`motivation` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expert_applications_id` PRIMARY KEY(`id`)
);
