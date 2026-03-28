/**
 * 為 base_stats 空白或加成全零的裝備補充合理的數值
 * 根據 slot 和 tier/rarity 設定合理的基礎加成
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// 讀取所有加成全零的裝備
const [rows] = await conn.execute(
  `SELECT equip_id, name, wuxing, slot, rarity, tier, base_stats, 
          hp_bonus, attack_bonus, defense_bonus, speed_bonus
   FROM game_equipment_catalog 
   WHERE hp_bonus = 0 AND attack_bonus = 0 AND defense_bonus = 0 AND speed_bonus = 0`
);

console.log(`找到 ${rows.length} 件加成全零的裝備，開始補充...`);

// 根據 slot 和 rarity 設定基礎加成範圍
// 基礎值（common tier）
const SLOT_BASE = {
  weapon:    { atk: 15, def: 0,  hp: 0,   spd: 0  },
  offhand:   { atk: 0,  def: 15, hp: 30,  spd: 0  },
  helmet:    { atk: 0,  def: 8,  hp: 40,  spd: 0  },
  armor:     { atk: 0,  def: 12, hp: 60,  spd: 0  },
  shoes:     { atk: 0,  def: 0,  hp: 20,  spd: 10 },
  accessory: { atk: 5,  def: 5,  hp: 30,  spd: 5  },
  gloves:    { atk: 8,  def: 5,  hp: 20,  spd: 3  },
};

// 稀有度倍率
const RARITY_MULT = {
  common: 1.0, uncommon: 1.3, rare: 1.8, epic: 2.5, legendary: 4.0
};

// tier 倍率（根據 tier 名稱推算）
function getTierMult(tier) {
  if (!tier) return 1.0;
  const t = tier.toLowerCase();
  if (t.includes("初") || t.includes("basic") || t.includes("1")) return 1.0;
  if (t.includes("中") || t.includes("inter") || t.includes("2")) return 1.5;
  if (t.includes("高") || t.includes("adv") || t.includes("3")) return 2.2;
  if (t.includes("頂") || t.includes("elite") || t.includes("4")) return 3.5;
  if (t.includes("神") || t.includes("legend") || t.includes("5")) return 5.0;
  return 1.0;
}

let updated = 0;
for (const row of rows) {
  const base = SLOT_BASE[row.slot] ?? SLOT_BASE.accessory;
  const rarityMult = RARITY_MULT[row.rarity] ?? 1.0;
  const tierMult = getTierMult(row.tier);
  const mult = rarityMult * tierMult;

  const hp  = Math.round(base.hp  * mult);
  const atk = Math.round(base.atk * mult);
  const def = Math.round(base.def * mult);
  const spd = Math.round(base.spd * mult);

  // 更新 base_stats 文字和數值欄位
  const parts = [];
  if (atk > 0) parts.push(`攻擊 +${atk}`);
  if (def > 0) parts.push(`防禦 +${def}`);
  if (hp  > 0) parts.push(`HP +${hp}`);
  if (spd > 0) parts.push(`速度 +${spd}`);
  const baseStatsText = parts.join(", ");

  await conn.execute(
    `UPDATE game_equipment_catalog 
     SET hp_bonus = ?, attack_bonus = ?, defense_bonus = ?, speed_bonus = ?,
         base_stats = ?
     WHERE equip_id = ?`,
    [hp, atk, def, spd, baseStatsText, row.equip_id]
  );
  updated++;
  console.log(`✅ ${row.equip_id} ${row.name} (${row.wuxing}/${row.slot}/${row.rarity}): ${baseStatsText}`);
}

console.log(`\n✅ 完成！共補充 ${updated} 件裝備的加成數值`);
await conn.end();
