/**
 * 靈相世界 - 遊戲美術素材 CDN URL 映射
 * TASK-003: 素體基底 (body-base)
 * TASK-004: 五行服裝 (element clothing)
 */

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663104688923/MLF7bLVZzzxdGTPVXTct3c";

export type WuxingElement = "wood" | "fire" | "earth" | "metal" | "water";
export type ClothingPart = "top" | "bottom" | "shoes" | "bracelet";
export type CharacterGender = "male" | "female";
export type ViewAngle = "front" | "left45" | "right45";

// ── TASK-003 素體基底 ──────────────────────────────────────────
export const BODY_BASE_URLS: Record<CharacterGender, string> = {
  female: `${CDN}/body-base-female_a20978c1.png`,
  male: `${CDN}/body-base-male_24e5b29d.png`,
};

// ── TASK-004 五行服裝（female-front）────────────────────────────
const FEMALE_FRONT: Record<WuxingElement, Record<ClothingPart, string>> = {
  wood: {
    top:      `${CDN}/top-wood-front_812eb6a1.png`,
    bottom:   `${CDN}/bottom-wood-front_109d6583.png`,
    shoes:    `${CDN}/shoes-wood-front_dbb08aaf.png`,
    bracelet: `${CDN}/bracelet-wood-front_40dc7c9c.png`,
  },
  fire: {
    top:      `${CDN}/top-fire-front_7732c75b.png`,
    bottom:   `${CDN}/bottom-fire-front_e559c8cb.png`,
    shoes:    `${CDN}/shoes-fire-front_3a4d099e.png`,
    bracelet: `${CDN}/bracelet-fire-front_75242e7e.png`,
  },
  earth: {
    top:      `${CDN}/top-earth-front_b8cf2162.png`,
    bottom:   `${CDN}/bottom-earth-front_00d8e725.png`,
    shoes:    `${CDN}/shoes-earth-front_8c792d37.png`,
    bracelet: `${CDN}/bracelet-earth-front_e8fd670f.png`,
  },
  metal: {
    top:      `${CDN}/top-metal-front_eab080b0.png`,
    bottom:   `${CDN}/bottom-metal-front_a0d10463.png`,
    shoes:    `${CDN}/shoes-metal-front_1f1a0575.png`,
    bracelet: `${CDN}/bracelet-metal-front_0bb2bc46.png`,
  },
  water: {
    top:      `${CDN}/top-water-front_3161dfd5.png`,
    bottom:   `${CDN}/bottom-water-front_cc18c076.png`,
    shoes:    `${CDN}/shoes-water-front_d7cb9f4b.png`,
    bracelet: `${CDN}/bracelet-water-front_87603bb8.png`,
  },
};

// ── TASK-004 五行服裝（male-front）──────────────────────────────
const MALE_FRONT: Record<WuxingElement, Record<ClothingPart, string>> = {
  wood: {
    top:      `${CDN}/top-wood-front_f8b7e756.png`,
    bottom:   `${CDN}/bottom-wood-front_056d071b.png`,
    shoes:    `${CDN}/shoes-wood-front_c6a96d12.png`,
    bracelet: `${CDN}/bracelet-wood-front_f570c863.png`,
  },
  fire: {
    top:      `${CDN}/top-fire-front_7732c75b.png`,
    bottom:   `${CDN}/bottom-fire-front_e559c8cb.png`,
    shoes:    `${CDN}/shoes-fire-front_3a4d099e.png`,
    bracelet: `${CDN}/bracelet-fire-front_75242e7e.png`,
  },
  earth: {
    top:      `${CDN}/top-earth-front_b8cf2162.png`,
    bottom:   `${CDN}/bottom-earth-front_00d8e725.png`,
    shoes:    `${CDN}/shoes-earth-front_8c792d37.png`,
    bracelet: `${CDN}/bracelet-earth-front_e8fd670f.png`,
  },
  metal: {
    top:      `${CDN}/top-metal-front_eab080b0.png`,
    bottom:   `${CDN}/bottom-metal-front_a0d10463.png`,
    shoes:    `${CDN}/shoes-metal-front_1f1a0575.png`,
    bracelet: `${CDN}/bracelet-metal-front_0bb2bc46.png`,
  },
  water: {
    top:      `${CDN}/top-water-front_3161dfd5.png`,
    bottom:   `${CDN}/bottom-water-front_cc18c076.png`,
    shoes:    `${CDN}/shoes-water-front_d7cb9f4b.png`,
    bracelet: `${CDN}/bracelet-water-front_87603bb8.png`,
  },
};

/**
 * 取得指定性別、五行元素的服裝 URL 映射
 */
export function getClothingUrls(
  gender: CharacterGender,
  element: WuxingElement
): Record<ClothingPart, string> {
  return gender === "female" ? FEMALE_FRONT[element] : MALE_FRONT[element];
}

/**
 * 五行主題背景設定
 */
export const WUXING_THEMES: Record<WuxingElement, {
  name: string;
  nameZh: string;
  gradient: string;
  particleColor: string;
  glowColor: string;
  accentColor: string;
  textColor: string;
}> = {
  wood: {
    name: "wood",
    nameZh: "木",
    gradient: "from-emerald-900 via-green-800 to-teal-900",
    particleColor: "#4ade80",
    glowColor: "rgba(74, 222, 128, 0.4)",
    accentColor: "#22c55e",
    textColor: "#bbf7d0",
  },
  fire: {
    name: "fire",
    nameZh: "火",
    gradient: "from-red-900 via-orange-800 to-amber-900",
    particleColor: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.4)",
    accentColor: "#ef4444",
    textColor: "#fed7aa",
  },
  earth: {
    name: "earth",
    nameZh: "土",
    gradient: "from-yellow-900 via-amber-800 to-stone-900",
    particleColor: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.4)",
    accentColor: "#d97706",
    textColor: "#fef3c7",
  },
  metal: {
    name: "metal",
    nameZh: "金",
    gradient: "from-slate-900 via-gray-800 to-zinc-900",
    particleColor: "#e2e8f0",
    glowColor: "rgba(226, 232, 240, 0.4)",
    accentColor: "#94a3b8",
    textColor: "#f1f5f9",
  },
  water: {
    name: "water",
    nameZh: "水",
    gradient: "from-blue-900 via-indigo-900 to-slate-900",
    particleColor: "#60a5fa",
    glowColor: "rgba(96, 165, 250, 0.4)",
    accentColor: "#3b82f6",
    textColor: "#bfdbfe",
  },
};
