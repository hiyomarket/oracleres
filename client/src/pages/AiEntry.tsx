/**
 * AiEntry.tsx
 * AI Token 全站唯讀進入頁
 *
 * 流程：
 * 1. 從 URL query string 取得 ?token=xxx
 * 2. 呼叫 accessTokens.verify 驗證 Token
 * 3. 驗證成功且 accessMode === "admin_view" → 寫入 AI session → 顯示導覽頁
 * 4. 驗證成功但 accessMode === "daily_view" → 跳轉 /ai-view?token=xxx
 * 5. 驗證失敗 → 顯示錯誤說明
 *
 * AI session 儲存在 sessionStorage，key: "oracle_ai_session"
 * AccessGate 和 AdminLayout 會讀取此 session 以放行未登入的 AI 系統
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/** sessionStorage key */
export const AI_SESSION_KEY = "oracle_ai_session";

export interface AiSession {
  token: string;
  name: string;
  expiresAt: number | null;
  allowedModules: string[] | null;
  accessMode: "daily_view" | "admin_view";
  grantedAt: number;
}

/** 讀取目前的 AI session */
export function getAiSession(): AiSession | null {
  try {
    const raw = sessionStorage.getItem(AI_SESSION_KEY);
    if (!raw) return null;
    const session: AiSession = JSON.parse(raw);
    if (session.expiresAt && session.expiresAt < Date.now()) {
      sessionStorage.removeItem(AI_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** 清除 AI session */
export function clearAiSession() {
  sessionStorage.removeItem(AI_SESSION_KEY);
}

/** 是否目前為 AI 全站唯讀模式 */
export function isAiAdminViewMode(): boolean {
  const session = getAiSession();
  return session?.accessMode === "admin_view";
}

// 前台頁面清單
const FRONTEND_SECTIONS = [
  { emoji: "⚔️", title: "今日作戰室", desc: "八字十神、塔羅流日、穿搭手串、財運羅盤、天命問卜", path: "/" },
  { emoji: "🎋", title: "擲筊問卦", desc: "傳統擲筊、三聖杯連擲、AI 深度解讀", path: "/oracle" },
  { emoji: "🎰", title: "刷刷樂選號", desc: "命格加權選號、最佳時機、附近彩券行", path: "/lottery" },
  { emoji: "📅", title: "命理日曆", desc: "每日干支吉凶、農曆節氣、時辰宜忌", path: "/calendar" },
  { emoji: "📊", title: "命理週報", desc: "七日能量走勢、刷刷樂 ROI 統計", path: "/weekly" },
  { emoji: "📈", title: "年度統計", desc: "擲筊結果比例、問題類型分布、能量分析", path: "/stats" },
  { emoji: "🪬", title: "命格身份證", desc: "八字四柱、紫微十二宮、生命靈數、五行比例", path: "/profile" },
];

// 後台管理頁面清單
const ADMIN_SECTIONS = [
  { emoji: "📊", title: "管理儀表板", desc: "系統總覽、Token 到期警示、快速統計", path: "/admin/dashboard" },
  { emoji: "👥", title: "用戶管理", desc: "用戶列表、角色設定（admin/viewer/user）", path: "/admin/users" },
  { emoji: "📢", title: "廣告/公告", desc: "橫幅廣告、系統公告管理", path: "/admin/banners" },
  { emoji: "⚙️", title: "邏輯計算", desc: "命理算法參數、能量係數設定", path: "/admin/config" },
  { emoji: "🔮", title: "專家管理", desc: "命理專家資料庫、評分管理", path: "/admin/experts" },
  { emoji: "🎨", title: "主題配色", desc: "全站視覺主題、色彩方案", path: "/admin/theme" },
  { emoji: "🛍️", title: "功能商店", desc: "付費功能管理、授權控制", path: "/admin/feature-store" },
  { emoji: "📣", title: "行銷工具", desc: "推廣活動、SEO 設定", path: "/admin/marketing" },
  { emoji: "🔑", title: "AI 渠道 Token", desc: "特殊存取 Token 管理", path: "/admin/access-tokens" },
];

export default function AiEntry() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "ready" | "redirecting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [session, setSession] = useState<AiSession | null>(null);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const verifyQuery = trpc.accessTokens.verify.useQuery(
    { token },
    {
      enabled: Boolean(token),
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("缺少存取 Token，請確認連結是否完整。");
      return;
    }

    if (verifyQuery.isLoading) return;

    if (verifyQuery.error || !verifyQuery.data) {
      setStatus("error");
      setErrorMsg("無法連接驗證服務，請稍後再試。");
      return;
    }

    const result = verifyQuery.data;

    if (!result.valid) {
      setStatus("error");
      const reasonMap: Record<string, string> = {
        not_found: "Token 不存在，請確認連結是否正確。",
        revoked: "此 Token 已被停用，請聯繫管理員取得新連結。",
        expired: "此 Token 已過期，請聯繫管理員更新連結。",
        db_unavailable: "系統暫時無法驗證，請稍後再試。",
      };
      setErrorMsg(reasonMap[(result as { reason?: string }).reason ?? ""] ?? "Token 驗證失敗，請聯繫管理員。");
      return;
    }

    if (!result.accessMode || result.accessMode === "daily_view") {
      setStatus("redirecting");
      setTimeout(() => navigate(`/ai-view?token=${encodeURIComponent(token)}`), 800);
      return;
    }

    // admin_view → 寫入 AI session，讓全站守衛放行
    const aiSession: AiSession = {
      token,
      name: result.name ?? "AI 系統",
      expiresAt: result.expiresAt ?? null,
      allowedModules: result.allowedModules ?? null,
      accessMode: "admin_view",
      grantedAt: Date.now(),
    };
    sessionStorage.setItem(AI_SESSION_KEY, JSON.stringify(aiSession));
    setSession(aiSession);
    setStatus("ready");
  }, [verifyQuery.isLoading, verifyQuery.data, verifyQuery.error, token, navigate]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const formatExpiry = (ts: number | null) => {
    if (!ts) return "永不過期";
    return new Date(ts).toLocaleString("zh-TW", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  // 載入中
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--page-bg, #0d0d1f)" }}>
        <div className="text-4xl animate-spin">☯</div>
        <p className="text-amber-400 text-lg animate-pulse">正在驗證存取權限...</p>
        <p className="text-muted-foreground text-sm">請稍候</p>
      </div>
    );
  }

  // 跳轉今日運勢
  if (status === "redirecting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--page-bg, #0d0d1f)" }}>
        <div className="text-5xl">☀️</div>
        <p className="text-amber-400 text-lg font-semibold">正在跳轉今日運勢...</p>
      </div>
    );
  }

  // 錯誤
  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
        style={{ background: "var(--page-bg, #0d0d1f)" }}>
        <div className="text-5xl">🔒</div>
        <div className="text-center max-w-sm">
          <h1 className="text-red-400 text-xl font-bold mb-2">存取失敗</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{errorMsg}</p>
        </div>
        <a href="/" className="text-amber-400 hover:text-amber-300 text-sm underline transition-colors">
          返回首頁
        </a>
      </div>
    );
  }

  // 導覽頁（全站唯讀模式）
  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg, #0d0d1f)" }}>
      {/* 頂部 Token 資訊欄 */}
      <div className="sticky top-0 z-50 border-b border-emerald-500/30 bg-emerald-950/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">🤖</span>
            <div>
              <p className="text-emerald-300 font-semibold text-sm">
                AI 唯讀模式 — {session?.name}
              </p>
              <p className="text-emerald-400/50 text-xs">
                所有頁面唯讀，無法執行任何操作 · 到期：{formatExpiry(session?.expiresAt ?? null)}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearAiSession();
              navigate("/");
            }}
            className="text-xs text-emerald-400/60 hover:text-emerald-300 transition-colors border border-emerald-500/30 px-2 py-1 rounded"
          >
            退出
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 歡迎標題 */}
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">☯️</div>
          <h1 className="text-2xl font-bold text-white">天命共振系統</h1>
          <p className="text-white/50 text-sm">全站唯讀存取 · 以下所有頁面均可瀏覽，但不能執行任何操作</p>
        </div>

        {/* 前台頁面 */}
        <div className="space-y-3">
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <span className="w-4 h-px bg-amber-500/50 inline-block" />
            前台功能頁面
            <span className="flex-1 h-px bg-white/10 inline-block" />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FRONTEND_SECTIONS.map((section) => (
              <button
                key={section.path}
                onClick={() => handleNavigate(section.path)}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 hover:border-amber-500/30 transition-all group"
              >
                <span className="text-2xl shrink-0">{section.emoji}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-white group-hover:text-amber-300 transition-colors text-sm">
                    {section.title}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{section.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 後台管理頁面 */}
        <div className="space-y-3">
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <span className="w-4 h-px bg-emerald-500/50 inline-block" />
            後台管理頁面
            <span className="flex-1 h-px bg-white/10 inline-block" />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADMIN_SECTIONS.map((section) => (
              <button
                key={section.path}
                onClick={() => handleNavigate(section.path)}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
              >
                <span className="text-2xl shrink-0">{section.emoji}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors text-sm">
                    {section.title}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{section.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 底部說明 */}
        <div className="rounded-xl border border-white/10 bg-white/3 p-4 text-center">
          <p className="text-white/30 text-xs leading-relaxed">
            此為 AI 唯讀存取模式。所有頁面資料均為即時資料，但所有新增、修改、刪除操作均已停用。
            <br />
            如需完整存取權限，請聯繫系統管理員。
          </p>
        </div>
      </div>
    </div>
  );
}
