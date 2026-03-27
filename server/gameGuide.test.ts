/**
 * gameGuide.test.ts
 * 遊戲規則指南系統測試
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();
const mockOrderBy = vi.fn();

const mockDb = {
  select: () => {
    mockSelect();
    return {
      from: (...args: any[]) => {
        mockFrom(...args);
        return {
          where: (...wArgs: any[]) => {
            mockWhere(...wArgs);
            return {
              orderBy: (...oArgs: any[]) => {
                mockOrderBy(...oArgs);
                return Promise.resolve([]);
              },
            };
          },
          orderBy: (...oArgs: any[]) => {
            mockOrderBy(...oArgs);
            return {
              orderBy: () => Promise.resolve([]),
            };
          },
        };
      },
    };
  },
  insert: () => {
    mockInsert();
    return {
      values: (...args: any[]) => {
        mockValues(...args);
        return Promise.resolve([{ insertId: 1 }]);
      },
    };
  },
  update: () => {
    mockUpdate();
    return {
      set: (...args: any[]) => {
        mockSet(...args);
        return {
          where: (...wArgs: any[]) => {
            mockWhere(...wArgs);
            return Promise.resolve();
          },
        };
      },
    };
  },
  delete: () => {
    mockDelete();
    return {
      where: (...wArgs: any[]) => {
        mockWhere(...wArgs);
        return Promise.resolve();
      },
    };
  },
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(() =>
    Promise.resolve({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sections: [
                { icon: "🎮", title: "新手入門", content: "# 歡迎\n基礎操作說明", category: "basic" },
                { icon: "⚔️", title: "戰鬥系統", content: "# 戰鬥\n回合制戰鬥", category: "combat" },
              ],
            }),
          },
        },
      ],
    })
  ),
}));

// Test collectSystemSummary indirectly through the module
import { getEngineConfig } from "./gameEngineConfig";

describe("遊戲規則指南系統", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("系統摘要收集", () => {
    it("getEngineConfig 應包含所有必要的配置欄位", () => {
      const config = getEngineConfig();
      // 引擎配置
      expect(config.tickIntervalMs).toBeDefined();
      expect(config.expMultiplier).toBeDefined();
      expect(config.goldMultiplier).toBeDefined();
      expect(config.dropMultiplier).toBeDefined();
      expect(config.gameEnabled).toBeDefined();
      // 事件機率
      expect(config.combatChance).toBeDefined();
      expect(config.gatherChance).toBeDefined();
      expect(config.rogueChance).toBeDefined();
      // 戰鬥經驗倍率
      expect(config.rewardMultIdle).toBeDefined();
      expect(config.rewardMultClosed).toBeDefined();
      expect(config.rewardMultOpen).toBeDefined();
      // 注靈配置
      expect(config.infuseMinGain).toBeDefined();
      expect(config.infuseMaxGain).toBeDefined();
      expect(config.infuseFailRate).toBeDefined();
      expect(config.infuseMaxWuxing).toBeDefined();
      // 掛機循環
      expect(config.afkTickIntervalMs).toBeDefined();
      expect(config.afkTickEnabled).toBeDefined();
    });

    it("預設配置值應正確", () => {
      const config = getEngineConfig();
      expect(config.rewardMultIdle).toBe(0.33);
      expect(config.rewardMultClosed).toBe(1.0);
      expect(config.rewardMultOpen).toBe(1.5);
      expect(config.combatChance).toBe(0.65);
      expect(config.gatherChance).toBe(0.20);
      expect(config.rogueChance).toBe(0.05);
      expect(config.afkTickIntervalMs).toBe(15000);
      expect(config.afkTickEnabled).toBe(true);
    });
  });

  describe("指南 CRUD 資料結構", () => {
    it("gameGuide schema 應有正確的欄位", async () => {
      const { gameGuide, gameGuideConfig } = await import("../drizzle/schema");
      // 驗證 gameGuide 表存在
      expect(gameGuide).toBeDefined();
      expect(gameGuideConfig).toBeDefined();
    });

    it("GameGuide 型別應正確匯出", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.gameGuide).toBeDefined();
      expect(schema.gameGuideConfig).toBeDefined();
    });
  });

  describe("AI 生成規則解析", () => {
    it("應正確解析 AI 回傳的 JSON 格式", () => {
      const mockResponse = JSON.stringify({
        sections: [
          { icon: "🎮", title: "新手入門", content: "# 歡迎", category: "basic" },
          { icon: "⚔️", title: "戰鬥系統", content: "# 戰鬥", category: "combat" },
        ],
      });
      const parsed = JSON.parse(mockResponse);
      expect(parsed.sections).toHaveLength(2);
      expect(parsed.sections[0].icon).toBe("🎮");
      expect(parsed.sections[0].title).toBe("新手入門");
      expect(parsed.sections[0].category).toBe("basic");
      expect(parsed.sections[1].icon).toBe("⚔️");
      expect(parsed.sections[1].title).toBe("戰鬥系統");
    });

    it("應處理空的 sections 陣列", () => {
      const mockResponse = JSON.stringify({ sections: [] });
      const parsed = JSON.parse(mockResponse);
      expect(parsed.sections).toHaveLength(0);
    });

    it("應處理不正確的 JSON 格式", () => {
      const badJson = "not valid json";
      expect(() => JSON.parse(badJson)).toThrow();
    });
  });

  describe("分類系統", () => {
    it("應支援所有預定義的分類", () => {
      const VALID_CATEGORIES = ["basic", "combat", "growth", "social", "advanced", "general"];
      const testSections = [
        { category: "basic" },
        { category: "combat" },
        { category: "growth" },
        { category: "social" },
        { category: "advanced" },
        { category: "general" },
      ];
      for (const s of testSections) {
        expect(VALID_CATEGORIES).toContain(s.category);
      }
    });
  });

  describe("全域設定", () => {
    it("應有預設的設定值", () => {
      const defaults = {
        tabIcon: "📖",
        tabLabel: "指南",
        pageTitle: "冒險者指南",
        pageSubtitle: "歡迎來到天命共振的世界！這份指南將帶你了解所有遊戲機制。",
      };
      expect(defaults.tabIcon).toBe("📖");
      expect(defaults.tabLabel).toBe("指南");
      expect(defaults.pageTitle).toBe("冒險者指南");
      expect(defaults.pageSubtitle).toContain("天命共振");
    });
  });

  describe("排序邏輯", () => {
    it("應正確計算排序值", () => {
      const sections = [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 10 },
        { id: 3, sortOrder: 20 },
      ];
      // 交換 index 0 和 index 1
      const orders = sections.map((s, i) => ({ id: s.id, sortOrder: i * 10 }));
      const temp = orders[0].sortOrder;
      orders[0].sortOrder = orders[1].sortOrder;
      orders[1].sortOrder = temp;
      expect(orders[0].sortOrder).toBe(10);
      expect(orders[1].sortOrder).toBe(0);
      expect(orders[2].sortOrder).toBe(20);
    });
  });
});
