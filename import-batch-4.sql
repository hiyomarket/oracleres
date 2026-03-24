INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_F016', '熔岩龜', 'fire', 
  '11-25', 'elite',
  480, 22, 40, 5, 
  18, 25,
  5, 55, 28, 
  5, 0, 20,
  '', '', '',
  '', 2, 1.05,
  'I_F016', 20.0, '{"min": 380, "max": 600}',
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
  'M_F017', '烈焰蝙蝠群', 'fire', 
  '11-25', 'elite',
  180, 30, 8, 40, 
  30, 20,
  12, 38, 15, 
  15, 0, 20,
  '', '', '',
  '', 2, 1.05,
  'I_F017', 22.0, '{"min": 290, "max": 460}',
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
  'M_F018', '火山口龍', 'fire', 
  '11-25', 'elite',
  380, 55, 22, 25, 
  40, 35,
  10, 50, 20, 
  10, 0, 20,
  '', '', '',
  '', 2, 1.1,
  'I_F018', 12.0, '{"min": 480, "max": 780}',
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
  'M_F019', '火山毒蜂后', 'fire', 
  '11-25', 'elite',
  320, 58, 12, 30, 
  42, 25,
  15, 45, 15, 
  10, 0, 20,
  '', '', '',
  '', 2, 1.05,
  'I_F019', 10.0, '{"min": 500, "max": 800}',
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
  'M_F020', '焰凰', 'fire', 
  '11-25', 'elite',
  280, 52, 15, 45, 
  42, 48,
  20, 60, 10, 
  15, 0, 20,
  '', '', '',
  '', 2, 1.15,
  'I_F020', 8.0, '{"min": 600, "max": 950}',
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
  'M_F021', '熔岩領主', 'fire', 
  '26-50', 'boss',
  2200, 140, 85, 18, 
  90, 120,
  15, 65, 30, 
  15, 0, 20,
  '', '', '',
  '', 3, 1.15,
  'I_F021', 30.0, '{"min": 2500, "max": 5500}',
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
  'M_F022', '炎龍', 'fire', 
  '26-50', 'boss',
  4000, 220, 100, 35, 
  130, 180,
  20, 70, 25, 
  20, 0, 20,
  '', '', '',
  '', 3, 1.15,
  'I_F022', 30.0, '{"min": 8000, "max": 15000}',
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
  'M_F023', '焰鳳凰', 'fire', 
  '26-50', 'boss',
  5500, 280, 110, 50, 
  150, 250,
  30, 75, 20, 
  25, 0, 20,
  '', '', '',
  '', 3, 1.2,
  'I_F023', 30.0, '{"min": 15000, "max": 25000}',
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
  'M_F024', '世界Boss・炎之滅世龍', 'fire', 
  '51-60', 'legendary',
  60000, 650, 350, 50, 
  300, 550,
  35, 80, 45, 
  30, 10, 20,
  '', '', '',
  '', 5, 1.2,
  'I_F024', 100.0, '{"min": 80000, "max": 150000}',
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
  'M_E001', '岩蜥', 'earth', 
  '1-10', 'common',
  130, 16, 18, 10, 
  18, 8,
  15, 15, 35, 
  10, 10, 20,
  '', '', '',
  '', 1, 1.0,
  'I_E001', 18.0, '{"min": 80, "max": 150}',
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