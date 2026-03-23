/**
 * GameTabLayout.tsx
 * 遊戲模組底部 Tab 導航包裝器
 * V23：新增寵物系統/鍛造屋/拍賣行（即將推出），靈相空間/天命商城改為即將推出
 *      Tab Bar 改為可橫向滾動，支援 7 個 Tab
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
  { id: "world",    path: "/game",           icon: "🌏", label: "虛相世界" },
  { id: "avatar",   path: "/game/profile",   icon: "👤", label: "靈相空間",  comingSoon: true },
  { id: "shop",     path: "/game/shop",      icon: "🛒", label: "天命商城",  comingSoon: true },
  { id: "blessing", path: "/game/blessings", icon: "📿", label: "命理加成",  comingSoon: true },
  { id: "pet",      path: "/game/pet",       icon: "🐾", label: "寵物系統",  comingSoon: true },
  { id: "forge",    path: "/game/forge",     icon: "⚒️", label: "鍛造屋",    comingSoon: true },
  { id: "auction",  path: "/game/auction",   icon: "🏛️", label: "拍賣行",    comingSoon: true },
];

/** 底部 Tab Bar 高度（不含 safe-area，safe-area 由 CSS 處理） */
export const TAB_BAR_HEIGHT = 56;

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
    if (location.startsWith("/game/pet")) return "pet";
    if (location.startsWith("/game/forge")) return "forge";
    if (location.startsWith("/game/auction")) return "auction";
    return "world";
  })();

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 20%, #1E3A5F 0%, #050d14 65%)",
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
        boxSizing: "border-box",
      }}
    >
      {/* 主內容區 */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          paddingBottom: `${TAB_BAR_HEIGHT}px`,
        }}
      >
        {children}
      </div>

      {/* 底部 Tab Bar — 可橫向滾動，支援 7 個 Tab */}
      <nav
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "flex-start",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          height: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "rgba(5, 13, 20, 0.97)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
      >
        {GAME_TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              style={{
                flex: "0 0 auto",
                minWidth: "72px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "2px",
                padding: "8px 4px",
                height: `${TAB_BAR_HEIGHT}px`,
                position: "relative",
                transition: "all 0.15s",
                WebkitTapHighlightColor: "transparent",
                background: "transparent",
                border: "none",
                cursor: tab.comingSoon ? "default" : "pointer",
              }}
              onClick={() => {
                if (tab.comingSoon) return;
                navigate(tab.path);
              }}
            >
              {/* 活躍指示線 */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "40px",
                    height: "2px",
                    borderRadius: "1px",
                    background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                  }}
                />
              )}

              {/* 圖示 */}
              <span
                style={{
                  fontSize: "20px",
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.15s",
                  filter: tab.comingSoon ? "grayscale(1) opacity(0.4)" : undefined,
                  lineHeight: 1,
                }}
              >
                {tab.icon}
              </span>

              {/* 標籤 */}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  color: isActive
                    ? "#f59e0b"
                    : tab.comingSoon
                    ? "rgba(148,163,184,0.3)"
                    : "rgba(148,163,184,0.7)",
                  transition: "color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </span>

              {/* Coming Soon 標記 */}
              {tab.comingSoon && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    fontSize: "7px",
                    padding: "1px 3px",
                    borderRadius: "2px",
                    fontWeight: "bold",
                    background: "rgba(100,116,139,0.4)",
                    color: "rgba(148,163,184,0.5)",
                    whiteSpace: "nowrap",
                  }}
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
