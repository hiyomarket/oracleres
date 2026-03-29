/**
 * GameTabLayout.tsx
 * 遊戲模組底部 Tab 導航包裝器
 * V46：整合日誌/傳送/拍賣行到底部 Tab Bar，移除 comingSoon 項目
 *      Tab Bar 改為可橫向滾動
 * Bug 3+4+9 fix：管理員按鈕整合到底部 Tab Bar（僅 admin 可見）
 * M3N：將「行動」「靈相」浮動按鈕移到底部指令列
 */
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useRef, useEffect } from "react";

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
  { id: "pets",     path: "/game/pets",         icon: "🐾", label: "寵物" },
  { id: "quests",   path: "/game/quest-skills", icon: "📖", label: "技能學習" },
  { id: "pvp",      path: "/game/achievements", icon: "🏆",  label: "排行/成就" },
  { id: "combat",   path: "/game/combat",       icon: "⚔️", label: "戰鬥大廳" },
  { id: "enhance", path: "/game/enhance",     icon: "✨", label: "強化" },
  { id: "boss",     path: "/game/boss",         icon: "👹", label: "Boss追蹤" },
  { id: "guide",    path: "/game/guide",        icon: "📖", label: "指南" },
  // Bug 3+9 fix: 管理員後台整合為單一按鈕（僅 admin 可見）
  { id: "admin",    path: "/admin/game",        icon: "⚙️", label: "後台管理",  adminOnly: true },
];

/** 底部 Tab Bar 高度（不含 safe-area，safe-area 由 CSS 處理） */
export const TAB_BAR_HEIGHT = 56;

/** 行動策略選項 */
export type StrategyOption = {
  id: string;
  icon: string;
  label: string;
};

/** 靈相干預選項 */
export type DivineOption = {
  label: string;
  desc: string;
  icon: string;
  color: string;
  fn: () => void;
  pending: boolean;
};

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
  /** 行動策略相關 props */
  strategyOptions?: StrategyOption[];
  currentStrategy?: string;
  onStrategyChange?: (strategyId: string) => void;
  movementMode?: "roaming" | "stationary";
  onMovementModeChange?: (mode: "roaming" | "stationary") => void;
  /** 元素主題色 */
  elementColor?: string;
  /** 靈相干預相關 props */
  divineOptions?: DivineOption[];
  divineAP?: number;
  divineMaxAP?: number;
  /** 在線人數按鈕 */
  onlineCount?: number;
  onOnlineClick?: () => void;
  /** 組隊按鈕 */
  onPartyClick?: () => void;
  partyMemberCount?: number;
  hasParty?: boolean;
}

export default function GameTabLayout({
  children, activeTab, onLogClick, onTeleportClick, logCount,
  strategyOptions, currentStrategy, onStrategyChange, movementMode, onMovementModeChange,
  elementColor,
  divineOptions, divineAP, divineMaxAP,
  onlineCount, onOnlineClick,
  onPartyClick, partyMemberCount, hasParty,
}: GameTabLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const ec = elementColor || "#f59e0b";

  // 行動策略面板開關
  const [strategyOpen, setStrategyOpen] = useState(false);
  // 靈相干預面板開關
  const [divineOpen, setDivineOpen] = useState(false);

  // 點擊外部關閉面板
  const strategyRef = useRef<HTMLDivElement>(null);
  const divineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (strategyOpen && strategyRef.current && !strategyRef.current.contains(e.target as Node)) {
        setStrategyOpen(false);
      }
      if (divineOpen && divineRef.current && !divineRef.current.contains(e.target as Node)) {
        setDivineOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [strategyOpen, divineOpen]);

  // 判斷目前 active tab
  const currentTab = activeTab ?? (() => {
    if (location === "/game") return "world";
    if (location.startsWith("/game/gameshop")) return "shop";
    if (location.startsWith("/game/profile")) return "avatar";
    if (location.startsWith("/game/shop")) return "shop";
    if (location.startsWith("/game/blessings")) return "blessing";
    if (location.startsWith("/game/pet")) return "pets";
    if (location.startsWith("/game/quest-skill")) return "quests";
    if (location.startsWith("/game/forge")) return "forge";
    if (location.startsWith("/game/auction")) return "auction";
    if (location.startsWith("/game/achievements")) return "pvp";
    if (location.startsWith("/game/pvp")) return "pvp";
    if (location.startsWith("/game/enhance")) return "enhance";
    if (location.startsWith("/game/guide")) return "guide";
    if (location.startsWith("/admin")) return "admin";
    return "world";
  })();

  // 過濾出要顯示的 Tab（adminOnly 的只有 admin 能看到）
  const visibleTabs = GAME_TABS.filter(tab => !tab.adminOnly || isAdmin);

  const hasStrategy = strategyOptions && strategyOptions.length > 0 && onStrategyChange;
  const hasDivine = divineOptions && divineOptions.length > 0;

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

      {/* ── 行動策略展開面板（置中彈出） ── */}
      {strategyOpen && hasStrategy && (
        <div
          ref={strategyRef}
          style={{
            position: "fixed",
            bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 8px)`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            width: "min(320px, calc(100vw - 32px))",
            background: "rgba(6,10,22,0.97)",
            backdropFilter: "blur(16px)",
            borderRadius: "16px",
            border: `1px solid ${ec}40`,
            boxShadow: `0 -8px 32px ${ec}20, 0 4px 16px rgba(0,0,0,0.5)`,
            overflow: "hidden",
            animation: "slideUpFade 0.2s ease-out",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: ec }}>⚔️ 行動策略</span>
            <button onClick={() => setStrategyOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px" }}>✕</button>
          </div>
          <div style={{ padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {strategyOptions!.map(s => (
              <button key={s.id}
                onClick={() => { onStrategyChange!(s.id); setStrategyOpen(false); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  padding: "12px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  border: `1px solid ${currentStrategy === s.id ? `${ec}55` : "rgba(255,255,255,0.08)"}`,
                  background: currentStrategy === s.id ? `${ec}18` : "rgba(255,255,255,0.03)",
                  color: currentStrategy === s.id ? ec : "rgba(148,163,184,0.6)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: "22px", lineHeight: 1 }}>{s.icon}</span>
                <span style={{ fontSize: "11px", fontWeight: 600 }}>{s.label}</span>
              </button>
            ))}
          </div>
          {/* 漫遊/定點切換 */}
          {onMovementModeChange && (
            <div style={{ padding: "0 8px 8px" }}>
              <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                {(["roaming", "stationary"] as const).map(mode => (
                  <button key={mode}
                    onClick={() => onMovementModeChange(mode)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: movementMode === mode ? `${ec}25` : "transparent",
                      color: movementMode === mode ? ec : "rgba(148,163,184,0.5)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                    {mode === "roaming" ? "🚶 漫遊" : "📌 定點"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 靈相干預展開面板（置中彈出） ── */}
      {divineOpen && hasDivine && (
        <div
          ref={divineRef}
          style={{
            position: "fixed",
            bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 8px)`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            width: "min(320px, calc(100vw - 32px))",
            background: "rgba(6,10,22,0.97)",
            backdropFilter: "blur(16px)",
            borderRadius: "16px",
            border: "1px solid rgba(167,139,250,0.4)",
            boxShadow: "0 -8px 32px rgba(167,139,250,0.15), 0 4px 16px rgba(0,0,0,0.5)",
            overflow: "hidden",
            animation: "slideUpFade 0.2s ease-out",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#a78bfa" }}>✨ 靈相干預</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>靈力 {divineAP ?? 0}/{divineMaxAP ?? 10}</span>
              <button onClick={() => setDivineOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>
          </div>
          <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {divineOptions!.map(item => (
              <button key={item.label}
                onClick={() => { item.fn(); }}
                disabled={(divineAP ?? 0) < 1 || item.pending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: `1px solid ${item.color}30`,
                  background: `${item.color}08`,
                  color: item.color,
                  cursor: (divineAP ?? 0) < 1 || item.pending ? "not-allowed" : "pointer",
                  opacity: (divineAP ?? 0) < 1 || item.pending ? 0.4 : 1,
                  transition: "all 0.15s",
                  width: "100%",
                  textAlign: "left",
                }}>
                <span style={{ fontSize: "20px" }}>{item.pending ? "⏳" : item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 700 }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: "10px", color: "#64748b" }}>{item.desc}</p>
                </div>
                <span style={{ fontSize: "10px", color: "#475569" }}>-1靈</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
        {/* 在線人數按鈕（傳入 onOnlineClick 時顯示） */}
        {onOnlineClick && (
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
            onClick={onOnlineClick}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>👥</span>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(56,189,248,0.9)", whiteSpace: "nowrap" }}>
              {onlineCount !== undefined ? `在線 ${onlineCount}` : "在線"}
            </span>
          </button>
        )}

        {/* 組隊按鈕（傳入 onPartyClick 時顯示） */}
        {onPartyClick && (
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
              background: hasParty ? "rgba(34,197,94,0.12)" : "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onClick={onPartyClick}
          >
            {hasParty && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: "40px", height: "2px", borderRadius: "1px",
                background: "linear-gradient(90deg, #22c55e, #22c55e80)",
              }} />
            )}
            <span style={{ fontSize: "20px", lineHeight: 1 }}>⚔️🛡️</span>
            <span style={{
              fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap",
              color: hasParty ? "#22c55e" : "rgba(148,163,184,0.7)",
            }}>
              {hasParty ? `組隊 ${partyMemberCount ?? 0}人` : "組隊"}
            </span>
            {hasParty && (
              <span style={{
                position: "absolute", top: "4px", right: "6px",
                fontSize: "8px", fontWeight: 700,
                background: "rgba(34,197,94,0.2)", color: "#22c55e",
                borderRadius: "999px", padding: "0 3px", minWidth: "12px", textAlign: "center",
              }}>
                {partyMemberCount}
              </span>
            )}
          </button>
        )}

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

        {/* ── 行動策略按鈕（僅在虛相世界且有 strategyOptions 時顯示） ── */}
        {hasStrategy && (
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
              background: strategyOpen ? `${ec}12` : "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => { setStrategyOpen(v => !v); setDivineOpen(false); }}
          >
            {/* 活躍指示線 */}
            {strategyOpen && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: "40px", height: "2px", borderRadius: "1px",
                background: `linear-gradient(90deg, ${ec}, ${ec}80)`,
              }} />
            )}
            <span style={{ fontSize: "20px", lineHeight: 1 }}>⚔️</span>
            <span style={{
              fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap",
              color: strategyOpen ? ec : `${ec}90`,
            }}>
              {strategyOptions!.find(s => s.id === currentStrategy)?.label ?? "行動"}
            </span>
          </button>
        )}

        {/* ── 靈相干預按鈕（僅在虛相世界且有 divineOptions 時顯示） ── */}
        {hasDivine && (
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
              background: divineOpen ? "rgba(167,139,250,0.12)" : "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => { setDivineOpen(v => !v); setStrategyOpen(false); }}
          >
            {/* 活躍指示線 */}
            {divineOpen && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: "40px", height: "2px", borderRadius: "1px",
                background: "linear-gradient(90deg, #a78bfa, #a78bfa80)",
              }} />
            )}
            <span style={{ fontSize: "20px", lineHeight: 1 }}>✨</span>
            <span style={{
              fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap",
              color: divineOpen ? "#a78bfa" : "rgba(167,139,250,0.9)",
            }}>靈相</span>
            {/* 靈力值小標 */}
            {divineAP !== undefined && (
              <span style={{
                position: "absolute", top: "4px", right: "6px",
                fontSize: "8px", fontWeight: 700,
                background: "rgba(167,139,250,0.2)", color: "#a78bfa",
                borderRadius: "999px", padding: "0 3px", minWidth: "12px", textAlign: "center",
              }}>
                {divineAP}
              </span>
            )}
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

      {/* slideUpFade 動畫 */}
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
