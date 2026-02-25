ALTER TABLE `modules` ADD `isCentral` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `modules` ADD `parentId` varchar(50);