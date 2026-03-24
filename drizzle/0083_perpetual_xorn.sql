ALTER TABLE `game_achievements` MODIFY COLUMN `title_reward` varchar(50) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_achievements` MODIFY COLUMN `glow_effect` varchar(50) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_equipment_catalog` MODIFY COLUMN `set_id` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_item_catalog` MODIFY COLUMN `drop_monster_id` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `skill_id_1` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `skill_id_2` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `skill_id_3` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `drop_item_1` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `drop_item_2` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `drop_item_3` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `drop_item_4` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `drop_item_5` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` MODIFY COLUMN `legendary_drop` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_skill_catalog` MODIFY COLUMN `drop_monster_id` varchar(20) DEFAULT '';--> statement-breakpoint
ALTER TABLE `game_monster_catalog` ADD `race` varchar(20) DEFAULT '';