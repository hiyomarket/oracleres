/**
 * AiReadOnlyBanner.tsx
 * 全站 AI 唯讀模式橫幅提示條
 *
 * 身分類型判斷：
 * - ai_readonly：純 AI 資料讀取，綠色橫幅，無虛擬命盤
 * - ai_full：AI 全功能（含虛擬命盤），紫色橫幅
 * - 其他（方案 ID）：訪客體驗方案，琥珀色橫幅，顯示虛擬命盤資訊
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { getAiSession, clearAiSession } from "@/pages/AiEntry";
import { Eye, Sparkles, Home, X } from "lucide-react";

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
  const [, navigate] = useLocation();
  const session = getAiSession();

  if (!session || session.accessMode !== "admin_view" || dismissed) return null;

  const identityType = session.identityType ?? "ai_readonly";
  const guestProfile = session.guestProfile;

  const expiryText = session.expiresAt
    ? `到期：${new Date(session.expiresAt).toLocaleDateString("zh-TW")}`
    : "永不過期";

  const handleExit = () => {
    clearAiSession();
    window.location.href = "/";
  };

  const handleGoHome = () => {
    navigate("/ai-entry?token=" + encodeURIComponent(session.token));
  };

  // ── 訪客體驗方案（任何非 ai_readonly / ai_full 的 identityType）──
  const isGuestPlan = identityType !== "ai_readonly" && identityType !== "ai_full";
  const isAiFull = identityType === "ai_full";

  if (isGuestPlan || isAiFull) {
    const genderLabel = guestProfile ? (GENDER_LABEL[guestProfile.gender] ?? "") : "";
    const hourLabel = guestProfile ? (HOUR_LABEL[Math.floor(guestProfile.birthHour / 2) * 2] ?? "午時") : "";
    const birthStr = guestProfile
      ? `${guestProfile.birthYear}年${guestProfile.birthMonth}月${guestProfile.birthDay}日 ${hourLabel}`
      : "";

    const bannerStyle = isAiFull
      ? {
          background: "linear-gradient(90deg, #1a0a3a 0%, #120728 100%)",
          borderBottom: "1px solid rgba(167, 139, 250, 0.35)",
          color: "#a78bfa",
        }
      : {
          background: "linear-gradient(90deg, #2a1f0a 0%, #1f1500 100%)",
          borderBottom: "1px solid rgba(251, 191, 36, 0.35)",
          color: "#fbbf24",
        };

    const planLabel = isAiFull ? "AI 全功能體驗" : `體驗方案（${identityType}）`;

    return (
      <div
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium z-50 shrink-0"
        style={bannerStyle}
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 min-w-0 truncate">
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
          {!guestProfile && (
            <span className="opacity-60 ml-1.5">虛擬命盤載入中...</span>
          )}
        </span>
        <span className="opacity-40 hidden sm:block text-[10px] shrink-0">
          非真實命盤 · 可至設定頁更換生日
        </span>
        {/* 回到導覽頁 */}
        <button
          onClick={handleGoHome}
          className="opacity-60 hover:opacity-100 transition-colors ml-1 flex items-center gap-1 text-xs border border-current/30 px-2 py-0.5 rounded shrink-0"
          title="回到導覽頁"
        >
          <Home className="w-3 h-3" />
          <span className="hidden sm:inline">導覽頁</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-50 hover:opacity-100 transition-opacity ml-1 shrink-0"
          title="隱藏提示條"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleExit}
          className="opacity-60 hover:opacity-100 transition-colors ml-1 text-xs border border-current/30 px-2 py-0.5 rounded shrink-0"
          title="退出體驗模式"
        >
          退出
        </button>
      </div>
    );
  }

  // ── AI 全站唯讀（ai_readonly）：純資料讀取，綠色橫幅 ──
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
      <span className="opacity-50 hidden sm:block shrink-0">所有操作已停用</span>
      {/* 回到導覽頁 */}
      <button
        onClick={handleGoHome}
        className="opacity-60 hover:opacity-100 transition-colors ml-1 flex items-center gap-1 text-xs border border-current/30 px-2 py-0.5 rounded shrink-0"
        title="回到導覽頁"
      >
        <Home className="w-3 h-3" />
        <span className="hidden sm:inline">導覽頁</span>
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="opacity-50 hover:opacity-100 transition-opacity ml-1 shrink-0"
        title="隱藏提示條"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleExit}
        className="text-red-400/70 hover:text-red-400 transition-colors ml-2 text-xs shrink-0"
        title="退出唯讀模式"
      >
        退出
      </button>
    </div>
  );
}
