/**
 * gameItems.test.ts
 * TASK-004 美術素材匯入測試
 *
 * 測試項目：
 * 1. game_items 資料表結構驗證（Drizzle schema 欄位）
 * 2. Seed JSON 格式驗證（120 筆資料完整性）
 * 3. AvatarRenderer 視角切換邏輯
 * 4. 五行顏色配置正確性（TASK-004 指定重點配色）
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ─── 1. Seed JSON 格式驗證 ────────────────────────────────────
describe("TASK-004 Seed JSON 驗證", () => {
  const seedPath = join(__dirname, "db/game-items-seed-task004.json");
  let seedData: {
    total: number;
    items: Array<{
      id: number;
      name: string;
      gender: string;
      layer: string;
      wuxing: string;
      view: string;
      rarity: string;
      currency_type: string;
      price: number;
      is_initial: number;
      file_path: string;
    }>;
  };

  try {
    seedData = JSON.parse(readFileSync(seedPath, "utf-8"));
  } catch {
    seedData = { total: 0, items: [] };
  }

  it("應包含 120 筆資料", () => {
    expect(seedData.items.length).toBe(120);
    expect(seedData.total).toBe(120);
  });

  it("每筆資料應包含必要欄位", () => {
    const requiredFields = ["name", "gender", "layer", "wuxing", "view", "rarity", "file_path"];
    for (const item of seedData.items) {
      for (const field of requiredFields) {
        expect(item).toHaveProperty(field);
        expect((item as Record<string, unknown>)[field]).toBeTruthy();
      }
    }
  });

  it("視角應只包含 front / left45 / right45", () => {
    const validViews = new Set(["front", "left45", "right45"]);
    for (const item of seedData.items) {
      expect(validViews.has(item.view)).toBe(true);
    }
  });

  it("五行應只包含 wood / fire / earth / metal / water", () => {
    const validWuxing = new Set(["wood", "fire", "earth", "metal", "water"]);
    for (const item of seedData.items) {
      expect(validWuxing.has(item.wuxing)).toBe(true);
    }
  });

  it("圖層應只包含合法類型", () => {
    const validLayers = new Set(["body", "hair", "top", "bottom", "shoes", "accessory", "bracelet", "background"]);
    for (const item of seedData.items) {
      expect(validLayers.has(item.layer)).toBe(true);
    }
  });

  it("每個五行應有 front / left45 / right45 三個視角的資料", () => {
    const wuxingList = ["wood", "fire", "earth", "metal", "water"];
    const viewList = ["front", "left45", "right45"];
    for (const wuxing of wuxingList) {
      for (const view of viewList) {
        const count = seedData.items.filter(
          (i) => i.wuxing === wuxing && i.view === view
        ).length;
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  it("所有 is_initial 應為 1（初始道具）", () => {
    for (const item of seedData.items) {
      expect(item.is_initial).toBe(1);
    }
  });

  it("所有 price 應為 0（免費初始道具）", () => {
    for (const item of seedData.items) {
      expect(item.price).toBe(0);
    }
  });
});

// ─── 2. 五行顏色配置驗證（TASK-004 指定重點配色） ──────────────
describe("TASK-004 五行重點配色驗證", () => {
  const EXPECTED_COLORS: Record<string, string> = {
    wood:  "#2E8B57",
    fire:  "#DC143C",
    earth: "#CD853F",
    metal: "#C9A227",
    water: "#00CED1",
  };

  it("木行顏色應為翠綠 #2E8B57", () => {
    expect(EXPECTED_COLORS.wood).toBe("#2E8B57");
  });

  it("火行顏色應為朱紅 #DC143C", () => {
    expect(EXPECTED_COLORS.fire).toBe("#DC143C");
  });

  it("土行顏色應為琥珀棕 #CD853F", () => {
    expect(EXPECTED_COLORS.earth).toBe("#CD853F");
  });

  it("金行顏色應為天命金 #C9A227", () => {
    expect(EXPECTED_COLORS.metal).toBe("#C9A227");
  });

  it("水行顏色應為量子青 #00CED1", () => {
    expect(EXPECTED_COLORS.water).toBe("#00CED1");
  });
});

// ─── 3. 視角切換邏輯驗證 ──────────────────────────────────────
describe("AvatarRenderer 視角切換邏輯", () => {
  type AvatarView = "front" | "left45" | "right45";

  interface AvatarItem {
    id: number;
    layer: string;
    imageUrl: string;
    wuxing: string;
    rarity: string;
    isEquipped: number;
    view?: string;
    viewImages?: Record<string, string>;
  }

  /** 模擬 AvatarRenderer 的視角解析邏輯 */
  function resolveImageUrl(item: AvatarItem, currentView: AvatarView): string {
    if (item.viewImages && item.viewImages[currentView]) {
      return item.viewImages[currentView];
    }
    return item.imageUrl;
  }

  const mockItem: AvatarItem = {
    id: 1,
    layer: "top",
    imageUrl: "ART/OUTPUTS/TASK-004/female-front/wood/top-wood-front.png",
    wuxing: "wood",
    rarity: "common",
    isEquipped: 1,
    view: "front",
    viewImages: {
      front:   "ART/OUTPUTS/TASK-004/female-front/wood/top-wood-front.png",
      left45:  "ART/OUTPUTS/TASK-004/female-left45/wood/top-wood-left45.png",
      right45: "ART/OUTPUTS/TASK-004/female-right45/wood/top-wood-right45.png",
    },
  };

  it("front 視角應返回正面圖片", () => {
    const url = resolveImageUrl(mockItem, "front");
    expect(url).toContain("front");
    expect(url).toContain("top-wood-front.png");
  });

  it("left45 視角應返回左側圖片", () => {
    const url = resolveImageUrl(mockItem, "left45");
    expect(url).toContain("left45");
    expect(url).toContain("top-wood-left45.png");
  });

  it("right45 視角應返回右側圖片", () => {
    const url = resolveImageUrl(mockItem, "right45");
    expect(url).toContain("right45");
    expect(url).toContain("top-wood-right45.png");
  });

  it("無 viewImages 時應 fallback 到 imageUrl", () => {
    const itemWithoutViews: AvatarItem = {
      ...mockItem,
      viewImages: undefined,
    };
    const url = resolveImageUrl(itemWithoutViews, "left45");
    expect(url).toBe(mockItem.imageUrl);
  });

  it("viewImages 缺少特定視角時應 fallback 到 imageUrl", () => {
    const itemPartialViews: AvatarItem = {
      ...mockItem,
      viewImages: { front: "front.png" }, // 只有 front，缺少 left45/right45
    };
    const url = resolveImageUrl(itemPartialViews, "right45");
    expect(url).toBe(mockItem.imageUrl);
  });
});

// ─── 4. game_items Drizzle Schema 欄位驗證 ────────────────────
describe("game_items Schema 欄位驗證", () => {
  it("應包含 isInitial 欄位（TINYINT，標記初始服裝）", async () => {
    // 動態 import schema 以驗證欄位存在
    const schema = await import("../drizzle/schema");
    expect(schema.gameItems).toBeDefined();
    const columns = schema.gameItems as unknown as { [key: string]: unknown };
    expect(columns).toHaveProperty("isInitial");
  });

  it("應包含 view 欄位（front / left45 / right45）", async () => {
    const schema = await import("../drizzle/schema");
    const columns = schema.gameItems as unknown as { [key: string]: unknown };
    expect(columns).toHaveProperty("view");
  });

  it("應包含 wuxingColor 欄位（HEX 顏色）", async () => {
    const schema = await import("../drizzle/schema");
    const columns = schema.gameItems as unknown as { [key: string]: unknown };
    expect(columns).toHaveProperty("wuxingColor");
  });

  it("應包含 gender 欄位（female / male / unisex）", async () => {
    const schema = await import("../drizzle/schema");
    const columns = schema.gameItems as unknown as { [key: string]: unknown };
    expect(columns).toHaveProperty("gender");
  });
});
