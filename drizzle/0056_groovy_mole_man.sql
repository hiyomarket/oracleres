ALTER TABLE `access_tokens` ADD `identityType` enum('ai_readonly','trial','basic') DEFAULT 'ai_readonly' NOT NULL;--> statement-breakpoint
ALTER TABLE `access_tokens` ADD `guestName` varchar(20);--> statement-breakpoint
ALTER TABLE `access_tokens` ADD `guestGender` enum('male','female');--> statement-breakpoint
ALTER TABLE `access_tokens` ADD `guestBirthYear` int;--> statement-breakpoint
ALTER TABLE `access_tokens` ADD `guestBirthMonth` int;--> statement-breakpoint
ALTER TABLE `access_tokens` ADD `guestBirthDay` int;--> statement-breakpoint
ALTER TABLE `access_tokens` ADD `guestBirthHour` int;