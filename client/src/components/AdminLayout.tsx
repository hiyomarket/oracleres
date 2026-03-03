/**
 * AdminLayout.tsx
 * 管理後台統一側邊欄佈局
 * - 導覽連結：儀表板 / 用戶管理 / 商業中心
 * - 響應式：桌面側邊欄 + 行動版頂部 Tab
 */
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: "/admin/dashboard",
    icon: "📊",
    label: "儀表板",
    desc: "KPI 與活躍分析",
  },
  {
    href: "/admin/users",
    icon: "👤",
    label: "用戶管理",
    desc: "查看、篩選、積分",
  },
  {
    href: "/admin/user-groups",
    icon: "👥",
    label: "客群分組",
    desc: "分組、批量管理",
  },
  {
    href: "/admin/business-hub",
    icon: "💰",
    label: "商業中心",
    desc: "模塊、方案、行銀",
  },
  {
    href: "/admin/logic-config",
    icon: "⚙️",
    label: "管理邏輯計算",
    desc: "能量規則、手串、餐廳分類",
  },
  {
    href: "/admin/marketing",
    icon: "🎰",
    label: "行銷中心",
    desc: "娛樂城、WBC 賽事管理",
  },
  {
    href: "/admin/feature-store",
    icon: "🎪",
    label: "功能兌換中心",
    desc: "方案設定、訂單審核",
  },
  {
    href: "/admin/banners",
    icon: "📢",
    label: "廣告/公告管理",
    desc: "全站懸浮橫幅廣告",
  },
  {
    href: "/admin/experts",
    icon: "🔮",
    label: "專家管理",
    desc: "審核申請、管理訂單",
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const [location, navigate] = useLocation();

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

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">
      {/* 頂部 Header */}
      <header className="border-b border-slate-800 bg-[#0d1220] px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/">
          <span className="text-amber-400 font-bold text-lg cursor-pointer hover:text-amber-300 transition-colors">
            ☯ 天命共振
          </span>
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300 text-sm font-medium">管理後台</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black">
            {user.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">{user.name}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 桌面側邊欄 */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-slate-800 bg-[#0d1220] py-4 px-3 gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group ${
                    isActive
                      ? "bg-amber-500/15 border border-amber-500/30"
                      : "hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <span className="text-lg mt-0.5 shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium leading-tight ${
                        isActive ? "text-amber-400" : "text-slate-200 group-hover:text-white"
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-tight truncate">
                      {item.desc}
                    </div>
                  </div>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  )}
                </div>
              </Link>
            );
          })}

          {/* 返回前台 */}
          <div className="mt-auto pt-4 border-t border-slate-800">
            <Link href="/">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/60 transition-all group">
                <span className="text-base">↩</span>
                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                  返回前台
                </span>
              </div>
            </Link>
          </div>
        </aside>

        {/* 行動版底部 Tab */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d1220] border-t border-slate-800 flex">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div
                  className={`flex flex-col items-center py-2 gap-0.5 transition-colors ${
                    isActive ? "text-amber-400" : "text-slate-500"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 主內容區 */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
