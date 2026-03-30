import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Star, Briefcase, Calendar, MessageSquare, TrendingUp,
  Clock, CheckCircle, AlertCircle, User, ChevronRight,
  CreditCard, Zap, DollarSign, MessageCircle, BarChart3,
} from "lucide-react";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR, EXPERT_STATUS_COLOR, EXPERT_STATUS_LABEL } from "@/lib/expertConstants";
import { StatsSkeleton, CardSkeleton } from "@/components/ExpertSkeleton";

export default function ExpertDashboard() {
  const { data: profile, isLoading: profileLoading } = trpc.expert.getMyProfile.useQuery();
  const { data: services = [] } = trpc.expert.listMyServices.useQuery();
  const { data: bookings = [] } = trpc.expert.listMyBookings.useQuery({ status: "all", limit: 5, offset: 0 });
  const { data: revenueStats } = trpc.expert.getRevenueStats.useQuery(undefined, { enabled: !!profile });

  const pendingCount = bookings.filter((b) => b.status === "pending_payment").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const totalRevenue = revenueStats?.totalRevenue ?? 0;
  const monthRevenue = revenueStats?.monthRevenue ?? 0;



  // 尚未建立個人品牌時，顯示初始化引導
  if (!profileLoading && !profile) {
    return (
      <ExpertLayout pageTitle="儀表盤">
        <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Star className="w-10 h-10 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">歡迎加入天命聯盟</h1>
            <p className="text-muted-foreground">
              您尚未建立命理師個人品牌。請先完成個人資料設定，<br />
              讓用戶能夠找到您並預約服務。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <Card className="border-amber-500/20">
              <CardContent className="p-4 text-center space-y-2">
                <User className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-medium">步驟一</p>
                <p className="text-xs text-muted-foreground">建立個人品牌頁面（名稱、介紹、標籤）</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500/20">
              <CardContent className="p-4 text-center space-y-2">
                <Briefcase className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-sm font-medium">步驟二</p>
                <p className="text-xs text-muted-foreground">新增服務項目與定價</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/20">
              <CardContent className="p-4 text-center space-y-2">
                <Calendar className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-sm font-medium">步驟三</p>
                <p className="text-xs text-muted-foreground">設定可預約時段</p>
              </CardContent>
            </Card>
          </div>
          <Link href="/expert/profile">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8">
              <User className="w-4 h-4 mr-2" />
              開始建立個人品牌
            </Button>
          </Link>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout pageTitle="儀表盤">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-6">
        {/* 頂部歡迎 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold hidden md:block">
              {profile ? `歡迎回來，${profile.publicName}` : "歡迎來到專家後台"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              管理您的個人品牌、服務項目和預約訂單
            </p>
          </div>
          {profile && (
            <Badge className={`border ${EXPERT_STATUS_COLOR[profile.status] || ""}`}>
              {profile.status === "active" ? "✓ 公開接客中" : profile.status === "pending_review" ? "⏳ 審核中" : "暫停接客"}
            </Badge>
          )}
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-amber-500/20">
            <CardContent className="p-3 text-center">
              <Briefcase className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-amber-400">{services.length}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">服務項目</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20">
            <CardContent className="p-3 text-center">
              <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">待確認</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-green-400">{confirmedCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">已確認</div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20">
            <CardContent className="p-3 text-center">
              <Star className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-blue-400">
                {profile ? Number(profile.ratingAvg).toFixed(1) : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">平均評分</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="p-3 text-center">
              <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-emerald-400">
                {monthRevenue > 0 ? `$${monthRevenue.toLocaleString()}` : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">本月營收</div>
            </CardContent>
          </Card>
          <Card className="border-violet-500/20">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 text-violet-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-violet-400">
                {totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">總營收</div>
            </CardContent>
          </Card>
        </div>

        {/* 快速入口 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { href: "/expert/profile", icon: User, color: "amber", label: "個人品牌", desc: "更新頭像、介紹" },
            { href: "/expert/services", icon: Briefcase, color: "blue", label: "服務管理", desc: "新增/編輯服務" },
            { href: "/expert/calendar", icon: Calendar, color: "green", label: "行事曆", desc: "設定可預約時段" },
            { href: "/expert/revenue", icon: BarChart3, color: "emerald", label: "營收統計", desc: "查看詳細營收" },
            { href: "/expert/reviews", icon: MessageCircle, color: "violet", label: "評價管理", desc: "回覆用戶評價" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className={`cursor-pointer hover:border-${item.color}-500/40 transition-colors h-full`}>
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <div className={`w-9 h-9 rounded-full bg-${item.color}-500/15 flex items-center justify-center`}>
                    <item.icon className={`w-4.5 h-4.5 text-${item.color}-400`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* 營收概覽卡片 */}
        {revenueStats && revenueStats.totalRevenue > 0 && (
          <Card className="border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-sm">營收概覽</span>
                </div>
                <Link href="/expert/revenue">
                  <Button variant="ghost" size="sm" className="text-xs text-emerald-400">查看詳細</Button>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">${revenueStats.monthRevenue.toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground">本月營收</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{revenueStats.monthCompletedCount}</div>
                  <div className="text-[11px] text-muted-foreground">本月完成</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">${revenueStats.totalRevenue.toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground">總營收</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 金流串接預留提示 */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <CreditCard className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-amber-400">線上金流付款 — 即將開放</p>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">開發中</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              目前付款方式為用戶手動上傳匯款憑證，由您確認後完成訂單。
              系統即將整合線上金流（信用卡、轉帳），屆時付款流程將全自動化。
            </p>
          </div>
        </div>

        {/* 最近訂單 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近訂單</CardTitle>
              <Link href="/expert/bookings">
                <Button variant="ghost" size="sm" className="text-xs">查看全部</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">目前還沒有訂單</p>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.userName || "用戶"}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.serviceTitle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={`text-xs border ${BOOKING_STATUS_COLOR[b.status] || ""}`}>
                        {BOOKING_STATUS_LABEL[b.status] || b.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(b.bookingTime).toLocaleDateString("zh-TW")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ExpertLayout>
  );
}
