/**
 * WBC 2026 熱身賽 / 體驗賽賽程匯入腳本
 * 資料來源：WBC 官方賽程 + 台灣媒體報導（2026年3月）
 *
 * 熱身賽（Exhibition Games）：
 *   - 中華台北 vs 日本 (2026-03-05 18:00 台灣時間)
 *   - 中華台北 vs 韓國 (2026-03-06 18:00 台灣時間)
 *
 * 正式賽 C 組（台中洲際棒球場）：
 *   - 2026-03-08 ~ 2026-03-12
 *
 * 注意：比賽時間以台灣時間（UTC+8）為準，存入 UTC
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

// 台灣時間 → UTC 轉換（UTC+8，所以減8小時）
function twToUtc(twDateStr) {
  // twDateStr: "2026-03-05 18:00"
  const [date, time] = twDateStr.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  // 台灣時間 = UTC+8，存入 UTC 需減 8 小時
  return new Date(Date.UTC(y, m - 1, d, h - 8, min));
}

const matches = [
  // ─── 熱身賽 ───
  {
    teamA: "中華台北",
    teamAFlag: "🇹🇼",
    teamB: "日本",
    teamBFlag: "🇯🇵",
    matchTime: twToUtc("2026-03-05 18:00"),
    venue: "台中洲際棒球場",
    round: "熱身賽",
    status: "pending",
    description: "WBC 2026 熱身賽 - 中華台北 vs 日本",
  },
  {
    teamA: "中華台北",
    teamAFlag: "🇹🇼",
    teamB: "韓國",
    teamBFlag: "🇰🇷",
    matchTime: twToUtc("2026-03-06 18:00"),
    venue: "台中洲際棒球場",
    round: "熱身賽",
    status: "pending",
    description: "WBC 2026 熱身賽 - 中華台北 vs 韓國",
  },
  // ─── C 組正式賽（台中洲際棒球場）───
  {
    teamA: "中華台北",
    teamAFlag: "🇹🇼",
    teamB: "巴拿馬",
    teamBFlag: "🇵🇦",
    matchTime: twToUtc("2026-03-08 12:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 中華台北 vs 巴拿馬",
  },
  {
    teamA: "日本",
    teamAFlag: "🇯🇵",
    teamB: "韓國",
    teamBFlag: "🇰🇷",
    matchTime: twToUtc("2026-03-08 18:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 日本 vs 韓國",
  },
  {
    teamA: "中華台北",
    teamAFlag: "🇹🇼",
    teamB: "捷克",
    teamBFlag: "🇨🇿",
    matchTime: twToUtc("2026-03-09 12:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 中華台北 vs 捷克",
  },
  {
    teamA: "日本",
    teamAFlag: "🇯🇵",
    teamB: "巴拿馬",
    teamBFlag: "🇵🇦",
    matchTime: twToUtc("2026-03-09 18:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 日本 vs 巴拿馬",
  },
  {
    teamA: "韓國",
    teamAFlag: "🇰🇷",
    teamB: "捷克",
    teamBFlag: "🇨🇿",
    matchTime: twToUtc("2026-03-10 12:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 韓國 vs 捷克",
  },
  {
    teamA: "中華台北",
    teamAFlag: "🇹🇼",
    teamB: "日本",
    teamBFlag: "🇯🇵",
    matchTime: twToUtc("2026-03-10 18:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 中華台北 vs 日本",
  },
  {
    teamA: "巴拿馬",
    teamAFlag: "🇵🇦",
    teamB: "捷克",
    teamBFlag: "🇨🇿",
    matchTime: twToUtc("2026-03-11 12:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 巴拿馬 vs 捷克",
  },
  {
    teamA: "韓國",
    teamAFlag: "🇰🇷",
    teamB: "中華台北",
    teamBFlag: "🇹🇼",
    matchTime: twToUtc("2026-03-11 18:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 韓國 vs 中華台北",
  },
  {
    teamA: "日本",
    teamAFlag: "🇯🇵",
    teamB: "捷克",
    teamBFlag: "🇨🇿",
    matchTime: twToUtc("2026-03-12 12:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 日本 vs 捷克",
  },
  {
    teamA: "韓國",
    teamAFlag: "🇰🇷",
    teamB: "巴拿馬",
    teamBFlag: "🇵🇦",
    matchTime: twToUtc("2026-03-12 18:00"),
    venue: "台中洲際棒球場",
    round: "C組 第一輪",
    status: "pending",
    description: "WBC 2026 C組 - 韓國 vs 巴拿馬",
  },
];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log("Connected to database.");

  // 先查詢現有賽事，避免重複匯入
  const [existing] = await conn.query("SELECT teamA, teamB, matchTime FROM wbc_matches");
  const existingSet = new Set(
    existing.map(r => `${r.teamA}|${r.teamB}|${new Date(r.matchTime).toISOString()}`)
  );

  let inserted = 0;
  let skipped = 0;

  for (const m of matches) {
    const key = `${m.teamA}|${m.teamB}|${m.matchTime.toISOString()}`;
    if (existingSet.has(key)) {
      console.log(`  SKIP: ${m.teamA} vs ${m.teamB} (${m.matchTime.toISOString()})`);
      skipped++;
      continue;
    }
    await conn.execute(
      `INSERT INTO wbc_matches (teamA, teamB, teamAFlag, teamBFlag, matchTime, venue, poolGroup, status, rateA, rateB, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2.0, 2.0, NOW(), NOW())`,
      [
        m.teamA,
        m.teamB,
        m.teamAFlag,
        m.teamBFlag,
        m.matchTime,
        m.venue,
        m.round,  // poolGroup 用來存儲賽程分組名稱
        m.status,
      ]
    );
    console.log(`  INSERT: ${m.teamA} vs ${m.teamB} (${m.matchTime.toISOString()})`);
    inserted++;
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
