-- Data for modules (13 rows)
INSERT INTO `modules` (`id`, `name`, `description`, `icon`, `category`, `sortOrder`, `containedFeatures`, `isActive`, `createdAt`, `updatedAt`, `navPath`, `isCentral`, `parentId`, `displayLocation`) VALUES
('module_calendar', '命理日曆', '個人化命理日曆，標示吉凶時辰', '📅', 'addon', 1, '["calendar"]', 1, '"2026-02-26T00:45:07.000Z"', '"2026-03-21T10:33:59.000Z"', '/calendar', 0, NULL, 'main'),
('module_casino', '天命娛樂城 (積分兌換)', 'WBC 競猜、遊戲點兌換', '🎲', 'core', 11, '[]', 0, '"2026-03-03T16:47:27.000Z"', '"2026-03-07T01:33:39.000Z"', '/casino', 0, NULL, 'profile'),
('module_diet', '飲食羅盤', '以今日五行能量為你量身打造飲食補運策略', '🍽️', 'addon', 7, '["warroom_dietary"]', 1, '"2026-02-26T04:14:02.000Z"', '"2026-02-26T18:12:46.000Z"', '/diet', 0, NULL, 'main'),
('module_divination', '天命問卜', NULL, '🌠', 'addon', 2, '["warroom_divination"]', 1, '"2026-02-26T03:08:32.000Z"', '"2026-02-26T18:12:46.000Z"', '/divination', 0, NULL, 'main'),
('module_lottery', '補運樂透', '結合八字能量的彩券號碼推薦系統', '🎰', 'addon', 8, '["lottery"]', 1, '"2026-02-26T00:45:07.000Z"', '"2026-02-26T04:41:21.000Z"', '/lottery', 0, NULL, 'main'),
('module_luck_cycle', '大限流年', NULL, '📅', 'addon', 10, '["profile"]', 1, '"2026-02-26T03:08:32.000Z"', '"2026-02-26T04:41:21.000Z"', '/luck-cycle', 0, NULL, 'main'),
('module_oracle', '擲筊問卦', '結合八字能量的智慧擲筊系統', '☯️', 'core', 4, '["oracle"]', 1, '"2026-02-26T00:45:06.000Z"', '"2026-03-02T21:50:58.000Z"', '/oracle', 0, NULL, 'main'),
('module_outfit', '神諭穿搭', '根據天命能量推薦手串穿搭', '📿', 'addon', 6, '["warroom_outfit"]', 1, '"2026-02-26T00:45:07.000Z"', '"2026-03-03T10:40:35.000Z"', '/outfit', 0, NULL, 'main'),
('module_profile', '命格解析', '個人八字命格分析、五行屬性、喜忌用神', '🔮', 'core', 3, '["profile"]', 1, '"2026-02-26T00:45:06.000Z"', '"2026-03-12T21:42:44.000Z"', '/profile', 0, NULL, 'main'),
('module_stats', '【統計】命理統計', '個人擲筊與選號歷史統計分析', '📈', 'addon', 13, '["stats"]', 0, '"2026-02-26T00:45:08.000Z"', '"2026-03-03T23:37:28.000Z"', '/stats', 0, NULL, 'profile'),
('module_warroom', '每日運勢', '每日天命共振分析、時辰能量、農曆日曆', '☀️', 'core', 5, '["warroom","warroom_divination"]', 1, '"2026-02-26T00:45:07.000Z"', '"2026-03-02T21:50:58.000Z"', '/', 1, NULL, 'main'),
('module_wealth', '財運羅盤', '財運方位與時辰分析', '💰', 'addon', 9, '["warroom_wealth"]', 1, '"2026-02-26T00:45:08.000Z"', '"2026-02-27T02:58:24.000Z"', '/wealth', 0, NULL, 'main'),
('module_weekly', '【週報】天命週報', '每週命理能量分析報告', '📊', 'addon', 12, '["weekly"]', 0, '"2026-02-26T00:45:08.000Z"', '"2026-03-03T23:37:26.000Z"', '/weekly', 0, NULL, 'profile');
