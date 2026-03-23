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
  sceneName: string;
  gradient: string;
  particleColor: string;
  glowColor: string;
  accentColor: string;
  textColor: string;
  /** SVG 場景元素（小型裝飾用） */
  sceneSvgElements: string;
}> = {
  wood: {
    name: "wood",
    nameZh: "木",
    sceneName: "竹林幽境",
    gradient: "from-emerald-900 via-green-800 to-teal-900",
    particleColor: "#4ade80",
    glowColor: "rgba(74, 222, 128, 0.4)",
    accentColor: "#22c55e",
    textColor: "#bbf7d0",
    // 竹林：垂直竹干 + 樹葉
    sceneSvgElements: `
      <line x1="10%" y1="100%" x2="10%" y2="20%" stroke="#166534" stroke-width="8" opacity="0.6"/>
      <line x1="20%" y1="100%" x2="22%" y2="10%" stroke="#15803d" stroke-width="6" opacity="0.5"/>
      <line x1="75%" y1="100%" x2="73%" y2="15%" stroke="#166534" stroke-width="7" opacity="0.6"/>
      <line x1="85%" y1="100%" x2="87%" y2="25%" stroke="#14532d" stroke-width="5" opacity="0.4"/>
      <ellipse cx="10%" cy="20%" rx="12" ry="6" fill="#22c55e" opacity="0.5"/>
      <ellipse cx="22%" cy="10%" rx="10" ry="5" fill="#4ade80" opacity="0.4"/>
      <ellipse cx="73%" cy="15%" rx="11" ry="5" fill="#22c55e" opacity="0.5"/>
      <ellipse cx="87%" cy="25%" rx="9" ry="4" fill="#4ade80" opacity="0.4"/>
    `,
  },
  fire: {
    name: "fire",
    nameZh: "火",
    sceneName: "燙紅熔岩",
    gradient: "from-red-900 via-orange-800 to-amber-900",
    particleColor: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.4)",
    accentColor: "#ef4444",
    textColor: "#fed7aa",
    // 熔岩：底部準平線 + 準平燙紅光漿
    sceneSvgElements: `
      <rect x="0" y="88%" width="100%" height="12%" fill="url(#lavaGrad)" opacity="0.7"/>
      <defs>
        <linearGradient id="lavaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#dc2626" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#7f1d1d" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <ellipse cx="20%" cy="90%" rx="30" ry="8" fill="#f97316" opacity="0.6"/>
      <ellipse cx="60%" cy="92%" rx="25" ry="6" fill="#ef4444" opacity="0.5"/>
      <ellipse cx="85%" cy="89%" rx="20" ry="5" fill="#f97316" opacity="0.4"/>
      <path d="M5% 85% Q15% 75% 25% 85%" stroke="#dc2626" stroke-width="3" fill="none" opacity="0.5"/>
      <path d="M70% 83% Q80% 73% 90% 83%" stroke="#f87171" stroke-width="2" fill="none" opacity="0.4"/>
    `,
  },
  earth: {
    name: "earth",
    nameZh: "土",
    sceneName: "大地原野",
    gradient: "from-yellow-900 via-amber-800 to-stone-900",
    particleColor: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.4)",
    accentColor: "#d97706",
    textColor: "#fef3c7",
    // 大地：山丘輪廓 + 山峰
    sceneSvgElements: `
      <path d="M0 100% L15% 60% L30% 75% L50% 45% L70% 70% L85% 55% L100% 80% L100% 100% Z" fill="#78350f" opacity="0.5"/>
      <path d="M0 100% L20% 70% L40% 55% L60% 65% L80% 50% L100% 65% L100% 100% Z" fill="#92400e" opacity="0.4"/>
      <circle cx="50%" cy="15%" r="40" fill="#fbbf24" opacity="0.15"/>
      <circle cx="50%" cy="15%" r="25" fill="#f59e0b" opacity="0.2"/>
    `,
  },
  metal: {
    name: "metal",
    nameZh: "金",
    sceneName: "星空銀河",
    gradient: "from-slate-900 via-gray-800 to-zinc-900",
    particleColor: "#e2e8f0",
    glowColor: "rgba(226, 232, 240, 0.4)",
    accentColor: "#94a3b8",
    textColor: "#f1f5f9",
    // 星空：星點 + 銀河帶
    sceneSvgElements: `
      <circle cx="15%" cy="10%" r="2" fill="white" opacity="0.8"/>
      <circle cx="30%" cy="5%" r="1.5" fill="white" opacity="0.6"/>
      <circle cx="55%" cy="8%" r="2.5" fill="white" opacity="0.9"/>
      <circle cx="70%" cy="12%" r="1" fill="white" opacity="0.7"/>
      <circle cx="85%" cy="6%" r="2" fill="white" opacity="0.8"/>
      <circle cx="92%" cy="18%" r="1.5" fill="white" opacity="0.5"/>
      <ellipse cx="50%" cy="20%" rx="200" ry="15" fill="#e2e8f0" opacity="0.08" transform="rotate(-15 50% 20%)"/>
      <circle cx="40%" cy="7%" r="1" fill="#bfdbfe" opacity="0.9"/>
      <circle cx="65%" cy="3%" r="1.5" fill="#bfdbfe" opacity="0.7"/>
    `,
  },
  water: {
    name: "water",
    nameZh: "水",
    sceneName: "深海浚境",
    gradient: "from-blue-900 via-indigo-900 to-slate-900",
    particleColor: "#60a5fa",
    glowColor: "rgba(96, 165, 250, 0.4)",
    accentColor: "#3b82f6",
    textColor: "#bfdbfe",
    // 深海：波浪線 + 水泡
    sceneSvgElements: `
      <path d="M0 80% Q25% 70% 50% 80% T100% 80%" stroke="#3b82f6" stroke-width="2" fill="none" opacity="0.4"/>
      <path d="M0 85% Q25% 75% 50% 85% T100% 85%" stroke="#60a5fa" stroke-width="1.5" fill="none" opacity="0.3"/>
      <path d="M0 90% Q25% 82% 50% 90% T100% 90%" stroke="#93c5fd" stroke-width="1" fill="none" opacity="0.3"/>
      <circle cx="20%" cy="75%" r="15" stroke="#60a5fa" stroke-width="1" fill="none" opacity="0.3"/>
      <circle cx="75%" cy="78%" r="10" stroke="#93c5fd" stroke-width="1" fill="none" opacity="0.25"/>
      <ellipse cx="50%" cy="95%" rx="200" ry="20" fill="#1e3a5f" opacity="0.5"/>
    `,
  },
};
