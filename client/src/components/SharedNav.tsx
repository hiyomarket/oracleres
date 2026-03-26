import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown, Smartphone, LayoutDashboard, Star, Coins, Gift, ShoppingBag, Calendar, MessageSquare, Send, X } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import GameTransition from "@/components/GameTransition";

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

/** 頂部天命幣 + 遇戲幣顯示徽章 */
function PointsBadge() {
  const { data: coinsData } = trpc.coins.getBalance.useQuery(undefined, { staleTime: 30000 });
  const { data: balanceData } = trpc.exchange.getBalance.useQuery(undefined, { staleTime: 30000 });
  const destinyCoins = coinsData?.balance ?? 0;
  const gameCoins = balanceData?.gameCoins ?? 0;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div
        className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 cursor-default"
        title={`天命幣：${destinyCoins} 枚`}
      >
        <span className="text-xs">🪙</span>
        <span className="text-xs font-bold text-amber-300">{destinyCoins.toLocaleString()}</span>
      </div>
      {gameCoins > 0 && (
        <div
          className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/30 rounded-lg px-2.5 py-1.5 cursor-default"
          title={`遊戲幣：${gameCoins} 枚`}
        >
          <span className="text-xs">🎮</span>
          <span className="text-xs font-bold text-purple-300">{gameCoins.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

/** 簽到日曆小面板（嵌入下拉選單） */
function CheckInCalendarPanel({ onClose }: { onClose: () => void }) {
  const { data: calendarData } = trpc.points.getMonthlyCalendar.useQuery(undefined, {
    staleTime: 0,
    refetchOnMount: true,
  });
  if (!calendarData) return <div className="px-4 py-3 text-xs text-slate-500">載入中...</div>;
  const { signedDays, streak, totalThisMonth, year, month } = calendarData;
  const signedSet = new Set(signedDays);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const todayTW = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todayStr = `${todayTW.getUTCFullYear()}-${String(todayTW.getUTCMonth()+1).padStart(2,'0')}-${String(todayTW.getUTCDate()).padStart(2,'0')}`;
  const tierLabel = streak >= 20 ? '🥇 黃金' : streak >= 6 ? '🥈 白銀' : '🥉 青銅';
  const tierColor = streak >= 20 ? 'text-yellow-300' : streak >= 6 ? 'text-gray-300' : 'text-orange-400';
  return (
    <div className="px-3 pb-3">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-orange-300">{year}年 {monthNames[month-1]}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`font-bold ${tierColor}`}>{tierLabel}</span>
          <span className="text-slate-400">連續 <span className="text-orange-300 font-bold">{streak}</span> 天</span>
          <span className="text-slate-400">本月 <span className="text-green-300 font-bold">{totalThisMonth}</span> 天</span>
        </div>
      </div>
      {/* 星期標題 */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {['日','一','二','三','四','五','六'].map(d => (
          <div key={d} className="text-center text-[9px] text-slate-600 py-0.5">{d}</div>
        ))}
      </div>
      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSigned = signedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={day}
              className={`relative aspect-square rounded flex items-center justify-center text-[9px] font-medium ${
                isSigned
                  ? 'bg-orange-500/30 border border-orange-400/60 text-orange-200'
                  : isToday
                    ? 'bg-slate-700/60 border border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800/40 border border-slate-700/30 text-slate-600'
              }`}
            >
              {day}
              {isSigned && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
      {/* 圖例 */}
      <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-600">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-orange-500/30 border border-orange-400/60" />
          <span>已簽到</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-slate-700/60 border border-cyan-500/50" />
          <span>今日</span>
        </div>
      </div>
    </div>
  );
}

/** 通知鈴鐺元件 */
function NotificationBell() {
  const [, navigate] = useLocation();
  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    staleTime: 30000,
    refetchInterval: 60000, // 每分鐘自動更新
  });
  const count = unreadData?.count ?? 0;
  return (
    <button
      onClick={() => navigate("/notifications")}
      className="relative p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition-colors"
      title="通知中心"
    >
      <span className="text-base">🔔</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 border border-background flex items-center justify-center text-[9px] font-bold text-white px-0.5">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/** 天命管理團隊傳訊對話框 */
function TeamMessageDialog({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const { data: conversation = [], refetch } = trpc.expert.getTeamConversation.useQuery();
  const sendMutation = trpc.expert.sendTeamMessage.useMutation({
    onSuccess: () => { setInput(""); refetch(); },
    onError: (e) => toast.error("發送失敗: " + e.message),
  });
  const markReadMutation = trpc.expert.markTeamMessagesRead.useMutation();
  useEffect(() => {
    markReadMutation.mutate();
  }, []);
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-sm">✨</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">天命管理團隊</div>
              <div className="text-[10px] text-slate-500">訊息保存 3 天，將於到期後自動清除</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* 對話記錄 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {conversation.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm text-slate-500">還沒有訊息，傳送您的第一則訊息給團隊吧！</p>
            </div>
          ) : (
            conversation.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.direction === "user_to_team" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.direction === "team_to_user" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center mr-2 shrink-0 self-end">
                    <span className="text-xs">✨</span>
                  </div>
                )}
                <div className={`max-w-[75%] ${
                  msg.direction === "user_to_team"
                    ? "bg-amber-600/20 border border-amber-500/20 rounded-2xl rounded-br-sm"
                    : "bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm"
                } px-3 py-2`}>
                  {msg.direction === "team_to_user" && (
                    <div className="text-[10px] text-amber-400 font-semibold mb-1">天命管理團隊</div>
                  )}
                  <p className="text-sm text-slate-200">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-slate-600">{new Date(msg.createdAt).toLocaleString()}</span>
                    {msg.direction === "user_to_team" && (
                      <span className="text-[10px] text-slate-600">{msg.isRead ? "已讀" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* 輸入框 */}
        <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                  e.preventDefault();
                  sendMutation.mutate({ content: input.trim() });
                }
              }}
              placeholder="傳訊給天命管理團隊..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500/50"
            />
            <button
              onClick={() => input.trim() && sendMutation.mutate({ content: input.trim() })}
              disabled={!input.trim() || sendMutation.isPending}
              className="w-9 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-black" />
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5">回覆將以「天命管理團隊」身份顯示，訊息保存 3 天</p>
        </div>
      </div>
    </div>
  );
}

/** 使用者頭像下拉選單 */
function UserMenu({ user }: { user: { name?: string | null; openId?: string; planName?: string | null; role?: string | null } }) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTeamMsg, setShowTeamMsg] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: status } = trpc.account.getStatus.useQuery(undefined, { staleTime: 60000 });
  const { data: profile } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });
  const { data: pointsData } = trpc.points.getBalance.useQuery(undefined, { staleTime: 30000 });
  const { data: exchangeData } = trpc.exchange.getBalance.useQuery(undefined, { staleTime: 30000 });
  const { data: navModulesForProfile } = trpc.businessHub.getVisibleNav.useQuery(undefined, { staleTime: 30000 });
  const { hasFeature } = usePermissions();
  const displayName = profile?.displayName || user.name;

  // 個人選單模塊（displayLocation = 'profile' 或 'both'）
  const profileNavItems = (navModulesForProfile ?? []).filter(m => {
    if (!m.navPath || m.navPath.length === 0) return false;
    const loc = (m as any).displayLocation || "main";
    return loc === "profile" || loc === "both";
  });
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
  const gameCoins = exchangeData?.gameCoins ?? 0;

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
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-background flex items-center justify-center">
              <Star className="w-1.5 h-1.5 text-black" fill="black" />
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400 hidden sm:block max-w-[80px] truncate group-hover:text-slate-200 transition-colors">{displayName}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">

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
              {/* 積分 + 遊戲幣顯示 */}
              <div className="flex flex-col gap-1 shrink-0">
                {points > 0 && (
                  <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">{points}</span>
                  </div>
                )}
                {gameCoins > 0 && (
                  <div className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2 py-1">
                    <span className="text-[10px]">🎮</span>
                    <span className="text-xs font-bold text-purple-400">{gameCoins}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="py-1.5">

            {/* 我的命格資料（所有用戶，包含主帳號）*/}
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

            {/* 天命小舖 */}
            <Link
              href="/feature-store"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 transition-colors group/item"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 group-hover/item:bg-amber-500/25 transition-colors">
                <span className="text-sm">🪙</span>
              </div>
              <div className="flex-1">
                <span>天命小舖</span>
                {user.planName ? (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">{user.planName}</span>
                ) : (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/30">升級方案</span>
                )}
              </div>
            </Link>

            {/* 天命聯盟（專家市集）- 所有用戶可瀏覽 */}
            <Link
              href="/experts"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-purple-500/10 hover:text-purple-300 transition-colors group/item"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 group-hover/item:bg-purple-500/25 transition-colors">
                <span className="text-sm">🔮</span>
              </div>
              <span>天命聯盟</span>
            </Link>
            {/* 我的預約 - 所有已登入用戶 */}
            <Link
              href="/my-bookings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-purple-500/10 hover:text-purple-300 transition-colors group/item"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0 group-hover/item:bg-purple-500/25 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span>我的預約</span>
            </Link>
            {/* 傳訊給團隊 - 所有已登入用戶 */}
            <button
              onClick={() => { setOpen(false); setShowTeamMsg(true); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-teal-500/10 hover:text-teal-300 transition-colors group/item"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0 group-hover/item:bg-teal-500/25 transition-colors">
                <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="flex flex-col items-start">
                <span>傳訊給團隊</span>
                <span className="text-[10px] text-teal-400/70">聯繫天命管理團隊</span>
              </div>
            </button>
            {/* 專家後台 - 只有 expert 或 admin 才顯示 */}
            {(user.role === 'expert' || user.role === 'admin') && (
              <Link
                href="/expert/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 transition-colors group/item"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 group-hover/item:bg-amber-500/25 transition-colors">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <span>天命聯盟專家後台</span>
                  <span className="text-[10px] text-amber-400/70">訂單管理、個人品牌、行事曆</span>
                </div>
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

                {/* 功能兌換中心管理 */}
                <Link
                  href="/admin/feature-store"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 transition-colors group/item"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 group-hover/item:bg-amber-500/25 transition-colors">
                    <span className="text-sm">🎪</span>
                  </div>
                  <span>功能兌換中心管理</span>
                </Link>


              </>
            )}

            {/* 個人選單模塊（displayLocation = profile 或 both） */}
            {profileNavItems.length > 0 && (
              <>
                <div className="mx-4 my-1.5 border-t border-slate-700/50" />
                <p className="px-4 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">功能</p>
                {profileNavItems.map(m => (
                  <Link
                    key={m.id}
                    href={m.navPath!}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0 text-sm">
                      {m.icon || '🔧'}
                    </div>
                    <span>{m.name}</span>
                    {!m.hasAccess && (
                      <span className="ml-auto text-[10px] text-slate-500 border border-slate-600/40 rounded px-1">需升級</span>
                    )}
                  </Link>
                ))}
              </>
            )}

            {/* 簽到日曆入口 */}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-orange-500/10 hover:text-orange-300 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                <span className="text-xs">📅</span>
              </div>
              <span className="flex-1 text-left">簽到日曆</span>
              <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${showCalendar ? "rotate-180" : ""}`} />
            </button>
            {showCalendar && (
              <div className="mx-2 mb-1 bg-slate-800/60 rounded-xl border border-orange-500/20 overflow-hidden">
                <CheckInCalendarPanel onClose={() => setShowCalendar(false)} />
              </div>
            )}

            {/* 兑換碼入口 */}
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
      {/* 天命管理團隊傳訊對話框 */}
      {showTeamMsg && <TeamMessageDialog onClose={() => setShowTeamMsg(false)} />}
    </div>
  );
}
export function SharedNav({ currentPage }: SharedNavProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [desktopCanScrollLeft, setDesktopCanScrollLeft] = useState(false);
  const [desktopCanScrollRight, setDesktopCanScrollRight] = useState(false);
  const [mobileCanScrollLeft, setMobileCanScrollLeft] = useState(false);
  const [mobileCanScrollRight, setMobileCanScrollRight] = useState(false);
  // 靈虛入口下拉選單
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const gameMenuRef = useRef<HTMLDivElement>(null);
  // 過場動畫
  const [showTransition, setShowTransition] = useState(false);

  // 點擊外部關閉靈虛選單
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gameMenuRef.current && !gameMenuRef.current.contains(e.target as Node)) {
        setGameMenuOpen(false);
      }
    };
    if (gameMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gameMenuOpen]);
  const notifyMutation = trpc.oracle.notifyDailyEnergy.useMutation({
    onSuccess: () => toast.success("今日能量通知已發送！"),
    onError: () => toast.error("通知發送失敗，請稍後再試。"),
  });

  // 取得玩家命盤主元素（用於過場動畫個人化）
  const { data: agentStatusData } = trpc.gameWorld.getAgentStatus.useQuery(undefined, {
    staleTime: 120000,
    enabled: !!user,
  });
  const playerElement = agentStatusData?.agent?.dominantElement ?? "metal";

  // 取得用戶完整資訊（包含 planName）
  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60000 });

  // 動態導航：從後端取模塊列表（包含 hasAccess 權限判斷）
  const { data: navModules, isLoading: navLoading } = trpc.businessHub.getVisibleNav.useQuery(
    undefined,
    { staleTime: 30000, retry: 1, enabled: !!user }
  );

  // 只顯示有 navPath 的模塊（空白 navPath = 不在主導航顯示）
  // displayLocation = 'main' 或 'both' 才顯示在主功能列
  const visibleNavItems = navLoading || !navModules
    ? FALLBACK_NAV
    : navModules.filter(m => {
        if (!m.navPath || m.navPath.length === 0) return false;
        const loc = (m as any).displayLocation || "main";
        return loc === "main" || loc === "both";
      });

  // 個人下拉選單模塊（displayLocation = 'profile' 或 'both'）
  const profileNavItems = navLoading || !navModules
    ? []
    : navModules.filter(m => {
        if (!m.navPath || m.navPath.length === 0) return false;
        const loc = (m as any).displayLocation || "main";
        return loc === "profile" || loc === "both";
      });

  // 檢查捲動狀態（是否可以向左/右捲動）
  const checkScrollState = (el: HTMLDivElement, setLeft: (v: boolean) => void, setRight: (v: boolean) => void) => {
    setLeft(el.scrollLeft > 4);
    setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // 初始化時自動捧動到當前活躍項目（只在導航項目載入完成後執行一次，不跟用戶手動滞動競爭）
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (navLoading) return; // 等導航資料載入完成
    if (hasScrolledRef.current) return; // 只執行一次
    const scrollToActive = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return;
      const el = ref.current;
      const activeBtn = el.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        const btnLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        const containerWidth = el.clientWidth;
        // 使用 instant 避免 smooth 動畫與用戶手動滞動衝突
        el.scrollTo({ left: btnLeft - containerWidth / 2 + btnWidth / 2, behavior: 'instant' as ScrollBehavior });
      }
      checkScrollState(el, ref === desktopNavRef ? setDesktopCanScrollLeft : setMobileCanScrollLeft, ref === desktopNavRef ? setDesktopCanScrollRight : setMobileCanScrollRight);
    };
    const timer = setTimeout(() => {
      scrollToActive(desktopNavRef);
      scrollToActive(mobileNavRef);
      hasScrolledRef.current = true;
    }, 150);
    return () => clearTimeout(timer);
  }, [visibleNavItems, navLoading]);

  return (
    <>
      {/* ─── 頂部導覽列（桌機 + 手機）：Logo + 右側用戶 ─── */}
      <nav className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ background: 'var(--nav-bg, oklch(0.08 0.03 220 / 0.92))', borderColor: 'var(--nav-border, oklch(0.28 0.05 215 / 0.4))' }}>
        {/* 第一行：Logo + 用戶 */}
        <div className="max-w-screen-xl mx-auto w-full flex items-center justify-between px-4 md:px-6 py-3">
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
            {/* 靈虛入口下拉選單 */}
            {user && (
              <div ref={gameMenuRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setGameMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
                  style={{
                    border: gameMenuOpen || location.pathname.startsWith("/game")
                      ? "1px solid rgba(168,85,247,0.6)"
                      : "1px solid rgba(168,85,247,0.25)",
                    color: gameMenuOpen || location.pathname.startsWith("/game")
                      ? "#c084fc"
                      : "rgba(168,85,247,0.7)",
                    background: gameMenuOpen || location.pathname.startsWith("/game")
                      ? "rgba(168,85,247,0.12)"
                      : "transparent",
                    boxShadow: gameMenuOpen ? "0 0 12px rgba(168,85,247,0.3)" : "none",
                  }}
                  title="靈虛入口"
                >
                  <span style={{ fontSize: "15px", lineHeight: 1 }}>⚔️</span>
                  <span className="hidden sm:inline" style={{ letterSpacing: "0.05em" }}>靈虛入口</span>
                  <ChevronDown
                    style={{
                      width: "12px", height: "12px",
                      transform: gameMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      opacity: 0.7,
                    }}
                  />
                </button>

                {/* 下拉選單面板 */}
                {gameMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: "220px",
                      background: "rgba(6,10,22,0.97)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(168,85,247,0.25)",
                      borderRadius: "14px",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 0 24px rgba(168,85,247,0.15)",
                      overflow: "hidden",
                      zIndex: 200,
                    }}
                  >
                    {/* 選單標題 */}
                    <div style={{
                      padding: "10px 14px 8px",
                      borderBottom: "1px solid rgba(168,85,247,0.12)",
                    }}>
                      <p style={{
                        fontSize: "10px",
                        letterSpacing: "0.3em",
                        color: "rgba(168,85,247,0.6)",
                        fontFamily: "'Noto Serif TC', serif",
                        margin: 0,
                      }}>靈 虛 入 口</p>
                    </div>

                    {/* 靈相虛界入口（主要） */}
                    <button
                      onClick={() => {
                        setGameMenuOpen(false);
                        if (location.pathname.startsWith("/game")) return;
                        setShowTransition(true);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "12px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(168,85,247,0.1)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: "32px", height: "32px",
                        borderRadius: "10px",
                        background: "rgba(168,85,247,0.15)",
                        border: "1px solid rgba(168,85,247,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", flexShrink: 0,
                      }}>☯</div>
                      <div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#c084fc", fontFamily: "'Noto Serif TC', serif" }}>靈相虛界</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "rgba(148,163,184,0.6)", marginTop: "1px" }}>進入虛相世界地圖</p>
                      </div>
                      {location.pathname.startsWith("/game") && (
                        <span style={{ marginLeft: "auto", fontSize: "9px", color: "#a855f7", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "4px", padding: "1px 5px" }}>當前</span>
                      )}
                    </button>

                    {/* 分隔線 */}
                    <div style={{ margin: "0 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }} />

                    {/* 排行/PVP */}
                    <button
                      onClick={() => { setGameMenuOpen(false); navigate("/game/achievements"); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: "32px", height: "32px",
                        borderRadius: "10px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", flexShrink: 0,
                      }}>⚔️</div>
                      <div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#f87171", fontFamily: "'Noto Serif TC', serif" }}>排行 / PVP</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "rgba(148,163,184,0.6)", marginTop: "1px" }}>勝負排行、對戰成绩</p>
                      </div>
                    </button>

                    {/* 天命商城 */}
                    <button
                      onClick={() => { setGameMenuOpen(false); navigate("/game/gameshop"); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: "32px", height: "32px",
                        borderRadius: "10px",
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", flexShrink: 0,
                      }}>🛒</div>
                      <div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#fbbf24", fontFamily: "'Noto Serif TC', serif" }}>天命商城</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "rgba(148,163,184,0.6)", marginTop: "1px" }}>道具、裝備、特殊物品</p>
                      </div>
                    </button>

                    {/* 拍賣行 */}
                    <button
                      onClick={() => { setGameMenuOpen(false); navigate("/game/auction"); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px 12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        textAlign: "left",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(56,189,248,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{
                        width: "32px", height: "32px",
                        borderRadius: "10px",
                        background: "rgba(56,189,248,0.1)",
                        border: "1px solid rgba(56,189,248,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", flexShrink: 0,
                      }}>🏛️</div>
                      <div>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#38bdf8", fontFamily: "'Noto Serif TC', serif" }}>拍賣行</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "rgba(148,163,184,0.6)", marginTop: "1px" }}>玩家交易市場</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 過場動畫 */}
            <GameTransition
              active={showTransition}
              targetPath="/game"
              onCancel={() => setShowTransition(false)}
              dominantElement={playerElement}
            />
            {/* 通知鈴鐺 */}
            {user && <NotificationBell />}
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
              <UserMenu user={{ ...user, planName: (meData as { planName?: string | null; role?: string | null } | null)?.planName ?? null, role: (meData as { role?: string | null } | null)?.role ?? null }} />
            )}
          </div>
        </div>

        {/* 第二行：功能導覽列（桌機 + 手機，統一在頂部，支援左右滑動） */}
        <div className="border-t border-white/5">
          {/* 桌機：可左右滑動，加漸層提示 */}
          <div className="hidden md:block relative">
            <div className="max-w-screen-xl mx-auto">
            {/* 左漸層提示 */}
            {desktopCanScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, var(--page-bg, #050d14) 0%, transparent 100%)' }} />
            )}
            {/* 右漸層提示 */}
            {desktopCanScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to left, var(--page-bg, #050d14) 0%, transparent 100%)' }} />
            )}
            <div
              ref={desktopNavRef}
              className="nav-scroll-container flex items-center overflow-x-auto scrollbar-none gap-1 px-4 py-1.5"
              onScroll={(e) => checkScrollState(e.currentTarget, setDesktopCanScrollLeft, setDesktopCanScrollRight)}
            >
              {visibleNavItems.map((item) => {
                const navPath = (item as { navPath: string }).navPath ?? (item as { path?: string }).path ?? "/";
                const label = (item as { name?: string; label?: string }).name ?? (item as { label?: string }).label ?? "";
                const locked = !item.hasAccess;
                const isActive = navPath === "/" ? currentPage === "warRoom" || currentPage === "" : location.pathname === navPath || (navPath !== "/" && location.pathname.startsWith(navPath + "/"));
                return (
                  <button
                    key={item.id}
                    data-active={isActive ? "true" : undefined}
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
            </div>{/* end max-w-screen-2xl */}
          </div>

          {/* 手機：可左右滑動，加漸層提示 */}
          <div className="md:hidden relative">
            {/* 左漸層提示 */}
            {mobileCanScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, var(--page-bg, #050d14) 0%, transparent 100%)' }} />
            )}
            {/* 右漸層提示 */}
            {mobileCanScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to left, var(--page-bg, #050d14) 0%, transparent 100%)' }} />
            )}
            <div
              ref={mobileNavRef}
              className="nav-scroll-container flex items-center overflow-x-auto scrollbar-none px-2 py-1"
              onScroll={(e) => checkScrollState(e.currentTarget, setMobileCanScrollLeft, setMobileCanScrollRight)}
            >
              {visibleNavItems.map((item) => {
                const navPath = (item as { navPath: string }).navPath ?? "/";
                const label = (item as { name?: string; label?: string }).name ?? (item as { label?: string }).label ?? "";
                const locked = !item.hasAccess;
                const isActive = navPath === "/" ? currentPage === "warRoom" || currentPage === "" : location.pathname === navPath || (navPath !== "/" && location.pathname.startsWith(navPath + "/"));
                return (
                  <button
                    key={item.id}
                    data-active={isActive ? "true" : undefined}
                    onClick={() => {
                      if (locked) { toast.error("此功能需要升級方案才能使用"); return; }
                      navigate(navPath);
                    }}
                    className={`
                      relative flex flex-col items-center justify-center gap-1
                      shrink-0 px-3 py-2 min-w-[64px] rounded-xl transition-colors
                      ${locked
                        ? "opacity-40 cursor-not-allowed border border-transparent"
                        : isActive
                          ? "bg-amber-900/25 border border-amber-700/30 text-amber-400"
                          : "text-slate-500 border border-transparent"
                      }
                    `}
                  >
                    <span className="text-[44px] leading-none">
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
