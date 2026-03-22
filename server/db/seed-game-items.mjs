/**
 * seed-game-items.mjs
 * 將 TASK-004 的 120 筆服裝部件資料寫入 game_items 資料表
 *
 * 執行方式：node server/db/seed-game-items.mjs
 */

import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 讀取 Seed JSON（從 repo 複製過來的路徑）
const SEED_JSON_PATH = join(__dirname, "game-items-seed-task004.json");
const seedData = JSON.parse(readFileSync(SEED_JSON_PATH, "utf-8"));

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌ DATABASE_URL 環境變數未設定");
  process.exit(1);
}

// 解析 MySQL URL
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error("無法解析 DATABASE_URL: " + url);
  const dbPart = match[5];
  const database = dbPart.split("?")[0];
  // TiDB Cloud 需要 SSL
  const sslParam = dbPart.includes("ssl=");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database,
    ssl: sslParam ? { rejectUnauthorized: true } : undefined,
  };
}

async function seed() {
  const config = parseDbUrl(DB_URL);
  const conn = await createConnection({ ...config, multipleStatements: false });

  console.log(`✅ 連線成功，準備寫入 ${seedData.items.length} 筆資料...`);

  // 先清空現有 TASK-004 種子資料（避免重複）
  await conn.execute("DELETE FROM game_items WHERE isInitial = 1");
  console.log("🗑️  已清除舊的初始道具資料");

  let inserted = 0;
  for (const item of seedData.items) {
    // 使用 file_path 作為 imageUrl（cdn_url 為空時）
    const imageUrl = item.cdn_url || item.file_path;

    await conn.execute(
      `INSERT INTO game_items
        (name, gender, layer, view, wuxing, wuxingColor, rarity, currencyType, price, isInitial, isOnSale, imageUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.name,
        item.gender,
        item.layer,
        item.view,
        item.wuxing,
        item.wuxing_color || "#888888",
        item.rarity || "common",
        item.currency_type || "initial",
        item.price ?? 0,
        item.is_initial ?? 1,
        item.is_on_sale ?? 0,
        imageUrl,
      ]
    );
    inserted++;
  }

  await conn.end();
  console.log(`✅ 成功寫入 ${inserted} 筆服裝部件資料到 game_items`);
}

seed().catch((err) => {
  console.error("❌ Seed 失敗：", err.message);
  process.exit(1);
});
