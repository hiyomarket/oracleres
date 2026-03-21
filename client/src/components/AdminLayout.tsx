/**
 * AdminLayout.tsx
 * 管理後台統一佈局
 * - 行動版：頂部 Header + 頂部水平滑動 Tab（避免 iPhone 底部手勢衝突）
 * - 桌面版：側邊欄（折疊分組：用戶管理 / 行銷工具 / 系統設定）
 */
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// 導覽分組定義
const NAV_GROUPS = [
  {
    label: "總覽",
    collapsible: false,
    items: [
      { href: "/admin/dashboard", icon: "📊", label: "儀表板", desc: "KPI 與活躍分析" },
    ],
  },
  {
    label: "用戶管理",
    collapsible: true,
    defaultOpen: true,
    items: [
      { href: "/admin/users", icon: "👤", label: "用戶管理", desc: "查看、篩選、積分" },
      { href: "/admin/user-groups", icon: "👥", label: "客群分組", desc: "分組、批量管理" },
    ],
  },
  {
    label: "行銷工具",
    collapsible: true,
    defaultOpen: false,
    items: [
      { href: "/admin/business-hub", icon: "💰", label: "商業中心", desc: "模塊、方案、行銀" },
      { href: "/admin/marketing", icon: "🎰", label: "行銷中心", desc: "娛樂城、WBC 賽事" },
      { href: "/admin/destiny-shop", icon: "🪙", label: "天命小舖", desc: "天命幣費用設定" },
      { href: "/admin/feature-store", icon: "🎪", label: "功能兌換", desc: "方案設定、訂單審核" },
      { href: "/admin/banners", icon: "📢", label: "廣告/公告", desc: "全站懸浮橫幅廣告" },
    ],
  },
  {
    label: "系統設定",
    collapsible: true,
    defaultOpen: false,
    items: [
      { href: "/admin/logic-config", icon: "⚙️", label: "邏輯計算", desc: "能量規則、手串" },
      { href: "/admin/experts", icon: "🔮", label: "專家管理", desc: "審核申請、管理訂單" },
      { href: "/admin/theme", icon: "🎨", label: "主題配色", desc: "全站色系切換" },
      { href: "/admin/access-tokens", icon: "🔑", label: "AI 渠道 Token", desc: "特殊存取權限管理" },
    ],
  },
];

// 扁平化所有項目（用於行動版 Tab）
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const [location, navigate] = useLocation();

  // 桌面側邊欄分組折疊狀態
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => {
      if (g.collapsible) {
        // 如果當前頁面在某個群組，預設展開該群組
        const hasActive = g.items.some(item =>
          location === item.href || location.startsWith(item.href + "/")
        );
        state[g.label] = hasActive || (g.defaultOpen ?? false);
      }
    });
    return state;
  });

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin" && user.role !== "viewer") {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // 切換頁面時自動滾動行動版 Tab 選中項目到可見範圍
  useEffect(() => {
    const nav = document.getElementById("admin-top-nav");
    const active = document.getElementById("admin-nav-active");
    if (nav && active) {
      const scrollLeft = active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2;
      nav.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
    }
    // 展開包含當前頁面的群組
    NAV_GROUPS.forEach(g => {
      if (g.collapsible) {
        const hasActive = g.items.some(item =>
          location === item.href || location.startsWith(item.href + "/")
        );
        if (hasActive) {
          setOpenGroups(prev => ({ ...prev, [g.label]: true }));
        }
      }
    });
  }, [location]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <div className="text-amber-400 text-lg animate-pulse">載入中...</div>
      </div>
    );
  }

  const isViewer = user?.role === "viewer";
  if (!user || (user.role !== "admin" && user.role !== "viewer")) return null;

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col" style={{ background: "var(--page-bg)" }}>
      {/* 頂部 Header */}
      <header
        className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0 sticky top-0 z-40"
        style={{ background: "var(--nav-bg)" }}
      >
        <Link href="/">
          <span className="text-amber-400 font-bold text-lg cursor-pointer hover:text-amber-300 transition-colors">
            ☯ 天命共振
          </span>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground/70 text-sm font-medium">管理後台</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-black">
            {user.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">{user.name}</span>
          {isViewer && (
            <span className="text-xs bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2 py-0.5 rounded-full hidden sm:block">
              👁️ 唯讀
            </span>
          )}
        </div>
      </header>

      {/* 行動版頂部水平 Tab（Header 下方，避免 iPhone 底部手勢衝突） */}
      <div
        className="md:hidden border-b border-border sticky top-[52px] z-30"
        style={{ background: "var(--nav-bg)" }}
      >
        <div className="relative">
          {/* 左右漸層提示 */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 z-10"
            style={{ background: "linear-gradient(to right, var(--nav-bg, #0d0d1f), transparent)" }}
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 z-10"
            style={{ background: "linear-gradient(to left, var(--nav-bg, #0d0d1f), transparent)" }}
          />
          {/* 滑動容器 */}
          <div
            id="admin-top-nav"
            className="nav-scroll-container flex overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {ALL_NAV_ITEMS.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} className="shrink-0">
                  <div
                    id={isActive ? "admin-nav-active" : undefined}
                    className={`flex flex-col items-center py-2 px-1 gap-0.5 transition-colors border-b-2 ${
                      isActive
                        ? "text-amber-400 border-amber-400"
                        : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                    style={{ minWidth: "4.5rem", width: "4.5rem" }}
                  >
                    <span className="text-xl leading-none">{item.icon}</span>
                    <span className="text-[9px] font-medium leading-tight text-center w-full truncate">
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
            {/* 返回前台 */}
            <Link href="/" className="shrink-0">
              <div
                className="flex flex-col items-center py-2 px-1 gap-0.5 transition-colors border-b-2 border-transparent text-muted-foreground/60 hover:text-muted-foreground"
                style={{ minWidth: "4.5rem", width: "4.5rem" }}
              >
                <span className="text-xl leading-none">↩</span>
                <span className="text-[9px] font-medium leading-tight text-center">返回前台</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 桌面側邊欄（折疊分組） */}
        <aside
          className="hidden md:flex flex-col w-52 shrink-0 border-r border-border py-3 px-2 gap-0.5 overflow-y-auto"
          style={{ background: "var(--nav-bg)" }}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              {/* 群組標題 */}
              {group.collapsible ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/30"
                >
                  <span>{group.label}</span>
                  {openGroups[group.label]
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />
                  }
                </button>
              ) : (
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  {group.label}
                </div>
              )}

              {/* 群組項目 */}
              {(!group.collapsible || openGroups[group.label]) && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.href || location.startsWith(item.href + "/");
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={`flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 group ${
                            isActive
                              ? "bg-amber-500/15 border border-amber-500/30"
                              : "hover:bg-muted/40 border border-transparent"
                          }`}
                        >
                          <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                          <div className="min-w-0">
                            <div
                              className={`text-sm font-medium leading-tight ${
                                isActive ? "text-amber-400" : "text-foreground/80 group-hover:text-foreground"
                              }`}
                            >
                              {item.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-tight truncate">
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
                </div>
              )}
            </div>
          ))}

          {/* 返回前台 */}
          <div className="mt-auto pt-3 border-t border-border">
            <Link href="/">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/40 transition-all group">
                <span className="text-base">↩</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  返回前台
                </span>
              </div>
            </Link>
          </div>
        </aside>

        {/* 主內容區（行動版不需要底部 padding，因為 Tab 在頂部） */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
