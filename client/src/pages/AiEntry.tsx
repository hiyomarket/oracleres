/**
 * AiEntry.tsx
 * AI Token 全站唯讀進入頁
 *
 * 流程：
 * 1. 從 URL query string 取得 ?token=xxx
 * 2. 呼叫 accessTokens.verify 驗證 Token
 * 3. 驗證成功且 accessMode === "admin_view" → 寫入 AI session → 跳轉後台儀表板
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

export default function AiEntry() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [tokenName, setTokenName] = useState("");

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

    setTokenName(result.name ?? "");

    if (!result.accessMode || result.accessMode === "daily_view") {
      setStatus("redirecting");
      setTimeout(() => navigate(`/ai-view?token=${encodeURIComponent(token)}`), 800);
      return;
    }

    // admin_view → 寫入 AI session，讓全站守衛放行
    const session: AiSession = {
      token,
      name: result.name ?? "AI 系統",
      expiresAt: result.expiresAt ?? null,
      allowedModules: result.allowedModules ?? null,
      accessMode: "admin_view",
      grantedAt: Date.now(),
    };
    sessionStorage.setItem(AI_SESSION_KEY, JSON.stringify(session));
    setStatus("redirecting");
    // 跳轉到後台儀表板作為起點
    setTimeout(() => navigate("/admin/dashboard"), 1000);
  }, [verifyQuery.isLoading, verifyQuery.data, verifyQuery.error, token, navigate]);

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

  if (status === "redirecting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--page-bg, #0d0d1f)" }}>
        <div className="text-5xl">✅</div>
        <p className="text-green-400 text-lg font-semibold">驗證成功</p>
        <p className="text-muted-foreground text-sm">
          {tokenName && <span className="text-amber-300">「{tokenName}」</span>}
          {" "}正在進入全站唯讀模式...
        </p>
        <div className="w-48 h-1 bg-border rounded-full overflow-hidden mt-2">
          <div className="h-full bg-amber-400 rounded-full"
            style={{ animation: "w-full 1s ease-in-out forwards", width: "100%" }} />
        </div>
      </div>
    );
  }

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
