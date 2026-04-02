/**
 * seed-yangzhai.mjs
 * 初始化陽宅開運系統的預設資料：
 * 1. 化解物品庫（30+ 筆，依五行分類）
 * 2. modules 表插入 module_fengshui
 *
 * 執行：node scripts/seed-yangzhai.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

// 解析 MySQL URL
function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
  };
}

// ─── 化解物品資料（依五行分類，窮人友善版）───

const REMEDY_ITEMS = [
  // ═══ 木 ═══
  {
    name: "黃金葛（盆栽）",
    element: "木",
    category: "植物",
    description: "圓葉植物，化解尖角沖射最有效。生命力強，幾乎不需要照顧，放在桌角或窗台都適合。",
    priceRange: "50-200元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_wall_knife", "sha_door_rush"],
    sortOrder: 1,
  },
  {
    name: "富貴竹（水培）",
    element: "木",
    category: "植物",
    description: "向上生長，化解頭頂壓迫感。水培不需要土，放一個玻璃杯加水就能養，非常適合辦公桌。",
    priceRange: "30-100元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_beam_press"],
    sortOrder: 2,
  },
  {
    name: "綠蘿（吊盆）",
    element: "木",
    category: "植物",
    description: "淨化空氣，化解廁所相鄰的穢氣。垂掛式種植，適合放在廁所旁邊或角落。",
    priceRange: "50-150元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_toilet_adjacent", "sha_dark_corner"],
    sortOrder: 3,
  },
  {
    name: "多肉植物（小盆）",
    element: "木",
    category: "植物",
    description: "圓潤可愛，化解輕微尖角。幾乎不需要澆水，適合忙碌的上班族。",
    priceRange: "30-80元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_wall_knife"],
    sortOrder: 4,
  },
  {
    name: "薰衣草（小盆）",
    element: "木",
    category: "植物",
    description: "香氣淨化空間，改善工作情緒。放在桌上或窗台，有助於舒緩工作壓力。",
    priceRange: "50-120元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: [],
    sortOrder: 5,
  },
  {
    name: "木質桌上收納架",
    element: "木",
    category: "收納",
    description: "整理桌面雜物，木質材質帶來穩定感。化解桌面凌亂帶來的混亂氣場。",
    priceRange: "100-300元",
    isAffordable: 1,
    applicableScene: "office",
    applicableShaIds: ["sha_clutter"],
    sortOrder: 6,
  },

  // ═══ 火 ═══
  {
    name: "暖色桌燈（LED）",
    element: "火",
    category: "燈具",
    description: "補充陰暗角落的光線，化解採光不足。選暖黃色（色溫 3000K 左右），讓工作環境更有活力。",
    priceRange: "200-500元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_dark_corner"],
    sortOrder: 7,
  },
  {
    name: "LED 燈條（暖白）",
    element: "火",
    category: "燈具",
    description: "貼在桌底或書架下方補光，改善整體亮度。適合租屋族無法裝設主燈的情況。",
    priceRange: "100-250元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_dark_corner"],
    sortOrder: 8,
  },
  {
    name: "紅色小裝飾（圓形）",
    element: "火",
    category: "裝飾",
    description: "紅色代表活力與貴人，圓形化解銳角。可以是紅色圓形相框、紅色杯墊或小擺件。",
    priceRange: "30-100元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_wall_knife"],
    sortOrder: 9,
  },
  {
    name: "香薰蠟燭（暖色系）",
    element: "火",
    category: "香氛",
    description: "點燃時的火焰能量化解陰暗氣場，香氣淨化空間。選擇天然蠟燭，避免化學香精。",
    priceRange: "80-200元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_dark_corner", "sha_toilet_adjacent"],
    sortOrder: 10,
  },

  // ═══ 土 ═══
  {
    name: "陶瓷擺件（圓形）",
    element: "土",
    category: "陶瓷",
    description: "穩定氣場，化解不安定感。選擇圓潤造型，避免尖銳設計。放在桌上或書架上。",
    priceRange: "100-300元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: [],
    sortOrder: 11,
  },
  {
    name: "粗鹽小碟（天然海鹽）",
    element: "土",
    category: "淨化",
    description: "吸收穢氣，化解廁所相鄰的不良氣場。用小碟子裝粗鹽放在靠近廁所的一側，每週更換一次。",
    priceRange: "20-50元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_toilet_adjacent"],
    sortOrder: 12,
  },
  {
    name: "黃色文件夾/桌墊",
    element: "土",
    category: "文具",
    description: "黃色屬土，增強穩定感和財運。用黃色文件夾或桌墊替換現有的深色系，簡單有效。",
    priceRange: "30-80元",
    isAffordable: 1,
    applicableScene: "office",
    applicableShaIds: [],
    sortOrder: 13,
  },
  {
    name: "水晶球（小型）",
    element: "土",
    category: "水晶",
    description: "圓形水晶化解尖角，穩定氣場。選擇白水晶或黃水晶，放在桌角或面對尖角的位置。",
    priceRange: "100-400元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_wall_knife"],
    sortOrder: 14,
  },

  // ═══ 金 ═══
  {
    name: "金屬圓形時鐘",
    element: "金",
    category: "金屬",
    description: "圓形化解尖角，金屬材質增強氣場流動。掛在牆上或放在桌上，選擇簡約設計。",
    priceRange: "150-400元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_wall_knife"],
    sortOrder: 15,
  },
  {
    name: "束線帶（理線器）",
    element: "金",
    category: "收納",
    description: "整理外露電線，改善線路雜亂的氣場。選擇黑色或白色，讓桌面更整潔。",
    priceRange: "30-80元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_exposed_wires"],
    sortOrder: 16,
  },
  {
    name: "金屬名片架",
    element: "金",
    category: "文具",
    description: "金屬材質增強職場貴人運，整理名片同時改善桌面氣場。",
    priceRange: "50-150元",
    isAffordable: 1,
    applicableScene: "office",
    applicableShaIds: [],
    sortOrder: 17,
  },
  {
    name: "白色收納盒（金屬/塑膠）",
    element: "金",
    category: "收納",
    description: "整理桌面雜物，白色帶來清爽感。化解雜物堆積的混亂氣場。",
    priceRange: "50-200元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_clutter"],
    sortOrder: 18,
  },

  // ═══ 水 ═══
  {
    name: "透明玻璃水杯（常換水）",
    element: "水",
    category: "水器",
    description: "最簡單的化解方式。在桌上放一杯清水，每天換水，化解沖煞方向的不良氣場。",
    priceRange: "20-80元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_door_rush", "sha_mirror_reflect"],
    sortOrder: 19,
  },
  {
    name: "小型桌上魚缸（1-3條魚）",
    element: "水",
    category: "水器",
    description: "流動的水化解門沖和鏡煞，魚的游動帶來活絡氣場。選擇小型魚缸，養2-3條金魚即可。",
    priceRange: "200-600元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_door_rush", "sha_mirror_reflect"],
    sortOrder: 20,
  },
  {
    name: "霧面貼紙（玻璃用）",
    element: "水",
    category: "遮擋",
    description: "貼在反光玻璃或鏡面上，消除鏡煞反射。選擇磨砂款，既美觀又實用。",
    priceRange: "50-150元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_mirror_reflect"],
    sortOrder: 21,
  },
  {
    name: "空氣清新劑（天然植物萃取）",
    element: "水",
    category: "香氛",
    description: "淨化空氣，改善廁所相鄰的穢氣。選擇天然植物萃取，避免化學香精。",
    priceRange: "50-150元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_toilet_adjacent"],
    sortOrder: 22,
  },

  // ═══ 通用化解 ═══
  {
    name: "高背辦公椅",
    element: "木",
    category: "家具",
    description: "椅背高過肩膀，化解背後無靠的不安全感。這是最根本的解決方案，效果最好。",
    priceRange: "800-3000元",
    isAffordable: 0,
    applicableScene: "office",
    applicableShaIds: ["sha_back_no_support"],
    sortOrder: 23,
  },
  {
    name: "深色外套（掛椅背）",
    element: "土",
    category: "衣物",
    description: "把一件深色外套掛在椅背上，形成「靠山」效果，化解背後無靠。零成本的解決方案。",
    priceRange: "0元（現有衣物）",
    isAffordable: 1,
    applicableScene: "office",
    applicableShaIds: ["sha_back_no_support"],
    sortOrder: 24,
  },
  {
    name: "桌上小屏風（文件架）",
    element: "木",
    category: "文具",
    description: "放在桌上擋住門沖直射，也可以用較高的文件架代替。化解正對門口的不良氣場。",
    priceRange: "100-300元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_door_rush"],
    sortOrder: 25,
  },
  {
    name: "圓形相框（家人照片）",
    element: "土",
    category: "裝飾",
    description: "圓形化解尖角，放家人照片增強靠山運。放在面對尖角的位置，既實用又有情感意義。",
    priceRange: "50-200元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_wall_knife"],
    sortOrder: 26,
  },
  {
    name: "仙人掌移位（移到窗台朝外）",
    element: "木",
    category: "植物",
    description: "把仙人掌移到窗台，讓尖刺朝外而不是朝向自己。零成本，只需要移動位置。",
    priceRange: "0元（移動現有植物）",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_sharp_plants"],
    sortOrder: 27,
  },
  {
    name: "垃圾桶（桌邊）",
    element: "金",
    category: "收納",
    description: "養成隨手丟垃圾的習慣，保持桌面整潔。化解雜物堆積的混亂氣場。",
    priceRange: "50-150元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_clutter"],
    sortOrder: 28,
  },
  {
    name: "線槽（電線整理）",
    element: "金",
    category: "收納",
    description: "把電線收進線槽，讓桌面下方整潔。化解線路外露的雜亂氣場。",
    priceRange: "50-150元",
    isAffordable: 1,
    applicableScene: "both",
    applicableShaIds: ["sha_exposed_wires"],
    sortOrder: 29,
  },
  {
    name: "靠墊（椅背用）",
    element: "土",
    category: "家具",
    description: "在椅背放一個厚實靠墊，增加背後支撐感，化解背後無靠的不安全感。",
    priceRange: "100-300元",
    isAffordable: 1,
    applicableScene: "office",
    applicableShaIds: ["sha_back_no_support"],
    sortOrder: 30,
  },
];

async function main() {
  const conn = await createConnection(parseDbUrl(DB_URL));
  console.log("✅ Connected to DB");

  // 1. 插入化解物品
  console.log("\n📦 Seeding remedy items...");
  let remedyCreated = 0;
  let remedySkipped = 0;
  for (const item of REMEDY_ITEMS) {
    const [existing] = await conn.execute(
      "SELECT id FROM remedy_items WHERE name = ?",
      [item.name]
    );
    if (existing.length > 0) {
      remedySkipped++;
      continue;
    }
    await conn.execute(
      `INSERT INTO remedy_items
        (name, element, category, description, price_range, is_affordable, applicable_scene, applicable_sha_ids, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        item.name,
        item.element,
        item.category,
        item.description || null,
        item.priceRange || null,
        item.isAffordable,
        item.applicableScene,
        JSON.stringify(item.applicableShaIds || []),
        item.sortOrder,
        Date.now(),
        Date.now(),
      ]
    );
    remedyCreated++;
    console.log(`  ✓ ${item.name} (${item.element})`);
  }
  console.log(`  → Created: ${remedyCreated}, Skipped: ${remedySkipped}`);

  // 2. 插入 module_fengshui
  console.log("\n🧩 Seeding module_fengshui...");
  const [existingModule] = await conn.execute(
    "SELECT id FROM modules WHERE id = 'module_fengshui'",
    []
  );
  if (existingModule.length > 0) {
    console.log("  → module_fengshui already exists, skipping");
  } else {
    // 取得最大 sortOrder
    const [maxSort] = await conn.execute(
      "SELECT MAX(sortOrder) as maxSort FROM modules",
      []
    );
    const nextSort = (maxSort[0]?.maxSort || 0) + 1;
    await conn.execute(
      `INSERT INTO modules
        (id, name, description, icon, category, sortOrder, containedFeatures, navPath, isActive, isCentral, displayLocation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "module_fengshui",
        "陽宅開運",
        "辦公室和居家風水診斷，每日方位吉凶分析，座位環境改善建議",
        "🏠",
        "addon",
        nextSort,
        JSON.stringify(["office_fengshui", "daily_direction", "form_sha"]),
        "/office-fengshui",
        1,
        0,
        "main",
      ]
    );
    console.log("  ✓ module_fengshui created");
  }

  await conn.end();
  console.log("\n🎉 Seed completed!");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
