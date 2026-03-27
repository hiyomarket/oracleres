CREATE TABLE `equip_enhance_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`inventory_id` int NOT NULL,
	`equip_id` varchar(50) NOT NULL,
	`equip_name` varchar(100) NOT NULL,
	`scroll_item_id` varchar(50) NOT NULL,
	`from_level` int NOT NULL,
	`to_level` int NOT NULL,
	`result` varchar(30) NOT NULL,
	`success_rate` float NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `equip_enhance_logs_id` PRIMARY KEY(`id`)
);
