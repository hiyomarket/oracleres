/**
 * 為怪物分配任務道具掉落
 * 
 * 策略：
 * - epic 道具 → 分配到 rare 怪物的 drop_item 欄位（掉率 5-10%）
 * - legendary 道具 → 分配到 legendary 怪物的 legendary_drop 欄位（掉率 1-3%）
 * - 根據五行屬性匹配（火屬性道具 → 火屬性怪物）
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

// 取得所有 quest 道具
const [questItems] = await conn.execute(
  "SELECT item_id, name, rarity FROM game_item_catalog WHERE category = 'quest' AND item_id LIKE 'I_QST_%'"
);
console.log(`找到 ${questItems.length} 個任務道具`);

// 取得所有 rare 和 legendary 怪物
const [rareMonsters] = await conn.execute(
  "SELECT monster_id, name, rarity, wuxing FROM game_monster_catalog WHERE rarity = 'rare'"
);
const [legendaryMonsters] = await conn.execute(
  "SELECT monster_id, name, rarity, wuxing FROM game_monster_catalog WHERE rarity = 'legendary'"
);
console.log(`rare 怪物: ${rareMonsters.length}, legendary 怪物: ${legendaryMonsters.length}`);

// 道具 → 五行映射（根據道具名稱推斷）
const itemElementMap = {
  "I_QST_SHATTER": "金",      // 碎岩之核 → 金屬
  "I_QST_HONOR": "金",        // 騎士勳章 → 金
  "I_QST_HELLFIRE": "火",     // 獄焰精華 → 火
  "I_QST_FROSTCORE": "水",    // 極寒之心 → 水
  "I_QST_TORNADO": "木",      // 風暴之眼 → 木
  "I_QST_QUAKE": "土",        // 地脈碎片 → 土
  "I_QST_DIVINE": "金",       // 天罰聖光石 → 金
  "I_QST_BLOODGEM": "火",     // 血魔寶石 → 火
  "I_QST_MEDUSA": "水",       // 蛇髮女妖之瞳 → 水
  "I_QST_CHAOS": "火",        // 混沌碎片 → 火
  "I_QST_OBLIVION": "水",     // 遺忘之沙 → 水
  "I_QST_LIFEDEW": "木",      // 生命露珠 → 木
  "I_QST_PHOENIX": "火",      // 鳳凰羽毛 → 火
  "I_QST_PURIFY": "水",       // 淨化聖水 → 水
  "I_QST_MIRROR": "金",       // 明鏡碎片 → 金
  "I_QST_WARCRY": "金",       // 戰吼號角 → 金
  "I_QST_BASTION": "土",      // 堡壘之盾碎片 → 土
  // legendary 道具
  "I_QST_COSMOS_A": "金",     // 乾之精華
  "I_QST_COSMOS_B": "土",     // 坤之精華
  "I_QST_HOLYSHIELD_A": "金", // 聖盾核心
  "I_QST_HOLYSHIELD_B": "金", // 永恆誓約書
  "I_QST_HOLYSHIELD_C": "金", // 聖光精華
  "I_QST_ASSASSIN_A": "水",   // 影之契約
  "I_QST_ASSASSIN_B": "金",   // 無聲之刃
  "I_QST_SACRIFICE_A": "火",  // 犧牲之心
  "I_QST_SACRIFICE_B": "火",  // 不滅之魂
  "I_QST_SEAL_WOOD": "木",    // 木行封印符
  "I_QST_SEAL_FIRE": "火",    // 火行封印符
  "I_QST_SEAL_CORE": "土",    // 五行封印核心
  "I_QST_FATE_A": "金",       // 天命之書
  "I_QST_FATE_B": "水",       // 共振水晶
  "I_QST_FATE_C": "土",       // 命運碎片
};

// 分組怪物按五行
const rareByElement = {};
const legendaryByElement = {};
for (const m of rareMonsters) {
  if (!rareByElement[m.wuxing]) rareByElement[m.wuxing] = [];
  rareByElement[m.wuxing].push(m);
}
for (const m of legendaryMonsters) {
  if (!legendaryByElement[m.wuxing]) legendaryByElement[m.wuxing] = [];
  legendaryByElement[m.wuxing].push(m);
}

// 分配 epic 道具到 rare 怪物
const epicItems = questItems.filter(i => i.rarity === "epic");
const legendaryItems = questItems.filter(i => i.rarity === "legendary");

let assignCount = 0;

// 為每個 epic 道具找到匹配五行的 rare 怪物，分配到 drop_item_1
for (const item of epicItems) {
  const element = itemElementMap[item.item_id] || "木";
  const candidates = rareByElement[element] || rareMonsters.slice(0, 3);
  
  // 隨機選 1-2 隻怪物來掉落此道具
  const selected = candidates.slice(0, 2);
  for (const monster of selected) {
    // 找到空的 drop_item 欄位
    const [rows] = await conn.execute(
      `SELECT drop_item_1, drop_item_2, drop_item_3, drop_item_4, drop_item_5 FROM game_monster_catalog WHERE monster_id = ?`,
      [monster.monster_id]
    );
    const m = rows[0];
    let slot = null;
    if (!m.drop_item_1 || m.drop_item_1 === "" || m.drop_item_1 === "NULL") slot = 1;
    else if (!m.drop_item_2 || m.drop_item_2 === "" || m.drop_item_2 === "NULL") slot = 2;
    else if (!m.drop_item_3 || m.drop_item_3 === "" || m.drop_item_3 === "NULL") slot = 3;
    else if (!m.drop_item_4 || m.drop_item_4 === "" || m.drop_item_4 === "NULL") slot = 4;
    else if (!m.drop_item_5 || m.drop_item_5 === "" || m.drop_item_5 === "NULL") slot = 5;
    
    if (slot) {
      const dropRate = 0.05 + Math.random() * 0.05; // 5-10%
      await conn.execute(
        `UPDATE game_monster_catalog SET drop_item_${slot} = ?, drop_rate_${slot} = ? WHERE monster_id = ?`,
        [item.item_id, dropRate.toFixed(3), monster.monster_id]
      );
      console.log(`  ✅ ${item.name} → ${monster.name} (slot ${slot}, rate ${(dropRate * 100).toFixed(1)}%)`);
      assignCount++;
    }
  }
}

// 為每個 legendary 道具找到匹配五行的 legendary 怪物，分配到 legendary_drop
for (const item of legendaryItems) {
  const element = itemElementMap[item.item_id] || "金";
  const candidates = legendaryByElement[element] || legendaryMonsters.slice(0, 2);
  
  // 選 1 隻 legendary 怪物
  const monster = candidates[0] || legendaryMonsters[0];
  if (monster) {
    const [rows] = await conn.execute(
      `SELECT legendary_drop FROM game_monster_catalog WHERE monster_id = ?`,
      [monster.monster_id]
    );
    const m = rows[0];
    if (!m.legendary_drop || m.legendary_drop === "" || m.legendary_drop === "NULL") {
      const dropRate = 0.01 + Math.random() * 0.02; // 1-3%
      await conn.execute(
        `UPDATE game_monster_catalog SET legendary_drop = ?, legendary_drop_rate = ? WHERE monster_id = ?`,
        [item.item_id, dropRate.toFixed(3), monster.monster_id]
      );
      console.log(`  ⭐ ${item.name} → ${monster.name} (legendary, rate ${(dropRate * 100).toFixed(1)}%)`);
      assignCount++;
    } else {
      // legendary_drop 已被佔用，放到 drop_item 欄位
      const [rows2] = await conn.execute(
        `SELECT drop_item_1, drop_item_2, drop_item_3 FROM game_monster_catalog WHERE monster_id = ?`,
        [monster.monster_id]
      );
      const m2 = rows2[0];
      let slot = null;
      if (!m2.drop_item_1 || m2.drop_item_1 === "" || m2.drop_item_1 === "NULL") slot = 1;
      else if (!m2.drop_item_2 || m2.drop_item_2 === "" || m2.drop_item_2 === "NULL") slot = 2;
      else if (!m2.drop_item_3 || m2.drop_item_3 === "" || m2.drop_item_3 === "NULL") slot = 3;
      if (slot) {
        const dropRate = 0.01 + Math.random() * 0.02;
        await conn.execute(
          `UPDATE game_monster_catalog SET drop_item_${slot} = ?, drop_rate_${slot} = ? WHERE monster_id = ?`,
          [item.item_id, dropRate.toFixed(3), monster.monster_id]
        );
        console.log(`  ⭐ ${item.name} → ${monster.name} (slot ${slot}, rate ${(dropRate * 100).toFixed(1)}%)`);
        assignCount++;
      }
    }
  }
}

// 同時為一些 common 怪物也加上基礎材料掉落（增加掉落多樣性）
const [commonMonsters] = await conn.execute(
  "SELECT monster_id, name, wuxing FROM game_monster_catalog WHERE rarity = 'common' AND (drop_item_1 IS NULL OR drop_item_1 = '' OR drop_item_1 = 'NULL') ORDER BY RAND() LIMIT 30"
);

// 基礎材料 ID（根據五行）
const basicDrops = {
  "木": ["I_MAT_WOOD", "I_MAT_HERB"],
  "火": ["I_MAT_EMBER", "I_MAT_ASH"],
  "土": ["I_MAT_STONE", "I_MAT_CLAY"],
  "金": ["I_MAT_ORE", "I_MAT_SHARD"],
  "水": ["I_MAT_PEARL", "I_MAT_DEW"],
};

// 先檢查這些基礎材料是否存在於道具圖鑑
const basicItemIds = [...new Set(Object.values(basicDrops).flat())];
for (const itemId of basicItemIds) {
  const [existing] = await conn.execute("SELECT item_id FROM game_item_catalog WHERE item_id = ?", [itemId]);
  if (existing.length === 0) {
    const nameMap = {
      "I_MAT_WOOD": "木材", "I_MAT_HERB": "草藥",
      "I_MAT_EMBER": "餘燼", "I_MAT_ASH": "灰燼",
      "I_MAT_STONE": "石塊", "I_MAT_CLAY": "黏土",
      "I_MAT_ORE": "礦石", "I_MAT_SHARD": "碎片",
      "I_MAT_PEARL": "珍珠", "I_MAT_DEW": "露珠",
    };
    const wuxingMap = {
      "I_MAT_WOOD": "木", "I_MAT_HERB": "木",
      "I_MAT_EMBER": "火", "I_MAT_ASH": "火",
      "I_MAT_STONE": "土", "I_MAT_CLAY": "土",
      "I_MAT_ORE": "金", "I_MAT_SHARD": "金",
      "I_MAT_PEARL": "水", "I_MAT_DEW": "水",
    };
    await conn.execute(
      "INSERT INTO game_item_catalog (item_id, name, wuxing, category, rarity, is_active, created_at) VALUES (?, ?, ?, 'material', 'common', 1, ?)",
      [itemId, nameMap[itemId] || itemId, wuxingMap[itemId] || '木', Date.now()]
    );
    console.log(`  📦 新增基礎材料: ${nameMap[itemId]}`);
  }
}

// 分配基礎材料到 common 怪物
for (const monster of commonMonsters) {
  const drops = basicDrops[monster.wuxing] || basicDrops["木"];
  const dropItem = drops[Math.floor(Math.random() * drops.length)];
  const dropRate = 0.15 + Math.random() * 0.15; // 15-30%
  await conn.execute(
    "UPDATE game_monster_catalog SET drop_item_1 = ?, drop_rate_1 = ? WHERE monster_id = ?",
    [dropItem, dropRate.toFixed(3), monster.monster_id]
  );
}
console.log(`  📦 為 ${commonMonsters.length} 隻 common 怪物分配了基礎材料掉落`);

console.log(`\n✅ 完成！共分配 ${assignCount} 個任務道具掉落`);

await conn.end();
