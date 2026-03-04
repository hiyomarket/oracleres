import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Star, Briefcase, Calendar, MessageSquare, TrendingUp,
  Clock, CheckCircle, AlertCircle, User, ChevronRight
} from "lucide-react";

export default function ExpertDashboard() {
  const { data: profile, isLoading: profileLoading } = trpc.expert.getMyProfile.useQuery();
  const { data: services = [] } = trpc.expert.listMyServices.useQuery();
  const { data: bookings = [] } = trpc.expert.listMyBookings.useQuery({ status: "all", limit: 5, offset: 0 });

  const pendingCount = bookings.filter((b) => b.status === "pending_payment").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  const statusColor: Record<string, string> = {
    pending_payment: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const statusLabel: Record<string, string> = {
    pending_payment: "待確認付款",
    confirmed: "已確認",
    completed: "已完成",
    cancelled: "已取消",
  };

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
            <Badge
              className={
                profile.status === "active"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : profile.status === "pending_review"
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
              }
            >
              {profile.status === "active" ? "✓ 公開接客中" : profile.status === "pending_review" ? "⏳ 審核中" : "暫停接客"}
            </Badge>
          )}
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-amber-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{services.length}</div>
              <div className="text-xs text-muted-foreground mt-1">服務項目</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-xs text-muted-foreground mt-1">待確認訂單</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{confirmedCount}</div>
              <div className="text-xs text-muted-foreground mt-1">已確認訂單</div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {profile ? Number(profile.ratingAvg).toFixed(1) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">平均評分</div>
            </CardContent>
          </Card>
        </div>

        {/* 快速入口 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/expert/profile">
            <Card className="cursor-pointer hover:border-amber-500/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">個人品牌編輯</p>
                  <p className="text-xs text-muted-foreground">更新頭像、介紹、標籤</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/expert/services">
            <Card className="cursor-pointer hover:border-amber-500/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">服務項目管理</p>
                  <p className="text-xs text-muted-foreground">新增/編輯服務與定價</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/expert/calendar">
            <Card className="cursor-pointer hover:border-amber-500/40 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">行事曆管理</p>
                  <p className="text-xs text-muted-foreground">設定可預約時段</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
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
                      <Badge className={`text-xs border ${statusColor[b.status]}`}>
                        {statusLabel[b.status]}
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
