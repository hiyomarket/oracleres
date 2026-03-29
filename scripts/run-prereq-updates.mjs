import mysql from 'mysql2/promise';
import fs from 'fs';

const sql = fs.readFileSync('/home/ubuntu/oracle-resonance/scripts/sql-prerequisites.sql', 'utf8');
const statements = sql.split('\n').filter(s => s.trim());

const conn = await mysql.createConnection(process.env.DATABASE_URL);
let ok = 0, fail = 0;
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    ok++;
  } catch (e) {
    console.error(`FAIL: ${stmt}\n  ${e.message}`);
    fail++;
  }
}
console.log(`Done: ${ok} ok, ${fail} fail out of ${statements.length}`);
await conn.end();
