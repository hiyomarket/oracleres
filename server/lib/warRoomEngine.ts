/**
 * 今日作戰室核心引擎
 * 整合塔羅流日、穿搭建議、手串推薦、財運羅盤
 * 命格常數統一從 userProfile.ts 引用
 */
import { FAVORABLE_ELEMENTS, UNFAVORABLE_ELEMENTS, ELEMENT_COLORS as PROFILE_ELEMENT_COLORS } from "./userProfile";

// ─── 塔羅牌資料庫 ───────────────────────────────────────────────
export const TAROT_CARDS: Record<number, {
  name: string;
  element: string;
  keywords: string[];
  advice: string;
  energy: string;
}> = {
  1:  { name: "魔術師", element: "風", keywords: ["意志力", "創造", "行動"], advice: "今日一切皆有可能，主動出擊，展現你的能力", energy: "高度主動能量" },
  2:  { name: "女祭司", element: "水", keywords: ["直覺", "神秘", "等待"], advice: "傾聽內心聲音，不急於行動，靜觀其變", energy: "深層洞察能量" },
  3:  { name: "女皇", element: "土", keywords: ["豐盛", "創造力", "感官"], advice: "享受生活之美，創意與財富皆有豐收", energy: "豐盛滋養能量" },
  4:  { name: "皇帝", element: "火", keywords: ["權威", "秩序", "穩定"], advice: "以領導者姿態行事，建立規則與結構", energy: "權威掌控能量" },
  5:  { name: "教皇", element: "土", keywords: ["傳統", "智慧", "指引"], advice: "尋求導師指引，遵循傳統智慧，精神修煉", energy: "靈性智慧能量" },
  6:  { name: "戀人", element: "風", keywords: ["選擇", "愛情", "和諧"], advice: "面對重要選擇，以心為指引，人際關係和諧", energy: "連結和諧能量" },
  7:  { name: "戰車", element: "水", keywords: ["勝利", "意志", "前進"], advice: "以堅定意志克服障礙，勝利在望", energy: "衝刺突破能量" },
  8:  { name: "力量", element: "火", keywords: ["勇氣", "耐心", "內在力量"], advice: "以柔克剛，展現內在力量，勇敢面對挑戰", energy: "內在力量能量" },
  9:  { name: "隱者", element: "土", keywords: ["沉思", "獨處", "智慧"], advice: "今日適合獨處沉澱，向內探索，尋找答案", energy: "深度沉澱能量" },
  10: { name: "命運之輪", element: "火", keywords: ["轉機", "命運", "循環"], advice: "命運轉折點，把握機遇，順應宇宙流動", energy: "命運轉機能量" },
  11: { name: "正義", element: "風", keywords: ["公正", "真相", "平衡"], advice: "以公正之心處事，真相將浮現，因果有報", energy: "公正平衡能量" },
  12: { name: "倒吊人", element: "水", keywords: ["犧牲", "等待", "新視角"], advice: "暫停腳步，從不同角度看問題，等待時機", energy: "轉化等待能量" },
  13: { name: "死神", element: "水", keywords: ["轉變", "結束", "新生"], advice: "舊事物的結束是新生的開始，勇敢放下", energy: "蛻變新生能量" },
  14: { name: "節制", element: "火", keywords: ["平衡", "耐心", "調和"], advice: "保持平衡，不走極端，耐心調和各方力量", energy: "調和平衡能量" },
  15: { name: "惡魔", element: "土", keywords: ["束縛", "物質", "誘惑"], advice: "警惕物質誘惑與執念，認清真正的自由", energy: "警示覺察能量" },
  16: { name: "塔", element: "火", keywords: ["突破", "崩塌", "啟示"], advice: "舊有結構崩塌，是為更好重建，接受改變", energy: "震盪突破能量" },
  17: { name: "星星", element: "風", keywords: ["希望", "靈感", "療癒"], advice: "充滿希望的一天，靈感湧現，療癒身心", energy: "希望靈感能量" },
  18: { name: "月亮", element: "水", keywords: ["幻象", "直覺", "潛意識"], advice: "警惕幻象與誤解，信任直覺，深入潛意識", energy: "神秘直覺能量" },
  19: { name: "太陽", element: "火", keywords: ["成功", "喜悅", "活力"], advice: "充滿活力的大吉之日，自信展現，成功在望", energy: "光明成功能量" },
  20: { name: "審判", element: "火", keywords: ["覺醒", "召喚", "重生"], advice: "聆聽內心的召喚，做出重要決定，迎接覺醒", energy: "覺醒召喚能量" },
  21: { name: "世界", element: "土", keywords: ["完成", "整合", "成就"], advice: "一個重要階段圓滿完成，整合所有收穫", energy: "圓滿整合能量" },
  22: { name: "愚者", element: "風", keywords: ["新開始", "冒險", "純真"], advice: "以純真之心踏上新旅程，勇敢冒險", energy: "純真冒險能量" },
};

/**
 * 計算塔羅流日（蘇先生專屬：中間個性10 + 當月 + 當日數字和）
 */
export function calculateTarotDailyCard(month: number, day: number): {
  cardNumber: number;
  card: typeof TAROT_CARDS[number];
  calculation: string;
} {
  // 當日數字：若兩位數則相加
  const daySum = day >= 10 ? Math.floor(day / 10) + (day % 10) : day;
  const total = 10 + month + daySum;

  // 歸約至1-22（22保留為愚者）
  let cardNumber = total;
  if (cardNumber > 22) {
    const digits = String(cardNumber).split("").map(Number);
    cardNumber = digits.reduce((a, b) => a + b, 0);
  }
  if (cardNumber > 22) cardNumber = cardNumber % 22 || 22;
  if (cardNumber === 0) cardNumber = 22;

  return {
    cardNumber,
    card: TAROT_CARDS[cardNumber],
    calculation: `中間個性(10) + ${month}月 + ${day}日(${daySum}) = ${total} → ${cardNumber}號`,
  };
}

// ─── 五行顏色對應 // ─── 五行顏色對應（從 userProfile 引用）───────────────────────────
const ELEMENT_COLORS_DETAIL: Record<string, { colors: string[]; hex: string[] }> = {
  木: { colors: ["翠綠", "草綠", "青色", "橄欖綠"], hex: ["#2d6a4f", "#52b788", "#74c69d", "#40916c"] },
  火: { colors: ["朱紅", "橙色", "火焰橙", "珊瑚紅"], hex: ["#e63946", "#f4a261", "#e76f51", "#c1121f"] },
  土: { colors: ["土黃", "駝色", "米白", "棕褐"], hex: ["#c9a84c", "#d4a373", "#e9c46a", "#a0785a"] },
  金: { colors: ["白色", "銀色", "米白", "淺金"], hex: ["#ffffff", "#c0c0c0", "#f5f5f5", "#d4af37"] },
  水: { colors: ["深藍", "黑色", "深灰", "靖藍"], hex: ["#023e8a", "#03045e", "#1b1b2f", "#264653"] },
};

/**
 * 根據五行能量生成穿搭建議
 * 蘇先生用神：火（最優先）、土（第二）、金（第三）
 * 忌神：水、木（過旺）
 */
export function generateOutfitAdvice(dailyElement: string, dailyScore: number): {
  top: { color: string; element: string; reason: string };
  bottom: { color: string; element: string; reason: string };
  shoes: { color: string; element: string; reason: string };
  summary: string;
} {
  // 根據當日能量決定穿搭策略
  // 今日能量強（火土金日）→ 強化用神色
  // 今日能量弱（水木日）→ 補充用神色，避免忌神色

  const isAuspicious = FAVORABLE_ELEMENTS.includes(dailyElement as typeof FAVORABLE_ELEMENTS[number]);

  if (dailyElement === "火" || dailyScore >= 8) {
    return {
      top: { color: "朱紅/火焰橙", element: "火", reason: "上半身著火色，強化今日食神才華能量，展現自信魅力" },
      bottom: { color: "土黃/駝色", element: "土", reason: "下半身著土色，以財星穩固火能量，防止過度洩散" },
      shoes: { color: "白色/銀色", element: "金", reason: "鞋子著金色，以金洩火生水的循環，保持能量平衡" },
      summary: "今日火能量旺盛，上紅下黃配白鞋，是最強的天命共振穿搭。",
    };
  } else if (dailyElement === "土" || dailyScore >= 6) {
    return {
      top: { color: "橙色/珊瑚紅", element: "火", reason: "上半身著火色，以火生土，強化今日財星能量" },
      bottom: { color: "土黃/米白", element: "土", reason: "下半身著土色，直接強化財星，穩健積累" },
      shoes: { color: "白色/淺金", element: "金", reason: "鞋子著金色，土生金的循環，財富自然流動" },
      summary: "今日土能量主導，上橙下黃配白鞋，財運加持的最佳穿搭。",
    };
  } else if (dailyElement === "金") {
    return {
      top: { color: "火焰橙/朱紅", element: "火", reason: "上半身著火色，以火剋金，防止金能量過強壓制甲木" },
      bottom: { color: "土黃/駝色", element: "土", reason: "下半身著土色，土生金的緩衝，平衡金能量" },
      shoes: { color: "白色/銀色", element: "金", reason: "鞋子著金色，接地氣，讓金能量落地生根" },
      summary: "今日金能量主導，以火制金，上橙下黃配白鞋，化壓力為動力。",
    };
  } else if (dailyElement === "水") {
    return {
      top: { color: "朱紅/橙色", element: "火", reason: "上半身必著火色，以火制水，補充今日最缺的用神能量" },
      bottom: { color: "土黃/棕褐", element: "土", reason: "下半身著土色，以土剋水，築壩擋水，保護財星" },
      shoes: { color: "白色/米白", element: "金", reason: "鞋子著金色，金生水的循環雖不理想，但白色中性，不加重水能量" },
      summary: "今日水能量過旺，全身以火土為主色，是今日最重要的能量補充策略。",
    };
  } else {
    // 木日
    return {
      top: { color: "朱紅/火焰橙", element: "火", reason: "上半身著火色，木生火，今日是洩木補火的最佳時機" },
      bottom: { color: "土黃/駝色", element: "土", reason: "下半身著土色，以財星為目標，引導木能量流向財富" },
      shoes: { color: "白色/銀色", element: "金", reason: "鞋子著金色，以金剋木，防止木能量過旺失控" },
      summary: "今日木能量旺盛，以火土金配色引導能量，將過旺的木轉化為財富動力。",
    };
  }
}

// ─── 手串資料庫（HS-01 ~ HS-11）─────────────────────────────────
export const BRACELET_DB: Record<string, {
  id: string;
  name: string;
  primaryElement: string;
  secondaryElement?: string;
  role: string;
  power: string;
}> = {
  "HS-01": { id: "HS-01", name: "多彩虎眼石手串", primaryElement: "土", secondaryElement: "金", role: "穩定財星", power: "增強決斷力，穩固財運，土金雙補" },
  "HS-02": { id: "HS-02", name: "紫晶智慧招財手串", primaryElement: "火", secondaryElement: "木", role: "才華展現", power: "紫水晶補火，天河石補木，多元能量整合" },
  "HS-03": { id: "HS-03", name: "酒紅石榴石手串", primaryElement: "火", role: "用神補火", power: "純粹火能量，強化食神才華，提升行動力" },
  "HS-04": { id: "HS-04", name: "經典黃虎眼石手串", primaryElement: "土", secondaryElement: "金", role: "財星穩固", power: "黃虎眼土能量，穩定財星，增強現實掌控力" },
  "HS-05": { id: "HS-05", name: "太赫茲能量手串", primaryElement: "金", role: "官殺防護", power: "金能量防護，提升決斷力，化解外部壓力" },
  "HS-06": { id: "HS-06", name: "白硨磲手串", primaryElement: "金", secondaryElement: "水", role: "淨化防護", power: "白硨磲金水雙屬，淨化負能量，柔和防護" },
  "HS-07": { id: "HS-07", name: "金太陽石手串", primaryElement: "火", secondaryElement: "土", role: "雙重用神", power: "金沙石火土雙補，最強用神組合，財運與才華並進" },
  "HS-08": { id: "HS-08", name: "沉香木手串", primaryElement: "木", secondaryElement: "土", role: "靜心安神", power: "沉香木安神靜心，適合冥想與靈性修煉" },
  "HS-09": { id: "HS-09", name: "天珠瑪瑙手串", primaryElement: "水", secondaryElement: "金", role: "智慧深化", power: "黑瑪瑙水能量，深化直覺，但水木日慎用" },
  "HS-10": { id: "HS-10", name: "和田玉竹節手串", primaryElement: "土", secondaryElement: "水", role: "財星滋養", power: "和田玉土能量，養財護財，黑瑪瑙輔助" },
  "HS-11": { id: "HS-11", name: "黃虎眼石貔貅手串", primaryElement: "土", secondaryElement: "金", role: "招財辟邪", power: "貔貅招財，虎眼石土金雙補，最強財運護符" },
};

/**
 * 根據當日五行能量推薦手串
 * 左手：補充用神能量（吸收）
 * 右手：防護忌神（排出）
 * 最多配戴四條，取居中值
 */
export function recommendBracelets(dailyElement: string, dailyScore: number): {
  leftHand: Array<{ bracelet: typeof BRACELET_DB[string]; reason: string; priority: number }>;
  rightHand: Array<{ bracelet: typeof BRACELET_DB[string]; reason: string; priority: number }>;
  summary: string;
} {
  const leftHand: Array<{ bracelet: typeof BRACELET_DB[string]; reason: string; priority: number }> = [];
  const rightHand: Array<{ bracelet: typeof BRACELET_DB[string]; reason: string; priority: number }> = [];

  if (dailyElement === "火" || dailyScore >= 8) {
    // 火日：左手強化火土，右手防護水木
    leftHand.push(
      { bracelet: BRACELET_DB["HS-03"], reason: "火日首選，純火能量與今日天命共振，才華全開", priority: 1 },
      { bracelet: BRACELET_DB["HS-07"], reason: "金太陽石火土雙補，在火日中同時穩固財星", priority: 2 },
    );
    rightHand.push(
      { bracelet: BRACELET_DB["HS-05"], reason: "太赫茲金能量，防護水木忌神，提升決斷力", priority: 1 },
      { bracelet: BRACELET_DB["HS-11"], reason: "貔貅招財，在火日中鎖住財運，防止財氣外洩", priority: 2 },
    );
  } else if (dailyElement === "土") {
    // 土日：左手補火引土，右手防水
    leftHand.push(
      { bracelet: BRACELET_DB["HS-07"], reason: "金太陽石火土雙補，土日最強共振，財運加持", priority: 1 },
      { bracelet: BRACELET_DB["HS-04"], reason: "黃虎眼石直接強化土能量，穩固財星根基", priority: 2 },
    );
    rightHand.push(
      { bracelet: BRACELET_DB["HS-11"], reason: "貔貅招財辟邪，土日鎖財最佳選擇", priority: 1 },
      { bracelet: BRACELET_DB["HS-05"], reason: "太赫茲防護，化解外部壓力與競爭", priority: 2 },
    );
  } else if (dailyElement === "金") {
    // 金日：左手補火制金，右手穩土
    leftHand.push(
      { bracelet: BRACELET_DB["HS-03"], reason: "石榴石純火能量，以火制金，防止金能量過強", priority: 1 },
      { bracelet: BRACELET_DB["HS-02"], reason: "紫晶手串補火，同時整合多元能量", priority: 2 },
    );
    rightHand.push(
      { bracelet: BRACELET_DB["HS-01"], reason: "多彩虎眼石土金雙屬，緩衝金能量，穩定情緒", priority: 1 },
      { bracelet: BRACELET_DB["HS-10"], reason: "和田玉養財護財，在金日中保護財星不受侵蝕", priority: 2 },
    );
  } else if (dailyElement === "水") {
    // 水日：左手大補火土，右手防水
    leftHand.push(
      { bracelet: BRACELET_DB["HS-03"], reason: "水日必戴！石榴石純火能量，是今日最重要的能量補充", priority: 1 },
      { bracelet: BRACELET_DB["HS-07"], reason: "金太陽石火土雙補，全面對抗水日的能量失衡", priority: 2 },
    );
    rightHand.push(
      { bracelet: BRACELET_DB["HS-11"], reason: "貔貅招財，在水日中尤其重要，防止財運被水沖走", priority: 1 },
      { bracelet: BRACELET_DB["HS-05"], reason: "太赫茲金能量防護，以金洩水，減輕水能量的壓力", priority: 2 },
    );
  } else {
    // 木日：左手補火洩木，右手以金制木
    leftHand.push(
      { bracelet: BRACELET_DB["HS-07"], reason: "木日以火洩木，金太陽石是最佳橋樑，引木能量化為財富", priority: 1 },
      { bracelet: BRACELET_DB["HS-03"], reason: "石榴石補火，加速木生火的能量轉化", priority: 2 },
    );
    rightHand.push(
      { bracelet: BRACELET_DB["HS-05"], reason: "太赫茲金能量，以金制木，防止木能量過旺失控", priority: 1 },
      { bracelet: BRACELET_DB["HS-04"], reason: "黃虎眼石土金雙補，穩固財星，防止木剋土", priority: 2 },
    );
  }

  const summaryMap: Record<string, string> = {
    火: "火日大吉！左手石榴石+金太陽石補火，右手太赫茲+貔貅防護，四條手串全力共振。",
    土: "土日財星旺！左手金太陽石+黃虎眼石穩財，右手貔貅+太赫茲鎖財防護。",
    金: "金日需制衡！左手石榴石+紫晶補火制金，右手多彩虎眼石+和田玉緩衝平衡。",
    水: "水日補火急！左手石榴石+金太陽石雙火補充，右手貔貅+太赫茲全力防護。",
    木: "木日引火洩！左手金太陽石+石榴石引木化火，右手太赫茲+黃虎眼石制木穩財。",
  };

  return {
    leftHand,
    rightHand,
    summary: summaryMap[dailyElement] || "今日以補充用神（火土金）為主要策略，左手補能，右手防護。",
  };
}

// ─── 財運羅盤 ─────────────────────────────────────────────────────
export function generateWealthCompass(
  dailyElement: string,
  tenGod: string,
  tarotCard: typeof TAROT_CARDS[number],
  overallScore: number,
): {
  lotteryIndex: number; // 1-10
  lotteryAdvice: string;
  wealthEngine: string;
  businessCompass: string;
  bestAction: string;
} {
  // 偏財指數：土日（偏財）最高，火日（食神生財）次之
  const lotteryMap: Record<string, number> = {
    偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
    七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
    偏印: 4, 正印: 5,
  };
  const baseLottery = lotteryMap[tenGod] || 5;
  // 塔羅加成
  const tarotBonus = ["命運之輪", "太陽", "世界", "女皇"].includes(tarotCard.name) ? 1 : 0;
  const lotteryIndex = Math.min(10, baseLottery + tarotBonus);

  const lotteryAdvice = lotteryIndex >= 8
    ? `🎰 今日偏財指數 ${lotteryIndex}/10，天命強力加持！建議在今日最佳時辰（見時辰能量表）購買刮刮樂，並前往天命共振指數最高的彩券行。`
    : lotteryIndex >= 6
    ? `🎰 今日偏財指數 ${lotteryIndex}/10，有一定的偏財能量。可嘗試小額購買，以平常心待之。`
    : `🎰 今日偏財指數 ${lotteryIndex}/10，偏財能量較弱。建議今日專注於正財積累，暫緩偏財嘗試。`;

  const wealthEngineMap: Record<string, string> = {
    食神: "才華引擎啟動：今日的財富來自於你的創意與表達。一個好的提案、一件精彩的作品，都可能帶來意想不到的財富流入。",
    傷官: "突破引擎啟動：今日的財富來自於打破常規。那些別人不敢做的事，你做了，財富就來了。",
    偏財: "機遇引擎啟動：今日偏財星入局，財富以意外的方式降臨。保持開放，把握每一個突發的機遇。",
    正財: "穩健引擎啟動：今日財富以穩定的方式積累。認真對待每一個細節，財富自然水到渠成。",
    七殺: "壓力轉化引擎：今日壓力即是動力。以食神之火制七殺之金，將挑戰轉化為財富的跳板。",
    正官: "規範引擎啟動：今日財富來自於正式管道。合約、薪資、官方認可——這些是今日財富的主要來源。",
    比肩: "競爭引擎啟動：今日財富需要在競爭中獲取。以實力說話，但注意合作優於對抗。",
    劫財: "守財引擎啟動：今日財富面臨耗散風險。守住已有，是今日最重要的財富策略。",
    偏印: "智慧引擎啟動：今日財富來自於知識與洞察。深度思考，往往能發現別人忽略的財富機遇。",
    正印: "貴人引擎啟動：今日財富來自於貴人相助。主動尋求合作，接受他人的幫助與資源。",
  };

  const businessCompassMap: Record<string, string> = {
    食神: "【曜禾集商業羅盤】今日適合：內容創作、品牌曝光、攝影作品發布、提案簡報。核心策略：展示才華，讓作品說話。",
    傷官: "【曜禾集商業羅盤】今日適合：創新提案、突破性企劃、挑戰現有市場。核心策略：以差異化取勝，不走尋常路。",
    偏財: "【曜禾集商業羅盤】今日適合：商業談判、投資決策、新客戶開發、合作洽談。核心策略：主動出擊，把握每個機遇。",
    正財: "【曜禾集商業羅盤】今日適合：財務規劃、長期合約、穩健投資、客戶維護。核心策略：深耕既有關係，穩健積累。",
    七殺: "【曜禾集商業羅盤】今日適合：面對競爭、應對挑戰、危機處理。核心策略：以柔克剛，化壓力為突破口。",
    正官: "【曜禾集商業羅盤】今日適合：正式簽約、政府/機構合作、建立規範。核心策略：遵循規則，以專業取信。",
    比肩: "【曜禾集商業羅盤】今日適合：獨立項目、個人品牌建設。核心策略：展現個人特色，以實力立足。",
    劫財: "【曜禾集商業羅盤】今日建議：暫緩大額投資，專注維護既有客戶。核心策略：守住根基，靜待更佳時機。",
    偏印: "【曜禾集商業羅盤】今日適合：研究分析、策略規劃、學習新技能。核心策略：以知識為武器，深度洞察市場。",
    正印: "【曜禾集商業羅盤】今日適合：尋求合作、建立聯盟、向前輩請益。核心策略：借力使力，整合外部資源。",
  };

  const bestActionMap: Record<string, string> = {
    食神: "立即行動：發布一篇精心創作的內容，或向重要客戶展示你的最新作品",
    傷官: "立即行動：提出一個大膽的創新提案，打破現有的思維框架",
    偏財: "立即行動：主動聯繫一位潛在合作夥伴，或評估一個投資機遇",
    正財: "立即行動：整理財務狀況，制定一個具體的財富積累計劃",
    七殺: "立即行動：直面今日最大的挑戰，以行動代替逃避",
    正官: "立即行動：處理一件正式的商業事務，或推進一個重要合約",
    比肩: "立即行動：專注於個人品牌建設，展現你獨特的專業價值",
    劫財: "立即行動：盤點現有資源，制定防守策略，保護核心資產",
    偏印: "立即行動：深度研究一個你感興趣的領域，將洞察轉化為行動計劃",
    正印: "立即行動：主動向一位你尊敬的人請益，或建立一個重要的合作關係",
  };

  return {
    lotteryIndex,
    lotteryAdvice,
    wealthEngine: wealthEngineMap[tenGod] || "今日財富能量中性，保持覺察，順勢而為。",
    businessCompass: businessCompassMap[tenGod] || "今日以穩健為主，專注於核心業務。",
    bestAction: bestActionMap[tenGod] || "今日保持覺察，在關鍵時刻果斷行動。",
  };
}

// ─── 節氣資料庫 ──────────────────────────────────────────────────
export const SOLAR_TERMS_2026 = [
  { date: "2026-01-05", name: "小寒" },
  { date: "2026-01-20", name: "大寒" },
  { date: "2026-02-03", name: "立春" },
  { date: "2026-02-18", name: "雨水" },
  { date: "2026-03-20", name: "春分" },
  { date: "2026-04-04", name: "清明" },
  { date: "2026-04-20", name: "穀雨" },
  { date: "2026-05-05", name: "立夏" },
  { date: "2026-05-21", name: "小滿" },
  { date: "2026-06-06", name: "芒種" },
  { date: "2026-06-21", name: "夏至" },
  { date: "2026-07-07", name: "小暑" },
  { date: "2026-07-23", name: "大暑" },
  { date: "2026-08-07", name: "立秋" },
  { date: "2026-08-23", name: "處暑" },
  { date: "2026-09-07", name: "白露" },
  { date: "2026-09-23", name: "秋分" },
  { date: "2026-10-08", name: "寒露" },
  { date: "2026-10-23", name: "霜降" },
  { date: "2026-11-07", name: "立冬" },
  { date: "2026-11-22", name: "小雪" },
  { date: "2026-12-07", name: "大雪" },
  { date: "2026-12-22", name: "冬至" },
];

/**
 * 取得最近的節氣
 */
export function getNearestSolarTerm(date: Date): { name: string; daysUntil: number } | null {
  const dateStr = date.toISOString().split("T")[0];
  for (const term of SOLAR_TERMS_2026) {
    const termDate = new Date(term.date);
    const diff = Math.ceil((termDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 15) {
      return { name: term.name, daysUntil: diff };
    }
  }
  return null;
}
