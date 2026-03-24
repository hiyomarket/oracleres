INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_W021', '遠古參神', 'wood', 
  '26-50', 'boss',
  2000, 120, 80, 15, 
  80, 100,
  50, 15, 40, 
  25, 25, 20,
  'SK_M028', 'SK_M029', 'SK_M030',
  '', 3, 1.15,
  'I_W021', 30.0, '{"min": 2000, "max": 5000}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_W022', '瘟疫古樹', 'wood', 
  '26-50', 'boss',
  3500, 150, 60, 10, 
  90, 130,
  60, 0, 35, 
  20, 30, 20,
  'SK_M031', 'SK_M032', 'SK_M033',
  '', 3, 1.15,
  'I_W022', 30.0, '{"min": 3000, "max": 7000}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_W023', '風暴古木', 'wood', 
  '26-50', 'boss',
  4500, 180, 100, 20, 
  100, 160,
  55, 20, 40, 
  30, 20, 20,
  'SK_M034', 'SK_M035', 'SK_M036',
  '', 3, 1.15,
  'I_W023', 30.0, '{"min": 5000, "max": 10000}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_W024', '蟲族母巢', 'wood', 
  '26-50', 'boss',
  6000, 200, 120, 5, 
  110, 180,
  65, 5, 45, 
  25, 25, 20,
  'SK_M037', 'SK_M038', 'SK_M039',
  '', 3, 1.2,
  'I_W024', 30.0, '{"min": 8000, "max": 15000}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_W025', '世界Boss・神木守護者', 'wood', 
  '51-60', 'legendary',
  50000, 500, 300, 30, 
  250, 450,
  70, 10, 60, 
  40, 40, 20,
  'SK_M040', 'SK_M041', 'SK_M042',
  '', 1, 1.2,
  'I_W025', 100.0, '{"min": 50000, "max": 100000}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_F001', '烈焰蜥', 'fire', 
  '1-10', 'common',
  110, 20, 8, 22, 
  22, 15,
  15, 30, 25, 
  10, 5, 20,
  '', '', '',
  '', 1, 1.0,
  'I_F001', 18.0, '{"min": 80, "max": 150}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_F002', '灰燼史萊姆', 'fire', 
  '1-10', 'common',
  130, 10, 12, 8, 
  10, 20,
  10, 35, 15, 
  15, 5, 20,
  '', '', '',
  '', 1, 1.0,
  'I_F002', 22.0, '{"min": 60, "max": 120}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_F003', '灼熱蜜蜂', 'fire', 
  '1-10', 'common',
  80, 22, 5, 38, 
  28, 10,
  15, 25, 20, 
  10, 5, 20,
  '', '', '',
  '', 1, 1.05,
  'I_F003', 15.0, '{"min": 90, "max": 170}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_F004', '熔岩蛙', 'fire', 
  '1-10', 'common',
  140, 18, 15, 12, 
  18, 20,
  10, 35, 20, 
  10, 0, 20,
  '', '', '',
  '', 1, 1.0,
  'I_F004', 18.0, '{"min": 100, "max": 200}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);
INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_F005', '火鼠', 'fire', 
  '1-10', 'common',
  75, 16, 6, 30, 
  20, 8,
  15, 25, 15, 
  10, 5, 20,
  '', '', '',
  '', 1, 1.0,
  'I_F005', 20.0, '{"min": 55, "max": 110}',
  1774380241919
) ON DUPLICATE KEY UPDATE 
  name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
  base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
  base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
  resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
  resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
  resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
  skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3),
  ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate),
  drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1),
  drop_gold=VALUES(drop_gold);