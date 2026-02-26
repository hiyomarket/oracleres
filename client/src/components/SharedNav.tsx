import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown, Smartphone, LayoutDashboard, Star, Coins, Gift } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

type NavPage = string;

interface SharedNavProps {
  currentPage: NavPage;
}

// 靜態備援（API 載入前避免閃爍）
const FALLBACK_NAV = [
  { id: "module_profile",  navPath: "/profile",  icon: "🔮", name: "命格",    hasAccess: true },
  { id: "module_oracle",   navPath: "/oracle",   icon: "☯️", name: "擲筊",    hasAccess: true },
  { id: "module_lottery",  navPath: "/lottery",  icon: "🎰", name: "選號",    hasAccess: true },
  { id: "module_calendar", navPath: "/calendar", icon: "📅", name: "日曆",    hasAccess: true },
  { id: "module_warroom",  navPath: "/",         icon: "⚔️", name: "每日運勢", hasAccess: true, isCentral: true },
  { id: "module_outfit",   navPath: "/outfit",   icon: "👗", name: "補運穿搭", hasAccess: true },
  { id: "module_diet",     navPath: "/diet",     icon: "🍽️", name: "飲食羅盤", hasAccess: true },
];

/** 兌換碼輸入元件（嵌入下拉選單中） */
function RedeemCodeEntry({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [expanded, setExpanded] = useState(false);
  const redeemMutation = trpc.businessHub.redeemCode.useMutation({
    onSuccess: (data) => {
      toast.success(`🎁 兌換成功！${data.reward}`);
      setCode("");
      setExpanded(false);
      onClose();
    },
    onError: (err) => {
      toast.error(`兌換失敗：${err.message}`);
    },
  });

  const handleRedeem = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    redeemMutation.mutate({ code: trimmed });
  };

  return (
    <div className="mx-3 my-1">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 rounded-xl transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
          </div>
          輸入兌換碼
        </button>
      ) : (
        <div className="bg-slate-800/60 rounded-xl p-3 border border-amber-500/20">
          <p className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-1">
            <Gift className="w-3 h-3" /> 兌換碼
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleRedeem()}
              placeholder="輸入兌換碼..."
              className="flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500/50 font-mono tracking-wider"
            />
            <button
              onClick={handleRedeem}
              disabled={redeemMutation.isPending || !code.trim()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-black text-xs font-bold rounded-lg transition-colors"
            >
              {redeemMutation.isPending ? "..." : "兌換"}
            </button>
          </div>
          <button
            onClick={() => { setExpanded(false); setCode(""); }}
            className="mt-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}

/** 使用者頭像下拉選單 */
function UserMenu({ user }: { user: { name?: string | null; openId?: string; planName?: string | null } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: status } = trpc.account.getStatus.useQuery(undefined, { staleTime: 60000 });
  const { data: profile } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });
  const { data: pointsData } = trpc.points.getBalance.useQuery(undefined, { staleTime: 30000 });
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


  const points = pointsData?.balance ?? 0;

  return (
    <div ref={ref} className="relative">
      {/* 觸發按鈕 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 hover:bg-slate-800/60 rounded-xl px-2 py-1.5 transition-colors group"
      >
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-900/60 to-amber-700/30 border border-amber-600/50 flex items-center justify-center text-xs font-bold text-amber-300">
            {displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          {status?.isOwner && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-[#0a0a0f] flex items-center justify-center">
              <Star className="w-1.5 h-1.5 text-black" fill="black" />
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400 hidden sm:block max-w-[80px] truncate group-hover:text-slate-200 transition-colors">{displayName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#0f1117] border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">

          {/* 用戶資訊區塊 */}
          <div className="px-4 py-3 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-b border-slate-700/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-800/60 to-amber-600/30 border border-amber-600/40 flex items-center justify-center text-sm font-bold text-amber-300 shrink-0">
                {displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                {status?.isOwner ? (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />
                    主帳號
                  </p>
                ) : (
                  <p className="text-[10px] mt-0.5" style={{ color: user.planName ? '#f59e0b' : undefined, opacity: user.planName ? 1 : 0.5 }}>
                    {user.planName ?? "一般會員"}
                  </p>
                )}
              </div>
              {/* 積分顯示 */}
              {points > 0 && (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 shrink-0">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{points}</span>
                </div>
              )}
            </div>
          </div>

          <div className="py-1.5">

            {/* 非主帳號：我的命格資料 */}
            {!status?.isOwner && (
              <Link
                href="/my-profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                </div>
                我的命格資料
              </Link>
            )}

            {/* 加入手機主畫面 */}
            <Link
              href="/add-to-home"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              </div>
              加入手機主畫面
            </Link>

            {/* 主帳號專屬管理區 */}
            {status?.isOwner && (
              <>
                <div className="mx-4 my-1.5 border-t border-slate-700/50" />
                <p className="px-4 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">管理區</p>

                {/* 管理員儀表板 */}
                <Link
                  href="/admin/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 transition-colors group/item"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 group-hover/item:bg-amber-500/25 transition-colors">
                    <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <span>管理員儀表板</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">新</span>
                  </div>
                </Link>


              </>
            )}

            {/* 兌換碼入口 */}
            <RedeemCodeEntry onClose={() => setOpen(false)} />

            {/* 登出 */}
            <div className="mx-4 my-1.5 border-t border-slate-700/50" />
            <button
              onClick={() => logoutMutation.mutate()}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </div>
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
  const { isAdmin } = usePermissions();
  const notifyMutation = trpc.oracle.notifyDailyEnergy.useMutation({
    onSuccess: () => toast.success("今日能量通知已發送！"),
    onError: () => toast.error("通知發送失敗，請稍後再試。"),
  });

  // 取得用戶完整資訊（包含 planName）
  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60000 });

  // 動態導航：從後端取模塊列表（包含 hasAccess 權限判斷）
  const { data: navModules, isLoading: navLoading } = trpc.businessHub.getVisibleNav.useQuery(
    undefined,
    { staleTime: 30000, retry: 1, enabled: !!user }
  );

  // 只顯示有 navPath 的模塊（空白 navPath = 不在主導航顯示）
  const visibleNavItems = navLoading || !navModules
    ? FALLBACK_NAV
    : navModules.filter(m => m.navPath && m.navPath.length > 0);

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
                {visibleNavItems.find(n => (n as { navPath: string }).navPath === location.pathname || n.id === currentPage)
                  ? ((visibleNavItems.find(n => (n as { navPath: string }).navPath === location.pathname || n.id === currentPage) as { name?: string; label?: string }).name ?? currentPage)
                  : currentPage}
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
              <UserMenu user={{ ...user, planName: (meData as { planName?: string | null } | null)?.planName ?? null }} />
            )}
          </div>
        </div>

        {/* 第二行：功能導覽列（桌機 + 手機，統一在頂部，支援左右滑動） */}
        <div className="border-t border-white/5">
          {/* 桌機：居中顯示 */}
          <div className="hidden md:flex items-center justify-center overflow-x-auto scrollbar-none gap-1 px-4 py-1.5">
            {visibleNavItems.map((item) => {
              const navPath = (item as { navPath: string }).navPath ?? (item as { path?: string }).path ?? "/";
              const label = (item as { name?: string; label?: string }).name ?? (item as { label?: string }).label ?? "";
              const locked = !item.hasAccess;
              const isActive = navPath === "/" ? currentPage === "warRoom" || currentPage === "" : location.pathname === navPath;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (locked) { toast.error("此功能需要升級方案才能使用"); return; }
                    navigate(navPath);
                  }}
                  title={locked ? "鎖定—需要升級方案" : label}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0
                    ${locked
                      ? "text-slate-600 border border-transparent cursor-not-allowed opacity-50"
                      : isActive
                        ? "bg-amber-900/40 border border-amber-600/50 text-amber-300"
                        : "text-slate-400 hover:text-amber-400 hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <span className="text-[28px] leading-none">{item.icon ?? "🔒"}</span>
                  <span>{label}</span>
                  {locked && <span className="text-[10px] ml-0.5">🔒</span>}
                </button>
              );
            })}
          </div>

          {/* 手機：居中顯示，支援左右滑動 */}
          <div
            className="md:hidden flex items-center justify-center overflow-x-auto scrollbar-none px-2 py-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* 使用 inline-flex 讓項目可以超出容器觸發滑動，同時 justify-center 讓少量項目居中 */}
            <div className="flex items-center gap-1 min-w-max mx-auto">
              {visibleNavItems.map((item) => {
                const navPath = (item as { navPath: string }).navPath ?? "/";
                const label = (item as { name?: string; label?: string }).name ?? (item as { label?: string }).label ?? "";
                const locked = !item.hasAccess;
                const isActive = navPath === "/" ? currentPage === "warRoom" || currentPage === "" : location.pathname === navPath;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (locked) { toast.error("此功能需要升級方案才能使用"); return; }
                      navigate(navPath);
                    }}
                    className={`
                      relative flex flex-col items-center justify-center gap-1
                      shrink-0 px-3 py-2 min-w-[64px] rounded-xl transition-all active:scale-95
                      ${locked
                        ? "opacity-40 cursor-not-allowed border border-transparent"
                        : isActive
                          ? "bg-amber-900/25 border border-amber-700/30 text-amber-400"
                          : "text-slate-500 border border-transparent"
                      }
                    `}
                  >
                    <span className={`text-[44px] leading-none transition-transform ${isActive ? 'scale-105' : ''}`}>
                      {item.icon ?? "🔒"}
                    </span>
                    <span className={`text-[10px] font-medium leading-none tracking-wide ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                      {label}{locked ? "🔒" : ""}
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
