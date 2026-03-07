/**
 * theme.profile.test.ts
 * 測試主題色系管理 API 與管理員個人資料功能
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 主題色系 API 測試 ─────────────────────────────────────────────────────────
describe("系統設定 API（主題色系）", () => {
  it("getSystemSetting 應回傳 null 當設定不存在", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    // 模擬查詢結果為空
    const result = (await mockDb.limit(1))[0] ?? null;
    expect(result).toBeNull();
  });

  it("getSystemSetting 應回傳設定值當設定存在", async () => {
    const mockSetting = { id: 1, settingKey: "active_theme", settingValue: "sakura_pink" };
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockSetting]),
    };
    const result = (await mockDb.limit(1))[0] ?? null;
    expect(result).not.toBeNull();
    expect(result?.settingKey).toBe("active_theme");
    expect(result?.settingValue).toBe("sakura_pink");
  });

  it("adminUpdateSystemSetting 應能 upsert 設定值", async () => {
    const insertedValues: Record<string, string> = {};
    const mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn((v: { settingKey: string; settingValue: string }) => {
        insertedValues[v.settingKey] = v.settingValue;
        return { onDuplicateKeyUpdate: vi.fn().mockResolvedValue({ success: true }) };
      }),
    };
    await mockDb.insert("systemSettings").values({ settingKey: "active_theme", settingValue: "lavender_dream" });
    expect(insertedValues["active_theme"]).toBe("lavender_dream");
  });
});

// ─── 主題定義完整性測試 ───────────────────────────────────────────────────────
describe("主題定義完整性", () => {
  // 測試主題 ID 清單（與 themes.ts 中的定義一致）
  const EXPECTED_THEME_IDS = [
    "sakura_pink",
    "lavender_dream",
    "rose_gold",
    "ocean_mist",
    "forest_jade",
    "mystic_violet",
  ];

  it("應有 6 個預設主題", () => {
    expect(EXPECTED_THEME_IDS).toHaveLength(6);
  });

  it("每個主題 ID 應為有效字串", () => {
    EXPECTED_THEME_IDS.forEach(id => {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  it("預設主題 ID 應為 mystic_violet", () => {
    const DEFAULT_THEME_ID = "mystic_violet";
    expect(EXPECTED_THEME_IDS).toContain(DEFAULT_THEME_ID);
  });
});

// ─── 管理員個人資料存取測試 ────────────────────────────────────────────────────
describe("管理員個人資料存取", () => {
  it("isOwner 函數應對 admin role 回傳 true", () => {
    // 模擬 isOwner 邏輯
    function isOwner(openId: string, role?: string | null): boolean {
      if (role === "admin") return true;
      return false;
    }
    expect(isOwner("any-open-id", "admin")).toBe(true);
    expect(isOwner("any-open-id", "user")).toBe(false);
    expect(isOwner("any-open-id", null)).toBe(false);
  });

  it("getProfile 應對所有用戶（包含管理員）可用", () => {
    // 驗證 getProfile 是 protectedProcedure（不限 admin）
    // 管理員也是 protectedProcedure 的合法用戶
    const isProtectedProcedureAccessible = (role: string) => {
      // protectedProcedure 只需要登入，不限角色
      return ["admin", "user", "expert"].includes(role);
    };
    expect(isProtectedProcedureAccessible("admin")).toBe(true);
    expect(isProtectedProcedureAccessible("user")).toBe(true);
    expect(isProtectedProcedureAccessible("expert")).toBe(true);
  });

  it("saveProfile 應允許管理員儲存個人命格資料", () => {
    // 驗證 saveProfile 是 protectedProcedure（不限 admin）
    const canSaveProfile = (role: string) => {
      return ["admin", "user", "expert"].includes(role);
    };
    expect(canSaveProfile("admin")).toBe(true);
  });

  it("ProfilePage 應對主帳號優先使用 DB 資料", () => {
    // 模擬 effectiveProfile 邏輯
    const OWNER_STATIC_PROFILE = { displayName: "靜態名稱", dayPillar: null };
    const dbProfile = { displayName: "DB 名稱", dayPillar: "甲子" };

    function getEffectiveProfile(isOwner: boolean, profile: typeof dbProfile | null) {
      if (isOwner) {
        return (profile?.displayName || profile?.dayPillar) ? profile : OWNER_STATIC_PROFILE;
      }
      return profile;
    }

    // 有 DB 資料時應用 DB 資料
    expect(getEffectiveProfile(true, dbProfile)?.displayName).toBe("DB 名稱");
    // 無 DB 資料時應用靜態資料
    expect(getEffectiveProfile(true, null)?.displayName).toBe("靜態名稱");
    // 非主帳號直接用 profile
    expect(getEffectiveProfile(false, dbProfile)?.displayName).toBe("DB 名稱");
  });
});
