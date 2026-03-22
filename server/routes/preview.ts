/**
 * /api/preview?birth=YYYY-MM-DD
 *
 * 公開體驗 API 端點（無需 Token 或登入）
 * 供首頁「錦囊體驗」功能使用，讓未登入訪客輸入生日後
 * 即可獲得精簡版命格分析與今日運勢，吸引用戶註冊。
 *
 * 回傳欄位（精簡版，不洩露完整功能）：
 *   - birth: 輸入的生日
 *   - bazi: 四柱八字（年柱、月柱、日柱，隱藏時柱）
 *   - dayMaster: 日主天干與五行
 *   - destinyKeyword: 命格關鍵字（1-2 個詞）
 *   - todayEnergy: 今日能量等級與描述
 *   - todayAdvice: 今日一句話建議
 *   - luckyElement: 今日幸運五行
 *   - teaser: 引導訊息（引導用戶完整體驗）
 */

import { Request, Response } from "express";
import { calculateBazi } from "../lib/baziCalculator";
import { getFullDateInfo } from "../lib/lunarCalendar";
import { getDailyTenGodAnalysisDynamic } from "../lib/tenGods";

/** 五行中文對應 */
const ELEMENT_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

/** 五行對應幸運顏色 */
const ELEMENT_LUCKY_COLOR: Record<string, string> = {
  fire: "朱紅、火焰橙",
  earth: "土黃、駝色",
  metal: "白色、銀灰",
  wood: "翠綠、草綠",
  water: "深藍、黑色",
};

/** 五行對應幸運方位 */
const ELEMENT_LUCKY_DIRECTION: Record<string, string> = {
  fire: "南方",
  earth: "中央",
  metal: "西方",
  wood: "東方",
  water: "北方",
};

/** 命格關鍵字（依日主五行） */
const DESTINY_KEYWORDS: Record<string, string[]> = {
  wood: ["生機旺盛", "創意無限", "仁厚待人", "成長型格局"],
  fire: ["熱情奔放", "光芒四射", "行動力強", "領袖氣質"],
  earth: ["穩重踏實", "信義為本", "財富積累", "守護型格局"],
  metal: ["果斷決絕", "正義凜然", "執行力強", "改革型格局"],
  water: ["智慧深邃", "靈活應變", "洞察力強", "謀略型格局"],
};

/** 今日運勢引導語 */
const ENERGY_TEASER: Record<string, string> = {
  excellent: "今日天時大利，命格與流日高度共振！完整命盤分析正等著你——",
  good: "今日能量偏吉，用神得力。想知道今日最旺時辰與完整運勢嗎？",
  neutral: "今日能量平穩，適合謀定後動。完整的時辰吉凶分析，會員限定——",
  challenging: "今日忌神當道，需謹慎行事。完整的化解建議與吉時指引，等你解鎖——",
  complex: "今日能量複雜多變，需靈活應對。深度命格解析，讓你看清局勢——",
};

export async function handlePreviewRequest(req: Request, res: Response) {
  const birthParam = req.query.birth as string | undefined;

  // 驗證生日格式
  if (!birthParam) {
    return res.status(400).json({
      error: "missing_birth",
      message: "請提供 birth 參數，格式為 YYYY-MM-DD",
    });
  }

  const birthMatch = birthParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!birthMatch) {
    return res.status(400).json({
      error: "invalid_birth_format",
      message: "生日格式錯誤，請使用 YYYY-MM-DD 格式",
    });
  }

  const year = parseInt(birthMatch[1], 10);
  const month = parseInt(birthMatch[2], 10);
  const day = parseInt(birthMatch[3], 10);

  // 驗證日期範圍（1920-2010 年）
  if (year < 1920 || year > 2010) {
    return res.status(400).json({
      error: "birth_out_of_range",
      message: "生日年份需在 1920 至 2010 年之間",
    });
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return res.status(400).json({
      error: "invalid_birth_date",
      message: "生日日期無效",
    });
  }

  try {
    // 推算八字（使用正午時辰，不需要用戶提供時辰）
    const bazi = calculateBazi(birthParam, "12:00");

    // 取得今日資料
    const realNow = new Date();
    const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
    const twYear = twNow.getUTCFullYear();
    const twMonth = twNow.getUTCMonth() + 1;
    const twDay = twNow.getUTCDate();
    const now = new Date(Date.UTC(twYear, twMonth - 1, twDay, 4, 0, 0));

    const dateInfo = getFullDateInfo(now);
    const dayPillar = dateInfo.dayPillar;

    // 計算今日十神（依用戶日主）
    const dayMasterElementZh = ELEMENT_ZH[bazi.dayMasterElement] ?? "木";
    const dayMasterYinYang = bazi.dayMasterStem
      ? (["甲", "丙", "戊", "庚", "壬"].includes(bazi.dayMasterStem) ? "陽" : "陰")
      : "陽";

    const tenGodAnalysis = getDailyTenGodAnalysisDynamic(
      dayPillar.stem,
      dayPillar.branch,
      dayMasterElementZh,
      dayMasterYinYang
    );

    // 取得命格關鍵字
    const keywords = DESTINY_KEYWORDS[bazi.dayMasterElement] ?? DESTINY_KEYWORDS.wood;
    const destinyKeyword = keywords[Math.floor(Math.random() * keywords.length)];

    // 今日幸運五行（用戶喜神中的第一個）
    const favorableList = bazi.favorableElements.split(",").filter(Boolean);
    const luckyElementEn = favorableList[0] ?? "fire";
    const luckyElementZh = ELEMENT_ZH[luckyElementEn] ?? "火";
    const luckyColor = ELEMENT_LUCKY_COLOR[luckyElementEn] ?? "朱紅";
    const luckyDirection = ELEMENT_LUCKY_DIRECTION[luckyElementEn] ?? "南方";

    // 今日建議（來自十神分析）
    const todayAdvice = tenGodAnalysis.mainMeaning?.advice
      ?? dayPillar.energyDescription;

    // 引導語
    const teaser = ENERGY_TEASER[dayPillar.energyLevel] ?? ENERGY_TEASER.neutral;

    // 組裝精簡版回傳（隱藏時柱，保留神秘感）
    return res.json({
      birth: birthParam,
      bazi: {
        yearPillar: bazi.yearPillar,
        monthPillar: bazi.monthPillar,
        dayPillar: bazi.dayPillar,
        // 時柱隱藏，引導用戶登入後解鎖
        hourPillar: "??（登入後解鎖）",
      },
      dayMaster: {
        stem: bazi.dayMasterStem,
        element: dayMasterElementZh,
        description: bazi.destinyDescription,
      },
      destinyKeyword,
      elementBalance: {
        // 只顯示前三強五行，隱藏完整比例
        dominant: Object.entries({
          木: bazi.elementRatio.wood,
          火: bazi.elementRatio.fire,
          土: bazi.elementRatio.earth,
          金: bazi.elementRatio.metal,
          水: bazi.elementRatio.water,
        })
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([el, pct]) => ({ element: el, percent: pct })),
      },
      todayEnergy: {
        level: dayPillar.energyLevel,
        description: dayPillar.energyDescription,
        date: `${twYear}年${twMonth}月${twDay}日`,
        dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
      },
      todayAdvice,
      luckyElement: {
        element: luckyElementZh,
        color: luckyColor,
        direction: luckyDirection,
      },
      teaser,
      // 引導訊息
      cta: {
        message: "完整命格解析、每日時辰吉凶、天命問卜——加入天命共振，解鎖你的命運密碼",
        registerUrl: "/",
      },
    });
  } catch (err) {
    console.error("[Preview] Error:", err);
    return res.status(500).json({
      error: "calculation_failed",
      message: "命格推算失敗，請稍後再試",
    });
  }
}
