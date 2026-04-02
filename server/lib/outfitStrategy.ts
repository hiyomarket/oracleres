/**
 * 穿搭策略資料庫 V3.0（神喻穿搭引擎 V3.0 智能化升級）
 * 基於蘇祐震命格（甲木日主，用神：火土金）
 * 
 * V3.0 核心升級：
 * 1. 五行上限保護機制 — 防止過旺五行繼續被推薦
 * 2. 流日脈絡分析層 — 判定根旺/借旺/虛旺，解釋能量來源
 * 3. 推理文案升級 — 結合脈絡分析，生成有命理深度的文案
 * 
 * 每個十神有真正不同的主色調，天干×月相進一步差異化
 */

import type { ElementRatio } from "./wuxingEngine";
import { NATAL_ELEMENT_RATIO } from "./wuxingEngine";

// ─── 五行上限保護閾值（V3.0 核心升級一）──────────────────────────
const ELEMENT_SUFFICIENT = 0.35;  // 充足：停止補強該五行
const ELEMENT_OVERPOWER = 0.40;   // 過旺：保護模式，禁止推薦該五行顏色
const ELEMENT_CRITICAL = 0.45;    // 嚴重過旺：保護模式 + 觸發剋制平衡

// 五行相剋關係（誰能剋制誰）
const ELEMENT_COUNTER: Record<string, string> = {
  火: "水", 水: "土", 土: "木", 木: "金", 金: "火",
};

// 五行相生關係
const ELEMENT_GENERATES: Record<string, string> = {
  木: "火", 火: "土", 土: "金", 金: "水", 水: "木",
};

// 五行對應顏色（用於動態替換）
const ELEMENT_COLOR_MAP: Record<string, { primary: string; secondary: string }> = {
  火: { primary: "朱紅 / 火焰橙", secondary: "珊瑚紅 / 暖橙紅" },
  土: { primary: "土黃 / 駝色", secondary: "卡其 / 米色" },
  金: { primary: "白色 / 銀色", secondary: "米白 / 香檳色" },
  木: { primary: "橄欖綠 / 深草綠", secondary: "翠綠 / 青色" },
  水: { primary: "深藍 / 黑色", secondary: "藏青 / 深灰" },
};

// ─── 天干個性描述 ─────────────────────────────────────────────────
export const STEM_PERSONALITY: Record<string, string> = {
  甲: "剛直挺拔", 乙: "柔韌蔓延", 丙: "光明熱烈", 丁: "溫潤細膩",
  戊: "厚重穩固", 己: "滋養包容", 庚: "銳利決斷", 辛: "精緻純淨",
  壬: "奔騰浩蕩", 癸: "靜謐深邃",
};

// ─── 天干款式庫 ──────────────────────────────────────────────────
export const OUTFIT_STYLE_BY_STEM: Record<string, {
  topStyle: string; bottomStyle: string; accessory: string; vibe: string;
}> = {
  甲: { topStyle: "挺括感立領或西裝領上衣", bottomStyle: "直筒或寬管褲", accessory: "木質或皮革配件", vibe: "大器剛直" },
  乙: { topStyle: "流線感V領或開襟上衣", bottomStyle: "A字裙或寬鬆長褲", accessory: "植物系或藤編配件", vibe: "柔美飄逸" },
  丙: { topStyle: "亮色系或有光澤感的上衣", bottomStyle: "修身直筒褲", accessory: "金屬光澤配件", vibe: "光芒四射" },
  丁: { topStyle: "柔和色調針織或棉麻上衣", bottomStyle: "柔軟質地長褲或裙子", accessory: "溫潤玉石或木質配件", vibe: "溫潤細膩" },
  戊: { topStyle: "厚實感翻領或立領上衣", bottomStyle: "寬版褲或工裝風格", accessory: "大地色系皮革配件", vibe: "厚重穩固" },
  己: { topStyle: "舒適包覆感圓領或船領上衣", bottomStyle: "寬鬆舒適休閒褲", accessory: "布藝或陶瓷配件", vibe: "溫暖包容" },
  庚: { topStyle: "俐落感V領或無領上衣", bottomStyle: "修身直筒褲", accessory: "金屬感配件", vibe: "銳利決斷" },
  辛: { topStyle: "精緻感高領或細節豐富上衣", bottomStyle: "剪裁精良直筒或小腳褲", accessory: "銀色或白色系配件", vibe: "精緻純淨" },
  壬: { topStyle: "流動感寬鬆上衣或外套", bottomStyle: "寬鬆飄逸長褲或長裙", accessory: "深色系或海洋風配件", vibe: "自由奔放" },
  癸: { topStyle: "低調質感素色或暗紋上衣", bottomStyle: "沉穩色調長褲", accessory: "深色系低調配件", vibe: "靜謐深邃" },
};

// ─── 十神穿搭策略（主色調真正差異化）────────────────────────────
// 甲木日主用神：火（食傷）> 土（財星）> 金（官殺）
// 每個十神的主色調都不同，反映當日能量特質
export const OUTFIT_STRATEGY_BY_TENGOD: Record<string, {
  topColor: string; topElement: string; topReason: string;
  bottomColor: string; bottomElement: string; bottomReason: string;
  shoesColor: string; shoesElement: string; shoesReason: string;
  accentColor: string;
  summary: string;
  energyTag: string;
}> = {
  食神: {
    topColor: "朱紅 / 火焰橙",
    topElement: "火",
    topReason: "食神日甲木化火，上半身著純粹火色強化才華輸出，讓創意能量從心口自然流出",
    bottomColor: "土黃 / 駝色",
    bottomElement: "土",
    bottomReason: "下半身土色穩固財星，讓才華能量落地變現，防止能量過度洩散",
    shoesColor: "白色 / 銀色",
    shoesElement: "金",
    shoesReason: "鞋著金色接地，以金洩火的循環保持能量平衡，步伐穩健有力",
    accentColor: "金色配件點綴",
    summary: "食神日才華全開，上朱紅下土黃配白鞋，是最強天命共振穿搭，讓你的光芒自然流露。",
    energyTag: "才華輸出日",
  },
  傷官: {
    topColor: "橙色 / 珊瑚橙",
    topElement: "火",
    topReason: "傷官日破繭之火，上半身著暖橙色展現突破氣場，與食神的朱紅有所區別，更顯個性",
    bottomColor: "深卡其 / 軍綠",
    bottomElement: "木",
    bottomReason: "傷官日可引木助火，下半身深卡其或軍綠色，讓突破能量有源源不絕的木氣支撐",
    shoesColor: "淺金 / 米白",
    shoesElement: "金",
    shoesReason: "鞋著淺金色，金的銳利為傷官的突破提供精準方向感",
    accentColor: "銅色或古銅配件",
    summary: "傷官日鋒芒畢露，上橙下軍綠配淺金鞋，展現你的獨特個性與突破力，與食神日明顯不同。",
    energyTag: "突破創新日",
  },
  偏財: {
    topColor: "土黃 / 金黃",
    topElement: "土",
    topReason: "偏財日財星入局，上半身著金黃土色直接呼應財星能量，讓財富磁場從上半身散發",
    bottomColor: "棕褐 / 深駝色",
    bottomElement: "土",
    bottomReason: "上下皆土色，雙重土能量厚積財星，讓偏財能量有充足的落腳之地",
    shoesColor: "香檳金 / 淺金",
    shoesElement: "金",
    shoesReason: "鞋著香檳金，金的光澤吸引財富，每一步都踩出財運",
    accentColor: "金色或黃銅配件",
    summary: "偏財日財星主導，全身土金色系，上金黃下棕褐配香檳金鞋，主動出擊的最佳財運穿搭。",
    energyTag: "偏財機遇日",
  },
  正財: {
    topColor: "米白 / 奶油色",
    topElement: "金",
    topReason: "正財日穩健積累，上半身著純淨米白色，展現可信賴的專業形象，以金生土的循環穩固財星",
    bottomColor: "深駝色 / 可可棕",
    bottomElement: "土",
    bottomReason: "下半身深駝色沉穩大方，財星能量踏實落地，長期積累的最佳配色",
    shoesColor: "珍珠白 / 白色",
    shoesElement: "金",
    shoesReason: "鞋著珍珠白，純淨的金能量讓每一步都走得穩健踏實",
    accentColor: "珍珠或白玉配件",
    summary: "正財日穩健積累，米白上衣配深駝色下裝搭珍珠白鞋，展現你的專業與可靠，與偏財日的金黃截然不同。",
    energyTag: "正財穩健日",
  },
  七殺: {
    topColor: "深紅 / 酒紅",
    topElement: "火",
    topReason: "七殺日壓力入局，上半身著深沉的酒紅色，以食神之火制七殺之金，化壓力為動力，氣場強悍",
    bottomColor: "深灰 / 炭灰",
    bottomElement: "水",
    bottomReason: "下半身深灰色中性沉穩，在強烈的上半身能量下提供視覺平衡，不讓壓力感過於外露",
    shoesColor: "黑色 / 深墨色",
    shoesElement: "水",
    shoesReason: "鞋著黑色，以水的沉穩接地，讓你在七殺日保持清醒的判斷力",
    accentColor: "銀色金屬配件",
    summary: "七殺日以火制金，酒紅上衣配深灰下裝搭黑鞋，展現你在壓力下的強大氣場，與其他日子的土色系明顯不同。",
    energyTag: "壓力轉化日",
  },
  正官: {
    topColor: "白色 / 淺灰",
    topElement: "金",
    topReason: "正官日規範護身，上半身著純淨白色或淺灰，展現成熟穩重的專業形象，金的純淨呼應官場規範",
    bottomColor: "深藏青 / 深藍",
    bottomElement: "水",
    bottomReason: "下半身深藍色正式莊重，水的深邃讓你在官場中展現智慧與深度",
    shoesColor: "黑色 / 深棕",
    shoesElement: "水",
    shoesReason: "鞋著黑色或深棕，正式感十足，讓你的整體造型符合正官日的規範氣場",
    accentColor: "銀色或深藍配件",
    summary: "正官日官運加持，白色上衣配深藍下裝搭黑鞋，展現你的專業與誠信，是最正式的天命穿搭。",
    energyTag: "正官規範日",
  },
  偏印: {
    topColor: "紫色 / 薰衣草紫",
    topElement: "火",
    topReason: "偏印日深水靜流，上半身著神秘的紫色，紫水晶之火點亮靈感，將深層思考轉化為創意火花",
    bottomColor: "米白 / 淺灰",
    bottomElement: "金",
    bottomReason: "下半身米白或淺灰清爽，讓思維保持清晰，不被過多能量干擾，以金的純淨輔助思考",
    shoesColor: "淺金 / 白色",
    shoesElement: "金",
    shoesReason: "鞋著淺金色，金的精準讓你的洞察力有落地的方向",
    accentColor: "紫水晶或深紫配件",
    summary: "偏印日智慧沉澱，紫色上衣配米白下裝搭淺金鞋，適合深度思考與靈感創作，紫色是今日獨有的能量色。",
    energyTag: "靈感智慧日",
  },
  正印: {
    topColor: "珊瑚紅 / 暖橙紅",
    topElement: "火",
    topReason: "正印日貴人相助，上半身著溫暖的珊瑚紅，展現親和力，吸引貴人能量，比食神的朱紅更溫柔",
    bottomColor: "米白 / 奶油白",
    bottomElement: "金",
    bottomReason: "下半身米白色純淨，讓貴人看到你的清澈與可靠，金的純淨增加可信度",
    shoesColor: "白色 / 米白",
    shoesElement: "金",
    shoesReason: "鞋著米白色，純淨的金能量讓你散發出值得信賴的氣質",
    accentColor: "玫瑰金或珍珠配件",
    summary: "正印日貴人加持，珊瑚紅上衣配米白下裝搭白鞋，展現你的親和力與可靠性，玫瑰金配件加分。",
    energyTag: "貴人相助日",
  },
  比肩: {
    topColor: "橄欖綠 / 深草綠",
    topElement: "木",
    topReason: "比肩日同氣相求，上半身著代表甲木本色的橄欖綠，展現個人特色與自我認同，以木引火為用",
    bottomColor: "土黃 / 卡其",
    bottomElement: "土",
    bottomReason: "下半身卡其色穩固根基，在展現自我的同時保持接地氣，木生火火生土的循環完整",
    shoesColor: "白色 / 銀色",
    shoesElement: "金",
    shoesReason: "鞋著銀色，金的銳利讓你在比肩日的競爭中保持清醒的判斷力",
    accentColor: "木質或竹製配件",
    summary: "比肩日獨立前行，橄欖綠上衣配卡其下裝搭銀鞋，以甲木本色展現你的獨特價值，綠色是今日的差異化標誌。",
    energyTag: "自我展現日",
  },
  劫財: {
    topColor: "深棕 / 可可棕",
    topElement: "土",
    topReason: "劫財日守住根基，上半身著沉穩的深棕色，低調但不失力量感，土的厚重守護財星",
    bottomColor: "深灰 / 炭灰",
    bottomElement: "水",
    bottomReason: "下半身深灰色收斂能量，在劫財日減少能量外洩，以靜制動",
    shoesColor: "深棕 / 黑色",
    shoesElement: "水",
    shoesReason: "鞋著深棕或黑色，沉穩低調，讓你在劫財日守住核心資產",
    accentColor: "黑曜石或深色配件",
    summary: "劫財日低調守財，深棕上衣配深灰下裝搭深棕鞋，全身沉穩大地色系，以靜制動保護能量。",
    energyTag: "守財防護日",
  },
};

// ─── 月相對穿搭的影響 ─────────────────────────────────────────────
export const MOON_PHASE_OUTFIT_MODIFIER: Record<string, string> = {
  新月: "新月之日，萬象更新。建議在主色系中加入一件白色或淺色單品，象徵新的開始，呼應月亮的新生能量。",
  上弦月: "上弦月能量上升，可在配件上選擇有光澤感的材質（如金屬、珍珠），呼應月亮的成長能量，讓整體造型更有層次。",
  滿月: "滿月能量最強！今日可大膽嘗試更鮮豔的主色（如正紅、亮橙），讓你的光芒與月亮滿盈之力共鳴，配件也可更加搶眼。",
  下弦月: "下弦月能量收斂，建議整體穿搭偏向低調沉穩，以大地色系為主，減少亮色配件，專注於內在積累。",
  殘月: "殘月之日，以靜制動。選擇舒適、低調的穿搭，為下一個月相周期蓄積能量，深色系或中性色最為適合。",
};

// ─── V3.0 神喻穿搭引擎 ─────────────────────────────────────────
/**
 * 用戶情境輸入（前端傳入）
 */
export interface UserContext {
  event?: 'important_meeting' | 'date' | 'interview' | 'creative_work' | 'negotiation' | 'rest' | 'creative_presentation' | 'rest_day' | null;
  mood?: 'confident' | 'anxious' | 'creative' | 'tired' | 'focused' | null;
}

/**
 * V3.0 流日脈絡分析（核心升級二）
 */
export interface DailyContextAnalysis {
  /** 當日最突出的五行 */
  dominantElement: string;
  /** 能量性質：根旺（本命+大運穩固）、借旺（流月/流日短暫帶旺）、虛旺（僅流日單維度） */
  sourceNature: '根旺' | '借旺' | '虛旺';
  /** 給用戶的核心說明（1-2句話） */
  keyMessage: string;
  /** 時間感提示 */
  urgency: '把握今日' | '長期方向' | '今日收斂';
}

/**
 * 五行保護狀態
 */
export interface ElementProtectionStatus {
  element: string;
  ratio: number;
  status: 'normal' | 'sufficient' | 'overpower' | 'critical';
  action: string;
}

/**
 * V3.0 穿搭建議（情境共振版 + 上限保護 + 脈絡分析）
 */
export interface OutfitAdviceV11 {
  topColor: string;
  topElement: string;
  bottomColor: string;
  bottomElement: string;
  shoesColor: string;
  shoesElement: string;
  accentColor: string;
  energyTag: string;
  summary: string;
  /** V3.0：動態推理文案（結合脈絡分析） */
  reasoning: string;
  /** V3.0：大運背景色影響說明 */
  daYunNote: string;
  /** V3.0：月相影響說明 */
  moonPhaseNote: string;
  /** V3.0：情境修正說明（若有） */
  contextNote?: string;
  /** V3.0 新增：流日脈絡分析 */
  dailyContextAnalysis?: DailyContextAnalysis;
  /** V3.0 新增：五行保護觸發記錄 */
  protectionTriggered?: ElementProtectionStatus[];
}

// 事件對應的能量強化方向
const EVENT_ELEMENT_BOOST: Record<string, { element: string; reason: string }> = {
  important_meeting: { element: '金', reason: '重要會議需要官殺之金的決斷力與威信' },
  interview:         { element: '金', reason: '面試場合需要正官之金的規範與可信度' },
  date:              { element: '火', reason: '約會場合需要食傷之火的魅力與表達力' },
  creative_work:     { element: '火', reason: '創意工作需要食神之火的靈感與才華輸出' },
  negotiation:       { element: '土', reason: '談判場合需要財星之土的穩健與落地感' },
  rest:              { element: '水', reason: '休息日可順應水的流動，選擇舒適低調的穿搭' },
  creative_presentation: { element: '火', reason: '創意發表提案需要食傷之火的魅力與才華表達，讓你的創意能量充分展現' },
  rest_day:          { element: '均衡', reason: '靜養充電日切換均衡守成模式，讓命格自然呼吸，不強制補強的舒適中性色系' },
};

// 心情對應的穿搭微調
const MOOD_MODIFIER: Record<string, string> = {
  confident: '今日心情自信，可大膽選擇主色系中較鮮豔的色調，讓自信從外在展現。',
  anxious:   '今日心情焦慮，建議選擇大地色系的穩重配色，讓土的能量幫助你安定心神。',
  creative:  '今日創意湧現，可在配件上加入一個火色系的亮點，讓靈感能量有出口。',
  tired:     '今日能量偏低，選擇舒適的棉麻材質，以自然系大地色為主，不需刻意補運。',
  focused:   '今日需要專注，選擇金色系的純淨配色，讓金的精準幫助你集中注意力。',
};

// ============================================================
// V3.0 核心升級一：五行上限保護機制
// ============================================================

/**
 * 掃描五行比例，判定每個五行的保護狀態
 */
export function scanElementProtection(
  weighted: ElementRatio
): ElementProtectionStatus[] {
  const elements = ["火", "木", "水", "土", "金"] as const;
  const results: ElementProtectionStatus[] = [];

  for (const el of elements) {
    const ratio = weighted[el] ?? 0;
    let status: ElementProtectionStatus["status"] = "normal";
    let action = "允許正常補強";

    if (ratio >= ELEMENT_CRITICAL) {
      status = "critical";
      action = `嚴重過旺（${Math.round(ratio * 100)}%），進入保護模式，禁止推薦${el}色系，並在配件層加入${ELEMENT_COUNTER[el]}色系（${ELEMENT_COUNTER[el]}剋${el}）進行剋制平衡`;
    } else if (ratio >= ELEMENT_OVERPOWER) {
      status = "overpower";
      action = `過旺（${Math.round(ratio * 100)}%），進入保護模式，禁止推薦${el}色系穿搭`;
    } else if (ratio >= ELEMENT_SUFFICIENT) {
      status = "sufficient";
      action = `充足（${Math.round(ratio * 100)}%），停止補強${el}，轉向補其他弱項`;
    }

    if (status !== "normal") {
      results.push({ element: el, ratio, status, action });
    }
  }

  return results;
}

/**
 * 根據保護狀態，動態替換穿搭顏色
 * 核心邏輯：
 * - 若上衣五行被保護 → 替換為最需要補充的喜用神顏色
 * - 若下裝五行被保護 → 替換為次優先喜用神顏色
 * - 若嚴重過旺 → 配件加入剋制色
 */
function applyElementProtection(
  topElement: string,
  topColor: string,
  bottomElement: string,
  bottomColor: string,
  shoesElement: string,
  shoesColor: string,
  accentColor: string,
  protections: ElementProtectionStatus[],
  weighted: ElementRatio,
): {
  topColor: string; topElement: string;
  bottomColor: string; bottomElement: string;
  shoesColor: string; shoesElement: string;
  accentColor: string;
  protectionNote: string;
} {
  const protectedElements = new Set(
    protections
      .filter(p => p.status === "overpower" || p.status === "critical")
      .map(p => p.element)
  );
  const sufficientElements = new Set(
    protections
      .filter(p => p.status === "sufficient")
      .map(p => p.element)
  );

  // 如果沒有任何保護觸發，直接返回原始值
  if (protectedElements.size === 0 && sufficientElements.size === 0) {
    return {
      topColor, topElement,
      bottomColor, bottomElement,
      shoesColor, shoesElement,
      accentColor,
      protectionNote: "",
    };
  }

  // 找出最需要補充的五行（喜用神中比例最低的）
  const favorableElements = ["火", "土", "金"];
  const sortedFavorable = favorableElements
    .filter(el => !protectedElements.has(el) && !sufficientElements.has(el))
    .sort((a, b) => (weighted[a as keyof ElementRatio] ?? 0) - (weighted[b as keyof ElementRatio] ?? 0));

  const bestSupplement = sortedFavorable[0] ?? "土";
  const secondSupplement = sortedFavorable[1] ?? (bestSupplement === "土" ? "金" : "土");

  let newTopColor = topColor;
  let newTopElement = topElement;
  let newBottomColor = bottomColor;
  let newBottomElement = bottomElement;
  let newShoesColor = shoesColor;
  let newShoesElement = shoesElement;
  let newAccentColor = accentColor;
  const notes: string[] = [];

  // 替換上衣（如果上衣五行被保護或充足）
  if (protectedElements.has(topElement) || sufficientElements.has(topElement)) {
    const replacementEl = bestSupplement;
    const colors = ELEMENT_COLOR_MAP[replacementEl];
    newTopColor = colors?.primary ?? topColor;
    newTopElement = replacementEl;
    notes.push(
      `上衣原推薦${topElement}色系，但${topElement}能量已${protectedElements.has(topElement) ? "過旺" : "充足"}（${Math.round((weighted[topElement as keyof ElementRatio] ?? 0) * 100)}%），` +
      `已替換為${replacementEl}色系（${newTopColor}），直接補充${replacementEl}能量`
    );
  }

  // 替換下裝（如果下裝五行被保護或充足）
  if (protectedElements.has(bottomElement) || sufficientElements.has(bottomElement)) {
    // 避免上下同五行（除非沒有其他選擇）
    const replacementEl = newTopElement === bestSupplement ? secondSupplement : bestSupplement;
    const colors = ELEMENT_COLOR_MAP[replacementEl];
    newBottomColor = colors?.secondary ?? bottomColor;
    newBottomElement = replacementEl;
    notes.push(
      `下裝原推薦${bottomElement}色系，但${bottomElement}能量已${protectedElements.has(bottomElement) ? "過旺" : "充足"}（${Math.round((weighted[bottomElement as keyof ElementRatio] ?? 0) * 100)}%），` +
      `已替換為${replacementEl}色系（${newBottomColor}）`
    );
  }

  // 替換鞋子（如果鞋子五行被保護）
  if (protectedElements.has(shoesElement)) {
    const usedElements = new Set([newTopElement, newBottomElement]);
    const shoeReplacement = favorableElements.find(el => !protectedElements.has(el) && !usedElements.has(el)) ?? secondSupplement;
    const colors = ELEMENT_COLOR_MAP[shoeReplacement];
    newShoesColor = colors?.secondary ?? shoesColor;
    newShoesElement = shoeReplacement;
  }

  // 嚴重過旺：配件加入剋制色
  const criticalElements = protections.filter(p => p.status === "critical");
  if (criticalElements.length > 0) {
    const critEl = criticalElements[0].element;
    const counterEl = ELEMENT_COUNTER[critEl];
    const counterColors = ELEMENT_COLOR_MAP[counterEl];
    newAccentColor = `${counterColors?.primary ?? counterEl + "色系"}配件（${counterEl}剋${critEl}，收斂過旺能量）`;
    notes.push(
      `${critEl}嚴重過旺（${Math.round(criticalElements[0].ratio * 100)}%），配件已加入${counterEl}色系進行剋制平衡`
    );
  }

  return {
    topColor: newTopColor,
    topElement: newTopElement,
    bottomColor: newBottomColor,
    bottomElement: newBottomElement,
    shoesColor: newShoesColor,
    shoesElement: newShoesElement,
    accentColor: newAccentColor,
    protectionNote: notes.join("。"),
  };
}

// ============================================================
// V3.0 核心升級二：流日脈絡分析層
// ============================================================

/**
 * 判定當日突出五行的能量性質
 * 
 * 根旺（Rooted Prosperity）：本命該五行 ≥ 20% 且環境也支持 → 穩固能量，過旺時需剋制
 * 借旺（Borrowed Prosperity）：本命該五行 < 15% 但環境帶旺 → 短暫視窗，應順勢利用
 * 虛旺（False Prosperity）：本命該五行 < 10% 且環境單維度帶旺 → 極短暫，把握當下
 */
export function determineSourceNature(
  dominantElement: string,
  weighted: ElementRatio,
  natalRatio?: Record<string, number>,
  environmentRatio?: ElementRatio,
): DailyContextAnalysis {
  const natal = natalRatio ?? NATAL_ELEMENT_RATIO;
  const natalPct = natal[dominantElement] ?? 0;
  // 如果 natal 是百分比整數（如 42），轉為小數
  const natalDecimal = natalPct > 1 ? natalPct / 100 : natalPct;
  const weightedPct = weighted[dominantElement as keyof ElementRatio] ?? 0;
  const weightedPctRound = Math.round(weightedPct * 100);

  // 計算環境貢獻度（如果沒有環境比例，從加權和本命反推）
  const envPct = environmentRatio
    ? (environmentRatio[dominantElement as keyof ElementRatio] ?? 0)
    : (weightedPct - natalDecimal * 0.3) / 0.7; // 反推：weighted = natal*0.3 + env*0.7

  let sourceNature: DailyContextAnalysis["sourceNature"];
  let keyMessage: string;
  let urgency: DailyContextAnalysis["urgency"];

  if (natalDecimal >= 0.20) {
    // 根旺：本命該五行就很強
    sourceNature = "根旺";
    if (weightedPct >= ELEMENT_OVERPOWER) {
      keyMessage = `${dominantElement}是你本命的根基能量（本命${Math.round(natalDecimal * 100)}%），今日環境進一步加持至${weightedPctRound}%，能量已過於飽和。穿搭策略應以收斂為主，避免火上加油。`;
      urgency = "今日收斂";
    } else {
      keyMessage = `${dominantElement}是你本命的穩固能量（本命${Math.round(natalDecimal * 100)}%），今日加權${weightedPctRound}%，這是長期趨勢的自然表現，可順勢而為。`;
      urgency = "長期方向";
    }
  } else if (natalDecimal >= 0.10) {
    // 借旺：本命中等，但環境帶旺
    sourceNature = "借旺";
    keyMessage = `今日${dominantElement}能量達到${weightedPctRound}%，但這並非你本命的常態（本命僅${Math.round(natalDecimal * 100)}%）。這是流月和流日共同帶來的短暫視窗，是難得的能量爆發期。穿搭建議順勢利用這股能量，把今天的靈感和創意轉化為實際成果。`;
    urgency = "把握今日";
  } else {
    // 虛旺：本命極弱，僅靠環境帶旺
    sourceNature = "虛旺";
    keyMessage = `今日${dominantElement}能量看似達到${weightedPctRound}%，但你本命${dominantElement}極弱（僅${Math.round(natalDecimal * 100)}%），這股能量幾乎完全來自今日的環境因素，極為短暫。明天這個視窗就會關閉，今天要特別珍惜並善用。`;
    urgency = "把握今日";
  }

  return {
    dominantElement,
    sourceNature,
    keyMessage,
    urgency,
  };
}

// ============================================================
// V3.0 核心升級三：推理文案升級
// ============================================================

/**
 * 生成動態推理文案（V3.0 核心功能）
 * 結合流日脈絡分析 + 五行保護狀態，生成有命理深度的文案
 */
export function generateReasoningText(
  tenGod: string,
  strategy: string,
  topColor: string,
  bottomColor: string,
  daYunRole: string,
  moonPhaseName: string,
  userContext?: UserContext,
  dailyContext?: DailyContextAnalysis,
  protections?: ElementProtectionStatus[],
  weighted?: ElementRatio,
): string {
  const baseStrategy = strategy || '均衡守成';
  const parts: string[] = [];

  // Part 1: 流日脈絡分析（V3.0 新增，最重要的部分）
  if (dailyContext) {
    const natureLabel: Record<string, string> = {
      '根旺': '穩固能量',
      '借旺': '借勢視窗',
      '虛旺': '短暫機遇',
    };
    const urgencyLabel: Record<string, string> = {
      '把握今日': '今日限定',
      '長期方向': '長期趨勢',
      '今日收斂': '需要收斂',
    };
    parts.push(
      `【${natureLabel[dailyContext.sourceNature]}・${urgencyLabel[dailyContext.urgency]}】 ${dailyContext.keyMessage}`
    );
  }

  // Part 2: 策略對應的核心邏輯說明（升級版，結合脈絡）
  const strategyLogic: Record<string, string> = {
    '強勢補弱': '今日宇宙能量有所缺失，我們需要主動出擊，用穿搭的顏色來補充命格中最需要的能量。',
    '借力打力': `今日${tenGod}入局，帶來一定的壓力與挑戰。聰明的做法不是硬碰硬，而是借助這股能量，轉化為前進的動力。`,
    '順勢生旺': `今日${tenGod}與你的用神完美共振，宇宙能量正在順行。我們不需要刻意去「補」，而是要「順勢」，讓自然的能量流動為你加持。`,
    '食神生財': `今日食神/傷官能量旺盛，你的才華（火）正處於高點。穿搭的重點是讓這股才華能量流動起來，最終化為實際的財富（土）。`,
    '均衡守成': '今日能量相對平衡，穿搭策略以守成為主，選擇能讓你感到舒適自在的配色，保持穩定的能量輸出。',
  };
  parts.push(strategyLogic[baseStrategy] || strategyLogic['均衡守成']);

  // Part 3: 五行保護說明（V3.0 新增）
  if (protections && protections.length > 0) {
    const criticals = protections.filter(p => p.status === "critical");
    const overpowers = protections.filter(p => p.status === "overpower");
    if (criticals.length > 0) {
      const el = criticals[0].element;
      const pct = Math.round(criticals[0].ratio * 100);
      const counter = ELEMENT_COUNTER[el];
      parts.push(
        `特別注意：${el}能量已嚴重過旺（${pct}%），系統已啟動保護機制，禁止推薦${el}色系穿搭，並在配件中加入${counter}色系（${counter}剋${el}）進行能量收斂。`
      );
    } else if (overpowers.length > 0) {
      const el = overpowers[0].element;
      const pct = Math.round(overpowers[0].ratio * 100);
      parts.push(
        `注意：${el}能量已過旺（${pct}%），系統已啟動保護模式，今日穿搭已避開${el}色系，轉向補充其他弱項。`
      );
    }
  }

  // Part 4: 穿搭建議
  parts.push(`今日建議：**${topColor}上衣**搭配**${bottomColor}下裝**。`);

  // Part 5: 大運背景色說明
  if (daYunRole) {
    parts.push(`（大運背景：你目前正走「${daYunRole}」大運，這是今日穿搭的長期底色。）`);
  }

  // Part 6: 月相說明
  if (moonPhaseName) {
    parts.push(`今日月相為「${moonPhaseName}」，月亮的能量也在影響著今日的氣場。`);
  }

  // Part 7: 情境說明
  if (userContext?.event && EVENT_ELEMENT_BOOST[userContext.event]) {
    const boost = EVENT_ELEMENT_BOOST[userContext.event];
    parts.push(`特別提醒：今日你有「${getEventLabel(userContext.event)}」，${boost.reason}，穿搭已針對此情境進行微調。`);
  }
  if (userContext?.mood && MOOD_MODIFIER[userContext.mood]) {
    parts.push(MOOD_MODIFIER[userContext.mood]);
  }

  return parts.filter(Boolean).join(' ');
}

function getEventLabel(event: string): string {
  const labels: Record<string, string> = {
    important_meeting: '重要會議',
    date: '約會',
    interview: '面試',
    creative_work: '創意工作',
    negotiation: '商業談判',
    rest: '休息日',
    creative_presentation: '創意發表提案',
    rest_day: '靜養充電日',
  };
  return labels[event] || event;
}

// ============================================================
// V3.0 主函數：生成情境共振穿搭建議
// ============================================================

/**
 * 生成 V3.0 情境共振穿搭建議
 * 整合：基礎十神策略 + 五行上限保護 + 流日脈絡分析 + 大運背景色 + 月相 + 用戶情境
 * 
 * @param tenGod - 今日十神
 * @param dailyStrategy - 今日策略名稱
 * @param daYunRole - 大運角色
 * @param daYunKeyTheme - 大運主題
 * @param moonPhaseName - 月相名稱
 * @param moonPhaseType - 月相類型
 * @param userContext - 用戶情境（可選）
 * @param weighted - 今日五行加權比例（V3.0 新增，可選，提供時啟用保護機制）
 * @param environmentRatio - 環境五行比例（V3.0 新增，可選，用於脈絡分析）
 */
export function generateOutfitAdviceV11(
  tenGod: string,
  dailyStrategy: string,
  daYunRole: string,
  daYunKeyTheme: string,
  moonPhaseName: string,
  moonPhaseType: string,
  userContext?: UserContext,
  weighted?: ElementRatio,
  environmentRatio?: ElementRatio,
): OutfitAdviceV11 {
  // Step 1: 取得基礎十神穿搭策略
  const baseOutfit = OUTFIT_STRATEGY_BY_TENGOD[tenGod] ?? OUTFIT_STRATEGY_BY_TENGOD['食神'];

  let topColor = baseOutfit.topColor;
  let topElement = baseOutfit.topElement;
  let bottomColor = baseOutfit.bottomColor;
  let bottomElement = baseOutfit.bottomElement;
  let shoesColor = baseOutfit.shoesColor;
  let shoesElement = baseOutfit.shoesElement;
  let accentColor = baseOutfit.accentColor;
  let contextNote: string | undefined;
  let dailyContextAnalysis: DailyContextAnalysis | undefined;
  let protectionTriggered: ElementProtectionStatus[] | undefined;

  // Step 2: V3.0 五行上限保護機制（核心升級一）
  if (weighted) {
    const protections = scanElementProtection(weighted);
    if (protections.length > 0) {
      protectionTriggered = protections;
      const result = applyElementProtection(
        topElement, topColor,
        bottomElement, bottomColor,
        shoesElement, shoesColor,
        accentColor,
        protections,
        weighted,
      );
      topColor = result.topColor;
      topElement = result.topElement;
      bottomColor = result.bottomColor;
      bottomElement = result.bottomElement;
      shoesColor = result.shoesColor;
      shoesElement = result.shoesElement;
      accentColor = result.accentColor;
      if (result.protectionNote) {
        contextNote = result.protectionNote;
      }
    }

    // Step 3: V3.0 流日脈絡分析（核心升級二）
    // 找出加權後最突出的五行
    const sorted = Object.entries(weighted).sort(([, a], [, b]) => b - a);
    const dominantEl = sorted[0]?.[0] ?? "木";
    dailyContextAnalysis = determineSourceNature(
      dominantEl,
      weighted,
      NATAL_ELEMENT_RATIO,
      environmentRatio,
    );
  }

  // Step 4: 情境修正（事件導向的顏色微調）
  if (userContext?.event) {
    const boost = EVENT_ELEMENT_BOOST[userContext.event];
    if (boost) {
      if ((userContext.event === 'important_meeting' || userContext.event === 'interview')
          && topElement !== '金') {
        topColor = `${topColor}（建議加入白色或銀色配件強化決斷力）`;
        contextNote = (contextNote ? contextNote + '。' : '') +
          `今日有${getEventLabel(userContext.event)}，已在穿搭中強化金元素的決斷氣場。`;
      }
      if ((userContext.event === 'date' || userContext.event === 'creative_work')
          && topElement !== '火') {
        topColor = `${topColor}（建議加入一件暖色系配件提升魅力）`;
        contextNote = (contextNote ? contextNote + '。' : '') +
          `今日有${getEventLabel(userContext.event)}，已在穿搭中加強火元素的表達力。`;
      }
      if (userContext.event === 'creative_presentation') {
        topColor = `${topColor}（建議加入暖色系主色提升創意展現力）`;
        contextNote = (contextNote ? contextNote + '。' : '') +
          `今日有創意發表提案，食傷之火的暖色系讓你的才華與魅力充分展現。`;
      }
      if (userContext.event === 'rest_day') {
        topColor = '大地色/米白色/淡灰色';
        bottomColor = '大地色/淡襲色';
        shoesColor = '小麥色/小白色';
        contextNote = (contextNote ? contextNote + '。' : '') +
          `今日為靜養充電日，已切換均衡守成模式——不強制補強，讓命格自然呼吸。舒適中性色系是今日最好的選擇。`;
      }
    }
  }

  // Step 5: 月相微調
  let moonPhaseNote = MOON_PHASE_OUTFIT_MODIFIER['殘月'];
  if (moonPhaseName === '滿月' || moonPhaseType === 'full_moon') {
    moonPhaseNote = MOON_PHASE_OUTFIT_MODIFIER['滿月'];
    topColor = topColor.replace('/', '/ 可選更鮮豔的');
  } else if (moonPhaseName === '新月' || moonPhaseType === 'new_moon') {
    moonPhaseNote = MOON_PHASE_OUTFIT_MODIFIER['新月'];
  } else if (moonPhaseType === 'first_quarter') {
    moonPhaseNote = MOON_PHASE_OUTFIT_MODIFIER['上弦月'];
  } else if (moonPhaseType === 'last_quarter') {
    moonPhaseNote = MOON_PHASE_OUTFIT_MODIFIER['下弦月'];
  }

  // Step 6: 大運背景色注記
  const daYunNote = daYunKeyTheme
    ? `大運主題「${daYunKeyTheme.slice(0, 15)}...」正在影響你的長期能量背景色，今日穿搭已納入此背景。`
    : '';

  // Step 7: 生成推理文案（V3.0 升級版）
  const reasoning = generateReasoningText(
    tenGod,
    dailyStrategy,
    topColor,
    bottomColor,
    daYunRole,
    moonPhaseName,
    userContext,
    dailyContextAnalysis,
    protectionTriggered,
    weighted,
  );

  // Step 8: 更新 summary（如果有保護觸發，更新摘要）
  let summary = baseOutfit.summary;
  if (protectionTriggered && protectionTriggered.length > 0) {
    const criticals = protectionTriggered.filter(p => p.status === "critical");
    if (criticals.length > 0) {
      summary = `今日${criticals[0].element}嚴重過旺，穿搭已啟動保護機制：${topColor}上衣配${bottomColor}下裝，配件加入${ELEMENT_COUNTER[criticals[0].element]}色系收斂能量。`;
    } else {
      summary = `今日穿搭已根據五行保護機制調整：${topColor}上衣配${bottomColor}下裝，避開過旺五行，直接補充弱項。`;
    }
  }

  return {
    topColor,
    topElement,
    bottomColor,
    bottomElement,
    shoesColor,
    shoesElement,
    accentColor,
    energyTag: baseOutfit.energyTag,
    summary,
    reasoning,
    daYunNote,
    moonPhaseNote,
    contextNote,
    dailyContextAnalysis,
    protectionTriggered,
  };
}
