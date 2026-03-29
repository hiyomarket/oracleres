/**
 * 遷移腳本：將 game_quest_skill_catalog (74) + game_monster_skill_catalog (100) 
 * 合併到 game_unified_skill_catalog
 * 
 * 策略：
 * 1. 讀取 74 個天命技能，解析 JSON 欄位填入獨立欄位
 * 2. 讀取 100 個魔物技能，解析 JSON 欄位填入獨立欄位
 * 3. 去重（如果魔物技能和天命技能有同名的，以天命技能為主）
 * 4. 插入統一表
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

try {
  // 1. 讀取天命技能 (74)
  const [questSkills] = await conn.execute('SELECT * FROM game_quest_skill_catalog');
  console.log(`讀取天命技能: ${questSkills.length} 筆`);

  // 2. 讀取魔物技能 (100)
  const [monsterSkills] = await conn.execute('SELECT * FROM game_monster_skill_catalog');
  console.log(`讀取魔物技能: ${monsterSkills.length} 筆`);

  const now = Date.now();
  const inserts = [];

  // 解析天命技能
  for (const qs of questSkills) {
    const ae = typeof qs.additional_effect === 'string' ? JSON.parse(qs.additional_effect) : (qs.additional_effect || {});
    const sm = typeof qs.special_mechanic === 'string' ? JSON.parse(qs.special_mechanic) : (qs.special_mechanic || {});

    inserts.push({
      code: qs.code,
      name: qs.name,
      questTitle: qs.quest_title || null,
      category: qs.category,
      skillType: qs.skill_type,
      description: qs.description || null,
      wuxing: qs.wuxing || '無',
      powerPercent: qs.power_percent || 100,
      mpCost: qs.mp_cost || 0,
      cooldown: qs.cooldown || 0,
      maxLevel: qs.max_level || 10,
      levelUpBonus: qs.level_up_bonus || 10,
      accuracyMod: sm.accuracyMod || 100,
      targetType: qs.target_type || sm.aoe || 'single',
      scaleStat: qs.scale_stat || 'atk',
      usableByPlayer: qs.player_learnable ?? 1,
      usableByPet: qs.pet_learnable ?? 1,
      usableByMonster: 1, // 天命技能也可給魔物用
      // 狀態異常
      statusEffectType: ae.type || 'none',
      statusEffectChance: ae.chance || 0,
      statusEffectDuration: ae.duration || 0,
      statusEffectValue: ae.value || 0,
      // 連擊
      hitCountMin: Array.isArray(sm.hitCount) ? sm.hitCount[0] : 1,
      hitCountMax: Array.isArray(sm.hitCount) ? sm.hitCount[1] : 1,
      multiTargetHit: sm.multiTargetHit ? 1 : 0,
      // 吸血/自傷
      lifestealPercent: sm.lifesteal || 0,
      selfDamagePercent: sm.selfDamagePercent || 0,
      ignoreDefPercent: sm.ignoreDefPercent || 0,
      // 先制
      isPriority: sm.priority ? 1 : 0,
      // 治療
      healType: sm.healType || 'none',
      hotDuration: sm.hotDuration || 0,
      mpRestorePercent: sm.mpRestorePercent || 0,
      cleanseCount: sm.cleanseCount || 0,
      // buff
      buffStat: sm.buff?.stat || 'none',
      buffPercent: sm.buff?.percent || 0,
      buffDuration: sm.buff?.duration || 0,
      // 護盾
      shieldType: sm.shield?.type || 'none',
      shieldCharges: sm.shield?.charges || 0,
      shieldDuration: sm.shield?.duration || 0,
      shieldAbsorbPercent: sm.shield?.absorbPercent || 0,
      // 吸收
      absorbType: sm.absorb?.type || 'none',
      absorbPercent: sm.absorb?.percent || 0,
      absorbDuration: sm.absorb?.duration || 0,
      // 嘲諷
      tauntDuration: sm.taunt?.duration || 0,
      // 被動
      isPassive: sm.isPassive ? 1 : 0,
      passiveType: sm.passiveType || 'none',
      passiveTriggerChance: sm.passiveTriggerChance || 0,
      passiveChancePerLevel: sm.passiveChancePerLevel || 0,
      guardDamageReduction: sm.guardDamageReduction || 0,
      lowHpThreshold: sm.lowHpThreshold || 0,
      lowHpBoostPercent: sm.lowHpBoostPercent || 0,
      resistType: sm.resistType || 'none',
      resistChancePerLevel: sm.resistChancePerLevel || 0,
      // 特殊
      hasInstantKill: sm.instantKill ? 1 : 0,
      instantKillChance: sm.instantKillChance || 0,
      hasSteal: sm.steal ? 1 : 0,
      stealChance: sm.stealChance || 0,
      hasSealWuxing: sm.sealWuxing ? 1 : 0,
      sealDuration: sm.sealDuration || 0,
      // 防禦觸發
      onDefendTrigger: sm.onDefend ? 1 : 0,
      defendHealPercent: sm.defendHealPercent || 0,
      defendMpPercent: sm.defendMpPercent || 0,
      // AI
      aiHpBelow: 0,
      aiPriority: 5,
      aiTargetElement: '',
      // 學習
      rarity: qs.rarity || 'rare',
      learnCost: qs.learn_cost ? JSON.stringify(qs.learn_cost) : null,
      prerequisites: qs.prerequisites ? JSON.stringify(qs.prerequisites) : null,
      prerequisiteLevel: qs.prerequisite_level || null,
      npcId: qs.npc_id || null,
      // 保留 JSON
      additionalEffect: qs.additional_effect ? JSON.stringify(qs.additional_effect) : null,
      specialMechanic: qs.special_mechanic ? JSON.stringify(qs.special_mechanic) : null,
      iconUrl: qs.icon_url || null,
      sortOrder: qs.sort_order || 0,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
      source: 'quest', // 標記來源
      oldId: qs.id, // 保留舊 ID 用於映射
    });
  }

  // 解析魔物技能
  const questSkillNames = new Set(questSkills.map(s => s.name));
  let skippedDuplicates = 0;

  for (const ms of monsterSkills) {
    // 如果魔物技能和天命技能同名，跳過（以天命技能為主）
    if (questSkillNames.has(ms.name)) {
      skippedDuplicates++;
      continue;
    }

    const ae = typeof ms.additional_effect === 'string' ? JSON.parse(ms.additional_effect) : (ms.additional_effect || {});
    const sm = typeof ms.special_mechanic === 'string' ? JSON.parse(ms.special_mechanic) : (ms.special_mechanic || {});
    const aiCond = typeof ms.ai_condition === 'string' ? JSON.parse(ms.ai_condition) : (ms.ai_condition || {});

    inserts.push({
      code: ms.skill_id || `MK${ms.id.toString().padStart(3, '0')}`,
      name: ms.name,
      questTitle: null,
      category: ms.category || 'physical',
      skillType: ms.skill_type || 'attack',
      description: ms.description || null,
      wuxing: ms.wuxing || '無',
      powerPercent: ms.power_percent || 100,
      mpCost: ms.mp_cost || 0,
      cooldown: ms.cooldown || 0,
      maxLevel: ms.max_level || 10,
      levelUpBonus: ms.level_up_bonus || 10,
      accuracyMod: sm.accuracyMod || 100,
      targetType: ms.target_type || sm.aoe || 'single',
      scaleStat: ms.scale_stat || 'atk',
      usableByPlayer: 0, // 魔物技能預設人物不可用
      usableByPet: 0,     // 魔物技能預設寵物不可用
      usableByMonster: 1,
      // 狀態異常
      statusEffectType: ae.type || 'none',
      statusEffectChance: ae.chance || 0,
      statusEffectDuration: ae.duration || 0,
      statusEffectValue: ae.value || 0,
      // 連擊
      hitCountMin: Array.isArray(sm.hitCount) ? sm.hitCount[0] : 1,
      hitCountMax: Array.isArray(sm.hitCount) ? sm.hitCount[1] : 1,
      multiTargetHit: sm.multiTargetHit ? 1 : 0,
      // 吸血/自傷
      lifestealPercent: sm.lifesteal || 0,
      selfDamagePercent: sm.selfDamagePercent || 0,
      ignoreDefPercent: sm.ignoreDefPercent || 0,
      // 先制
      isPriority: sm.priority ? 1 : 0,
      // 治療
      healType: sm.healType || 'none',
      hotDuration: sm.hotDuration || 0,
      mpRestorePercent: sm.mpRestorePercent || 0,
      cleanseCount: sm.cleanseCount || 0,
      // buff
      buffStat: sm.buff?.stat || 'none',
      buffPercent: sm.buff?.percent || 0,
      buffDuration: sm.buff?.duration || 0,
      // 護盾
      shieldType: sm.shield?.type || 'none',
      shieldCharges: sm.shield?.charges || 0,
      shieldDuration: sm.shield?.duration || 0,
      shieldAbsorbPercent: sm.shield?.absorbPercent || 0,
      // 吸收
      absorbType: sm.absorb?.type || 'none',
      absorbPercent: sm.absorb?.percent || 0,
      absorbDuration: sm.absorb?.duration || 0,
      // 嘲諷
      tauntDuration: sm.taunt?.duration || 0,
      // 被動
      isPassive: sm.isPassive ? 1 : 0,
      passiveType: sm.passiveType || 'none',
      passiveTriggerChance: sm.passiveTriggerChance || 0,
      passiveChancePerLevel: sm.passiveChancePerLevel || 0,
      guardDamageReduction: sm.guardDamageReduction || 0,
      lowHpThreshold: sm.lowHpThreshold || 0,
      lowHpBoostPercent: sm.lowHpBoostPercent || 0,
      resistType: sm.resistType || 'none',
      resistChancePerLevel: sm.resistChancePerLevel || 0,
      // 特殊
      hasInstantKill: 0,
      instantKillChance: 0,
      hasSteal: 0,
      stealChance: 0,
      hasSealWuxing: 0,
      sealDuration: 0,
      // 防禦觸發
      onDefendTrigger: 0,
      defendHealPercent: 0,
      defendMpPercent: 0,
      // AI
      aiHpBelow: aiCond.hpBelow || 0,
      aiPriority: typeof aiCond.priority === 'string' ? ({ low: 1, medium: 3, normal: 5, high: 7, critical: 9 }[aiCond.priority] || 5) : (aiCond.priority || 5),
      aiTargetElement: aiCond.targetElement || '',
      // 學習
      rarity: ms.rarity || 'common',
      learnCost: null,
      prerequisites: null,
      prerequisiteLevel: null,
      npcId: null,
      // 保留 JSON
      additionalEffect: ms.additional_effect ? JSON.stringify(ms.additional_effect) : null,
      specialMechanic: ms.special_mechanic ? JSON.stringify(ms.special_mechanic) : null,
      iconUrl: ms.icon_url || null,
      sortOrder: ms.sort_order || 0,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
      source: 'monster',
      oldId: ms.id,
    });
  }

  console.log(`\n準備插入: ${inserts.length} 筆 (跳過 ${skippedDuplicates} 筆同名技能)`);

  // 批量插入
  const BATCH_SIZE = 20;
  let inserted = 0;
  const idMapping = { quest: {}, monster: {} };

  for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
    const batch = inserts.slice(i, i + BATCH_SIZE);
    
    for (const skill of batch) {
      const source = skill.source;
      const oldId = skill.oldId;
      delete skill.source;
      delete skill.oldId;

      const columns = Object.keys(skill);
      const placeholders = columns.map(() => '?').join(', ');
      const colNames = columns.map(c => {
        // camelCase to snake_case
        return c.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      }).join(', ');
      
      const values = columns.map(c => {
        const v = skill[c];
        if (v === null || v === undefined) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });

      const [result] = await conn.query(
        `INSERT INTO game_unified_skill_catalog (${colNames}) VALUES (${placeholders})`,
        values
      );
      
      idMapping[source][oldId] = result.insertId;
      inserted++;
    }
  }

  console.log(`\n✅ 成功插入 ${inserted} 筆技能到統一表`);
  console.log(`\n=== ID 映射表 ===`);
  console.log(`天命技能映射: ${Object.keys(idMapping.quest).length} 筆`);
  console.log(`魔物技能映射: ${Object.keys(idMapping.monster).length} 筆`);

  // 輸出映射表到文件
  const fs = await import('fs');
  fs.writeFileSync('/home/ubuntu/oracle-resonance/scripts/id-mapping.json', JSON.stringify(idMapping, null, 2));
  console.log('\n映射表已保存到 scripts/id-mapping.json');

  // 驗證
  const [count] = await conn.execute('SELECT COUNT(*) as cnt FROM game_unified_skill_catalog');
  console.log(`\n統一表總數: ${count[0].cnt}`);

  const [bySource] = await conn.execute(`
    SELECT 
      CASE WHEN usable_by_player = 1 AND usable_by_pet = 1 THEN 'quest' ELSE 'monster-only' END as source,
      COUNT(*) as cnt 
    FROM game_unified_skill_catalog 
    GROUP BY source
  `);
  console.log('來源分布:', bySource);

  const [byCat] = await conn.execute(`
    SELECT category, COUNT(*) as cnt 
    FROM game_unified_skill_catalog 
    GROUP BY category 
    ORDER BY cnt DESC
  `);
  console.log('分類分布:', byCat);

} catch (err) {
  console.error('遷移失敗:', err);
  process.exit(1);
} finally {
  await conn.end();
}
