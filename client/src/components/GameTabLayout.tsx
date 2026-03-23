/**
 * GameTabLayout.tsx
 * 遊戲模組底部 Tab 導航包裝器
 * 四個 Tab：虛相世界 / 靈相空間 / 天命商城 / 命理加成
 */
import { useLocation } from "wouter";

type GameTab = {
  id: string;
  path: string;
  icon: string;
  label: string;
  comingSoon?: boolean;
};

const GAME_TABS: GameTab[] = [
  { id: "world",    path: "/game",         icon: "🌏", label: "虛相世界" },
  { id: "avatar",   path: "/game/profile", icon: "👤", label: "靈相空間" },
  { id: "shop",     path: "/game/shop",    icon: "🛒", label: "天命商城" },
  { id: "blessing", path: "/game/blessings", icon: "📿", label: "命理加成", comingSoon: true },
];

interface GameTabLayoutProps {
  children: React.ReactNode;
  /** 強制指定 activeTab，不傳則自動從 pathname 判斷 */
  activeTab?: string;
}

export default function GameTabLayout({ children, activeTab }: GameTabLayoutProps) {
  const [location, navigate] = useLocation();

  // 判斷目前 active tab
  const currentTab = activeTab ?? (() => {
    if (location === "/game") return "world";
    if (location.startsWith("/game/profile")) return "avatar";
    if (location.startsWith("/game/shop")) return "shop";
    if (location.startsWith("/game/blessings")) return "blessing";
    return "world";
  })();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "radial-gradient(ellipse at 50% 20%, #1E3A5F 0%, #050d14 65%)" }}
    >
      {/* 主內容區（留出底部 Tab 空間） */}
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>

      {/* 底部 Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: "rgba(5, 13, 20, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {GAME_TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all"
              onClick={() => {
                if (tab.comingSoon) return;
                navigate(tab.path);
              }}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* 活躍指示線 */}
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444)" }}
                />
              )}

              {/* 圖示 */}
              <span
                className="text-xl transition-transform"
                style={{
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  filter: tab.comingSoon ? "grayscale(1) opacity(0.4)" : undefined,
                }}
              >
                {tab.icon}
              </span>

              {/* 標籤 */}
              <span
                className="text-[10px] font-medium tracking-wide transition-colors"
                style={{
                  color: isActive
                    ? "#f59e0b"
                    : tab.comingSoon
                    ? "rgba(148,163,184,0.3)"
                    : "rgba(148,163,184,0.7)",
                }}
              >
                {tab.label}
              </span>

              {/* Coming Soon 標記 */}
              {tab.comingSoon && (
                <span
                  className="absolute top-1.5 right-1/4 text-[8px] px-1 rounded-sm font-bold"
                  style={{ background: "rgba(100,116,139,0.4)", color: "rgba(148,163,184,0.5)" }}
                >
                  即將推出
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
