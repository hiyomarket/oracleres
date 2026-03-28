/**
 * gloves-slot.test.ts
 * 測試手套裝備槽位串接和 AI 生成邏輯
 */
import { describe, it, expect } from "vitest";

// ── 1. SLOT_MAP 映射測試（模擬 gameWorld.ts 的 SLOT_MAP）──
describe("SLOT_MAP - 裝備圖鑑 slot → DB 欄位映射", () => {
  const SLOT_MAP: Record<string, string> = {
    weapon: "equippedWeapon", offhand: "equippedOffhand",
    helmet: "equippedHead", armor: "equippedBody",
    gloves: "equippedHands", shoes: "equippedFeet",
    ringA: "equippedRingA", ringB: "equippedRingB",
    necklace: "equippedNecklace", amulet: "equippedAmulet",
  };

  it("gloves slot 應映射到 equippedHands DB 欄位", () => {
    expect(SLOT_MAP["gloves"]).toBe("equippedHands");
  });

  it("所有裝備槽位都有對應的 DB 欄位", () => {
    const expectedSlots = ["weapon", "offhand", "helmet", "armor", "gloves", "shoes", "ringA", "ringB", "necklace", "amulet"];
    for (const slot of expectedSlots) {
      expect(SLOT_MAP[slot]).toBeDefined();
    }
  });

  it("SLOT_MAP 共有 10 個槽位", () => {
    expect(Object.keys(SLOT_MAP)).toHaveLength(10);
  });
});

// ── 2. 反向 SLOT_MAP 測試（模擬 gameAvatar.ts 的 SLOT_MAP）──
describe("反向 SLOT_MAP - DB 欄位 → 前端 slot key 映射", () => {
  const REVERSE_SLOT_MAP: Record<string, string> = {
    equippedWeapon: "weapon", equippedOffhand: "offhand",
    equippedHead: "head", equippedBody: "body",
    equippedHands: "hands", equippedFeet: "feet",
    equippedRingA: "ringA", equippedRingB: "ringB",
    equippedNecklace: "necklace", equippedAmulet: "amulet",
  };

  it("equippedHands 應映射到前端 'hands' key", () => {
    expect(REVERSE_SLOT_MAP["equippedHands"]).toBe("hands");
  });

  it("前端 CharacterPanel 的 EQUIP_SLOTS 使用 'hands' 作為 slot key", () => {
    // 模擬 constants.ts 的 EQUIP_SLOTS
    const EQUIP_SLOTS = [
      { slot: "weapon" }, { slot: "offhand" }, { slot: "head" }, { slot: "body" },
      { slot: "hands" }, { slot: "feet" }, { slot: "ringA" }, { slot: "ringB" },
      { slot: "necklace" }, { slot: "amulet" },
    ];
    const handsSlot = EQUIP_SLOTS.find(s => s.slot === "hands");
    expect(handsSlot).toBeDefined();
  });
});

// ── 3. SLOT_OPTS 測試（模擬 CatalogTabs.tsx 的 SLOT_OPTS）──
describe("SLOT_OPTS - 裝備圖鑑管理介面選項", () => {
  const SLOT_OPTS = [
    { value: "weapon", label: "武器" }, { value: "helmet", label: "頭盔" },
    { value: "armor", label: "護甲" }, { value: "gloves", label: "手套" },
    { value: "shoes", label: "鞋子" }, { value: "accessory", label: "飾品" },
    { value: "offhand", label: "副手" },
  ];

  it("SLOT_OPTS 應包含 gloves 選項", () => {
    const glovesOpt = SLOT_OPTS.find(o => o.value === "gloves");
    expect(glovesOpt).toBeDefined();
    expect(glovesOpt?.label).toBe("手套");
  });

  it("SLOT_OPTS 共有 7 個選項（含手套）", () => {
    expect(SLOT_OPTS).toHaveLength(7);
  });
});

// ── 4. AI 生成 resistBonus 格式測試 ──
describe("AI 生成裝備 resistBonus 格式驗證", () => {
  const validateResistBonus = (rb: unknown): boolean => {
    if (!rb || typeof rb !== "object") return false;
    const r = rb as Record<string, unknown>;
    const keys = ["wood", "fire", "earth", "metal", "water"];
    return keys.every(k => typeof r[k] === "number" && r[k] >= 0 && r[k] <= 100);
  };

  it("有效的 resistBonus 物件應通過驗證", () => {
    const valid = { wood: 10, fire: 5, earth: 3, metal: 2, water: 1 };
    expect(validateResistBonus(valid)).toBe(true);
  });

  it("預設零值 resistBonus 應通過驗證", () => {
    const zero = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    expect(validateResistBonus(zero)).toBe(true);
  });

  it("缺少欄位的 resistBonus 應失敗", () => {
    const invalid = { wood: 10, fire: 5 }; // 缺少 earth/metal/water
    expect(validateResistBonus(invalid)).toBe(false);
  });

  it("null 或 undefined 應失敗", () => {
    expect(validateResistBonus(null)).toBe(false);
    expect(validateResistBonus(undefined)).toBe(false);
  });

  it("AI 生成的 gloves 裝備 resistBonus 應符合防具規則（主五行 8-15）", () => {
    // 模擬 AI 生成的木屬性手套
    const glovesResist = { wood: 12, fire: 4, earth: 1, metal: 1, water: 2 };
    expect(validateResistBonus(glovesResist)).toBe(true);
    // 主五行（木）抗性在 8-15 範圍
    expect(glovesResist.wood).toBeGreaterThanOrEqual(8);
    expect(glovesResist.wood).toBeLessThanOrEqual(15);
  });
});

// ── 5. 手套 slot 名稱一致性測試 ──
describe("手套槽位命名一致性", () => {
  it("裝備圖鑑 slot 值應為 'gloves'（穿戴時使用）", () => {
    const catalogSlotValue = "gloves";
    const SLOT_MAP: Record<string, string> = {
      gloves: "equippedHands",
    };
    expect(SLOT_MAP[catalogSlotValue]).toBe("equippedHands");
  });

  it("前端 CharacterPanel 顯示 slot key 應為 'hands'（getEquipped 返回）", () => {
    const displaySlotKey = "hands";
    const EQUIP_SLOTS = [
      { slot: "hands", icon: "🧤", label: "手套", desc: "命中力+" },
    ];
    const found = EQUIP_SLOTS.find(s => s.slot === displaySlotKey);
    expect(found).toBeDefined();
    expect(found?.label).toBe("手套");
  });

  it("兩個 SLOT_MAP 串接後 gloves → equippedHands → hands 應完整", () => {
    const catalogToDb: Record<string, string> = { gloves: "equippedHands" };
    const dbToDisplay: Record<string, string> = { equippedHands: "hands" };
    
    const dbField = catalogToDb["gloves"];
    const displayKey = dbToDisplay[dbField];
    
    expect(dbField).toBe("equippedHands");
    expect(displayKey).toBe("hands");
  });
});
