-- Oracle Resonance 資料庫 Schema
-- 匯出時間: 2026-03-25T16:27:14.179Z
-- 資料表數量: 104

-- Table: __drizzle_migrations
CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=494952;

-- Table: access_tokens
CREATE TABLE `access_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdBy` int NOT NULL,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `lastUsedAt` timestamp NULL DEFAULT NULL,
  `useCount` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `allowedModules` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `access_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily_view',
  `identityType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ai_readonly',
  `guestName` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guestGender` enum('male','female') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guestBirthYear` int DEFAULT NULL,
  `guestBirthMonth` int DEFAULT NULL,
  `guestBirthDay` int DEFAULT NULL,
  `guestBirthHour` int DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `access_tokens_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- Table: achievements
CREATE TABLE `achievements` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `desc` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '🏅',
  `type` enum('level','pvp','combat','gather','explore','legendary','weekly','chat','special') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'special',
  `condition` json NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admin_game_control
CREATE TABLE `admin_game_control` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `infinite_stamina` tinyint NOT NULL DEFAULT '0',
  `infinite_ap` tinyint NOT NULL DEFAULT '0',
  `infinite_hp` tinyint NOT NULL DEFAULT '0',
  `infinite_mp` tinyint NOT NULL DEFAULT '0',
  `infinite_gold` tinyint NOT NULL DEFAULT '0',
  `is_banned` tinyint NOT NULL DEFAULT '0',
  `ban_reason` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_note` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_modified_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` bigint NOT NULL,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `admin_game_control_agent_id_unique` (`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: agent_achievements
CREATE TABLE `agent_achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `achievement_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `progress` int NOT NULL DEFAULT '0',
  `unlocked` tinyint NOT NULL DEFAULT '0',
  `unlocked_at` bigint DEFAULT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: agent_drop_counters
CREATE TABLE `agent_drop_counters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `no_drop_streak` int NOT NULL DEFAULT '0',
  `no_mid_streak` int NOT NULL DEFAULT '0',
  `no_high_streak` int NOT NULL DEFAULT '0',
  `total_battles` int NOT NULL DEFAULT '0',
  `total_drops` int NOT NULL DEFAULT '0',
  `last_updated` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `agent_drop_counters_agent_id_unique` (`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: agent_events
CREATE TABLE `agent_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `event_type` enum('move','combat','gather','rest','rogue','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `node_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` json DEFAULT NULL,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: agent_inventory
CREATE TABLE `agent_inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `item_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` enum('material','equipment','skill_book','consumable','pet') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'material',
  `quantity` int NOT NULL DEFAULT '1',
  `item_data` json DEFAULT NULL,
  `acquired_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  `is_equipped` tinyint NOT NULL DEFAULT '0',
  `equipped_slot` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `obtained_at` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: agent_pvp_stats
CREATE TABLE `agent_pvp_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `agent_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_element` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'wood',
  `agent_level` int NOT NULL DEFAULT '1',
  `wins` int NOT NULL DEFAULT '0',
  `losses` int NOT NULL DEFAULT '0',
  `draws` int NOT NULL DEFAULT '0',
  `current_streak` int NOT NULL DEFAULT '0',
  `max_streak` int NOT NULL DEFAULT '0',
  `last_challenge_at` bigint DEFAULT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: agent_set_progress
CREATE TABLE `agent_set_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `set_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pieces_owned` int NOT NULL DEFAULT '0',
  `is_activated` tinyint NOT NULL DEFAULT '0',
  `updated_at` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: agent_skills
CREATE TABLE `agent_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `skill_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `awake_tier` int NOT NULL DEFAULT '0',
  `use_count` int NOT NULL DEFAULT '0',
  `installed_slot` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acquired_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: agent_titles
CREATE TABLE `agent_titles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `title_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_equipped` tinyint NOT NULL DEFAULT '0',
  `acquired_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: auction_listings
CREATE TABLE `auction_listings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seller_agent_id` int NOT NULL,
  `seller_name` varchar(50) NOT NULL,
  `item_id` varchar(50) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `item_rarity` varchar(20) NOT NULL DEFAULT 'common',
  `item_element` varchar(20) NOT NULL DEFAULT '',
  `quantity` int NOT NULL DEFAULT '1',
  `price` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `buyer_agent_id` int DEFAULT NULL,
  `buyer_name` varchar(50) DEFAULT NULL,
  `sold_at` bigint DEFAULT NULL,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_status` (`status`),
  KEY `idx_seller` (`seller_agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Table: aura_engine_config
CREATE TABLE `aura_engine_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configKey` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configValue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valueType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'number',
  `minValue` decimal(10,2) DEFAULT NULL,
  `maxValue` decimal(10,2) DEFAULT NULL,
  `step` decimal(10,2) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: aura_rule_history
CREATE TABLE `aura_rule_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `snapshotLabel` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `snapshotData` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdBy` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: awake_materials
CREATE TABLE `awake_materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `material_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: bookings
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `expertId` int NOT NULL,
  `serviceId` int NOT NULL,
  `bookingTime` timestamp NOT NULL,
  `status` enum('pending_payment','confirmed','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_payment',
  `paymentProofUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `endTime` timestamp NULL DEFAULT NULL,
  `paymentNote` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- Table: bracelet_wear_logs
CREATE TABLE `bracelet_wear_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `wearDate` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `braceletId` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `braceletName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hand` enum('left','right') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dayStem` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenGod` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scratchLogId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=240001;

-- Table: campaigns
CREATE TABLE `campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `startDate` timestamp NOT NULL,
  `endDate` timestamp NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `ruleType` enum('discount','giveaway','plan_assign') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruleTarget` json NOT NULL,
  `ruleValue` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `isDefaultOnboarding` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- Table: chat_messages
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `agent_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_element` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'wood',
  `agent_level` int NOT NULL DEFAULT '1',
  `content` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `msg_type` enum('normal','system','world_event') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: currency_exchange_logs
CREATE TABLE `currency_exchange_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `direction` enum('points_to_coins','coins_to_points') COLLATE utf8mb4_unicode_ci NOT NULL,
  `pointsAmount` int NOT NULL,
  `gameCoinsAmount` int NOT NULL,
  `exchangeRate` decimal(10,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: custom_bracelets
CREATE TABLE `custom_bracelets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `element` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `functionDesc` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tacticalRoles` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '99',
  `isBuiltin` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pairingItems` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- Table: daily_energy_logs
CREATE TABLE `daily_energy_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `date` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wood` int NOT NULL DEFAULT '0',
  `fire` int NOT NULL DEFAULT '0',
  `earth` int NOT NULL DEFAULT '0',
  `metal` int NOT NULL DEFAULT '0',
  `water` int NOT NULL DEFAULT '0',
  `dominantElement` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `weakestElement` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `strategy` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenGod` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: dietary_logs
CREATE TABLE `dietary_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `logDate` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mealType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consumedElement` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consumedFood` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `preference` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'neutral',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: divination_sessions
CREATE TABLE `divination_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `topic` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `topicName` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adviceJson` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `contextJson` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateString` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `energyScore` int NOT NULL DEFAULT '5',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=600001;

-- Table: equipment_templates
CREATE TABLE `equipment_templates` (
  `id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `element` enum('wood','fire','earth','metal','water') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier` enum('basic','mid','high','legendary') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'basic',
  `slot` enum('weapon','helmet','armor','boots','accessory') COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_req` int NOT NULL DEFAULT '1',
  `hp_bonus` int NOT NULL DEFAULT '0',
  `atk_bonus` int NOT NULL DEFAULT '0',
  `def_bonus` int NOT NULL DEFAULT '0',
  `spd_bonus` int NOT NULL DEFAULT '0',
  `matk_bonus` int NOT NULL DEFAULT '0',
  `mp_bonus` int NOT NULL DEFAULT '0',
  `affixes` json DEFAULT NULL,
  `set_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `set_piece` int DEFAULT NULL,
  `shop_price` int DEFAULT NULL,
  `npc_sell_price` int NOT NULL DEFAULT '10',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: expert_applications
CREATE TABLE `expert_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `publicName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `motivation` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `adminNote` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: expert_availability
CREATE TABLE `expert_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expertId` int NOT NULL,
  `startTime` timestamp NOT NULL,
  `endTime` timestamp NOT NULL,
  `isBooked` tinyint NOT NULL DEFAULT '0',
  `bookingId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- Table: expert_calendar_events
CREATE TABLE `expert_calendar_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expertId` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eventDate` timestamp NOT NULL,
  `endDate` timestamp NULL DEFAULT NULL,
  `eventType` enum('offline','online','announcement') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'offline',
  `location` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxAttendees` int DEFAULT NULL,
  `price` int DEFAULT '0',
  `isPublic` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: expert_services
CREATE TABLE `expert_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expertId` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `durationMinutes` int NOT NULL DEFAULT '60',
  `price` int NOT NULL DEFAULT '0',
  `type` enum('online','offline') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'online',
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: experts
CREATE TABLE `experts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `publicName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profileImageUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coverImageUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `status` enum('active','inactive','pending_review') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_review',
  `paymentQrUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ratingAvg` decimal(3,2) DEFAULT '0.00',
  `ratingCount` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `specialties` json DEFAULT NULL,
  `languages` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '中文',
  `consultationModes` json DEFAULT NULL,
  `socialLinks` json DEFAULT NULL,
  `priceMin` int DEFAULT '0',
  `priceMax` int DEFAULT '0',
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bioHtml` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sectionTitle` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `userId` (`userId`),
  UNIQUE KEY `experts_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: favorite_stores
CREATE TABLE `favorite_stores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `placeId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lat` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lng` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: feature_plans
CREATE TABLE `feature_plans` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moduleId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `points3Days` int DEFAULT NULL,
  `points7Days` int DEFAULT NULL,
  `points15Days` int DEFAULT NULL,
  `points30Days` int DEFAULT NULL,
  `shopUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allowPointsRedemption` tinyint NOT NULL DEFAULT '1',
  `allowPurchase` tinyint NOT NULL DEFAULT '1',
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: feature_redemptions
CREATE TABLE `feature_redemptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `featurePlanId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moduleId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `durationDays` int NOT NULL,
  `pointsSpent` int NOT NULL DEFAULT '0',
  `source` enum('points','purchase','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'points',
  `previousExpiresAt` timestamp NULL DEFAULT NULL,
  `newExpiresAt` timestamp NOT NULL,
  `note` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: features
CREATE TABLE `features` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requiredPlanLevel` int NOT NULL DEFAULT '1',
  `isManaged` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `coinCostPerUse` int DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_achievements
CREATE TABLE `game_achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_value` int NOT NULL,
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_amount` int NOT NULL,
  `icon_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `is_active` tinyint DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ach_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `ach_rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `condition_params` json DEFAULT NULL,
  `reward_content` json DEFAULT NULL,
  `title_reward` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `glow_effect` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_agents
CREATE TABLE `game_agents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_named` tinyint NOT NULL DEFAULT '0',
  `level` int NOT NULL DEFAULT '1',
  `exp` int NOT NULL DEFAULT '0',
  `current_node_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'taipei-zhongzheng',
  `target_node_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `strategy` enum('explore','gather','rest','combat','infuse') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'explore',
  `previous_strategy` enum('explore','gather','rest','combat','infuse') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `movement_mode` enum('roaming','stationary') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'roaming',
  `status` enum('idle','moving','resting','combat','dead') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'idle',
  `dominant_element` enum('wood','fire','earth','metal','water') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'wood',
  `hp` int NOT NULL DEFAULT '100',
  `max_hp` int NOT NULL DEFAULT '100',
  `mp` int NOT NULL DEFAULT '50',
  `max_mp` int NOT NULL DEFAULT '50',
  `attack` int NOT NULL DEFAULT '10',
  `defense` int NOT NULL DEFAULT '5',
  `speed` int NOT NULL DEFAULT '8',
  `wuxing_wood` int NOT NULL DEFAULT '20',
  `wuxing_fire` int NOT NULL DEFAULT '20',
  `wuxing_earth` int NOT NULL DEFAULT '20',
  `wuxing_metal` int NOT NULL DEFAULT '20',
  `wuxing_water` int NOT NULL DEFAULT '20',
  `gold` int NOT NULL DEFAULT '0',
  `total_kills` int NOT NULL DEFAULT '0',
  `total_steps` int NOT NULL DEFAULT '0',
  `stamina` int NOT NULL DEFAULT '100',
  `max_stamina` int NOT NULL DEFAULT '100',
  `stamina_last_regen` bigint DEFAULT NULL,
  `action_points` int NOT NULL DEFAULT '5',
  `max_action_points` int NOT NULL DEFAULT '5',
  `action_points_last_regen` bigint DEFAULT NULL,
  `equipped_head` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_body` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_hands` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_feet` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_weapon` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_offhand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_ring_a` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_ring_b` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_slot_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_slot_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_slot_3` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_slot_4` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passive_slot_1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passive_slot_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  `gather_power` int NOT NULL DEFAULT '20',
  `forge_power` int NOT NULL DEFAULT '20',
  `carry_weight` int NOT NULL DEFAULT '20',
  `refine_power` int NOT NULL DEFAULT '20',
  `treasure_hunting` int NOT NULL DEFAULT '20',
  `heal_power` int NOT NULL DEFAULT '20',
  `magic_attack` int NOT NULL DEFAULT '20',
  `hit_rate` int NOT NULL DEFAULT '20',
  `equipped_necklace` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipped_amulet` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_divine_heal_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_divine_eye_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_divine_stamina_date` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `widget_layout` json DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_broadcast
CREATE TABLE `game_broadcast` (
  `id` int NOT NULL AUTO_INCREMENT,
  `msg_type` enum('info','warning','event','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `expires_at` bigint DEFAULT NULL,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_config
CREATE TABLE `game_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'number',
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `min_value` float DEFAULT NULL,
  `max_value` float DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `updated_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` bigint NOT NULL,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `game_config_config_key_unique` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_daily_aura
CREATE TABLE `game_daily_aura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `recordDate` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` int NOT NULL,
  `blessingLevel` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `equippedWuxing` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recommendedWuxing` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `questCompleted` tinyint NOT NULL DEFAULT '0',
  `earnedStones` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_equipment_catalog
CREATE TABLE `game_equipment_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equip_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slot` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'weapon',
  `tier` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '初階',
  `level_required` int NOT NULL DEFAULT '1',
  `base_stats` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `special_effect` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `craft_materials` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `image_url` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_at` bigint NOT NULL DEFAULT '0',
  `quality` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'white',
  `hp_bonus` int NOT NULL DEFAULT '0',
  `attack_bonus` int NOT NULL DEFAULT '0',
  `defense_bonus` int NOT NULL DEFAULT '0',
  `speed_bonus` int NOT NULL DEFAULT '0',
  `resist_bonus` json DEFAULT NULL,
  `affix_1` json DEFAULT NULL,
  `affix_2` json DEFAULT NULL,
  `affix_3` json DEFAULT NULL,
  `affix_4` json DEFAULT NULL,
  `affix_5` json DEFAULT NULL,
  `craft_materials_list` json DEFAULT NULL,
  `set_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `equip_id` (`equip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_gatherables
CREATE TABLE `game_gatherables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `spawn_rate` float NOT NULL DEFAULT '0.5',
  `image_url` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_hidden_events
CREATE TABLE `game_hidden_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `node_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` enum('hidden_shop','hidden_npc','hidden_quest') COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_data` json NOT NULL,
  `perception_threshold` int NOT NULL DEFAULT '30',
  `remaining_ticks` int NOT NULL DEFAULT '5',
  `is_discovered` tinyint NOT NULL DEFAULT '0',
  `created_at` bigint NOT NULL,
  `expires_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_hidden_shop_pool
CREATE TABLE `game_hidden_shop_pool` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currency_type` enum('coins','stones') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'coins',
  `price` int NOT NULL DEFAULT '0',
  `quantity` int NOT NULL DEFAULT '1',
  `weight` int NOT NULL DEFAULT '10',
  `rarity` enum('common','rare','epic','legendary') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rare',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_inventory_items
CREATE TABLE `game_inventory_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_type` enum('consumable','equipment','weapon','material','special') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'consumable',
  `sub_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `rarity` enum('common','rare','epic','legendary') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `emoji` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '📦',
  `stat_bonus` json DEFAULT NULL,
  `use_effect` json DEFAULT NULL,
  `equip_slot` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `max_stack` int NOT NULL DEFAULT '99',
  `is_tradable` tinyint NOT NULL DEFAULT '1',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `item_key` (`item_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_item_catalog
CREATE TABLE `game_item_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'material_basic',
  `source` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `effect` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `image_url` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_at` bigint NOT NULL DEFAULT '0',
  `stack_limit` int NOT NULL DEFAULT '99',
  `shop_price` int NOT NULL DEFAULT '0',
  `in_normal_shop` tinyint DEFAULT '0',
  `in_spirit_shop` tinyint DEFAULT '0',
  `in_secret_shop` tinyint DEFAULT '0',
  `is_monster_drop` tinyint DEFAULT '0',
  `drop_monster_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drop_rate` float NOT NULL DEFAULT '0',
  `gather_locations` json DEFAULT NULL,
  `use_effect` json DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `item_id` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_items
CREATE TABLE `game_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'female',
  `layer` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `view` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'front',
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxingColor` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#888888',
  `rarity` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `currencyType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'initial',
  `price` int NOT NULL DEFAULT '0',
  `isInitial` tinyint NOT NULL DEFAULT '0',
  `isOnSale` tinyint NOT NULL DEFAULT '0',
  `imageUrl` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_map_nodes
CREATE TABLE `game_map_nodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lat` float NOT NULL,
  `lng` float NOT NULL,
  `node_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_merchant_pool
CREATE TABLE `game_merchant_pool` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `price_stones` int NOT NULL,
  `appearance_rate` float NOT NULL DEFAULT '0.1',
  `is_active` tinyint DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_monster_catalog
CREATE TABLE `game_monster_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monster_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_range` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1-5',
  `base_hp` int NOT NULL DEFAULT '50',
  `base_attack` int NOT NULL DEFAULT '10',
  `base_defense` int NOT NULL DEFAULT '5',
  `base_speed` int NOT NULL DEFAULT '10',
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drop_items` json DEFAULT NULL,
  `rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `image_url` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `catch_rate` float NOT NULL DEFAULT '0.1',
  `is_active` tinyint DEFAULT '1',
  `created_at` bigint NOT NULL DEFAULT '0',
  `base_accuracy` int NOT NULL DEFAULT '80',
  `base_magic_attack` int NOT NULL DEFAULT '8',
  `resist_wood` int NOT NULL DEFAULT '0',
  `resist_fire` int NOT NULL DEFAULT '0',
  `resist_earth` int NOT NULL DEFAULT '0',
  `resist_metal` int NOT NULL DEFAULT '0',
  `resist_water` int NOT NULL DEFAULT '0',
  `counter_bonus` int NOT NULL DEFAULT '50',
  `skill_id_1` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_id_2` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_id_3` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `race` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `ai_level` int NOT NULL DEFAULT '1',
  `growth_rate` float NOT NULL DEFAULT '1',
  `drop_item_1` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drop_rate_1` float NOT NULL DEFAULT '0',
  `drop_item_2` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drop_rate_2` float NOT NULL DEFAULT '0',
  `drop_item_3` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drop_rate_3` float NOT NULL DEFAULT '0',
  `drop_item_4` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drop_rate_4` float NOT NULL DEFAULT '0',
  `drop_item_5` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drop_rate_5` float NOT NULL DEFAULT '0',
  `drop_gold` json DEFAULT NULL,
  `legendary_drop` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `legendary_drop_rate` float NOT NULL DEFAULT '0',
  `destiny_clue` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spawn_nodes` json DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `monster_id` (`monster_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_monster_skill_catalog
CREATE TABLE `game_monster_skill_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monster_skill_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'attack',
  `rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `power_percent` int NOT NULL DEFAULT '100',
  `mp_cost` int NOT NULL DEFAULT '0',
  `cooldown` int NOT NULL DEFAULT '0',
  `accuracy_mod` int NOT NULL DEFAULT '100',
  `additional_effect` json DEFAULT NULL,
  `ai_condition` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `monster_skill_id` (`monster_skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_monsters
CREATE TABLE `game_monsters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_hp` int NOT NULL,
  `base_attack` int NOT NULL,
  `base_defense` int NOT NULL,
  `base_speed` int NOT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `catch_rate` float NOT NULL DEFAULT '0.1',
  `is_active` tinyint DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_random_quests
CREATE TABLE `game_random_quests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `required_wuxing` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reward_amount` int NOT NULL,
  `is_active` tinyint DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_rogue_events
CREATE TABLE `game_rogue_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '✨',
  `reward_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gold',
  `gold_min` int NOT NULL DEFAULT '0',
  `gold_max` int NOT NULL DEFAULT '0',
  `exp_reward` int NOT NULL DEFAULT '0',
  `hp_change` int NOT NULL DEFAULT '0',
  `heal_full` tinyint NOT NULL DEFAULT '0',
  `item_reward_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `item_reward_qty` int NOT NULL DEFAULT '0',
  `weight` int NOT NULL DEFAULT '10',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `wuxing_filter` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `min_level` int NOT NULL DEFAULT '0',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `event_id` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_skill_catalog
CREATE TABLE `game_skill_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `skill_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active_combat',
  `tier` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '初階',
  `mp_cost` int NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skill_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'attack',
  `is_active` tinyint DEFAULT '1',
  `created_at` bigint NOT NULL DEFAULT '0',
  `rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `cooldown` int NOT NULL DEFAULT '0',
  `power_percent` int NOT NULL DEFAULT '100',
  `learn_level` int NOT NULL DEFAULT '1',
  `acquire_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'shop',
  `shop_price` int NOT NULL DEFAULT '0',
  `drop_monster_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hidden_trigger` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `skill_id` (`skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_skills
CREATE TABLE `game_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mp_cost` int NOT NULL,
  `damage_multiplier` float NOT NULL,
  `skill_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: game_spirit_shop
CREATE TABLE `game_spirit_shop` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_stones` int NOT NULL DEFAULT '0',
  `quantity` int NOT NULL DEFAULT '1',
  `rarity` enum('common','rare','epic','legendary') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rare',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_on_sale` tinyint NOT NULL DEFAULT '1',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_titles
CREATE TABLE `game_titles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title_desc` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title_type` enum('natal','achievement','event','special') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'natal',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#f59e0b',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `title_key` (`title_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_virtual_shop
CREATE TABLE `game_virtual_shop` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_coins` int NOT NULL DEFAULT '0',
  `quantity` int NOT NULL DEFAULT '1',
  `stock` int NOT NULL DEFAULT '-1',
  `node_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_on_sale` tinyint NOT NULL DEFAULT '1',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_wardrobe
CREATE TABLE `game_wardrobe` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `itemId` int NOT NULL DEFAULT '0',
  `layer` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `imageUrl` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rarity` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `isEquipped` tinyint NOT NULL DEFAULT '0',
  `acquiredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: game_world
CREATE TABLE `game_world` (
  `id` int NOT NULL AUTO_INCREMENT,
  `world_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `world_data` json NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `world_key` (`world_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: global_first_triggers
CREATE TABLE `global_first_triggers` (
  `skill_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_agent_id` int NOT NULL,
  `first_agent_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `triggered_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`skill_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: hidden_shop_instances
CREATE TABLE `hidden_shop_instances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `node_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_reason` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'world_tick',
  `items` json NOT NULL,
  `start_at` bigint NOT NULL,
  `expires_at` bigint NOT NULL,
  `is_closed` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: hidden_skill_trackers
CREATE TABLE `hidden_skill_trackers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `tracker_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_value` int NOT NULL DEFAULT '0',
  `target_value` int NOT NULL,
  `is_unlocked` tinyint NOT NULL DEFAULT '0',
  `unlocked_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: invite_codes
CREATE TABLE `invite_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdBy` int NOT NULL,
  `usedBy` int DEFAULT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isUsed` tinyint NOT NULL DEFAULT '0',
  `expiresAt` timestamp NULL DEFAULT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `presetName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presetBirthDate` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presetBirthTime` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presetBirthPlace` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presetDayMasterElement` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presetFavorableElements` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presetUnfavorableElements` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `presetDisplayName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `invite_codes_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=420001;

-- Table: lottery_results
CREATE TABLE `lottery_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `sessionId` int DEFAULT NULL,
  `predictedNumbers` json NOT NULL,
  `actualNumbers` json NOT NULL,
  `actualBonus` int DEFAULT NULL,
  `matchCount` int NOT NULL DEFAULT '0',
  `bonusMatch` int NOT NULL DEFAULT '0',
  `resonanceScore` int NOT NULL DEFAULT '0',
  `dayPillar` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateString` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ticketType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lottery',
  `scratchPrice` int DEFAULT NULL,
  `scratchPrize` int DEFAULT NULL,
  `scratchWon` int DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- Table: lottery_sessions
CREATE TABLE `lottery_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `numbers` json NOT NULL,
  `bonusNumbers` json NOT NULL,
  `luckyDigits` json NOT NULL,
  `dayPillar` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hourPillar` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moonPhase` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `todayElement` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `overallLuck` int NOT NULL,
  `recommendation` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateString` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=630001;

-- Table: marketing_config
CREATE TABLE `marketing_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `configKey` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configValue` json NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `configKey` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- Table: modules
CREATE TABLE `modules` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('core','addon') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'addon',
  `sortOrder` int NOT NULL DEFAULT '0',
  `containedFeatures` json NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `navPath` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `isCentral` tinyint NOT NULL DEFAULT '0',
  `parentId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `displayLocation` enum('main','profile','both') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'main',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: monster_drop_tables
CREATE TABLE `monster_drop_tables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monster_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `equipment_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_drop_rate` int NOT NULL,
  `weight` int NOT NULL DEFAULT '100',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: oracle_sessions
CREATE TABLE `oracle_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `query` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `result` enum('sheng','xiao','yin','li') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dayPillarStem` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dayPillarBranch` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dayPillarStemElement` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dayPillarBranchElement` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `energyLevel` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queryType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `interpretation` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `energyResonance` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `weights` json DEFAULT NULL,
  `isSpecialEgg` int NOT NULL DEFAULT '0',
  `dateString` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=1620001;

-- Table: plan_modules
CREATE TABLE `plan_modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `planId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moduleId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `plan_module_idx` (`planId`,`moduleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=210001;

-- Table: plans
CREATE TABLE `plans` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0',
  `level` int NOT NULL DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bonusPoints` int NOT NULL DEFAULT '0',
  `firstSubscriptionBonusCoins` int NOT NULL DEFAULT '0',
  `monthlyRenewalBonusCoins` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: points_transactions
CREATE TABLE `points_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `amount` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `featureId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paymentOrderId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=2670001;

-- Table: private_messages
CREATE TABLE `private_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int NOT NULL,
  `senderId` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `imageUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isRead` tinyint NOT NULL DEFAULT '0',
  `readAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- Table: purchase_orders
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `featurePlanId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `moduleId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `durationDays` int NOT NULL,
  `externalOrderId` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userNote` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `rejectReason` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `reviewedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: pvp_challenges
CREATE TABLE `pvp_challenges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `challenger_agent_id` int NOT NULL,
  `challenger_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `defender_agent_id` int NOT NULL,
  `defender_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `result` enum('challenger_win','defender_win','draw') COLLATE utf8mb4_unicode_ci NOT NULL,
  `battle_log` json DEFAULT NULL,
  `gold_reward` int NOT NULL DEFAULT '0',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: redemption_codes
CREATE TABLE `redemption_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaignId` int NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isUsed` tinyint NOT NULL DEFAULT '0',
  `usedBy` int DEFAULT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `isVoided` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: restaurant_categories
CREATE TABLE `restaurant_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoryId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emoji` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '🍽️',
  `types` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `textSuffix` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '99',
  `enabled` tinyint NOT NULL DEFAULT '1',
  `isDefault` tinyint NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `scheduleEnabled` tinyint NOT NULL DEFAULT '0',
  `scheduleStartHour` int NOT NULL DEFAULT '0',
  `scheduleEndHour` int NOT NULL DEFAULT '23',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `categoryId` (`categoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=60001;

-- Table: reviews
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int NOT NULL,
  `userId` int NOT NULL,
  `expertId` int NOT NULL,
  `rating` int NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `bookingId` (`bookingId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: scratch_logs
CREATE TABLE `scratch_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `denomination` int NOT NULL,
  `storeAddress` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchaseHour` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resonanceScore` int DEFAULT NULL,
  `isWon` int NOT NULL DEFAULT '0',
  `wonAmount` int DEFAULT '0',
  `note` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchasedAt` bigint NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fengShuiGrade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fengShuiScore` int DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- Table: site_banners
CREATE TABLE `site_banners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `linkUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linkText` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '🔔',
  `type` enum('info','warning','success','promo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `startsAt` timestamp NULL DEFAULT NULL,
  `endsAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: skill_books
CREATE TABLE `skill_books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `skill_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `obtained_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: skill_templates
CREATE TABLE `skill_templates` (
  `id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `element` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rarity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier` int NOT NULL DEFAULT '0',
  `mp_cost` int NOT NULL DEFAULT '0',
  `cooldown` int NOT NULL DEFAULT '0',
  `effect_desc` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `effect_value` float NOT NULL DEFAULT '1',
  `status_effect` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_chance` float DEFAULT '0',
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'single',
  `acquire_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `combo_tags` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: strategy_thresholds
CREATE TABLE `strategy_thresholds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `strategyName` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `primaryTarget` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `weakThreshold` int NOT NULL DEFAULT '15',
  `strongThreshold` int NOT NULL DEFAULT '30',
  `priority` int NOT NULL DEFAULT '99',
  `enabled` tinyint NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `strategyName` (`strategyName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: subscription_logs
CREATE TABLE `subscription_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `operatorId` int NOT NULL,
  `targetUserId` int NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=630001;

-- Table: system_settings
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settingKey` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `settingValue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `settingKey` (`settingKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- Table: team_messages
CREATE TABLE `team_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` enum('user_to_team','team_to_user') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user_to_team',
  `isRead` tinyint NOT NULL DEFAULT '0',
  `readAt` timestamp NULL DEFAULT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;

-- Table: token_access_logs
CREATE TABLE `token_access_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token_id` int NOT NULL,
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '/ai-view',
  `accessed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_token_id` (`token_id`),
  KEY `idx_accessed_at` (`accessed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- Table: user_achievements
CREATE TABLE `user_achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `achievement_id` int NOT NULL,
  `unlocked_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `is_equipped` tinyint DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_diet_preferences
CREATE TABLE `user_diet_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `healthTags` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '[]',
  `budgetPreference` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'mid',
  `dislikedElements` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '[]',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- Table: user_group_members
CREATE TABLE `user_group_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `groupId` int NOT NULL,
  `userId` int NOT NULL,
  `note` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `addedBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `group_user_idx` (`groupId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=180001;

-- Table: user_groups
CREATE TABLE `user_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'amber',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '👥',
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- Table: user_notifications
CREATE TABLE `user_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('wbc_result','system','reward','announcement','daily_briefing','fortune_reminder','scratch_milestone','booking_update') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `linkUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isRead` tinyint NOT NULL DEFAULT '0',
  `relatedId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=660001;

-- Table: user_permissions
CREATE TABLE `user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `feature` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `expiresAt` timestamp NULL DEFAULT NULL,
  `note` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grantedBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `user_feature_idx` (`userId`,`feature`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=360001;

-- Table: user_profiles
CREATE TABLE `user_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `displayName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthPlace` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthDate` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthTime` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthHour` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `yearPillar` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monthPillar` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dayPillar` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hourPillar` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dayMasterElement` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favorableElements` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unfavorableElements` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `occupation` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `birthLunar` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lifePathNumber` int DEFAULT NULL,
  `natalWood` int DEFAULT NULL,
  `natalFire` int DEFAULT NULL,
  `natalEarth` int DEFAULT NULL,
  `natalMetal` int DEFAULT NULL,
  `natalWater` int DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `user_profiles_userId_unique` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=1050001;

-- Table: user_subscriptions
CREATE TABLE `user_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `planId` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `planExpiresAt` timestamp NULL DEFAULT NULL,
  `customModules` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `user_subscriptions_userId_unique` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=660001;

-- Table: users
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(320) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loginMethod` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('user','expert','admin','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `planId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'basic',
  `planExpiresAt` timestamp NULL DEFAULT NULL,
  `pointsBalance` int NOT NULL DEFAULT '0',
  `availableDiscounts` json DEFAULT NULL,
  `lastDailyCheckIn` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signinStreak` int NOT NULL DEFAULT '0',
  `gameCoins` int NOT NULL DEFAULT '0',
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gameStones` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=9480001;

-- Table: wardrobe_items
CREATE TABLE `wardrobe_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upper',
  `color` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `wuxing` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occasion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imageUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `aiAnalysis` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auraBoost` int DEFAULT '0',
  `fromPhoto` int DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=210001;

-- Table: wbc_bets
CREATE TABLE `wbc_bets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `matchId` int NOT NULL,
  `betType` enum('winlose','spread','combo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'winlose',
  `betOn` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `appliedRate` decimal(5,2) NOT NULL,
  `potentialWin` int NOT NULL,
  `status` enum('placed','won','lost','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'placed',
  `actualWin` int NOT NULL DEFAULT '0',
  `comboMatchIds` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=120001;

-- Table: wbc_matches
CREATE TABLE `wbc_matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teamA` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `teamB` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `teamAFlag` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '🏳️',
  `teamBFlag` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '🏳️',
  `matchTime` bigint NOT NULL,
  `venue` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `poolGroup` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `rateA` decimal(5,2) NOT NULL DEFAULT '1.90',
  `rateB` decimal(5,2) NOT NULL DEFAULT '1.90',
  `status` enum('pending','live','finished','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `winningTeam` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finalScore` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bettingDeadlineMinutes` int NOT NULL DEFAULT '30',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `aiRetryCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=90001;

-- Table: wealth_journal
CREATE TABLE `wealth_journal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `date` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lotteryScore` int NOT NULL DEFAULT '5',
  `tenGod` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `didBuyLottery` tinyint DEFAULT '0',
  `lotteryAmount` int DEFAULT '0',
  `lotteryResult` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `winAmount` int DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: weekly_champions
CREATE TABLE `weekly_champions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `week_key` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `champion_type` enum('level','combat') COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_id` int NOT NULL,
  `agent_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` int NOT NULL DEFAULT '0',
  `badge_granted` tinyint NOT NULL DEFAULT '0',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: world_events
CREATE TABLE `world_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_type` enum('weather_change','global_blessing','hidden_npc','hidden_quest','elemental_surge','meteor_shower','divine_arrival','ap_regen','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `affected_node_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `affected_element` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` bigint DEFAULT NULL,
  `meteor_active` tinyint NOT NULL DEFAULT '0',
  `blessing_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blessing_multiplier` int NOT NULL DEFAULT '150',
  `triggered_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=30001;
