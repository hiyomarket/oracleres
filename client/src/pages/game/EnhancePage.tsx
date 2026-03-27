/**
 * EnhancePage.tsx
 * 裝備強化系統前端頁面
 * 六色分級：白(+0) / 綠(+1) / 藍(+2) / 紫(+3) / 橙(+4) / 紅(+5)
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Sparkles, Shield, Swords, Heart, Zap, AlertTriangle, History, ChevronRight } from "lucide-react";
import { Link } from "wouter";

// ─── 顏色映射 ─────────────────────────────────────────
const COLOR_MAP: Record<string, { hex: string; label: string; glow: string }> = {
  white:  { hex: "#94a3b8", label: "白", glow: "rgba(148,163,184,0.3)" },
  green:  { hex: "#4ade80", label: "綠", glow: "rgba(74,222,128,0.4)" },
  blue:   { hex: "#60a5fa", label: "藍", glow: "rgba(96,165,250,0.4)" },
  purple: { hex: "#a78bfa", label: "紫", glow: "rgba(167,139,250,0.5)" },
  orange: { hex: "#fb923c", label: "橙", glow: "rgba(251,146,60,0.5)" },
  red:    { hex: "#ef4444", label: "紅", glow: "rgba(239,68,68,0.6)" },
};

const SLOT_LABEL: Record<string, string> = {
  weapon: "武器", helmet: "頭盔", armor: "鎧甲", shoes: "鞋子",
  accessory: "飾品", offhand: "副手",
};

export default function EnhancePage() {
  const { user } = useAuth();
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
  const [selectedScrollId, setSelectedScrollId] = useState<string | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [animating, setAnimating] = useState(false);

  // ─── 查詢背包裝備 ─────────────────────────────────────
  const equipQuery = trpc.gameWorld.getInventory.useQuery(undefined, {
    enabled: !!user,
    staleTime: 10000,
  });

  // 過濾出裝備類
  const equipments = useMemo(() => {
    if (!equipQuery.data) return [];
    return (equipQuery.data as any[]).filter((i: any) => i.itemType === "equipment");
  }, [equipQuery.data]);

  // ─── 強化資訊 ─────────────────────────────────────
  const enhanceInfoQuery = trpc.equipEnhance.getEnhanceInfo.useQuery(
    { inventoryId: selectedInvId! },
    { enabled: !!selectedInvId, staleTime: 5000 }
  );

  // ─── 卷軸背包 ─────────────────────────────────────
  const scrollQuery = trpc.equipEnhance.getScrollInventory.useQuery(undefined, {
    enabled: !!user,
    staleTime: 10000,
  });

  // ─── 強化等級資訊 ─────────────────────────────────────
  const levelsQuery = trpc.equipEnhance.getEnhanceLevels.useQuery(undefined, {
    staleTime: 60000,
  });

  // ─── 強化日誌 ─────────────────────────────────────
  const logsQuery = trpc.equipEnhance.getEnhanceLogs.useQuery(
    { limit: 20 },
    { enabled: showLogs, staleTime: 5000 }
  );

  // ─── 強化 mutation ─────────────────────────────────────
  const utils = trpc.useUtils();
  const enhanceMutation = trpc.equipEnhance.enhanceEquip.useMutation({
    onSuccess: (result) => {
      setEnhanceResult(result);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 2000);
      // 重新查詢
      utils.equipEnhance.getEnhanceInfo.invalidate();
      utils.equipEnhance.getScrollInventory.invalidate();
      utils.gameWorld.getInventory.invalidate();
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

  // 適用的卷軸
  const applicableScrolls = useMemo(() => {
    if (!scrollQuery.data || !enhanceInfoQuery.data) return [];
    const slot = enhanceInfoQuery.data.slot;
    return scrollQuery.data.filter(s => {
      if (s.scrollType === "weapon_scroll") return slot === "weapon";
      return ["helmet", "armor", "shoes", "accessory", "offhand"].includes(slot);
    });
  }, [scrollQuery.data, enhanceInfoQuery.data]);

  const info = enhanceInfoQuery.data;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0e1a 0%, #0f1a2e 50%, #0a1220 100%)",
      color: "#e2e8f0",
    }}>
      {/* 頂部導航 */}
      <div style={{
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: "12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)",
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
        <button
          onClick={() => setShowLogs(!showLogs)}
          style={{
            marginLeft: "auto", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", padding: "6px 12px", color: "#94a3b8", fontSize: "12px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "4px",
          }}
        >
          <History size={14} /> 記錄
        </button>
      </div>

      <div style={{ padding: "16px", maxWidth: "480px", margin: "0 auto" }}>

        {/* ═══ 強化等級一覽 ═══ */}
        {levelsQuery.data && (
          <div style={{
            marginBottom: "16px", padding: "12px", borderRadius: "12px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px", fontWeight: 600 }}>強化等級一覽</p>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
              {levelsQuery.data.levels.map(l => {
                const c = COLOR_MAP[l.color] ?? COLOR_MAP.white;
                return (
                  <div key={l.level} style={{
                    flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: "8px",
                    background: `${c.hex}10`, border: `1px solid ${c.hex}30`,
                    opacity: info && l.level === info.currentLevel ? 1 : 0.5,
                    transform: info && l.level === info.currentLevel ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.3s",
                  }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: c.hex }}>+{l.level}</div>
                    <div style={{ fontSize: "10px", color: c.hex }}>{c.label}</div>
                    <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>
                      {l.level < (levelsQuery.data?.safeLevel ?? 2) ? "安定" : `${Math.round(l.successRate * 100)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ 選擇裝備 ═══ */}
        <div style={{
          marginBottom: "16px", padding: "12px", borderRadius: "12px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>
            <Shield size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
            選擇要強化的裝備
          </p>
          {equipments.length === 0 ? (
            <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", padding: "16px 0" }}>
              背包中沒有裝備
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
              {equipments.map((eq: any) => {
                const enhLv = (eq.itemData as any)?.enhanceLevel ?? 0;
                const c = COLOR_MAP[["white","green","blue","purple","orange","red"][enhLv] ?? "white"] ?? COLOR_MAP.white;
                const isSelected = selectedInvId === eq.id;
                return (
                  <button
                    key={eq.id}
                    onClick={() => { setSelectedInvId(eq.id); setSelectedScrollId(null); setEnhanceResult(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 12px", borderRadius: "8px", cursor: "pointer",
                      background: isSelected ? `${c.hex}15` : "rgba(255,255,255,0.02)",
                      border: isSelected ? `2px solid ${c.hex}60` : "1px solid rgba(255,255,255,0.06)",
                      color: "#e2e8f0", textAlign: "left", transition: "all 0.2s",
                    }}
                  >
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "6px",
                      background: `${c.hex}20`, border: `1px solid ${c.hex}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "14px", fontWeight: 700, color: c.hex,
                    }}>
                      +{enhLv}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>
                        <span style={{ color: c.hex }}>[{c.label}]</span> {eq.name ?? eq.itemId}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>
                        {SLOT_LABEL[eq.slot] ?? eq.slot ?? "裝備"} · {eq.isEquipped ? "已裝備" : "背包中"}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: "#475569" }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ 強化資訊 ═══ */}
        {info && (
          <div style={{
            marginBottom: "16px", padding: "16px", borderRadius: "12px",
            background: `${(COLOR_MAP[info.currentColor] ?? COLOR_MAP.white).hex}08`,
            border: `1px solid ${(COLOR_MAP[info.currentColor] ?? COLOR_MAP.white).hex}20`,
          }}>
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "8px 16px", borderRadius: "12px",
                background: `${info.currentColorHex}15`,
                boxShadow: `0 0 20px ${(COLOR_MAP[info.currentColor] ?? COLOR_MAP.white).glow}`,
              }}>
                <span style={{ fontSize: "20px", fontWeight: 700, color: info.currentColorHex }}>
                  +{info.currentLevel}
                </span>
                <span style={{ fontSize: "14px", color: info.currentColorHex, fontWeight: 600 }}>
                  {info.currentColorLabel}色
                </span>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, margin: "8px 0 0", color: "#e2e8f0" }}>
                {info.equipName}
              </p>
            </div>

            {info.canEnhance && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", margin: "12px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: info.currentColorHex }}>+{info.currentLevel}</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{info.currentColorLabel}色</div>
                  </div>
                  <div style={{ fontSize: "18px", color: "#fbbf24" }}>→</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: info.nextColorHex }}>+{info.nextLevel}</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{info.nextColorLabel}色</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "12px" }}>
                  <div style={{ textAlign: "center", padding: "6px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>成功率</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: info.isSafe ? "#4ade80" : (info.successRate >= 0.5 ? "#fbbf24" : "#ef4444") }}>
                      {info.isSafe ? "安定" : `${Math.round(info.successRate * 100)}%`}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "6px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>數值加成</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#60a5fa" }}>
                      +{Math.round(info.statBonus * 100)}% → +{Math.round(info.nextStatBonus * 100)}%
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "6px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>消失風險</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: info.destroyChance > 0 ? "#ef4444" : "#4ade80" }}>
                      {info.destroyChance > 0 ? `${Math.round(info.destroyChance * 100)}%` : "無"}
                    </div>
                  </div>
                </div>

                {/* 基礎數值預覽 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "12px" }}>
                  {info.baseStats.hp > 0 && (
                    <StatPreview icon={<Heart size={12} />} label="生命" base={info.baseStats.hp} bonus={info.statBonus} nextBonus={info.nextStatBonus} color="#ef4444" />
                  )}
                  {info.baseStats.attack > 0 && (
                    <StatPreview icon={<Swords size={12} />} label="攻擊" base={info.baseStats.attack} bonus={info.statBonus} nextBonus={info.nextStatBonus} color="#f97316" />
                  )}
                  {info.baseStats.defense > 0 && (
                    <StatPreview icon={<Shield size={12} />} label="防禦" base={info.baseStats.defense} bonus={info.statBonus} nextBonus={info.nextStatBonus} color="#3b82f6" />
                  )}
                  {info.baseStats.speed > 0 && (
                    <StatPreview icon={<Zap size={12} />} label="速度" base={info.baseStats.speed} bonus={info.statBonus} nextBonus={info.nextStatBonus} color="#22c55e" />
                  )}
                </div>

                {!info.isSafe && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 10px", borderRadius: "6px",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    marginBottom: "12px",
                  }}>
                    <AlertTriangle size={12} style={{ color: "#ef4444" }} />
                    <p style={{ fontSize: "10px", color: "#ef4444", margin: 0 }}>
                      超過安定值（+2），失敗會退一階，有 1% 機率裝備消失！
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ 選擇卷軸 ═══ */}
        {info && info.canEnhance && (
          <div style={{
            marginBottom: "16px", padding: "12px", borderRadius: "12px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>
              <Sparkles size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
              選擇強化卷軸
            </p>
            {applicableScrolls.length === 0 ? (
              <p style={{ fontSize: "11px", color: "#475569", textAlign: "center", padding: "16px 0" }}>
                背包中沒有適用的強化卷軸
                <br />
                <span style={{ fontSize: "10px" }}>
                  {info.slot === "weapon" ? "需要「武器強化卷軸」" : "需要「防具強化卷軸」"}
                </span>
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {applicableScrolls.map(s => {
                  const isSelected = selectedScrollId === s.itemId;
                  return (
                    <button
                      key={s.itemId}
                      onClick={() => setSelectedScrollId(s.itemId)}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "8px 12px", borderRadius: "8px", cursor: "pointer",
                        background: isSelected ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.02)",
                        border: isSelected ? "2px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.06)",
                        color: "#e2e8f0", textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "6px",
                        background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px",
                      }}>
                        📜
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {s.scrollType === "weapon_scroll" ? "武器專用" : "防具/飾品專用"} · 剩餘 {s.quantity} 個
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
            }}
          >
            {enhanceMutation.isPending ? "強化中..." : `強化 → +${info.nextLevel}（${info.nextColorLabel}色）`}
          </button>
        )}

        {/* ═══ 強化結果 ═══ */}
        {enhanceResult && (
          <div style={{
            marginBottom: "16px", padding: "16px", borderRadius: "12px", textAlign: "center",
            background: enhanceResult.destroyed
              ? "rgba(239,68,68,0.1)"
              : enhanceResult.success
                ? "rgba(74,222,128,0.1)"
                : "rgba(251,191,36,0.1)",
            border: `1px solid ${enhanceResult.destroyed ? "rgba(239,68,68,0.3)" : enhanceResult.success ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.3)"}`,
            animation: animating ? "pulse 0.5s ease-in-out" : "none",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              {enhanceResult.destroyed ? "💔" : enhanceResult.success ? "✨" : "😢"}
            </div>
            <p style={{
              fontSize: "14px", fontWeight: 700, margin: "0 0 4px",
              color: enhanceResult.destroyed ? "#ef4444" : enhanceResult.success ? "#4ade80" : "#fbbf24",
            }}>
              {enhanceResult.destroyed ? "裝備碎裂消失！" : enhanceResult.success ? "強化成功！" : "強化失敗"}
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              {enhanceResult.message}
            </p>
            {!enhanceResult.destroyed && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: enhanceResult.fromColorHex }}>
                  +{enhanceResult.fromLevel} {enhanceResult.fromColor}
                </span>
                <span style={{ color: "#64748b" }}>→</span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: enhanceResult.toColorHex }}>
                  +{enhanceResult.toLevel} {enhanceResult.toColor}
                </span>
              </div>
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
                    padding: "6px 8px", borderRadius: "6px",
                    background: log.result === "success" ? "rgba(74,222,128,0.05)" : log.result === "fail_destroy" ? "rgba(239,68,68,0.05)" : "rgba(251,191,36,0.05)",
                  }}>
                    <span style={{ fontSize: "14px" }}>
                      {log.result === "success" ? "✅" : log.result === "fail_destroy" ? "💔" : "❌"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>
                        {log.equipName} +{log.fromLevel} → {log.toLevel === -999 ? "消失" : `+${log.toLevel}`}
                      </div>
                      <div style={{ fontSize: "9px", color: "#64748b" }}>
                        {new Date(log.createdAt).toLocaleString()}
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
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

// ─── 數值預覽小組件 ─────────────────────────────────────
function StatPreview({ icon, label, base, bonus, nextBonus, color }: {
  icon: React.ReactNode; label: string; base: number; bonus: number; nextBonus: number; color: string;
}) {
  const current = Math.floor(base * (1 + bonus));
  const next = Math.floor(base * (1 + nextBonus));
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "4px 8px", borderRadius: "6px",
      background: `${color}08`, border: `1px solid ${color}20`,
    }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: "10px", color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: "11px", fontWeight: 600, color, marginLeft: "auto" }}>
        {current} → {next}
      </span>
    </div>
  );
}
