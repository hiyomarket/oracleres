import { createConnection } from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await createConnection(url);

async function addIfMissing(table, col, ddl) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE '${col}'`);
  if (rows.length === 0) {
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
    console.log(`  ✅ ${table}.${col} added`);
  } else {
    console.log(`  ⏭️ ${table}.${col} already exists`);
  }
}

console.log("=== game_monster_catalog ===");
await addIfMissing("game_monster_catalog", "damage_type", "varchar(20) NOT NULL DEFAULT 'single'");

console.log("\n=== game_pet_catalog ===");
await addIfMissing("game_pet_catalog", "base_mp", "int NOT NULL DEFAULT 20");
await addIfMissing("game_pet_catalog", "base_crit_rate", "int NOT NULL DEFAULT 5");
await addIfMissing("game_pet_catalog", "base_crit_damage", "int NOT NULL DEFAULT 150");
await addIfMissing("game_pet_catalog", "realm", "varchar(20) NOT NULL DEFAULT '初界'");
await addIfMissing("game_pet_catalog", "realm_multiplier", "double NOT NULL DEFAULT 1.0");
await addIfMissing("game_pet_catalog", "linked_monster_id", "varchar(36) NOT NULL DEFAULT ''");

console.log("\n=== game_player_pets ===");
await addIfMissing("game_player_pets", "crit_rate", "int NOT NULL DEFAULT 5");
await addIfMissing("game_player_pets", "crit_damage", "int NOT NULL DEFAULT 150");
await addIfMissing("game_player_pets", "spr", "int NOT NULL DEFAULT 10");

console.log("\n=== game_equipment_catalog ===");
await addIfMissing("game_equipment_catalog", "bonus_mp", "int NOT NULL DEFAULT 0");
await addIfMissing("game_equipment_catalog", "bonus_magic_defense", "int NOT NULL DEFAULT 0");
await addIfMissing("game_equipment_catalog", "bonus_heal_power", "int NOT NULL DEFAULT 0");
await addIfMissing("game_equipment_catalog", "bonus_crit_rate", "double NOT NULL DEFAULT 0");
await addIfMissing("game_equipment_catalog", "bonus_crit_damage", "double NOT NULL DEFAULT 0");
await addIfMissing("game_equipment_catalog", "bonus_spr", "int NOT NULL DEFAULT 0");
await addIfMissing("game_equipment_catalog", "required_profession", "varchar(50) NOT NULL DEFAULT 'none'");
await addIfMissing("game_equipment_catalog", "required_realm", "varchar(20) NOT NULL DEFAULT '初界'");

console.log("\n✅ All missing columns fixed!");
await conn.end();
