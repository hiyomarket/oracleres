INSERT INTO game_monster_catalog 
(monster_id, name, wuxing, level_range, rarity, 
 base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
 resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
 skill_id_1, skill_id_2, skill_id_3, race, ai_level, growth_rate,
 drop_item_1, drop_rate_1, drop_gold, created_at)
VALUES (
  'M_M010', '釘耙貓', 'metal', 
  '1-10', 'common',
  105, 20, 10, 28, 
  22, 12,
  10, 8, 8, 
  30, 15, 20,
  'SK_M010', '', '',
  '', 1, 1.0,
  'I_M010', 15.0, '{"min": 128, "max": 240}',
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
  'M_M011', '青銅戰士', 'metal', 
  '11-25', 'elite',
  320, 38, 35, 10, 
  32, 15,
  10, 10, 12, 
  48, 15, 20,
  'SK_M011', 'SK_M012', '',
  '', 2, 1.05,
  'I_M011', 20.0, '{"min": 350, "max": 560}',
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
  'M_M012', '齒輪領主', 'metal', 
  '11-25', 'elite',
  280, 42, 18, 28, 
  38, 25,
  8, 8, 10, 
  52, 12, 20,
  'SK_M013', 'SK_M014', '',
  '', 2, 1.05,
  'I_M012', 18.0, '{"min": 390, "max": 620}',
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
  'M_M013', '鋼鐵蜥蜴', 'metal', 
  '11-25', 'elite',
  360, 45, 25, 20, 
  35, 18,
  10, 8, 12, 
  50, 12, 20,
  'SK_M015', 'SK_M016', '',
  '', 2, 1.1,
  'I_M013', 15.0, '{"min": 410, "max": 655}',
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
  'M_M014', '銀幣元素', 'metal', 
  '11-25', 'elite',
  240, 35, 12, 38, 
  35, 40,
  10, 8, 10, 
  48, 15, 20,
  'SK_M017', 'SK_M018', '',
  '', 2, 1.05,
  'I_M014', 18.0, '{"min": 420, "max": 670}',
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
  'M_M015', '金屬巨蠍', 'metal', 
  '11-25', 'elite',
  340, 50, 28, 25, 
  40, 20,
  8, 8, 12, 
  52, 12, 20,
  'SK_M019', 'SK_M020', '',
  '', 2, 1.1,
  'I_M015', 15.0, '{"min": 460, "max": 735}',
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
  'M_M016', '齒輪守護者', 'metal', 
  '11-25', 'elite',
  400, 38, 42, 8, 
  30, 22,
  8, 6, 10, 
  55, 12, 20,
  'SK_M021', 'SK_M022', '',
  '', 2, 1.05,
  'I_M016', 18.0, '{"min": 440, "max": 700}',
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
  'M_M017', '青銅龍', 'metal', 
  '11-25', 'elite',
  380, 52, 22, 30, 
  42, 28,
  10, 12, 12, 
  50, 12, 20,
  'SK_M023', 'SK_M024', '',
  '', 2, 1.1,
  'I_M017', 12.0, '{"min": 500, "max": 800}',
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
  'M_M018', '白銀刺客', 'metal', 
  '11-25', 'elite',
  250, 58, 10, 48, 
  48, 20,
  10, 8, 8, 
  45, 15, 20,
  'SK_M025', 'SK_M026', '',
  '', 2, 1.1,
  'I_M018', 10.0, '{"min": 480, "max": 770}',
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
  'M_M019', '煉金術士亡靈', 'metal', 
  '11-25', 'elite',
  300, 35, 15, 25, 
  35, 50,
  12, 10, 12, 
  48, 15, 20,
  'SK_M027', 'SK_M028', '',
  '', 2, 1.05,
  'I_M019', 8.0, '{"min": 520, "max": 830}',
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