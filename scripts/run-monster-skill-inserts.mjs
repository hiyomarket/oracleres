import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const scriptDir = '/home/ubuntu/oracle-resonance/scripts';

// Get DATABASE_URL from environment
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) { console.error('DATABASE_URL not found in env'); process.exit(1); }

const dbUrl = new URL(rawUrl);
const host = dbUrl.hostname;
const port = dbUrl.port || '4000';
const user = dbUrl.username;
const pass = dbUrl.password;
const db = dbUrl.pathname.replace('/', '');

const mysqlCmd = `mysql -h ${host} -P ${port} -u ${user} -p'${pass}' --ssl-mode=REQUIRED ${db}`;

let errors = 0;

// Step 1: Execute monster skill inserts
console.log('=== Step 1: Insert 100 monster skills ===');
const skillSql = path.join(scriptDir, 'sql-monster-skills.sql');
try {
  execSync(`${mysqlCmd} < ${skillSql}`, { stdio: 'pipe' });
  console.log('✅ Monster skills inserted successfully');
} catch (e) {
  console.error('❌ Error inserting monster skills:', e.stderr?.toString());
  errors++;
}

// Step 2: Execute monster skill assignments
console.log('\n=== Step 2: Assign skills to 200 monsters ===');
const assignFiles = fs.readdirSync(scriptDir)
  .filter(f => f.startsWith('sql-monster-assign-'))
  .sort();

for (const file of assignFiles) {
  const filePath = path.join(scriptDir, file);
  try {
    execSync(`${mysqlCmd} < ${filePath}`, { stdio: 'pipe' });
    console.log(`✅ ${file} executed`);
  } catch (e) {
    console.error(`❌ Error in ${file}:`, e.stderr?.toString());
    errors++;
  }
}

console.log(`\n=== Done: ${errors} errors ===`);
