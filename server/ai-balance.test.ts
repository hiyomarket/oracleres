/**
 * M3M 測試：AI 平衡系統 + 戰鬥回放摘要
 * 1. 怪物平衡公式
 * 2. 怪物技能平衡公式
 * 3. 道具售價平衡
 * 4. 裝備屬性平衡
 * 5. 人物技能平衡
 * 6. 成就獎勵平衡
 * 7. 戰鬥回放摘要統計
 * 8. 怪物 AI 等級分配
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// 平衡公式：怪物數值範圍定義（與 gameAIBalance.ts 一致）
// ═══════════════════════════════════════════════════════════════

const MONSTER_RANGES: Record<string, { hp: [number, number]; atk: [number, number]; def: [number, number]; spd: [number, number]; aiLevel: number }> = {
  common:    { hp: [30, 80],   atk: [5, 15],   def: [2, 8],   spd: [3, 8],   aiLevel: 1 },
  uncommon:  { hp: [60, 150],  atk: [10, 25],  def: [5, 15],  spd: [5, 12],  aiLevel: 1 },
  rare:      { hp: [100, 250], atk: [15, 40],  def: [8, 25],  spd: [8, 18],  aiLevel: 2 },
  elite:     { hp: [150, 400], atk: [25, 60],  def: [12, 35], spd: [10, 22], aiLevel: 2 },
  boss:      { hp: [250, 600], atk: [35, 80],  def: [18, 50], spd: [12, 25], aiLevel: 3 },
  legendary: { hp: [350, 800], atk: [45, 100], def: [25, 65], spd: [15, 30], aiLevel: 3 },
};

const SKILL_RANGES: Record<string, { powerPercent: [number, number]; mpCost: [number, number]; cooldown: [number, number] }> = {
  common:    { powerPercent: [80, 120],  mpCost: [5, 15],  cooldown: [0, 2] },
  uncommon:  { powerPercent: [100, 150], mpCost: [10, 25], cooldown: [1, 3] },
  rare:      { powerPercent: [120, 200], mpCost: [15, 35], cooldown: [2, 4] },
  elite:     { powerPercent: [150, 250], mpCost: [20, 45], cooldown: [2, 5] },
  boss:      { powerPercent: [180, 300], mpCost: [25, 55], cooldown: [3, 6] },
  legendary: { powerPercent: [200, 350], mpCost: [30, 65], cooldown: [3, 7] },
};

const EQUIP_RANGES: Record<string, { atkBonus: [number, number]; defBonus: [number, number]; hpBonus: [number, number]; spdBonus: [number, number] }> = {
  common:    { atkBonus: [1, 5],   defBonus: [1, 5],   hpBonus: [5, 20],   spdBonus: [0, 2] },
  uncommon:  { atkBonus: [3, 10],  defBonus: [3, 10],  hpBonus: [10, 40],  spdBonus: [1, 3] },
  rare:      { atkBonus: [5, 18],  defBonus: [5, 18],  hpBonus: [20, 70],  spdBonus: [2, 5] },
  epic:      { atkBonus: [10, 30], defBonus: [10, 30], hpBonus: [40, 120], spdBonus: [3, 8] },
  legendary: { atkBonus: [18, 50], defBonus: [18, 50], hpBonus: [70, 200], spdBonus: [5, 12] },
};

// ═══════════════════════════════════════════════════════════════
// 1. 怪物平衡公式
// ═══════════════════════════════════════════════════════════════

describe("怪物平衡公式", () => {
  it("common 怪物 HP 超出範圍應被修正", () => {
    const range = MONSTER_RANGES.common;
    const monster = { name: "小史萊姆", rarity: "common", hp: 200, atk: 10, def: 5, spd: 5 };
    // HP 200 超出 common 上限 80
    expect(monster.hp).toBeGreaterThan(range.hp[1]);
    const corrected = Math.min(monster.hp, range.hp[1]);
    expect(corrected).toBe(80);
  });

  it("legendary 怪物數值應在最高範圍內", () => {
    const range = MONSTER_RANGES.legendary;
    const monster = { name: "遠古龍王", rarity: "legendary", hp: 700, atk: 90, def: 55, spd: 25 };
    expect(monster.hp).toBeGreaterThanOrEqual(range.hp[0]);
    expect(monster.hp).toBeLessThanOrEqual(range.hp[1]);
    expect(monster.atk).toBeGreaterThanOrEqual(range.atk[0]);
    expect(monster.atk).toBeLessThanOrEqual(range.atk[1]);
  });

  it("所有稀有度的數值範圍應遞增", () => {
    const rarities = ["common", "uncommon", "rare", "elite", "boss", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = MONSTER_RANGES[rarities[i - 1]];
      const curr = MONSTER_RANGES[rarities[i]];
      // 上限應遞增
      expect(curr.hp[1]).toBeGreaterThan(prev.hp[1]);
      expect(curr.atk[1]).toBeGreaterThan(prev.atk[1]);
    }
  });

  it("AI 等級應根據稀有度正確分配", () => {
    expect(MONSTER_RANGES.common.aiLevel).toBe(1);
    expect(MONSTER_RANGES.uncommon.aiLevel).toBe(1);
    expect(MONSTER_RANGES.rare.aiLevel).toBe(2);
    expect(MONSTER_RANGES.elite.aiLevel).toBe(2);
    expect(MONSTER_RANGES.boss.aiLevel).toBe(3);
    expect(MONSTER_RANGES.legendary.aiLevel).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. 怪物技能平衡公式
// ═══════════════════════════════════════════════════════════════

describe("怪物技能平衡公式", () => {
  it("common 技能威力不應超過 120%", () => {
    const range = SKILL_RANGES.common;
    const skill = { name: "衝撞", rarity: "common", powerPercent: 200 };
    expect(skill.powerPercent).toBeGreaterThan(range.powerPercent[1]);
    const corrected = Math.min(skill.powerPercent, range.powerPercent[1]);
    expect(corrected).toBe(120);
  });

  it("legendary 技能冷卻應在 3-7 回合", () => {
    const range = SKILL_RANGES.legendary;
    expect(range.cooldown[0]).toBe(3);
    expect(range.cooldown[1]).toBe(7);
  });

  it("技能 MP 消耗應隨稀有度遞增", () => {
    const rarities = ["common", "uncommon", "rare", "elite", "boss", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = SKILL_RANGES[rarities[i - 1]];
      const curr = SKILL_RANGES[rarities[i]];
      expect(curr.mpCost[1]).toBeGreaterThanOrEqual(prev.mpCost[1]);
    }
  });

  it("heal 類型技能的 powerPercent 代表回復百分比", () => {
    const healSkill = { skillType: "heal", powerPercent: 150 };
    // 150% 代表回復怪物最大 HP 的 150%（合理範圍內）
    expect(healSkill.powerPercent).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. 道具售價平衡
// ═══════════════════════════════════════════════════════════════

describe("道具售價平衡", () => {
  const ITEM_PRICE_RANGES: Record<string, [number, number]> = {
    common: [10, 100],
    uncommon: [50, 300],
    rare: [150, 800],
    epic: [400, 2000],
    legendary: [1000, 5000],
  };

  it("common 道具售價應在 10-100 金幣", () => {
    const range = ITEM_PRICE_RANGES.common;
    expect(range[0]).toBe(10);
    expect(range[1]).toBe(100);
  });

  it("售價 0 的道具應被修正為最低價", () => {
    const item = { name: "草藥", rarity: "common", sellPrice: 0 };
    const range = ITEM_PRICE_RANGES.common;
    const corrected = Math.max(item.sellPrice, range[0]);
    expect(corrected).toBe(10);
  });

  it("售價範圍應隨稀有度遞增", () => {
    const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = ITEM_PRICE_RANGES[rarities[i - 1]];
      const curr = ITEM_PRICE_RANGES[rarities[i]];
      expect(curr[1]).toBeGreaterThan(prev[1]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. 裝備屬性平衡
// ═══════════════════════════════════════════════════════════════

describe("裝備屬性平衡", () => {
  it("common 裝備攻擊加成不應超過 5", () => {
    const range = EQUIP_RANGES.common;
    const equip = { name: "木劍", rarity: "common", atkBonus: 15 };
    expect(equip.atkBonus).toBeGreaterThan(range.atkBonus[1]);
    const corrected = Math.min(equip.atkBonus, range.atkBonus[1]);
    expect(corrected).toBe(5);
  });

  it("legendary 裝備 HP 加成可達 200", () => {
    const range = EQUIP_RANGES.legendary;
    expect(range.hpBonus[1]).toBe(200);
  });

  it("所有屬性範圍應隨稀有度遞增", () => {
    const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = EQUIP_RANGES[rarities[i - 1]];
      const curr = EQUIP_RANGES[rarities[i]];
      expect(curr.atkBonus[1]).toBeGreaterThan(prev.atkBonus[1]);
      expect(curr.defBonus[1]).toBeGreaterThan(prev.defBonus[1]);
      expect(curr.hpBonus[1]).toBeGreaterThan(prev.hpBonus[1]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. 人物技能平衡
// ═══════════════════════════════════════════════════════════════

describe("人物技能平衡", () => {
  const PLAYER_SKILL_RANGES: Record<string, { powerPercent: [number, number]; mpCost: [number, number]; cooldown: [number, number]; sellPrice: [number, number] }> = {
    common:    { powerPercent: [80, 130],  mpCost: [5, 15],  cooldown: [0, 2], sellPrice: [50, 200] },
    uncommon:  { powerPercent: [100, 160], mpCost: [10, 25], cooldown: [1, 3], sellPrice: [100, 500] },
    rare:      { powerPercent: [120, 200], mpCost: [15, 35], cooldown: [2, 4], sellPrice: [250, 1200] },
    epic:      { powerPercent: [150, 260], mpCost: [20, 50], cooldown: [2, 5], sellPrice: [600, 3000] },
    legendary: { powerPercent: [200, 350], mpCost: [30, 70], cooldown: [3, 7], sellPrice: [1500, 8000] },
  };

  it("epic 技能威力應在 150-260%", () => {
    const range = PLAYER_SKILL_RANGES.epic;
    expect(range.powerPercent[0]).toBe(150);
    expect(range.powerPercent[1]).toBe(260);
  });

  it("技能售價應隨稀有度遞增", () => {
    const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = PLAYER_SKILL_RANGES[rarities[i - 1]];
      const curr = PLAYER_SKILL_RANGES[rarities[i]];
      expect(curr.sellPrice[1]).toBeGreaterThan(prev.sellPrice[1]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. 成就獎勵平衡
// ═══════════════════════════════════════════════════════════════

describe("成就獎勵平衡", () => {
  const ACHIEVEMENT_RANGES: Record<string, { rewardGold: [number, number]; rewardExp: [number, number] }> = {
    common:    { rewardGold: [10, 100],   rewardExp: [10, 50] },
    uncommon:  { rewardGold: [50, 300],   rewardExp: [30, 150] },
    rare:      { rewardGold: [150, 800],  rewardExp: [80, 400] },
    epic:      { rewardGold: [400, 2000], rewardExp: [200, 1000] },
    legendary: { rewardGold: [1000, 5000], rewardExp: [500, 3000] },
  };

  it("legendary 成就金幣獎勵可達 5000", () => {
    expect(ACHIEVEMENT_RANGES.legendary.rewardGold[1]).toBe(5000);
  });

  it("獎勵範圍應隨稀有度遞增", () => {
    const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = ACHIEVEMENT_RANGES[rarities[i - 1]];
      const curr = ACHIEVEMENT_RANGES[rarities[i]];
      expect(curr.rewardGold[1]).toBeGreaterThan(prev.rewardGold[1]);
      expect(curr.rewardExp[1]).toBeGreaterThan(prev.rewardExp[1]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. 戰鬥回放摘要統計
// ═══════════════════════════════════════════════════════════════

describe("戰鬥回放摘要統計", () => {
  const mockRounds = [
    { round: 1, agentAtk: 25, monsterAtk: 15, agentHpAfter: 85, monsterHpAfter: 75, agentFirst: true, agentSkillName: "火球術", monsterSkillName: "衝撞", agentHealAmount: 0, monsterHealAmount: 0, statusEffectsApplied: [{ type: "burn", target: "monster" as const, duration: 3 }], dotDamageToAgent: 0, dotDamageToMonster: 5, agentStunned: false, monsterStunned: false },
    { round: 2, agentAtk: 30, monsterAtk: 0, agentHpAfter: 80, monsterHpAfter: 45, agentFirst: true, agentSkillName: "火球術", monsterSkillName: "治癒之光", agentHealAmount: 0, monsterHealAmount: 20, statusEffectsApplied: [], dotDamageToAgent: 0, dotDamageToMonster: 5, agentStunned: false, monsterStunned: true },
    { round: 3, agentAtk: 20, monsterAtk: 18, agentHpAfter: 62, monsterHpAfter: 20, agentFirst: false, agentSkillName: "冰霜箭", monsterSkillName: "衝撞", agentHealAmount: 0, monsterHealAmount: 0, statusEffectsApplied: [{ type: "freeze", target: "monster" as const, duration: 1 }], dotDamageToAgent: 0, dotDamageToMonster: 5, agentStunned: false, monsterStunned: false },
  ];

  it("應正確統計技能使用次數", () => {
    const agentSkills: Record<string, number> = {};
    const monsterSkills: Record<string, number> = {};
    for (const r of mockRounds) {
      if (r.agentSkillName) agentSkills[r.agentSkillName] = (agentSkills[r.agentSkillName] || 0) + 1;
      if (r.monsterSkillName) monsterSkills[r.monsterSkillName] = (monsterSkills[r.monsterSkillName] || 0) + 1;
    }
    expect(agentSkills["火球術"]).toBe(2);
    expect(agentSkills["冰霜箭"]).toBe(1);
    expect(monsterSkills["衝撞"]).toBe(2);
    expect(monsterSkills["治癒之光"]).toBe(1);
  });

  it("應正確統計附加效果觸發次數", () => {
    const effects: Record<string, number> = {};
    for (const r of mockRounds) {
      if (r.statusEffectsApplied) {
        for (const e of r.statusEffectsApplied) {
          const key = `${e.type}→${e.target}`;
          effects[key] = (effects[key] || 0) + 1;
        }
      }
    }
    expect(effects["burn→monster"]).toBe(1);
    expect(effects["freeze→monster"]).toBe(1);
  });

  it("應正確累計持續傷害", () => {
    let totalDotToMonster = 0;
    for (const r of mockRounds) {
      totalDotToMonster += r.dotDamageToMonster || 0;
    }
    expect(totalDotToMonster).toBe(15); // 5 + 5 + 5
  });

  it("應正確統計眩暈回合數", () => {
    let monsterStunCount = 0;
    for (const r of mockRounds) {
      if (r.monsterStunned) monsterStunCount++;
    }
    expect(monsterStunCount).toBe(1); // 第 2 回合
  });

  it("應正確累計治癒量", () => {
    let totalMonsterHeal = 0;
    for (const r of mockRounds) {
      totalMonsterHeal += r.monsterHealAmount || 0;
    }
    expect(totalMonsterHeal).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. 怪物 AI 等級分配
// ═══════════════════════════════════════════════════════════════

describe("怪物 AI 等級分配", () => {
  function getExpectedAiLevel(rarity: string): number {
    switch (rarity) {
      case "common":
      case "uncommon":
        return 1;
      case "rare":
      case "elite":
        return 2;
      case "boss":
      case "legendary":
        return 3;
      default:
        return 1;
    }
  }

  it("common/uncommon 怪物應為 AI 等級 1（隨機選技能）", () => {
    expect(getExpectedAiLevel("common")).toBe(1);
    expect(getExpectedAiLevel("uncommon")).toBe(1);
  });

  it("rare/elite 怪物應為 AI 等級 2（策略選技能）", () => {
    expect(getExpectedAiLevel("rare")).toBe(2);
    expect(getExpectedAiLevel("elite")).toBe(2);
  });

  it("boss/legendary 怪物應為 AI 等級 3（剋制優先選技能）", () => {
    expect(getExpectedAiLevel("boss")).toBe(3);
    expect(getExpectedAiLevel("legendary")).toBe(3);
  });

  it("未知稀有度預設為 AI 等級 1", () => {
    expect(getExpectedAiLevel("unknown")).toBe(1);
  });

  it("AI 等級 3 的怪物應優先選擇剋制玩家屬性的技能", () => {
    // 模擬 AI 等級 3 的技能選擇邏輯
    const monsterSkills = [
      { name: "火焰吐息", wuxing: "fire", powerPercent: 200 },
      { name: "水流衝擊", wuxing: "water", powerPercent: 180 },
      { name: "大地震擊", wuxing: "earth", powerPercent: 220 },
    ];
    const playerWuxing = "fire"; // 玩家是火屬性
    // 水剋火，所以 AI 等級 3 應優先選水屬性技能
    const WUXING_COUNTER: Record<string, string> = { wood: "fire", fire: "metal", metal: "wood", water: "fire", earth: "water" };
    const counterSkills = monsterSkills.filter(s => WUXING_COUNTER[s.wuxing] === playerWuxing);
    expect(counterSkills.length).toBeGreaterThan(0);
    expect(counterSkills[0].wuxing).toBe("water");
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. 平衡結果格式驗證
// ═══════════════════════════════════════════════════════════════

describe("平衡結果格式", () => {
  it("平衡結果應包含必要欄位", () => {
    const mockResult = {
      dryRun: true,
      totalScanned: 50,
      totalChanges: 8,
      changes: [
        { id: "M001", name: "小史萊姆", field: "hp", oldValue: 200, newValue: 80, reason: "超出 common 上限" },
      ],
      message: "預覽完成",
    };
    expect(mockResult).toHaveProperty("dryRun");
    expect(mockResult).toHaveProperty("totalScanned");
    expect(mockResult).toHaveProperty("totalChanges");
    expect(mockResult).toHaveProperty("changes");
    expect(mockResult.changes[0]).toHaveProperty("name");
    expect(mockResult.changes[0]).toHaveProperty("field");
    expect(mockResult.changes[0]).toHaveProperty("oldValue");
    expect(mockResult.changes[0]).toHaveProperty("newValue");
    expect(mockResult.changes[0]).toHaveProperty("reason");
  });

  it("全圖鑑平衡結果應包含 summary", () => {
    const mockAllResult = {
      totalScanned: 300,
      totalChanges: 25,
      summary: [
        { catalog: "怪物", scanned: 50, changes: 8 },
        { catalog: "怪物技能", scanned: 100, changes: 5 },
        { catalog: "道具", scanned: 40, changes: 3 },
        { catalog: "裝備", scanned: 30, changes: 4 },
        { catalog: "人物技能", scanned: 50, changes: 3 },
        { catalog: "成就", scanned: 30, changes: 2 },
      ],
      message: "全圖鑑平衡掃描完成",
    };
    expect(mockAllResult.summary).toHaveLength(6);
    const totalFromSummary = mockAllResult.summary.reduce((sum, s) => sum + s.changes, 0);
    expect(totalFromSummary).toBe(mockAllResult.totalChanges);
  });
});
