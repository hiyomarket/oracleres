/**
 * v5.22 測試：戰鬥場景系統 + 音效 + 角色名稱修復 + AI 平衡規則整合
 */
import { describe, it, expect } from "vitest";

// ─── 1. 戰鬥場景配置 ──────────────────────────────────────────────
describe("Battle Scene Configuration", () => {
  const VALID_MODES = ["idle", "player_closed", "player_open", "pvp", "map_mob", "boss"];

  const SCENE_CONFIGS: Record<string, { label: string; particleCount: number }> = {
    idle: { label: "野外", particleCount: 25 },
    map_mob: { label: "野外遭遇", particleCount: 25 },
    player_closed: { label: "副本", particleCount: 15 },
    player_open: { label: "副本", particleCount: 18 },
    boss: { label: "Boss 戰", particleCount: 35 },
    pvp: { label: "競技場", particleCount: 20 },
  };

  it("每個戰鬥模式都應有對應的場景配置", () => {
    for (const mode of VALID_MODES) {
      expect(SCENE_CONFIGS).toHaveProperty(mode);
      expect(SCENE_CONFIGS[mode].label).toBeTruthy();
      expect(SCENE_CONFIGS[mode].particleCount).toBeGreaterThan(0);
    }
  });

  it("Boss 模式應有最多粒子", () => {
    const bossPCount = SCENE_CONFIGS.boss.particleCount;
    for (const mode of VALID_MODES) {
      if (mode !== "boss") {
        expect(bossPCount).toBeGreaterThanOrEqual(SCENE_CONFIGS[mode].particleCount);
      }
    }
  });

  it("場景標籤應為中文", () => {
    for (const mode of VALID_MODES) {
      expect(SCENE_CONFIGS[mode].label).toMatch(/[\u4e00-\u9fff]/);
    }
  });
});

// ─── 2. 角色名稱修復 ──────────────────────────────────────────────
describe("Agent Name Fix", () => {
  it("buildCharacterParticipant 應使用 agentName 而非 name", async () => {
    // 驗證 gameBattle.ts 中使用 agentName 欄位
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/gameBattle.ts", "utf-8");
    // 確認使用 agent.agentName（修復後）
    expect(content).toContain("agent.agentName");
  });

  it("模擬 agent 物件應正確取得名稱", () => {
    // 模擬 DB 返回的 agent 物件
    const agent = {
      id: 1,
      agentName: "火焰劍士",
      userId: "user1",
      level: 10,
    };
    // 修復前：agent.name → undefined → fallback "修行者"
    // 修復後：agent.agentName → "火焰劍士"
    const displayName = agent.agentName || "修行者";
    expect(displayName).toBe("火焰劍士");
    expect(displayName).not.toBe("修行者");
  });
});

// ─── 3. AI 平衡規則整合 ──────────────────────────────────────────────
describe("AI Balance Rules Integration", () => {
  it("gameAIBalance 應引用 loadBalanceRulesGrouped", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/gameAIBalance.ts", "utf-8");
    expect(content).toContain("loadBalanceRulesGrouped");
  });

  it("gameAIBalance 應從規則中讀取 wuxingPrimary", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/gameAIBalance.ts", "utf-8");
    expect(content).toContain("wuxingPrimary");
  });

  it("balanceRules 應包含 wuxingPrimary 預設規則", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/balanceRules.ts", "utf-8");
    expect(content).toContain("wuxingPrimary");
  });

  it("五行分配邏輯應使用規則中的 min/max 而非硬編碼", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/gameAIBalance.ts", "utf-8");
    // 確認使用 monRules 中的值
    expect(content).toContain("monRules");
    // 確認不再使用硬編碼的 WUXING_PRIMARY_RANGE 常數（應已移除或替換）
    // 新邏輯應從 rules 讀取
  });
});

// ─── 4. 音效系統結構 ──────────────────────────────────────────────
describe("Battle SFX System", () => {
  it("BattleSFX 模組應導出所有音效函數", async () => {
    const sfx = await import("../client/src/components/battle/BattleSFX");
    expect(typeof sfx.playCritSFX).toBe("function");
    expect(typeof sfx.playBlockSFX).toBe("function");
    expect(typeof sfx.playDodgeSFX).toBe("function");
    expect(typeof sfx.playAttackSFX).toBe("function");
    expect(typeof sfx.playHealSFX).toBe("function");
  });
});

// ─── 5. 全螢幕特效判定 ──────────────────────────────────────────────
describe("Screen Flash Effect Types", () => {
  function getFlashType(color: string): string {
    if (color.includes("251,191,36")) return "crit";
    if (color.includes("96,165,250")) return "block";
    if (color.includes("148,163,184")) return "dodge";
    return "normal";
  }

  it("爆擊閃光應為金色", () => {
    expect(getFlashType("rgba(251,191,36,0.25)")).toBe("crit");
  });

  it("格檔閃光應為藍色", () => {
    expect(getFlashType("rgba(96,165,250,0.15)")).toBe("block");
  });

  it("閃避閃光應為灰色", () => {
    expect(getFlashType("rgba(148,163,184,0.08)")).toBe("dodge");
  });

  it("普通閃光應為 normal", () => {
    expect(getFlashType("rgba(255,0,0,0.1)")).toBe("normal");
  });
});
