ALTER TABLE `game_daily_aura` ADD `questCompleted` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `game_daily_aura` ADD `earnedStones` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `gameStones` int DEFAULT 0 NOT NULL;