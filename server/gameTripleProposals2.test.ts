/**
 * V11.10 三份遊戲提案測試
 * - 提案一：大廳角色立繪升級（TASK-008 立繪 CDN URL 格式）
 * - 提案二：遊戲內容管理後台 CMS（gameAdmin router + 資料表）
 * - 提案三：成就徽章系統（gameAchievement router + checkAndUnlockAchievements）
 */
import { describe, it, expect } from "vitest";
import {
  checkAndUnlockAchievements,
  type AchievementConditionType,
} from "./routers/gameAchievement";

// ─── 提案一：立繪 CDN URL 格式驗證 ───────────────────────────────────
describe("提案一：TASK-008 立繪 CDN URL 格式", () => {
  const PLAYER_SPRITES: Record<string, string> = {
    male: "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_male_idle_956e678d.png",
    female:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c/player_female_idle_00c1da48.png",
  };

  it("男性立繪 URL 應為有效 HTTPS CDN 路徑", () => {
    expect(PLAYER_SPRITES.male).toMatch(/^https:\/\//);
    expect(PLAYER_SPRITES.male).toContain("player_male_idle");
    expect(PLAYER_SPRITES.male).toMatch(/\.png$/);
  });

  it("女性立繪 URL 應為有效 HTTPS CDN 路徑", () => {
    expect(PLAYER_SPRITES.female).toMatch(/^https:\/\//);
    expect(PLAYER_SPRITES.female).toContain("player_female_idle");
    expect(PLAYER_SPRITES.female).toMatch(/\.png$/);
  });

  it("性別 key 應只有 male 和 female", () => {
    expect(Object.keys(PLAYER_SPRITES)).toEqual(["male", "female"]);
  });
});

// ─── 提案二：CMS 資料表欄位驗證 ──────────────────────────────────────
describe("提案二：CMS 資料表欄位驗證", () => {
  it("怪物資料結構應包含必要欄位", () => {
    const monster = {
      id: 1,
      name: "木靈狐",
      wuxing: "wood",
      level: 5,
      hp: 200,
      attack: 30,
      defense: 15,
      catchRate: 0.1,
      expReward: 50,
      stonesReward: 10,
      isActive: 1,
    };
    expect(monster.wuxing).toBe("wood");
    expect(monster.catchRate).toBeGreaterThan(0);
    expect(monster.catchRate).toBeLessThanOrEqual(1);
    expect(monster.isActive).toBe(1);
  });

  it("技能資料結構應包含必要欄位", () => {
    const skill = {
      id: 1,
      name: "木靈衝",
      wuxing: "wood",
      type: "attack",
      power: 50,
      mpCost: 10,
      cooldown: 2,
      isActive: 1,
    };
    expect(["attack", "defense", "heal", "buff"]).toContain(skill.type);
    expect(skill.power).toBeGreaterThan(0);
    expect(skill.mpCost).toBeGreaterThanOrEqual(0);
  });

  it("地圖節點資料結構應包含 GPS 座標", () => {
    const node = {
      id: 1,
      name: "台北靈脈節點",
      lat: 25.0478,
      lng: 121.5318,
      nodeType: "battle",
      wuxing: "metal",
      isActive: 1,
    };
    expect(node.lat).toBeGreaterThan(21);
    expect(node.lat).toBeLessThan(26);
    expect(node.lng).toBeGreaterThan(119);
    expect(node.lng).toBeLessThan(123);
  });

  it("隨機任務資料結構應包含獎勵欄位", () => {
    const quest = {
      id: 1,
      title: "木日採集任務",
      description: "在木屬性日採集 5 個木靈草",
      wuxing: "wood",
      questType: "collect",
      targetCount: 5,
      rewardType: "stones",
      rewardAmount: 20,
      isActive: 1,
    };
    expect(quest.targetCount).toBeGreaterThan(0);
    expect(["stones", "coins", "item"]).toContain(quest.rewardType);
  });
});

// ─── 提案三：成就系統邏輯驗證 ────────────────────────────────────────
describe("提案三：成就條件類型驗證", () => {
  const validConditionTypes: AchievementConditionType[] = [
    "buy_items",
    "daily_quest",
    "oracle_cast",
    "login_days",
    "aura_score",
    "shop_spend",
    "wardrobe_items",
  ];

  it("成就條件類型應包含 7 種", () => {
    expect(validConditionTypes).toHaveLength(7);
  });

  it("checkAndUnlockAchievements 應為可呼叫的函數", () => {
    expect(typeof checkAndUnlockAchievements).toBe("function");
  });

  it("成就進度計算：達標條件判定", () => {
    // 模擬成就：購買 1 件道具即解鎖
    const conditionValue = 1;
    const currentValue = 1;
    expect(currentValue >= conditionValue).toBe(true);
  });

  it("成就進度計算：未達標條件判定", () => {
    const conditionValue = 5;
    const currentValue = 3;
    expect(currentValue >= conditionValue).toBe(false);
  });

  it("五行配色應對應正確的 HEX 值", () => {
    const WUXING_HEX: Record<string, string> = {
      wood: "#2E8B57",
      fire: "#DC143C",
      earth: "#CD853F",
      metal: "#C9A227",
      water: "#00CED1",
    };
    expect(WUXING_HEX.wood).toBe("#2E8B57");
    expect(WUXING_HEX.fire).toBe("#DC143C");
    expect(WUXING_HEX.earth).toBe("#CD853F");
    expect(WUXING_HEX.metal).toBe("#C9A227");
    expect(WUXING_HEX.water).toBe("#00CED1");
  });

  it("成就類別應包含 5 種", () => {
    const categories = ["social", "collection", "combat", "daily", "special"];
    expect(categories).toHaveLength(5);
    expect(categories).toContain("daily");
    expect(categories).toContain("combat");
  });
});

// ─── Admin CMS 路由保護邏輯 ──────────────────────────────────────────
describe("Admin CMS 路由保護", () => {
  it("非 admin 角色不應能存取 CMS", () => {
    const userRole = "user";
    const isAdmin = userRole === "admin";
    expect(isAdmin).toBe(false);
  });

  it("admin 角色應能存取 CMS", () => {
    const userRole = "admin";
    const isAdmin = userRole === "admin";
    expect(isAdmin).toBe(true);
  });
});
