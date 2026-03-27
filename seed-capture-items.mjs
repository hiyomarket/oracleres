/**
 * 建立捕捉球道具（獸魂甕系列）
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const captureItems = [
  {
    item_id: "capture_normal",
    name: "獸魂甕",
    effect: "基礎捕捉道具，用於封印重傷的野生靈獸。捕捉倍率 ×1.0",
    category: "consumable",
    rarity: "common",
    wuxing: "earth",
    shop_price: 100,
    value_score: 25,
    quality_grade: "C",
    use_effect: JSON.stringify({ type: "capture", captureItemType: "normal", multiplier: 1.0, description: "基礎捕捉球，捕捉倍率 ×1.0" }),
  },
  {
    item_id: "capture_silver",
    name: "秘銀獸魂甕",
    effect: "以秘銀鍛造的高級捕捉道具，提升捕捉成功率。捕捉倍率 ×1.15",
    category: "consumable",
    rarity: "rare",
    wuxing: "metal",
    shop_price: 500,
    value_score: 125,
    quality_grade: "B",
    use_effect: JSON.stringify({ type: "capture", captureItemType: "silver", multiplier: 1.15, description: "秘銀捕捉球，捕捉倍率 ×1.15" }),
  },
  {
    item_id: "capture_starlight",
    name: "星輝獸魂甕",
    effect: "注入星輝之力的珍稀捕捉道具，大幅提升捕捉成功率。捕捉倍率 ×1.30",
    category: "consumable",
    rarity: "epic",
    wuxing: "water",
    shop_price: 2000,
    value_score: 500,
    quality_grade: "A",
    use_effect: JSON.stringify({ type: "capture", captureItemType: "starlight", multiplier: 1.30, description: "星輝捕捉球，捕捉倍率 ×1.30" }),
  },
  {
    item_id: "capture_destiny",
    name: "天命獸魂甕",
    effect: "蘊含天命之力的傳說捕捉道具，極大幅提升捕捉成功率。捕捉倍率 ×1.50",
    category: "consumable",
    rarity: "legendary",
    wuxing: "fire",
    shop_price: 10000,
    value_score: 2500,
    quality_grade: "S",
    use_effect: JSON.stringify({ type: "capture", captureItemType: "destiny", multiplier: 1.50, description: "天命捕捉球，捕捉倍率 ×1.50" }),
  },
];

for (const item of captureItems) {
  const [existing] = await conn.query("SELECT id FROM game_item_catalog WHERE item_id = ?", [item.item_id]);
  if (existing.length > 0) {
    console.log(`[SKIP] ${item.name} 已存在`);
    continue;
  }
  await conn.query(
    `INSERT INTO game_item_catalog (item_id, name, effect, category, rarity, wuxing, shop_price, value_score, quality_grade, stack_limit, tradeable, in_normal_shop, in_spirit_shop, usable_in_battle, is_active, use_effect, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 99, 1, 1, 0, 0, 1, ?, ?)`,
    [item.item_id, item.name, item.effect, item.category, item.rarity, item.wuxing, item.shop_price, item.value_score, item.quality_grade, item.use_effect, Date.now()]
  );
  console.log(`[OK] ${item.name} 已建立`);
}

await conn.end();
console.log("✅ 捕捉球道具種子資料完成");
