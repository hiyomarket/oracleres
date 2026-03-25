-- Data for campaigns (2 rows)
INSERT INTO `campaigns` (`id`, `name`, `startDate`, `endDate`, `isActive`, `ruleType`, `ruleTarget`, `ruleValue`, `createdAt`, `updatedAt`, `isDefaultOnboarding`) VALUES
(1, '系統啟用測試(完整版體驗)', '"2026-02-27T05:00:00.000Z"', '"2026-04-30T04:00:00.000Z"', 0, 'plan_assign', '{"target_type":"all_users"}', '{"duration_days":7,"plan_id":"2026_TEST1"}', '"2026-02-27T18:15:12.000Z"', '"2026-03-07T23:58:44.000Z"', 0),
(30001, '系統試營運-3天體驗活動', '"2026-03-01T05:00:00.000Z"', '"2026-03-31T04:00:00.000Z"', 1, 'plan_assign', '{"target_type":"all_users"}', '{"duration_days":3,"plan_id":"2026_TEST1"}', '"2026-03-07T23:58:40.000Z"', '"2026-03-07T23:58:46.000Z"', 1);
