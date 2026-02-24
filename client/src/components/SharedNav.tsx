import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown, ShieldCheck, BarChart2, Ticket, Smartphone } from "lucide-react";
import { usePermissions, type FeatureId } from "@/hooks/usePermissions";

type NavPage = "oracle" | "lottery" | "calendar" | "stats" | "weekly" | "warRoom" | "profile";

interface SharedNavProps {
  currentPage: NavPage;
}

// 主導覽列項目（週報/統計已移至個人下拉選單）
const NAV_ITEMS: { id: NavPage; featureId: FeatureId; path: string; icon: string; label: string }[] = [
  { id: "profile",  featureId: "profile",  path: "/profile",  icon: "🔮", label: "命格" },
  { id: "oracle",   featureId: "oracle",   path: "/oracle",   icon: "☯",  label: "擲筊" },
  { id: "lottery",  featureId: "lottery",  path: "/lottery",  icon: "🎰", label: "選號" },
  { id: "calendar", featureId: "calendar", path: "/calendar", icon: "📅", label: "日曆" },
  { id: "warRoom",  featureId: "warroom",  path: "/",         icon: "⚔️", label: "每日運勢" },
];

/** 使用者頭像下拉選單 */
function UserMenu({ user }: { user: { name?: string | null; openId?: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: status } = trpc.account.getStatus.useQuery(undefined, { staleTime: 60000 });
  const { data: profile } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });
  const { hasFeature } = usePermissions();
  const displayName = profile?.displayName || user.name;
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canSeeWeekly = status?.isOwner || hasFeature("weekly");
  const canSeeStats  = status?.isOwner || hasFeature("stats");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 hover:bg-slate-800/60 rounded-xl px-2 py-1 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-amber-900/40 border border-amber-600/40 flex items-center justify-center text-xs text-amber-400">
          {displayName?.[0] ?? "?"}
        </div>
        <span className="text-xs text-slate-400 hidden sm:block max-w-[80px] truncate">{displayName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden z-50">
          {/* 用戶資訊 */}
          <div className="px-3 py-2.5 border-b border-slate-800">
            <p className="text-xs font-medium text-white truncate">{displayName}</p>
            {status?.isOwner && (
              <p className="text-[10px] text-amber-400 mt-0.5">✦ 主帳號</p>
            )}
          </div>

          <div className="py-1">
            {/* 非主帳號：我的命格資料 */}
            {!status?.isOwner && (
              <Link
                href="/my-profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                我的命格資料
              </Link>
            )}

            {/* 刮刮樂驗證（原：週報） */}
            {canSeeWeekly && (
              <Link
                href="/weekly"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                刮刮樂驗證
              </Link>
            )}

            {/* 擲筊分析（原：統計） */}
            {canSeeStats && (
              <Link
                href="/stats"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
                擲筊分析
              </Link>
            )}

            {/* 加入主畫面教學 */}
            <Link
              href="/add-to-home"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              加入手機主畫面
            </Link>

            {/* 主帳號專屬 */}
            {status?.isOwner && (
              <>
                <div className="mx-3 my-1 border-t border-slate-800" />
                <Link
                  href="/account-manager"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-purple-400" />
                  帳號管理
                </Link>
                <Link
                  href="/permission-manager"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                  功能權限管理
                </Link>
              </>
            )}

            {/* 登出 */}
            <div className="mx-3 my-1 border-t border-slate-800" />
            <button
              onClick={() => logoutMutation.mutate()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              登出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SharedNav({ currentPage }: SharedNavProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { hasFeature, isAdmin, isLoading: permLoading } = usePermissions();
  const notifyMutation = trpc.oracle.notifyDailyEnergy.useMutation({
    onSuccess: () => toast.success("今日能量通知已發送！"),
    onError: () => toast.error("通知發送失敗，請稍後再試。"),
  });

  // 過濾出有權限的導覽項目（admin 顯示全部；載入中也顯示全部避免閃爍）
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (permLoading || isAdmin) return true;
    return hasFeature(item.featureId);
  });

  return (
    <>
      {/* ─── 頂部導覽列（桌機 + 手機）：Logo + 右側用戶 ─── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#050d14]/90">
        {/* 第一行：Logo + 用戶 */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* 左側：Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 group"
              title="返回首頁"
            >
              <span className="text-amber-400 text-base group-hover:scale-110 transition-transform">☯</span>
              <span
                className="font-bold tracking-widest text-sm"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                天命共振
              </span>
            </button>

            {/* 當前頁面麵包屑 */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>/</span>
              <span className="text-slate-400">
                {NAV_ITEMS.find(n => n.id === currentPage)?.label ?? currentPage}
              </span>
            </div>
          </div>

          {/* 右側：通知 + 登入/用戶 */}
          <div className="flex items-center gap-2 shrink-0">
            {user && isAdmin && (
              <button
                onClick={() => notifyMutation.mutate()}
                disabled={notifyMutation.isPending}
                className="text-xs text-slate-400 hover:text-amber-400 transition-colors p-1.5 rounded-lg border border-transparent hover:border-amber-600/30"
                title="推送今日能量通知"
              >
                📬
              </button>
            )}
            {!user ? (
              <a
                href={getLoginUrl()}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  color: "#000",
                }}
              >
                登入
              </a>
            ) : (
              <UserMenu user={user} />
            )}
          </div>
        </div>

        {/* 第二行：功能導覽列（桌機 + 手機，統一在頂部，支援左右滑動） */}
        <div className="border-t border-white/5">
          {/* 桌機：居中顯示 */}
          <div className="hidden md:flex items-center justify-center overflow-x-auto scrollbar-none gap-1 px-4 py-1.5">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0
                  ${currentPage === item.id
                    ? "bg-amber-900/40 border border-amber-600/50 text-amber-300"
                    : "text-slate-400 hover:text-amber-400 hover:bg-white/5 border border-transparent"
                  }
                `}
              >
                {/* 圖示放大 1 倍（原 14px → 28px） */}
                <span className="text-[28px] leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* 手機：居中顯示，支援左右滑動 */}
          <div
            className="md:hidden flex items-center justify-center overflow-x-auto scrollbar-none px-2 py-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* 使用 inline-flex 讓項目可以超出容器觸發滑動，同時 justify-center 讓少量項目居中 */}
            <div className="flex items-center gap-1 min-w-max mx-auto">
              {visibleNavItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`
                      relative flex flex-col items-center justify-center gap-1
                      shrink-0 px-3 py-2 min-w-[64px] rounded-xl transition-all active:scale-95
                      ${isActive
                        ? "bg-amber-900/25 border border-amber-700/30 text-amber-400"
                        : "text-slate-500 border border-transparent"
                      }
                    `}
                  >
                    {/* 圖示放大 1 倍（原 22px → 44px） */}
                    <span className={`text-[44px] leading-none transition-transform ${isActive ? 'scale-105' : ''}`}>
                      {item.icon}
                    </span>
                    <span className={`text-[10px] font-medium leading-none tracking-wide ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
