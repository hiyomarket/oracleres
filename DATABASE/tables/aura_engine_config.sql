-- Data for aura_engine_config (15 rows)
INSERT INTO `aura_engine_config` (`id`, `category`, `configKey`, `configValue`, `label`, `description`, `valueType`, `minValue`, `maxValue`, `step`, `updatedAt`) VALUES
(1, 'category_weights', 'upper', '3.5', '上衣權重', '上衣對 Aura Score 的加分權重（最顯眼，加分最多）', 'number', '0.00', '10.00', '0.50', '"2026-02-27T11:19:09.000Z"'),
(2, 'category_weights', 'outer', '4', '外套權重', '外套/大衣對 Aura Score 的加分權重', 'number', '0.00', '10.00', '0.50', '"2026-02-26T22:00:42.000Z"'),
(3, 'category_weights', 'lower', '3', '下身權重', '褲子/裙子對 Aura Score 的加分權重', 'number', '0.00', '10.00', '0.50', '"2026-02-28T11:08:59.000Z"'),
(4, 'category_weights', 'shoes', '2', '鞋子權重', '鞋子對 Aura Score 的加分權重', 'number', '0.00', '10.00', '0.50', '"2026-02-26T22:00:42.000Z"'),
(5, 'category_weights', 'accessory', '2', '配件權重', '配件（帽子/包包等）對 Aura Score 的加分權重', 'number', '0.00', '10.00', '0.50', '"2026-02-26T22:00:42.000Z"'),
(6, 'category_weights', 'bracelet', '3', '手串權重', '手串對 Aura Score 的加分權重', 'number', '0.00', '10.00', '0.50', '"2026-02-26T22:00:42.000Z"'),
(7, 'boost_ratios', 'direct_match', '1.0', '直接補益比例', '穿搭顏色直接對應喜用神時的加分比例（1.0 = 100%）', 'number', '0.10', '2.00', '0.10', '"2026-02-26T22:00:42.000Z"'),
(8, 'boost_ratios', 'generates_match', '0.5', '相生補益比例', '穿搭顏色相生喜用神時的加分比例（0.7 = 70%）', 'number', '0.10', '1.50', '0.10', '"2026-02-28T11:08:38.000Z"'),
(9, 'boost_ratios', 'controls_match', '0.5', '制衡加成比例', '穿搭顏色剋制今日過強五行時的加分比例（0.5 = 50%）', 'number', '0.00', '1.50', '0.10', '"2026-02-26T22:00:42.000Z"'),
(10, 'score_limits', 'boost_cap', '20', '穿搭加成上限', '外在穿搭加成（Outfit Boost）的最高分數', 'number', '5.00', '40.00', '1.00', '"2026-02-26T22:00:42.000Z"'),
(11, 'score_limits', 'innate_min', '30', '天命底盤最低分', '內在天命底盤（Innate Aura）的最低分數', 'number', '0.00', '50.00', '1.00', '"2026-02-26T22:00:42.000Z"'),
(12, 'score_limits', 'innate_max', '80', '天命底盤最高分', '內在天命底盤（Innate Aura）的最高分數', 'number', '50.00', '100.00', '1.00', '"2026-02-26T22:01:42.000Z"'),
(13, 'innate_weights', 'natal_weight', '30', '本命五行權重', '本命五行對天命底盤的貢獻比例（%）', 'number', '0.00', '100.00', '5.00', '"2026-02-26T22:00:42.000Z"'),
(14, 'innate_weights', 'time_weight', '60', '時間五行權重', '今日干支五行對天命底盤的貢獻比例（%）', 'number', '0.00', '100.00', '5.00', '"2026-02-26T22:02:07.000Z"'),
(15, 'innate_weights', 'weather_weight', '10', '天氣五行權重', '天氣五行調候對天命底盤的貢獻比例（%）', 'number', '0.00', '100.00', '5.00', '"2026-02-27T02:11:01.000Z"');
