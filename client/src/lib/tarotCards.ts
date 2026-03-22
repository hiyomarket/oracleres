// 塔羅牌 CDN URL 映射表
// 由美術 Agent TASK-002 產出，44 張高解析度 PNG（1696×2528px）
// 女生版：賽博少女風 + 日系輕奢風（暖色系）
// 男生版：暗黑武士風 + 國風仙俠風（冷色系）

const CDN_BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c";

export interface TarotCardInfo {
  number: number;
  nameZh: string;
  nameEn: string;
  slug: string;
  element: string;
  keyword: string;
}

export const TAROT_CARDS: TarotCardInfo[] = [
  { number: 0,  nameZh: "愚者",    nameEn: "The Fool",          slug: "fool",          element: "風", keyword: "新開始、冒險" },
  { number: 1,  nameZh: "魔術師",  nameEn: "The Magician",      slug: "magician",      element: "火", keyword: "意志、創造" },
  { number: 2,  nameZh: "女祭司",  nameEn: "The High Priestess",slug: "high-priestess",element: "水", keyword: "直覺、神秘" },
  { number: 3,  nameZh: "女皇",    nameEn: "The Empress",       slug: "empress",       element: "土", keyword: "豐盛、母性" },
  { number: 4,  nameZh: "皇帝",    nameEn: "The Emperor",       slug: "emperor",       element: "火", keyword: "權威、秩序" },
  { number: 5,  nameZh: "教皇",    nameEn: "The Hierophant",    slug: "hierophant",    element: "土", keyword: "傳統、智慧" },
  { number: 6,  nameZh: "戀人",    nameEn: "The Lovers",        slug: "lovers",        element: "風", keyword: "選擇、愛情" },
  { number: 7,  nameZh: "戰車",    nameEn: "The Chariot",       slug: "chariot",       element: "水", keyword: "意志、勝利" },
  { number: 8,  nameZh: "力量",    nameEn: "Strength",          slug: "strength",      element: "火", keyword: "勇氣、掌控" },
  { number: 9,  nameZh: "隱士",    nameEn: "The Hermit",        slug: "hermit",        element: "土", keyword: "內省、智慧" },
  { number: 10, nameZh: "命運之輪",nameEn: "Wheel of Fortune",  slug: "wheel",         element: "火", keyword: "轉機、命運" },
  { number: 11, nameZh: "正義",    nameEn: "Justice",           slug: "justice",       element: "風", keyword: "公正、平衡" },
  { number: 12, nameZh: "倒吊人",  nameEn: "The Hanged Man",    slug: "hanged-man",    element: "水", keyword: "犧牲、等待" },
  { number: 13, nameZh: "死神",    nameEn: "Death",             slug: "death",         element: "水", keyword: "轉化、結束" },
  { number: 14, nameZh: "節制",    nameEn: "Temperance",        slug: "temperance",    element: "火", keyword: "平衡、調和" },
  { number: 15, nameZh: "惡魔",    nameEn: "The Devil",         slug: "devil",         element: "土", keyword: "束縛、慾望" },
  { number: 16, nameZh: "塔",      nameEn: "The Tower",         slug: "tower",         element: "火", keyword: "突破、崩解" },
  { number: 17, nameZh: "星星",    nameEn: "The Star",          slug: "star",          element: "風", keyword: "希望、療癒" },
  { number: 18, nameZh: "月亮",    nameEn: "The Moon",          slug: "moon",          element: "水", keyword: "幻象、潛意識" },
  { number: 19, nameZh: "太陽",    nameEn: "The Sun",           slug: "sun",           element: "火", keyword: "喜悅、成功" },
  { number: 20, nameZh: "審判",    nameEn: "Judgement",         slug: "judgement",     element: "火", keyword: "覺醒、重生" },
  { number: 21, nameZh: "世界",    nameEn: "The World",         slug: "world",         element: "土", keyword: "完成、整合" },
];

// CDN URL 映射（女生版）
export const TAROT_CDN_FEMALE: Record<number, string> = {
  0:  `${CDN_BASE}/tarot-00-fool_209a184a.png`,
  1:  `${CDN_BASE}/tarot-01-magician_587f451f.png`,
  2:  `${CDN_BASE}/tarot-02-high-priestess_66387b70.png`,
  3:  `${CDN_BASE}/tarot-03-empress_6b719a99.png`,
  4:  `${CDN_BASE}/tarot-04-emperor_ac5d6849.png`,
  5:  `${CDN_BASE}/tarot-05-hierophant_c6c6577f.png`,
  6:  `${CDN_BASE}/tarot-06-lovers_7c20cf40.png`,
  7:  `${CDN_BASE}/tarot-07-chariot_858dca92.png`,
  8:  `${CDN_BASE}/tarot-08-strength_e3f21486.png`,
  9:  `${CDN_BASE}/tarot-09-hermit_631ae0f3.png`,
  10: `${CDN_BASE}/tarot-10-wheel_67e1c9fd.png`,
  11: `${CDN_BASE}/tarot-11-justice_bea7c64a.png`,
  12: `${CDN_BASE}/tarot-12-hanged-man_4cd83d38.png`,
  13: `${CDN_BASE}/tarot-13-death_8d932fad.png`,
  14: `${CDN_BASE}/tarot-14-temperance_273d0585.png`,
  15: `${CDN_BASE}/tarot-15-devil_af470907.png`,
  16: `${CDN_BASE}/tarot-16-tower_e7fbbba9.png`,
  17: `${CDN_BASE}/tarot-17-star_06f57e9b.png`,
  18: `${CDN_BASE}/tarot-18-moon_364aeb83.png`,
  19: `${CDN_BASE}/tarot-19-sun_da6c0879.png`,
  20: `${CDN_BASE}/tarot-20-judgement_82bbb589.png`,
  21: `${CDN_BASE}/tarot-21-world_78612742.png`,
};

// CDN URL 映射（男生版）
export const TAROT_CDN_MALE: Record<number, string> = {
  0:  `${CDN_BASE}/tarot-00-fool-male_6fd0708b.png`,
  1:  `${CDN_BASE}/tarot-01-magician-male_2acf2adc.png`,
  2:  `${CDN_BASE}/tarot-02-high-priestess-male_54550466.png`,
  3:  `${CDN_BASE}/tarot-03-empress-male_98ee97b5.png`,
  4:  `${CDN_BASE}/tarot-04-emperor-male_b0ea66c2.png`,
  5:  `${CDN_BASE}/tarot-05-hierophant-male_79c5be46.png`,
  6:  `${CDN_BASE}/tarot-06-lovers-male_2df2fbb8.png`,
  7:  `${CDN_BASE}/tarot-07-chariot-male_1f8c1948.png`,
  8:  `${CDN_BASE}/tarot-08-strength-male_3d525eb4.png`,
  9:  `${CDN_BASE}/tarot-09-hermit-male_366c9de0.png`,
  10: `${CDN_BASE}/tarot-10-wheel-male_9cfbd617.png`,
  11: `${CDN_BASE}/tarot-11-justice-male_fa347ad1.png`,
  12: `${CDN_BASE}/tarot-12-hanged-man-male_6d9f3813.png`,
  13: `${CDN_BASE}/tarot-13-death-male_2e7531ee.png`,
  14: `${CDN_BASE}/tarot-14-temperance-male_4255e07f.png`,
  15: `${CDN_BASE}/tarot-15-devil-male_fdc8bc1e.png`,
  16: `${CDN_BASE}/tarot-16-tower-male_976475cc.png`,
  17: `${CDN_BASE}/tarot-17-star-male_515803c6.png`,
  18: `${CDN_BASE}/tarot-18-moon-male_f8b0b082.png`,
  19: `${CDN_BASE}/tarot-19-sun-male_2d0391ab.png`,
  20: `${CDN_BASE}/tarot-20-judgement-male_cd53a8f0.png`,
  21: `${CDN_BASE}/tarot-21-world-male_de8268d2.png`,
};

/**
 * 根據性別和塔羅牌編號取得對應的 CDN URL
 * @param cardNumber 塔羅牌編號（0-21，22 視為 0 愚者）
 * @param gender 性別：'male' | 'female'
 */
export function getTarotCardUrl(cardNumber: number, gender: 'male' | 'female' | null | undefined): string {
  // 22 = 愚者（0號）
  const normalizedNumber = cardNumber === 22 ? 0 : Math.max(0, Math.min(21, cardNumber));
  const map = gender === 'male' ? TAROT_CDN_MALE : TAROT_CDN_FEMALE;
  return map[normalizedNumber] ?? TAROT_CDN_FEMALE[0];
}

/**
 * 根據塔羅牌編號取得卡牌資訊
 */
export function getTarotCardInfo(cardNumber: number): TarotCardInfo {
  const normalizedNumber = cardNumber === 22 ? 0 : Math.max(0, Math.min(21, cardNumber));
  return TAROT_CARDS[normalizedNumber] ?? TAROT_CARDS[0];
}
