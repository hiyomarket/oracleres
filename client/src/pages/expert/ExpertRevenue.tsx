/**
 * 專家後台 - 收入統計面板
 */
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsSkeleton } from "@/components/ExpertSkeleton";
import { formatPrice } from "@/lib/expertConstants";
import {
  DollarSign, TrendingUp, Calendar, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

export default function ExpertRevenue() {
  const { data: stats, isLoading } = trpc.expert.getRevenueStats.useQuery();

  if (isLoading) {
    return (
      <ExpertLayout pageTitle="收入統計">
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
          <StatsSkeleton count={4} />
          <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </ExpertLayout>
    );
  }

  const monthlyData = stats?.monthlyData ?? [];
  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  return (
    <ExpertLayout pageTitle="收入統計">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold">收入統計</h1>
          <p className="text-muted-foreground text-sm mt-1">追蹤您的服務收入與訂單趨勢</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatPrice(stats?.totalRevenue ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">累計總收入</div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {formatPrice(stats?.thisMonthRevenue ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">本月收入</div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {stats?.completedCount ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">已完成訂單</div>
            </CardContent>
          </Card>

          <Card className="border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-violet-400">
                {formatPrice(stats?.avgOrderValue ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">平均客單價</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              近 6 個月收入趨勢
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                尚無已完成的訂單數據
              </div>
            ) : (
              <div className="space-y-3">
                {monthlyData.map((m, i) => {
                  const prev = i > 0 ? monthlyData[i - 1].revenue : m.revenue;
                  const change = prev > 0 ? ((m.revenue - prev) / prev * 100) : 0;
                  const barWidth = Math.max(5, (m.revenue / maxRevenue) * 100);

                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0 font-mono">
                        {m.month}
                      </span>
                      <div className="flex-1 h-8 bg-accent/30 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500/60 to-amber-400/40 rounded-lg transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3 justify-between">
                          <span className="text-xs font-medium">
                            {formatPrice(m.revenue)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {m.count} 筆
                          </span>
                        </div>
                      </div>
                      {i > 0 && change !== 0 && (
                        <span className={`text-xs flex items-center gap-0.5 w-14 shrink-0 ${
                          change > 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(change).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card className="border-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-400">收入提示</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  此面板顯示的收入為已完成訂單的服務定價加總。
                  實際入帳金額可能因平台手續費、退款等因素而有差異。
                  線上金流整合後，此面板將自動顯示精確的淨收入數據。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ExpertLayout>
  );
}
