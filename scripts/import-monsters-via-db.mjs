/**
 * 怪物圖鑑批量匯入腳本
 * 讀取 parsed-monsters.json 並透過 MySQL 連線直接匯入
 */
import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monstersPath = path.join(__dirname, 'parsed-monsters.json');

const monsters = JSON.parse(fs.readFileSync(monstersPath, 'utf-8'));
console.log(`📦 讀取 ${monsters.length} 隻怪物`);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL 未設定');
  process.exit(1);
}

const url = new URL(dbUrl);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

console.log('✅ 資料庫連線成功');

const BATCH_SIZE = 5;
let imported = 0;
let errors = 0;

for (let i = 0; i < monsters.length; i += BATCH_SIZE) {
  const batch = monsters.slice(i, i + BATCH_SIZE);
  
  for (const m of batch) {
    try {
      const dropGold = typeof m.dropGold === 'object' ? JSON.stringify(m.dropGold) : m.dropGold;
      
      await conn.execute(
        `INSERT INTO game_monster_catalog (
          monster_id, name, wuxing, level_range, rarity,
          base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack,
          resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus,
          skill_id_1, skill_id_2, skill_id_3,
          ai_level, growth_rate,
          drop_item_1, drop_rate_1, drop_gold,
          legendary_drop, legendary_drop_rate,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), wuxing=VALUES(wuxing), level_range=VALUES(level_range),
          rarity=VALUES(rarity), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack),
          base_defense=VALUES(base_defense), base_speed=VALUES(base_speed),
          base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack),
          resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire),
          resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal),
          resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus),
          skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2),
          skill_id_3=VALUES(skill_id_3), ai_level=VALUES(ai_level),
          growth_rate=VALUES(growth_rate), drop_item_1=VALUES(drop_item_1),
          drop_rate_1=VALUES(drop_rate_1), drop_gold=VALUES(drop_gold),
          legendary_drop=VALUES(legendary_drop), legendary_drop_rate=VALUES(legendary_drop_rate)`,
        [
          m.monsterId, m.name, m.wuxing, m.levelRange, m.rarity,
          m.baseHp, m.baseAttack, m.baseDefense, m.baseSpeed, m.baseAccuracy, m.baseMagicAttack,
          m.resistWood, m.resistFire, m.resistEarth, m.resistMetal, m.resistWater, m.counterBonus,
          m.skillId1, m.skillId2, m.skillId3,
          m.aiLevel, m.growthRate,
          m.dropItem1, m.dropRate1, dropGold,
          m.legendaryDrop, m.legendaryDropRate,
          Date.now()
        ]
      );
      imported++;
    } catch (err) {
      errors++;
      console.error(`  ❌ ${m.monsterId} ${m.name}: ${err.message}`);
    }
  }
  
  const pct = Math.round(((i + batch.length) / monsters.length) * 100);
  process.stdout.write(`\r  匯入進度: ${i + batch.length}/${monsters.length} (${pct}%)`);
}

console.log(`\n\n📊 匯入完成！`);
console.log(`   成功: ${imported} 隻`);
console.log(`   失敗: ${errors} 隻`);

// 驗證
const [[countRow]] = await conn.query('SELECT COUNT(*) as cnt FROM game_monster_catalog');
const [[wuxingRows]] = await conn.query('SELECT wuxing, COUNT(*) as cnt FROM game_monster_catalog GROUP BY wuxing ORDER BY wuxing');
console.log(`   資料庫總數: ${countRow.cnt} 隻`);

await conn.end();
