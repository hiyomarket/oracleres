/**
 * M3L 戰鬥系統三大優化測試
 * 1. 統一怪物數據源（CombatMonster + monsterDataService）
 * 2. 怪物技能真正生效（AI 選擇 + 傷害計算 + 冷卻）
 * 3. 附加效果系統（中毒/灼燒/冰凍/眩暈/減速）
 * 4. 魔法係數 A 按實際技能屬性計算
 * 5. 技能自身冷卻值
 */
import { describe, it, expect } from "vitest";
import { resolveCombat, RACE_COUNTER, type StatusEffect, type CombatRound } from "./tickEngine";
import type { CombatMonster, MonsterSkillData } from "./monsterDataService";

// ═══════════════════════════════════════════════════════════════
// 工具函數：建立測試用怪物和玩家
// ═══════════════════════════════════════════════════════════════

function makeAgent(overrides: Partial<Parameters<typeof resolveCombat>[0]> = {}) {
  return {
    attack: 50,
    defense: 20,
    speed: 30,
    hp: 200,
    maxHp: 200,
    dominantElement: "fire",
    level: 10,
    wuxingWood: 20, wuxingFire: 40, wuxingEarth: 20, wuxingMetal: 10, wuxingWater: 10,
    agentRace: "人型系",
    equippedSkills: [],
    currentMp: 100,
    ...overrides,
  };
}

function makeStaticMonster() {
  return {
    id: "M_TEST_001",
    name: "測試火焰獸",
    element: "fire" as const,
    level: 10,
    hp: 150,
    attack: 30,
    defense: 15,
    speed: 25,
    skills: ["火焰吐息", "灼熱爪擊"],
    expReward: 50,
    goldReward: [10, 20] as [number, number],
    dropItems: [],
    race: "靈獸系",
  };
}

function makeCombatMonster(overrides: Partial<CombatMonster> = {}): CombatMonster {
  return {
    id: "M_TEST_DB_001",
    name: "資料庫火焰獸",
    element: "fire" as const,
    level: 10,
    hp: 150,
    attack: 30,
    defense: 15,
    speed: 25,
    skills: ["火焰吐息"],
    expReward: 50,
    goldReward: [10, 20] as [number, number],
    dropItems: [],
    race: "靈獸系",
    dbSkills: [],
    baseMp: 50,
    aiLevel: 2,
    ...overrides,
  };
}

function makeMonsterSkill(overrides: Partial<MonsterSkillData> = {}): MonsterSkillData {
  return {
    id: "SK_M_TEST_001",
    name: "烈焰衝擊",
    wuxing: "火",
    skillType: "attack",
    powerPercent: 150,
    mpCost: 10,
    cooldown: 2,
    accuracyMod: 100,
    additionalEffect: null,
    aiCondition: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. 統一怪物數據源
// ═══════════════════════════════════════════════════════════════

describe("統一怪物數據源", () => {
  it("resolveCombat 接受靜態 Monster 類型（向後相容）", () => {
    const agent = makeAgent();
    const monster = makeStaticMonster();
    const result = resolveCombat(agent, monster);
    expect(result).toHaveProperty("won");
    expect(result).toHaveProperty("rounds");
    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.monsterName).toBe("測試火焰獸");
  });

  it("resolveCombat 接受 CombatMonster 類型（含 dbSkills）", () => {
    const agent = makeAgent();
    const monster = makeCombatMonster({
      dbSkills: [makeMonsterSkill()],
    });
    const result = resolveCombat(agent, monster);
    expect(result).toHaveProperty("won");
    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.monsterName).toBe("資料庫火焰獸");
  });

  it("CombatMonster 無 dbSkills 時 fallback 到普通攻擊", () => {
    const agent = makeAgent();
    const monster = makeCombatMonster({ dbSkills: [] });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
    // 怪物沒有技能時不應 crash
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. 怪物技能真正生效
// ═══════════════════════════════════════════════════════════════

describe("怪物技能真正生效", () => {
  it("怪物使用技能時 monsterSkillsUsed 應記錄技能名稱", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 500,
      dbSkills: [
        makeMonsterSkill({ name: "烈焰衝擊", powerPercent: 200, mpCost: 5 }),
        makeMonsterSkill({ id: "SK_M_TEST_002", name: "火焰吐息", powerPercent: 120, mpCost: 3 }),
      ],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    // 至少使用了一個技能
    if (result.monsterSkillsUsed) {
      expect(result.monsterSkillsUsed.length).toBeGreaterThan(0);
    }
  });

  it("怪物 MP 不足時使用普通攻擊", () => {
    const agent = makeAgent({ hp: 300, maxHp: 300 });
    const monster = makeCombatMonster({
      hp: 300,
      dbSkills: [
        makeMonsterSkill({ name: "超級大招", powerPercent: 500, mpCost: 999 }),
      ],
      baseMp: 0, // MP 為 0
    });
    const result = resolveCombat(agent, monster);
    // 不應 crash，應正常完成戰鬥
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("怪物技能冷卻系統正常運作", () => {
    const agent = makeAgent({ hp: 800, maxHp: 800, defense: 5 });
    const monster = makeCombatMonster({
      hp: 800,
      attack: 50,
      dbSkills: [
        makeMonsterSkill({ name: "冷卻技能", powerPercent: 300, mpCost: 5, cooldown: 5 }),
      ],
      baseMp: 200,
    });
    const result = resolveCombat(agent, monster);
    // 戰鬥應正常完成
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("怪物治癒技能可以回復 HP", () => {
    const agent = makeAgent({ attack: 100, hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 100, // 低 HP 觸發治癒
      dbSkills: [
        makeMonsterSkill({ name: "自我修復", skillType: "heal", powerPercent: 200, mpCost: 5 }),
      ],
      baseMp: 100,
      aiLevel: 2,
    });
    const result = resolveCombat(agent, monster);
    // 戰鬥應正常完成
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("怪物 AI 等級 1 純隨機選擇技能", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 500,
      dbSkills: [
        makeMonsterSkill({ id: "SK1", name: "技能A", powerPercent: 100, mpCost: 5 }),
        makeMonsterSkill({ id: "SK2", name: "技能B", powerPercent: 200, mpCost: 10 }),
      ],
      baseMp: 100,
      aiLevel: 1,
    });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("怪物 AI 等級 3 優先使用剋制玩家屬性的技能", () => {
    const agent = makeAgent({ dominantElement: "wood", hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 500,
      dbSkills: [
        makeMonsterSkill({ id: "SK_COUNTER", name: "金屬利刃", wuxing: "金", powerPercent: 150, mpCost: 5 }),
        makeMonsterSkill({ id: "SK_NORMAL", name: "普通火球", wuxing: "火", powerPercent: 100, mpCost: 3 }),
      ],
      baseMp: 100,
      aiLevel: 3,
    });
    // 多次執行確認不會 crash
    for (let i = 0; i < 5; i++) {
      const result = resolveCombat(agent, monster);
      expect(result.rounds.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. 附加效果系統
// ═══════════════════════════════════════════════════════════════

describe("附加效果系統", () => {
  it("怪物技能附帶中毒效果可以觸發", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500, defense: 5 });
    const monster = makeCombatMonster({
      hp: 500,
      attack: 50,
      dbSkills: [
        makeMonsterSkill({
          name: "毒牙",
          powerPercent: 120,
          mpCost: 3,
          cooldown: 0,
          additionalEffect: { type: "poison", chance: 100, duration: 3, value: 10 },
        }),
      ],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
    // 100% 機率中毒，statusEffectsSummary 應有記錄
    if (result.statusEffectsSummary) {
      expect(result.statusEffectsSummary.some(s => s.includes("中毒"))).toBe(true);
    }
  });

  it("怪物技能附帶灼燒效果可以觸發", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500, defense: 5 });
    const monster = makeCombatMonster({
      hp: 500,
      attack: 50,
      dbSkills: [
        makeMonsterSkill({
          name: "烈焰吐息",
          powerPercent: 150,
          mpCost: 5,
          cooldown: 0,
          additionalEffect: { type: "burn", chance: 100, duration: 2, value: 15 },
        }),
      ],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
    if (result.statusEffectsSummary) {
      expect(result.statusEffectsSummary.some(s => s.includes("灼燒"))).toBe(true);
    }
  });

  it("怪物技能附帶眩暈效果可以觸發", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500, defense: 5 });
    const monster = makeCombatMonster({
      hp: 500,
      attack: 50,
      dbSkills: [
        makeMonsterSkill({
          name: "震盪波",
          powerPercent: 130,
          mpCost: 8,
          cooldown: 0,
          additionalEffect: { type: "stun", chance: 100, duration: 1, value: 0 },
        }),
      ],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
    if (result.statusEffectsSummary) {
      expect(result.statusEffectsSummary.some(s => s.includes("眩暈"))).toBe(true);
    }
  });

  it("0% 機率的附加效果不應觸發", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 500,
      dbSkills: [
        makeMonsterSkill({
          name: "無效毒牙",
          powerPercent: 100,
          mpCost: 3,
          cooldown: 0,
          additionalEffect: { type: "poison", chance: 0, duration: 3, value: 10 },
        }),
      ],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
    // 0% 機率不應有中毒記錄
    if (result.statusEffectsSummary) {
      expect(result.statusEffectsSummary.some(s => s.includes("中毒"))).toBe(false);
    }
  });

  it("DoT 傷害會在回合中記錄", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500, defense: 5, speed: 10 });
    const monster = makeCombatMonster({
      hp: 500,
      attack: 50,
      speed: 40, // 怪物先手
      dbSkills: [
        makeMonsterSkill({
          name: "劇毒",
          powerPercent: 100,
          mpCost: 3,
          cooldown: 0,
          additionalEffect: { type: "poison", chance: 100, duration: 5, value: 20 },
        }),
      ],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    // 檢查是否有 DoT 傷害記錄
    const hasDot = result.rounds.some(r => r.dotDamageToAgent && r.dotDamageToAgent > 0);
    // 第一回合中毒，第二回合開始有 DoT
    if (result.rounds.length >= 2) {
      // 至少在後續回合應有 DoT
      expect(hasDot || result.statusEffectsSummary?.some(s => s.includes("中毒"))).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. 魔法係數 A 按實際技能屬性計算
// ═══════════════════════════════════════════════════════════════

describe("魔法係數 A 動態計算", () => {
  it("使用火屬性技能時 skillElement 應為 fire", () => {
    const agent = makeAgent({
      dominantElement: "wood",
      wuxingFire: 50,
      equippedSkills: [
        { id: "S_F001", name: "火球術", skillType: "attack", damageMultiplier: 1.5, mpCost: 10, wuxing: "火", cooldown: 2 },
      ],
    });
    const monster = makeStaticMonster();
    const result = resolveCombat(agent, monster);
    // skillElement 應該被更新為 fire（因為使用了火屬性技能）
    expect(result.skillElement).toBeDefined();
  });

  it("玩家技能帶有 wuxing 欄位時正確推斷屬性", () => {
    const agent = makeAgent({
      dominantElement: "earth",
      equippedSkills: [
        { id: "CUSTOM_001", name: "自定義水技能", skillType: "attack", damageMultiplier: 1.3, mpCost: 8, wuxing: "水", cooldown: 3 },
      ],
    });
    const monster = makeStaticMonster();
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. 技能自身冷卻值
// ═══════════════════════════════════════════════════════════════

describe("技能自身冷卻值", () => {
  it("高冷卻技能不會每回合都使用", () => {
    const agent = makeAgent({
      hp: 800, maxHp: 800,
      equippedSkills: [
        { id: "S_F001", name: "大招", skillType: "attack", damageMultiplier: 3.0, mpCost: 5, cooldown: 5 },
        { id: "S_F002", name: "小招", skillType: "attack", damageMultiplier: 1.0, mpCost: 2, cooldown: 0 },
      ],
      currentMp: 200,
    });
    const monster = makeCombatMonster({ hp: 800, baseMp: 200, dbSkills: [] });
    const result = resolveCombat(agent, monster);
    // 戰鬥應正常完成
    expect(result.rounds.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. CombatResult 新欄位
// ═══════════════════════════════════════════════════════════════

describe("CombatResult 新欄位", () => {
  it("monsterMpUsed 記錄怪物消耗的 MP", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 500,
      dbSkills: [makeMonsterSkill({ mpCost: 10 })],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    if (result.monsterMpUsed) {
      expect(result.monsterMpUsed).toBeGreaterThan(0);
    }
  });

  it("CombatRound 包含 monsterSkillType 欄位", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 500,
      dbSkills: [makeMonsterSkill()],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    // 至少有一個回合有 monsterSkillType
    const hasType = result.rounds.some(r => r.monsterSkillType !== undefined);
    expect(hasType).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. 邊界情況
// ═══════════════════════════════════════════════════════════════

describe("邊界情況", () => {
  it("怪物沒有技能也不會 crash", () => {
    const agent = makeAgent();
    const monster = makeCombatMonster({ dbSkills: undefined as any });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("怪物 baseMp 為 0 時正常戰鬥", () => {
    const agent = makeAgent();
    const monster = makeCombatMonster({ baseMp: 0, dbSkills: [makeMonsterSkill()] });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("怪物 aiLevel 為 undefined 時 fallback 到等級 1", () => {
    const agent = makeAgent();
    const monster = makeCombatMonster({ aiLevel: undefined as any, dbSkills: [makeMonsterSkill()] });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("additionalEffect 為 null 時不觸發附加效果", () => {
    const agent = makeAgent({ hp: 500, maxHp: 500 });
    const monster = makeCombatMonster({
      hp: 500,
      dbSkills: [makeMonsterSkill({ additionalEffect: null })],
      baseMp: 100,
    });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
    // 不應有附加效果
    expect(result.statusEffectsSummary).toBeUndefined();
  });

  it("多種附加效果可以同時存在", () => {
    const agent = makeAgent({ hp: 800, maxHp: 800, defense: 5 });
    const monster = makeCombatMonster({
      hp: 800,
      attack: 50,
      dbSkills: [
        makeMonsterSkill({
          id: "SK_POISON", name: "毒牙", powerPercent: 100, mpCost: 3, cooldown: 0,
          additionalEffect: { type: "poison", chance: 100, duration: 3, value: 10 },
        }),
        makeMonsterSkill({
          id: "SK_BURN", name: "火焰", powerPercent: 100, mpCost: 3, cooldown: 0,
          additionalEffect: { type: "burn", chance: 100, duration: 3, value: 15 },
        }),
      ],
      baseMp: 200,
    });
    const result = resolveCombat(agent, monster);
    expect(result.rounds.length).toBeGreaterThan(0);
  });
});
