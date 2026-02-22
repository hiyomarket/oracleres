/**
 * 天命共振 - 農曆節日前一天通知服務
 * 每日台灣時間 23:00 檢查明天是否為農曆節日，若是則發送 Mail 通知
 */
import { solarToLunarByYMD } from "./lunarConverter";
import { notifyOwner } from "../_core/notification";

/**
 * 農曆節日的命理意義與購彩建議
 */
const FESTIVAL_ORACLE: Record<string, { meaning: string; lotteryTip: string; emoji: string }> = {
  "春節": {
    emoji: "🧧",
    meaning: "歲首之日，天地更新，正月初一為一年能量之始。甲木日主在新年之際，火土用神得天時加持，偏財能量極旺。",
    lotteryTip: "春節當日為全年最強偏財日，建議選購面額較高的刮刮樂，以火土五行數字（2/7/5/0）為主力號碼。",
  },
  "元宵節": {
    emoji: "🏮",
    meaning: "正月十五，月圓之夜，天地陰陽交融。滿月加持使聖杯能量達到月度高峰，財星入局。",
    lotteryTip: "元宵滿月日，月相加成 +1.5 分，購彩指數通常達到月度最高點。建議在酉時（17-19點）出手。",
  },
  "龍抬頭": {
    emoji: "🐉",
    meaning: "二月初二，龍神抬頭，雨水滋潤大地。甲木得水生，但水旺需以火制，注意偏財能量的平衡。",
    lotteryTip: "龍抬頭日宜積極行動，但需注意水木過旺。建議選購含火土數字（2/7/5）的號碼組合。",
  },
  "端午節": {
    emoji: "🎋",
    meaning: "五月初五，陽氣最盛之日。午火旺極，甲木用神火得天時，是一年中火能量最強的節日。",
    lotteryTip: "端午火旺，甲木用神大旺。強烈建議在午時（11-13點）購彩，以火數字（2/7）為核心選號。",
  },
  "七夕": {
    emoji: "⭐",
    meaning: "七月初七，牛郎織女相會，金水交融之日。甲木日主需注意金水剋制，以火土化解。",
    lotteryTip: "七夕金水較旺，對甲木略有壓制。建議小額嘗試，以土數字（5/0）平衡金水能量。",
  },
  "中元節": {
    emoji: "🕯️",
    meaning: "七月十五，鬼門大開，陰氣較重。甲木日主在此日宜靜不宜動，謹慎行事。",
    lotteryTip: "中元節陰氣較重，不建議大額購彩。若要嘗試，選在白天陽氣較旺的午時（11-13點）。",
  },
  "中秋節": {
    emoji: "🌕",
    meaning: "八月十五，月圓人團圓，金氣漸旺。滿月加持購彩能量，但秋金旺需以火制。",
    lotteryTip: "中秋滿月，月相加成最強。建議在火旺時辰（巳時10-12點或午時11-13點）購彩，以火數字（2/7）為主。",
  },
  "重陽節": {
    emoji: "🍂",
    meaning: "九月初九，重陽登高，金氣最旺之節。甲木日主需特別注意金剋木，以火土化解。",
    lotteryTip: "重陽金旺，對甲木壓制最強。建議謹慎，若購彩以土數字（5/0）為主，避開金數字（4/9）。",
  },
  "臘八節": {
    emoji: "🍲",
    meaning: "十二月初八，歲末之始，水氣漸旺。甲木日主在此日宜補火暖身，以火土用神抵禦水寒。",
    lotteryTip: "臘八水旺，甲木需火暖。建議選購時以火土數字（2/7/5/0）為主，在午時出手最佳。",
  },
  "小年": {
    emoji: "🏠",
    meaning: "十二月廿三，灶神上天，辭舊迎新之始。歲末能量收斂，宜整理與準備，不宜大動。",
    lotteryTip: "小年宜靜不宜動，適合整理購彩記錄、回顧本年命中率，為明年制定策略。",
  },
  "除夕": {
    emoji: "🎆",
    meaning: "歲末最後一日，舊年能量歸零，新年能量蓄勢待發。此日為一年能量轉換之際，偏財能量特殊。",
    lotteryTip: "除夕為年度能量轉換點，建議在亥時（21-23點）最後一刻購彩，以迎接新年偏財能量。",
  },
};

/**
 * 取得台灣明日日期（UTC+8）
 */
function getTaiwanTomorrow(): { year: number; month: number; day: number } {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000;
  const twNow = new Date(twMs);
  // 明日
  const tomorrow = new Date(twMs + 24 * 60 * 60 * 1000);
  return {
    year: tomorrow.getUTCFullYear(),
    month: tomorrow.getUTCMonth() + 1,
    day: tomorrow.getUTCDate(),
  };
}

/**
 * 檢查明天是否為農曆節日，若是則發送通知
 */
export async function checkAndNotifyFestival(): Promise<boolean> {
  try {
    const { year, month, day } = getTaiwanTomorrow();
    const lunarDate = solarToLunarByYMD(year, month, day);

    if (!lunarDate) {
      console.log("[FestivalNotification] No lunar data for tomorrow, skipping.");
      return false;
    }

    const festival = lunarDate.festival;
    if (!festival) {
      return false; // 明天不是農曆節日
    }

    const oracle = FESTIVAL_ORACLE[festival];
    if (!oracle) {
      // 節日存在但沒有命理說明，仍發送基本通知
      const title = `${festival} 前夕提醒 ｜ 明日 ${year}/${month}/${day}`;
      const content = `明日（${year}年${month}月${day}日）為農曆 ${lunarDate.lunarMonthName}${lunarDate.lunarDayName}，即 **${festival}**。\n\n請提前準備，迎接節日能量。`;
      await notifyOwner({ title, content });
      return true;
    }

    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const tomorrowDate = new Date(Date.UTC(year, month - 1, day));
    const weekday = weekdays[tomorrowDate.getUTCDay()];

    const title = `${oracle.emoji} 明日${festival} ｜ ${year}/${month}/${day}（週${weekday}）農曆${lunarDate.lunarMonthName}${lunarDate.lunarDayName}`;
    const content = `
## ${oracle.emoji} 明日${festival} 天命提醒

**日期**：${year}年${month}月${day}日（週${weekday}）
**農曆**：${lunarDate.lunarMonthName}${lunarDate.lunarDayName}

---

### 🔮 節日命理意義

${oracle.meaning}

---

### 🎰 購彩建議

${oracle.lotteryTip}

---

### 📅 明日行動清單

- 前往天命共振系統查看明日完整流日報告
- 確認明日最旺時辰（作戰室 → 本週最旺時辰橫幅）
- 依購彩建議選擇適合面額與號碼

---

*天命共振系統 · 農曆節日前夕自動提醒*
`.trim();

    console.log(`[FestivalNotification] Sending festival notification for ${festival} (${year}/${month}/${day})`);
    const success = await notifyOwner({ title, content });
    if (success) {
      console.log(`[FestivalNotification] ✅ Festival notification sent for ${festival}`);
    } else {
      console.warn(`[FestivalNotification] ⚠️ Failed to send festival notification for ${festival}`);
    }
    return success;
  } catch (err) {
    console.error("[FestivalNotification] ❌ Error:", err);
    return false;
  }
}
