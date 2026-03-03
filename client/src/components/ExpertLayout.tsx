/**
 * ExpertLayout - 專家後台路由守衛 + 側邊欄佈局
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
  MessageSquare,
  ChevronRight,
  Star,
  LogOut,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/expert/dashboard", label: "儀表盤", icon: LayoutDashboard },
  { path: "/expert/profile", label: "個人品牌", icon: User },
  { path: "/expert/services", label: "服務項目", icon: Briefcase },
  { path: "/expert/calendar", label: "行事曆", icon: Calendar },
  { path: "/expert/bookings", label: "訂單管理", icon: Star },
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

  return (
    <div className="min-h-screen bg-background flex">
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
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
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

      {/* 主內容區 */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
