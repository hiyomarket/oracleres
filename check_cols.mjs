import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const tables = {
    game_agents: ['mdef','spr','crit_rate','crit_damage','realm','profession','profession_tier','fate_element'],
    game_monster_catalog: ['base_mp','base_magic_defense','base_heal_power','base_crit_rate','base_crit_damage','wuxing_wood','wuxing_fire','wuxing_earth','wuxing_metal','wuxing_water','realm','realm_multiplier','species'],
    game_pet_catalog: ['wuxing_wood','wuxing_fire','wuxing_earth','wuxing_metal','wuxing_water','base_magic_defense','base_heal_power','species'],
    game_player_pets: ['magic_defense','heal_power','wuxing_wood','wuxing_fire','wuxing_earth','wuxing_metal','wuxing_water','species','realm'],
    game_equipment_catalog: ['mp_bonus','magic_attack_bonus','magic_defense_bonus','heal_power_bonus','crit_rate_bonus','crit_damage_bonus'],
    game_skill_catalog: ['wuxing_threshold','status_effect','status_chance','status_duration','heal_percent','profession_required','skill_tier','acquire_method'],
  };
  let allOk = true;
  for (const [table, cols] of Object.entries(tables)) {
    const [existing] = await conn.execute('SHOW COLUMNS FROM ' + table);
    const existingNames = existing.map(r => r.Field);
    const missing = cols.filter(c => existingNames.indexOf(c) === -1);
    if (missing.length > 0) {
      console.log(table + ' MISSING:', missing.join(', '));
      allOk = false;
    } else {
      console.log(table + ': ALL OK (' + cols.length + ' cols verified)');
    }
  }
  await conn.end();
  if (allOk) console.log('\nAll columns verified successfully!');
  else console.log('\nSome columns are missing!');
}
run();
