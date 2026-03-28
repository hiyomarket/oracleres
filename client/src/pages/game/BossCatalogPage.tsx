/**
 * BossCatalogPage — Boss 圖鑑前台展示
 * 玩家可查看所有 Boss 的屬性、五行抗性、掉落物品
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const WX_LABEL: Record<string, string> = {
  wood: "🌲 木", fire: "🔥 火", earth: "🌍 土", metal: "⚔️ 金", water: "💧 水",
};
const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#94a3b8", water: "#38bdf8",
};
const TIER_LABEL: Record<number, string> = {
  1: "⭐ 普通", 2: "⭐⭐ 精英", 3: "⭐⭐⭐ 傳奇",
};
const TIER_COLOR: Record<number, string> = {
  1: "#22c55e", 2: "#f59e0b", 3: "#ef4444",
};

type BossCatalog = {
  id: number;
  bossCode: string;
  name: string;
  title?: string | null;
  tier: number;
  wuxing: string;
  level: number;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseMagicAttack?: number | null;
  baseMagicDefense?: number | null;
  baseMP?: number | null;
  skills?: any;
  dropTable?: any;
  goldDrop?: number | null;
  resistWood?: number | null;
  resistFire?: number | null;
  resistEarth?: number | null;
  resistMetal?: number | null;
  resistWater?: number | null;
  description?: string | null;
};

function ResistBar({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
      <span style={{ fontSize: "11px", width: "16px" }}>{icon}</span>
      <span style={{ fontSize: "10px", color: "#94a3b8", width: "28px" }}>{label}</span>
      <div style={{ flex: 1, height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}>
        <div style={{ height: "4px", borderRadius: "2px", width: `${Math.min(100, value * 2)}%`, background: color, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: "10px", fontWeight: 700, width: "30px", textAlign: "right", color: value > 0 ? color : "#475569" }}>{value}%</span>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: "11px", color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 700, color: color ?? "#e2e8f0" }}>{value}</span>
    </div>
  );
}

function BossCard({ boss, onClick, selected }: { boss: BossCatalog; onClick: () => void; selected: boolean }) {
  const ec = WX_HEX[boss.wuxing] ?? "#888";
  const tierColor = TIER_COLOR[boss.tier] ?? "#94a3b8";
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "12px",
        border: `1.5px solid ${selected ? ec : "rgba(255,255,255,0.08)"}`,
        background: selected ? `${ec}12` : "rgba(255,255,255,0.03)",
        padding: "12px",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: selected ? `0 0 16px ${ec}30` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `${ec}20`, border: `2px solid ${ec}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
          {WX_LABEL[boss.wuxing]?.split(" ")[0] ?? "👾"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{boss.name}</div>
          {boss.title && <div style={{ fontSize: "10px", color: "#64748b" }}>{boss.title}</div>}
        </div>
        <div style={{ fontSize: "10px", fontWeight: 700, color: tierColor, whiteSpace: "nowrap" }}>{TIER_LABEL[boss.tier] ?? "?"}</div>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: `${ec}18`, color: ec, border: `1px solid ${ec}40` }}>{WX_LABEL[boss.wuxing]}</span>
        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>Lv.{boss.level}</span>
        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>HP {boss.baseHp.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function BossCatalogPage() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterWx, setFilterWx] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<number>(0);

  const { data: bossList = [], isLoading } = trpc.roamingBoss.getPublicCatalogList.useQuery(undefined, { staleTime: 60000 });

  const filtered = (bossList as BossCatalog[]).filter(b => {
    if (filterWx !== "all" && b.wuxing !== filterWx) return false;
    if (filterTier > 0 && b.tier !== filterTier) return false;
    return true;
  });

  const selected = selectedId ? (bossList as BossCatalog[]).find(b => b.id === selectedId) : null;
  const ec = selected ? (WX_HEX[selected.wuxing] ?? "#888") : "#94a3b8";

  return (
    <div style={{ minHeight: "100vh", background: "#060a16", color: "#e2e8f0", fontFamily: "sans-serif" }}>
      {/* 頂部導航 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,10,22,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={() => navigate("/game")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px", padding: "4px" }}>←</button>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#ef4444" }}>👾 Boss 圖鑑</div>
          <div style={{ fontSize: "10px", color: "#475569" }}>共 {(bossList as BossCatalog[]).length} 隻 Boss</div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 57px)", overflow: "hidden" }}>
        {/* 左側列表 */}
        <div style={{ width: selected ? "45%" : "100%", maxWidth: selected ? "320px" : "none", overflowY: "auto", padding: "12px", borderRight: selected ? "1px solid rgba(255,255,255,0.06)" : "none", transition: "width 0.3s", flexShrink: 0 }}>
          {/* 篩選器 */}
          <div style={{ marginBottom: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {["all", "wood", "fire", "earth", "metal", "water"].map(wx => (
                <button key={wx} onClick={() => setFilterWx(wx)}
                  style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", cursor: "pointer", border: `1px solid ${filterWx === wx ? (WX_HEX[wx] ?? "#94a3b8") : "rgba(255,255,255,0.1)"}`, background: filterWx === wx ? `${WX_HEX[wx] ?? "#94a3b8"}20` : "rgba(255,255,255,0.03)", color: filterWx === wx ? (WX_HEX[wx] ?? "#e2e8f0") : "#64748b" }}>
                  {wx === "all" ? "全部" : WX_LABEL[wx]}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[0, 1, 2, 3].map(t => (
                <button key={t} onClick={() => setFilterTier(t)}
                  style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", cursor: "pointer", border: `1px solid ${filterTier === t ? (TIER_COLOR[t] ?? "#94a3b8") : "rgba(255,255,255,0.1)"}`, background: filterTier === t ? `${TIER_COLOR[t] ?? "#94a3b8"}20` : "rgba(255,255,255,0.03)", color: filterTier === t ? (TIER_COLOR[t] ?? "#e2e8f0") : "#64748b" }}>
                  {t === 0 ? "全等級" : TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#475569" }}>載入中...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#475569" }}>尚無 Boss 圖鑑資料</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered.map(boss => (
                <BossCard key={boss.id} boss={boss} selected={selectedId === boss.id} onClick={() => setSelectedId(selectedId === boss.id ? null : boss.id)} />
              ))}
            </div>
          )}
        </div>

        {/* 右側詳情 */}
        {selected && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {/* Boss 標題 */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: `${ec}20`, border: `2px solid ${ec}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", flexShrink: 0 }}>
                {WX_LABEL[selected.wuxing]?.split(" ")[0] ?? "👾"}
              </div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#e2e8f0" }}>{selected.name}</div>
                {selected.title && <div style={{ fontSize: "12px", color: "#64748b" }}>{selected.title}</div>}
                <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: `${ec}18`, color: ec, border: `1px solid ${ec}40` }}>{WX_LABEL[selected.wuxing]}</span>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: `${TIER_COLOR[selected.tier] ?? "#94a3b8"}18`, color: TIER_COLOR[selected.tier] ?? "#94a3b8", border: `1px solid ${TIER_COLOR[selected.tier] ?? "#94a3b8"}40` }}>{TIER_LABEL[selected.tier]}</span>
                  <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>Lv.{selected.level}</span>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>

            {selected.description && (
              <div style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "12px", fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
                {selected.description}
              </div>
            )}

            {/* 基礎屬性 */}
            <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>⚔️ 基礎屬性</div>
              <StatRow label="❤️ 最大 HP" value={selected.baseHp.toLocaleString()} color="#ef4444" />
              <StatRow label="💧 最大 MP" value={(selected.baseMP ?? 0).toLocaleString()} color="#38bdf8" />
              <StatRow label="⚔️ 攻擊力" value={selected.baseAttack} color="#f59e0b" />
              <StatRow label="🛡️ 防禦力" value={selected.baseDefense} color="#22c55e" />
              <StatRow label="🏃 速度" value={selected.baseSpeed} color="#94a3b8" />
              {(selected.baseMagicAttack ?? 0) > 0 && <StatRow label="✨ 魔法攻擊" value={selected.baseMagicAttack!} color="#a855f7" />}
              {(selected.baseMagicDefense ?? 0) > 0 && <StatRow label="🔮 魔法防禦" value={selected.baseMagicDefense!} color="#6366f1" />}
            </div>

            {/* 五行抗性 */}
            <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>🛡️ 五行抗性</div>
              <ResistBar label="抗木" icon="🌲" value={selected.resistWood ?? 0} color="#22c55e" />
              <ResistBar label="抗火" icon="🔥" value={selected.resistFire ?? 0} color="#ef4444" />
              <ResistBar label="抗土" icon="🌍" value={selected.resistEarth ?? 0} color="#f59e0b" />
              <ResistBar label="抗金" icon="⚔️" value={selected.resistMetal ?? 0} color="#94a3b8" />
              <ResistBar label="抗水" icon="💧" value={selected.resistWater ?? 0} color="#38bdf8" />
              <div style={{ marginTop: "6px", fontSize: "10px", color: "#475569" }}>
                💡 使用對應弱點屬性技能可造成更高傷害
              </div>
            </div>

            {/* 技能 */}
            {selected.skills && Array.isArray(selected.skills) && selected.skills.length > 0 && (
              <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>✨ 技能</div>
                {(selected.skills as Array<{ name?: string; element?: string; description?: string; damage?: number; type?: string }>).map((sk, i) => (
                  <div key={i} style={{ padding: "6px 8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", marginBottom: "4px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: WX_HEX[sk.element ?? ""] ?? "#e2e8f0" }}>{sk.name ?? "未知技能"}</span>
                      {sk.element && <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: `${WX_HEX[sk.element] ?? "#888"}20`, color: WX_HEX[sk.element] ?? "#888" }}>{WX_LABEL[sk.element]}</span>}
                      {sk.type && <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "#64748b" }}>{sk.type}</span>}
                    </div>
                    {sk.description && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{sk.description}</div>}
                    {sk.damage && <div style={{ fontSize: "10px", color: "#f59e0b", marginTop: "1px" }}>傷害倍率：×{sk.damage}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* 掉落物品 */}
            {((selected.dropTable && Array.isArray(selected.dropTable) && selected.dropTable.length > 0) || (selected.goldDrop ?? 0) > 0) && (
              <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>🎁 掉落物品</div>
                {(selected.goldDrop ?? 0) > 0 && (
                  <div style={{ padding: "6px 8px", borderRadius: "8px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px" }}>💰</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#f59e0b" }}>金幣 {selected.goldDrop}</span>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>（固定掉落）</span>
                  </div>
                )}
                {selected.dropTable && Array.isArray(selected.dropTable) && (selected.dropTable as Array<{ itemId?: string; itemName?: string; chance?: number; quantity?: number }>).map((drop, i) => (
                  <div key={i} style={{ padding: "6px 8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", marginBottom: "4px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px" }}>📦</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>{drop.itemName ?? drop.itemId ?? "未知物品"}</div>
                      {drop.quantity && drop.quantity > 1 && <div style={{ fontSize: "10px", color: "#64748b" }}>數量：×{drop.quantity}</div>}
                    </div>
                    {drop.chance !== undefined && (
                      <div style={{ fontSize: "11px", fontWeight: 700, color: drop.chance >= 50 ? "#22c55e" : drop.chance >= 20 ? "#f59e0b" : "#ef4444" }}>
                        {drop.chance}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
