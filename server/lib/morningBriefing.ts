/**
 * 天命共振 - 每日晨報推播服務
 * 每日台灣時間早上 7:00 自動推播當日命理摘要
 */

import { getFullDateInfo } from "./lunarCalendar";
import { getDailyTenGodAnalysis } from "./tenGods";
import { calculateTarotDailyCard, generateWealthCompass } from "./warRoomEngine";
import { getMoonPhase } from "./moonPhase";
import { getBestHours } from "./hourlyEnergy";
import { notifyOwner } from "../_core/notification";
import { notifyUser } from "./notifyUser";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 取得台灣當日日期物件（UTC+8）
 */
function getTaiwanNow(): { now: Date; year: number; month: number; day: number } {
  const realNow = new Date();
  const twMs = realNow.getTime() + 8 * 60 * 60 * 1000;
  const twNow = new Date(twMs);
  const year = twNow.getUTCFullYear();
  const month = twNow.getUTCMonth() + 1;
  const day = twNow.getUTCDate();
  // 建立代表今日的 Date（UTC 中午，避免時區偏移）
  const now = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
  return { now, year, month, day };
}

/**
 * 生成今日晨報內容
 */
export function generateMorningBriefingContent(): { title: string; content: string } {
  const { now, year, month, day } = getTaiwanNow();

  // 農曆與天干地支
  const dateInfo = getFullDateInfo(now);
  const { dayPillar, monthPillar, yearPillar } = dateInfo;

  // 十神分析
  const tenGod = getDailyTenGodAnalysis(dayPillar.stem, dayPillar.branch);

  // 塔羅流日
  const tarot = calculateTarotDailyCard(month, day);

  // 月相
  const moon = getMoonPhase(now);

  // 最佳時辰（前三名）
  const bestHours = getBestHours(dayPillar.stem).slice(0, 3);

  // 財運羅盤
  const wealth = generateWealthCompass(
    tenGod.mainMeaning.wuxing,
    tenGod.mainTenGod,
    tarot.card,
    tenGod.overallScore,
  );

  // 一句話劇本
  const oneLinerMap: Record<string, string> = {
    食神: `才華化火，洩木生財。今日，讓世界看見你的光。`,
    傷官: `破繭之日，锋芒畢露。今日，打破一個讓你不舒服的框架。`,
    偏財: `財星入局，機不可失。今日，主動出擊，把握每一個偏財機遇。`,
    正財: `穩健積累，水到渠成。今日，每一個認真的細節都是在種下財富的種子。`,
    七殺: `壓力即動力，挑戰即機遇。今日，以食神之火，制官殺之金。`,
    正官: `規範護身，官運加持。今日，以專業與誠信，贏得最重要的認可。`,
    偏印: `深水靜流，智慧沉澱。今日，向內探索，答案就在你的靜默之中。`,
    正印: `貴人相助，滋養之日。今日，放下自我，接受宇宙的饵赈。`,
    比肩: `自強不息，獨立前行。今日，以實力說話，讓作品成為最好的名片。`,
    劫財: `守住根基，靜待時機。今日，低調是最高明的策略。`,
  };
  const oneLiner = oneLinerMap[tenGod.mainTenGod] || `天命能量 ${tenGod.overallScore}/10，保持覺察，順勢而為。`;

  // 最佳時辰文字
  const bestHoursText = bestHours
    .map(h => `${h.chineseName}（${h.displayTime}，${h.stem}${h.branch}，${h.energyScore}/10）`)
    .join("、");

  // 標題
  const title = `⚔️ ${year}年${month}月${day}日 天命晨報 ｜${dayPillar.stem}${dayPillar.branch}日 ${tenGod.mainTenGod}`;

  // 內容（Markdown 格式）
  const content = `
## 🌅 ${year}年${month}月${day}日 天命共振晨報

**農曆**：${dateInfo.dateString}
**四柱**：${yearPillar.stem}${yearPillar.branch}年 ${monthPillar.stem}${monthPillar.branch}月 ${dayPillar.stem}${dayPillar.branch}日
**月相**：${moon.phaseEmoji} ${moon.phaseName}（農曆第 ${moon.lunarDay} 日）

---

### ⚡ 今日天命能量：${tenGod.overallScore}/10

**主十神**：${tenGod.mainTenGod}（${tenGod.mainMeaning.role}）
**核心能量**：${tenGod.mainMeaning.energy}
**今日建議**：${tenGod.mainMeaning.advice}

> ${oneLiner}

---

### 🃏 塔羅流日：${tarot.card.name}

**關鍵字**：${tarot.card.keywords.join("、")}
**塔羅建議**：${tarot.card.advice}

---

### ⏰ 今日最旺時辰

${bestHoursText}

---

### 🧭 財運羅盤

**偵財指數**：${wealth.lotteryIndex}/10
**財運引擎**：${wealth.wealthEngine}
**商業羅盤**：${wealth.businessCompass}
**今日行動**：${wealth.bestAction}

---

### 🎯 英雄劇本

${tenGod.heroScript}

---

*天命共振系統 · 每日命理晨報*
`.trim();

  return { title, content };
}

/**
 * 執行晨報推播
 * 由排程任務呼叫
 * 1. 透過 notifyOwner 發送 Mail 通知給管理員
 * 2. 寫入 user_notifications 給所有已登入用戶（通知中心顯示）
 */
export async function sendMorningBriefing(): Promise<boolean> {
  try {
    const { title, content } = generateMorningBriefingContent();
    console.log(`[MorningBriefing] Sending: ${title}`);

    // 1. Mail 通知管理員
    const success = await notifyOwner({ title, content });
    if (success) {
      console.log("[MorningBriefing] ✅ Morning briefing sent successfully");
    } else {
      console.warn("[MorningBriefing] ⚠️ Failed to send morning briefing");
    }

    // 2. 寫入通知中心給所有用戶（靜默，不影響主流程）
    try {
      const db = await getDb();
      if (db) {
        const allUsers = await db.select({ id: users.id }).from(users);
        const briefingDate = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
        // 簡短摘要（取 content 前 120 字）
        const shortContent = content.replace(/#+\s*/g, '').replace(/\*\*/g, '').replace(/---/g, '').trim().slice(0, 120) + '...';
        for (const u of allUsers) {
          await notifyUser({
            userId: String(u.id),
            type: 'daily_briefing',
            title,
            content: shortContent,
            linkUrl: '/war-room',
            relatedId: briefingDate,
          }).catch(() => {});
        }
        console.log(`[MorningBriefing] ✅ Wrote daily_briefing notifications for ${allUsers.length} users`);
      }
    } catch (notifyErr) {
      console.warn("[MorningBriefing] ⚠️ Failed to write user notifications:", notifyErr);
    }

    return success;
  } catch (err) {
    console.error("[MorningBriefing] ❌ Error sending morning briefing:", err);
    return false;
  }
}
