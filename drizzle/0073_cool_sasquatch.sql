CREATE TABLE `game_broadcast` (
	`id` int AUTO_INCREMENT NOT NULL,
	`msg_type` enum('info','warning','event','maintenance') NOT NULL DEFAULT 'info',
	`content` text NOT NULL,
	`sent_by` varchar(255),
	`is_active` tinyint NOT NULL DEFAULT 1,
	`expires_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `game_broadcast_id` PRIMARY KEY(`id`)
);
