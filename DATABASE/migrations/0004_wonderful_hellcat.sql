ALTER TABLE `lottery_results` ADD `ticketType` varchar(20) DEFAULT 'lottery' NOT NULL;--> statement-breakpoint
ALTER TABLE `lottery_results` ADD `scratchPrice` int;--> statement-breakpoint
ALTER TABLE `lottery_results` ADD `scratchPrize` int;--> statement-breakpoint
ALTER TABLE `lottery_results` ADD `scratchWon` int DEFAULT 0;