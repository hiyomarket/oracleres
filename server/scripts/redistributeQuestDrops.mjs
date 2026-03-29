/**
 * 重新分配任務道具掉落 — 更均勻地分散到各屬性怪物
 * 
 * 策略：
 * - 先清除所有現有的 quest item 掉落
 * - epic 道具 → 分配到同屬性的 common/rare 怪物（每個道具分配到 2-3 隻怪物）
 * - legendary 道具 → 分配到 legendary 怪物的 legendary_drop（每個道具 1 隻怪物）
 * - 掉率：epic 5-8%，legendary 1-3%
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

// 先清除所有怪物的掉落設定
await conn.execute("UPDATE game_monster_catalog SET drop_item_1 = '', drop_rate_1 = 0, drop_item_2 = '', drop_rate_2 = 0, drop_item_3 = '', drop_rate_3 = 0, drop_item_4 = '', drop_rate_4 = 0, drop_item_5 = '', drop_rate_5 = 0, legendary_drop = '', legendary_drop_rate = 0");
console.log("✅ 已清除所有怪物掉落設定");

// 取得所有 quest 道具
const [questItems] = await conn.execute(
  "SELECT item_id, name, rarity FROM game_item_catalog WHERE item_id LIKE 'I_QST_%'"
);
console.log(`找到 ${questItems.length} 個任務道具`);

// 取得所有怪物（按五行分組）
const [allMonsters] = await conn.execute(
  "SELECT monster_id, name, rarity, wuxing, level_range FROM game_monster_catalog ORDER BY rarity DESC, monster_id"
);

// 按五行分組
const monstersByElement = { "木": [], "火": [], "土": [], "金": [], "水": [] };
for (const m of allMonsters) {
  if (monstersByElement[m.wuxing]) monstersByElement[m.wuxing].push(m);
}
console.log("怪物五行分布:", Object.entries(monstersByElement).map(([k, v]) => `${k}: ${v.length}`).join(", "));

// 道具 → 五行映射
const itemElementMap = {
  "I_QST_SHATTER": "金", "I_QST_HONOR": "金", "I_QST_DIVINE": "金",
  "I_QST_MIRROR": "金", "I_QST_WARCRY": "金",
  "I_QST_HELLFIRE": "火", "I_QST_BLOODGEM": "火", "I_QST_CHAOS": "火",
  "I_QST_PHOENIX": "火",
  "I_QST_FROSTCORE": "水", "I_QST_MEDUSA": "水", "I_QST_OBLIVION": "水",
  "I_QST_PURIFY": "水",
  "I_QST_TORNADO": "木", "I_QST_LIFEDEW": "木", "I_QST_SEAL_WOOD": "木",
  "I_QST_QUAKE": "土", "I_QST_BASTION": "土",
  "I_QST_COSMOS_A": "金", "I_QST_COSMOS_B": "土",
  "I_QST_HOLYSHIELD_A": "金", "I_QST_HOLYSHIELD_B": "金", "I_QST_HOLYSHIELD_C": "金",
  "I_QST_ASSASSIN_A": "水", "I_QST_ASSASSIN_B": "金",
  "I_QST_SACRIFICE_A": "火", "I_QST_SACRIFICE_B": "火",
  "I_QST_SEAL_FIRE": "火", "I_QST_SEAL_CORE": "土",
  "I_QST_FATE_A": "金", "I_QST_FATE_B": "水", "I_QST_FATE_C": "土",
};

// 追蹤每隻怪物已使用的 slot
const usedSlots = {};
function getNextSlot(monsterId) {
  if (!usedSlots[monsterId]) usedSlots[monsterId] = 0;
  usedSlots[monsterId]++;
  return usedSlots[monsterId]; // 1-5
}

const epicItems = questItems.filter(i => i.rarity === "epic");
const legendaryItems = questItems.filter(i => i.rarity === "legendary");

let totalAssigned = 0;

// ═══ 分配 epic 道具 ═══
// 每個 epic 道具分配到 2-3 隻同屬性怪物（優先 rare，再 common）
console.log("\n--- Epic 道具分配 ---");
for (const item of epicItems) {
  const element = itemElementMap[item.item_id] || "木";
  const candidates = monstersByElement[element] || [];
  
  // 優先選 rare，然後 common
  const rares = candidates.filter(m => m.rarity === "rare");
  const commons = candidates.filter(m => m.rarity === "common");
  
  // 選 1 隻 rare + 1-2 隻 common
  const selected = [];
  if (rares.length > 0) {
    // 選一隻還有空 slot 的 rare
    const available = rares.find(m => (usedSlots[m.monster_id] || 0) < 5);
    if (available) selected.push(available);
  }
  // 再選 1-2 隻 common
  const numCommon = selected.length > 0 ? 1 : 2;
  const availableCommons = commons.filter(m => (usedSlots[m.monster_id] || 0) < 5);
  for (let i = 0; i < numCommon && i < availableCommons.length; i++) {
    // 選不同的 common 怪物
    const idx = Math.floor(Math.random() * availableCommons.length);
    const picked = availableCommons.splice(idx, 1)[0];
    selected.push(picked);
  }
  
  for (const monster of selected) {
    const slot = getNextSlot(monster.monster_id);
    if (slot > 5) continue;
    const dropRate = (0.05 + Math.random() * 0.03).toFixed(3); // 5-8%
    await conn.execute(
      `UPDATE game_monster_catalog SET drop_item_${slot} = ?, drop_rate_${slot} = ? WHERE monster_id = ?`,
      [item.item_id, dropRate, monster.monster_id]
    );
    console.log(`  ✅ ${item.name} → ${monster.name}(${monster.rarity}) [slot${slot}] ${(dropRate * 100).toFixed(1)}%`);
    totalAssigned++;
  }
}

// ═══ 分配 legendary 道具 ═══
// 每個 legendary 道具分配到 1 隻 legendary 怪物的 legendary_drop
console.log("\n--- Legendary 道具分配 ---");
const usedLegendarySlots = new Set();
for (const item of legendaryItems) {
  const element = itemElementMap[item.item_id] || "金";
  const candidates = monstersByElement[element] || [];
  const legendaries = candidates.filter(m => m.rarity === "legendary" && !usedLegendarySlots.has(m.monster_id));
  
  if (legendaries.length > 0) {
    const monster = legendaries[0];
    usedLegendarySlots.add(monster.monster_id);
    const dropRate = (0.01 + Math.random() * 0.02).toFixed(3); // 1-3%
    await conn.execute(
      "UPDATE game_monster_catalog SET legendary_drop = ?, legendary_drop_rate = ? WHERE monster_id = ?",
      [item.item_id, dropRate, monster.monster_id]
    );
    console.log(`  ⭐ ${item.name} → ${monster.name}(legendary) ${(dropRate * 100).toFixed(1)}%`);
    totalAssigned++;
  } else {
    // 沒有同屬性 legendary 怪物，找任何 legendary
    const anyLegendary = allMonsters.filter(m => m.rarity === "legendary" && !usedLegendarySlots.has(m.monster_id));
    if (anyLegendary.length > 0) {
      const monster = anyLegendary[0];
      usedLegendarySlots.add(monster.monster_id);
      const dropRate = (0.01 + Math.random() * 0.02).toFixed(3);
      await conn.execute(
        "UPDATE game_monster_catalog SET legendary_drop = ?, legendary_drop_rate = ? WHERE monster_id = ?",
        [item.item_id, dropRate, monster.monster_id]
      );
      console.log(`  ⭐ ${item.name} → ${monster.name}(legendary, 跨屬性) ${(dropRate * 100).toFixed(1)}%`);
      totalAssigned++;
    } else {
      console.log(`  ❌ ${item.name} — 沒有可用的 legendary 怪物`);
    }
  }
}

// ═══ 為 common 怪物分配基礎材料 ═══
console.log("\n--- 基礎材料分配 ---");
const basicDrops = {
  "木": ["I_MAT_WOOD", "I_MAT_HERB"],
  "火": ["I_MAT_EMBER", "I_MAT_ASH"],
  "土": ["I_MAT_STONE", "I_MAT_CLAY"],
  "金": ["I_MAT_ORE", "I_MAT_SHARD"],
  "水": ["I_MAT_PEARL", "I_MAT_DEW"],
};

const commonsWithoutDrops = allMonsters.filter(m => m.rarity === "common" && (usedSlots[m.monster_id] || 0) === 0);
let basicCount = 0;
for (const monster of commonsWithoutDrops) {
  const drops = basicDrops[monster.wuxing] || basicDrops["木"];
  const dropItem = drops[Math.floor(Math.random() * drops.length)];
  const slot = getNextSlot(monster.monster_id);
  if (slot > 5) continue;
  const dropRate = (0.15 + Math.random() * 0.15).toFixed(3); // 15-30%
  await conn.execute(
    `UPDATE game_monster_catalog SET drop_item_${slot} = ?, drop_rate_${slot} = ? WHERE monster_id = ?`,
    [dropItem, dropRate, monster.monster_id]
  );
  basicCount++;
}
console.log(`  📦 為 ${basicCount} 隻 common 怪物分配了基礎材料`);

console.log(`\n✅ 完成！共分配 ${totalAssigned} 個任務道具 + ${basicCount} 個基礎材料掉落`);

await conn.end();
