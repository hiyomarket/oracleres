CREATE TABLE `agent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`tick` int NOT NULL,
	`eventType` enum('move','combat','loot','gather','trade','rest','levelup','divine','weather','encounter','death','system') NOT NULL,
	`message` text NOT NULL,
	`data` json,
	`nodeId` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`itemId` varchar(32) NOT NULL,
	`itemType` enum('consumable','material','equipment','quest') NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`equippedSlot` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(64) NOT NULL DEFAULT '旅人',
	`gender` enum('male','female') NOT NULL DEFAULT 'male',
	`currentNodeId` varchar(32) NOT NULL DEFAULT 'taipei-zhongzheng',
	`movingToNodeId` varchar(32),
	`moveArrivesAt` timestamp,
	`hp` int NOT NULL DEFAULT 100,
	`maxHp` int NOT NULL DEFAULT 100,
	`mp` int NOT NULL DEFAULT 50,
	`maxMp` int NOT NULL DEFAULT 50,
	`attack` int NOT NULL DEFAULT 20,
	`defense` int NOT NULL DEFAULT 15,
	`speed` int NOT NULL DEFAULT 10,
	`wuxingWood` int NOT NULL DEFAULT 20,
	`wuxingFire` int NOT NULL DEFAULT 20,
	`wuxingEarth` int NOT NULL DEFAULT 20,
	`wuxingMetal` int NOT NULL DEFAULT 20,
	`wuxingWater` int NOT NULL DEFAULT 20,
	`dominantElement` enum('wood','fire','earth','metal','water') NOT NULL DEFAULT 'wood',
	`level` int NOT NULL DEFAULT 1,
	`exp` int NOT NULL DEFAULT 0,
	`expToNext` int NOT NULL DEFAULT 100,
	`gold` int NOT NULL DEFAULT 50,
	`spiritStone` int NOT NULL DEFAULT 10,
	`destinyCoins` int NOT NULL DEFAULT 0,
	`strategy` enum('explore','farm','merchant','rest') NOT NULL DEFAULT 'explore',
	`status` enum('idle','moving','fighting','gathering','resting','dead') NOT NULL DEFAULT 'idle',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_world` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currentTick` int NOT NULL DEFAULT 0,
	`dailyElement` enum('wood','fire','earth','metal','water') NOT NULL DEFAULT 'wood',
	`dailyStem` varchar(4) NOT NULL DEFAULT '甲',
	`dailyBranch` varchar(4) NOT NULL DEFAULT '子',
	`weatherModifier` float NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_world_id` PRIMARY KEY(`id`)
);
