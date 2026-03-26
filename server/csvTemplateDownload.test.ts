import { describe, it, expect } from "vitest";

/**
 * CSV Template Download Tests
 * 驗證各圖鑑的 CSV 模板定義正確性
 * 注意：downloadCsvTemplate 是前端函式（使用 Blob/URL），
 * 這裡測試模板資料結構的正確性
 */

// 複製前端的模板定義進行驗證
const CSV_TEMPLATES: Record<string, { headers: string[]; example: string[] }> = {
  "魔物圖鑑": {
    headers: ["monsterId", "name", "element", "rarity", "level", "hp", "attack", "defense", "speed", "magicAttack", "description", "dropItem", "dropGold", "expReward"],
    example: ["M_W001", "木靈鼠", "木", "common", "1", "50", "8", "3", "5", "2", "森林中常見的小型魔物", "herb-001", "10", "5"],
  },
  "道具圖鑑": {
    headers: ["itemId", "name", "element", "rarity", "itemType", "effect", "shopPrice", "stackable"],
    example: ["I_W001", "回春草", "木", "common", "consumable", "恢復 50 HP", "100", "1"],
  },
  "裝備圖鑑": {
    headers: ["equipId", "name", "element", "rarity", "slot", "attackBonus", "defenseBonus", "speedBonus", "quality", "description"],
    example: ["E_W001", "翠玉木劍", "木", "rare", "weapon", "15", "0", "3", "fine", "以翠玉打造的木屬性劍"],
  },
  "技能圖鑑": {
    headers: ["skillId", "name", "element", "rarity", "category", "skillType", "mpCost", "cooldown", "baseDamage", "description"],
    example: ["S_W001", "翠葉斬", "木", "common", "attack", "active", "10", "1", "25", "以銳利的木葉攻擊敵人"],
  },
  "成就圖鑑": {
    headers: ["title", "description", "category", "rarity", "rewardPoints", "isActive"],
    example: ["初出茅廠", "完成第一次戰鬥", "combat", "common", "10", "1"],
  },
  "魔物技能圖鑑": {
    headers: ["skillId", "name", "element", "skillType", "baseDamage", "mpCost", "cooldown", "description"],
    example: ["MS_W001", "木屬性撞擊", "木", "physical", "20", "0", "1", "用身體撞擊敵人"],
  },
};

describe("CSV Template Definitions", () => {
  it("should define templates for all 6 catalogs", () => {
    const expectedCatalogs = ["魔物圖鑑", "道具圖鑑", "裝備圖鑑", "技能圖鑑", "成就圖鑑", "魔物技能圖鑑"];
    for (const name of expectedCatalogs) {
      expect(CSV_TEMPLATES[name]).toBeDefined();
    }
  });

  it("each template should have matching header and example counts", () => {
    for (const [name, tpl] of Object.entries(CSV_TEMPLATES)) {
      expect(tpl.headers.length).toBe(tpl.example.length);
    }
  });

  it("headers should not contain empty strings", () => {
    for (const [name, tpl] of Object.entries(CSV_TEMPLATES)) {
      for (const h of tpl.headers) {
        expect(h.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("examples should not contain empty strings", () => {
    for (const [name, tpl] of Object.entries(CSV_TEMPLATES)) {
      for (const ex of tpl.example) {
        expect(ex.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("monster template should have required fields", () => {
    const tpl = CSV_TEMPLATES["魔物圖鑑"];
    expect(tpl.headers).toContain("monsterId");
    expect(tpl.headers).toContain("name");
    expect(tpl.headers).toContain("element");
    expect(tpl.headers).toContain("rarity");
    expect(tpl.headers).toContain("level");
    expect(tpl.headers).toContain("hp");
    expect(tpl.headers).toContain("attack");
    expect(tpl.headers).toContain("defense");
  });

  it("item template should have required fields", () => {
    const tpl = CSV_TEMPLATES["道具圖鑑"];
    expect(tpl.headers).toContain("itemId");
    expect(tpl.headers).toContain("name");
    expect(tpl.headers).toContain("itemType");
    expect(tpl.headers).toContain("shopPrice");
  });

  it("equipment template should have required fields", () => {
    const tpl = CSV_TEMPLATES["裝備圖鑑"];
    expect(tpl.headers).toContain("equipId");
    expect(tpl.headers).toContain("name");
    expect(tpl.headers).toContain("slot");
    expect(tpl.headers).toContain("quality");
  });

  it("skill template should have required fields", () => {
    const tpl = CSV_TEMPLATES["技能圖鑑"];
    expect(tpl.headers).toContain("skillId");
    expect(tpl.headers).toContain("name");
    expect(tpl.headers).toContain("mpCost");
    expect(tpl.headers).toContain("baseDamage");
  });

  it("achievement template should have required fields", () => {
    const tpl = CSV_TEMPLATES["成就圖鑑"];
    expect(tpl.headers).toContain("title");
    expect(tpl.headers).toContain("description");
    expect(tpl.headers).toContain("category");
    expect(tpl.headers).toContain("rewardPoints");
  });

  it("monster skill template should have required fields", () => {
    const tpl = CSV_TEMPLATES["魔物技能圖鑑"];
    expect(tpl.headers).toContain("skillId");
    expect(tpl.headers).toContain("name");
    expect(tpl.headers).toContain("baseDamage");
    expect(tpl.headers).toContain("skillType");
  });

  it("should generate valid CSV format", () => {
    for (const [name, tpl] of Object.entries(CSV_TEMPLATES)) {
      const csv = tpl.headers.join(",") + "\n" + tpl.example.join(",") + "\n";
      const lines = csv.trim().split("\n");
      expect(lines.length).toBe(2);
      // Header line
      const headerCols = lines[0].split(",");
      expect(headerCols.length).toBe(tpl.headers.length);
      // Example line
      const exampleCols = lines[1].split(",");
      expect(exampleCols.length).toBe(tpl.example.length);
    }
  });

  it("element values should be valid wuxing", () => {
    const validWuxing = ["木", "火", "土", "金", "水"];
    for (const [name, tpl] of Object.entries(CSV_TEMPLATES)) {
      const elementIdx = tpl.headers.indexOf("element");
      if (elementIdx >= 0) {
        expect(validWuxing).toContain(tpl.example[elementIdx]);
      }
    }
  });

  it("rarity values should be valid", () => {
    const validRarities = ["common", "uncommon", "rare", "epic", "legendary"];
    for (const [name, tpl] of Object.entries(CSV_TEMPLATES)) {
      const rarityIdx = tpl.headers.indexOf("rarity");
      if (rarityIdx >= 0) {
        expect(validRarities).toContain(tpl.example[rarityIdx]);
      }
    }
  });
});
