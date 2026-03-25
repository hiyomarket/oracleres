CREATE TABLE `wardrobe_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(30) NOT NULL DEFAULT 'upper',
	`color` varchar(50) NOT NULL,
	`wuxing` varchar(10) NOT NULL,
	`material` varchar(50),
	`occasion` varchar(50),
	`imageUrl` text,
	`note` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wardrobe_items_id` PRIMARY KEY(`id`)
);
