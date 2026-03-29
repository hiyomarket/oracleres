/**
 * 插入魔物數值倍率到 game_config
 * 每個戰鬥數值一個獨立倍率，預設 1.0
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);
const now = Date.now();

const multipliers = [
  { key: "monster_hp_multiplier", label: "魔物 HP 倍率", desc: "全域魔物 HP 倍率（1.0 = 原始值）", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_mp_multiplier", label: "魔物 MP 倍率", desc: "全域魔物 MP 倍率", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_atk_multiplier", label: "魔物物攻倍率", desc: "全域魔物物理攻擊倍率", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_matk_multiplier", label: "魔物魔攻倍率", desc: "全域魔物魔法攻擊倍率", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_def_multiplier", label: "魔物物防倍率", desc: "全域魔物物理防禦倍率", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_mdef_multiplier", label: "魔物魔防倍率", desc: "全域魔物魔法防禦倍率", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_spd_multiplier", label: "魔物速度倍率", desc: "全域魔物速度倍率", category: "monster_balance", min: 0.1, max: 50 },
  { key: "monster_acc_multiplier", label: "魔物命中倍率", desc: "全域魔物命中率倍率", category: "monster_balance", min: 0.1, max: 10 },
  { key: "monster_crit_rate_multiplier", label: "魔物暴擊率倍率", desc: "全域魔物暴擊率倍率", category: "monster_balance", min: 0.1, max: 20 },
  { key: "monster_crit_dmg_multiplier", label: "魔物暴擊傷害倍率", desc: "全域魔物暴擊傷害倍率", category: "monster_balance", min: 0.1, max: 10 },
  { key: "monster_bp_multiplier", label: "魔物 BP 倍率", desc: "全域魔物戰鬥力倍率", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_heal_multiplier", label: "魔物治療倍率", desc: "全域魔物治療力倍率", category: "monster_balance", min: 0.1, max: 100 },
  { key: "monster_resist_multiplier", label: "魔物抗性倍率", desc: "全域魔物五行抗性倍率", category: "monster_balance", min: 0.1, max: 10 },
  // 按稀有度的額外倍率
  { key: "monster_rarity_common_multiplier", label: "普通魔物倍率", desc: "普通(common)魔物的額外倍率，疊加在數值倍率之上", category: "monster_balance", min: 0.1, max: 50 },
  { key: "monster_rarity_rare_multiplier", label: "稀有魔物倍率", desc: "稀有(rare)魔物的額外倍率", category: "monster_balance", min: 0.1, max: 50 },
  { key: "monster_rarity_elite_multiplier", label: "精英魔物倍率", desc: "精英(elite)魔物的額外倍率", category: "monster_balance", min: 0.1, max: 50 },
  { key: "monster_rarity_epic_multiplier", label: "史詩魔物倍率", desc: "史詩(epic)魔物的額外倍率", category: "monster_balance", min: 0.1, max: 50 },
  { key: "monster_rarity_boss_multiplier", label: "Boss 魔物倍率", desc: "Boss 魔物的額外倍率", category: "monster_balance", min: 0.1, max: 50 },
  { key: "monster_rarity_legendary_multiplier", label: "傳說魔物倍率", desc: "傳說(legendary)魔物的額外倍率", category: "monster_balance", min: 0.1, max: 50 },
];

let inserted = 0;
for (const m of multipliers) {
  const [existing] = await conn.execute(
    "SELECT id FROM game_config WHERE config_key = ?", [m.key]
  );
  if (existing.length > 0) {
    console.log(`  跳過 ${m.key}（已存在）`);
    continue;
  }
  await conn.execute(
    `INSERT INTO game_config (config_key, config_value, value_type, label, description, category, min_value, max_value, is_active, updated_at, created_at) VALUES (?, '1.0', 'number', ?, ?, ?, ?, ?, 1, ?, ?)`,
    [m.key, m.label, m.desc, m.category, m.min, m.max, now, now]
  );
  inserted++;
  console.log(`  ✓ ${m.key} → ${m.label}`);
}

console.log(`\n完成！新增 ${inserted} 個倍率設定`);
await conn.end();
