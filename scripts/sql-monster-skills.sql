DELETE FROM game_monster_skill_catalog;

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M001', '碎石拳', '土', 'attack', 'common', 85, 4, 0, 100, NULL, NULL, '以土石之力揮拳攻擊', 1, 1774772802521),
('SK_M002', '巨石投擲', '土', 'attack', 'rare', 100, 6, 0, 95, NULL, NULL, '投擲巨石造成物理傷害', 1, 1774772802521),
('SK_M003', '地裂衝擊', '土', 'attack', 'rare', 110, 8, 1, 90, '{"type":"stun","chance":20,"duration":1}', NULL, '震裂大地，有機率暈眩', 1, 1774772802521),
('SK_M004', '山崩地裂', '土', 'attack', 'epic', 130, 15, 3, 85, '{"type":"stun","chance":30,"duration":1}', '{"hp_threshold":0.6,"priority":"high"}', '引發山崩，高傷害附帶暈眩', 1, 1774772802521),
('SK_M005', '沙暴襲擊', '土', 'attack', 'common', 95, 6, 1, 80, '{"type":"accuracy_down","chance":40,"duration":2,"value":20}', NULL, '捲起沙暴降低敵方命中', 1, 1774772802521),
('SK_M006', '泥沼陷阱', '土', 'attack', 'common', 75, 5, 1, 100, '{"type":"slow","chance":50,"duration":2}', NULL, '製造泥沼減速敵人', 1, 1774772802521),
('SK_M007', '岩石碎擊', '土', 'attack', 'common', 90, 5, 0, 100, NULL, NULL, '以岩石碎片攻擊', 1, 1774772802521),
('SK_M008', '土石流', '土', 'attack', 'epic', 120, 12, 2, 85, '{"type":"stun","chance":25,"duration":1}', '{"hp_threshold":0.6,"priority":"high"}', '引發土石流衝擊', 1, 1774772802521),
('SK_M009', '地脈震動', '土', 'attack', 'rare', 105, 10, 2, 90, '{"type":"slow","chance":35,"duration":2}', NULL, '震動地脈造成傷害並減速', 1, 1774772802521),
('SK_M010', '黃沙吞噬', '土', 'attack', 'legendary', 140, 18, 3, 80, '{"type":"poison","chance":40,"duration":3}', '{"hp_threshold":0.6,"priority":"high"}', '黃沙吞噬敵人，附帶毒素', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M011', '土刺突襲', '土', 'attack', 'rare', 115, 10, 2, 95, NULL, NULL, '從地面突出土刺攻擊', 1, 1774772802521),
('SK_M012', '大地之怒', '土', 'attack', 'legendary', 150, 20, 4, 80, '{"type":"stun","chance":40,"duration":2}', '{"hp_threshold":0.6,"priority":"high"}', '大地之怒降臨，毀滅性打擊', 1, 1774772802521),
('SK_M013', '石化凝視', '土', 'debuff', 'rare', 0, 12, 3, 70, '{"type":"petrify","chance":60,"duration":2}', '{"hp_threshold":0.8,"priority":"medium"}', '石化凝視使敵人無法行動', 1, 1774772802521),
('SK_M014', '沙塵迷眼', '土', 'debuff', 'rare', 0, 8, 2, 85, '{"type":"accuracy_down","chance":80,"duration":2,"value":30}', '{"hp_threshold":0.8,"priority":"medium"}', '沙塵迷眼降低敵方命中率', 1, 1774772802521),
('SK_M015', '大地護甲', '土', 'support', 'rare', 0, 10, 3, 100, '{"type":"def_up","duration":3,"value":25}', '{"hp_threshold":0.5,"priority":"medium"}', '土石凝聚為護甲提升防禦', 1, 1774772802521),
('SK_M016', '岩壁守護', '土', 'support', 'rare', 0, 15, 4, 100, '{"type":"shield","duration":2,"value":30}', '{"hp_threshold":0.5,"priority":"medium"}', '召喚岩壁護盾吸收傷害', 1, 1774772802521),
('SK_M017', '大地回春', '土', 'heal', 'uncommon', 60, 10, 2, 100, '{"type":"heal","healType":"instant"}', '{"hp_threshold":0.4,"priority":"high"}', '大地之力治癒傷口', 1, 1774772802521),
('SK_M018', '土壤滋養', '土', 'heal', 'uncommon', 30, 8, 3, 100, '{"type":"heal","healType":"hot","duration":3}', '{"hp_threshold":0.4,"priority":"high"}', '土壤滋養持續回復生命', 1, 1774772802521),
('SK_M019', '磐石不動', '土', 'defense', 'uncommon', 0, 8, 3, 100, '{"type":"def_up","duration":2,"value":40}', '{"hp_threshold":0.3,"priority":"high"}', '化身磐石大幅提升防禦', 1, 1774772802521),
('SK_M020', '厚土祝福', '土', 'buff', 'rare', 0, 12, 4, 100, '{"type":"atk_up","duration":3,"value":20}', '{"hp_threshold":0.7,"priority":"medium"}', '大地祝福提升攻擊力', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M021', '藤鞭抽擊', '木', 'attack', 'common', 85, 4, 0, 100, NULL, NULL, '以藤蔓鞭打敵人', 1, 1774772802521),
('SK_M022', '荊棘射擊', '木', 'attack', 'rare', 100, 6, 0, 95, '{"type":"poison","chance":20,"duration":2}', NULL, '射出毒荊棘', 1, 1774772802521),
('SK_M023', '花粉爆發', '木', 'attack', 'common', 90, 6, 1, 85, '{"type":"sleep","chance":25,"duration":1}', NULL, '散發催眠花粉', 1, 1774772802521),
('SK_M024', '根系纏繞', '木', 'attack', 'common', 95, 7, 1, 90, '{"type":"slow","chance":40,"duration":2}', NULL, '根系纏繞減速敵人', 1, 1774772802521),
('SK_M025', '毒孢子雲', '木', 'attack', 'common', 80, 8, 2, 80, '{"type":"poison","chance":50,"duration":3}', NULL, '釋放毒孢子雲', 1, 1774772802521),
('SK_M026', '巨木撞擊', '木', 'attack', 'rare', 115, 10, 2, 90, NULL, NULL, '以巨木之力撞擊', 1, 1774772802521),
('SK_M027', '落葉飛刃', '木', 'attack', 'rare', 105, 8, 1, 95, NULL, NULL, '落葉化為飛刃攻擊', 1, 1774772802521),
('SK_M028', '森林怒吼', '木', 'attack', 'epic', 130, 15, 3, 85, '{"type":"poison","chance":35,"duration":3}', '{"hp_threshold":0.6,"priority":"high"}', '森林之怒降臨', 1, 1774772802521),
('SK_M029', '寄生種子', '木', 'attack', 'common', 70, 10, 2, 90, '{"type":"poison","chance":60,"duration":3}', NULL, '植入寄生種子持續吸取生命', 1, 1774772802521),
('SK_M030', '千年古木擊', '木', 'attack', 'legendary', 140, 18, 3, 80, '{"type":"stun","chance":30,"duration":1}', '{"hp_threshold":0.6,"priority":"high"}', '千年古木之力的毀滅打擊', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M031', '竹林亂舞', '木', 'attack', 'rare', 110, 10, 2, 90, NULL, NULL, '竹林之力亂舞攻擊', 1, 1774772802521),
('SK_M032', '世界樹之怒', '木', 'attack', 'legendary', 150, 20, 4, 80, '{"type":"poison","chance":50,"duration":3}', '{"hp_threshold":0.6,"priority":"high"}', '世界樹降怒，毀滅性毒素', 1, 1774772802521),
('SK_M033', '催眠花香', '木', 'debuff', 'rare', 0, 12, 3, 70, '{"type":"sleep","chance":60,"duration":2}', '{"hp_threshold":0.8,"priority":"medium"}', '散發催眠花香使敵人昏睡', 1, 1774772802521),
('SK_M034', '毒藤纏身', '木', 'debuff', 'rare', 0, 8, 2, 85, '{"type":"poison","chance":80,"duration":3}', '{"hp_threshold":0.8,"priority":"medium"}', '毒藤纏身持續造成毒傷', 1, 1774772802521),
('SK_M035', '光合作用', '木', 'support', 'rare', 0, 10, 3, 100, '{"type":"atk_up","duration":3,"value":20}', '{"hp_threshold":0.5,"priority":"medium"}', '光合作用提升攻擊力', 1, 1774772802521),
('SK_M036', '森林庇護', '木', 'support', 'rare', 0, 15, 4, 100, '{"type":"shield","duration":2,"value":25}', '{"hp_threshold":0.5,"priority":"medium"}', '森林之力形成護盾', 1, 1774772802521),
('SK_M037', '草木回春', '木', 'heal', 'uncommon', 65, 10, 2, 100, '{"type":"heal","healType":"instant"}', '{"hp_threshold":0.4,"priority":"high"}', '草木之力治癒傷口', 1, 1774772802521),
('SK_M038', '生命之泉', '木', 'heal', 'uncommon', 35, 8, 3, 100, '{"type":"heal","healType":"hot","duration":3}', '{"hp_threshold":0.4,"priority":"high"}', '生命之泉持續回復', 1, 1774772802521),
('SK_M039', '樹皮護體', '木', 'defense', 'uncommon', 0, 8, 3, 100, '{"type":"def_up","duration":2,"value":35}', '{"hp_threshold":0.3,"priority":"high"}', '樹皮覆蓋提升防禦', 1, 1774772802521),
('SK_M040', '春風化雨', '木', 'buff', 'rare', 0, 12, 4, 100, '{"type":"spd_up","duration":3,"value":20}', '{"hp_threshold":0.7,"priority":"medium"}', '春風加持提升速度', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M041', '水彈射擊', '水', 'attack', 'common', 85, 4, 0, 100, NULL, NULL, '射出水彈攻擊', 1, 1774772802521),
('SK_M042', '冰牙撕咬', '水', 'attack', 'rare', 100, 6, 0, 95, '{"type":"freeze","chance":15,"duration":1}', NULL, '冰冷的撕咬攻擊', 1, 1774772802521),
('SK_M043', '寒冰箭', '水', 'attack', 'rare', 110, 8, 1, 90, '{"type":"freeze","chance":25,"duration":1}', NULL, '射出寒冰箭', 1, 1774772802521),
('SK_M044', '海嘯衝擊', '水', 'attack', 'epic', 130, 15, 3, 85, '{"type":"slow","chance":40,"duration":2}', '{"hp_threshold":0.6,"priority":"high"}', '引發海嘯衝擊', 1, 1774772802521),
('SK_M045', '泡沫凍結', '水', 'attack', 'common', 90, 6, 1, 90, '{"type":"freeze","chance":30,"duration":1}', NULL, '泡沫凍結敵人', 1, 1774772802521),
('SK_M046', '深海漩渦', '水', 'attack', 'epic', 120, 12, 2, 85, '{"type":"slow","chance":50,"duration":2}', '{"hp_threshold":0.6,"priority":"high"}', '深海漩渦吞噬', 1, 1774772802521),
('SK_M047', '冰錐術', '水', 'attack', 'rare', 115, 10, 2, 90, '{"type":"freeze","chance":20,"duration":1}', NULL, '召喚冰錐攻擊', 1, 1774772802521),
('SK_M048', '暴風雪', '水', 'attack', 'legendary', 140, 18, 3, 80, '{"type":"freeze","chance":35,"duration":2}', '{"hp_threshold":0.6,"priority":"high"}', '引發暴風雪', 1, 1774772802521),
('SK_M049', '水流噴射', '水', 'attack', 'common', 95, 5, 0, 100, NULL, NULL, '高壓水流噴射', 1, 1774772802521),
('SK_M050', '極寒嚎叫', '水', 'attack', 'rare', 105, 10, 2, 85, '{"type":"freeze","chance":25,"duration":1}', NULL, '極寒之力嚎叫', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M051', '墨汁迷霧', '水', 'attack', 'common', 80, 8, 2, 80, '{"type":"accuracy_down","chance":50,"duration":2,"value":25}', NULL, '噴出墨汁迷霧', 1, 1774772802521),
('SK_M052', '深淵之怒', '水', 'attack', 'legendary', 150, 20, 4, 80, '{"type":"freeze","chance":40,"duration":2}', '{"hp_threshold":0.6,"priority":"high"}', '深淵之怒降臨，極致冰封', 1, 1774772802521),
('SK_M053', '冰封凝視', '水', 'debuff', 'rare', 0, 12, 3, 70, '{"type":"freeze","chance":60,"duration":2}', '{"hp_threshold":0.8,"priority":"medium"}', '冰封凝視使敵人凍結', 1, 1774772802521),
('SK_M054', '水霧迷惑', '水', 'debuff', 'rare', 0, 8, 2, 85, '{"type":"confusion","chance":50,"duration":2}', '{"hp_threshold":0.8,"priority":"medium"}', '水霧迷惑使敵人混亂', 1, 1774772802521),
('SK_M055', '潮汐之力', '水', 'support', 'rare', 0, 10, 3, 100, '{"type":"mtk_up","duration":3,"value":25}', '{"hp_threshold":0.5,"priority":"medium"}', '潮汐之力提升魔攻', 1, 1774772802521),
('SK_M056', '水幕護體', '水', 'support', 'rare', 0, 15, 4, 100, '{"type":"shield","duration":2,"value":30}', '{"hp_threshold":0.5,"priority":"medium"}', '水幕形成護盾', 1, 1774772802521),
('SK_M057', '清泉治癒', '水', 'heal', 'uncommon', 70, 10, 2, 100, '{"type":"heal","healType":"instant"}', '{"hp_threshold":0.4,"priority":"high"}', '清泉之力治癒傷口', 1, 1774772802521),
('SK_M058', '水之恩澤', '水', 'heal', 'uncommon', 35, 8, 3, 100, '{"type":"heal","healType":"hot","duration":3}', '{"hp_threshold":0.4,"priority":"high"}', '水之恩澤持續回復', 1, 1774772802521),
('SK_M059', '冰甲凝聚', '水', 'defense', 'uncommon', 0, 8, 3, 100, '{"type":"def_up","duration":2,"value":35}', '{"hp_threshold":0.3,"priority":"high"}', '冰甲凝聚提升防禦', 1, 1774772802521),
('SK_M060', '水流加速', '水', 'buff', 'rare', 0, 12, 4, 100, '{"type":"spd_up","duration":3,"value":25}', '{"hp_threshold":0.7,"priority":"medium"}', '水流加持提升速度', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M061', '火焰噴射', '火', 'attack', 'common', 85, 4, 0, 100, NULL, NULL, '噴射火焰攻擊', 1, 1774772802521),
('SK_M062', '烈焰撕咬', '火', 'attack', 'rare', 100, 6, 0, 95, '{"type":"burn","chance":20,"duration":2}', NULL, '烈焰撕咬附帶灼燒', 1, 1774772802521),
('SK_M063', '火球術', '火', 'attack', 'rare', 110, 8, 1, 90, '{"type":"burn","chance":30,"duration":2}', NULL, '發射火球攻擊', 1, 1774772802521),
('SK_M064', '熔岩爆發', '火', 'attack', 'epic', 130, 15, 3, 85, '{"type":"burn","chance":40,"duration":3}', '{"hp_threshold":0.6,"priority":"high"}', '引發熔岩爆發', 1, 1774772802521),
('SK_M065', '火星噴射', '火', 'attack', 'common', 90, 5, 0, 95, '{"type":"burn","chance":15,"duration":2}', NULL, '噴射火星', 1, 1774772802521),
('SK_M066', '爆炎衝擊', '火', 'attack', 'epic', 120, 12, 2, 85, '{"type":"burn","chance":35,"duration":2}', '{"hp_threshold":0.6,"priority":"high"}', '爆炎衝擊', 1, 1774772802521),
('SK_M067', '灼熱吐息', '火', 'attack', 'rare', 115, 10, 2, 90, '{"type":"burn","chance":25,"duration":2}', NULL, '灼熱吐息攻擊', 1, 1774772802521),
('SK_M068', '業火焚天', '火', 'attack', 'legendary', 140, 18, 3, 80, '{"type":"burn","chance":45,"duration":3}', '{"hp_threshold":0.6,"priority":"high"}', '業火焚天的毀滅攻擊', 1, 1774772802521),
('SK_M069', '火焰旋風', '火', 'attack', 'rare', 105, 8, 1, 90, '{"type":"burn","chance":20,"duration":2}', NULL, '火焰旋風席捲', 1, 1774772802521),
('SK_M070', '地獄烈焰', '火', 'attack', 'legendary', 150, 20, 4, 80, '{"type":"burn","chance":50,"duration":3}', '{"hp_threshold":0.6,"priority":"high"}', '地獄烈焰降臨，極致灼燒', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M071', '火山噴發', '火', 'attack', 'epic', 135, 16, 3, 85, '{"type":"burn","chance":35,"duration":3}', '{"hp_threshold":0.6,"priority":"high"}', '火山噴發造成大範圍灼燒', 1, 1774772802521),
('SK_M072', '赤焰拳', '火', 'attack', 'common', 95, 5, 0, 100, NULL, NULL, '燃燒的拳頭攻擊', 1, 1774772802521),
('SK_M073', '灼燒凝視', '火', 'debuff', 'rare', 0, 12, 3, 70, '{"type":"burn","chance":80,"duration":3}', '{"hp_threshold":0.8,"priority":"medium"}', '灼燒凝視使敵人持續燃燒', 1, 1774772802521),
('SK_M074', '煙霧迷障', '火', 'debuff', 'rare', 0, 8, 2, 85, '{"type":"accuracy_down","chance":70,"duration":2,"value":25}', '{"hp_threshold":0.8,"priority":"medium"}', '煙霧迷障降低敵方命中', 1, 1774772802521),
('SK_M075', '烈焰鼓舞', '火', 'support', 'rare', 0, 10, 3, 100, '{"type":"atk_up","duration":3,"value":25}', '{"hp_threshold":0.5,"priority":"medium"}', '烈焰鼓舞提升攻擊力', 1, 1774772802521),
('SK_M076', '火焰護盾', '火', 'support', 'rare', 0, 15, 4, 100, '{"type":"shield","duration":2,"value":25}', '{"hp_threshold":0.5,"priority":"medium"}', '火焰護盾吸收傷害', 1, 1774772802521),
('SK_M077', '鳳凰之淚', '火', 'heal', 'uncommon', 65, 10, 2, 100, '{"type":"heal","healType":"instant"}', '{"hp_threshold":0.4,"priority":"high"}', '鳳凰之淚治癒傷口', 1, 1774772802521),
('SK_M078', '溫泉療癒', '火', 'heal', 'uncommon', 30, 8, 3, 100, '{"type":"heal","healType":"hot","duration":3}', '{"hp_threshold":0.4,"priority":"high"}', '溫泉之力持續回復', 1, 1774772802521),
('SK_M079', '烈焰護體', '火', 'defense', 'uncommon', 0, 8, 3, 100, '{"type":"def_up","duration":2,"value":30}', '{"hp_threshold":0.3,"priority":"high"}', '烈焰護體提升防禦', 1, 1774772802521),
('SK_M080', '火焰之心', '火', 'buff', 'rare', 0, 12, 4, 100, '{"type":"atk_up","duration":3,"value":30}', '{"hp_threshold":0.7,"priority":"medium"}', '火焰之心大幅提升攻擊', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M081', '金屬啃咬', '金', 'attack', 'common', 85, 4, 0, 100, NULL, NULL, '金屬利齒啃咬', 1, 1774772802521),
('SK_M082', '金剛重擊', '金', 'attack', 'rare', 100, 6, 0, 95, NULL, NULL, '金剛之力重擊', 1, 1774772802521),
('SK_M083', '震盪波', '金', 'attack', 'rare', 110, 8, 1, 90, '{"type":"stun","chance":20,"duration":1}', NULL, '發出震盪波攻擊', 1, 1774772802521),
('SK_M084', '鋼鐵風暴', '金', 'attack', 'epic', 130, 15, 3, 85, '{"type":"stun","chance":30,"duration":1}', '{"hp_threshold":0.6,"priority":"high"}', '鋼鐵風暴席捲', 1, 1774772802521),
('SK_M085', '利刃斬擊', '金', 'attack', 'common', 95, 5, 0, 100, NULL, NULL, '鋒利刃斬擊', 1, 1774772802521),
('SK_M086', '金光閃爍', '金', 'attack', 'common', 90, 6, 1, 85, '{"type":"accuracy_down","chance":40,"duration":2,"value":20}', NULL, '金光閃爍迷惑敵人', 1, 1774772802521),
('SK_M087', '鐵壁衝撞', '金', 'attack', 'rare', 115, 10, 2, 90, NULL, NULL, '鐵壁衝撞造成重傷', 1, 1774772802521),
('SK_M088', '金屬風刃', '金', 'attack', 'rare', 105, 8, 1, 95, NULL, NULL, '金屬風刃切割', 1, 1774772802521),
('SK_M089', '白銀穿刺', '金', 'attack', 'epic', 120, 12, 2, 90, '{"type":"stun","chance":20,"duration":1}', '{"hp_threshold":0.6,"priority":"high"}', '白銀穿刺攻擊', 1, 1774772802521),
('SK_M090', '金剛破碎拳', '金', 'attack', 'legendary', 140, 18, 3, 80, '{"type":"stun","chance":35,"duration":1}', '{"hp_threshold":0.6,"priority":"high"}', '金剛破碎拳的毀滅打擊', 1, 1774772802521);

INSERT INTO game_monster_skill_catalog (monster_skill_id, name, wuxing, skill_type, rarity, power_percent, mp_cost, cooldown, accuracy_mod, additional_effect, ai_condition, description, is_active, created_at) VALUES
('SK_M091', '聖光斬', '金', 'attack', 'epic', 135, 16, 3, 85, NULL, '{"hp_threshold":0.6,"priority":"high"}', '聖光之力斬擊', 1, 1774772802521),
('SK_M092', '天罰之劍', '金', 'attack', 'legendary', 150, 20, 4, 80, '{"type":"stun","chance":40,"duration":2}', '{"hp_threshold":0.6,"priority":"high"}', '天罰之劍降臨，極致打擊', 1, 1774772802521),
('SK_M093', '金屬共鳴', '金', 'debuff', 'rare', 0, 12, 3, 70, '{"type":"stun","chance":60,"duration":2}', '{"hp_threshold":0.8,"priority":"medium"}', '金屬共鳴使敵人暈眩', 1, 1774772802521),
('SK_M094', '銀光刺眼', '金', 'debuff', 'rare', 0, 8, 2, 85, '{"type":"accuracy_down","chance":70,"duration":2,"value":30}', '{"hp_threshold":0.8,"priority":"medium"}', '銀光刺眼降低命中率', 1, 1774772802521),
('SK_M095', '金甲加持', '金', 'support', 'rare', 0, 10, 3, 100, '{"type":"def_up","duration":3,"value":30}', '{"hp_threshold":0.5,"priority":"medium"}', '金甲加持提升防禦', 1, 1774772802521),
('SK_M096', '金光護盾', '金', 'support', 'rare', 0, 15, 4, 100, '{"type":"shield","duration":2,"value":35}', '{"hp_threshold":0.5,"priority":"medium"}', '金光護盾吸收傷害', 1, 1774772802521),
('SK_M097', '自我修復', '金', 'heal', 'uncommon', 60, 10, 2, 100, '{"type":"heal","healType":"instant"}', '{"hp_threshold":0.4,"priority":"high"}', '金屬自我修復', 1, 1774772802521),
('SK_M098', '金屬再生', '金', 'heal', 'uncommon', 30, 8, 3, 100, '{"type":"heal","healType":"hot","duration":3}', '{"hp_threshold":0.4,"priority":"high"}', '金屬再生持續回復', 1, 1774772802521),
('SK_M099', '鐵壁防禦', '金', 'defense', 'uncommon', 0, 8, 3, 100, '{"type":"def_up","duration":2,"value":45}', '{"hp_threshold":0.3,"priority":"high"}', '鐵壁防禦大幅提升防禦', 1, 1774772802521),
('SK_M100', '金剛不壞', '金', 'buff', 'rare', 0, 12, 4, 100, '{"type":"def_up","duration":3,"value":25}', '{"hp_threshold":0.7,"priority":"medium"}', '金剛不壞提升全面防禦', 1, 1774772802521);