/**
 * 資料庫完整匯出腳本
 * 匯出所有資料表的 Schema 定義 + 現有資料
 * 輸出到 /home/ubuntu/oracleres-github/DATABASE/
 */
import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = '/home/ubuntu/oracleres-github/DATABASE';

// 確保輸出目錄存在
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, 'tables'), { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, 'json'), { recursive: true });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL 未設定');
  process.exit(1);
}

// 解析 DATABASE_URL
const url = new URL(dbUrl);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});

console.log('✅ 資料庫連線成功');

// 取得所有資料表
const [tables] = await conn.query(`SHOW TABLES`);
const tableNames = tables.map(row => Object.values(row)[0]);
console.log(`📊 共 ${tableNames.length} 個資料表: ${tableNames.join(', ')}`);

// 匯出每個資料表的 CREATE TABLE 語句
const schemaSqls = [];
const tableStats = [];

for (const tableName of tableNames) {
  try {
    // 取得 CREATE TABLE
    const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
    const createSql = createRow['Create Table'];
    schemaSqls.push(`-- Table: ${tableName}\n${createSql};\n`);

    // 取得資料筆數
    const [[countRow]] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
    const count = countRow.cnt;
    tableStats.push({ table: tableName, rows: count });

    // 匯出資料（每表最多 10000 筆）
    const [rows] = await conn.query(`SELECT * FROM \`${tableName}\` LIMIT 10000`);
    
    // 寫入 JSON
    const jsonPath = path.join(OUTPUT_DIR, 'json', `${tableName}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf-8');
    
    // 生成 INSERT SQL
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]);
      const insertLines = rows.map(row => {
        const vals = cols.map(col => {
          const v = row[col];
          if (v === null) return 'NULL';
          if (typeof v === 'number') return v;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "\\'")}'`;
          return `'${String(v).replace(/'/g, "\\'")}'`;
        });
        return `(${vals.join(', ')})`;
      });
      
      const insertSql = `-- Data for ${tableName} (${rows.length} rows)\n` +
        `INSERT INTO \`${tableName}\` (\`${cols.join('`, `')}\`) VALUES\n` +
        insertLines.join(',\n') + ';\n';
      
      const tableSqlPath = path.join(OUTPUT_DIR, 'tables', `${tableName}.sql`);
      fs.writeFileSync(tableSqlPath, insertSql, 'utf-8');
    }
    
    console.log(`  ✅ ${tableName}: ${count} 筆`);
  } catch (err) {
    console.error(`  ❌ ${tableName}: ${err.message}`);
    tableStats.push({ table: tableName, rows: -1, error: err.message });
  }
}

// 寫入 schema.sql（所有 CREATE TABLE）
const schemaPath = path.join(OUTPUT_DIR, 'schema.sql');
fs.writeFileSync(schemaPath, [
  '-- Oracle Resonance 資料庫 Schema',
  `-- 匯出時間: ${new Date().toISOString()}`,
  `-- 資料表數量: ${tableNames.length}`,
  '',
  ...schemaSqls
].join('\n'), 'utf-8');

// 寫入統計報告
const statsPath = path.join(OUTPUT_DIR, 'README.md');
const statsContent = [
  '# Oracle Resonance 資料庫備份',
  '',
  `**匯出時間**: ${new Date().toISOString()}`,
  `**資料表數量**: ${tableNames.length}`,
  '',
  '## 資料表統計',
  '',
  '| 資料表 | 筆數 |',
  '|:---|---:|',
  ...tableStats.map(s => `| ${s.table} | ${s.rows === -1 ? '❌ 錯誤' : s.rows.toLocaleString()} |`),
  '',
  '## 目錄結構',
  '',
  '```',
  'DATABASE/',
  '├── schema.sql          # 所有資料表的 CREATE TABLE 語句',
  '├── README.md           # 本說明文件',
  '├── tables/             # 各資料表的 INSERT 語句',
  '│   └── {table}.sql',
  '└── json/               # 各資料表的 JSON 格式資料',
  '    └── {table}.json',
  '```',
  '',
  '## 還原方式',
  '',
  '```sql',
  '-- 1. 先建立資料表結構',
  'SOURCE schema.sql;',
  '',
  '-- 2. 再匯入各資料表資料',
  'SOURCE tables/{table_name}.sql;',
  '```',
].join('\n');

fs.writeFileSync(statsPath, statsContent, 'utf-8');

// 生成完整的 full-dump.sql
const fullDumpParts = [
  '-- Oracle Resonance 完整資料庫備份',
  `-- 匯出時間: ${new Date().toISOString()}`,
  `-- 資料表數量: ${tableNames.length}`,
  '',
  'SET FOREIGN_KEY_CHECKS=0;',
  '',
  ...schemaSqls,
];

// 加入各表資料
for (const tableName of tableNames) {
  const tableSqlPath = path.join(OUTPUT_DIR, 'tables', `${tableName}.sql`);
  if (fs.existsSync(tableSqlPath)) {
    fullDumpParts.push(fs.readFileSync(tableSqlPath, 'utf-8'));
  }
}
fullDumpParts.push('SET FOREIGN_KEY_CHECKS=1;');

const fullDumpPath = path.join(OUTPUT_DIR, 'full-dump.sql');
fs.writeFileSync(fullDumpPath, fullDumpParts.join('\n'), 'utf-8');

await conn.end();

// 統計
const totalRows = tableStats.filter(s => s.rows >= 0).reduce((a, b) => a + b.rows, 0);
console.log(`\n📦 匯出完成！`);
console.log(`   總資料筆數: ${totalRows.toLocaleString()}`);
console.log(`   輸出目錄: ${OUTPUT_DIR}`);
console.log(`   schema.sql: ${(fs.statSync(schemaPath).size / 1024).toFixed(1)} KB`);
console.log(`   full-dump.sql: ${(fs.statSync(fullDumpPath).size / 1024).toFixed(1)} KB`);
