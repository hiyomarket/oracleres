import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";

// 顏色配置
const RESULT_COLORS = {
  sheng: '#ef4444', // 聖杯 - 紅色
  xiao: '#a16207', // 笑杯 - 木色
  yin: '#1e293b',  // 陰杯 - 黑色
  li: '#f59e0b',   // 立筊 - 金色
};

const RESULT_NAMES: Record<string, string> = {
  sheng: '聖杯',
  xiao: '笑杯',
  yin: '陰杯',
  li: '立筊',
};

const QUERY_TYPE_NAMES: Record<string, string> = {
  fire_earth: '事業財富',
  water_wood: '學習健康',
  metal: '人際感情',
  neutral: '其他',
};

const QUERY_TYPE_COLORS: Record<string, string> = {
  fire_earth: '#f97316',
  water_wood: '#22d3ee',
  metal: '#a78bfa',
  neutral: '#94a3b8',
};

const ENERGY_NAMES: Record<string, string> = {
  excellent: '大吉',
  good: '吉',
  neutral: '平',
  challenging: '凶',
  complex: '複雜',
};

const ENERGY_COLORS: Record<string, string> = {
  excellent: '#f59e0b',
  good: '#10b981',
  neutral: '#60a5fa',
  challenging: '#94a3b8',
  complex: '#a78bfa',
};

// 自定義 Tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-amber-600/30 rounded-xl p-3 shadow-xl">
        {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// 自定義 PieChart 標籤
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function OracleStats() {
  const { data: stats, isLoading } = trpc.oracle.stats.useQuery(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen oracle-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-4xl"
        >
          ☯
        </motion.div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="min-h-screen oracle-bg flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🔮</div>
        <h2 className="text-xl font-bold oracle-text-gradient">尚無神諭記錄</h2>
        <p className="text-sm text-muted-foreground">開始您的第一次擲筊，神諭資料庫將自動記錄。</p>
      </div>
    );
  }

  // 整理圖表數據
  const resultData = stats.resultCounts.map((r: any) => ({
    name: RESULT_NAMES[r.result] || r.result,
    value: r.count,
    color: RESULT_COLORS[r.result as keyof typeof RESULT_COLORS] || '#888',
  }));

  const queryTypeData = stats.queryTypeCounts.map((q: any) => ({
    name: QUERY_TYPE_NAMES[q.queryType] || q.queryType,
    value: q.count,
    color: QUERY_TYPE_COLORS[q.queryType] || '#888',
  }));

  const energyData = stats.energyCounts.map((e: any) => ({
    name: ENERGY_NAMES[e.energyLevel] || e.energyLevel,
    value: e.count,
    color: ENERGY_COLORS[e.energyLevel] || '#888',
  }));

  const monthlyData = stats.monthlyCounts.map((m: any) => ({
    month: m.month,
    次數: m.count,
  }));

  // 計算聖杯率
  const shengCount = stats.resultCounts.find((r: any) => r.result === 'sheng')?.count ?? 0;
  const shengRate = stats.total > 0 ? ((shengCount / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen oracle-bg">
      {/* 頂部標題 */}
      <div className="relative z-10 px-4 md:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-black oracle-text-gradient tracking-widest mb-2">
              神諭資料庫
            </h1>
            <p className="text-xs text-muted-foreground tracking-[0.3em]">
              蘇祐震先生的天命洞察統計
            </p>
          </div>

          {/* 總覽卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: '總擲筊次數', value: stats.total, icon: '🎋', color: 'text-amber-300' },
              { label: '聖杯率', value: `${shengRate}%`, icon: '🔴', color: 'text-red-400' },
              { label: '最多問題類型', value: queryTypeData[0]?.name ?? '—', icon: '💭', color: 'text-blue-300' },
              { label: '最常能量狀態', value: energyData.sort((a: any, b: any) => b.value - a.value)[0]?.name ?? '—', icon: '⚡', color: 'text-emerald-300' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card rounded-2xl p-4 text-center border border-border/30"
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className={cn('text-lg font-bold', stat.color)}>{stat.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* 圖表區域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

            {/* 擲筊結果分布 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card rounded-2xl p-5 border border-border/30"
            >
              <h3 className="text-sm font-semibold oracle-text-gradient tracking-wider mb-4">
                擲筊結果分布
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={resultData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {resultData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* 圖例 */}
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {resultData.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 問題類型分布 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass-card rounded-2xl p-5 border border-border/30"
            >
              <h3 className="text-sm font-semibold oracle-text-gradient tracking-wider mb-4">
                問題類型分布
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={queryTypeData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="次數" radius={[4, 4, 0, 0]}>
                    {queryTypeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* 每月擲筊次數 */}
            {monthlyData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="glass-card rounded-2xl p-5 border border-border/30 md:col-span-2"
              >
                <h3 className="text-sm font-semibold oracle-text-gradient tracking-wider mb-4">
                  每月擲筊次數趨勢
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="次數"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 4 }}
                      activeDot={{ r: 6, fill: '#fbbf24' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* 能量狀態分布 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={cn(
                'glass-card rounded-2xl p-5 border border-border/30',
                monthlyData.length <= 1 ? 'md:col-span-2' : ''
              )}
            >
              <h3 className="text-sm font-semibold oracle-text-gradient tracking-wider mb-4">
                擲筊時能量狀態分布
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={energyData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="次數" radius={[0, 4, 4, 0]}>
                    {energyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* 最近記錄 */}
          {stats.recentSessions && stats.recentSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="glass-card rounded-2xl p-5 border border-border/30"
            >
              <h3 className="text-sm font-semibold oracle-text-gradient tracking-wider mb-4">
                最近神諭記錄
              </h3>
              <div className="space-y-2">
                {stats.recentSessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/8 transition-colors"
                  >
                    <div className="text-xl flex-shrink-0 mt-0.5">
                      {session.result === 'sheng' ? '🔴' :
                       session.result === 'xiao' ? '🟤' :
                       session.result === 'yin' ? '⚫' : '✨'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: RESULT_COLORS[session.result as keyof typeof RESULT_COLORS] || '#888' }}>
                          {RESULT_NAMES[session.result] || session.result}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.dayPillarStem}{session.dayPillarBranch}日
                        </span>
                        {session.queryType && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                            {QUERY_TYPE_NAMES[session.queryType] || session.queryType}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.query || '（未輸入問題）'}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {new Date(session.createdAt).toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 命理洞察 */}
          {stats.total >= 5 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-6 glass-card rounded-2xl p-5 border border-amber-600/30 bg-amber-900/10"
            >
              <h3 className="text-sm font-semibold text-amber-300 tracking-wider mb-3">
                ✨ 天命洞察
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground/80 leading-relaxed">
                {parseFloat(shengRate) > 55 && (
                  <p>• 您的聖杯率（{shengRate}%）高於傳統基準（50%），顯示您在問卜時機的選擇上頗具天賦，多在能量吉時提問。</p>
                )}
                {parseFloat(shengRate) < 40 && (
                  <p>• 您的聖杯率（{shengRate}%）偏低，建議多在巳時（09-11時）或能量大吉的日子擲筊，以提升準確率。</p>
                )}
                {queryTypeData[0]?.name === '事業財富' && (
                  <p>• 您最常詢問事業財富相關問題，這與您命格中「火為用神」的特質相符，對行動力與表達有強烈渴望。</p>
                )}
                {queryTypeData[0]?.name === '人際感情' && (
                  <p>• 您最常詢問人際感情相關問題，命格中金元素的複雜性影響著您的人際關係，值得深思。</p>
                )}
                <p>• 共計 {stats.total} 次神諭記錄，每一次擲筊都是您與天命的一次對話，珍貴地保存於此。</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
