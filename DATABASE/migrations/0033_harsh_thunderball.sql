CREATE TABLE `dietary_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`logDate` varchar(12) NOT NULL,
	`mealType` varchar(20) NOT NULL,
	`consumedElement` varchar(10) NOT NULL,
	`consumedFood` varchar(100) NOT NULL,
	`preference` varchar(10) DEFAULT 'neutral',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dietary_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_diet_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`healthTags` varchar(500) DEFAULT '[]',
	`budgetPreference` varchar(20) DEFAULT 'mid',
	`dislikedElements` varchar(200) DEFAULT '[]',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_diet_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_diet_preferences_userId_unique` UNIQUE(`userId`)
);
