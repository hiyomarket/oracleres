/**
 * AiReadOnlyBanner.tsx
 * 全站 AI 唯讀模式橫幅提示條
 * - AI 全站唯讀（ai_readonly）：綠色橫幅，顯示 Token 名稱
 * - 體驗方案（trial）：琥珀色橫幅，顯示虛擬命盤姓名 + 出生日期
 * - 基礎方案（basic）：藍色橫幅，顯示虛擬命盤姓名 + 出生日期
 */

import { useState } from "react";
import { getAiSession, clearAiSession } from "@/pages/AiEntry";
import { Eye, Sparkles, X } from "lucide-react";

const GENDER_LABEL: Record<string, string> = {
  male: "男",
  female: "女",
};

const HOUR_LABEL: Record<number, string> = {
  0: "子時", 2: "丑時", 4: "寅時", 6: "卯時", 8: "辰時", 10: "巳時",
  12: "午時", 14: "未時", 16: "申時", 18: "酉時", 20: "戌時", 22: "亥時",
};

export function AiReadOnlyBanner() {
  const [dismissed, setDismissed] = useState(false);
  const session = getAiSession();

  if (!session || session.accessMode !== "admin_view" || dismissed) return null;

  const expiryText = session.expiresAt
    ? `到期：${new Date(session.expiresAt).toLocaleDateString("zh-TW")}`
    : "永不過期";

  const handleExit = () => {
    clearAiSession();
    window.location.href = "/";
  };

  const identityType = session.identityType ?? "ai_readonly";
  const guestProfile = session.guestProfile;

  // 體驗/基礎方案：顯示虛擬命盤資訊
  if (identityType === "trial" || identityType === "basic") {
    const genderLabel = guestProfile ? (GENDER_LABEL[guestProfile.gender] ?? "") : "";
    const hourLabel = guestProfile ? (HOUR_LABEL[Math.floor(guestProfile.birthHour / 2) * 2] ?? "午時") : "";
    const birthStr = guestProfile
      ? `${guestProfile.birthYear}年${guestProfile.birthMonth}月${guestProfile.birthDay}日 ${hourLabel}`
      : "";
    const planLabel = identityType === "trial" ? "體驗方案" : "基礎方案";

    const bannerStyle = identityType === "trial"
      ? { background: "linear-gradient(90deg, #2a1f0a 0%, #1f1500 100%)", borderBottom: "1px solid rgba(251, 191, 36, 0.35)", color: "#fbbf24" }
      : { background: "linear-gradient(90deg, #0a1a2a 0%, #071525 100%)", borderBottom: "1px solid rgba(96, 165, 250, 0.35)", color: "#60a5fa" };

    return (
      <div
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium z-50 shrink-0"
        style={bannerStyle}
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 truncate">
          <span className="font-bold">{planLabel}</span>
          {guestProfile && (
            <>
              <span className="opacity-80 ml-1.5">
                示範命盤：<span className="font-semibold">{guestProfile.name}</span>
              </span>
              <span className="opacity-50 ml-1.5">
                {genderLabel}・{birthStr}
              </span>
            </>
          )}
        </span>
        <span className="opacity-40 hidden sm:block text-[10px]">體驗模式 · 非真實命盤</span>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-50 hover:opacity-100 transition-opacity ml-1"
          title="隱藏提示條"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleExit}
          className="opacity-60 hover:opacity-100 transition-colors ml-2 text-xs border border-current/30 px-2 py-0.5 rounded"
          title="退出體驗模式"
        >
          退出
        </button>
      </div>
    );
  }

  // AI 全站唯讀（ai_readonly）：原有綠色橫幅
  return (
    <div
      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium z-50 shrink-0"
      style={{
        background: "linear-gradient(90deg, #1a3a2a 0%, #0f2a1e 100%)",
        borderBottom: "1px solid rgba(52, 211, 153, 0.3)",
        color: "#34d399",
      }}
    >
      <Eye className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1 truncate">
        <span className="font-bold">AI 唯讀模式</span>
        {session.name && <span className="opacity-70 ml-1">— {session.name}</span>}
        <span className="opacity-50 ml-2">{expiryText}</span>
      </span>
      <span className="opacity-50 hidden sm:block">所有操作已停用</span>
      <button
        onClick={() => setDismissed(true)}
        className="opacity-50 hover:opacity-100 transition-opacity ml-1"
        title="隱藏提示條"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleExit}
        className="text-red-400/70 hover:text-red-400 transition-colors ml-2 text-xs"
        title="退出唯讀模式"
      >
        退出
      </button>
    </div>
  );
}
