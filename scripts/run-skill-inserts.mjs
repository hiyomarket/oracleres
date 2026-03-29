import fs from 'fs';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

const sqlDir = '/home/ubuntu/oracle-resonance/scripts/sql-skills';
const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();

let totalInserted = 0;
let errors = 0;

for (const file of files) {
  const sql = fs.readFileSync(`${sqlDir}/${file}`, 'utf-8').trim();
  try {
    const [result] = await conn.execute(sql);
    console.log(`✓ ${file}: ${result.affectedRows} rows inserted`);
    totalInserted += result.affectedRows;
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    errors++;
  }
}

console.log(`\nTotal inserted: ${totalInserted}, Errors: ${errors}`);

// Verify
const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM game_quest_skill_catalog');
console.log(`DB total quest skills: ${rows[0].cnt}`);

const [catRows] = await conn.execute('SELECT category, COUNT(*) as cnt FROM game_quest_skill_catalog GROUP BY category ORDER BY category');
console.log('Category distribution:');
catRows.forEach(r => console.log(`  ${r.category}: ${r.cnt}`));

const [wxRows] = await conn.execute('SELECT wuxing, COUNT(*) as cnt FROM game_quest_skill_catalog GROUP BY wuxing ORDER BY cnt DESC');
console.log('Wuxing distribution:');
wxRows.forEach(r => console.log(`  ${r.wuxing}: ${r.cnt}`));

await conn.end();
