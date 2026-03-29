/**
 * 套用魔物圖鑑重設計到資料庫
 * 
 * 讀取現有 200 隻魔物，按 monster_id 排序後，
 * 重新分配五行/抗性/種族/捕捉率
 */

import { readFileSync } from 'fs';

// 讀取預計算的更新資料
const updates = JSON.parse(readFileSync('/home/ubuntu/oracle-resonance/scripts/monster-updates.json', 'utf8'));

// 五行名稱映射
const WUXING_MAP = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
const WUXING_CN = { 'wood': '木', 'fire': '火', 'earth': '土', 'metal': '金', 'water': '水' };

// 生成 SQL 語句
function generateSQL() {
  const sqls = [];
  
  // 第一步：取得所有魔物的 monster_id 列表（按 ID 排序）
  // 我們會按 monster_id 字母排序來對應 updates 陣列
  sqls.push(`-- 魔物圖鑑全面重設計 SQL`);
  sqls.push(`-- 生成時間: ${new Date().toISOString()}`);
  sqls.push(`-- 總數: ${updates.length} 隻`);
  sqls.push(``);
  
  // 由於我們不知道確切的 monster_id 列表，
  // 我們需要用一個通用的方式：按 monster_id 排序後逐一更新
  // 這裡生成一個臨時表方案
  
  // 方案：用 CASE WHEN 批量更新
  // 先按稀有度分組，再按 monster_id 排序
  
  // 但更好的方案是：直接用 SET 語句按行號更新
  // MySQL 不支持 ROW_NUMBER 直接在 UPDATE 中使用
  // 所以我們用程序化方式：先查詢所有 monster_id，再生成對應的 UPDATE
  
  return updates;
}

// 輸出為可執行的 SQL 檔案
// 由於需要先查詢 monster_id 列表，我們改用 Node.js 直接連接 DB 的方式
// 但在 webdev 環境中，我們用 webdev_execute_sql 工具
// 所以這裡輸出分批 SQL 語句

// 生成分批 UPDATE 語句模板
// 每個 UPDATE 對應一個 monster_id
function generateUpdateStatements(monsterIds) {
  const statements = [];
  
  for (let i = 0; i < Math.min(monsterIds.length, updates.length); i++) {
    const mid = monsterIds[i];
    const u = updates[i];
    
    const wuxingCn = u.element; // 主屬性中文名
    
    statements.push(
      `UPDATE game_monster_catalog SET ` +
      `wuxing='${wuxingCn}', ` +
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
  
  return statements;
}

// 輸出模板（需要先查詢 monster_id 列表再填入）
console.log("腳本準備完成。需要先查詢 monster_id 列表。");
console.log(`預計更新 ${updates.length} 隻魔物。`);

// 導出函數供外部使用
export { generateUpdateStatements, updates };
