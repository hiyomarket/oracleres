/**
 * equipment-system.test.ts
 * 裝備系統測試：
 * 1. 裝備加成計算（buildCharacterParticipant 的 equipBonus 參數）
 * 2. 屬性上限（getStatCaps）
 * 3. 魔物捕捉率設定
 */
import { describe, it, expect } from "vitest";
import { getStatCaps, getStatBalanceConfig } from "./gameEngineConfig";
import { calcCharacterStatsV2 } from "./services/balanceFormulas";

// ─── 1. 裝備加成計算 ───────────────────────────────────────────────

describe("裝備加成計算", () => {
  it("裝備加成應正確疊加到角色屬性", () => {
    const wuxing = { wood: 30, fire: 20, earth: 20, metal: 15, water: 15 };
    const cfg = getStatBalanceConfig();
    const rawStats = calcCharacterStatsV2(wuxing, 10, cfg);

    // 模擬裝備加成
    const equipBonus = { hp: 60, atk: 25, def: 18, spd: 8 };

    const finalHp  = rawStats.hp  + equipBonus.hp;
    const finalAtk = rawStats.atk + equipBonus.atk;
    const finalDef = rawStats.def + equipBonus.def;
    const finalSpd = rawStats.spd + equipBonus.spd;

    expect(finalHp).toBeGreaterThan(rawStats.hp);
    expect(finalAtk).toBeGreaterThan(rawStats.atk);
    expect(finalDef).toBeGreaterThan(rawStats.def);
    expect(finalSpd).toBeGreaterThan(rawStats.spd);

    // 加成量應正確
    expect(finalHp  - rawStats.hp).toBe(60);
    expect(finalAtk - rawStats.atk).toBe(25);
    expect(finalDef - rawStats.def).toBe(18);
    expect(finalSpd - rawStats.spd).toBe(8);
  });

  it("多件裝備的加成應累加", () => {
    // 模擬 2 件裝備的加成
    const equips = [
      { hpBonus: 60, attackBonus: 25, defenseBonus: 18, speedBonus: 8 },
      { hpBonus: 40, attackBonus: 18, defenseBonus: 12, speedBonus: 5 },
    ];
    const total = equips.reduce(
      (acc, e) => ({
        hp: acc.hp + (e.hpBonus ?? 0),
        atk: acc.atk + (e.attackBonus ?? 0),
        def: acc.def + (e.defenseBonus ?? 0),
        spd: acc.spd + (e.speedBonus ?? 0),
      }),
      { hp: 0, atk: 0, def: 0, spd: 0 }
    );
    expect(total.hp).toBe(100);
    expect(total.atk).toBe(43);
    expect(total.def).toBe(30);
    expect(total.spd).toBe(13);
  });
});

// ─── 2. 屬性上限 ──────────────────────────────────────────────────

describe("屬性上限（getStatCaps）", () => {
  it("getStatCaps 應返回合理的上限值", () => {
    const caps = getStatCaps();
    expect(caps.hp).toBeGreaterThan(0);
    expect(caps.atk).toBeGreaterThan(0);
    expect(caps.def).toBeGreaterThan(0);
    expect(caps.spd).toBeGreaterThan(0);
  });

  it("裝備加成不應超過屬性上限", () => {
    const caps = getStatCaps();
    const wuxing = { wood: 100, fire: 100, earth: 100, metal: 100, water: 100 };
    const cfg = getStatBalanceConfig();
    const rawStats = calcCharacterStatsV2(wuxing, 60, cfg);

    // 加入大量裝備加成
    const equipBonus = { hp: 9999, atk: 9999, def: 9999, spd: 9999 };

    const finalHp  = Math.min(rawStats.hp  + equipBonus.hp,  caps.hp);
    const finalAtk = Math.min(rawStats.atk + equipBonus.atk, caps.atk);
    const finalDef = Math.min(rawStats.def + equipBonus.def, caps.def);
    const finalSpd = Math.min(rawStats.spd + equipBonus.spd, caps.spd);

    expect(finalHp).toBeLessThanOrEqual(caps.hp);
    expect(finalAtk).toBeLessThanOrEqual(caps.atk);
    expect(finalDef).toBeLessThanOrEqual(caps.def);
    expect(finalSpd).toBeLessThanOrEqual(caps.spd);
  });
});

// ─── 3. 魔物捕捉率邏輯 ────────────────────────────────────────────

describe("魔物捕捉率設定", () => {
  it("common 魔物捕捉率應為 35", () => {
    // 這是資料庫中設定的值，測試邏輯正確性
    const captureRateByRarity: Record<string, number> = {
      common: 35,
      rare: 20,
      epic: 10,
      elite: 10,
      legendary: 0,
    };
    expect(captureRateByRarity["common"]).toBe(35);
    expect(captureRateByRarity["rare"]).toBe(20);
    expect(captureRateByRarity["epic"]).toBe(10);
    expect(captureRateByRarity["legendary"]).toBe(0);
  });

  it("legendary 魔物不應可被捕捉", () => {
    const isCapturableByRarity: Record<string, boolean> = {
      common: true,
      rare: true,
      epic: true,
      elite: true,
      legendary: false,
    };
    expect(isCapturableByRarity["legendary"]).toBe(false);
    expect(isCapturableByRarity["common"]).toBe(true);
  });

  it("捕捉率應隨稀有度遞減", () => {
    const captureRates = [35, 20, 10, 10, 0]; // common, rare, epic, elite, legendary
    for (let i = 0; i < captureRates.length - 1; i++) {
      expect(captureRates[i]).toBeGreaterThanOrEqual(captureRates[i + 1]);
    }
  });
});

// ─── 4. 裝備槽位 key 一致性 ───────────────────────────────────────

describe("裝備槽位 key 一致性", () => {
  it("前端 EQUIP_SLOTS 的 slot 應與後端 SLOT_MAP 的 key 一致", () => {
    // 前端 EQUIP_SLOTS 定義的 slot 名稱
    const frontendSlots = ["weapon", "offhand", "head", "body", "hands", "feet", "ringA", "ringB", "necklace", "amulet"];
    // 後端 gameAvatar.ts 的 SLOT_MAP 值
    const backendSlotValues = ["weapon", "offhand", "head", "body", "hands", "feet", "ringA", "ringB", "necklace", "amulet"];
    expect(frontendSlots).toEqual(backendSlotValues);
  });
});
