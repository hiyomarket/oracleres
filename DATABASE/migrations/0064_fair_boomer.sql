ALTER TABLE `game_agents` MODIFY COLUMN `stamina` int NOT NULL DEFAULT 100;--> statement-breakpoint
ALTER TABLE `game_agents` MODIFY COLUMN `max_stamina` int NOT NULL DEFAULT 100;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `status` enum('idle','moving','resting','combat','dead') DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_agents` ADD `dominant_element` enum('wood','fire','earth','metal','water') DEFAULT 'wood' NOT NULL;