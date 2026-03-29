/**
 * v5.6 任務道具種子腳本
 * 為 epic/legendary 技能建立專屬任務道具，並更新 learn_cost 的 items 陣列
 * 
 * 設計原則：
 * - Epic 技能需要 1 個特殊道具（從特定魔物掉落或特定節點採集）
 * - Legendary 技能需要 2-3 個特殊道具（更稀有，需要跨區域收集）
 * - 道具名稱與技能主題相關，增加沉浸感
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Epic 技能道具定義
const epicSkillItems = [
  // 物理戰鬥 Epic
  { skillId: 158, skillName: '崩擊', items: [
    { itemId: 'I_QST_SHATTER', name: '碎岩之核', wuxing: '土', rarity: 'epic', source: '試煉之塔・地下訓練場掉落', effect: '蘊含崩擊之力的結晶，學習崩擊的必要材料', qty: 1 }
  ]},
  { skillId: 169, skillName: '騎士之譽', items: [
    { itemId: 'I_QST_HONOR', name: '騎士勳章', wuxing: '金', rarity: 'epic', source: '迷霧城・地下競技場冠軍獎勵', effect: '象徵騎士榮耀的勳章，學習騎士之譽的必要材料', qty: 1 }
  ]},
  
  // 五行元素魔法 Epic
  { skillId: 172, skillName: '業火魔法', items: [
    { itemId: 'I_QST_HELLFIRE', name: '獄焰精華', wuxing: '火', rarity: 'epic', source: '中界・虛空法塔深層掉落', effect: '從地獄之火中提煉的精華，學習業火魔法的必要材料', qty: 1 }
  ]},
  { skillId: 175, skillName: '極寒魔法', items: [
    { itemId: 'I_QST_FROSTCORE', name: '極寒之心', wuxing: '水', rarity: 'epic', source: '中界・古老森林深處採集', effect: '千年寒冰凝聚的核心，學習極寒魔法的必要材料', qty: 1 }
  ]},
  { skillId: 178, skillName: '龍捲魔法', items: [
    { itemId: 'I_QST_TORNADO', name: '風暴之眼', wuxing: '木', rarity: 'epic', source: '中界・墜星高地風暴區採集', effect: '風暴中心凝聚的氣旋結晶，學習龍捲魔法的必要材料', qty: 1 }
  ]},
  { skillId: 181, skillName: '天崩地裂', items: [
    { itemId: 'I_QST_QUAKE', name: '地脈碎片', wuxing: '土', rarity: 'epic', source: '中界・影之山谷深層掉落', effect: '大地深處的脈動結晶，學習天崩地裂的必要材料', qty: 1 }
  ]},
  { skillId: 184, skillName: '金光天罰', items: [
    { itemId: 'I_QST_DIVINE', name: '天罰聖光石', wuxing: '金', rarity: 'epic', source: '中界・永恆教堂祈禱獲得', effect: '蘊含天罰之力的聖光結晶，學習金光天罰的必要材料', qty: 1 }
  ]},
  
  // 吸血/特殊 Epic
  { skillId: 186, skillName: '超強吸血魔法', items: [
    { itemId: 'I_QST_BLOODGEM', name: '血魔寶石', wuxing: '水', rarity: 'epic', source: '中界・暗影公會任務獎勵', effect: '吸收了無數生命力的寶石，學習超強吸血魔法的必要材料', qty: 1 }
  ]},
  
  // 控制 Epic
  { skillId: 190, skillName: '石化群體', items: [
    { itemId: 'I_QST_MEDUSA', name: '蛇髮女妖之瞳', wuxing: '土', rarity: 'epic', source: '中界・暗影公會特殊任務', effect: '傳說中蛇髮女妖的眼球結晶，學習石化群體的必要材料', qty: 1 }
  ]},
  { skillId: 192, skillName: '混亂群體', items: [
    { itemId: 'I_QST_CHAOS', name: '混沌碎片', wuxing: '水', rarity: 'epic', source: '中界・混沌實驗室掉落', effect: '從混沌實驗中提取的不穩定碎片，學習混亂群體的必要材料', qty: 1 }
  ]},
  { skillId: 196, skillName: '遺忘群體', items: [
    { itemId: 'I_QST_OBLIVION', name: '遺忘之沙', wuxing: '火', rarity: 'epic', source: '初界・回憶沙漠採集', effect: '能抹除記憶的神秘沙粒，學習遺忘群體的必要材料', qty: 1 }
  ]},
  
  // 治療/輔助 Epic
  { skillId: 201, skillName: '超強補血魔法', items: [
    { itemId: 'I_QST_LIFEDEW', name: '生命露珠', wuxing: '木', rarity: 'epic', source: '中界・鏡之修行場採集', effect: '蘊含強大生命力的露珠，學習超強補血魔法的必要材料', qty: 1 }
  ]},
  { skillId: 202, skillName: '氣絕回復', items: [
    { itemId: 'I_QST_PHOENIX', name: '鳳凰羽毛', wuxing: '火', rarity: 'epic', source: '中界・永恆教堂祈禱獲得', effect: '傳說中鳳凰的羽毛，蘊含起死回生之力', qty: 1 }
  ]},
  { skillId: 205, skillName: '全體潔淨', items: [
    { itemId: 'I_QST_PURIFY', name: '淨化聖水', wuxing: '水', rarity: 'epic', source: '初界・泉水聖所採集', effect: '聖泉中汲取的淨化之水，學習全體潔淨的必要材料', qty: 1 }
  ]},
  { skillId: 208, skillName: '明鏡止水', items: [
    { itemId: 'I_QST_MIRROR', name: '明鏡碎片', wuxing: '水', rarity: 'epic', source: '中界・鏡之修行場掉落', effect: '映照真實的明鏡碎片，學習明鏡止水的必要材料', qty: 1 }
  ]},
  { skillId: 213, skillName: '全體攻擊增幅', items: [
    { itemId: 'I_QST_WARCRY', name: '戰吼號角', wuxing: '火', rarity: 'epic', source: '中界・永恆殿堂任務獎勵', effect: '能激發戰意的古老號角，學習全體攻擊增幅的必要材料', qty: 1 }
  ]},
  { skillId: 214, skillName: '全體防禦增幅', items: [
    { itemId: 'I_QST_BASTION', name: '堡壘之盾碎片', wuxing: '金', rarity: 'epic', source: '中界・永恆殿堂任務獎勵', effect: '古老堡壘之盾的碎片，學習全體防禦增幅的必要材料', qty: 1 }
  ]},
];

// Legendary 技能道具定義（每個需要 2-3 個道具）
const legendarySkillItems = [
  { skillId: 160, skillName: '乾坤一擲', items: [
    { itemId: 'I_QST_COSMOS_A', name: '乾之精華', wuxing: '金', rarity: 'legendary', source: '試煉之塔・最深層Boss掉落', effect: '天地乾坤之力的陽面精華', qty: 1 },
    { itemId: 'I_QST_COSMOS_B', name: '坤之精華', wuxing: '土', rarity: 'legendary', source: '碎影深淵・最深層Boss掉落', effect: '天地乾坤之力的陰面精華', qty: 1 },
  ]},
  { skillId: 216, skillName: '聖盾', items: [
    { itemId: 'I_QST_HOLYSHIELD_A', name: '聖盾核心', wuxing: '金', rarity: 'legendary', source: '中界・永恆殿堂最終試煉', effect: '聖盾騎士團代代相傳的核心結晶', qty: 1 },
    { itemId: 'I_QST_HOLYSHIELD_B', name: '永恆誓約書', wuxing: '金', rarity: 'legendary', source: '中界・永恆教堂祈禱獲得', effect: '記載聖盾騎士誓約的古老書卷', qty: 1 },
    { itemId: 'I_QST_HOLYSHIELD_C', name: '聖光精華×3', wuxing: '火', rarity: 'epic', source: '初界・聖光修道院採集', effect: '聖光修道院中凝聚的光之精華', qty: 3 },
  ]},
  { skillId: 217, skillName: '暗殺', items: [
    { itemId: 'I_QST_ASSASSIN_A', name: '影之契約', wuxing: '水', rarity: 'legendary', source: '中界・暗影公會最終試煉', effect: '與暗影簽訂的契約，代價是永遠行走在黑暗中', qty: 1 },
    { itemId: 'I_QST_ASSASSIN_B', name: '無聲之刃', wuxing: '金', rarity: 'legendary', source: '中界・影之山谷深層Boss掉落', effect: '能斬斷一切聲音的傳說之刃', qty: 1 },
  ]},
  { skillId: 220, skillName: '捨身', items: [
    { itemId: 'I_QST_SACRIFICE_A', name: '犧牲之心', wuxing: '火', rarity: 'legendary', source: '碎影深淵・入口營地特殊任務', effect: '願意為同伴犧牲一切的決心結晶', qty: 1 },
    { itemId: 'I_QST_SACRIFICE_B', name: '不滅之魂', wuxing: '金', rarity: 'legendary', source: '試煉之塔・地下訓練場極限試煉', effect: '經歷無數次死亡仍不屈的靈魂碎片', qty: 1 },
  ]},
  { skillId: 221, skillName: '五行封印', items: [
    { itemId: 'I_QST_SEAL_WOOD', name: '木行封印符', wuxing: '木', rarity: 'epic', source: '中界・古老森林深處', effect: '五行封印術的木行符文', qty: 1 },
    { itemId: 'I_QST_SEAL_FIRE', name: '火行封印符', wuxing: '火', rarity: 'epic', source: '初界・回憶沙漠深處', effect: '五行封印術的火行符文', qty: 1 },
    { itemId: 'I_QST_SEAL_CORE', name: '五行封印核心', wuxing: '土', rarity: 'legendary', source: '中界・影之山谷最深層', effect: '統合五行之力的封印核心', qty: 1 },
  ]},
  { skillId: 222, skillName: '天命共振', items: [
    { itemId: 'I_QST_FATE_A', name: '天命之書', wuxing: '金', rarity: 'legendary', source: '碎影深淵・最終Boss掉落', effect: '記載天命法則的古老書卷，蘊含改變命運的力量', qty: 1 },
    { itemId: 'I_QST_FATE_B', name: '共振水晶', wuxing: '水', rarity: 'legendary', source: '試煉之塔・最終試煉獎勵', effect: '能與天地共振的神秘水晶', qty: 1 },
    { itemId: 'I_QST_FATE_C', name: '命運碎片×5', wuxing: '火', rarity: 'epic', source: '全區域Boss隨機掉落', effect: '散落在世界各地的命運碎片', qty: 5 },
  ]},
];

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  const allItems = [...epicSkillItems, ...legendarySkillItems];
  let totalItems = 0;
  let totalSkills = 0;
  
  for (const skill of allItems) {
    console.log(`\n🎯 技能: ${skill.skillName} (ID ${skill.skillId})`);
    
    const itemRefs = []; // [{itemId, qty}]
    
    for (const item of skill.items) {
      // 檢查道具是否已存在
      const [existing] = await conn.execute(
        'SELECT id, item_id FROM game_item_catalog WHERE item_id = ?',
        [item.itemId]
      );
      
      if (existing.length > 0) {
        console.log(`  ⏭️ 道具已存在: ${item.name} (${item.itemId})`);
      } else {
        await conn.execute(
          `INSERT INTO game_item_catalog (item_id, name, wuxing, category, source, effect, rarity, is_active, created_at, stack_limit, shop_price, in_normal_shop, in_spirit_shop, in_secret_shop, is_monster_drop, drop_rate) VALUES (?, ?, ?, 'quest', ?, ?, ?, 1, ?, 10, 0, 0, 0, 0, 0, 0)`,
          [item.itemId, item.name, item.wuxing, item.source, item.effect, item.rarity, Date.now()]
        );
        console.log(`  ✅ 新增道具: ${item.name} (${item.itemId}) [${item.rarity}]`);
        totalItems++;
      }
      
      itemRefs.push({ itemId: item.itemId, qty: item.qty });
    }
    
    // 更新技能的 learn_cost，加入 items
    const [skillRow] = await conn.execute(
      'SELECT learn_cost FROM game_unified_skill_catalog WHERE id = ?',
      [skill.skillId]
    );
    
    if (skillRow.length > 0) {
      let learnCost = {};
      try {
        learnCost = JSON.parse(skillRow[0].learn_cost || '{}');
      } catch (e) {
        learnCost = {};
      }
      
      learnCost.items = itemRefs;
      
      await conn.execute(
        'UPDATE game_unified_skill_catalog SET learn_cost = ? WHERE id = ?',
        [JSON.stringify(learnCost), skill.skillId]
      );
      console.log(`  📝 更新 learn_cost: ${JSON.stringify(itemRefs)}`);
      totalSkills++;
    }
  }
  
  console.log(`\n✅ 完成！新增 ${totalItems} 個任務道具，更新 ${totalSkills} 個技能的 learn_cost`);
  
  // 驗證結果
  console.log('\n--- 驗證 Epic/Legendary 技能道具 ---');
  const [verify] = await conn.execute(
    `SELECT id, name, rarity, learn_cost FROM game_unified_skill_catalog WHERE usable_by_player = 1 AND rarity IN ('epic', 'legendary') ORDER BY rarity, id`
  );
  for (const s of verify) {
    const cost = JSON.parse(s.learn_cost || '{}');
    const items = cost.items || [];
    const status = items.length > 0 ? '✅' : '⚠️';
    console.log(`  ${status} [${s.rarity}] ${s.name}: ${items.length} 個道具需求`);
  }
  
  await conn.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
