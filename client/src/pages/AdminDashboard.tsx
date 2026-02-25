/**
 * AdminDashboard.tsx
 * 管理員儀表板頁面
 * - KPI 卡片：總用戶數、活躍用戶、本週新增、方案分佈
 * - 24 小時活躍時段分析圖表
 * - 快速跳轉至帳號管理
 */
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SharedNav } from "@/components/SharedNav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PLAN_LABELS: Record<string, string> = {
  basic: "基礎",
  advanced: "進階",
  professional: "專業",
};

const PLAN_COLORS: Record<string, string> = {
  basic: "#64748b",
  advanced: "#f97316",
  professional: "#a855f7",
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.getKpis.useQuery(undefined, {
    enabled: !!user && (user.role === "admin"),
    retry: false,
  });
  const { data: hourlyData, isLoading: hourlyLoading } = trpc.dashboard.getHourlyActivity.useQuery(undefined, {
    enabled: !!user && (user.role === "admin"),
    retry: false,
  });

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-amber-400 text-lg animate-pulse">載入中...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  const planDist = kpis?.planDist ?? {};
  const totalPlanUsers = Object.values(planDist).reduce((a, b) => a + b, 0);

  // 格式化時辰標籤（24小時制 → 時辰名稱）
  const HOUR_NAMES = [
    "子", "丑", "丑", "寅", "寅", "卯",
    "卯", "辰", "辰", "巳", "巳", "午",
    "午", "未", "未", "申", "申", "酉",
    "酉", "戌", "戌", "亥", "亥", "子",
  ];
  const chartData = (hourlyData ?? []).map(d => ({
    ...d,
    label: `${d.hour}時`,
    hourName: HOUR_NAMES[d.hour],
  }));

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white oracle-page-content">
      <SharedNav currentPage="oracle" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400 mb-1">管理員儀表板</h1>
          <p className="text-slate-400 text-sm">用戶洞察與系統概況（近 30 天數據）</p>
        </div>

        {/* KPI 卡片區 */}
        {kpisLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-800/60 rounded-xl p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard
                label="總用戶數"
                value={kpis?.totalUsers ?? 0}
                unit="人"
                color="text-amber-400"
                icon="👥"
              />
              <KpiCard
                label="已啟用用戶"
                value={kpis?.activatedUsers ?? 0}
                unit="人"
                color="text-emerald-400"
                icon="✅"
              />
              <KpiCard
                label="本週新增"
                value={kpis?.newUsersThisWeek ?? 0}
                unit="人"
                color="text-sky-400"
                icon="🆕"
              />
              <KpiCard
                label="今日活躍"
                value={kpis?.todayActive ?? 0}
                unit="人"
                color="text-violet-400"
                icon="⚡"
              />
            </div>

            {/* 積分統計 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <KpiCard
                label="累積發放積分"
                value={kpis?.totalPointsGranted ?? 0}
                unit="分"
                color="text-amber-400"
                icon="🌟"
              />
              <KpiCard
                label="累積消耗積分"
                value={kpis?.totalPointsSpent ?? 0}
                unit="分"
                color="text-rose-400"
                icon="💸"
              />
            </div>

            {/* 方案分佈 */}
            <div className="bg-slate-800/60 rounded-xl p-5 mb-6 border border-slate-700/50">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">方案分佈</h2>
              <div className="flex gap-4 flex-wrap">
                {["basic", "advanced", "professional"].map(planId => {
                  const cnt = planDist[planId] ?? 0;
                  const pct = totalPlanUsers > 0 ? Math.round((cnt / totalPlanUsers) * 100) : 0;
                  return (
                    <div key={planId} className="flex-1 min-w-[100px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PLAN_COLORS[planId] }}
                        />
                        <span className="text-xs text-slate-400">{PLAN_LABELS[planId]}</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: PLAN_COLORS[planId] }}>
                        {cnt}
                      </div>
                      <div className="text-xs text-slate-500">{pct}%</div>
                      {/* 進度條 */}
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PLAN_COLORS[planId],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 24 小時活躍時段圖表 */}
        <div className="bg-slate-800/60 rounded-xl p-5 mb-6 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">
            24 小時活躍時段分析
            <span className="text-slate-500 font-normal ml-2">（近 30 天，台灣時間）</span>
          </h2>
          {hourlyLoading ? (
            <div className="h-56 flex items-center justify-center text-slate-500 animate-pulse">
              載入圖表中...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  interval={1}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === "oracle" ? "擲筊" : "選號",
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend
                  formatter={(value) => (value === "oracle" ? "擲筊" : "選號")}
                  wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                />
                <Bar dataKey="oracle" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="lottery" stackId="a" fill="#a855f7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/account-manager">
            <div className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-amber-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">👤</span>
                <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">帳號管理</h3>
              </div>
              <p className="text-sm text-slate-400">查看所有用戶、篩選方案、管理積分與權限</p>
            </div>
          </Link>
          <Link href="/permissions">
            <div className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-amber-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🔑</span>
                <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">功能權限管理</h3>
              </div>
              <p className="text-sm text-slate-400">設定每位用戶可使用的功能模組與截止日期</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: string;
}) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-slate-500 mt-1">{unit}</div>
    </div>
  );
}
