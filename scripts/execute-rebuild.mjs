/**
 * Execute all SQL batch files for monster rebuild
 * Reads each batch file and outputs combined SQL for execution
 */
import { readFileSync, readdirSync } from 'fs';

const dir = '/home/ubuntu/oracle-resonance/scripts/sql-rebuild';
const files = readdirSync(dir)
  .filter(f => f.startsWith('batch_') && f.endsWith('.sql'))
  .sort();

let allSql = '';
let totalStatements = 0;

for (const file of files) {
  const content = readFileSync(`${dir}/${file}`, 'utf8').trim();
  const stmts = content.split('\n').filter(l => l.trim().length > 0);
  totalStatements += stmts.length;
  allSql += content + '\n';
}

console.log(`Total batch files: ${files.length}`);
console.log(`Total INSERT statements: ${totalStatements}`);

// Output combined SQL
import { writeFileSync } from 'fs';
writeFileSync(`${dir}/combined_insert.sql`, allSql);
console.log(`Combined SQL written to ${dir}/combined_insert.sql`);
