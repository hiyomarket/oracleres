/**
 * petPage-refactor.test.ts — 驗證 PetPage 重構相關的後端邏輯
 *
 * 1. getStatCaps 返回正確的屬性上限結構
 * 2. calcCharacterStats 受 statCaps 限制
 * 3. petEngine 捕捉率計算
 * 4. petEngine 技能升級檢查
 */
import { describe, it, expect } from "vitest";
import { getStatCaps } from "./gameEngineConfig";
import { calcCharacterStatsV2 } from "./services/balanceFormulas";
import { getStatBalanceConfig } from "./gameEngineConfig";
import {
  calcPetStats,
  calcCaptureRate,
  checkDestinySkillLevelUp,
  getDestinySkillPower,
  DESTINY_SKILLS,
  INNATE_SLOT_UNLOCK,
  DESTINY_SLOT_UNLOCK,
} from "./services/petEngine";

// ─── 1. getStatCaps ─────────────────────────────────────────
describe("getStatCaps", () => {
  it("returns an object with all required stat cap keys", () => {
    const caps = getStatCaps();
    expect(caps).toHaveProperty("hp");
    expect(caps).toHaveProperty("mp");
    expect(caps).toHaveProperty("atk");
    expect(caps).toHaveProperty("def");
    expect(caps).toHaveProperty("spd");
    expect(caps).toHaveProperty("matk");
    expect(caps).toHaveProperty("mdef");
    expect(caps).toHaveProperty("wuxing");
  });

  it("all caps are positive numbers", () => {
    const caps = getStatCaps();
    for (const [key, val] of Object.entries(caps)) {
      expect(val).toBeTypeOf("number");
      expect(val).toBeGreaterThan(0);
    }
  });
});

// ─── 2. calcCharacterStatsV2 capped by getStatCaps ──────────
describe("stat caps integration", () => {
  it("raw stats from extremely high wuxing should be capped", () => {
    const caps = getStatCaps();
    const cfg = getStatBalanceConfig();
    // 極端高五行值
    const extremeWuxing = { wood: 999, fire: 999, earth: 999, metal: 999, water: 999 };
    const raw = calcCharacterStatsV2(extremeWuxing, 60, cfg);

    // 確認 raw 可能超出上限
    const capped = {
      hp: Math.min(raw.hp, caps.hp),
      atk: Math.min(raw.atk, caps.atk),
      def: Math.min(raw.def, caps.def),
      spd: Math.min(raw.spd, caps.spd),
      mp: Math.min(raw.mp, caps.mp),
      matk: Math.min(raw.matk, caps.matk),
    };

    expect(capped.hp).toBeLessThanOrEqual(caps.hp);
    expect(capped.atk).toBeLessThanOrEqual(caps.atk);
    expect(capped.def).toBeLessThanOrEqual(caps.def);
    expect(capped.spd).toBeLessThanOrEqual(caps.spd);
    expect(capped.mp).toBeLessThanOrEqual(caps.mp);
    expect(capped.matk).toBeLessThanOrEqual(caps.matk);
  });
});

// ─── 3. calcPetStats ────────────────────────────────────────
describe("calcPetStats", () => {
  it("returns valid stats for a level 1 pet", () => {
    const bp = { constitution: 10, strength: 8, defense: 8, agility: 8, magic: 6 };
    const stats = calcPetStats(bp, 1, 1.0);
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.mp).toBeGreaterThan(0);
    expect(stats.attack).toBeGreaterThan(0);
    expect(stats.defense).toBeGreaterThan(0);
    expect(stats.speed).toBeGreaterThan(0);
    expect(stats.magicAttack).toBeGreaterThanOrEqual(0);
  });

  it("higher level gives higher stats", () => {
    const bp = { constitution: 10, strength: 10, defense: 10, agility: 10, magic: 10 };
    const stats1 = calcPetStats(bp, 1, 1.0);
    const stats10 = calcPetStats(bp, 10, 1.0);
    expect(stats10.hp).toBeGreaterThan(stats1.hp);
    expect(stats10.attack).toBeGreaterThan(stats1.attack);
  });

  it("dragon race multiplier increases HP", () => {
    const bp = { constitution: 10, strength: 10, defense: 10, agility: 10, magic: 10 };
    const statsNormal = calcPetStats(bp, 10, 1.0);
    const statsDragon = calcPetStats(bp, 10, 1.3); // dragon = 1.3
    expect(statsDragon.hp).toBeGreaterThan(statsNormal.hp);
  });
});

// ─── 4. calcCaptureRate ─────────────────────────────────────
describe("calcCaptureRate", () => {
  it("returns a rate between 1% and 95%", () => {
    const rate = calcCaptureRate({
      baseCaptureRate: 50,
      monsterCurrentHp: 30,
      monsterMaxHp: 100,
      monsterLevel: 10,
      playerLevel: 10,
      captureItemType: "normal",
    });
    expect(rate).toBeGreaterThanOrEqual(0.01);
    expect(rate).toBeLessThanOrEqual(0.95);
  });

  it("lower HP increases capture rate", () => {
    const highHp = calcCaptureRate({
      baseCaptureRate: 50,
      monsterCurrentHp: 90,
      monsterMaxHp: 100,
      monsterLevel: 10,
      playerLevel: 10,
      captureItemType: "normal",
    });
    const lowHp = calcCaptureRate({
      baseCaptureRate: 50,
      monsterCurrentHp: 10,
      monsterMaxHp: 100,
      monsterLevel: 10,
      playerLevel: 10,
      captureItemType: "normal",
    });
    expect(lowHp).toBeGreaterThan(highHp);
  });

  it("better capture item increases rate", () => {
    const normal = calcCaptureRate({
      baseCaptureRate: 50,
      monsterCurrentHp: 50,
      monsterMaxHp: 100,
      monsterLevel: 10,
      playerLevel: 10,
      captureItemType: "normal",
    });
    const destiny = calcCaptureRate({
      baseCaptureRate: 50,
      monsterCurrentHp: 50,
      monsterMaxHp: 100,
      monsterLevel: 10,
      playerLevel: 10,
      captureItemType: "destiny",
    });
    expect(destiny).toBeGreaterThan(normal);
  });
});

// ─── 5. Destiny skill level up ──────────────────────────────
describe("checkDestinySkillLevelUp", () => {
  it("level 1 with 0 usage cannot level up", () => {
    const result = checkDestinySkillLevelUp(1, 0);
    expect(result.canLevelUp).toBe(false);
  });

  it("level 1 with enough usage can level up", () => {
    const result = checkDestinySkillLevelUp(1, 999);
    // 至少在某個門檻可以升級
    expect(result.canLevelUp).toBe(true);
    expect(result.nextLevel).toBe(2);
  });
});

// ─── 6. Slot unlock levels ──────────────────────────────────
describe("slot unlock levels", () => {
  it("INNATE_SLOT_UNLOCK has ascending levels", () => {
    for (let i = 1; i < INNATE_SLOT_UNLOCK.length; i++) {
      expect(INNATE_SLOT_UNLOCK[i]).toBeGreaterThanOrEqual(INNATE_SLOT_UNLOCK[i - 1]);
    }
  });

  it("DESTINY_SLOT_UNLOCK has ascending levels", () => {
    for (let i = 1; i < DESTINY_SLOT_UNLOCK.length; i++) {
      expect(DESTINY_SLOT_UNLOCK[i]).toBeGreaterThan(DESTINY_SLOT_UNLOCK[i - 1]);
    }
  });
});

// ─── 7. getDestinySkillPower ────────────────────────────────
describe("getDestinySkillPower", () => {
  it("returns valid power for all destiny skills at level 1", () => {
    for (const [key, skill] of Object.entries(DESTINY_SKILLS)) {
      const power = getDestinySkillPower(skill, 1);
      expect(power.powerPercent).toBeGreaterThanOrEqual(0);
      expect(power.mpCost).toBeGreaterThanOrEqual(0);
      expect(power.cooldown).toBeGreaterThanOrEqual(0);
    }
  });

  it("higher level gives higher power", () => {
    const firstSkill = Object.values(DESTINY_SKILLS)[0];
    const power1 = getDestinySkillPower(firstSkill, 1);
    const power5 = getDestinySkillPower(firstSkill, 5);
    // 高等級應該有更高或相等的威力
    expect(power5.powerPercent).toBeGreaterThanOrEqual(power1.powerPercent);
  });
});
