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

  // API 測試工具狀態
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<{ statusCode: number; body: unknown } | null>(null);
  const [testDuration, setTestDuration] = useState<number | null>(null);

  async function handleApiTest() {
    if (!session?.token) return;
    setTestStatus("loading");
    setTestResult(null);
    setTestDuration(null);
    const start = Date.now();
    try {
      const res = await fetch(`/api/ai-data?token=${session.token}`);
      const body = await res.json();
      setTestDuration(Date.now() - start);
      setTestResult({ statusCode: res.status, body });
      setTestStatus(res.ok ? "success" : "error");
    } catch (e) {
      setTestDuration(Date.now() - start);
      setTestResult({ statusCode: 0, body: { error: String(e) } });
      setTestStatus("error");
    }
  }

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

        {/* JSON API 說明文件 */}
        <div className="space-y-4">
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <span className="w-4 h-px bg-blue-500/50 inline-block" />
            結構化資料 JSON API
            <span className="flex-1 h-px bg-white/10 inline-block" />
          </h2>

          <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-5 space-y-5">
            {/* 端點說明 */}
            <div>
              <p className="text-blue-300 font-semibold text-sm mb-2">📡 端點格式</p>
              <div className="rounded-lg bg-black/40 border border-white/10 px-4 py-3">
                <code className="text-emerald-300 font-mono text-sm break-all">
                  GET {window.location.origin}/api/ai-data?token=<span className="text-amber-300">YOUR_TOKEN</span>
                </code>
              </div>
              <p className="text-white/40 text-xs mt-2">無需登入，直接 HTTP GET 請求即可取得今日完整命理資料。</p>
            </div>

            {/* 欄位說明 */}
            <div>
              <p className="text-blue-300 font-semibold text-sm mb-3">📋 回應欄位說明</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/50 font-medium pb-2 pr-4">欄位</th>
                      <th className="text-left text-white/50 font-medium pb-2 pr-4">類型</th>
                      <th className="text-left text-white/50 font-medium pb-2">說明</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    {[
                      ["date", "string", "查詢日期，格式 YYYY-MM-DD"],
                      ["dayPillar", "string", "今日日柱，例如 甲午"],
                      ["monthPillar", "string", "月柱，例如 辛卯"],
                      ["yearPillar", "string", "年柱，例如 丙午"],
                      ["tenGod", "string", "今日主十神，例如 比肩"],
                      ["dailyScore", "number", "今日能量分數（0–10）"],
                      ["headline", "string", "天命一句話（AI 生成）"],
                      ["tarot.card", "string", "塔羅牌名稱（需開放塔羅模組）"],
                      ["tarot.guidance", "string", "塔羅指引文字"],
                      ["wealthIndex", "number", "偶財指數（0–10，需開放偶財模組）"],
                      ["wealthTip", "string", "偶財建議文字"],
                      ["hourlyEnergy[]", "array", "時辰能量陣列（需開放時辰模組）"],
                      ["hourlyEnergy[].hour", "string", "時辰名稱，例如 子時"],
                      ["hourlyEnergy[].score", "number", "時辰能量分數（0–10）"],
                      ["lunarDate", "string", "農曆日期，例如 丙午年辛卯月甲午日"],
                      ["moonPhase", "string", "月相名稱，例如 眉月"],
                    ].map(([field, type, desc]) => (
                      <tr key={field} className="border-b border-white/5">
                        <td className="py-1.5 pr-4 font-mono text-emerald-300/80">{field}</td>
                        <td className="py-1.5 pr-4 text-amber-300/70">{type}</td>
                        <td className="py-1.5 text-white/40">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 範例回應 */}
            <div>
              <p className="text-blue-300 font-semibold text-sm mb-2">📄 範例回應（JSON）</p>
              <pre className="rounded-lg bg-black/50 border border-white/10 p-4 text-xs font-mono text-white/60 overflow-x-auto leading-relaxed">{`{
  "date": "2026-03-21",
  "dayPillar": "甲午",
  "monthPillar": "辛卯",
  "yearPillar": "丙午",
  "tenGod": "比肩",
  "dailyScore": 7.5,
  "headline": "自強不息，獨立前行。今日以實力說話。",
  "lunarDate": "丙午年辛卯月甲午日",
  "moonPhase": "眉月",
  "tarot": {
    "card": "力量",
    "guidance": "以內在力量面對挑戰，溫柔而堅定。"
  },
  "wealthIndex": 6,
  "wealthTip": "適合小額嘗試，避免大筆投入。",
  "hourlyEnergy": [
    { "hour": "子時", "score": 5 },
    { "hour": "丑時", "score": 7 }
  ]
}`}</pre>
            </div>

            {/* 錯誤碼說明 */}
            <div>
              <p className="text-blue-300 font-semibold text-sm mb-3">⚠️ 錯誤回應格式</p>
              <div className="space-y-2">
                {[
                  ["400", "missing_token", "缺少 token 參數"],
                  ["401", "token_not_found", "Token 不存在"],
                  ["401", "token_revoked", "Token 已被停用"],
                  ["401", "token_expired", "Token 已過期"],
                  ["403", "wrong_access_mode", "此 Token 不支援 API 存取（僅限 daily_view 模式）"],
                  ["500", "internal_error", "伺服器內部錯誤"],
                ].map(([code, reason, desc]) => (
                  <div key={reason} className="flex items-start gap-3 text-xs">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded font-mono font-semibold ${
                      code === "400" ? "bg-orange-500/20 text-orange-300" :
                      code === "401" ? "bg-red-500/20 text-red-300" :
                      code === "403" ? "bg-purple-500/20 text-purple-300" :
                      "bg-gray-500/20 text-gray-300"
                    }`}>{code}</span>
                    <span className="font-mono text-white/50 shrink-0">{reason}</span>
                    <span className="text-white/30">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 複製 + 立即測試按鈕 */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/api/ai-data?token=${session?.token ?? "YOUR_TOKEN"}`;
                  navigator.clipboard.writeText(url)
                    .then(() => alert("API 端點已複製！"))
                    .catch(() => {});
                }}
                className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors border border-blue-500/30 hover:border-blue-400/50 px-3 py-2 rounded-lg bg-blue-500/5 hover:bg-blue-500/10"
              >
                <span>📋</span>
                複製我的 API 端點（含 Token）
              </button>
              <button
                onClick={handleApiTest}
                disabled={testStatus === "loading"}
                className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200 transition-colors border border-emerald-500/30 hover:border-emerald-400/50 px-3 py-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{testStatus === "loading" ? "⏳" : "▶️"}</span>
                {testStatus === "loading" ? "呼叫中…" : "立即測試 API"}
              </button>
            </div>

            {/* 測試結果展示 */}
            {testResult && (
              <div className={`rounded-xl border p-4 space-y-3 ${
                testStatus === "success"
                  ? "border-emerald-500/30 bg-emerald-950/30"
                  : "border-red-500/30 bg-red-950/30"
              }`}>
                {/* 狀態列 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      testStatus === "success"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                    }`}>
                      HTTP {testResult.statusCode}
                    </span>
                    <span className={`text-xs font-semibold ${
                      testStatus === "success" ? "text-emerald-300" : "text-red-300"
                    }`}>
                      {testStatus === "success" ? "✅ 請求成功" : "❌ 請求失敗"}
                    </span>
                  </div>
                  {testDuration !== null && (
                    <span className="text-white/30 text-xs">耗時 {testDuration} ms</span>
                  )}
                </div>

                {/* JSON 回應內容 */}
                <div>
                  <p className="text-white/40 text-xs mb-1">回應內容：</p>
                  <pre className="rounded-lg bg-black/50 border border-white/10 p-3 text-xs font-mono text-white/70 overflow-x-auto max-h-80 leading-relaxed">
                    {JSON.stringify(testResult.body, null, 2)}
                  </pre>
                </div>

                {/* 重新測試按鈕 */}
                <button
                  onClick={handleApiTest}
                  className="text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  重新測試
                </button>
              </div>
            )}
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
