CREATE TABLE `favorite_stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`placeId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(500) NOT NULL,
	`lat` varchar(30) NOT NULL,
	`lng` varchar(30) NOT NULL,
	`note` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorite_stores_id` PRIMARY KEY(`id`)
);
