/**
 * Execute all monster INSERT statements via mysql2
 * Reads the combined SQL file and executes each statement
 */
import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await createConnection(dbUrl);

const dir = '/home/ubuntu/oracle-resonance/scripts/sql-rebuild';
const files = [];
for (let i = 1; i <= 20; i++) {
  files.push(`batch_${String(i).padStart(2, '0')}.sql`);
}

let total = 0;
let errors = 0;

for (const file of files) {
  const content = readFileSync(`${dir}/${file}`, 'utf8').trim();
  const statements = content.split('\n').filter(l => l.trim().length > 0);
  
  for (const stmt of statements) {
    try {
      await connection.execute(stmt);
      total++;
    } catch (e) {
      console.error(`Error in ${file}: ${e.message}`);
      console.error(`Statement: ${stmt.substring(0, 100)}...`);
      errors++;
    }
  }
  console.log(`  ✓ ${file} (${statements.length} statements)`);
}

console.log(`\nDone: ${total} inserted, ${errors} errors`);

// Verify
const [rows] = await connection.execute('SELECT COUNT(*) as cnt FROM game_monster_catalog');
console.log(`Total monsters in DB: ${rows[0].cnt}`);

const [elDist] = await connection.execute('SELECT wuxing, COUNT(*) as cnt FROM game_monster_catalog GROUP BY wuxing ORDER BY wuxing');
console.log('Element distribution:', elDist.map(r => `${r.wuxing}:${r.cnt}`).join(', '));

const [spDist] = await connection.execute('SELECT species, COUNT(*) as cnt FROM game_monster_catalog GROUP BY species ORDER BY species');
console.log('Species distribution:', spDist.map(r => `${r.species}:${r.cnt}`).join(', '));

// Verify wuxing sums
const [badSum] = await connection.execute('SELECT monster_id, wuxing_wood+wuxing_fire+wuxing_earth+wuxing_metal+wuxing_water as total FROM game_monster_catalog WHERE wuxing_wood+wuxing_fire+wuxing_earth+wuxing_metal+wuxing_water != 100');
if (badSum.length > 0) {
  console.error(`BAD WUXING SUMS: ${badSum.length} monsters`);
  badSum.forEach(r => console.error(`  ${r.monster_id}: ${r.total}`));
} else {
  console.log('All wuxing sums = 100 ✓');
}

// Verify no single-digit wuxing
const [badMod] = await connection.execute(`
  SELECT monster_id FROM game_monster_catalog 
  WHERE (wuxing_wood % 10 != 0 AND wuxing_wood != 0)
     OR (wuxing_fire % 10 != 0 AND wuxing_fire != 0)
     OR (wuxing_earth % 10 != 0 AND wuxing_earth != 0)
     OR (wuxing_metal % 10 != 0 AND wuxing_metal != 0)
     OR (wuxing_water % 10 != 0 AND wuxing_water != 0)
`);
if (badMod.length > 0) {
  console.error(`BAD WUXING MULTIPLES: ${badMod.length} monsters`);
} else {
  console.log('All wuxing values are multiples of 10 ✓');
}

await connection.end();
