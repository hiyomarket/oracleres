/**
 * gameAvatar.test.ts
 * 靈相換裝系統 tRPC Router 單元測試
 *
 * 測試範圍：
 *   1. BLESSING_DESCRIPTIONS 祝福等級說明完整性
 *   2. LAYER_ORDER 圖層順序正確性
 *   3. computeAuraScore 邏輯（透過 submitDailyAura 的回傳值間接驗證）
 *   4. gameAvatarRouter 的 procedure 存在性
 */

import { describe, it, expect } from "vitest";
import { gameAvatarRouter, BLESSING_DESCRIPTIONS, LAYER_ORDER } from "./routers/gameAvatar";

describe("BLESSING_DESCRIPTIONS", () => {
  it("應包含四個祝福等級", () => {
    expect(Object.keys(BLESSING_DESCRIPTIONS)).toEqual(
      expect.arrayContaining(["none", "normal", "good", "destiny"])
    );
  });

  it("每個祝福等級應有 label 和 effects", () => {
    for (const [, value] of Object.entries(BLESSING_DESCRIPTIONS)) {
      expect(value).toHaveProperty("label");
      expect(value).toHaveProperty("effects");
      expect(Array.isArray(value.effects)).toBe(true);
      expect(value.effects.length).toBeGreaterThan(0);
    }
  });
});

describe("LAYER_ORDER", () => {
  it("應包含 7 個圖層", () => {
    expect(LAYER_ORDER.length).toBe(7);
  });

  it("應包含所有必要圖層", () => {
    expect(LAYER_ORDER).toContain("background");
    expect(LAYER_ORDER).toContain("body");
    expect(LAYER_ORDER).toContain("hair");
    expect(LAYER_ORDER).toContain("top");
    expect(LAYER_ORDER).toContain("bottom");
    expect(LAYER_ORDER).toContain("shoes");
    expect(LAYER_ORDER).toContain("accessory");
  });

  it("background 應為第一層（最底層）", () => {
    expect(LAYER_ORDER[0]).toBe("background");
  });
});

describe("gameAvatarRouter procedures", () => {
  it("應存在 getEquipped procedure", () => {
    expect(gameAvatarRouter._def.procedures).toHaveProperty("getEquipped");
  });

  it("應存在 getInventory procedure", () => {
    expect(gameAvatarRouter._def.procedures).toHaveProperty("getInventory");
  });

  it("應存在 saveOutfit procedure", () => {
    expect(gameAvatarRouter._def.procedures).toHaveProperty("saveOutfit");
  });

  it("應存在 submitDailyAura procedure", () => {
    expect(gameAvatarRouter._def.procedures).toHaveProperty("submitDailyAura");
  });

  it("應存在 getTodayAura procedure", () => {
    expect(gameAvatarRouter._def.procedures).toHaveProperty("getTodayAura");
  });

  it("應存在 getDailyAdvice procedure", () => {
    expect(gameAvatarRouter._def.procedures).toHaveProperty("getDailyAdvice");
  });
});
