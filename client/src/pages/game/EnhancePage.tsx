/**
 * EnhancePage.tsx
 * 裝備強化系統前端頁面（天堂模式 +0 到 +20）
 * 使用 equipEnhance router 的完整 API
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Sparkles, Shield, Swords, Heart, Zap, AlertTriangle, History, ChevronRight, Star, Flame, Skull } from "lucide-react";
import { Link } from "wouter";

// ─── 21 色等級映射（對應 enhanceEngine 的 ENHANCE_LEVELS） ─────
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
  const [showLogs, setShowLogs] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showLevelGuide, setShowLevelGuide] = useState(false);

  // ─── 查詢背包裝備（使用 getInventoryEquipments 取得完整圖鑑資料） ───
  const equipQuery = trpc.gameWorld.getInventoryEquipments.useQuery(
    undefined,
    { enabled: !!user, staleTime: 10000 }
  );

  // 過濾出未裝備的裝備（已裝備的也可以強化）
  const equipments = useMemo(() => {
    if (!equipQuery.data) return [];
    return equipQuery.data;
  }, [equipQuery.data]);

  // ─── 強化資訊 ───
  const enhanceInfoQuery = trpc.equipEnhance.getEnhanceInfo.useQuery(
    { inventoryId: selectedInvId! },
    { enabled: !!selectedInvId, staleTime: 5000 }
  );

  // ─── 卷軸背包 ───
  const scrollQuery = trpc.equipEnhance.getScrollInventory.useQuery(undefined, {
    enabled: !!user,
    staleTime: 10000,
  });

  // ─── 強化日誌 ───
  const logsQuery = trpc.equipEnhance.getEnhanceLogs.useQuery(
    { limit: 20 },
    { enabled: showLogs, staleTime: 5000 }
  );

  // ─── 強化 mutation ───
  const utils = trpc.useUtils();
  const enhanceMutation = trpc.equipEnhance.enhanceEquip.useMutation({
    onSuccess: (result) => {
      setEnhanceResult(result);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 2500);
      // 如果裝備爆了，清除選擇
      if (result.destroyed) {
        setTimeout(() => setSelectedInvId(null), 1500);
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
    enhanceMutation.mutate({
      inventoryId: selectedInvId,
      scrollItemId: selectedScrollId,
    });
  }, [selectedInvId, selectedScrollId, enhanceMutation]);

  // 適用的卷軸（根據裝備部位篩選）
  const applicableScrolls = useMemo(() => {
    if (!scrollQuery.data || !enhanceInfoQuery.data) return [];
    const slot = enhanceInfoQuery.data.slot;
    const isWeapon = ["weapon", "offhand"].includes(slot);
    return scrollQuery.data.filter(s => {
      if (s.scrollType === "weapon_scroll" || s.scrollType === "blessed_weapon_scroll") return isWeapon;
      return !isWeapon; // armor/blessed_armor for non-weapon slots
    });
  }, [scrollQuery.data, enhanceInfoQuery.data]);

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
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/game">
          <button style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} style={{ color: "#fbbf24" }} />
          <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>裝備強化</h1>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          <button
            onClick={() => setShowLevelGuide(!showLevelGuide)}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px", padding: "6px 10px", color: "#94a3b8", fontSize: "11px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            <Star size={12} /> 等級表
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            style={{
              background: showLogs ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${showLogs ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "8px", padding: "6px 10px", color: showLogs ? "#fbbf24" : "#94a3b8",
              fontSize: "11px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "4px",
            }}
          >
            <History size={12} /> 記錄
          </button>
        </div>
      </div>

      <div style={{ padding: "16px", maxWidth: "480px", margin: "0 auto" }}>

        {/* ═══ 強化等級一覽（可收合） ═══ */}
        {showLevelGuide && (
          <div style={{
            marginBottom: "16px", padding: "12px", borderRadius: "12px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px", fontWeight: 600 }}>
              強化等級色階（+0 ~ +20）
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
              {Array.from({ length: 21 }, (_, i) => {
                const colorKeys = ["white","green","blue","purple","orange","red","gold","platinum","cyan","skyblue","starpurple","deepred","flameorange","lavagold","destinyyellow","artifactcyan","legendwhite","ancientsilver","chaosmag","holywhite","rainbow"];
                const c = getColorInfo(colorKeys[i]);
                const isActive = info && i === info.currentLevel;
                return (
                  <div key={i} style={{
                    textAlign: "center", padding: "4px 2px", borderRadius: "6px",
                    background: isActive ? `${c.hex}25` : `${c.hex}08`,
                    border: isActive ? `2px solid ${c.hex}` : `1px solid ${c.hex}20`,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.3s",
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: c.hex }}>+{i}</div>
                    <div style={{ fontSize: "8px", color: c.hex, opacity: 0.8 }}>{c.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", fontSize: "9px", color: "#64748b" }}>
              <div style={{ padding: "4px", borderRadius: "4px", background: "rgba(74,222,128,0.08)" }}>
                <span style={{ color: "#4ade80" }}>安定值</span>：武器+6 / 防具+4 / 飾品+2
              </div>
              <div style={{ padding: "4px", borderRadius: "4px", background: "rgba(251,191,36,0.08)" }}>
                <span style={{ color: "#fbbf24" }}>黃卷</span>：爆裝率減半，成功+1~3
              </div>
              <div style={{ padding: "4px", borderRadius: "4px", background: "rgba(239,68,68,0.08)" }}>
                <span style={{ color: "#ef4444" }}>天堂模式</span>：失敗=爆裝（無退階）
              </div>
            </div>
          </div>
        )}

        {/* ═══ 步驟 1：選擇裝備 ═══ */}
        <div style={{
          marginBottom: "16px", padding: "12px", borderRadius: "12px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%",
              background: "linear-gradient(135deg, #fbbf24, #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 700, color: "#0a0e1a",
            }}>1</div>
            <p style={{ fontSize: "12px", color: "#e2e8f0", margin: 0, fontWeight: 600 }}>選擇要強化的裝備</p>
          </div>
          {equipments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: "20px", marginBottom: "4px" }}>🎒</p>
              <p style={{ fontSize: "11px", color: "#475569" }}>背包中沒有裝備</p>
              <p style={{ fontSize: "10px", color: "#334155" }}>擊敗怪物或到商店購買裝備</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "220px", overflowY: "auto" }}>
              {equipments.map((eq) => {
                const enhLv = eq.enhanceLevel ?? 0;
                const colorKey = getEnhanceColorKey(enhLv);
                const c = getColorInfo(colorKey);
                const isSelected = selectedInvId === eq.invId;
                return (
                  <button
                    key={eq.invId}
                    onClick={() => { setSelectedInvId(eq.invId); setSelectedScrollId(null); setEnhanceResult(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 12px", borderRadius: "10px", cursor: "pointer",
                      background: isSelected ? `${c.hex}15` : "rgba(255,255,255,0.02)",
                      border: isSelected ? `2px solid ${c.hex}60` : "1px solid rgba(255,255,255,0.06)",
                      color: "#e2e8f0", textAlign: "left", transition: "all 0.2s",
                      width: "100%",
                    }}
                  >
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "8px",
                      background: `${c.hex}15`, border: `1px solid ${c.hex}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "14px", fontWeight: 700, color: c.hex,
                      boxShadow: enhLv >= 6 ? `0 0 8px ${c.glow}` : "none",
                    }}>
                      +{enhLv}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                        <span style={{ color: c.hex }}>[{c.label}]</span>
                        <span className="truncate">{eq.name}</span>
                        {eq.quality && eq.quality !== "common" && (
                          <span style={{ fontSize: "9px", padding: "1px 4px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>
                            {QUALITY_ZH[eq.quality] ?? eq.quality}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", display: "flex", gap: "6px" }}>
                        <span>{SLOT_LABEL[eq.slot ?? ""] ?? eq.slot ?? "裝備"}</span>
                        <span>{eq.isEquipped ? "✅ 已裝備" : "背包中"}</span>
                        {(eq.attackBonus ?? 0) > 0 && <span style={{ color: "#f97316" }}>攻+{eq.attackBonus}</span>}
                        {(eq.defenseBonus ?? 0) > 0 && <span style={{ color: "#3b82f6" }}>防+{eq.defenseBonus}</span>}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: "#475569", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ 步驟 2：強化資訊面板 ═══ */}
        {info && (
          <div style={{
            marginBottom: "16px", padding: "16px", borderRadius: "12px",
            background: `${getColorInfo(info.currentColor).hex}06`,
            border: `1px solid ${getColorInfo(info.currentColor).hex}20`,
            position: "relative", overflow: "hidden",
          }}>
            {/* 背景光暈 */}
            {info.currentLevel >= 6 && (
              <div style={{
                position: "absolute", top: "-30px", right: "-30px",
                width: "100px", height: "100px", borderRadius: "50%",
                background: `radial-gradient(circle, ${getColorInfo(info.currentColor).glow}, transparent)`,
                opacity: 0.4,
              }} />
            )}

            {/* 裝備名稱和等級 */}
            <div style={{ textAlign: "center", marginBottom: "12px", position: "relative" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "8px 20px", borderRadius: "12px",
                background: `${info.currentColorHex}12`,
                boxShadow: info.currentLevel >= 6 ? `0 0 20px ${getColorInfo(info.currentColor).glow}` : "none",
              }}>
                <span style={{ fontSize: "22px", fontWeight: 700, color: info.currentColorHex }}>
                  +{info.currentLevel}
                </span>
                <span style={{ fontSize: "14px", color: info.currentColorHex, fontWeight: 600 }}>
                  {info.currentColorLabel}色
                </span>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, margin: "8px 0 0", color: "#e2e8f0" }}>
                {info.equipName}
              </p>
              <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0" }}>
                {SLOT_LABEL[info.slot] ?? info.slot} · 安定值 +{info.safeLevel}
              </p>
            </div>

            {info.canEnhance && (
              <>
                {/* 升級預覽箭頭 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", margin: "12px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "10px",
                      background: `${info.currentColorHex}15`, border: `1px solid ${info.currentColorHex}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px", fontWeight: 700, color: info.currentColorHex,
                    }}>+{info.currentLevel}</div>
                    <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>{info.currentColorLabel}</div>
                  </div>
                  <div style={{ fontSize: "20px", color: "#fbbf24", animation: "pulse 1.5s infinite" }}>→</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "10px",
                      background: `${info.nextColorHex}15`, border: `1px solid ${info.nextColorHex}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px", fontWeight: 700, color: info.nextColorHex,
                    }}>+{info.nextLevel}</div>
                    <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>{info.nextColorLabel}</div>
                  </div>
                </div>

                {/* 成功率 / 加成 / 風險 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "12px" }}>
                  <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>成功率</div>
                    <div style={{
                      fontSize: "16px", fontWeight: 700,
                      color: info.isSafe ? "#4ade80" : (info.successRate >= 0.1 ? "#fbbf24" : "#ef4444"),
                    }}>
                      {info.isSafe ? "100%" : `${(info.successRate * 100).toFixed(1)}%`}
                    </div>
                    {info.isSafe && <div style={{ fontSize: "9px", color: "#4ade80" }}>安定範圍</div>}
                  </div>
                  <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>數值加成</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#60a5fa" }}>
                      +{Math.round(info.nextStatBonus * 100)}%
                    </div>
                    <div style={{ fontSize: "9px", color: "#475569" }}>
                      現 +{Math.round(info.statBonus * 100)}%
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>
                      <Skull size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> 爆裝風險
                    </div>
                    <div style={{
                      fontSize: "16px", fontWeight: 700,
                      color: info.destroyRate > 0 ? "#ef4444" : "#4ade80",
                    }}>
                      {info.destroyRate > 0 ? `${Math.round(info.destroyRate * 100)}%` : "無"}
                    </div>
                  </div>
                </div>

                {/* 屬性加成預覽 */}
                {info.currentPreview && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "12px" }}>
                    {(info.currentPreview.hpBonus ?? 0) > 0 && (
                      <StatPreview icon={<Heart size={12} />} label="生命" current={info.currentPreview.hpBonus} next={info.nextPreview?.hpBonus ?? 0} color="#ef4444" />
                    )}
                    {(info.currentPreview.attackBonus ?? 0) > 0 && (
                      <StatPreview icon={<Swords size={12} />} label="攻擊" current={info.currentPreview.attackBonus} next={info.nextPreview?.attackBonus ?? 0} color="#f97316" />
                    )}
                    {(info.currentPreview.defenseBonus ?? 0) > 0 && (
                      <StatPreview icon={<Shield size={12} />} label="防禦" current={info.currentPreview.defenseBonus} next={info.nextPreview?.defenseBonus ?? 0} color="#3b82f6" />
                    )}
                    {(info.currentPreview.speedBonus ?? 0) > 0 && (
                      <StatPreview icon={<Zap size={12} />} label="速度" current={info.currentPreview.speedBonus} next={info.nextPreview?.speedBonus ?? 0} color="#22c55e" />
                    )}
                  </div>
                )}

                {/* 危險警告 */}
                {!info.isSafe && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 10px", borderRadius: "8px",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    marginBottom: "8px",
                  }}>
                    <AlertTriangle size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: "11px", color: "#ef4444", margin: 0, fontWeight: 600 }}>
                        天堂模式：超過安定值後失敗即爆裝！
                      </p>
                      <p style={{ fontSize: "9px", color: "#94a3b8", margin: "2px 0 0" }}>
                        裝備將永久消失，無法恢復。黃卷可降低爆裝率。
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
            {!info.canEnhance && (
              <div style={{
                textAlign: "center", padding: "12px", borderRadius: "8px",
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
              }}>
                <p style={{ fontSize: "14px", color: "#fbbf24", margin: 0, fontWeight: 700 }}>
                  已達最高強化等級 +{info.currentLevel}
                </p>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0 0" }}>
                  此裝備已達到巔峰，無法繼續強化
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ 步驟 3：選擇卷軸 ═══ */}
        {info && info.canEnhance && (
          <div style={{
            marginBottom: "16px", padding: "12px", borderRadius: "12px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: "linear-gradient(135deg, #fbbf24, #f97316)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700, color: "#0a0e1a",
              }}>2</div>
              <p style={{ fontSize: "12px", color: "#e2e8f0", margin: 0, fontWeight: 600 }}>選擇強化卷軸</p>
            </div>
            {applicableScrolls.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: "20px", marginBottom: "4px" }}>📜</p>
                <p style={{ fontSize: "11px", color: "#475569" }}>
                  背包中沒有適用的強化卷軸
                </p>
                <p style={{ fontSize: "10px", color: "#334155" }}>
                  {["weapon", "offhand"].includes(info.slot)
                    ? "需要「武器強化卷軸」（白武卷/黃武卷）"
                    : "需要「防具強化卷軸」（白防卷/黃防卷）"}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {applicableScrolls.map(s => {
                  const isSelected = selectedScrollId === s.itemId;
                  const isBlessed = s.isBlessed;
                  const scrollColor = isBlessed ? "#fbbf24" : "#94a3b8";
                  return (
                    <button
                      key={s.itemId}
                      onClick={() => setSelectedScrollId(s.itemId)}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 12px", borderRadius: "10px", cursor: "pointer",
                        background: isSelected ? `${scrollColor}12` : "rgba(255,255,255,0.02)",
                        border: isSelected ? `2px solid ${scrollColor}50` : "1px solid rgba(255,255,255,0.06)",
                        color: "#e2e8f0", textAlign: "left", width: "100%",
                      }}
                    >
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "8px",
                        background: isBlessed ? "rgba(251,191,36,0.15)" : "rgba(148,163,184,0.1)",
                        border: `1px solid ${isBlessed ? "rgba(251,191,36,0.3)" : "rgba(148,163,184,0.2)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px",
                      }}>
                        {isBlessed ? "✨" : "📜"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: isBlessed ? "#fbbf24" : "#e2e8f0" }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {isBlessed ? "爆裝率減半·成功+1~3" : "標準強化+1"} · 剩餘 {s.quantity}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ 強化按鈕 ═══ */}
        {info && info.canEnhance && selectedScrollId && (
          <button
            onClick={handleEnhance}
            disabled={enhanceMutation.isPending}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px",
              background: enhanceMutation.isPending
                ? "rgba(251,191,36,0.2)"
                : "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
              border: "none", color: "#0a0e1a", fontSize: "15px", fontWeight: 700,
              cursor: enhanceMutation.isPending ? "wait" : "pointer",
              marginBottom: "16px",
              boxShadow: "0 4px 20px rgba(251,191,36,0.3)",
              transition: "all 0.3s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <Flame size={18} />
            {enhanceMutation.isPending ? "強化中..." : `開始強化 → +${info.nextLevel}（${info.nextColorLabel}色）`}
          </button>
        )}

        {/* ═══ 強化結果 ═══ */}
        {enhanceResult && (
          <div style={{
            marginBottom: "16px", padding: "20px 16px", borderRadius: "12px", textAlign: "center",
            background: enhanceResult.destroyed
              ? "rgba(239,68,68,0.1)"
              : enhanceResult.success
                ? "rgba(74,222,128,0.1)"
                : "rgba(251,191,36,0.08)",
            border: `1px solid ${enhanceResult.destroyed ? "rgba(239,68,68,0.3)" : enhanceResult.success ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.2)"}`,
            animation: animating ? "enhanceFlash 0.6s ease-out" : "none",
            boxShadow: enhanceResult.success
              ? `0 0 30px ${getColorInfo(enhanceResult.toColor?.toLowerCase?.() ?? "white").glow}`
              : enhanceResult.destroyed
                ? "0 0 30px rgba(239,68,68,0.3)"
                : "none",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>
              {enhanceResult.destroyed ? "💔" : enhanceResult.success ? "✨" : "😢"}
            </div>
            <p style={{
              fontSize: "16px", fontWeight: 700, margin: "0 0 4px",
              color: enhanceResult.destroyed ? "#ef4444" : enhanceResult.success ? "#4ade80" : "#fbbf24",
            }}>
              {enhanceResult.destroyed ? "裝備碎裂消失！" : enhanceResult.success ? "強化成功！" : "強化失敗（裝備保留）"}
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 8px" }}>
              {enhanceResult.message}
            </p>
            {!enhanceResult.destroyed && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "8px" }}>
                <div style={{
                  padding: "4px 12px", borderRadius: "8px",
                  background: `${enhanceResult.fromColorHex}15`,
                }}>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: enhanceResult.fromColorHex }}>
                    +{enhanceResult.fromLevel}
                  </span>
                </div>
                <span style={{ color: "#64748b", fontSize: "16px" }}>→</span>
                <div style={{
                  padding: "4px 12px", borderRadius: "8px",
                  background: `${enhanceResult.toColorHex}15`,
                  boxShadow: enhanceResult.success ? `0 0 12px ${enhanceResult.toColorHex}40` : "none",
                }}>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: enhanceResult.toColorHex }}>
                    +{enhanceResult.toLevel}
                  </span>
                </div>
              </div>
            )}
            {enhanceResult.bonusLevels > 1 && (
              <p style={{ fontSize: "11px", color: "#fbbf24", marginTop: "6px" }}>
                黃卷加成：一次提升了 {enhanceResult.bonusLevels} 級！
              </p>
            )}
          </div>
        )}

        {/* ═══ 強化日誌 ═══ */}
        {showLogs && (
          <div style={{
            padding: "12px", borderRadius: "12px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>
              <History size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
              強化記錄
            </p>
            {logsQuery.isLoading ? (
              <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", padding: "16px 0" }}>載入中...</p>
            ) : !logsQuery.data || logsQuery.data.length === 0 ? (
              <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", padding: "16px 0" }}>尚無強化記錄</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>
                {logsQuery.data.map((log: any) => (
                  <div key={log.id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "6px 8px", borderRadius: "8px",
                    background: log.result === "success" ? "rgba(74,222,128,0.05)" : log.result === "fail_destroy" ? "rgba(239,68,68,0.05)" : "rgba(251,191,36,0.05)",
                  }}>
                    <span style={{ fontSize: "14px" }}>
                      {log.result === "success" ? "✅" : log.result === "fail_destroy" ? "💔" : "❌"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>
                        {log.equipName} +{log.fromLevel} → {log.toLevel === -999 ? "💥消失" : `+${log.toLevel}`}
                      </div>
                      <div style={{ fontSize: "9px", color: "#64748b" }}>
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

// ─── 根據等級取得顏色 key ─────────────────────────────────────
function getEnhanceColorKey(level: number): string {
  const keys = ["white","green","blue","purple","orange","red","gold","platinum","cyan","skyblue","starpurple","deepred","flameorange","lavagold","destinyyellow","artifactcyan","legendwhite","ancientsilver","chaosmag","holywhite","rainbow"];
  return keys[Math.min(level, 20)] ?? "white";
}

// ─── 數值預覽小組件 ─────────────────────────────────────
function StatPreview({ icon, label, current, next, color }: {
  icon: React.ReactNode; label: string; current: number; next: number; color: string;
}) {
  const diff = next - current;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "5px 8px", borderRadius: "8px",
      background: `${color}08`, border: `1px solid ${color}20`,
    }}>
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "10px", color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: "11px", fontWeight: 600, color, marginLeft: "auto" }}>
        {current} → {next}
        {diff > 0 && <span style={{ color: "#4ade80", fontSize: "9px", marginLeft: "2px" }}>+{diff}</span>}
      </span>
    </div>
  );
}
