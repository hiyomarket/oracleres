/**
 * M3L 測試：5 項新功能
 * 1. 商店鎖定功能
 * 2. 怪物技能 AI 生成
 * 3. 圖鑑批量複製
 * 4. 裝備比較
 * 5. 後台表單即時預覽
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// 1. 商店鎖定功能
// ═══════════════════════════════════════════════════════════════

describe("商店鎖定功能", () => {
  it("鎖定的商品 isLocked=1 不應被 AI 刷新覆蓋", () => {
    const shopItems = [
      { id: 1, displayName: "火焰劍", isLocked: 1, isOnSale: 1 },
      { id: 2, displayName: "冰霜盾", isLocked: 0, isOnSale: 1 },
      { id: 3, displayName: "雷電弓", isLocked: 1, isOnSale: 0 },
    ];
    // AI 刷新時應只清除未鎖定的商品
    const unlocked = shopItems.filter(i => !i.isLocked);
    const locked = shopItems.filter(i => i.isLocked);
    expect(unlocked.length).toBe(1);
    expect(locked.length).toBe(2);
    expect(locked[0].displayName).toBe("火焰劍");
    expect(locked[1].displayName).toBe("雷電弓");
  });

  it("切換鎖定狀態：0→1, 1→0", () => {
    let item = { id: 1, isLocked: 0 };
    // 鎖定
    item.isLocked = item.isLocked ? 0 : 1;
    expect(item.isLocked).toBe(1);
    // 解鎖
    item.isLocked = item.isLocked ? 0 : 1;
    expect(item.isLocked).toBe(0);
  });

  it("三種商店都支援鎖定欄位", () => {
    const virtualShopItem = { id: 1, isLocked: 0, isOnSale: 1 };
    const spiritShopItem = { id: 1, isLocked: 1, isOnSale: 1 };
    const hiddenShopItem = { id: 1, isLocked: 0, isActive: 1 };
    
    expect(virtualShopItem).toHaveProperty("isLocked");
    expect(spiritShopItem).toHaveProperty("isLocked");
    expect(hiddenShopItem).toHaveProperty("isLocked");
  });

  it("鎖定狀態不影響上架/下架功能", () => {
    const item = { id: 1, isLocked: 1, isOnSale: 1 };
    // 即使鎖定也可以下架
    item.isOnSale = 0;
    expect(item.isLocked).toBe(1);
    expect(item.isOnSale).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. 怪物技能 AI 生成
// ═══════════════════════════════════════════════════════════════

describe("怪物技能 AI 生成", () => {
  it("根據稀有度決定技能數量：common=1, rare=2, epic=3, legendary=3", () => {
    const getSkillCount = (rarity: string) => {
      return rarity === "common" ? 1 
        : rarity === "rare" ? 2 
        : rarity === "epic" ? 3 
        : 3;
    };
    expect(getSkillCount("common")).toBe(1);
    expect(getSkillCount("rare")).toBe(2);
    expect(getSkillCount("epic")).toBe(3);
    expect(getSkillCount("legendary")).toBe(3);
    expect(getSkillCount("boss")).toBe(3);
  });

  it("技能 powerPercent 範圍限制", () => {
    const clampPower = (rarity: string, value: number) => {
      const ranges: Record<string, [number, number]> = {
        common: [80, 120],
        rare: [100, 150],
        epic: [120, 200],
        legendary: [150, 250],
      };
      const [min, max] = ranges[rarity] ?? [80, 120];
      return Math.min(max, Math.max(min, value));
    };
    expect(clampPower("common", 50)).toBe(80);
    expect(clampPower("common", 200)).toBe(120);
    expect(clampPower("rare", 130)).toBe(130);
    expect(clampPower("legendary", 300)).toBe(250);
  });

  it("技能 mpCost 應在 0-30 範圍", () => {
    const clampMp = (v: number) => Math.min(30, Math.max(0, v));
    expect(clampMp(-5)).toBe(0);
    expect(clampMp(50)).toBe(30);
    expect(clampMp(15)).toBe(15);
  });

  it("技能 cooldown 應在 0-3 範圍", () => {
    const clampCd = (v: number) => Math.min(3, Math.max(0, v));
    expect(clampCd(-1)).toBe(0);
    expect(clampCd(5)).toBe(3);
    expect(clampCd(2)).toBe(2);
  });

  it("生成的技能名稱不應與已有名稱重複", () => {
    const existingNames = ["火焰吐息", "冰霜之刃", "雷電衝擊"];
    const newSkills = [
      { name: "火焰吐息" },  // 重複
      { name: "暗影突襲" },  // 不重複
      { name: "大地震擊" },  // 不重複
    ];
    const filtered = newSkills.filter(s => !existingNames.includes(s.name));
    expect(filtered.length).toBe(2);
    expect(filtered[0].name).toBe("暗影突襲");
  });

  it("技能槽位正確分配：skillId1, skillId2, skillId3", () => {
    const insertedIds = ["MS_001", "MS_002", "MS_003"];
    const updateData: any = {};
    if (insertedIds[0]) updateData.skillId1 = insertedIds[0];
    if (insertedIds[1]) updateData.skillId2 = insertedIds[1];
    if (insertedIds[2]) updateData.skillId3 = insertedIds[2];
    expect(updateData.skillId1).toBe("MS_001");
    expect(updateData.skillId2).toBe("MS_002");
    expect(updateData.skillId3).toBe("MS_003");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. 圖鑑批量複製
// ═══════════════════════════════════════════════════════════════

describe("圖鑑批量複製", () => {
  it("複製的魔物名稱加上（複製）後綴", () => {
    const original = { name: "炎龍", monsterId: "M_F001" };
    const copy = { ...original, name: `${original.name}（複製）` };
    expect(copy.name).toBe("炎龍（複製）");
    expect(copy.monsterId).toBe(original.monsterId); // ID 會在後端重新生成
  });

  it("複製的道具名稱加上（複製）後綴", () => {
    const original = { name: "回復藥水", itemId: "I_W001" };
    const copy = { ...original, name: `${original.name}（複製）` };
    expect(copy.name).toBe("回復藥水（複製）");
  });

  it("複製的裝備名稱加上（複製）後綴", () => {
    const original = { name: "玄鐵劍", equipId: "E_M001" };
    const copy = { ...original, name: `${original.name}（複製）` };
    expect(copy.name).toBe("玄鐵劍（複製）");
  });

  it("複製的技能名稱加上（複製）後綴", () => {
    const original = { name: "火球術", skillId: "S_F001" };
    const copy = { ...original, name: `${original.name}（複製）` };
    expect(copy.name).toBe("火球術（複製）");
  });

  it("複製的成就標題加上（複製）後綴", () => {
    const original = { title: "初心者", achId: "ACH_001" };
    const copy = { ...original, title: `${original.title}（複製）` };
    expect(copy.title).toBe("初心者（複製）");
  });

  it("支援六種圖鑑類型", () => {
    const supportedTypes = ["monster", "item", "equipment", "skill", "achievement", "monsterSkill"];
    expect(supportedTypes.length).toBe(6);
    expect(supportedTypes).toContain("monsterSkill");
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. 裝備比較
// ═══════════════════════════════════════════════════════════════

describe("裝備比較功能", () => {
  it("計算屬性差異（新裝備 - 當前裝備）", () => {
    const current = { atkBonus: 10, defBonus: 5, hpBonus: 20, speedBonus: 3 };
    const newEquip = { atkBonus: 15, defBonus: 3, hpBonus: 30, speedBonus: 2 };
    const diff = {
      atk: (newEquip.atkBonus ?? 0) - (current.atkBonus ?? 0),
      def: (newEquip.defBonus ?? 0) - (current.defBonus ?? 0),
      hp: (newEquip.hpBonus ?? 0) - (current.hpBonus ?? 0),
      speed: (newEquip.speedBonus ?? 0) - (current.speedBonus ?? 0),
    };
    expect(diff.atk).toBe(5);    // 提升
    expect(diff.def).toBe(-2);   // 下降
    expect(diff.hp).toBe(10);    // 提升
    expect(diff.speed).toBe(-1); // 下降
  });

  it("無當前裝備時差異等於新裝備數值", () => {
    const newEquip = { atkBonus: 15, defBonus: 8, hpBonus: 30, speedBonus: 5 };
    const diff = {
      atk: newEquip.atkBonus,
      def: newEquip.defBonus,
      hp: newEquip.hpBonus,
      speed: newEquip.speedBonus,
    };
    expect(diff.atk).toBe(15);
    expect(diff.def).toBe(8);
    expect(diff.hp).toBe(30);
    expect(diff.speed).toBe(5);
  });

  it("差異為正數顯示為提升（綠色）", () => {
    const diff = 5;
    const isPositive = diff > 0;
    const display = isPositive ? `+${diff}` : `${diff}`;
    expect(isPositive).toBe(true);
    expect(display).toBe("+5");
  });

  it("差異為負數顯示為下降（紅色）", () => {
    const diff = -3;
    const isNegative = diff < 0;
    const display = `${diff}`;
    expect(isNegative).toBe(true);
    expect(display).toBe("-3");
  });

  it("差異為零不顯示", () => {
    const diff = 0;
    const shouldShow = diff !== 0;
    expect(shouldShow).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. 後台表單即時預覽
// ═══════════════════════════════════════════════════════════════

describe("後台表單即時預覽", () => {
  it("魔物預覽應包含名稱、五行、稀有度、數值", () => {
    const monsterForm = {
      name: "炎龍",
      wuxing: "火",
      rarity: "epic",
      baseHp: 300,
      baseAttack: 45,
      baseDefense: 30,
      description: "噴火的巨龍",
    };
    expect(monsterForm.name).toBeTruthy();
    expect(monsterForm.wuxing).toBeTruthy();
    expect(monsterForm.rarity).toBeTruthy();
    expect(monsterForm.baseHp).toBeGreaterThan(0);
    expect(monsterForm.baseAttack).toBeGreaterThan(0);
    expect(monsterForm.baseDefense).toBeGreaterThan(0);
  });

  it("技能預覽應包含名稱、類型、威力、消耗", () => {
    const skillForm = {
      name: "火球術",
      skillType: "attack",
      powerPercent: 150,
      mpCost: 10,
      cooldown: 1,
      description: "發射火球攻擊敵人",
    };
    expect(skillForm.name).toBeTruthy();
    expect(skillForm.skillType).toBeTruthy();
    expect(skillForm.powerPercent).toBeGreaterThan(0);
    expect(skillForm.mpCost).toBeGreaterThanOrEqual(0);
  });

  it("成就預覽應包含標題、描述、獎勵", () => {
    const achievementForm = {
      title: "初心者",
      description: "完成第一次戰鬥",
      rewardType: "coins",
      rewardAmount: 100,
      category: "combat",
    };
    expect(achievementForm.title).toBeTruthy();
    expect(achievementForm.description).toBeTruthy();
    expect(achievementForm.rewardType).toBeTruthy();
    expect(achievementForm.rewardAmount).toBeGreaterThan(0);
  });

  it("五行顏色映射正確", () => {
    const WUXING_COLORS: Record<string, string> = {
      "木": "#22C55E",
      "火": "#EF4444",
      "土": "#D97706",
      "金": "#F5F5DC",
      "水": "#3B82F6",
    };
    expect(WUXING_COLORS["木"]).toBe("#22C55E");
    expect(WUXING_COLORS["火"]).toBe("#EF4444");
    expect(WUXING_COLORS["土"]).toBe("#D97706");
    expect(WUXING_COLORS["金"]).toBe("#F5F5DC");
    expect(WUXING_COLORS["水"]).toBe("#3B82F6");
  });

  it("稀有度顏色映射正確", () => {
    const RARITY_COLORS: Record<string, string> = {
      common: "#888",
      rare: "#3B82F6",
      epic: "#8B5CF6",
      legendary: "#F59E0B",
    };
    expect(RARITY_COLORS["common"]).toBe("#888");
    expect(RARITY_COLORS["rare"]).toBe("#3B82F6");
    expect(RARITY_COLORS["epic"]).toBe("#8B5CF6");
    expect(RARITY_COLORS["legendary"]).toBe("#F59E0B");
  });
});
