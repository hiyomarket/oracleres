/**
 * 生成魔物圖鑑批量更新 SQL 檔案
 * 
 * 讀取 monster-updates.json 和資料庫中的 monster_id 列表
 * 按 monster_id 排序後，逐一生成 UPDATE 語句
 * 輸出為多個 SQL 檔案（每批 20 條，方便透過 webdev_execute_sql 執行）
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const updates = JSON.parse(readFileSync('/home/ubuntu/oracle-resonance/scripts/monster-updates.json', 'utf8'));

// 硬編碼 monster_id 列表（M_E001 到 M_W050，按字母排序）
// 從 DB 查詢得知格式為 M_E001, M_E002, ... M_F001, ... M_G001, ... M_M001, ... M_W001
// E=土(Earth), F=火(Fire), G=金(Gold/Metal), M=木(Mu/Wood), W=水(Water)
// 現有分佈：土28, 火30, 金28, 木25, 水89 = 200

// 生成所有 monster_id
const monsterIds = [];
const prefixCounts = { 'E': 28, 'F': 30, 'G': 28, 'M': 25, 'W': 89 };
for (const [prefix, count] of Object.entries(prefixCounts)) {
  for (let i = 1; i <= count; i++) {
    monsterIds.push(`M_${prefix}${String(i).padStart(3, '0')}`);
  }
}
monsterIds.sort(); // 字母排序

console.log(`總魔物數: ${monsterIds.length}`);
console.log(`更新資料數: ${updates.length}`);
console.log(`前5個ID: ${monsterIds.slice(0, 5).join(', ')}`);
console.log(`後5個ID: ${monsterIds.slice(-5).join(', ')}`);

// 生成 UPDATE 語句
const statements = [];
for (let i = 0; i < Math.min(monsterIds.length, updates.length); i++) {
  const mid = monsterIds[i];
  const u = updates[i];
  
  statements.push(
    `UPDATE game_monster_catalog SET ` +
    `wuxing='${u.element}', ` +
    `species='${u.species}', ` +
    `wuxing_wood=${u.wuxing['木']}, ` +
    `wuxing_fire=${u.wuxing['火']}, ` +
    `wuxing_earth=${u.wuxing['土']}, ` +
    `wuxing_metal=${u.wuxing['金']}, ` +
    `wuxing_water=${u.wuxing['水']}, ` +
    `resist_wood=${u.resist['木']}, ` +
    `resist_fire=${u.resist['火']}, ` +
    `resist_earth=${u.resist['土']}, ` +
    `resist_metal=${u.resist['金']}, ` +
    `resist_water=${u.resist['水']}, ` +
    `is_capturable=${u.capturable}, ` +
    `base_capture_rate=${u.captureRate} ` +
    `WHERE monster_id='${mid}';`
  );
}

// 分批輸出（每批 10 條，用分號分隔）
const BATCH_SIZE = 10;
const batches = [];
for (let i = 0; i < statements.length; i += BATCH_SIZE) {
  batches.push(statements.slice(i, i + BATCH_SIZE).join('\n'));
}

// 輸出到檔案
mkdirSync('/home/ubuntu/oracle-resonance/scripts/sql-batches', { recursive: true });
for (let i = 0; i < batches.length; i++) {
  writeFileSync(`/home/ubuntu/oracle-resonance/scripts/sql-batches/batch_${String(i).padStart(2, '0')}.sql`, batches[i]);
}

console.log(`\n生成 ${batches.length} 個批次檔案`);
console.log(`每批 ${BATCH_SIZE} 條 UPDATE 語句`);

// 也輸出一個完整的 SQL 檔案
writeFileSync('/home/ubuntu/oracle-resonance/scripts/sql-batches/all_updates.sql', statements.join('\n'));
console.log(`完整 SQL 檔案: all_updates.sql (${statements.length} 條)`);

// 驗證摘要
const elementCheck = {};
for (let i = 0; i < Math.min(monsterIds.length, updates.length); i++) {
  const u = updates[i];
  elementCheck[u.element] = (elementCheck[u.element] || 0) + 1;
}
console.log('\n=== 重分配後五行分佈 ===');
console.log(elementCheck);
