/**
 * EnhancePage.tsx
 * 裝備強化系統前端頁面（天堂模式 +0 到 +20）
 * v5.15 重設計：強化區置頂、卷軸中間、裝備底部、等級表/預覽用彈窗
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Sparkles, Shield, Swords, Heart, Zap, AlertTriangle, History, ChevronRight, Star, Flame, Skull, Eye, X, Info } from "lucide-react";
import { Link } from "wouter";

// ─── 21 色等級映射 ─────
const ENHANCE_COLORS: Record<string, { hex: string; label: string; glow: string }> = {
  white:          { hex: "#94a3b8", label: "白",       glow: "rgba(148,163,184,0.3)" },
  green:          { hex: "#4ade80", label: "綠",       glow: "rgba(74,222,128,0.4)" },
  blue:           { hex: "#60a5fa", label: "藍",       glow: "rgba(96,165,250,0.4)" },
  purple:         { hex: "#a78bfa", label: "紫",       glow: "rgba(167,139,250,0.5)" },
  orange:         { hex: "#fb923c", label: "橙",       glow: "rgba(251,146,60,0.5)" },
  red:            { hex: "#ef4444", label: "紅",       glow: "rgba(239,68,68,0.6)" },
  gold:           { hex: "#f59e0b", label: "金",       glow: "rgba(245,158,11,0.6)" },
  platinum:       { hex: "#fde68a", label: "白金",     glow: "rgba(253,230,138,0.5)" },
  cyan:           { hex: "#34d399", label: "青",       glow: "rgba(52,211,153,0.5)" },
  skyblue:        { hex: "#38bdf8", label: "天藍",     glow: "rgba(56,189,248,0.5)" },
  starpurple:     { hex: "#8b5cf6", label: "星紫",     glow: "rgba(139,92,246,0.6)" },
  deepred:        { hex: "#dc2626", label: "深紅",     glow: "rgba(220,38,38,0.6)" },
  flameorange:    { hex: "#ea580c", label: "烈焰橙",   glow: "rgba(234,88,12,0.6)" },
  lavagold:       { hex: "#d97706", label: "熔岩金",   glow: "rgba(217,119,6,0.6)" },
  destinyyellow:  { hex: "#eab308", label: "天命黃",   glow: "rgba(234,179,8,0.6)" },
  artifactcyan:   { hex: "#06b6d4", label: "神器青",   glow: "rgba(6,182,212,0.6)" },
  legendwhite:    { hex: "#e2e8f0", label: "傳說白金", glow: "rgba(226,232,240,0.5)" },
  ancientsilver:  { hex: "#cbd5e1", label: "太古銀",   glow: "rgba(203,213,225,0.5)" },
  chaosmag:       { hex: "#c026d3", label: "混沌紫紅", glow: "rgba(192,38,211,0.7)" },
  holywhite:      { hex: "#fef9c3", label: "神聖金白", glow: "rgba(254,249,195,0.6)" },
  rainbow:        { hex: "#fbbf24", label: "絕頂彩虹", glow: "rgba(251,191,36,0.8)" },
};

function getColorInfo(colorKey: string) {
  return ENHANCE_COLORS[colorKey] ?? ENHANCE_COLORS.white;
}

function getEnhanceColorKey(level: number): string {
  const keys = ["white","green","blue","purple","orange","red","gold","platinum","cyan","skyblue","starpurple","deepred","flameorange","lavagold","destinyyellow","artifactcyan","legendwhite","ancientsilver","chaosmag","holywhite","rainbow"];
  return keys[Math.min(level, 20)] ?? "white";
}

const SLOT_LABEL: Record<string, string> = {
  weapon: "武器", helmet: "頭盔", armor: "鎧甲", shoes: "鞋子",
  accessory: "飾品", offhand: "副手", gloves: "手套",
};

const QUALITY_ZH: Record<string, string> = {
  common: "普通", uncommon: "精良", rare: "稀有", epic: "史詩", legendary: "傳說",
};

export default function EnhancePage() {
  const { user } = useAuth();
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
  const [selectedScrollId, setSelectedScrollId] = useState<string | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<any>(null);
  const [animating, setAnimating] = useState(false);
  const [showLevelGuide, setShowLevelGuide] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // ─── Queries ───
  const equipQuery = trpc.gameWorld.getInventoryEquipments.useQuery(
    undefined, { enabled: !!user, staleTime: 10000 }
  );
  const equipments = useMemo(() => equipQuery.data ?? [], [equipQuery.data]);

  const enhanceInfoQuery = trpc.equipEnhance.getEnhanceInfo.useQuery(
    { inventoryId: selectedInvId! },
    { enabled: !!selectedInvId, staleTime: 5000 }
  );

  const scrollQuery = trpc.equipEnhance.getScrollInventory.useQuery(undefined, {
    enabled: !!user, staleTime: 10000,
  });

  const logsQuery = trpc.equipEnhance.getEnhanceLogs.useQuery(
    { limit: 20 }, { enabled: showLogs, staleTime: 5000 }
  );

  const fullPreviewQuery = trpc.equipEnhance.getFullEnhancePreview.useQuery(
    { inventoryId: selectedInvId! },
    { enabled: !!selectedInvId && showFullPreview, staleTime: 10000 }
  );

  // ─── Mutation ───
  const utils = trpc.useUtils();
  const enhanceMutation = trpc.equipEnhance.enhanceEquip.useMutation({
    onSuccess: (result) => {
      setEnhanceResult(result);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 2000);
      if (result.destroyed) {
        setTimeout(() => { setSelectedInvId(null); setSelectedScrollId(null); }, 1500);
      }
      utils.equipEnhance.getEnhanceInfo.invalidate();
      utils.equipEnhance.getScrollInventory.invalidate();
      utils.gameWorld.getInventoryEquipments.invalidate();
      if (showLogs) utils.equipEnhance.getEnhanceLogs.invalidate();
    },
  });

  const handleEnhance = useCallback(() => {
    if (!selectedInvId || !selectedScrollId) return;
    setEnhanceResult(null);
    enhanceMutation.mutate({ inventoryId: selectedInvId, scrollItemId: selectedScrollId });
  }, [selectedInvId, selectedScrollId, enhanceMutation]);

  // 適用的卷軸
  const applicableScrolls = useMemo(() => {
    if (!scrollQuery.data || !enhanceInfoQuery.data) return [];
    const slot = enhanceInfoQuery.data.slot;
    const isWeapon = ["weapon", "offhand"].includes(slot);
    return scrollQuery.data.filter(s => {
      if (s.scrollType === "weapon_scroll" || s.scrollType === "blessed_weapon_scroll") return isWeapon;
      return !isWeapon;
    });
  }, [scrollQuery.data, enhanceInfoQuery.data]);

  // 自動選擇第一個適用卷軸
  useEffect(() => {
    if (applicableScrolls.length > 0 && !selectedScrollId) {
      setSelectedScrollId(applicableScrolls[0].itemId);
    }
  }, [applicableScrolls, selectedScrollId]);

  const info = enhanceInfoQuery.data;
  const selectedEquip = equipments.find(e => e.invId === selectedInvId);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0e1a 0%, #0f1a2e 50%, #0a1220 100%)",
      color: "#e2e8f0",
    }}>
      {/* ═══ 頂部導航 ═══ */}
      <div style={{
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: "10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/game">
          <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={18} />
          </button>
        </Link>
        <Sparkles size={16} style={{ color: "#fbbf24" }} />
        <h1 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>裝備強化</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          <IconBtn icon={<Star size={11} />} label="等級表" active={showLevelGuide} onClick={() => setShowLevelGuide(true)} />
          {selectedInvId && <IconBtn icon={<Eye size={11} />} label="預覽" active={showFullPreview} onClick={() => setShowFullPreview(true)} />}
          <IconBtn icon={<History size={11} />} label="記錄" active={showLogs} onClick={() => setShowLogs(!showLogs)} />
        </div>
      </div>

      <div style={{ padding: "12px 16px", maxWidth: "480px", margin: "0 auto" }}>

        {/* ═══ 區域 1：強化核心區（置頂） ═══ */}
        {info ? (
          <div style={{
            marginBottom: "12px", padding: "12px", borderRadius: "14px",
            background: `linear-gradient(135deg, ${info.currentColorHex}08, ${info.nextColorHex ?? info.currentColorHex}05)`,
            border: `1px solid ${info.currentColorHex}25`,
            position: "relative", overflow: "hidden",
          }}>
            {/* 背景光暈 */}
            {info.currentLevel >= 6 && (
              <div style={{
                position: "absolute", top: "-20px", right: "-20px",
                width: "80px", height: "80px", borderRadius: "50%",
                background: `radial-gradient(circle, ${getColorInfo(info.currentColor).glow}, transparent)`,
                opacity: 0.3, pointerEvents: "none",
              }} />
            )}

            {/* 裝備名 + 等級 */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", position: "relative" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "10px",
                background: `${info.currentColorHex}15`, border: `1px solid ${info.currentColorHex}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", fontWeight: 700, color: info.currentColorHex,
                boxShadow: info.currentLevel >= 6 ? `0 0 12px ${getColorInfo(info.currentColor).glow}` : "none",
                flexShrink: 0,
              }}>+{info.currentLevel}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ color: info.currentColorHex }}>[{info.currentColorLabel}]</span>
                  <span className="truncate">{info.equipName}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {SLOT_LABEL[info.slot] ?? info.slot} · 安定值 +{info.safeLevel}
                </div>
              </div>
            </div>

            {info.canEnhance ? (
              <>
                {/* 升級方向 + 成功率 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "6px 0 10px" }}>
                  <LevelBadge level={info.currentLevel} hex={info.currentColorHex} label={info.currentColorLabel} size="sm" />
                  <span style={{ color: "#fbbf24", fontSize: "16px", animation: "pulse 1.5s infinite" }}>→</span>
                  <LevelBadge level={info.nextLevel} hex={info.nextColorHex} label={info.nextColorLabel} size="sm" />
                </div>

                {/* 三格數據 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginBottom: "8px" }}>
                  <MiniStat label="成功率" value={info.isSafe ? "100%" : `${(info.successRate * 100).toFixed(1)}%`} color={info.isSafe ? "#4ade80" : info.successRate >= 0.1 ? "#fbbf24" : "#ef4444"} sub={info.isSafe ? "安定" : ""} />
                  <MiniStat label="加成" value={`+${Math.round(info.nextStatBonus * 100)}%`} color="#60a5fa" sub={`現 +${Math.round(info.statBonus * 100)}%`} />
                  <MiniStat label="爆裝" value={info.destroyRate > 0 ? `${Math.round(info.destroyRate * 100)}%` : "無"} color={info.destroyRate > 0 ? "#ef4444" : "#4ade80"} sub="" />
                </div>

                {/* 危險警告（安定值外） */}
                {!info.isSafe && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "6px 8px", borderRadius: "8px",
                    background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                    marginBottom: "8px",
                  }}>
                    <AlertTriangle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
                    <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 600 }}>
                      天堂模式：失敗即爆裝！黃卷可降低爆裝率。
                    </span>
                  </div>
                )}

                {/* 卷軸選擇（內嵌） */}
                {applicableScrolls.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "10px 0", fontSize: "11px", color: "#475569" }}>
                    📜 背包中沒有適用的強化卷軸
                    <div style={{ fontSize: "9px", color: "#334155", marginTop: "2px" }}>
                      {["weapon", "offhand"].includes(info.slot) ? "需要武器強化卷軸" : "需要防具強化卷軸"}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                    {applicableScrolls.map(s => {
                      const isSelected = selectedScrollId === s.itemId;
                      const isBlessed = s.isBlessed;
                      const sc = isBlessed ? "#fbbf24" : "#94a3b8";
                      return (
                        <button key={s.itemId} onClick={() => setSelectedScrollId(s.itemId)} style={{
                          flex: 1, display: "flex", alignItems: "center", gap: "6px",
                          padding: "6px 8px", borderRadius: "8px", cursor: "pointer",
                          background: isSelected ? `${sc}15` : "rgba(255,255,255,0.03)",
                          border: isSelected ? `2px solid ${sc}50` : "1px solid rgba(255,255,255,0.06)",
                          color: "#e2e8f0", textAlign: "left",
                        }}>
                          <span style={{ fontSize: "14px" }}>{isBlessed ? "✨" : "📜"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "10px", fontWeight: 600, color: isBlessed ? "#fbbf24" : "#e2e8f0" }} className="truncate">
                              {s.name}
                            </div>
                            <div style={{ fontSize: "8px", color: "#64748b" }}>
                              {isBlessed ? "+1~3 爆裝↓" : "+1"} · x{s.quantity}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 強化按鈕 */}
                {selectedScrollId && (
                  <button onClick={handleEnhance} disabled={enhanceMutation.isPending} style={{
                    width: "100%", padding: "12px", borderRadius: "10px",
                    background: enhanceMutation.isPending
                      ? "rgba(251,191,36,0.2)"
                      : "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
                    border: "none", color: "#0a0e1a", fontSize: "14px", fontWeight: 700,
                    cursor: enhanceMutation.isPending ? "wait" : "pointer",
                    boxShadow: "0 3px 16px rgba(251,191,36,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}>
                    <Flame size={16} />
                    {enhanceMutation.isPending ? "強化中..." : "開始強化"}
                  </button>
                )}
              </>
            ) : (
              <div style={{
                textAlign: "center", padding: "8px", borderRadius: "8px",
                background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)",
              }}>
                <p style={{ fontSize: "13px", color: "#fbbf24", margin: 0, fontWeight: 700 }}>
                  已達最高強化等級 +{info.currentLevel}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* 未選擇裝備時的提示 */
          <div style={{
            marginBottom: "12px", padding: "20px", borderRadius: "14px", textAlign: "center",
            background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)",
          }}>
            <Sparkles size={28} style={{ color: "#fbbf24", margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>請從下方選擇要強化的裝備</p>
          </div>
        )}

        {/* ═══ 強化結果（動畫） ═══ */}
        {enhanceResult && (
          <div style={{
            marginBottom: "12px", padding: "14px", borderRadius: "12px", textAlign: "center",
            background: enhanceResult.destroyed ? "rgba(239,68,68,0.08)" : enhanceResult.success ? "rgba(74,222,128,0.08)" : "rgba(251,191,36,0.06)",
            border: `1px solid ${enhanceResult.destroyed ? "rgba(239,68,68,0.25)" : enhanceResult.success ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.15)"}`,
            animation: animating ? "enhanceFlash 0.5s ease-out" : "none",
            boxShadow: enhanceResult.success ? `0 0 24px ${getColorInfo(enhanceResult.toColor?.toLowerCase?.() ?? "white").glow}` : enhanceResult.destroyed ? "0 0 24px rgba(239,68,68,0.2)" : "none",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "4px" }}>
              {enhanceResult.destroyed ? "💔" : enhanceResult.success ? "✨" : "😢"}
            </div>
            <p style={{
              fontSize: "14px", fontWeight: 700, margin: "0 0 2px",
              color: enhanceResult.destroyed ? "#ef4444" : enhanceResult.success ? "#4ade80" : "#fbbf24",
            }}>
              {enhanceResult.destroyed ? "裝備碎裂消失！" : enhanceResult.success ? "強化成功！" : "強化失敗（裝備保留）"}
            </p>
            <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 6px" }}>
              {enhanceResult.message}
            </p>
            {!enhanceResult.destroyed && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: enhanceResult.fromColorHex }}>+{enhanceResult.fromLevel}</span>
                <span style={{ color: "#64748b" }}>→</span>
                <span style={{
                  fontSize: "16px", fontWeight: 700, color: enhanceResult.toColorHex,
                  textShadow: enhanceResult.success ? `0 0 8px ${enhanceResult.toColorHex}60` : "none",
                }}>+{enhanceResult.toLevel}</span>
              </div>
            )}
            {enhanceResult.bonusLevels > 1 && (
              <p style={{ fontSize: "10px", color: "#fbbf24", marginTop: "4px" }}>
                黃卷加成：一次提升了 {enhanceResult.bonusLevels} 級！
              </p>
            )}
          </div>
        )}

        {/* ═══ 區域 2：裝備選擇（底部） ═══ */}
        <div style={{
          padding: "10px", borderRadius: "12px",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <Shield size={13} style={{ color: "#94a3b8" }} />
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>選擇裝備</span>
            <span style={{ fontSize: "10px", color: "#475569", marginLeft: "auto" }}>{equipments.length} 件</span>
          </div>
          {equipments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ fontSize: "16px", marginBottom: "2px" }}>🎒</p>
              <p style={{ fontSize: "10px", color: "#475569" }}>背包中沒有裝備</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "280px", overflowY: "auto" }}>
              {equipments.map((eq) => {
                const enhLv = eq.enhanceLevel ?? 0;
                const colorKey = getEnhanceColorKey(enhLv);
                const c = getColorInfo(colorKey);
                const isSelected = selectedInvId === eq.invId;
                return (
                  <button key={eq.invId} onClick={() => { setSelectedInvId(eq.invId); setSelectedScrollId(null); setEnhanceResult(null); }} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "7px 10px", borderRadius: "8px", cursor: "pointer",
                    background: isSelected ? `${c.hex}12` : "rgba(255,255,255,0.01)",
                    border: isSelected ? `2px solid ${c.hex}50` : "1px solid rgba(255,255,255,0.04)",
                    color: "#e2e8f0", textAlign: "left", width: "100%", transition: "all 0.15s",
                  }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "6px",
                      background: `${c.hex}12`, border: `1px solid ${c.hex}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", fontWeight: 700, color: c.hex, flexShrink: 0,
                      boxShadow: enhLv >= 6 ? `0 0 6px ${c.glow}` : "none",
                    }}>+{enhLv}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                        <span style={{ color: c.hex, fontSize: "10px" }}>[{c.label}]</span>
                        <span className="truncate">{eq.name}</span>
                        {eq.quality && eq.quality !== "common" && (
                          <span style={{ fontSize: "8px", padding: "0 3px", borderRadius: "3px", background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
                            {QUALITY_ZH[eq.quality] ?? eq.quality}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "9px", color: "#64748b", display: "flex", gap: "4px" }}>
                        <span>{SLOT_LABEL[eq.slot ?? ""] ?? eq.slot ?? "裝備"}</span>
                        {eq.isEquipped && <span style={{ color: "#4ade80" }}>已裝備</span>}
                        {(eq.attackBonus ?? 0) > 0 && <span style={{ color: "#f97316" }}>攻+{eq.attackBonus}</span>}
                        {(eq.defenseBonus ?? 0) > 0 && <span style={{ color: "#3b82f6" }}>防+{eq.defenseBonus}</span>}
                      </div>
                    </div>
                    <ChevronRight size={12} style={{ color: "#475569", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ 強化日誌（可收合） ═══ */}
        {showLogs && (
          <div style={{
            padding: "10px", borderRadius: "12px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
              <History size={12} style={{ color: "#94a3b8" }} />
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>強化記錄</span>
            </div>
            {logsQuery.isLoading ? (
              <p style={{ fontSize: "10px", color: "#475569", textAlign: "center", padding: "12px 0" }}>載入中...</p>
            ) : !logsQuery.data || logsQuery.data.length === 0 ? (
              <p style={{ fontSize: "10px", color: "#475569", textAlign: "center", padding: "12px 0" }}>尚無強化記錄</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "250px", overflowY: "auto" }}>
                {logsQuery.data.map((log: any) => (
                  <div key={log.id} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "5px 7px", borderRadius: "6px",
                    background: log.result === "success" ? "rgba(74,222,128,0.04)" : log.result === "fail_destroy" ? "rgba(239,68,68,0.04)" : "rgba(251,191,36,0.04)",
                  }}>
                    <span style={{ fontSize: "12px" }}>
                      {log.result === "success" ? "✅" : log.result === "fail_destroy" ? "💔" : "❌"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "#e2e8f0" }}>
                        {log.equipName} +{log.fromLevel} → {log.toLevel === -999 ? "💥消失" : `+${log.toLevel}`}
                      </div>
                      <div style={{ fontSize: "8px", color: "#475569" }}>
                        {new Date(log.createdAt).toLocaleString()} · 成功率 {(log.successRate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 等級表彈窗 ═══ */}
      {showLevelGuide && (
        <ModalOverlay onClose={() => setShowLevelGuide(false)} title="強化等級色階">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "12px" }}>
            {Array.from({ length: 21 }, (_, i) => {
              const colorKeys = ["white","green","blue","purple","orange","red","gold","platinum","cyan","skyblue","starpurple","deepred","flameorange","lavagold","destinyyellow","artifactcyan","legendwhite","ancientsilver","chaosmag","holywhite","rainbow"];
              const c = getColorInfo(colorKeys[i]);
              const isActive = info && i === info.currentLevel;
              return (
                <div key={i} style={{
                  textAlign: "center", padding: "5px 2px", borderRadius: "6px",
                  background: isActive ? `${c.hex}25` : `${c.hex}08`,
                  border: isActive ? `2px solid ${c.hex}` : `1px solid ${c.hex}20`,
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: c.hex }}>+{i}</div>
                  <div style={{ fontSize: "8px", color: c.hex, opacity: 0.8 }}>{c.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", fontSize: "10px" }}>
            <div style={{ padding: "6px", borderRadius: "6px", background: "rgba(74,222,128,0.08)", textAlign: "center" }}>
              <div style={{ color: "#4ade80", fontWeight: 600 }}>武器安定</div>
              <div style={{ color: "#94a3b8" }}>+0 ~ +6</div>
            </div>
            <div style={{ padding: "6px", borderRadius: "6px", background: "rgba(96,165,250,0.08)", textAlign: "center" }}>
              <div style={{ color: "#60a5fa", fontWeight: 600 }}>防具安定</div>
              <div style={{ color: "#94a3b8" }}>+0 ~ +4</div>
            </div>
            <div style={{ padding: "6px", borderRadius: "6px", background: "rgba(167,139,250,0.08)", textAlign: "center" }}>
              <div style={{ color: "#a78bfa", fontWeight: 600 }}>飾品安定</div>
              <div style={{ color: "#94a3b8" }}>+0 ~ +2</div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══ 完整預覽彈窗 ═══ */}
      {showFullPreview && selectedInvId && (
        <ModalOverlay onClose={() => setShowFullPreview(false)} title={`強化路線預覽 ${fullPreviewQuery.data ? `— ${fullPreviewQuery.data.equipName}` : ""}`}>
          {fullPreviewQuery.isLoading ? (
            <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", padding: "20px 0" }}>載入中...</p>
          ) : fullPreviewQuery.data ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>等級</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>色階</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>加成%</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#ef4444", fontWeight: 600 }}>攻</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#3b82f6", fontWeight: 600 }}>防</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#22c55e", fontWeight: 600 }}>速</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#f97316", fontWeight: 600 }}>HP</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#4ade80", fontWeight: 600 }}>成功</th>
                    <th style={{ padding: "5px 3px", textAlign: "center", color: "#ef4444", fontWeight: 600 }}>爆裝</th>
                  </tr>
                </thead>
                <tbody>
                  {fullPreviewQuery.data.levels.map((lv: any) => {
                    const c = getColorInfo(lv.color);
                    return (
                      <tr key={lv.level} style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: lv.isCurrent ? `${c.hex}12` : "transparent",
                      }}>
                        <td style={{ padding: "4px 3px", textAlign: "center", fontWeight: lv.isCurrent ? 700 : 400, color: c.hex }}>
                          +{lv.level}{lv.isCurrent ? " ◀" : ""}
                        </td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: c.hex, fontWeight: 600 }}>{lv.colorLabel}</td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: "#e2e8f0" }}>+{Math.round(lv.bonusPercent * 100)}%</td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: "#ef4444" }}>{lv.attackBonus}</td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: "#3b82f6" }}>{lv.defenseBonus}</td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: "#22c55e" }}>{lv.speedBonus}</td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: "#f97316" }}>{lv.hpBonus}</td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: lv.isSafe ? "#4ade80" : "#fbbf24" }}>
                          {lv.level === 0 ? "-" : lv.isSafe ? "100%" : `${(lv.successRate * 100).toFixed(1)}%`}
                        </td>
                        <td style={{ padding: "4px 3px", textAlign: "center", color: lv.destroyRate > 0 ? "#ef4444" : "#4ade80" }}>
                          {lv.level === 0 ? "-" : lv.destroyRate > 0 ? `${Math.round(lv.destroyRate * 100)}%` : "無"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", padding: "20px 0" }}>無法載入預覽資料</p>
          )}
        </ModalOverlay>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes enhanceFlash {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── 小組件 ─────────────────────────────────────────────

function IconBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${active ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "6px", padding: "4px 8px", color: active ? "#fbbf24" : "#94a3b8",
      fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px",
    }}>
      {icon} {label}
    </button>
  );
}

function LevelBadge({ level, hex, label, size = "md" }: { level: number; hex: string; label: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? 34 : 44;
  const fs = size === "sm" ? 14 : 18;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: `${s}px`, height: `${s}px`, borderRadius: "8px",
        background: `${hex}12`, border: `1px solid ${hex}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: `${fs}px`, fontWeight: 700, color: hex,
      }}>+{level}</div>
      <div style={{ fontSize: "8px", color: "#64748b", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: "6px 3px", borderRadius: "6px", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ fontSize: "9px", color: "#64748b", marginBottom: "1px" }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: "8px", color: "#475569" }}>{sub}</div>}
    </div>
  );
}

function ModalOverlay({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }} onClick={onClose}>
      <div style={{
        background: "#0f1a2e", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px", padding: "16px", maxWidth: "460px", width: "100%",
        maxHeight: "80vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "6px",
            padding: "4px", cursor: "pointer", color: "#94a3b8", display: "flex",
          }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
