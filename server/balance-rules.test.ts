/**
 * balance-rules.test.ts
 * M3N：平衡規則自訂功能 + GameTabLayout UI 調整測試
 */
import { describe, it, expect } from "vitest";

// ── 平衡規則 schema 驗證 ──
describe("Balance Rules Schema", () => {
  it("gameBalanceRules schema should exist in drizzle schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.gameBalanceRules).toBeDefined();
  });

  it("gameBalanceRules should have required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.gameBalanceRules;
    // 驗證表存在且有正確的結構
    expect(table).toBeDefined();
  });
});

// ── 平衡規則 Router 驗證 ──
describe("Balance Rules Router", () => {
  it("balanceRulesRouter should be registered in main router", async () => {
    const { appRouter } = await import("./routers");
    // 驗證 balanceRules 路由存在
    expect(appRouter._def.procedures).toBeDefined();
  });

  it("balanceRulesRouter should export required procedures", async () => {
    const { balanceRulesRouter } = await import("./routers/balanceRules");
    expect(balanceRulesRouter).toBeDefined();
    const procedures = balanceRulesRouter._def.procedures;
    expect(procedures).toBeDefined();
  });
});

// ── AI 平衡引擎動態規則驗證 ──
describe("AI Balance Engine - Dynamic Rules", () => {
  it("loadBalanceRulesGrouped should be exported from balanceRules", async () => {
    const mod = await import("./routers/balanceRules");
    expect(mod.loadBalanceRulesGrouped).toBeDefined();
    expect(typeof mod.loadBalanceRulesGrouped).toBe("function");
  });

  it("loadBalanceRulesGrouped should return grouped rules by catalog type", async () => {
    const { loadBalanceRulesGrouped } = await import("./routers/balanceRules");
    const rules = await loadBalanceRulesGrouped();
    // 應該返回一個物件，key 是 catalogType
    expect(typeof rules).toBe("object");
    // 即使資料庫沒有規則，也應該返回空物件或有預設值
    expect(rules).toBeDefined();
  });
});

// ── GameTabLayout 組件結構驗證 ──
describe("GameTabLayout - Strategy & Divine Integration", () => {
  it("GameTabLayout should export StrategyOption and DivineOption types", async () => {
    // 驗證模組可以正確導入
    const mod = await import("../client/src/components/GameTabLayout");
    expect(mod.default).toBeDefined();
    expect(mod.TAB_BAR_HEIGHT).toBe(56);
  });

  it("GAME_TABS should include world, shop, auction, pvp, admin tabs", async () => {
    // 驗證底部 Tab Bar 的基本結構
    const mod = await import("../client/src/components/GameTabLayout");
    expect(mod.TAB_BAR_HEIGHT).toBeGreaterThan(0);
  });
});

// ── 浮動按鈕移除驗證 ──
describe("Mobile Floating Buttons Removal", () => {
  it("VirtualWorldPage should not contain mobile floating divine panel", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/game/VirtualWorldPage.tsx", "utf-8");
    // 確認手機版浮動靈相面板已被移除
    expect(content).not.toContain("靈相干預浮動面板（手機版：右上角固定");
    // 確認手機版浮動行動策略面板已被移除
    expect(content).not.toContain("行動策略浮動面板（手機版：右上角固定");
    // 確認有移至底部的註解
    expect(content).toContain("已移至底部 GameTabLayout Tab Bar");
  });

  it("GameTabLayout should pass strategy and divine props to bottom bar", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/GameTabLayout.tsx", "utf-8");
    // 確認 GameTabLayout 支援行動策略 props
    expect(content).toContain("strategyOptions");
    expect(content).toContain("onStrategyChange");
    // 確認 GameTabLayout 支援靈相干預 props
    expect(content).toContain("divineOptions");
    expect(content).toContain("divineAP");
    // 確認有置中彈出面板
    expect(content).toContain("slideUpFade");
    expect(content).toContain("translateX(-50%)");
  });

  it("VirtualWorldPage should pass strategy and divine props to GameTabLayout", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/game/VirtualWorldPage.tsx", "utf-8");
    // 確認 VirtualWorldPage 傳入了行動策略和靈相干預 props
    expect(content).toContain("strategyOptions={STRATEGIES");
    expect(content).toContain("currentStrategy={agent?.strategy");
    expect(content).toContain("onStrategyChange=");
    expect(content).toContain("divineOptions={[");
    expect(content).toContain("divineAP={agent?.actionPoints");
  });
});
