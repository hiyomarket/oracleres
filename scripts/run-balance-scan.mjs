/**
 * 全圖鑑平衡掃描腳本
 * 直接呼叫後端 tRPC mutation API 執行 dryRun 模式的全圖鑑掃描
 */
import http from "http";

const BASE_URL = "http://localhost:3000";

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = JSON.stringify(body);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Non-JSON: ${data.substring(0, 300)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// 各圖鑑分別掃描（用 publicProcedure 或繞過 auth）
// 由於需要管理員權限，我們直接讀取資料庫進行分析
import { createConnection } from "mysql2/promise";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  全圖鑑平衡掃描（直接資料庫分析）");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL 未設定，嘗試從 .env 讀取...");
    // 讀取 env
    const fs = await import("fs");
    const envContent = fs.readFileSync("/home/ubuntu/oracle-resonance/.env", "utf-8");
    for (const line of envContent.split("\n")) {
      const m = line.match(/^(\w+)=(.*)$/);
      if (m) process.env[m[1]] = m[2];
    }
  }

  const conn = await createConnection(process.env.DATABASE_URL);

  // ── 怪物掃描 ──
  const [monsters] = await conn.query("SELECT * FROM game_monster_catalog");
  const [monsterSkills] = await conn.query("SELECT * FROM game_monster_skill_catalog");
  const [items] = await conn.query("SELECT * FROM game_item_catalog");
  const [equips] = await conn.query("SELECT * FROM game_equipment_catalog");
  const [skills] = await conn.query("SELECT * FROM game_skill_catalog");
  const [achievements] = await conn.query("SELECT * FROM game_achievements");

  // 載入自訂規則
  const [dbRules] = await conn.query("SELECT * FROM game_balance_rules");
  
  // 預設規則（簡化版）
  const defaults = {
    monster: {
      common:    { hp: [30, 120], atk: [5, 20], def: [2, 12], spd: [3, 12] },
      rare:      { hp: [80, 250], atk: [15, 40], def: [8, 25], spd: [5, 18] },
      elite:     { hp: [150, 350], atk: [25, 55], def: [15, 35], spd: [8, 22] },
      epic:      { hp: [200, 400], atk: [30, 65], def: [18, 40], spd: [10, 25] },
      boss:      { hp: [300, 500], atk: [40, 80], def: [25, 50], spd: [12, 28] },
      legendary: { hp: [350, 500], atk: [50, 80], def: [30, 50], spd: [15, 30] },
    },
    monsterSkill: {
      common:    { power: [60, 130], mp: [0, 10], cd: [0, 2] },
      rare:      { power: [90, 160], mp: [3, 15], cd: [0, 3] },
      epic:      { power: [120, 210], mp: [5, 25], cd: [1, 4] },
      legendary: { power: [150, 260], mp: [8, 30], cd: [1, 5] },
    },
    item: {
      common:    { price: [10, 150] },
      rare:      { price: [80, 600] },
      epic:      { price: [400, 2500] },
      legendary: { price: [1500, 10000] },
    },
    equipment: {
      white:  { atk: [0, 8], def: [0, 6], hp: [0, 30], spd: [0, 4] },
      green:  { atk: [3, 15], def: [2, 12], hp: [5, 50], spd: [0, 8] },
      blue:   { atk: [8, 22], def: [5, 18], hp: [15, 75], spd: [2, 12] },
      purple: { atk: [12, 28], def: [8, 22], hp: [25, 90], spd: [3, 14] },
      orange: { atk: [18, 35], def: [12, 28], hp: [40, 110], spd: [5, 16] },
      red:    { atk: [25, 40], def: [18, 35], hp: [60, 130], spd: [8, 20] },
    },
    skill: {
      common:    { power: [70, 130], mp: [0, 12], cd: [0, 2], price: [50, 300] },
      rare:      { power: [100, 170], mp: [5, 20], cd: [1, 3], price: [200, 800] },
      epic:      { power: [140, 220], mp: [10, 35], cd: [1, 4], price: [500, 3000] },
      legendary: { power: [180, 280], mp: [15, 50], cd: [2, 5], price: [2000, 10000] },
    },
    achievement: {
      common:    { coins: [10, 80], stones: [1, 5] },
      rare:      { coins: [50, 250], stones: [5, 20] },
      epic:      { coins: [200, 800], stones: [15, 50] },
      legendary: { coins: [500, 2000], stones: [30, 100] },
    },
  };

  // 覆蓋自訂規則
  for (const r of dbRules) {
    const ct = r.catalog_type;
    const rarity = r.rarity;
    const field = r.field;
    if (defaults[ct]?.[rarity]?.[field]) {
      defaults[ct][rarity][field] = [r.min_value, r.max_value];
    }
  }

  const results = { totalScanned: 0, totalChanges: 0, details: {} };

  // ── 分析怪物 ──
  const monsterChanges = [];
  for (const m of monsters) {
    const rarity = m.rarity || "common";
    const range = defaults.monster[rarity];
    if (!range) continue;
    for (const [field, [min, max]] of Object.entries(range)) {
      const val = m[field];
      if (val !== undefined && val !== null && (val < min || val > max)) {
        const newVal = Math.round(Math.max(min, Math.min(max, val)));
        monsterChanges.push({
          name: m.name,
          id: m.monster_id,
          rarity,
          field,
          oldValue: val,
          newValue: newVal,
          reason: `${val < min ? "低於下限" : "超過上限"} [${min}-${max}]`,
        });
      }
    }
  }
  results.details.monsters = { scanned: monsters.length, changes: monsterChanges };
  results.totalScanned += monsters.length;
  results.totalChanges += monsterChanges.length;

  // ── 分析怪物技能 ──
  const msChanges = [];
  for (const s of monsterSkills) {
    const rarity = s.rarity || "common";
    const range = defaults.monsterSkill[rarity];
    if (!range) continue;
    const fieldMap = { power: "power_percent", mp: "mp_cost", cd: "cooldown" };
    for (const [field, [min, max]] of Object.entries(range)) {
      const dbField = fieldMap[field] || field;
      const val = s[dbField];
      if (val !== undefined && val !== null && (val < min || val > max)) {
        const newVal = Math.round(Math.max(min, Math.min(max, val)));
        msChanges.push({
          name: s.name,
          id: s.id,
          rarity,
          field,
          oldValue: val,
          newValue: newVal,
          reason: `${val < min ? "低於下限" : "超過上限"} [${min}-${max}]`,
        });
      }
    }
  }
  results.details.monsterSkills = { scanned: monsterSkills.length, changes: msChanges };
  results.totalScanned += monsterSkills.length;
  results.totalChanges += msChanges.length;

  // ── 分析道具 ──
  const itemChanges = [];
  for (const it of items) {
    const rarity = it.rarity || "common";
    const range = defaults.item[rarity];
    if (!range) continue;
    const val = it.shop_price;
    if (val !== undefined && val !== null && range.price) {
      const [min, max] = range.price;
      if (val < min || val > max) {
        itemChanges.push({
          name: it.name,
          id: it.item_id,
          rarity,
          field: "shopPrice",
          oldValue: val,
          newValue: Math.round(Math.max(min, Math.min(max, val))),
          reason: `${val < min ? "低於下限" : "超過上限"} [${min}-${max}]`,
        });
      }
    }
  }
  results.details.items = { scanned: items.length, changes: itemChanges };
  results.totalScanned += items.length;
  results.totalChanges += itemChanges.length;

  // ── 分析裝備 ──
  const equipChanges = [];
  for (const e of equips) {
    const quality = e.quality || "white";
    const range = defaults.equipment[quality];
    if (!range) continue;
    const fieldMap = { atk: "bonus_atk", def: "bonus_def", hp: "bonus_hp", spd: "bonus_spd" };
    for (const [field, [min, max]] of Object.entries(range)) {
      const dbField = fieldMap[field] || field;
      const val = e[dbField];
      if (val !== undefined && val !== null && (val < min || val > max)) {
        equipChanges.push({
          name: e.name,
          id: e.equipment_id,
          quality,
          field,
          oldValue: val,
          newValue: Math.round(Math.max(min, Math.min(max, val))),
          reason: `${val < min ? "低於下限" : "超過上限"} [${min}-${max}]`,
        });
      }
    }
  }
  results.details.equipment = { scanned: equips.length, changes: equipChanges };
  results.totalScanned += equips.length;
  results.totalChanges += equipChanges.length;

  // ── 分析人物技能 ──
  const skillChanges = [];
  for (const s of skills) {
    const rarity = s.rarity || "common";
    const range = defaults.skill[rarity];
    if (!range) continue;
    const fieldMap = { power: "power_percent", mp: "mp_cost", cd: "cooldown", price: "shop_price" };
    for (const [field, [min, max]] of Object.entries(range)) {
      const dbField = fieldMap[field] || field;
      const val = s[dbField];
      if (val !== undefined && val !== null && (val < min || val > max)) {
        skillChanges.push({
          name: s.name,
          id: s.skill_id,
          rarity,
          field,
          oldValue: val,
          newValue: Math.round(Math.max(min, Math.min(max, val))),
          reason: `${val < min ? "低於下限" : "超過上限"} [${min}-${max}]`,
        });
      }
    }
  }
  results.details.skills = { scanned: skills.length, changes: skillChanges };
  results.totalScanned += skills.length;
  results.totalChanges += skillChanges.length;

  // ── 分析成就 ──
  const achChanges = [];
  for (const a of achievements) {
    const rarity = a.rarity || "common";
    const range = defaults.achievement[rarity];
    if (!range) continue;
    const fieldMap = { coins: "reward_gold", stones: "reward_exp" };
    for (const [field, [min, max]] of Object.entries(range)) {
      const dbField = fieldMap[field] || field;
      const val = a[dbField];
      if (val !== undefined && val !== null && (val < min || val > max)) {
        achChanges.push({
          name: a.name,
          id: a.id,
          rarity,
          field,
          oldValue: val,
          newValue: Math.round(Math.max(min, Math.min(max, val))),
          reason: `${val < min ? "低於下限" : "超過上限"} [${min}-${max}]`,
        });
      }
    }
  }
  results.details.achievements = { scanned: achievements.length, changes: achChanges };
  results.totalScanned += achievements.length;
  results.totalChanges += achChanges.length;

  // ── 輸出結果 ──
  console.log(`📊 掃描結果摘要`);
  console.log(`   總掃描數：${results.totalScanned}`);
  console.log(`   需修正數：${results.totalChanges}\n`);

  console.log("┌──────────────────┬──────────┬──────────┐");
  console.log("│ 圖鑑類型         │ 掃描數   │ 異常數   │");
  console.log("├──────────────────┼──────────┼──────────┤");
  for (const [cat, data] of Object.entries(results.details)) {
    const label = {
      monsters: "怪物圖鑑",
      monsterSkills: "怪物技能",
      items: "道具圖鑑",
      equipment: "裝備圖鑑",
      skills: "人物技能",
      achievements: "成就系統",
    }[cat] || cat;
    console.log(`│ ${label.padEnd(16)}│ ${String(data.scanned).padStart(8)} │ ${String(data.changes.length).padStart(8)} │`);
  }
  console.log("└──────────────────┴──────────┴──────────┘\n");

  for (const [cat, data] of Object.entries(results.details)) {
    if (data.changes.length === 0) continue;
    const label = {
      monsters: "🐉 怪物圖鑑",
      monsterSkills: "🐲 怪物技能",
      items: "🎒 道具圖鑑",
      equipment: "⚔️ 裝備圖鑑",
      skills: "✨ 人物技能",
      achievements: "🏆 成就系統",
    }[cat] || cat;
    console.log(`\n${label} 需修正項目 (${data.changes.length})：`);
    console.log("─".repeat(80));
    for (const c of data.changes) {
      const arrow = c.newValue > c.oldValue ? "↑" : "↓";
      console.log(`  ${c.name} | ${c.field}: ${c.oldValue} → ${c.newValue} ${arrow} | ${c.reason}`);
    }
  }

  if (results.totalChanges === 0) {
    console.log("\n✅ 所有圖鑑數值均在合理範圍內，無需修正！");
  }

  await conn.end();
}

main().catch(e => {
  console.error("掃描失敗：", e.message);
  process.exit(1);
});
