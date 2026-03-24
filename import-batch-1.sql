INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_W011', '古木樹人', 'wood', 
  '11-25', 'elite',
  350, 35, 20, 8, 
  30, 25,
  40, 5, 35, 
  15, 20, 20,
  'SK_M012', 'SK_M013', '',
  '', 2, 1.05,
  'I_W011', 20.0, '{"min": 300, "max": 500}',
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
  'M_W012', '毒霧蘑菇精', 'wood', 
  '11-25', 'elite',
  300, 28, 18, 10, 
  25, 35,
  35, 5, 20, 
  20, 25, 20,
  'SK_M014', 'SK_M015', '',
  '', 2, 1.05,
  'I_W012', 25.0, '{"min": 280, "max": 450}',
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
  'M_W013', '巨型捕蠅草', 'wood', 
  '11-25', 'elite',
  320, 40, 15, 12, 
  28, 20,
  30, 10, 20, 
  15, 20, 20,
  'SK_M016', '', '',
  '', 2, 1.1,
  'I_W013', 15.0, '{"min": 350, "max": 550}',
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
  'M_W014', '荊棘野豬', 'wood', 
  '11-25', 'elite',
  280, 30, 35, 15, 
  25, 10,
  25, 15, 25, 
  20, 15, 20,
  'SK_M017', 'SK_M018', '',
  '', 2, 1.05,
  'I_W014', 15.0, '{"min": 320, "max": 500}',
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
  'M_W015', '幻影螳螂', 'wood', 
  '11-25', 'elite',
  200, 45, 10, 45, 
  35, 15,
  20, 20, 15, 
  20, 20, 20,
  'SK_M019', 'SK_M020', '',
  '', 2, 1.1,
  'I_W015', 12.0, '{"min": 380, "max": 600}',
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
  'M_W016', '腐毒沼澤怪', 'wood', 
  '11-25', 'elite',
  400, 25, 25, 5, 
  20, 30,
  35, 5, 30, 
  15, 25, 20,
  'SK_M021', '', '',
  '', 2, 1.05,
  'I_W016', 20.0, '{"min": 400, "max": 650}',
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
  'M_W017', '狂暴森猿', 'wood', 
  '11-25', 'elite',
  380, 42, 20, 20, 
  30, 15,
  25, 15, 20, 
  15, 15, 20,
  'SK_M022', '', '',
  '', 2, 1.05,
  'I_W017', 15.0, '{"min": 360, "max": 580}',
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
  'M_W018', '劇毒蜈蚣', 'wood', 
  '11-25', 'elite',
  250, 50, 12, 30, 
  40, 20,
  15, 25, 20, 
  20, 10, 20,
  'SK_M023', 'SK_M024', '',
  '', 2, 1.1,
  'I_W018', 15.0, '{"min": 450, "max": 700}',
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
  'M_W019', '寄生藤蔓', 'wood', 
  '11-25', 'elite',
  220, 35, 15, 25, 
  28, 30,
  40, 5, 25, 
  15, 20, 20,
  'SK_M025', '', '',
  '', 2, 1.05,
  'I_W019', 20.0, '{"min": 420, "max": 680}',
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
  'M_W020', '千年木靈王', 'wood', 
  '11-25', 'elite',
  500, 40, 35, 8, 
  25, 40,
  50, 0, 30, 
  15, 20, 20,
  'SK_M026', 'SK_M027', '',
  '', 2, 1.1,
  'I_W020', 10.0, '{"min": 500, "max": 800}',
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