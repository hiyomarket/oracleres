/**
 * Update monster catalog skill_id_1/2/3 references from old SK_M format to new USK format
 * Also update the unified skill catalog to have proper skillId values matching old SK_M IDs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // 1. Build mapping: old monster_skill_id (SK_M001) -> new unified id
  const [oldSkills] = await conn.query("SELECT id, monster_skill_id FROM game_monster_skill_catalog ORDER BY id");
  const [newSkills] = await conn.query("SELECT id, skill_id, code, name FROM game_unified_skill_catalog ORDER BY id");
  
  // Build name-based mapping from old monster skills to new unified skills
  const [oldSkillsFull] = await conn.query("SELECT id, monster_skill_id, name FROM game_monster_skill_catalog ORDER BY id");
  const [newSkillsFull] = await conn.query("SELECT id, skill_id, name FROM game_unified_skill_catalog ORDER BY id");
  
  // Create mapping: old monster_skill_id -> new skill_id (USK_xxx)
  const nameToNew = new Map();
  for (const ns of newSkillsFull) {
    nameToNew.set(ns.name, ns.skill_id);
  }
  
  const oldToNew = new Map();
  for (const os of oldSkillsFull) {
    const newId = nameToNew.get(os.name);
    if (newId) {
      oldToNew.set(os.monster_skill_id, newId);
    }
  }
  
  console.log(`Built mapping: ${oldToNew.size} old SK_M -> USK mappings`);
  
  // 2. Update monster catalog skill references
  const [monsters] = await conn.query("SELECT monster_id, skill_id_1, skill_id_2, skill_id_3 FROM game_monster_catalog WHERE skill_id_1 != '' OR skill_id_2 != '' OR skill_id_3 != ''");
  
  let updated = 0;
  for (const m of monsters) {
    const newS1 = oldToNew.get(m.skill_id_1) || m.skill_id_1;
    const newS2 = oldToNew.get(m.skill_id_2) || m.skill_id_2;
    const newS3 = oldToNew.get(m.skill_id_3) || m.skill_id_3;
    
    if (newS1 !== m.skill_id_1 || newS2 !== m.skill_id_2 || newS3 !== m.skill_id_3) {
      await conn.query(
        "UPDATE game_monster_catalog SET skill_id_1 = ?, skill_id_2 = ?, skill_id_3 = ? WHERE monster_id = ?",
        [newS1, newS2, newS3, m.monster_id]
      );
      updated++;
    }
  }
  
  console.log(`Updated ${updated} monsters with new skill references`);
  
  // 3. Verify
  const [verify] = await conn.query("SELECT COUNT(*) as cnt FROM game_monster_catalog WHERE skill_id_1 LIKE 'SK_M%' OR skill_id_2 LIKE 'SK_M%' OR skill_id_3 LIKE 'SK_M%'");
  console.log(`Remaining old SK_M references: ${verify[0].cnt}`);
  
  const [verifyNew] = await conn.query("SELECT COUNT(*) as cnt FROM game_monster_catalog WHERE skill_id_1 LIKE 'USK_%' OR skill_id_2 LIKE 'USK_%' OR skill_id_3 LIKE 'USK_%'");
  console.log(`New USK references: ${verifyNew[0].cnt}`);
  
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
