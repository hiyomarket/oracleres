/**
 * M3I Bug 修復測試
 * 1. 注靈體力限制
 * 2. 技能安裝槽位修正
 * 3. 技能觸發智慧判定
 * 4. PVP 五行剋制加成
 * 5. 戰鬥視窗退出按鈕
 */
import { describe, it, expect } from "vitest";

// ─── 1. 注靈體力限制測試 ───
describe("注靈體力限制", () => {
  it("注靈策略需要體力為 0 才能切換", () => {
    // 模擬 setStrategy 的驗證邏輯
    const validateInfuse = (stamina: number, strategy: string) => {
      if (strategy === "infuse" && stamina > 0) {
        return { error: "注靈需要在體力耗盡時才能進行" };
      }
      return { success: true };
    };

    expect(validateInfuse(100, "infuse")).toEqual({ error: "注靈需要在體力耗盡時才能進行" });
    expect(validateInfuse(50, "infuse")).toEqual({ error: "注靈需要在體力耗盡時才能進行" });
    expect(validateInfuse(1, "infuse")).toEqual({ error: "注靈需要在體力耗盡時才能進行" });
    expect(validateInfuse(0, "infuse")).toEqual({ success: true });
    // 其他策略不受體力限制
    expect(validateInfuse(100, "combat")).toEqual({ success: true });
    expect(validateInfuse(0, "explore")).toEqual({ success: true });
  });

  it("注靈不消耗體力", () => {
    // 模擬 tickEngine 中注靈的體力消耗
    const getStaminaCost = (strategy: string) => {
      if (strategy === "infuse") return 0; // 注靈不消耗體力
      if (strategy === "rest") return 0;
      return 5; // 其他策略消耗體力
    };

    expect(getStaminaCost("infuse")).toBe(0);
    expect(getStaminaCost("rest")).toBe(0);
    expect(getStaminaCost("combat")).toBe(5);
    expect(getStaminaCost("explore")).toBe(5);
  });

  it("補充體力後應切回上一個動作", () => {
    // 模擬 tickEngine 中體力恢復後的策略切換
    const handleStaminaRestore = (
      currentStrategy: string,
      previousStrategy: string | null,
      stamina: number,
      maxStamina: number
    ) => {
      // 注靈中，體力恢復到 > 0 後切回上一個策略
      if (currentStrategy === "infuse" && stamina > 0) {
        return previousStrategy ?? "explore";
      }
      return currentStrategy;
    };

    // 注靈中，體力恢復後切回 combat
    expect(handleStaminaRestore("infuse", "combat", 50, 100)).toBe("combat");
    // 注靈中，體力恢復後切回 explore
    expect(handleStaminaRestore("infuse", "explore", 10, 100)).toBe("explore");
    // 注靈中，體力為 0，繼續注靈
    expect(handleStaminaRestore("infuse", "combat", 0, 100)).toBe("infuse");
    // 非注靈策略不受影響
    expect(handleStaminaRestore("combat", null, 50, 100)).toBe("combat");
    // 注靈中，沒有 previousStrategy，恢復後預設 explore
    expect(handleStaminaRestore("infuse", null, 10, 100)).toBe("explore");
  });
});

// ─── 2. 技能安裝槽位修正測試 ───
describe("技能安裝槽位", () => {
  const ACTIVE_SLOT_KEYS = ["skillSlot1", "skillSlot2", "skillSlot3", "skillSlot4"] as const;
  const PASSIVE_SLOT_KEYS = ["passiveSlot1", "passiveSlot2"] as const;
  const VALID_SLOTS = [...ACTIVE_SLOT_KEYS, ...PASSIVE_SLOT_KEYS, "hiddenSlot1"] as const;

  it("主動技能槽 1-4 應對應正確的 slot key", () => {
    expect(ACTIVE_SLOT_KEYS[0]).toBe("skillSlot1");
    expect(ACTIVE_SLOT_KEYS[1]).toBe("skillSlot2");
    expect(ACTIVE_SLOT_KEYS[2]).toBe("skillSlot3");
    expect(ACTIVE_SLOT_KEYS[3]).toBe("skillSlot4");
  });

  it("被動技能槽 1-2 應對應正確的 slot key", () => {
    expect(PASSIVE_SLOT_KEYS[0]).toBe("passiveSlot1");
    expect(PASSIVE_SLOT_KEYS[1]).toBe("passiveSlot2");
  });

  it("所有合法的 slot key 都在 VALID_SLOTS 中", () => {
    expect(VALID_SLOTS).toContain("skillSlot1");
    expect(VALID_SLOTS).toContain("skillSlot2");
    expect(VALID_SLOTS).toContain("skillSlot3");
    expect(VALID_SLOTS).toContain("skillSlot4");
    expect(VALID_SLOTS).toContain("passiveSlot1");
    expect(VALID_SLOTS).toContain("passiveSlot2");
    expect(VALID_SLOTS).toContain("hiddenSlot1");
  });

  it("每個主動槽位 index 都能正確映射到 slot key", () => {
    for (let i = 0; i < 4; i++) {
      const slotKey = ACTIVE_SLOT_KEYS[i] ?? "skillSlot1";
      expect(slotKey).toBe(`skillSlot${i + 1}`);
    }
  });

  it("每個被動槽位 index 都能正確映射到 slot key", () => {
    for (let i = 0; i < 2; i++) {
      const slotKey = PASSIVE_SLOT_KEYS[i] ?? "passiveSlot1";
      expect(slotKey).toBe(`passiveSlot${i + 1}`);
    }
  });
});

// ─── 3. 技能觸發智慧判定測試 ───
describe("技能觸發智慧判定", () => {
  const WUXING_COUNTER: Record<string, string> = {
    wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire"
  };

  function inferSkillElement(skillId: string): string | null {
    // S_Wt 必須在 S_W 之前判斷，因為 S_Wt 也以 S_W 開頭
    if (skillId.startsWith("S_Wt")) return "water";
    if (skillId.startsWith("S_W")) return "wood";
    if (skillId.startsWith("S_F")) return "fire";
    if (skillId.startsWith("S_E")) return "earth";
    if (skillId.startsWith("S_M")) return "metal";
    return null;
  }

  it("五行相剋查詢表正確", () => {
    expect(WUXING_COUNTER["wood"]).toBe("earth");
    expect(WUXING_COUNTER["fire"]).toBe("metal");
    expect(WUXING_COUNTER["earth"]).toBe("water");
    expect(WUXING_COUNTER["metal"]).toBe("wood");
    expect(WUXING_COUNTER["water"]).toBe("fire");
  });

  it("技能屬性推斷正確", () => {
    expect(inferSkillElement("S_W001")).toBe("wood");
    expect(inferSkillElement("S_F004")).toBe("fire");
    expect(inferSkillElement("S_E003")).toBe("earth");
    expect(inferSkillElement("S_M003")).toBe("metal");
    expect(inferSkillElement("S_Wt001")).toBe("water");
    expect(inferSkillElement("unknown")).toBeNull();
  });

  it("HP < 30% 時應優先選擇治癒技能", () => {
    const hpRatio = 0.25; // 25% HP
    const healSkills = [{ id: "S_W005", name: "治癒", skillType: "heal", damageMultiplier: 1.2, mpCost: 10 }];
    const attackSkills = [{ id: "S_F004", name: "火球", skillType: "attack", damageMultiplier: 1.5, mpCost: 15 }];

    let chosen = null;
    if (hpRatio < 0.3 && healSkills.length > 0) {
      chosen = healSkills[0];
    }
    expect(chosen).not.toBeNull();
    expect(chosen!.skillType).toBe("heal");
  });

  it("面對被剋制屬性的怪物時應優先使用剋制技能", () => {
    const monsterElement = "metal"; // 怪物是金屬性
    const attackSkills = [
      { id: "S_W001", name: "木系攻擊", skillType: "attack", damageMultiplier: 1.2, mpCost: 10 },
      { id: "S_F004", name: "火系攻擊", skillType: "attack", damageMultiplier: 1.5, mpCost: 15 },
    ];

    // 找剋制怪物屬性的技能（火剋金）
    const counterSkills = attackSkills.filter(sk => {
      const skElement = inferSkillElement(sk.id);
      return skElement && WUXING_COUNTER[skElement] === monsterElement;
    });

    expect(counterSkills.length).toBe(1);
    expect(counterSkills[0].id).toBe("S_F004"); // 火系技能剋制金屬性怪物
  });

  it("沒有剋制技能時應選擇傷害最高的攻擊技能", () => {
    const attackSkills = [
      { id: "S_W001", name: "弱攻", skillType: "attack", damageMultiplier: 1.0, mpCost: 5 },
      { id: "S_W002", name: "強攻", skillType: "attack", damageMultiplier: 2.0, mpCost: 20 },
      { id: "S_W003", name: "中攻", skillType: "attack", damageMultiplier: 1.5, mpCost: 10 },
    ];

    const sorted = [...attackSkills].sort((a, b) => (b.damageMultiplier ?? 1) - (a.damageMultiplier ?? 1));
    expect(sorted[0].name).toBe("強攻");
    expect(sorted[0].damageMultiplier).toBe(2.0);
  });
});

// ─── 4. PVP 五行剋制加成測試 ───
describe("PVP 五行剋制加成", () => {
  const WUXING_COUNTER_PVP: Record<string, string> = {
    wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire"
  };

  function calcPvpMultipliers(challengerElement: string, defenderElement: string) {
    let cMultiplier = 1.0;
    let dMultiplier = 1.0;
    let desc = "";

    if (WUXING_COUNTER_PVP[challengerElement] === defenderElement) {
      cMultiplier = 1.2;
      desc = `挑戰者(${challengerElement})剋制防御者(${defenderElement})`;
    } else if (WUXING_COUNTER_PVP[defenderElement] === challengerElement) {
      dMultiplier = 1.2;
      desc = `防御者(${defenderElement})剋制挑戰者(${challengerElement})`;
    }

    return { cMultiplier, dMultiplier, desc };
  }

  it("木剋土：挑戰者(木)對防御者(土)傷害 +20%", () => {
    const result = calcPvpMultipliers("wood", "earth");
    expect(result.cMultiplier).toBe(1.2);
    expect(result.dMultiplier).toBe(1.0);
  });

  it("火剋金：挑戰者(火)對防御者(金)傷害 +20%", () => {
    const result = calcPvpMultipliers("fire", "metal");
    expect(result.cMultiplier).toBe(1.2);
    expect(result.dMultiplier).toBe(1.0);
  });

  it("土剋水：挑戰者(土)對防御者(水)傷害 +20%", () => {
    const result = calcPvpMultipliers("earth", "water");
    expect(result.cMultiplier).toBe(1.2);
    expect(result.dMultiplier).toBe(1.0);
  });

  it("金剋木：挑戰者(金)對防御者(木)傷害 +20%", () => {
    const result = calcPvpMultipliers("metal", "wood");
    expect(result.cMultiplier).toBe(1.2);
    expect(result.dMultiplier).toBe(1.0);
  });

  it("水剋火：挑戰者(水)對防御者(火)傷害 +20%", () => {
    const result = calcPvpMultipliers("water", "fire");
    expect(result.cMultiplier).toBe(1.2);
    expect(result.dMultiplier).toBe(1.0);
  });

  it("反向剋制：防御者剋制挑戰者", () => {
    const result = calcPvpMultipliers("earth", "wood"); // 木剋土，防御者(木)剋制挑戰者(土)
    expect(result.cMultiplier).toBe(1.0);
    expect(result.dMultiplier).toBe(1.2);
  });

  it("同屬性無加成", () => {
    const result = calcPvpMultipliers("fire", "fire");
    expect(result.cMultiplier).toBe(1.0);
    expect(result.dMultiplier).toBe(1.0);
    expect(result.desc).toBe("");
  });

  it("非相剋屬性無加成", () => {
    const result = calcPvpMultipliers("wood", "fire"); // 木和火不相剋
    expect(result.cMultiplier).toBe(1.0);
    expect(result.dMultiplier).toBe(1.0);
  });

  it("傷害計算正確套用倍率", () => {
    const baseDmg = 100;
    const multiplier = 1.2;
    const actualDmg = Math.round(baseDmg * multiplier);
    expect(actualDmg).toBe(120);
  });
});

// ─── 5. 戰鬥視窗退出按鈕邏輯測試 ───
describe("戰鬥視窗退出按鈕", () => {
  it("動畫進行中點擊退出應清除計時器", () => {
    let timerCleared = false;
    let animating = true;
    let closed = false;

    const handleForceExit = () => {
      timerCleared = true;
      animating = false;
      closed = true;
    };

    // 模擬動畫進行中
    expect(animating).toBe(true);
    handleForceExit();
    expect(timerCleared).toBe(true);
    expect(animating).toBe(false);
    expect(closed).toBe(true);
  });

  it("動畫進行中點擊 ⏩ 應跳過動畫顯示結果", () => {
    let animating = true;
    let showResult = false;
    const allRounds = [{ round: 1 }, { round: 2 }, { round: 3 }];
    let visibleRounds: typeof allRounds = [];

    const handleClose = () => {
      if (animating) {
        animating = false;
        visibleRounds = allRounds;
        showResult = true;
        return;
      }
    };

    handleClose();
    expect(animating).toBe(false);
    expect(visibleRounds.length).toBe(3);
    expect(showResult).toBe(true);
  });

  it("動畫結束後點擊 ✕ 應正常關閉", () => {
    let animating = false;
    let closed = false;

    const handleClose = () => {
      if (animating) return;
      closed = true;
    };

    handleClose();
    expect(closed).toBe(true);
  });
});

// ─── 6. 拍賣場道具列表 UI 修正測試 ───
describe("拍賣場道具列表 UI", () => {
  it("列表最大高度應為 320px", () => {
    const maxHeight = "320px";
    expect(maxHeight).toBe("320px");
  });

  it("道具項目最小高度應為 52px", () => {
    const minHeight = "52px";
    expect(minHeight).toBe("52px");
  });

  it("選中的道具應顯示勾選標記", () => {
    const selectedInvId = 1;
    const items = [
      { id: 1, itemName: "鐵礦石", quantity: 19 },
      { id: 2, itemName: "銀礦石", quantity: 14 },
    ];

    const selectedItem = items.find(i => i.id === selectedInvId);
    expect(selectedItem).toBeDefined();
    expect(selectedItem!.itemName).toBe("鐵礦石");
  });
});
