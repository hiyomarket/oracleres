import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { usePermissions, type FeatureId } from "@/hooks/usePermissions";

type NavPage = "oracle" | "lottery" | "calendar" | "stats" | "weekly" | "warRoom" | "profile";

interface SharedNavProps {
  currentPage: NavPage;
}

const NAV_ITEMS: { id: NavPage; featureId: FeatureId; path: string; icon: string; label: string }[] = [
  { id: "oracle",   featureId: "oracle",   path: "/",         icon: "☯",  label: "擲筊" },
  { id: "lottery",  featureId: "lottery",  path: "/lottery",  icon: "🎰", label: "選號" },
  { id: "calendar", featureId: "calendar", path: "/calendar", icon: "📅", label: "日曆" },
  { id: "warRoom",  featureId: "warroom",  path: "/war-room", icon: "⚔️", label: "作戰室" },
  { id: "weekly",   featureId: "weekly",   path: "/weekly",   icon: "📈", label: "週報" },
  { id: "stats",    featureId: "stats",    path: "/stats",    icon: "📊", label: "統計" },
  { id: "profile",  featureId: "profile",  path: "/profile",  icon: "🔮", label: "命格" },
];

/** 使用者頭像下拉選單 */
function UserMenu({ user }: { user: { name?: string | null; openId?: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: status } = trpc.account.getStatus.useQuery(undefined, { staleTime: 60000 });
  const { data: profile } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });
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
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-slate-800">
            <p className="text-xs font-medium text-white truncate">{displayName}</p>
            {status?.isOwner && (
              <p className="text-[10px] text-amber-400 mt-0.5">✦ 主帳號</p>
            )}
          </div>
          <div className="py-1">
            <Link
              href="/my-profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              我的命格資料
            </Link>
            {status?.isOwner && (
              <>
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
      {/* ─── 頂部導覽列（桌機 + 手機） ─── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5 backdrop-blur-md bg-[#050d14]/90">
        {/* 左側：Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group"
            title="返回首頁"
          >
            <span className="text-amber-400 text-base group-hover:scale-110 transition-transform">☯</span>
            <span
              className="font-bold tracking-widest text-sm hidden sm:block"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              天命共振
            </span>
          </button>

          {/* 當前頁面麵包屑（手機也顯示） */}
          {currentPage !== "oracle" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>/</span>
              <span className="text-slate-400">
                {NAV_ITEMS.find(n => n.id === currentPage)?.label}
              </span>
            </div>
          )}
        </div>

        {/* 中間：頁面導航（桌機顯示） */}
        <div className="hidden md:flex items-center gap-1">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${currentPage === item.id
                  ? "bg-amber-900/40 border border-amber-600/50 text-amber-300"
                  : "text-slate-400 hover:text-amber-400 hover:bg-white/5 border border-transparent"
                }
              `}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* 右側：通知 + 登入/用戶 */}
        <div className="flex items-center gap-2">
          {user && (
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
      </nav>

      {/* ─── 手機底部固定導覽列 ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050d14]/97 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="flex items-stretch justify-around">
          {visibleNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5
                  flex-1 py-2.5 min-h-[56px] transition-all active:scale-95
                  ${isActive ? "text-amber-400" : "text-slate-500"}
                `}
              >
                {/* 當前頁高亮背景 */}
                {isActive && (
                  <span className="absolute inset-x-1 top-1 bottom-1 rounded-xl bg-amber-900/25 border border-amber-700/30" />
                )}
                <span className={`relative text-[18px] leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`relative text-[10px] font-medium leading-none tracking-wide ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
