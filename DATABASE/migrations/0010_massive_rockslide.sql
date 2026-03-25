ALTER TABLE `invite_codes` ADD `presetDisplayName` varchar(100);--> statement-breakpoint
ALTER TABLE `invite_codes` ADD `presetBirthDate` varchar(12);--> statement-breakpoint
ALTER TABLE `invite_codes` ADD `presetBirthTime` varchar(8);--> statement-breakpoint
ALTER TABLE `invite_codes` ADD `presetDayMasterElement` varchar(20);--> statement-breakpoint
ALTER TABLE `invite_codes` ADD `presetFavorableElements` varchar(100);--> statement-breakpoint
ALTER TABLE `invite_codes` ADD `presetUnfavorableElements` varchar(100);