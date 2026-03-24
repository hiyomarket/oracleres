/**
 * GameTabLayout.tsx
 * 遊戲模組底部 Tab 導航包裝器
 * V46：整合日誌/傳送/拍賣行到底部 Tab Bar，移除 comingSoon 項目
 *      Tab Bar 改為可橫向滾動
 * Bug 3+4+9 fix：管理員按鈕整合到底部 Tab Bar（僅 admin 可見）
 */
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

type GameTab = {
  id: string;
  path: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
};

const GAME_TABS: GameTab[] = [
  { id: "world",    path: "/game",              icon: "🌏", label: "虛相世界" },
  { id: "shop",     path: "/game/gameshop",     icon: "🛒", label: "天命商城" },
  { id: "auction",  path: "/game/auction",      icon: "🏛️", label: "拍賣行" },
  // Bug 3+9 fix: 管理員後台整合為單一按鈕（僅 admin 可見）
  { id: "admin",    path: "/admin/game",        icon: "⚙️", label: "後台管理",  adminOnly: true },
];

/** 底部 Tab Bar 高度（不含 safe-area，safe-area 由 CSS 處理） */
export const TAB_BAR_HEIGHT = 56;

interface GameTabLayoutProps {
  children: React.ReactNode;
  /** 強制指定 activeTab，不傳則自動從 pathname 判斷 */
  activeTab?: string;
  /** 日誌按鈕點擊 callback（傳入時才顯示日誌按鈕） */
  onLogClick?: () => void;
  /** 傳送按鈕點擊 callback（傳入時才顯示傳送按鈕） */
  onTeleportClick?: () => void;
  /** 日誌未讀數量 */
  logCount?: number;
}

export default function GameTabLayout({ children, activeTab, onLogClick, onTeleportClick, logCount }: GameTabLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // 判斷目前 active tab
  const currentTab = activeTab ?? (() => {
    if (location === "/game") return "world";
    if (location.startsWith("/game/gameshop")) return "shop";
    if (location.startsWith("/game/profile")) return "avatar";
    if (location.startsWith("/game/shop")) return "shop";
    if (location.startsWith("/game/blessings")) return "blessing";
    if (location.startsWith("/game/pet")) return "pet";
    if (location.startsWith("/game/forge")) return "forge";
    if (location.startsWith("/game/auction")) return "auction";
    if (location.startsWith("/admin")) return "admin";
    return "world";
  })();

  // 過濾出要顯示的 Tab（adminOnly 的只有 admin 能看到）
  const visibleTabs = GAME_TABS.filter(tab => !tab.adminOnly || isAdmin);


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

      {/* 底部 Tab Bar — 可橫向滾動 */}
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
        {/* 日誌按鈕（僅在虛相世界顯示） */}
        {onLogClick && (
          <button
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
              cursor: "pointer",
            }}
            onClick={onLogClick}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>📜</span>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(245,158,11,0.9)", whiteSpace: "nowrap" }}>日誌</span>
            {(logCount ?? 0) > 0 && (
              <span style={{
                position: "absolute", top: "6px", right: "8px",
                fontSize: "9px", fontWeight: "bold",
                background: "#ef4444", color: "#fff",
                borderRadius: "999px", padding: "0 4px", minWidth: "14px", textAlign: "center",
              }}>
                {(logCount ?? 0) > 99 ? "99+" : logCount}
              </span>
            )}
          </button>
        )}

        {/* 傳送按鈕（僅在虛相世界顯示） */}
        {onTeleportClick && (
          <button
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
              cursor: "pointer",
            }}
            onClick={onTeleportClick}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>🗺️</span>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(56,189,248,0.9)", whiteSpace: "nowrap" }}>傳送</span>
          </button>
        )}

        {/* 主要 Tab 按鈕 */}
        {visibleTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const isAdminTab = tab.adminOnly === true;
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
                background: isAdminTab
                  ? (isActive ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.05)")
                  : "transparent",
                border: "none",
                cursor: "pointer",
                // Admin 按鈕左側加分隔線
                borderLeft: isAdminTab ? "1px solid rgba(239,68,68,0.2)" : undefined,
              }}
              onClick={() => navigate(tab.path)}
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
                    background: isAdminTab
                      ? "linear-gradient(90deg, #ef4444, #dc2626)"
                      : "linear-gradient(90deg, #f59e0b, #ef4444)",
                  }}
                />
              )}

              {/* 圖示 */}
              <span
                style={{
                  fontSize: "20px",
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.15s",

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
                    ? (isAdminTab ? "#ef4444" : "#f59e0b")
                    : isAdminTab
                    ? "rgba(239,68,68,0.7)"
                    : "rgba(148,163,184,0.7)",
                  transition: "color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </span>


            </button>
          );
        })}
      </nav>
    </div>
  );
}
