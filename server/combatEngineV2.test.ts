/**
 * combatEngineV2.test.ts — GD-020 回合制戰鬥引擎 V2 測試
 */
import { describe, it, expect } from "vitest";
import {
  calcSpeedScore,
  sortTurnOrder,
  calcPhysicalDamage,
  calcMagicDamage,
  calcElementBoost,
  tryApplyStatusEffect,
  processStatusEffects,
  isStunned,
  isForgotten,
  isConfused,
  aiDecideCommand,
  executeCommand,
  simulateBattle,
  quickBattle,
  calcTotalPower,
  REWARD_MULTIPLIERS,
  type BattleParticipant,
  type CombatSkill,
  type BattleCommand,
} from "./services/combatEngineV2";

// ─── Helper: 建立測試用參與者 ───

function makeParticipant(overrides: Partial<BattleParticipant> = {}): BattleParticipant {
  return {
    id: 1,
    type: "character",
    side: "ally",
    name: "測試角色",
    level: 10,
    maxHp: 500,
    currentHp: 500,
    maxMp: 200,
    currentMp: 200,
    attack: 50,
    defense: 30,
    magicAttack: 40,
    magicDefense: 25,
    speed: 35,
    dominantElement: "fire",
    isDefeated: false,
    isDefending: false,
    speedScore: 0,
    statusEffects: [],
    skills: [],
    ...overrides,
  };
}

function makeMonster(overrides: Partial<BattleParticipant> = {}): BattleParticipant {
  return makeParticipant({
    id: 100,
    type: "monster",
    side: "enemy",
    name: "測試怪物",
    level: 8,
    maxHp: 300,
    currentHp: 300,
    maxMp: 100,
    currentMp: 100,
    attack: 40,
    defense: 20,
    magicAttack: 30,
    magicDefense: 15,
    speed: 25,
    dominantElement: "water",
    ...overrides,
  });
}

function makeSkill(overrides: Partial<CombatSkill> = {}): CombatSkill {
  return {
    id: "test-skill",
    name: "測試技能",
    skillType: "attack",
    damageMultiplier: 1.5,
    mpCost: 20,
    wuxing: "fire",
    cooldown: 2,
    currentCooldown: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// 先手判定
// ═══════════════════════════════════════════════════════════════

describe("先手判定系統", () => {
  it("速度越高，先手分數越高", () => {
    const fast = makeParticipant({ speed: 100 });
    const slow = makeParticipant({ speed: 10 });
    expect(calcSpeedScore(fast)).toBeGreaterThan(calcSpeedScore(slow));
  });

  it("速度相同時，角色平均先手分數高於寵物，寵物高於怪物", () => {
    // calcSpeedScore 含隨機雜湊(0~499)，typeBonus: char=500, pet=250, monster=0
    // 多次取樣取平均以消除隨機性
    let charTotal = 0, petTotal = 0, monTotal = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      charTotal += calcSpeedScore(makeParticipant({ id: 1, type: "character", speed: 50 }));
      petTotal += calcSpeedScore(makeParticipant({ id: 2, type: "pet", speed: 50 }));
      monTotal += calcSpeedScore(makeParticipant({ id: 3, type: "monster", speed: 50 }));
    }
    expect(charTotal / N).toBeGreaterThan(petTotal / N);
    expect(petTotal / N).toBeGreaterThan(monTotal / N);
  });

  it("sortTurnOrder 按速度降序排列", () => {
    const fast = makeParticipant({ id: 1, speed: 100 });
    const mid = makeParticipant({ id: 2, speed: 50 });
    const slow = makeParticipant({ id: 3, speed: 10 });
    const order = sortTurnOrder([slow, fast, mid]);
    expect(order[0]).toBe(1); // fast
    expect(order[1]).toBe(2); // mid
    expect(order[2]).toBe(3); // slow
  });

  it("已擊敗的參與者不參與排序", () => {
    const alive = makeParticipant({ id: 1, speed: 50, isDefeated: false });
    const dead = makeParticipant({ id: 2, speed: 100, isDefeated: true });
    const order = sortTurnOrder([alive, dead]);
    expect(order).toEqual([1]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 傷害公式 (函數接受 BattleParticipant 物件，返回 { damage, isCritical })
// ═══════════════════════════════════════════════════════════════

describe("傷害公式", () => {
  it("物理傷害返回 { damage, isCritical } 物件", () => {
    const attacker = makeParticipant({ attack: 100 });
    const defender = makeMonster({ defense: 40 });
    const result = calcPhysicalDamage(attacker, defender, 1.0);
    expect(result).toHaveProperty("damage");
    expect(result).toHaveProperty("isCritical");
    expect(typeof result.damage).toBe("number");
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it("物理傷害在合理範圍內", () => {
    const attacker = makeParticipant({ attack: 100 });
    const defender = makeMonster({ defense: 40 });
    let minDmg = Infinity, maxDmg = 0;
    for (let i = 0; i < 200; i++) {
      const { damage } = calcPhysicalDamage(attacker, defender, 1.0);
      minDmg = Math.min(minDmg, damage);
      maxDmg = Math.max(maxDmg, damage);
    }
    expect(minDmg).toBeGreaterThanOrEqual(1);
    expect(maxDmg).toBeLessThanOrEqual(500);
  });

  it("魔法傷害返回 { damage, isCritical } 物件", () => {
    const attacker = makeParticipant({ magicAttack: 80 });
    const defender = makeMonster({ magicDefense: 30 });
    const result = calcMagicDamage(attacker, defender, 1.0);
    expect(result).toHaveProperty("damage");
    expect(result).toHaveProperty("isCritical");
    expect(typeof result.damage).toBe("number");
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it("暴擊時傷害增加（統計驗證）", () => {
    const attacker = makeParticipant({ attack: 100, speed: 200 });
    const defender = makeMonster({ defense: 40 });
    let critDamages: number[] = [];
    let normalDamages: number[] = [];
    for (let i = 0; i < 500; i++) {
      const result = calcPhysicalDamage(attacker, defender, 1.0);
      if (result.isCritical) {
        critDamages.push(result.damage);
      } else {
        normalDamages.push(result.damage);
      }
    }
    if (critDamages.length > 0 && normalDamages.length > 0) {
      const critAvg = critDamages.reduce((a, b) => a + b, 0) / critDamages.length;
      const normalAvg = normalDamages.reduce((a, b) => a + b, 0) / normalDamages.length;
      expect(critAvg).toBeGreaterThan(normalAvg);
    }
  });

  it("防禦力極高時傷害最低為 1", () => {
    const attacker = makeParticipant({ attack: 10 });
    const defender = makeMonster({ defense: 1000 });
    const { damage } = calcPhysicalDamage(attacker, defender, 1.0);
    expect(damage).toBeGreaterThanOrEqual(1);
  });

  it("技能倍率影響傷害", () => {
    const attacker = makeParticipant({ attack: 100 });
    const defender = makeMonster({ defense: 40 });
    let normalTotal = 0;
    let boostedTotal = 0;
    for (let i = 0; i < 200; i++) {
      normalTotal += calcPhysicalDamage(attacker, defender, 1.0).damage;
      boostedTotal += calcPhysicalDamage(attacker, defender, 2.0).damage;
    }
    expect(boostedTotal / 200).toBeGreaterThan(normalTotal / 200);
  });
});

// ═══════════════════════════════════════════════════════════════
// 五行相剋 (返回 { multiplier, description })
// ═══════════════════════════════════════════════════════════════

describe("五行相剋傷害加成", () => {
  it("火剋金 → 傷害加成", () => {
    const result = calcElementBoost("fire" as any, "metal" as any, undefined);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it("金剋木 → 傷害加成", () => {
    const result = calcElementBoost("metal" as any, "wood" as any, undefined);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it("水剋火 → 傷害加成", () => {
    const result = calcElementBoost("water" as any, "fire" as any, undefined);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it("同屬性 → 無加成", () => {
    const result = calcElementBoost("fire" as any, "fire" as any, undefined);
    expect(result.multiplier).toBe(1.0);
  });

  it("被剋 → 傷害減少", () => {
    const result = calcElementBoost("fire" as any, "water" as any, undefined);
    expect(result.multiplier).toBeLessThan(1.0);
  });

  it("無屬性 → 無加成", () => {
    const result = calcElementBoost(undefined, "fire" as any, undefined);
    expect(result.multiplier).toBe(1.0);
  });

  it("返回描述字串", () => {
    const result = calcElementBoost("fire" as any, "metal" as any, undefined);
    expect(typeof result.description).toBe("string");
  });
});

// ═══════════════════════════════════════════════════════════════
// 狀態效果
// ═══════════════════════════════════════════════════════════════

describe("狀態效果系統", () => {
  it("中毒效果每回合造成傷害", () => {
    const p = makeParticipant({
      currentHp: 200,
      statusEffects: [{ type: "poison", duration: 3, value: 20, source: "怪物", appliedRound: 1 }],
    });
    const logs = processStatusEffects(p, 2);
    expect(p.currentHp).toBe(180);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(p.statusEffects[0].duration).toBe(2);
  });

  it("灼燒效果每回合造成傷害", () => {
    const p = makeParticipant({
      currentHp: 200,
      statusEffects: [{ type: "burn", duration: 2, value: 30, source: "火焰", appliedRound: 1 }],
    });
    processStatusEffects(p, 2);
    expect(p.currentHp).toBe(170);
  });

  it("眩暈效果使角色無法行動", () => {
    const p = makeParticipant({
      statusEffects: [{ type: "stun", duration: 1, value: 0, source: "怪物", appliedRound: 1 }],
    });
    expect(isStunned(p)).toBe(true);
  });

  it("遺忘效果使角色無法使用技能", () => {
    const p = makeParticipant({
      statusEffects: [{ type: "forget", duration: 2, value: 0, source: "怪物", appliedRound: 1 }],
    });
    expect(isForgotten(p)).toBe(true);
  });

  it("混亂效果存在時返回 true", () => {
    const p = makeParticipant({
      statusEffects: [{ type: "confuse", duration: 2, value: 0, source: "怪物", appliedRound: 1 }],
    });
    expect(isConfused(p)).toBe(true);
  });

  it("狀態效果持續時間到期後自動移除", () => {
    const p = makeParticipant({
      currentHp: 200,
      statusEffects: [{ type: "poison", duration: 1, value: 10, source: "怪物", appliedRound: 1 }],
    });
    processStatusEffects(p, 2);
    expect(p.statusEffects.length).toBe(0);
  });

  it("tryApplyStatusEffect 有機率施加效果", () => {
    let applied = 0;
    for (let i = 0; i < 1000; i++) {
      const p = makeParticipant({ statusEffects: [] });
      tryApplyStatusEffect(p, "poison", 50, 3, 10, "測試", 1);
      if (p.statusEffects.length > 0) applied++;
    }
    expect(applied).toBeGreaterThan(300);
    expect(applied).toBeLessThan(700);
  });
});

// ═══════════════════════════════════════════════════════════════
// AI 決策樹
// ═══════════════════════════════════════════════════════════════

describe("AI 決策樹", () => {
  it("HP 低於 30% 時優先使用治療技能", () => {
    const healer = makeParticipant({
      id: 1,
      currentHp: 100,
      maxHp: 500,
      currentMp: 100,
      skills: [
        makeSkill({ id: "heal", name: "治療", skillType: "heal", mpCost: 20, damageMultiplier: 0.5 }),
        makeSkill({ id: "atk", name: "攻擊", skillType: "attack", mpCost: 10, damageMultiplier: 1.5 }),
      ],
    });
    const enemies = [makeMonster({ id: 100 })];
    const allies = [healer];
    
    let healCount = 0;
    for (let i = 0; i < 100; i++) {
      const cmd = aiDecideCommand(healer, allies, enemies, 1);
      if (cmd.commandType === "skill" && cmd.skillId === "heal") healCount++;
    }
    expect(healCount).toBeGreaterThan(30);
  });

  it("MP 不足時使用普通攻擊", () => {
    const lowMp = makeParticipant({
      id: 1,
      currentMp: 0,
      skills: [
        makeSkill({ id: "skill1", mpCost: 50, skillType: "attack" }),
      ],
    });
    const enemies = [makeMonster({ id: 100 })];
    const allies = [lowMp];
    
    const cmd = aiDecideCommand(lowMp, allies, enemies, 1);
    if (cmd.commandType === "skill") {
      const skill = lowMp.skills.find(s => s.id === cmd.skillId);
      expect(skill!.mpCost).toBeLessThanOrEqual(lowMp.currentMp);
    }
  });

  it("技能冷卻中時不會選擇該技能", () => {
    const p = makeParticipant({
      id: 1,
      currentMp: 200,
      skills: [
        makeSkill({ id: "cd-skill", mpCost: 10, cooldown: 3, currentCooldown: 2 }),
      ],
    });
    const enemies = [makeMonster({ id: 100 })];
    const allies = [p];
    
    for (let i = 0; i < 50; i++) {
      const cmd = aiDecideCommand(p, allies, enemies, 1);
      if (cmd.commandType === "skill") {
        expect(cmd.skillId).not.toBe("cd-skill");
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 防禦機制
// ═══════════════════════════════════════════════════════════════

describe("防禦機制", () => {
  it("防禦狀態下受到的傷害減少", () => {
    const attacker = makeParticipant({ id: 1, attack: 100 });
    
    let defendTotal = 0;
    let normalTotal = 0;
    for (let i = 0; i < 200; i++) {
      const defender = makeMonster({ id: 100, defense: 40, isDefending: true, currentHp: 1000, maxHp: 1000 });
      const normalDef = makeMonster({ id: 101, defense: 40, isDefending: false, currentHp: 1000, maxHp: 1000 });
      
      const { damage: dDmg } = calcPhysicalDamage(attacker, defender, 1.0);
      const { damage: nDmg } = calcPhysicalDamage(attacker, normalDef, 1.0);
      defendTotal += dDmg;
      normalTotal += nDmg;
    }
    
    expect(defendTotal / 200).toBeLessThan(normalTotal / 200);
  });
});

// ═══════════════════════════════════════════════════════════════
// 快速結算 (quickBattle 接受 power/level 數值)
// ═══════════════════════════════════════════════════════════════

describe("快速結算演算法", () => {
  it("quickBattle 返回有效的戰鬥結果", () => {
    const result = quickBattle(500, 200, 10, 8);
    expect(result).toBeDefined();
    expect(typeof result.win).toBe("boolean");
    expect(result.hpLostPercent).toBeGreaterThanOrEqual(0);
    expect(result.roundsEstimate).toBeGreaterThanOrEqual(1);
  });

  it("強力角色應該大概率勝利", () => {
    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const result = quickBattle(2000, 100, 30, 5);
      if (result.win) wins++;
    }
    expect(wins).toBeGreaterThan(80);
  });

  it("掛機模式獎勵倍率為 0.33", () => {
    expect(REWARD_MULTIPLIERS.idle).toBe(0.33);
  });

  it("玩家開窗模式獎勵倍率為 1.2", () => {
    expect(REWARD_MULTIPLIERS.player_open).toBe(1.2);
  });

  it("玩家關窗模式獎勵倍率為 1.0", () => {
    expect(REWARD_MULTIPLIERS.player_closed).toBe(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 完整戰鬥模擬 (simulateBattle 接受 participants 陣列)
// ═══════════════════════════════════════════════════════════════

describe("完整戰鬥模擬", () => {
  it("simulateBattle 在最大回合數內結束", () => {
    const participants = [
      makeParticipant({ id: 1, side: "ally" }),
      makeMonster({ id: 100, side: "enemy" }),
    ];
    
    const result = simulateBattle(participants, "player_closed", 50);
    expect(result.rounds).toBeLessThanOrEqual(50);
    expect(result.logs.length).toBeGreaterThan(0);
    expect(["win", "lose", "flee", "draw"]).toContain(result.result);
  });

  it("人寵協同戰鬥：角色 + 寵物 vs 怪物", () => {
    const participants = [
      makeParticipant({ id: 1, type: "character", side: "ally", attack: 80, defense: 50 }),
      makeParticipant({
        id: 2, type: "pet", side: "ally", name: "火焰獸",
        attack: 60, defense: 30, speed: 40, maxHp: 300, currentHp: 300,
      }),
      makeMonster({ id: 100, side: "enemy", maxHp: 400, currentHp: 400 }),
    ];
    
    const result = simulateBattle(participants, "player_closed", 30);
    expect(result).toBeDefined();
    expect(result.result).toBeDefined();
    expect(["win", "lose", "flee", "draw"]).toContain(result.result);
  });

  it("戰鬥結果包含獎勵倍率", () => {
    const participants = [
      makeParticipant({ id: 1, side: "ally", attack: 200, maxHp: 2000, currentHp: 2000 }),
      makeMonster({ id: 100, side: "enemy", level: 10, maxHp: 100, currentHp: 100 }),
    ];
    
    const result = simulateBattle(participants, "player_closed", 30);
    expect(typeof result.rewardMultiplier).toBe("number");
    expect(result.rewardMultiplier).toBeGreaterThanOrEqual(0);
  });

  it("掛機模式戰鬥的獎勵倍率為 0.33", () => {
    const participants = [
      makeParticipant({ id: 1, side: "ally", attack: 200, maxHp: 2000, currentHp: 2000 }),
      makeMonster({ id: 100, side: "enemy", level: 5, maxHp: 50, currentHp: 50 }),
    ];
    
    const result = simulateBattle(participants, "idle", 30);
    if (result.result === "win") {
      expect(result.rewardMultiplier).toBe(0.33);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// calcTotalPower
// ═══════════════════════════════════════════════════════════════

describe("calcTotalPower", () => {
  it("計算參與者的總戰力", () => {
    const p = makeParticipant({ attack: 100, defense: 50, magicAttack: 80, speed: 40, maxHp: 1000 });
    const power = calcTotalPower(p);
    expect(power).toBeGreaterThan(0);
  });

  it("更強的角色有更高的戰力", () => {
    const weak = makeParticipant({ attack: 20, defense: 10, magicAttack: 15, speed: 10, maxHp: 200 });
    const strong = makeParticipant({ attack: 200, defense: 100, magicAttack: 150, speed: 80, maxHp: 2000 });
    expect(calcTotalPower(strong)).toBeGreaterThan(calcTotalPower(weak));
  });

  it("戰力公式正確：ATK×2 + DEF + MAG×2 + MDEF + SPD×1.5 + HP×0.1", () => {
    const p = makeParticipant({
      attack: 100, defense: 50, magicAttack: 80, magicDefense: 25, speed: 40, maxHp: 1000,
    });
    const expected = 100 * 2 + 50 + 80 * 2 + 25 + 40 * 1.5 + 1000 * 0.1;
    expect(calcTotalPower(p)).toBe(expected);
  });
});
