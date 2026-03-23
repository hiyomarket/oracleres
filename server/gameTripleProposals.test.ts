/**
 * gameTripleProposals.test.ts
 * 三份遊戲提案的整合測試
 * - 提案一：虛擬服裝商城（gameShop router）
 * - 提案二：每日穿搭任務（questEngine）
 * - 提案三：虛相戰鬥介面（CombatPlayer 素材 URL 格式）
 */

import { describe, it, expect } from "vitest";
import {
  generateDailyQuest,
  checkQuestCompletion,
  QUEST_REWARD,
  WUXING_HEX,
} from "./utils/questEngine";

// ─── 提案二：每日穿搭任務 ─────────────────────────────────────
describe("questEngine - 每日穿搭任務", () => {
  it("generateDailyQuest 應回傳有效的任務結構", () => {
    const quest = generateDailyQuest();
    expect(quest.targetWuxing).toMatch(/^(wood|fire|earth|metal|water)$/);
    expect(quest.targetWuxingZh).toMatch(/^[木火土金水]$/);
    expect(quest.title).toBeTruthy();
    expect(quest.desc).toBeTruthy();
    expect(quest.minItems).toBe(2);
    expect(quest.reward.stones).toBe(QUEST_REWARD.stones);
    expect(quest.reward.auraBonus).toBe(QUEST_REWARD.auraBonus);
  });

  it("generateDailyQuest 應回傳有效的環境五行比例（總和約為 1）", () => {
    const quest = generateDailyQuest();
    const total = Object.values(quest.envRatios).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 1);
  });

  it("generateDailyQuest 的 color 應為有效 HEX 顏色", () => {
    const quest = generateDailyQuest();
    expect(quest.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("checkQuestCompletion - 裝備 2 件以上目標五行應回傳 true", () => {
    const result = checkQuestCompletion(["wood", "wood", "fire"], "wood", 2);
    expect(result).toBe(true);
  });

  it("checkQuestCompletion - 裝備不足目標件數應回傳 false", () => {
    const result = checkQuestCompletion(["wood", "fire", "earth"], "wood", 2);
    expect(result).toBe(false);
  });

  it("checkQuestCompletion - 空裝備應回傳 false", () => {
    const result = checkQuestCompletion([], "fire", 2);
    expect(result).toBe(false);
  });

  it("WUXING_HEX 應包含五種五行的正確配色", () => {
    expect(WUXING_HEX.wood).toBe("#2E8B57");
    expect(WUXING_HEX.fire).toBe("#DC143C");
    expect(WUXING_HEX.earth).toBe("#CD853F");
    expect(WUXING_HEX.metal).toBe("#C9A227");
    expect(WUXING_HEX.water).toBe("#00CED1");
  });
});

// ─── 提案一：虛擬服裝商城 ─────────────────────────────────────
describe("gameShop - 商城商品結構", () => {
  it("QUEST_REWARD 靈石獎勵應為正整數", () => {
    expect(QUEST_REWARD.stones).toBeGreaterThan(0);
    expect(Number.isInteger(QUEST_REWARD.stones)).toBe(true);
  });

  it("QUEST_REWARD minItems 應至少為 1", () => {
    expect(QUEST_REWARD.minItems).toBeGreaterThanOrEqual(1);
  });
});

// ─── 提案三：虛相戰鬥介面 ─────────────────────────────────────
describe("CombatPlayer - TASK-008 立繪 CDN URL 格式", () => {
  const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net";
  const EXPECTED_SPRITES = [
    "player_male_idle_956e678d.png",
    "player_male_attack_4a69b57b.png",
    "player_male_hit_c51563b7.png",
    "player_female_idle_00c1da48.png",
    "player_female_attack_5df16cf8.png",
    "player_female_hit_b4cf2e89.png",
  ];

  it("所有 6 張立繪應使用 CloudFront CDN URL", () => {
    for (const sprite of EXPECTED_SPRITES) {
      const url = `${CDN_BASE}/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/${sprite}`;
      expect(url).toMatch(/^https:\/\/d2xsxph8kpxj0f\.cloudfront\.net\/.+\.png$/);
    }
  });

  it("立繪命名應符合 player_{gender}_{state} 格式", () => {
    const pattern = /^player_(male|female)_(idle|attack|hit)_[a-f0-9]+\.png$/;
    for (const sprite of EXPECTED_SPRITES) {
      expect(sprite).toMatch(pattern);
    }
  });

  it("男女各應有 3 種狀態（idle/attack/hit）", () => {
    const male = EXPECTED_SPRITES.filter((s) => s.startsWith("player_male"));
    const female = EXPECTED_SPRITES.filter((s) => s.startsWith("player_female"));
    expect(male).toHaveLength(3);
    expect(female).toHaveLength(3);
  });
});
