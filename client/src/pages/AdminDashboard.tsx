/**
 * AdminDashboard.tsx
 * 管理員儀表板 — v9.1 鳳凰計畫升級版
 * - KPI 卡片：用戶統計 + 天命幣流通
 * - 功能使用頻率統計（含天命幣消耗估算）
 * - 方案分佈（從 user_subscriptions 動態查詢）
 * - 天命幣流通統計（取代快速操作）
 * - 24 小時活躍時段分析（保留，有實際數據）
 */
import { useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AdminLayout } from "@/components/AdminLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// 動態顏色池（方案分佈用）
const PLAN_COLOR_POOL = ["#f97316", "#a855f7", "#22d3ee", "#10b981", "#f59e0b", "#ef4444"];

// ─── KPI 卡片 ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit, color, icon, sub,
}: {
  label: string; value: number; unit: string; color: string; icon: string; sub?: string;
}) {
  return (
    <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/70 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${color} tabular-nums`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-slate-500 mt-1">{unit}{sub && <span className="ml-2 text-slate-600">{sub}</span>}</div>
    </div>
  );
}

// ─── 功能使用頻率列（含天命幣消耗估算）─────────────────────────────────────
function FeatureUsageRow({
  icon, feature, total30d, total7d, maxVal, coinCostPerUse,
}: {
  icon: string; feature: string; total30d: number; total7d: number; maxVal: number; coinCostPerUse: number;
}) {
  const pct30 = maxVal > 0 ? (total30d / maxVal) * 100 : 0;
  const trend = total30d > 0 ? Math.round((total7d / total30d) * 100 * (30 / 7)) : 0;
  const trendColor = trend >= 100 ? "text-emerald-400" : trend >= 60 ? "text-amber-400" : "text-slate-500";
  const estimatedCoins = total30d * coinCostPerUse;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
      <span className="text-xl w-7 shrink-0 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-slate-200 font-medium">{feature}</span>
          <div className="flex items-center gap-3 text-xs shrink-0 flex-wrap justify-end">
            <span className="text-slate-400">30天: <span className="text-slate-200 font-semibold">{total30d.toLocaleString()}</span></span>
            <span className="text-slate-500">7天: <span className="text-slate-300">{total7d.toLocaleString()}</span></span>
            <span className={`font-semibold ${trendColor}`}>{trend}%</span>
            {coinCostPerUse > 0 && (
              <span className="text-amber-400/80 font-medium">
                🪙 ~{estimatedCoins.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
            style={{ width: `${pct30}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── 主頁面 ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const isAdminOrViewer = !!user && (user.role === "admin" || user.role === "viewer");
  const isViewer = !!user && user.role === "viewer";
  const enabled = isAdminOrViewer;

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.getKpis.useQuery(undefined, { enabled, retry: false });
  const { data: hourlyData, isLoading: hourlyLoading } = trpc.dashboard.getHourlyActivity.useQuery(undefined, { enabled, retry: false });
  const { data: featureUsage, isLoading: featureLoading } = trpc.dashboard.getFeatureUsage.useQuery(undefined, { enabled, retry: false });

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin" && user.role !== "viewer") navigate("/");
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen oracle-page flex items-center justify-center">
        <div className="text-amber-400 text-lg animate-pulse">載入中...</div>
      </div>
    );
  }
  if (!user || (user.role !== "admin" && user.role !== "viewer")) return null;

  // 方案分佈：動態從 plansInfo 取得名稱
  const planDist = kpis?.planDist ?? {};
  const plansInfo = kpis?.plansInfo ?? [];
  const totalPlanUsers = Object.values(planDist).reduce((a, b) => a + b, 0);

  // 功能使用頻率
  const maxFeatureUsage = Math.max(...(featureUsage ?? []).map(f => f.total30d), 1);

  // 天命幣流通率
  const totalGranted = kpis?.totalCoinsGranted ?? 0;
  const totalSpent = kpis?.totalCoinsSpent ?? 0;
  const circulationRate = totalGranted > 0 ? Math.round((totalSpent / totalGranted) * 100) : 0;

  // 24小時圖表數據
  const chartData = (hourlyData ?? []).map(d => ({
    ...d,
    label: `${d.hour}時`,
    total: (d.oracle ?? 0) + (d.lottery ?? 0),
  }));

  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── 唯讀模式提示橫幅 ── */}
        {isViewer && (
          <div className="mb-6 flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 text-blue-300 text-sm">
            <span className="text-lg">👁️</span>
            <div>
              <span className="font-medium">唯讀模式</span>
              <span className="ml-2 text-blue-400/80">您目前以顧問身份瀏覽後台，僅可查看資料，無法進行新增、修改或刪除操作。</span>
            </div>
          </div>
        )}

        {/* ── 標題列 ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 mb-1">管理員儀表板</h1>
            <p className="text-slate-400 text-sm">{dateStr} · 數據基準：近 30 天</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users">
              <button className="text-xs bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
                👤 用戶管理
              </button>
            </Link>
            <Link href="/admin/destiny-shop">
              <button className="text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 px-3 py-1.5 rounded-lg transition-colors">
                🪙 天命小舖
              </button>
            </Link>
          </div>
        </div>

        {/* ── 第一列：用戶 KPI ── */}
        {kpisLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-800/60 rounded-2xl p-5 animate-pulse h-28" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <KpiCard label="總用戶數" value={kpis?.totalUsers ?? 0} unit="人" color="text-amber-400" icon="👥" />
              <KpiCard label="本週新增" value={kpis?.newUsersThisWeek ?? 0} unit="人" color="text-sky-400" icon="🆕" />
              <KpiCard label="今日活躍" value={kpis?.todayActive ?? 0} unit="人" color="text-violet-400" icon="⚡" />
              <KpiCard label="用戶平均天命幣" value={kpis?.avgCoinsBalance ?? 0} unit="枚/人" color="text-amber-300" icon="🪙" />
            </div>

            {/* ── 第二列：天命幣流通 KPI ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="累積發放天命幣" value={kpis?.totalCoinsGranted ?? 0} unit="枚" color="text-emerald-400" icon="✨" sub="（歷史累計）" />
              <KpiCard label="累積消耗天命幣" value={kpis?.totalCoinsSpent ?? 0} unit="枚" color="text-rose-400" icon="💸" />
              <KpiCard label="AI 功能消耗" value={kpis?.totalAiCoinsSpent ?? 0} unit="枚" color="text-purple-400" icon="🤖" sub="（AI 計費）" />
              <KpiCard label="充值總量" value={kpis?.totalCoinsTopup ?? 0} unit="枚" color="text-cyan-400" icon="💳" sub="（付費充值）" />
            </div>
          </>
        )}

        {/* ── 主要內容區：兩欄佈局 ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">

          {/* ── 左側：功能使用頻率（3欄） ── */}
          <div className="xl:col-span-3 bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">功能使用頻率</h2>
                <p className="text-xs text-slate-500 mt-0.5">各功能近 30 天使用次數排行，🪙 為預估天命幣消耗</p>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">近 30 天</span>
            </div>
            {featureLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-700/40 rounded-lg animate-pulse" />)}
              </div>
            ) : (featureUsage ?? []).length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">尚無使用記錄</div>
            ) : (
              <div>
                {(featureUsage ?? []).map((f) => (
                  <FeatureUsageRow
                    key={f.feature}
                    icon={f.icon}
                    feature={f.feature}
                    total30d={f.total30d}
                    total7d={f.total7d}
                    maxVal={maxFeatureUsage}
                    coinCostPerUse={f.coinCostPerUse ?? 0}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── 右側：方案分佈 + 天命幣流通統計（2欄） ── */}
          <div className="xl:col-span-2 space-y-4">
            {/* 方案分佈（動態） */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
              <h2 className="text-sm font-semibold text-slate-200 mb-4">方案訂閱分佈</h2>
              {kpisLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-700/40 rounded-lg animate-pulse" />)}</div>
              ) : Object.keys(planDist).length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">尚無訂閱用戶</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(planDist).map(([planId, cnt], idx) => {
                    const planName = plansInfo.find(p => p.id === planId)?.name ?? planId;
                    const pct = totalPlanUsers > 0 ? Math.round((cnt / totalPlanUsers) * 100) : 0;
                    const color = PLAN_COLOR_POOL[idx % PLAN_COLOR_POOL.length];
                    return (
                      <div key={planId}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs text-slate-300">{planName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color }}>{cnt}</span>
                            <span className="text-xs text-slate-500">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-500 text-right">
                    共 {totalPlanUsers} 位訂閱用戶
                  </div>
                </div>
              )}
            </div>

            {/* 天命幣流通統計 */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">天命幣流通健康度</h2>
              <div className="space-y-3">
                {/* 流通率 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">整體流通率</span>
                    <span className={`text-sm font-bold ${circulationRate >= 60 ? "text-emerald-400" : circulationRate >= 30 ? "text-amber-400" : "text-slate-500"}`}>
                      {circulationRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-700"
                      style={{ width: `${Math.min(circulationRate, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">消耗 / 發放 × 100%</p>
                </div>
                {/* 快速導航 */}
                <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                  {[
                    { href: "/admin/destiny-shop", icon: "🪙", label: "天命小舖管理", desc: "設定 AI 功能費用與方案贈幣" },
                    { href: "/admin/users", icon: "👤", label: "帳號管理", desc: "查看用戶天命幣餘額" },
                    { href: "/admin/business-hub", icon: "💰", label: "商業中心", desc: "方案訂閱與行銷活動" },
                  ].map(item => (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-700/40 hover:bg-slate-700/70 border border-slate-700/30 hover:border-slate-600/50 cursor-pointer transition-all group">
                        <span className="text-base">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">{item.label}</div>
                          <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
                        </div>
                        <span className="text-slate-600 group-hover:text-slate-400 text-xs">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 24 小時活躍時段圖表 ── */}
        <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">24 小時活躍時段分析</h2>
              <p className="text-xs text-slate-500 mt-0.5">近 30 天，台灣時間，擲筊 + 選號合計</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> 擲筊</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" /> 選號</span>
            </div>
          </div>
          {hourlyLoading ? (
            <div className="h-56 flex items-center justify-center text-slate-500 animate-pulse">載入圖表中...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} interval={1} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#f1f5f9", fontSize: 12 }}
                  formatter={(value: number, name: string) => [value, name === "oracle" ? "擲筊" : "選號"]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="oracle" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="#f97316" fillOpacity={0.85} />)}
                </Bar>
                <Bar dataKey="lottery" stackId="a" fill="#a855f7" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="#a855f7" fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* Token 到期警示區塊 */}
      <TokenExpiryWarning />
    </AdminLayout>
  );
}

// ─── Token 到期警示區塊 ──────────────────────────────────────────────────────────
function TokenExpiryWarning() {
  const { data: expiring = [] } = trpc.accessTokens.listExpiringSoon.useQuery();
  if (expiring.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚠️</span>
        <h2 className="text-sm font-semibold text-orange-300">特殊存取 Token 即將到期</h2>
        <span className="ml-auto text-xs text-orange-400/60">{expiring.length} 個 Token 將於 7 天內到期</span>
      </div>
      <div className="space-y-2">
        {expiring.map((t: { id: number; name: string; expiresAt: number | null }) => {
          const days = t.expiresAt
            ? Math.ceil((t.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          return (
            <div key={t.id} className="flex items-center justify-between rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-orange-300 font-medium text-sm">{t.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-orange-400 text-xs font-semibold">剩 {days} 天</span>
                <Link href="/admin/access-tokens" className="text-xs text-orange-300/70 hover:text-orange-300 underline underline-offset-2">前往管理</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
