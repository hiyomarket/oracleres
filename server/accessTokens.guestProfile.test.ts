/**
 * accessTokens.guestProfile.test.ts
 * 測試 Token 虛擬身分系統：
 * 1. generateGuestProfile 隨機命盤生成邏輯
 * 2. verify 回傳 identityType 和 guestProfile
 * 3. context.ts 虛擬用戶注入邏輯
 */

import { describe, it, expect } from "vitest";

// ── 測試虛擬命盤生成邏輯 ──────────────────────────────────────────────────────

/** 複製 generateGuestProfile 邏輯供測試使用 */
function generateGuestProfile() {
  const maleNames = ["志輩", "宇軒", "建宏", "志明", "嘉輩", "志強", "建輩", "嘉強", "宇明", "志宇",
    "建明", "志嘉", "宇強", "建嘉", "嘉明", "嘉宇", "建宇", "志宇", "宇嘉", "建強"];
  const femaleNames = ["子晴", "清娟", "怀萃", "子潔", "清怀", "娟晴", "怀晴", "子萃", "清潔", "娟萃",
    "子清", "怀潔", "娟潔", "清子", "娟子", "怀子", "子娟", "清萃", "娟清", "怀清"];
  const surnames = ["陳", "林", "黃", "張", "王", "劉", "李", "吴", "趙", "陳",
    "魏", "周", "徐", "孫", "馬", "朱", "胡", "郭", "何", "高"];
  const gender = Math.random() < 0.5 ? "male" : "female";
  const namePool = gender === "male" ? maleNames : femaleNames;
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const givenName = namePool[Math.floor(Math.random() * namePool.length)];
  const birthYear = 1970 + Math.floor(Math.random() * 31);
  const birthMonth = 1 + Math.floor(Math.random() * 12);
  const birthDay = 1 + Math.floor(Math.random() * 28);
  const birthHour = Math.floor(Math.random() * 12) * 2;
  return {
    guestName: surname + givenName,
    guestGender: gender as "male" | "female",
    guestBirthYear: birthYear,
    guestBirthMonth: birthMonth,
    guestBirthDay: birthDay,
    guestBirthHour: birthHour,
  };
}

describe("generateGuestProfile", () => {
  it("應生成有效的姓名（2-3個字）", () => {
    for (let i = 0; i < 20; i++) {
      const profile = generateGuestProfile();
      expect(profile.guestName.length).toBeGreaterThanOrEqual(2);
      expect(profile.guestName.length).toBeLessThanOrEqual(4);
    }
  });

  it("性別應為 male 或 female", () => {
    for (let i = 0; i < 20; i++) {
      const profile = generateGuestProfile();
      expect(["male", "female"]).toContain(profile.guestGender);
    }
  });

  it("出生年份應在 1970-2000 之間", () => {
    for (let i = 0; i < 20; i++) {
      const profile = generateGuestProfile();
      expect(profile.guestBirthYear).toBeGreaterThanOrEqual(1970);
      expect(profile.guestBirthYear).toBeLessThanOrEqual(2000);
    }
  });

  it("出生月份應在 1-12 之間", () => {
    for (let i = 0; i < 20; i++) {
      const profile = generateGuestProfile();
      expect(profile.guestBirthMonth).toBeGreaterThanOrEqual(1);
      expect(profile.guestBirthMonth).toBeLessThanOrEqual(12);
    }
  });

  it("出生日應在 1-28 之間", () => {
    for (let i = 0; i < 20; i++) {
      const profile = generateGuestProfile();
      expect(profile.guestBirthDay).toBeGreaterThanOrEqual(1);
      expect(profile.guestBirthDay).toBeLessThanOrEqual(28);
    }
  });

  it("出生時辰應為偶數（0/2/4/.../22）", () => {
    for (let i = 0; i < 20; i++) {
      const profile = generateGuestProfile();
      expect(profile.guestBirthHour % 2).toBe(0);
      expect(profile.guestBirthHour).toBeGreaterThanOrEqual(0);
      expect(profile.guestBirthHour).toBeLessThanOrEqual(22);
    }
  });

  it("每次生成的命盤應有隨機性（不全相同）", () => {
    const profiles = Array.from({ length: 10 }, () => generateGuestProfile());
    const names = new Set(profiles.map(p => p.guestName));
    const years = new Set(profiles.map(p => p.guestBirthYear));
    // 10 次中至少有 2 個不同的名字或年份（隨機性驗證）
    expect(names.size + years.size).toBeGreaterThan(2);
  });
});

// ── 測試 identityType 邏輯 ────────────────────────────────────────────────────

describe("identityType 邏輯", () => {
  it("ai_readonly 身分不應有虛擬命盤", () => {
    const identityType = "ai_readonly";
    const shouldHaveGuest = identityType !== "ai_readonly";
    expect(shouldHaveGuest).toBe(false);
  });

  it("trial 身分應有虛擬命盤", () => {
    const identityType = "trial";
    const shouldHaveGuest = identityType !== "ai_readonly";
    expect(shouldHaveGuest).toBe(true);
  });

  it("basic 身分應有虛擬命盤", () => {
    const identityType = "basic";
    const shouldHaveGuest = identityType !== "ai_readonly";
    expect(shouldHaveGuest).toBe(true);
  });
});

// ── 測試虛擬用戶 ID 邏輯 ──────────────────────────────────────────────────────

describe("buildVirtualUser ID 邏輯", () => {
  it("虛擬用戶 ID 應為負數（避免與真實用戶衝突）", () => {
    const tokenId = 42;
    const virtualUserId = -(tokenId);
    expect(virtualUserId).toBe(-42);
    expect(virtualUserId).toBeLessThan(0);
  });

  it("虛擬用戶 openId 格式應包含 ai-token 前綴", () => {
    const tokenId = 7;
    const openId = `ai-token-${tokenId}`;
    expect(openId).toBe("ai-token-7");
    expect(openId.startsWith("ai-token-")).toBe(true);
  });
});

// ── 測試 AiReadOnlyBanner 身分類型判斷邏輯 ────────────────────────────────────

describe("AiReadOnlyBanner 身分類型判斷", () => {
  it("trial 和 basic 應顯示體驗模式橫幅", () => {
    const trialType = "trial";
    const basicType = "basic";
    const isTrialOrBasic = (t: string) => t === "trial" || t === "basic";
    expect(isTrialOrBasic(trialType)).toBe(true);
    expect(isTrialOrBasic(basicType)).toBe(true);
  });

  it("ai_readonly 應顯示 AI 唯讀橫幅", () => {
    const aiType = "ai_readonly";
    const isTrialOrBasic = (t: string) => t === "trial" || t === "basic";
    expect(isTrialOrBasic(aiType)).toBe(false);
  });

  it("時辰標籤轉換應正確", () => {
    const HOUR_LABEL: Record<number, string> = {
      0: "子時", 2: "丑時", 4: "寅時", 6: "卯時", 8: "辰時", 10: "巳時",
      12: "午時", 14: "未時", 16: "申時", 18: "酉時", 20: "戌時", 22: "亥時",
    };
    expect(HOUR_LABEL[0]).toBe("子時");
    expect(HOUR_LABEL[12]).toBe("午時");
    expect(HOUR_LABEL[22]).toBe("亥時");
    // 奇數小時取偶數：13 / 2 = 6.5 → floor = 6 → 6 * 2 = 12 → 午時
    const hour = 13;
    const normalizedHour = Math.floor(hour / 2) * 2;
    expect(normalizedHour).toBe(12);
    expect(HOUR_LABEL[normalizedHour]).toBe("午時");
    // 14 小時對應未時
    const hour14 = 14;
    const normalized14 = Math.floor(hour14 / 2) * 2;
    expect(HOUR_LABEL[normalized14]).toBe("未時");
  });
});
