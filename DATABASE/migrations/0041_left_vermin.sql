CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`expertId` int NOT NULL,
	`serviceId` int NOT NULL,
	`bookingTime` timestamp NOT NULL,
	`status` enum('pending_payment','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending_payment',
	`paymentProofUrl` varchar(500),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expert_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expertId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`isBooked` tinyint NOT NULL DEFAULT 0,
	`bookingId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expert_availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expert_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expertId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`durationMinutes` int NOT NULL DEFAULT 60,
	`price` int NOT NULL DEFAULT 0,
	`type` enum('online','offline') NOT NULL DEFAULT 'online',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expert_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `experts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`publicName` varchar(100) NOT NULL,
	`title` varchar(200),
	`bio` text,
	`profileImageUrl` varchar(500),
	`coverImageUrl` varchar(500),
	`tags` json DEFAULT ('[]'),
	`status` enum('active','inactive','pending_review') NOT NULL DEFAULT 'pending_review',
	`specialties` json DEFAULT ('[]'),
	`languages` varchar(200) DEFAULT '中文',
	`consultationModes` json DEFAULT ('["video"]'),
	`socialLinks` json DEFAULT ('{}'),
	`priceMin` int DEFAULT 0,
	`priceMax` int DEFAULT 0,
	`paymentQrUrl` varchar(500),
	`ratingAvg` decimal(3,2) DEFAULT '0.00',
	`ratingCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `experts_id` PRIMARY KEY(`id`),
	CONSTRAINT `experts_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `private_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL,
	`imageUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `private_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`userId` int NOT NULL,
	`expertId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_bookingId_unique` UNIQUE(`bookingId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','expert','admin') NOT NULL DEFAULT 'user';