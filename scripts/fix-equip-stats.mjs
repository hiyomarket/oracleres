/**
 * 批量修復裝備數值欄位：
 * 1. 解析 base_stats 文字欄位，填入 hp_bonus/attack_bonus/defense_bonus/speed_bonus
 * 2. 根據 wuxing 和 slot 設定合理的 resist_bonus
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// 讀取所有裝備
const [rows] = await conn.execute(
  "SELECT equip_id, name, wuxing, slot, rarity, base_stats FROM game_equipment_catalog"
);

// 解析 base_stats 文字
function parseBaseStats(text) {
  const stats = { hp: 0, atk: 0, def: 0, spd: 0 };
  if (!text) return stats;
  const patterns = [
    { regex: /HP\s*[+＋](\d+)/i, key: "hp" },
    { regex: /生命\s*[+＋](\d+)/i, key: "hp" },
    { regex: /攻擊\s*[+＋](\d+)/i, key: "atk" },
    { regex: /防禦\s*[+＋](\d+)/i, key: "def" },
    { regex: /速度\s*[+＋](\d+)/i, key: "spd" },
    { regex: /魔法攻擊\s*[+＋](\d+)/i, key: "atk" }, // 魔攻暫時映射到 atk
  ];
  for (const { regex, key } of patterns) {
    const m = text.match(regex);
    if (m) stats[key] = parseInt(m[1], 10);
  }
  return stats;
}

// 根據五行和槽位設定抗性
// 設計原則：
// - 武器：不設抗性
// - 副手（盾牌）：主屬性抗性 +8，次屬性 +3
// - 防具/頭盔：主屬性抗性 +12，次屬性 +4
// - 鞋子：主屬性抗性 +5，次屬性 +2
// - 飾品（戒指/護符/項鍊）：主屬性抗性 +10，全屬性 +3
// 五行相生：木→火→土→金→水→木（相生的次屬性也給一點抗性）
const WUXING_NEXT = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const WUXING_KEY = { 木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water" };
const RARITY_MULT = { common: 1.0, uncommon: 1.2, rare: 1.5, epic: 2.0, legendary: 3.0 };

function calcResistBonus(wuxing, slot, rarity) {
  const base = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const mainKey = WUXING_KEY[wuxing];
  const nextWuxing = WUXING_NEXT[wuxing];
  const nextKey = WUXING_KEY[nextWuxing];
  const mult = RARITY_MULT[rarity] ?? 1.0;

  if (slot === "weapon") return base; // 武器不設抗性

  let mainResist = 0;
  let nextResist = 0;
  let allResist = 0;

  if (slot === "offhand") { mainResist = 8; nextResist = 3; }
  else if (slot === "armor" || slot === "helmet") { mainResist = 12; nextResist = 4; }
  else if (slot === "shoes") { mainResist = 5; nextResist = 2; }
  else if (slot === "accessory") { mainResist = 10; allResist = 3; }

  if (mainKey) base[mainKey] = Math.round(mainResist * mult);
  if (nextKey && nextResist > 0) base[nextKey] = Math.round(nextResist * mult);
  if (allResist > 0) {
    for (const k of Object.keys(base)) {
      if (k !== mainKey) base[k] = Math.max(base[k], Math.round(allResist * mult));
    }
  }
  return base;
}

let updated = 0;
for (const row of rows) {
  const stats = parseBaseStats(row.base_stats);
  const resist = calcResistBonus(row.wuxing, row.slot, row.rarity);

  await conn.execute(
    `UPDATE game_equipment_catalog 
     SET hp_bonus = ?, attack_bonus = ?, defense_bonus = ?, speed_bonus = ?, resist_bonus = ?
     WHERE equip_id = ?`,
    [stats.hp, stats.atk, stats.def, stats.spd, JSON.stringify(resist), row.equip_id]
  );
  updated++;
  console.log(`✅ ${row.equip_id} ${row.name} (${row.wuxing}/${row.slot}): HP+${stats.hp} ATK+${stats.atk} DEF+${stats.def} SPD+${stats.spd} | resist: ${JSON.stringify(resist)}`);
}

console.log(`\n✅ 完成！共更新 ${updated} 件裝備`);
await conn.end();
