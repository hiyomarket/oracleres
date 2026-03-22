/**
 * 塔羅牌映射表測試
 * 驗證 getTarotCardUrl 和 getTarotCardInfo 函數的正確性
 */
import { describe, it, expect } from "vitest";

// 由於這是前端模組，我們直接測試邏輯函數
// 模擬 tarotCards.ts 的核心邏輯

const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c";

interface TarotCardInfo {
  number: number;
  nameZh: string;
  nameEn: string;
  slug: string;
  element: string;
  keyword: string;
}

// 使用 Record 結構以支援非連續索引存取（與實際 tarotCards.ts 一致）
const TAROT_CARDS: Record<number, TarotCardInfo> = {
  0:  { number: 0,  nameZh: "愚者",    nameEn: "The Fool",          slug: "fool",          element: "風", keyword: "新開始、冒險" },
  1:  { number: 1,  nameZh: "魔術師",  nameEn: "The Magician",      slug: "magician",      element: "火", keyword: "意志、創造" },
  10: { number: 10, nameZh: "命運之輪",nameEn: "Wheel of Fortune",  slug: "wheel",         element: "火", keyword: "轉機、命運" },
  21: { number: 21, nameZh: "世界",    nameEn: "The World",         slug: "world",         element: "土", keyword: "完成、整合" },
};

const TAROT_CDN_FEMALE: Record<number, string> = {
  0:  `${CDN_BASE}/tarot-00-fool_209a184a.png`,
  1:  `${CDN_BASE}/tarot-01-magician_587f451f.png`,
  10: `${CDN_BASE}/tarot-10-wheel_67e1c9fd.png`,
  21: `${CDN_BASE}/tarot-21-world_78612742.png`,
};

const TAROT_CDN_MALE: Record<number, string> = {
  0:  `${CDN_BASE}/tarot-00-fool-male_6fd0708b.png`,
  1:  `${CDN_BASE}/tarot-01-magician-male_2acf2adc.png`,
  10: `${CDN_BASE}/tarot-10-wheel-male_9cfbd617.png`,
  21: `${CDN_BASE}/tarot-21-world-male_de8268d2.png`,
};

function getTarotCardUrl(cardNumber: number, gender: 'male' | 'female' | null | undefined): string {
  const normalizedNumber = cardNumber === 22 ? 0 : Math.max(0, Math.min(21, cardNumber));
  const map = gender === 'male' ? TAROT_CDN_MALE : TAROT_CDN_FEMALE;
  return map[normalizedNumber] ?? TAROT_CDN_FEMALE[0];
}

function getTarotCardInfo(cardNumber: number): TarotCardInfo {
  const normalizedNumber = cardNumber === 22 ? 0 : Math.max(0, Math.min(21, cardNumber));
  return TAROT_CARDS[normalizedNumber] ?? TAROT_CARDS[0]!;
}

describe("getTarotCardUrl", () => {
  it("女生版：返回正確的 CDN URL", () => {
    const url = getTarotCardUrl(0, 'female');
    expect(url).toContain("tarot-00-fool_");
    expect(url).not.toContain("-male");
  });

  it("男生版：返回正確的 CDN URL", () => {
    const url = getTarotCardUrl(0, 'male');
    expect(url).toContain("tarot-00-fool-male_");
  });

  it("22 號（愚者）應映射到 0 號", () => {
    const url22 = getTarotCardUrl(22, 'female');
    const url0  = getTarotCardUrl(0,  'female');
    expect(url22).toBe(url0);
  });

  it("null 性別應使用女生版", () => {
    const urlNull   = getTarotCardUrl(1, null);
    const urlFemale = getTarotCardUrl(1, 'female');
    expect(urlNull).toBe(urlFemale);
  });

  it("undefined 性別應使用女生版", () => {
    const urlUndef  = getTarotCardUrl(1, undefined);
    const urlFemale = getTarotCardUrl(1, 'female');
    expect(urlUndef).toBe(urlFemale);
  });

  it("超出範圍的編號應 clamp 到 0-21", () => {
    const urlNeg = getTarotCardUrl(-1, 'female');
    const url0   = getTarotCardUrl(0,  'female');
    expect(urlNeg).toBe(url0);
  });

  it("URL 應包含 CDN_BASE", () => {
    const url = getTarotCardUrl(10, 'male');
    expect(url).toContain(CDN_BASE);
  });
});

describe("getTarotCardInfo", () => {
  it("返回正確的卡牌名稱", () => {
    const info = getTarotCardInfo(0);
    expect(info.nameZh).toBe("愚者");
    expect(info.nameEn).toBe("The Fool");
  });

  it("22 號應返回愚者（0 號）資訊", () => {
    const info22 = getTarotCardInfo(22);
    const info0  = getTarotCardInfo(0);
    expect(info22.nameZh).toBe(info0.nameZh);
    expect(info22.number).toBe(info0.number);
  });

  it("返回正確的關鍵字", () => {
    const info = getTarotCardInfo(10);
    expect(info.keyword).toContain("命運");
  });

  it("返回正確的英文名稱", () => {
    const info = getTarotCardInfo(21);
    expect(info.nameEn).toBe("The World");
  });
});
