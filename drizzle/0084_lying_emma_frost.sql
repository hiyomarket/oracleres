ALTER TABLE `pvp_challenges` ADD `status` enum('pending','accepted','declined','timeout','completed') DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `pvp_challenges` ADD `exp_reward_challenger` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `pvp_challenges` ADD `exp_reward_defender` int DEFAULT 0 NOT NULL;