/**
 * ExpertLayout - 專家後台路由守衛 + 響應式佈局
 * - 桌機：左側側欄（w-56）
 * - 手機：頂部標題列 + 底部導覽列（全寬主內容）
 * 只有 role='expert' 或 role='admin' 的用戶才能進入
 */
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  User,
  Briefcase,
  Calendar,
  Star,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/expert/dashboard", label: "儀表盤", icon: LayoutDashboard },
  { path: "/expert/profile",   label: "個人品牌", icon: User },
  { path: "/expert/services",  label: "服務項目", icon: Briefcase },
  { path: "/expert/calendar",  label: "行事曆",   icon: Calendar },
  { path: "/expert/bookings",  label: "訂單管理", icon: Star },
];

interface ExpertLayoutProps {
  children: React.ReactNode;
}

export function ExpertLayout({ children }: ExpertLayoutProps) {
  const [location, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "expert" && user.role !== "admin"))) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">驗證身份中…</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "expert" && user.role !== "admin")) {
    return null;
  }

  const currentLabel = NAV_ITEMS.find(
    (n) => location === n.path || location.startsWith(n.path + "/")
  )?.label ?? "後台";

  return (
    <div className="min-h-screen bg-background">
      {/* ─── 桌機版：側欄 + 主內容並排 ─── */}
      <div className="hidden md:flex min-h-screen">
        {/* 側邊欄 */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-card/50 flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-400">天命聯盟</p>
                <p className="text-xs text-muted-foreground">專家後台</p>
              </div>
            </div>
          </div>

          {/* 導航 */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || location.startsWith(item.path + "/");
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                      isActive
                        ? "bg-amber-500/15 text-amber-400 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* 底部 */}
          <div className="p-3 border-t border-border space-y-1">
            <Link href="/">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
                <Home className="w-4 h-4" />
                <span>返回前台</span>
              </div>
            </Link>
            {user.role === "admin" && (
              <Link href="/admin/dashboard">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>管理後台</span>
                </div>
              </Link>
            )}
          </div>
        </aside>

        {/* 主內容 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* ─── 手機版：頂部標題列 + 全寬主內容 + 底部導覽列 ─── */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* 頂部標題列 */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-400">天命聯盟</span>
              <span className="text-slate-600 text-xs">/</span>
              <span className="text-xs text-slate-300 font-medium">{currentLabel}</span>
            </div>
          </div>
          <Link href="/">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10">
              <Home className="w-3.5 h-3.5" />
              <span>前台</span>
            </div>
          </Link>
        </header>

        {/* 主內容（底部留出導覽列高度） */}
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>

        {/* 底部導覽列 */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
          <div className="flex items-stretch">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || location.startsWith(item.path + "/");
              return (
                <Link key={item.path} href={item.path} className="flex-1">
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-colors",
                      isActive
                        ? "text-amber-400"
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {/* 活躍指示條 */}
                    {isActive && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400" />
                    )}
                    <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]")} />
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {/* iOS 安全區域 */}
          <div className="h-safe-area-inset-bottom" style={{ height: "env(safe-area-inset-bottom)" }} />
        </nav>
      </div>
    </div>
  );
}
