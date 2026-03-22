/**
 * 穿搭策略資料庫 V2.9
 * 基於蘇祐震命格（甲木日主，用神：火土金）
 * 每個十神有真正不同的主色調，天干×月相進一步差異化
 */

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
  accentColor: string; // 點綴色
  summary: string;
  energyTag: string; // 今日能量標籤
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

// ─── V11.0 神喻穿搭引擎 V3.0 ─────────────────────────────────────
/**
 * 用戶情境輸入（前端傳入）
 */
export interface UserContext {
  /** 今日特殊事件 */
  event?: 'important_meeting' | 'date' | 'interview' | 'creative_work' | 'negotiation' | 'rest' | 'creative_presentation' | 'rest_day' | null;
  /** 今日心情 */
  mood?: 'confident' | 'anxious' | 'creative' | 'tired' | 'focused' | null;
}

/**
 * V3.0 穿搭建議（情境共振版）
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
  /** V3.0 新增：動態推理文案（情境感知） */
  reasoning: string;
  /** V3.0 新增：大運背景色影響說明 */
  daYunNote: string;
  /** V3.0 新增：月相影響說明 */
  moonPhaseNote: string;
  /** V3.0 新增：情境修正說明（若有） */
  contextNote?: string;
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

/**
 * 生成動態推理文案（V3.0 核心功能）
 * 將穿搭建議轉化為有溫度、有邏輯的命理解釋
 */
export function generateReasoningText(
  tenGod: string,
  strategy: string,
  topColor: string,
  bottomColor: string,
  daYunRole: string,
  moonPhaseName: string,
  userContext?: UserContext
): string {
  const baseStrategy = strategy || '均衡守成';

  // 策略對應的核心邏輯說明
  const strategyLogic: Record<string, string> = {
    '強勢補弱': '今日宇宙能量有所缺失，我們需要主動出擊，用穿搭的顏色來補充命格中最需要的能量。',
    '借力打力': `今日${tenGod}入局，帶來一定的壓力與挑戰。聰明的做法不是硬碰硬，而是借助這股能量，轉化為前進的動力。`,
    '順勢生旺': `今日${tenGod}與你的用神完美共振，宇宙能量正在順行。我們不需要刻意去「補」，而是要「順勢」，讓自然的能量流動為你加持。`,
    '食神生財': `今日食神/傷官能量旺盛，你的才華（火）正處於高點。穿搭的重點是讓這股才華能量流動起來，最終化為實際的財富（土）。`,
    '均衡守成': '今日能量相對平衡，穿搭策略以守成為主，選擇能讓你感到舒適自在的配色，保持穩定的能量輸出。',
  };

  const logicText = strategyLogic[baseStrategy] || strategyLogic['均衡守成'];

  // 大運背景色說明
  const daYunText = daYunRole
    ? `（大運背景：你目前正走「${daYunRole}」大運，這是今日穿搭的長期底色。）`
    : '';

  // 月相說明
  const moonText = moonPhaseName
    ? `今日月相為「${moonPhaseName}」，月亮的能量也在影響著今日的氣場。`
    : '';

  // 情境說明
  let contextText = '';
  if (userContext?.event && EVENT_ELEMENT_BOOST[userContext.event]) {
    const boost = EVENT_ELEMENT_BOOST[userContext.event];
    contextText = `特別提醒：今日你有「${getEventLabel(userContext.event)}」，${boost.reason}，穿搭已針對此情境進行微調。`;
  }
  if (userContext?.mood && MOOD_MODIFIER[userContext.mood]) {
    contextText += (contextText ? ' ' : '') + MOOD_MODIFIER[userContext.mood];
  }

  return [
    logicText,
    `今日建議：**${topColor}上衣**搭配**${bottomColor}下裝**。`,
    moonText,
    daYunText,
    contextText,
  ].filter(Boolean).join(' ');
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

/**
 * 生成 V3.0 情境共振穿搭建議
 * 整合：基礎十神策略 + 大運背景色 + 月相 + 用戶情境
 */
export function generateOutfitAdviceV11(
  tenGod: string,
  dailyStrategy: string,
  daYunRole: string,
  daYunKeyTheme: string,
  moonPhaseName: string,
  moonPhaseType: string,
  userContext?: UserContext
): OutfitAdviceV11 {
  // Step 1: 取得基礎十神穿搭策略
  const baseOutfit = OUTFIT_STRATEGY_BY_TENGOD[tenGod] ?? OUTFIT_STRATEGY_BY_TENGOD['食神'];

  // Step 2: 情境修正（事件導向的顏色微調）
  let topColor = baseOutfit.topColor;
  let bottomColor = baseOutfit.bottomColor;
  let shoesColor = baseOutfit.shoesColor;
  let contextNote: string | undefined;

  if (userContext?.event) {
    const boost = EVENT_ELEMENT_BOOST[userContext.event];
    if (boost) {
      // 重要會議/面試：強化金元素（白色/銀色）
      if ((userContext.event === 'important_meeting' || userContext.event === 'interview')
          && baseOutfit.topElement !== '金') {
        topColor = `${baseOutfit.topColor}（建議加入白色或銀色配件強化決斷力）`;
        contextNote = `今日有${getEventLabel(userContext.event)}，已在穿搭中強化金元素的決斷氣場。`;
      }
      // 約會/創意工作：強化火元素
      if ((userContext.event === 'date' || userContext.event === 'creative_work')
          && baseOutfit.topElement !== '火') {
        topColor = `${baseOutfit.topColor}（建議加入一件暖色系配件提升魅力）`;
        contextNote = `今日有${getEventLabel(userContext.event)}，已在穿搭中加強火元素的表達力。`;
      }
      // 創意發表提案：強化食傷火元素
      if (userContext.event === 'creative_presentation') {
        topColor = `${baseOutfit.topColor}（建議加入暖色系主色提升創意展現力）`;
        contextNote = `今日有創意發表提案，食傷之火的暖色系讓你的才華與魅力充分展現。`;
      }
      // 靜養充電日：切換均衡守成模式
      if (userContext.event === 'rest_day') {
        topColor = '大地色/米白色/淡灰色';
        bottomColor = '大地色/淡襲色';
        shoesColor = '小麥色/小白色';
        contextNote = `今日為靜養充電日，已切換均衡守成模式——不強制補強，讓命格自然呼吸。舒適中性色系是今日最好的選擇。`;
      }
    }
  }

  // Step 3: 月相微調（滿月加強主色，新月加入白色）
  let moonPhaseNote = MOON_PHASE_OUTFIT_MODIFIER['殘月']; // 預設
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

  // Step 4: 大運背景色注記
  const daYunNote = daYunKeyTheme
    ? `大運主題「${daYunKeyTheme.slice(0, 15)}...」正在影響你的長期能量背景色，今日穿搭已納入此背景。`
    : '';

  // Step 5: 生成推理文案
  const reasoning = generateReasoningText(
    tenGod,
    dailyStrategy,
    topColor,
    bottomColor,
    daYunRole,
    moonPhaseName,
    userContext
  );

  return {
    topColor,
    topElement: baseOutfit.topElement,
    bottomColor,
    bottomElement: baseOutfit.bottomElement,
    shoesColor,
    shoesElement: baseOutfit.shoesElement,
    accentColor: baseOutfit.accentColor,
    energyTag: baseOutfit.energyTag,
    summary: baseOutfit.summary,
    reasoning,
    daYunNote,
    moonPhaseNote,
    contextNote,
  };
}
