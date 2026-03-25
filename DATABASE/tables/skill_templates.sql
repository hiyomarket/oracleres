-- Data for skill_templates (10 rows)
INSERT INTO `skill_templates` (`id`, `name`, `element`, `category`, `rarity`, `tier`, `mp_cost`, `cooldown`, `effect_desc`, `effect_value`, `status_effect`, `status_chance`, `target_type`, `acquire_method`, `combo_tags`, `is_active`) VALUES
('S_Wd001', '木靈之擊', 'wood', 'active', 'basic', 0, 10, 0, '對單體造成 120% 木屬性傷害', 1.2, NULL, 0, 'single', 'shop', 'wood,attack', 1),
('S_Wd002', '藤蔓纏繞', 'wood', 'active', 'basic', 0, 15, 2, '對單體造成 100% 木屬性傷害並附加緩速（2回合）', 1, 'slow', 0.7, 'single', 'shop', 'wood,slow', 1),
('S_Wd003', '自然回復', 'wood', 'passive', 'basic', 0, 0, 0, '每回合回復最大HP的 3%', 0.03, NULL, 0, 'self', 'shop', 'wood,heal', 1),
('S_Wd004', '木盾護身', 'wood', 'passive', 'rare', 0, 0, 0, '受到攻擊時有 25% 機率減傷 30%', 0.3, NULL, 0.25, 'self', 'shop', 'wood,shield', 1),
('S_Wd005', '森林之怒', 'wood', 'active', 'rare', 0, 25, 3, '對全體敵人造成 80% 木屬性傷害', 0.8, NULL, 0, 'all', 'drop', 'wood,aoe', 1),
('S_Wd006', '採集加速', 'wood', 'life', 'basic', 0, 5, 0, '採集速度提升 20%，採集量 +1', 1.2, NULL, 0, 'self', 'shop', 'wood,life', 1),
('S_Wd007', '木工精通', 'wood', 'forge', 'basic', 0, 0, 0, '鍛造木製裝備時品質提升 15%', 1.15, NULL, 0, 'self', 'shop', 'wood,forge', 1),
('S_Wd008', '古木之魂', 'wood', 'active', 'epic', 0, 40, 4, '對單體造成 200% 木屬性傷害，附加流血（3回合）', 2, 'bleed', 0.9, 'single', 'quest', 'wood,bleed,strong', 1),
('S_Wd009', '生命之源', 'wood', 'passive', 'epic', 0, 0, 0, 'HP 低於 30% 時自動觸發，回復 40% 最大HP（每場戰鬥一次）', 0.4, NULL, 0, 'self', 'quest', 'wood,heal,emergency', 1),
('S_Wd010', '萬木共鳴', 'wood', 'active', 'legend', 0, 60, 5, '對全體敵人造成 150% 木屬性傷害，並為己方全體回復 20% HP', 1.5, NULL, 0, 'all', 'drop', 'wood,aoe,heal,legend', 1);
