/**
 * AiReadOnlyBanner.tsx
 * 全站 AI 唯讀模式橫幅提示條
 * 當透過 AI Token（admin_view）進入時，在頁面頂部顯示
 * 提示此為唯讀模式，顯示 Token 名稱與到期時間
 */

import { useState } from "react";
import { getAiSession, clearAiSession } from "@/pages/AiEntry";
import { Eye, X } from "lucide-react";

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
