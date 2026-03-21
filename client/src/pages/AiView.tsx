/**
 * AiView.tsx
 * 特殊 Token 存取頁面（/ai-view?token=xxx）
 *
 * 功能：
 * - 驗證 URL 中的 token 參數
 * - Token 有效時顯示系統唯讀總覽（今日運勢摘要 + 關鍵數據）
 * - Token 無效/過期時顯示錯誤提示
 * - 不需要 OAuth 登入，適合 AI 系統或自動化渠道使用
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Key, AlertCircle, CheckCircle, Clock, Zap, Moon, Sun } from "lucide-react";

// 從 URL 取得 token 參數
function getTokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
}

// 格式化日期
function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AiView() {
  const [token] = useState(() => getTokenFromUrl());

  // 設定頁面標題
  useEffect(() => {
    document.title = "天命共振 AI 存取視圖 — 今日運勢唯讀摘要";
    return () => {
      document.title = "天命共振 — 八字命理、每日運勢、擲筊問卦、選號輔助系統 | 命理智慧平台";
    };
  }, []);

  // 驗證 Token
  const { data: tokenInfo, isLoading: tokenLoading } = trpc.accessTokens.verify.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // 模組可見性：null = 全部開放，陣列 = 只顯示指定模組
  const allowedModules: string[] | null = (tokenInfo as { allowedModules?: string[] | null })?.allowedModules ?? null;
  const canShow = (moduleId: string) => !allowedModules || allowedModules.includes(moduleId);

  // 取得今日運勢（僅在 Token 有效時）
  const todayDate = new Date().toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\//g, "-");

  const { data: dailyData, isLoading: dailyLoading } = trpc.warRoom.dailyReport.useQuery(
    { date: todayDate },
    {
      enabled: tokenInfo?.valid === true,
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );

  // Token 未提供
  if (!token) {
    return (
      <div className="min-h-screen oracle-page flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">缺少存取 Token</h1>
          <p className="text-white/50 text-sm">
            請在 URL 中提供有效的 token 參數：
            <code className="block mt-2 px-3 py-2 bg-white/5 rounded-lg text-amber-300 font-mono text-xs">
              /ai-view?token=YOUR_TOKEN_HERE
            </code>
          </p>
        </div>
      </div>
    );
  }

  // 載入中
  if (tokenLoading) {
    return (
      <div className="min-h-screen oracle-page flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto mb-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full"
          />
          <p className="text-amber-400/70 text-sm">驗證存取 Token...</p>
        </div>
      </div>
    );
  }

  // Token 無效
  if (!tokenInfo?.valid) {
    const reasonMap: Record<string, string> = {
      not_found: "Token 不存在或已被刪除",
      revoked: "Token 已被管理員停用",
      expired: "Token 已過期",
      db_unavailable: "系統暫時無法驗證，請稍後再試",
    };
    const reason = tokenInfo?.reason ? reasonMap[tokenInfo.reason] ?? "Token 無效" : "Token 無效";

    return (
      <div className="min-h-screen oracle-page flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">存取被拒絕</h1>
          <p className="text-white/50 text-sm mb-4">{reason}</p>
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
            如需取得有效的存取 Token，請聯繫系統管理員。
          </div>
        </div>
      </div>
    );
  }

  // Token 有效 - 顯示唯讀視圖
  return (
    <div className="min-h-screen oracle-page">
      {/* 頂部 Token 狀態列 */}
      <div className="sticky top-0 z-50 border-b border-emerald-500/20 bg-emerald-900/20 backdrop-blur-sm px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 text-xs font-semibold">已驗證存取</span>
            <span className="text-white/40 text-xs">·</span>
            <span className="text-white/60 text-xs">{tokenInfo.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Key className="w-3 h-3" />
            <span className="hidden sm:inline">唯讀視圖</span>
            {tokenInfo.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                到期：{formatDate(new Date(tokenInfo.expiresAt))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-16">
        {/* 標題 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black text-white mb-1">⚔️ 天命共振 · 今日運勢</h1>
          <p className="text-white/40 text-sm">AI 存取視圖 · 唯讀摘要</p>
        </motion.div>

        {dailyLoading ? (
          <div className="text-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 mx-auto mb-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full"
            />
            <p className="text-amber-400/70 text-sm">正在推演今日天命...</p>
          </div>
        ) : dailyData ? (
          <div className="space-y-6">
            {/* 日期與四柱 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {[
                { label: "公曆", value: dailyData.date.gregorian },
                { label: "農曆", value: dailyData.date.lunar },
                { label: "日柱", value: dailyData.date.dayPillar },
                { label: "月相", value: `${dailyData.moon.emoji} ${dailyData.moon.phase}` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-white/40 text-xs mb-1">{item.label}</div>
                  <div className="text-white font-medium text-sm">{item.value}</div>
                </div>
              ))}
            </motion.div>

            {/* 今日一句話 + 能量評分 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
                    今日天命一句話
                  </div>
                  <p className="text-white text-lg font-medium leading-relaxed">{dailyData.oneLiner}</p>
                  <p className="text-white/50 text-sm mt-2">{dailyData.coreConflict}</p>
                </div>
                <div className="text-center shrink-0">
                  <div className="text-4xl font-bold text-amber-400">{dailyData.overallScore}</div>
                  <div className="text-white/40 text-xs">/10</div>
                  <div className="text-amber-300 text-xs font-semibold mt-1">{dailyData.tenGod.main}</div>
                </div>
              </div>
            </motion.div>

            {/* 十神能量 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">☯️</span>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">今日能量指引</h2>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">今日主要能量</span>
                  <span className="font-bold text-amber-300">{dailyData.tenGod.main} · {dailyData.tenGod.role}</span>
                </div>
                <p className="text-white/70 text-sm">{dailyData.tenGod.energy}</p>
                <p className="text-white/50 text-xs">{dailyData.tenGod.advice}</p>
              </div>
            </motion.div>

            {/* 天命格言 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🌳</span>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">本日天命格言</h2>
              </div>
              <p className="text-white text-base leading-relaxed">{dailyData.heroScript}</p>
            </motion.div>

            {/* 時辰能量摘要（最佳 + 最差） */}
            {canShow("hourly") && <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⏰</span>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">今日時辰摘要</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 最佳時辰 */}
                {(() => {
                  const best = dailyData.hourEnergy.allHours
                    .slice()
                    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)[0];
                  return best ? (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Sun className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 text-xs font-semibold">最佳時辰</span>
                      </div>
                      <div className="text-white font-bold">{best.name}</div>
                      <div className="text-white/50 text-xs">{best.displayTime}</div>
                    </div>
                  ) : null;
                })()}
                {/* 最差時辰 */}
                {(() => {
                  const worst = dailyData.hourEnergy.allHours
                    .slice()
                    .sort((a: { score: number }, b: { score: number }) => a.score - b.score)[0];
                  return worst ? (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Moon className="w-4 h-4 text-red-400" />
                        <span className="text-red-300 text-xs font-semibold">需注意時辰</span>
                      </div>
                      <div className="text-white font-bold">{worst.name}</div>
                      <div className="text-white/50 text-xs">{worst.displayTime}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            </motion.div>}

            {/* 塔羅牌 */}
            {canShow("tarot") && <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🃏</span>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">今日塔羅指引</h2>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-16 h-24 rounded-lg border border-amber-500/40 bg-amber-950/40 flex flex-col items-center justify-center">
                  <div className="text-2xl mb-1">
                    {dailyData.tarot.element === "火" ? "🔥" :
                     dailyData.tarot.element === "水" ? "💧" :
                     dailyData.tarot.element === "土" ? "🌍" :
                     dailyData.tarot.element === "風" ? "🌪️" : "⭐"}
                  </div>
                  <div className="text-amber-300 text-xs text-center px-1 font-bold leading-tight">
                    {dailyData.tarot.name}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {dailyData.tarot.keywords.map((kw: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">{kw}</span>
                    ))}
                  </div>
                  <p className="text-white/70 text-sm">{dailyData.tarot.energy}</p>
                  <p className="text-white/50 text-xs">{dailyData.tarot.advice}</p>
                </div>
              </div>
            </motion.div>}

            {/* 購彩指數 */}
            {canShow("wealth") && dailyData.wealthCompass && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">偶財指數</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-yellow-400">
                    {dailyData.wealthCompass.lotteryIndex ?? "—"}
                  </div>
                  <div className="flex-1">
                    <p className="text-white/70 text-sm">{dailyData.wealthCompass.lotteryAdvice}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 底部說明 */}
            <div className="text-center text-white/20 text-xs pt-4">
              天命共振 AI 唯讀視圖 · 資料僅供參考 · 此連結由系統管理員授權
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-white/40">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>無法載入今日運勢資料</p>
          </div>
        )}
      </main>
    </div>
  );
}
