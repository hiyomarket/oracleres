/**
 * /api/ai-data?token=xxx
 *
 * 純 JSON API 端點，供 AI 系統直接讀取今日結構化命理資料。
 * 不需要登入，只需持有有效的 access token。
 *
 * 回傳欄位：
 *   - date: 今日日期（農曆、四柱）
 *   - oneLiner: 天命一句話
 *   - overallScore: 整體能量分數 (1-10)
 *   - tenGod: 今日十神（主神、分數、建議）
 *   - tarot: 塔羅流日（牌名、元素、關鍵字、建議）
 *   - moon: 月相資訊
 *   - wealthIndex: 偶財指數 (1-10)
 *   - wealthAdvice: 購彩建議
 *   - bestHours: 今日最旺三個時辰
 *   - currentHour: 當前時辰能量
 *   - allowedModules: 此 Token 開放的模組（null = 全部）
 */

import { Request, Response } from "express";
import { getDb } from "../db";
import { accessTokens, tokenAccessLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getFullDateInfo, getTaiwanDate } from "../lib/lunarCalendar";
import { getMoonPhase } from "../lib/moonPhase";
import { getDailyTenGodAnalysisDynamic, getTenGodDynamic } from "../lib/tenGods";
import { calculateTarotDailyCard, generateWealthCompass } from "../lib/warRoomEngine";
import { getCurrentHourEnergyDynamic, getAllHourEnergiesDynamic } from "../lib/hourlyEnergy";
import { getUserProfileForEngine } from "../db";

// 預設命格（當無法取得用戶命格時使用系統預設）
const DEFAULT_PROFILE = {
  dayMasterElement: "木",
  dayMasterYinYang: "陽",
  dayMasterStem: "甲",
  favorableElements: ["火", "土"],
  unfavorableElements: ["水", "木"],
  natalElementRatio: { 木: 0.42, 水: 0.35, 火: 0.11, 土: 0.09, 金: 0.04 },
  birthMonth: 11,
  birthDay: 26,
  isDefault: true,
};

/** 解析 allowedModules JSON 字串 */
function parseModules(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return null;
}

/** 判斷模組是否開放 */
function canShow(allowedModules: string[] | null, moduleId: string): boolean {
  if (!allowedModules || allowedModules.length === 0) return true;
  return allowedModules.includes(moduleId);
}

export async function handleAiDataRequest(req: Request, res: Response) {
  const token = req.query.token as string | undefined;

  if (!token) {
    return res.status(400).json({ error: "missing_token", message: "請提供 token 參數" });
  }

  const db = await getDb();
  if (!db) {
    return res.status(503).json({ error: "db_unavailable", message: "資料庫暫時無法連線" });
  }

  // 驗證 Token
  const [record] = await db
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.token, token))
    .limit(1);

  if (!record) {
    return res.status(401).json({ error: "invalid_token", message: "Token 不存在" });
  }
  if (!record.isActive) {
    return res.status(401).json({ error: "revoked_token", message: "Token 已被停用" });
  }
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return res.status(401).json({ error: "expired_token", message: "Token 已過期" });
  }

  // 更新使用次數（非同步）
  db.update(accessTokens)
    .set({ lastUsedAt: new Date(), useCount: (record.useCount ?? 0) + 1 })
    .where(eq(accessTokens.id, record.id))
    .catch(() => {});

  // 寫入存取紀錄（非同步）
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || null;
  db.insert(tokenAccessLogs).values({
    tokenId: record.id,
    ip: clientIp,
    path: "/api/ai-data",
    accessedAt: new Date(),
  }).catch(() => {});

  const allowedModules = parseModules(record.allowedModules);

  // 計算今日資料（使用系統預設命格）
  const realNow = new Date();
  const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
  const year = twNow.getUTCFullYear();
  const month = twNow.getUTCMonth() + 1;
  const day = twNow.getUTCDate();
  const now = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));

  const dateInfo = getFullDateInfo(now);
  const dayPillar = dateInfo.dayPillar;
  const monthPillar = dateInfo.monthPillar;
  const yearPillar = dateInfo.yearPillar;

  const ep = DEFAULT_PROFILE;

  // 十神分析
  const tenGodAnalysis = getDailyTenGodAnalysisDynamic(
    dayPillar.stem,
    dayPillar.branch,
    ep.dayMasterElement,
    ep.dayMasterYinYang
  );

  // 塔羅流日
  const tarot = calculateTarotDailyCard(month, day, ep.birthMonth, ep.birthDay);

  // 月相
  const moonInfo = getMoonPhase(now);

  // 時辰能量
  const hourDynamicProfile = {
    hourElementScores: Object.fromEntries(
      ["火", "土", "金", "水", "木"].map(el => [
        el,
        ep.favorableElements.includes(el) ? 25
          : ep.unfavorableElements.includes(el) ? -20
          : 5
      ])
    ),
    specialHourBonus: {},
  };
  const currentHour = getCurrentHourEnergyDynamic(dayPillar.stem, hourDynamicProfile);
  const allHours = getAllHourEnergiesDynamic(dayPillar.stem, hourDynamicProfile);
  const bestHours = [...allHours].sort((a, b) => b.energyScore - a.energyScore).slice(0, 3);

  // 偶財指數（六維加權）
  const tenGodLotteryMap: Record<string, number> = {
    偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
    七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
    偏印: 4, 正印: 5,
  };
  const fortuneScore = tenGodLotteryMap[tenGodAnalysis.mainTenGod] ?? 5;
  const dayElScore = ep.favorableElements.includes(dayPillar.stemElement) ? 2.0
    : ep.unfavorableElements.includes(dayPillar.stemElement) ? -2.0 : 0;
  const dayScore = Math.min(10, Math.max(1, 5 + dayElScore * 2));
  const moonBonus = moonInfo.isFullMoon ? 1.5 : moonInfo.isNewMoon ? -0.5 : 0;
  const hourEl = currentHour.stemElement;
  const hourBonus = ep.favorableElements.includes(hourEl as string) ? 0.5 : -0.3;
  const tarotBonus = tarot && ["命運之輪", "太陽", "世界", "女皇"].includes(tarot.card.name) ? 0.5 : 0;
  const rawTotal =
    fortuneScore * 0.40 +
    dayScore * 0.30 +
    (5 + moonBonus) * 0.10 +
    5 * 0.10 +
    (5 + hourBonus) * 0.05 +
    (5 + tarotBonus) * 0.05;
  const wealthIndex = Math.round(Math.min(10, Math.max(1, rawTotal)) * 10) / 10;
  const wealthAdvice = wealthIndex >= 8
    ? `今日偶財指數 ${wealthIndex}/10，天命強力加持！建議在吉時出手。`
    : wealthIndex >= 6.5
    ? `今日偶財指數 ${wealthIndex}/10，有一定偏財能量，可小試。`
    : wealthIndex >= 5
    ? `今日偶財指數 ${wealthIndex}/10，能量平平，娛樂為主。`
    : `今日偶財指數 ${wealthIndex}/10，忌神當道，建議暫緩。`;

  // 組裝回傳資料（依 allowedModules 過濾）
  const responseData: Record<string, unknown> = {
    meta: {
      tokenName: record.name,
      generatedAt: new Date().toISOString(),
      timezone: "Asia/Taipei",
      allowedModules: allowedModules ?? "all",
    },
    date: {
      gregorian: `${year}年${month}月${day}日`,
      lunar: dateInfo.dateString,
      weekday: ["日", "一", "二", "三", "四", "五", "六"][now.getDay()],
      yearPillar: `${yearPillar.stem}${yearPillar.branch}`,
      monthPillar: `${monthPillar.stem}${monthPillar.branch}`,
      dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
      currentHourName: currentHour.chineseName,
    },
  };

  if (canShow(allowedModules, "daily")) {
    responseData.oneLiner = tenGodAnalysis.mainMeaning?.advice ?? "";
    responseData.overallScore = tenGodAnalysis.overallScore;
    responseData.tenGod = {
      main: tenGodAnalysis.mainTenGod,
      score: tenGodAnalysis.mainScore,
      role: tenGodAnalysis.mainMeaning?.role,
      energy: tenGodAnalysis.mainMeaning?.energy,
      advice: tenGodAnalysis.mainMeaning?.advice,
      wuxing: tenGodAnalysis.mainMeaning?.wuxing,
    };
  }

  if (canShow(allowedModules, "tarot") && tarot) {
    responseData.tarot = {
      cardNumber: tarot.cardNumber,
      name: tarot.card.name,
      element: tarot.card.element,
      keywords: tarot.card.keywords,
      advice: tarot.card.advice,
      energy: tarot.card.energy,
    };
  }

  if (canShow(allowedModules, "wealth")) {
    responseData.wealthIndex = wealthIndex;
    responseData.wealthAdvice = wealthAdvice;
    responseData.moon = {
      phase: moonInfo.phaseName,
      emoji: moonInfo.phaseEmoji,
      illumination: moonInfo.illumination,
      lunarDay: moonInfo.lunarDay,
    };
  }

  if (canShow(allowedModules, "hourly")) {
    responseData.currentHour = {
      name: currentHour.chineseName,
      branch: currentHour.branch,
      stem: currentHour.stem,
      score: currentHour.energyScore,
      level: currentHour.energyLevel,
      label: currentHour.energyLabel,
      displayTime: currentHour.displayTime,
    };
    responseData.bestHours = bestHours.map(h => ({
      name: h.chineseName,
      branch: h.branch,
      stem: h.stem,
      score: h.energyScore,
      displayTime: h.displayTime,
    }));
  }

  return res.json(responseData);
}
