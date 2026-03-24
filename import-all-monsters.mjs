import fs from 'fs';
import path from 'path';

// Parse all 5 monster markdown files and output JSON
const WUXING_MAP = { A: 'wood', B: 'fire', C: 'earth', D: 'metal', E: 'water' };
const RARITY_MAP = { '普通': 'common', '精英': 'elite', 'Boss': 'boss', '世界Boss': 'legendary', '世界BOSS': 'legendary' };
const GROWTH_MAP = { '普通': 1.0, '良好': 1.05, '優秀': 1.1, '天賦': 1.15, '傳說': 1.2 };

function safeInt(val, def = 0) {
  const m = String(val).match(/\d+/);
  return m ? parseInt(m[0]) : def;
}

function parseMonsterBlock(lines, wuxing) {
  const monster = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.includes('---') || trimmed.includes('欄位')) continue;
    const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 4) {
      monster[cells[0]] = cells[1];
      monster[cells[2]] = cells[3];
    } else if (cells.length >= 2) {
      monster[cells[0]] = cells[1];
    }
  }
  if (!monster['monster_code']) return null;

  const goldStr = monster['掉落金幣'] || '50-100';
  const goldParts = goldStr.match(/\d+/g) || ['50', '100'];
  const goldMin = parseInt(goldParts[0]);
  const goldMax = goldParts[1] ? parseInt(goldParts[1]) : goldMin * 2;

  const dropStr = monster['掉落素材'] || '';
  const dropMatch = dropStr.match(/(I_\w+)/);
  const dropItem = dropMatch ? dropMatch[1] : '';

  const dropRateStr = monster['掉落機率%'] || '10%';
  const dropRateMatch = dropRateStr.match(/[\d.]+/);
  const dropRate = dropRateMatch ? parseFloat(dropRateMatch[0]) : 10;

  const sk1Match = (monster['skill_id_1'] || '').match(/(SK_M\d+)/);
  const sk2Match = (monster['skill_id_2'] || '').match(/(SK_M\d+)/);
  const sk3Match = (monster['skill_id_3'] || '').match(/(SK_M\d+)/);

  const level = safeInt(monster['等級'], 1);
  let levelRange = '1-10';
  if (level > 50) levelRange = '51-60';
  else if (level > 25) levelRange = '26-50';
  else if (level > 10) levelRange = '11-25';

  return {
    monster_id: monster['monster_code'],
    name: '',
    wuxing,
    level_range: levelRange,
    rarity: RARITY_MAP[monster['稀有度']] || 'common',
    base_hp: safeInt(monster['HP'], 50),
    base_attack: safeInt(monster['攻擊'], 10),
    base_defense: safeInt(monster['防禦'], 5),
    base_speed: safeInt(monster['速度'], 10),
    base_accuracy: safeInt(monster['命中力'], 80),
    base_magic_attack: safeInt(monster['魔法攻擊'], 8),
    resist_wood: safeInt(monster['抗木%'], 0),
    resist_fire: safeInt(monster['抗火%'], 0),
    resist_earth: safeInt(monster['抗土%'], 0),
    resist_metal: safeInt(monster['抗金%'], 0),
    resist_water: safeInt(monster['抗水%'], 0),
    counter_bonus: safeInt(monster['被剋制加成%'], 20),
    skill_id_1: sk1Match ? sk1Match[1] : '',
    skill_id_2: sk2Match ? sk2Match[1] : '',
    skill_id_3: sk3Match ? sk3Match[1] : '',
    ai_level: safeInt(monster['AI 等級'], 1),
    growth_rate: GROWTH_MAP[monster['成長率']] || 1.0,
    drop_item_1: dropItem,
    drop_rate_1: dropRate,
    drop_gold: JSON.stringify({ min: goldMin, max: goldMax }),
    exp_reward: safeInt(monster['經驗值'], 30),
  };
}

function parseFile(filepath, wuxingKey) {
  const wuxing = WUXING_MAP[wuxingKey];
  const content = fs.readFileSync(filepath, 'utf-8');
  const monsters = [];
  
  const headerRegex = /### (M_\w+)\s+(.+?)(?:\n)/g;
  const headers = [];
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    headers.push({ code: match[1], name: match[2].replace(/[（(].+?[）)]/g, '').trim(), index: match.index });
  }
  
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const block = content.substring(start, end).split('\n');
    const m = parseMonsterBlock(block, wuxing);
    if (m) {
      m.name = headers[i].name;
      m.monster_id = headers[i].code;
      monsters.push(m);
    }
  }
  return monsters;
}

// Generate single-row INSERT statements
function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const baseDir = '/home/ubuntu/oracle-resonance';
const files = {
  A: 'GD-011A-木屬性怪物圖鑑.md',
  B: 'GD-011B-火屬性怪物圖鑑.md',
  C: 'GD-011C-土屬性怪物圖鑑.md',
  D: 'GD-011D-金屬性怪物圖鑑.md',
  E: 'GD-011E-水屬性怪物圖鑑.md',
};

const allMonsters = [];
for (const [key, filename] of Object.entries(files)) {
  const filepath = path.join(baseDir, filename);
  if (fs.existsSync(filepath)) {
    const monsters = parseFile(filepath, key);
    console.log(`[${key}] ${filename}: ${monsters.length} monsters`);
    allMonsters.push(...monsters);
  }
}
console.log(`\nTotal: ${allMonsters.length} monsters`);

// Generate SQL with VALUES batching (10 per statement)
const now = Date.now();
const cols = 'monster_id, name, wuxing, level_range, rarity, base_hp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack, resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus, skill_id_1, skill_id_2, skill_id_3, ai_level, growth_rate, drop_item_1, drop_rate_1, drop_gold, created_at';

const batchSize = 5;
const batches = [];
for (let i = 0; i < allMonsters.length; i += batchSize) {
  const batch = allMonsters.slice(i, i + batchSize);
  const valueRows = batch.map(m => {
    return `(${escapeSQL(m.monster_id)}, ${escapeSQL(m.name)}, ${escapeSQL(m.wuxing)}, ${escapeSQL(m.level_range)}, ${escapeSQL(m.rarity)}, ${m.base_hp}, ${m.base_attack}, ${m.base_defense}, ${m.base_speed}, ${m.base_accuracy}, ${m.base_magic_attack}, ${m.resist_wood}, ${m.resist_fire}, ${m.resist_earth}, ${m.resist_metal}, ${m.resist_water}, ${m.counter_bonus}, ${escapeSQL(m.skill_id_1)}, ${escapeSQL(m.skill_id_2)}, ${escapeSQL(m.skill_id_3)}, ${m.ai_level}, ${m.growth_rate}, ${escapeSQL(m.drop_item_1)}, ${m.drop_rate_1}, ${escapeSQL(m.drop_gold)}, ${now})`;
  });
  const sql = `INSERT INTO game_monster_catalog (${cols}) VALUES ${valueRows.join(',\n')} ON DUPLICATE KEY UPDATE name=VALUES(name), base_hp=VALUES(base_hp), base_attack=VALUES(base_attack), base_defense=VALUES(base_defense), base_speed=VALUES(base_speed), base_accuracy=VALUES(base_accuracy), base_magic_attack=VALUES(base_magic_attack), resist_wood=VALUES(resist_wood), resist_fire=VALUES(resist_fire), resist_earth=VALUES(resist_earth), resist_metal=VALUES(resist_metal), resist_water=VALUES(resist_water), counter_bonus=VALUES(counter_bonus), skill_id_1=VALUES(skill_id_1), skill_id_2=VALUES(skill_id_2), skill_id_3=VALUES(skill_id_3), ai_level=VALUES(ai_level), growth_rate=VALUES(growth_rate), drop_item_1=VALUES(drop_item_1), drop_rate_1=VALUES(drop_rate_1), drop_gold=VALUES(drop_gold);`;
  batches.push(sql);
}

// Write each batch to a separate file
for (let i = 0; i < batches.length; i++) {
  fs.writeFileSync(path.join(baseDir, `monster-batch-${i}.sql`), batches[i]);
}
console.log(`Generated ${batches.length} batch SQL files (${batchSize} per batch)`);

// Also write a combined file
fs.writeFileSync(path.join(baseDir, 'all-monsters-combined.sql'), batches.join('\n\n'));
console.log('Combined SQL written to all-monsters-combined.sql');
