CREATE TABLE `user_group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`note` varchar(200),
	`addedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_group_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_user_idx` UNIQUE(`groupId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `user_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(30) DEFAULT 'amber',
	`icon` varchar(10) DEFAULT '👥',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_groups_id` PRIMARY KEY(`id`)
);
