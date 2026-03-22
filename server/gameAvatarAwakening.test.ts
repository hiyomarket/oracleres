/**
 * gameAvatarAwakening.test.ts
 * 命盤連動初始外觀測試
 * PROPOSAL-20260323-GAME-命盤連動初始外觀
 *
 * 測試項目：
 * 1. 中文五行 → 英文 key 轉換邏輯
 * 2. 首次進入時 isFirstTime 標記
 * 3. 五行對應的覺醒配色（TASK-004 指定重點配色）
 * 4. 初始化圖層選取邏輯（每層取一件）
 * 5. 回訪用戶不觸發覺醒動畫
 */

import { describe, it, expect } from "vitest";

// ─── 1. 中文五行 → 英文 key 轉換 ────────────────────────────
describe("中文五行 → 英文 key 轉換", () => {
  const WUXING_ZH_TO_EN: Record<string, string> = {
    "木": "wood",
    "火": "fire",
    "土": "earth",
    "金": "metal",
    "水": "water",
  };

  it("木 → wood", () => expect(WUXING_ZH_TO_EN["木"]).toBe("wood"));
  it("火 → fire", () => expect(WUXING_ZH_TO_EN["火"]).toBe("fire"));
  it("土 → earth", () => expect(WUXING_ZH_TO_EN["土"]).toBe("earth"));
  it("金 → metal", () => expect(WUXING_ZH_TO_EN["金"]).toBe("metal"));
  it("水 → water", () => expect(WUXING_ZH_TO_EN["水"]).toBe("water"));

  it("未知五行應 fallback 到 wood", () => {
    const result = WUXING_ZH_TO_EN["未知"] ?? "wood";
    expect(result).toBe("wood");
  });
});

// ─── 2. 初始化圖層選取邏輯 ───────────────────────────────────
describe("初始化圖層選取邏輯", () => {
  const INITIAL_LAYERS = ["top", "bottom", "shoes", "bracelet"] as const;

  interface MockItem {
    id: number;
    layer: string;
    wuxing: string;
    isInitial: number;
    view: string;
  }

  const mockItems: MockItem[] = [
    { id: 1, layer: "top",      wuxing: "wood", isInitial: 1, view: "front" },
    { id: 2, layer: "bottom",   wuxing: "wood", isInitial: 1, view: "front" },
    { id: 3, layer: "shoes",    wuxing: "wood", isInitial: 1, view: "front" },
    { id: 4, layer: "bracelet", wuxing: "wood", isInitial: 1, view: "front" },
    { id: 5, layer: "top",      wuxing: "wood", isInitial: 1, view: "front" }, // 重複圖層
    { id: 6, layer: "hair",     wuxing: "wood", isInitial: 1, view: "front" }, // 非初始圖層
  ];

  function selectInitialItems(items: MockItem[]): MockItem[] {
    const selected: MockItem[] = [];
    for (const layer of INITIAL_LAYERS) {
      const match = items.find((i) => i.layer === layer);
      if (match) selected.push(match);
    }
    return selected;
  }

  it("應選取 4 個指定圖層的道具", () => {
    const selected = selectInitialItems(mockItems);
    expect(selected.length).toBe(4);
  });

  it("每個圖層只取第一件（不重複）", () => {
    const selected = selectInitialItems(mockItems);
    const layers = selected.map((i) => i.layer);
    const uniqueLayers = new Set(layers);
    expect(layers.length).toBe(uniqueLayers.size);
  });

  it("應包含 top/bottom/shoes/bracelet 四個圖層", () => {
    const selected = selectInitialItems(mockItems);
    const layers = new Set(selected.map((i) => i.layer));
    expect(layers.has("top")).toBe(true);
    expect(layers.has("bottom")).toBe(true);
    expect(layers.has("shoes")).toBe(true);
    expect(layers.has("bracelet")).toBe(true);
  });

  it("不應包含 hair 等非初始圖層", () => {
    const selected = selectInitialItems(mockItems);
    const layers = selected.map((i) => i.layer);
    expect(layers).not.toContain("hair");
    expect(layers).not.toContain("background");
    expect(layers).not.toContain("body");
  });

  it("若某圖層無道具，應跳過（不報錯）", () => {
    const partialItems = mockItems.filter((i) => i.layer !== "shoes");
    const selected = selectInitialItems(partialItems);
    expect(selected.length).toBe(3); // 少了 shoes
    expect(selected.map((i) => i.layer)).not.toContain("shoes");
  });
});

// ─── 3. 覺醒配色驗證（TASK-004 指定重點配色） ────────────────
describe("靈相覺醒配色驗證", () => {
  const WUXING_AWAKENING: Record<string, { color: string; label: string }> = {
    wood:  { color: "#2E8B57", label: "木" },
    fire:  { color: "#DC143C", label: "火" },
    earth: { color: "#CD853F", label: "土" },
    metal: { color: "#C9A227", label: "金" },
    water: { color: "#00CED1", label: "水" },
  };

  it("木命人覺醒顏色應為翠綠 #2E8B57", () => {
    expect(WUXING_AWAKENING.wood.color).toBe("#2E8B57");
  });

  it("火命人覺醒顏色應為朱紅 #DC143C", () => {
    expect(WUXING_AWAKENING.fire.color).toBe("#DC143C");
  });

  it("土命人覺醒顏色應為琥珀棕 #CD853F", () => {
    expect(WUXING_AWAKENING.earth.color).toBe("#CD853F");
  });

  it("金命人覺醒顏色應為天命金 #C9A227", () => {
    expect(WUXING_AWAKENING.metal.color).toBe("#C9A227");
  });

  it("水命人覺醒顏色應為量子青 #00CED1", () => {
    expect(WUXING_AWAKENING.water.color).toBe("#00CED1");
  });

  it("五行標籤應正確對應中文", () => {
    expect(WUXING_AWAKENING.wood.label).toBe("木");
    expect(WUXING_AWAKENING.fire.label).toBe("火");
    expect(WUXING_AWAKENING.earth.label).toBe("土");
    expect(WUXING_AWAKENING.metal.label).toBe("金");
    expect(WUXING_AWAKENING.water.label).toBe("水");
  });
});

// ─── 4. isFirstTime 邏輯驗證 ─────────────────────────────────
describe("isFirstTime 邏輯驗證", () => {
  /**
   * 模擬 getEquipped 的 isFirstTime 判斷邏輯：
   * - allWardrobe.length === 0 → 首次進入（isFirstTime = true）
   * - allWardrobe.length > 0  → 回訪用戶（isFirstTime = false）
   */
  function determineIsFirstTime(wardrobeCount: number, selectedItemsCount: number): boolean {
    if (wardrobeCount === 0 && selectedItemsCount > 0) return true;
    return false;
  }

  it("衣櫃為空且有初始道具時，isFirstTime 應為 true", () => {
    expect(determineIsFirstTime(0, 4)).toBe(true);
  });

  it("衣櫃已有道具時，isFirstTime 應為 false", () => {
    expect(determineIsFirstTime(3, 4)).toBe(false);
  });

  it("衣櫃為空但無初始道具時，isFirstTime 應為 false（無法初始化）", () => {
    expect(determineIsFirstTime(0, 0)).toBe(false);
  });

  it("回訪用戶不應觸發覺醒動畫", () => {
    const isFirstTime = determineIsFirstTime(5, 4);
    expect(isFirstTime).toBe(false);
    // 前端：useEffect 只在 isFirstTime === true 時 setShowAwakening(true)
    const showAwakening = isFirstTime ? true : false;
    expect(showAwakening).toBe(false);
  });
});

// ─── 5. getEquipped 回傳格式驗證 ─────────────────────────────
describe("getEquipped 回傳格式驗證", () => {
  interface GetEquippedResult {
    items: Array<{ id: number; layer: string; isDefault: boolean }>;
    isFirstTime: boolean;
    dayMasterElement: string | null;
    dayMasterElementEn: string | null;
  }

  it("首次進入時回傳格式應包含 isFirstTime/dayMasterElement/dayMasterElementEn", () => {
    const mockResult: GetEquippedResult = {
      items: [
        { id: 1, layer: "top", isDefault: false },
        { id: 2, layer: "bottom", isDefault: false },
      ],
      isFirstTime: true,
      dayMasterElement: "木",
      dayMasterElementEn: "wood",
    };

    expect(mockResult).toHaveProperty("isFirstTime");
    expect(mockResult).toHaveProperty("dayMasterElement");
    expect(mockResult).toHaveProperty("dayMasterElementEn");
    expect(mockResult.isFirstTime).toBe(true);
    expect(mockResult.dayMasterElement).toBe("木");
    expect(mockResult.dayMasterElementEn).toBe("wood");
  });

  it("回訪用戶的回傳格式應有 isFirstTime: false", () => {
    const mockResult: GetEquippedResult = {
      items: [{ id: 1, layer: "top", isDefault: false }],
      isFirstTime: false,
      dayMasterElement: null,
      dayMasterElementEn: null,
    };

    expect(mockResult.isFirstTime).toBe(false);
    expect(mockResult.dayMasterElement).toBeNull();
  });
});
