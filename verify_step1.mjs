// Step 1 驗證腳本：確認所有圖鑑表的 GD-028 欄位已到位
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await createConnection(url);

const REQUIRED = {
  game_monster_catalog: [
    "base_mp", "base_magic_defense", "base_heal_power", "base_crit_rate", "base_crit_damage",
    "wuxing_wood", "wuxing_fire", "wuxing_earth", "wuxing_metal", "wuxing_water",
    "realm", "realm_multiplier", "species", "actions_per_turn", "damage_type"
  ],
  game_pet_catalog: [
    "wuxing_wood", "wuxing_fire", "wuxing_earth", "wuxing_metal", "wuxing_water",
    "base_mp", "base_magic_defense", "base_heal_power", "base_crit_rate", "base_crit_damage",
    "realm", "realm_multiplier", "species", "linked_monster_id"
  ],
  game_player_pets: [
    "wuxing_wood", "wuxing_fire", "wuxing_earth", "wuxing_metal", "wuxing_water",
    "mp", "max_mp", "magic_attack", "magic_defense", "heal_power",
    "crit_rate", "crit_damage", "spr", "realm"
  ],
  game_agents: [
    "mdef", "spr", "crit_rate", "crit_damage", "realm",
    "profession", "profession_tier", "fate_element"
  ],
  game_equipment_catalog: [
    "bonus_mp", "bonus_magic_defense", "bonus_heal_power", "bonus_crit_rate",
    "bonus_crit_damage", "bonus_spr", "required_profession", "required_realm"
  ],
  game_skill_catalog: [
    "wuxing_threshold", "status_effect", "status_chance", "status_duration",
    "heal_percent", "profession_required", "damage_type"
  ]
};

let allOk = true;
for (const [table, cols] of Object.entries(REQUIRED)) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM ${table}`);
  const existing = new Set(rows.map(r => r.Field));
  const missing = cols.filter(c => !existing.has(c));
  if (missing.length > 0) {
    console.error(`❌ ${table} 缺少欄位: ${missing.join(", ")}`);
    allOk = false;
  } else {
    console.log(`✅ ${table}: ${cols.length} 個 GD-028 欄位全部到位`);
  }
}

if (allOk) {
  console.log("\n🎉 Step 1 驗證通過：所有 6 張表的 GD-028 欄位已全部到位！");
} else {
  console.log("\n⚠️ 有欄位缺失，需要補齊！");
}

await conn.end();
