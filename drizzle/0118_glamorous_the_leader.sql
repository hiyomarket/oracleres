CREATE TABLE `remedy_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`element` varchar(10) NOT NULL,
	`category` varchar(50) NOT NULL,
	`description` text,
	`price_range` varchar(50),
	`is_affordable` tinyint NOT NULL DEFAULT 1,
	`applicable_scene` varchar(20) NOT NULL DEFAULT 'both',
	`applicable_sha_ids` json,
	`image_url` varchar(500),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `remedy_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `yangzhai_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(100) NOT NULL,
	`analysis_type` varchar(50) NOT NULL,
	`result` json NOT NULL,
	`score` int,
	`scene_description` text,
	`photo_url` varchar(500),
	`feedback` varchar(20),
	`created_at` bigint NOT NULL,
	CONSTRAINT `yangzhai_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `yangzhai_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` json NOT NULL,
	`description` text,
	`category` varchar(50) NOT NULL DEFAULT 'general',
	`is_active` tinyint NOT NULL DEFAULT 1,
	`updated_by` varchar(100),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `yangzhai_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `yangzhai_config_config_key_unique` UNIQUE(`config_key`)
);
