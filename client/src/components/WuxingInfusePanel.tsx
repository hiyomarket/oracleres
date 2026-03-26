/**
 * WuxingInfusePanel.tsx
 * 五行注靈互動面板 — 全螢幕 Modal
 *
 * 功能：
 * 1. 五行雷達圖即時預覽
 * 2. 批量加點（+1 / +5 / +10 / 自訂）
 * 3. 預覽模式（加點前先預覽數值變化）
 * 4. 加點歷史記錄
 * 5. 五行相生相剋提示
 * 6. 戰鬥數值即時預覽
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── 五行定義 ──────────────────────────────────────────────────
const WUXING_DEFS = [
  { key: "wood",  zh: "木", stat: "體力/HP",  color: "#4ade80", icon: "🌿", desc: "增加最大生命值與採集能力" },
  { key: "fire",  zh: "火", stat: "力量/ATK", color: "#f87171", icon: "🔥", desc: "增加物理攻擊力與鍛造能力" },
  { key: "earth", zh: "土", stat: "強度/DEF", color: "#fbbf24", icon: "⛰️", desc: "增加防禦力與負重能力" },
  { key: "metal", zh: "金", stat: "速度/SPD", color: "#e5e7eb", icon: "⚔️", desc: "增加速度與命中率" },
  { key: "water", zh: "水", stat: "魔法/MP",  color: "#60a5fa", icon: "🌊", desc: "增加魔力與尋寶能力" },
] as const;

type WuxingKey = "wood" | "fire" | "earth" | "metal" | "water";

// 五行相生相剋
const WUXING_RELATIONS = {
  generate: [
    { from: "木", to: "火", desc: "木生火" },
    { from: "火", to: "土", desc: "火生土" },
    { from: "土", to: "金", desc: "土生金" },
    { from: "金", to: "水", desc: "金生水" },
    { from: "水", to: "木", desc: "水生木" },
  ],
  overcome: [
    { from: "木", to: "土", desc: "木剋土" },
    { from: "土", to: "水", desc: "土剋水" },
    { from: "水", to: "火", desc: "水剋火" },
    { from: "火", to: "金", desc: "火剋金" },
    { from: "金", to: "木", desc: "金剋木" },
  ],
};

// ── 五行雷達圖 ────────────────────────────────────────────────
function WuxingRadar({
  values,
  previewValues,
  maxVal = 150,
}: {
  values: Record<WuxingKey, number>;
  previewValues?: Record<WuxingKey, number>;
  maxVal?: number;
}) {
  const cx = 120, cy = 120, r = 90;
  const keys = WUXING_DEFS.map(d => d.key);
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;

  const getPoint = (idx: number, val: number) => {
    const angle = startAngle + idx * angleStep;
    const ratio = Math.min(val / maxVal, 1);
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  };

  // 背景網格
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPaths = gridLevels.map(level => {
    const points = keys.map((_, i) => getPoint(i, maxVal * level));
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  });

  // 當前值多邊形
  const currentPoints = keys.map((k, i) => getPoint(i, values[k]));
  const currentPath = currentPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  // 預覽值多邊形
  let previewPath = "";
  if (previewValues) {
    const previewPoints = keys.map((k, i) => getPoint(i, previewValues[k]));
    previewPath = previewPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  }

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {/* 背景網格 */}
      {gridPaths.map((path, i) => (
        <path key={i} d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      ))}
      {/* 軸線 */}
      {keys.map((_, i) => {
        const p = getPoint(i, maxVal);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />;
      })}
      {/* 預覽多邊形 */}
      {previewPath && (
        <path d={previewPath} fill="rgba(255,200,50,0.15)" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" />
      )}
      {/* 當前值多邊形 */}
      <path d={currentPath} fill="rgba(100,200,255,0.2)" stroke="#60a5fa" strokeWidth="1.5" />
      {/* 頂點圓點 + 標籤 */}
      {keys.map((k, i) => {
        const def = WUXING_DEFS[i];
        const labelPoint = getPoint(i, maxVal * 1.2);
        const dotPoint = getPoint(i, values[k]);
        return (
          <g key={k}>
            <circle cx={dotPoint.x} cy={dotPoint.y} r="3" fill={def.color} />
            {previewValues && previewValues[k] !== values[k] && (
              <circle cx={getPoint(i, previewValues[k]).x} cy={getPoint(i, previewValues[k]).y} r="3" fill="#fbbf24" stroke="#fff" strokeWidth="0.5" />
            )}
            <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" fill={def.color} fontSize="11" fontWeight="bold">
              {def.icon} {def.zh}
            </text>
            <text x={labelPoint.x} y={labelPoint.y + 13} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
              {values[k]}{previewValues && previewValues[k] !== values[k] ? ` → ${previewValues[k]}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── 主面板組件 ────────────────────────────────────────────────
interface WuxingInfusePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function WuxingInfusePanel({ open, onClose }: WuxingInfusePanelProps) {
  const [selectedElement, setSelectedElement] = useState<WuxingKey | null>(null);
  const [batchCount, setBatchCount] = useState(1);
  const [showRelations, setShowRelations] = useState(false);
  const [tab, setTab] = useState<"infuse" | "preview" | "history">("infuse");

  const { data: infuseStatus, refetch: refetchInfuse } = trpc.gameWorld.getInfuseStatus.useQuery(undefined, { enabled: open });
  const utils = trpc.useUtils();

  const infuseMut = trpc.gameWorld.manualInfuse.useMutation({
    onSuccess: (res) => {
      const WX_ZH: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
      toast.success(`${WX_ZH[res.element]} +${res.count}（${res.oldVal} → ${res.newVal}）`, {
        description: `消耗 ${res.goldCost} 金幣 + ${res.stoneCost} 靈石`,
      });
      refetchInfuse();
      utils.gameAvatar.getEquipped.invalidate();
      setSelectedElement(null);
      setBatchCount(1);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // 預覽數值
  const previewWuxing = useMemo(() => {
    if (!infuseStatus || !selectedElement) return undefined;
    const preview = { ...infuseStatus.currentWuxing };
    preview[selectedElement] = (preview[selectedElement] ?? 0) + batchCount;
    return preview;
  }, [infuseStatus, selectedElement, batchCount]);

  // 計算批量代價
  const batchCost = useMemo(() => {
    if (!infuseStatus) return { gold: 0, stones: 0 };
    let totalGold = 0;
    let totalStones = 0;
    const usedPoints = infuseStatus.usedPoints;
    for (let i = 0; i < batchCount; i++) {
      const tier = Math.floor((usedPoints + i) / 10);
      totalGold += 100 + tier * 50;
      totalStones += 5 + tier * 3;
    }
    return { gold: totalGold, stones: totalStones };
  }, [infuseStatus, batchCount]);

  const handleInfuse = useCallback(() => {
    if (!selectedElement || !infuseStatus) return;
    infuseMut.mutate({ element: selectedElement, count: batchCount });
  }, [selectedElement, batchCount, infuseStatus, infuseMut]);

  // 重置狀態
  useEffect(() => {
    if (!open) {
      setSelectedElement(null);
      setBatchCount(1);
      setTab("infuse");
    }
  }, [open]);

  if (!open) return null;

  const currentWuxing = infuseStatus?.currentWuxing ?? { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
  const remainingPoints = infuseStatus?.remainingPoints ?? 0;
  const maxBatch = Math.min(remainingPoints, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}>
      <div
        className="w-full sm:w-[95%] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* 頂部標題 */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3" style={{ background: "linear-gradient(180deg, #0f172a, transparent)" }}>
          <div>
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">✨</span> 五行注靈
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">手動分配五行屬性點數，打造專屬角色</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.1)" }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 點數狀態列 */}
        <div className="px-5 mb-4">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #818cf8, #6366f1)" }}>
                <span className="text-white text-lg font-bold">{remainingPoints}</span>
              </div>
              <div>
                <div className="text-white text-sm font-semibold">可用點數</div>
                <div className="text-gray-500 text-xs">Lv.{infuseStatus?.level ?? 1} · 已用 {infuseStatus?.usedPoints ?? 0} / {infuseStatus?.maxPoints ?? 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(255,200,50,0.1)" }}>
                <span className="text-xs">🪙</span>
                <span className="text-yellow-400 text-xs font-medium">{infuseStatus?.gold?.toLocaleString() ?? 0}</span>
              </div>
            </div>
          </div>
          {/* 進度條 */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${infuseStatus ? ((infuseStatus.usedPoints / infuseStatus.maxPoints) * 100) : 0}%`,
                background: "linear-gradient(90deg, #818cf8, #6366f1, #a855f7)",
              }}
            />
          </div>
        </div>

        {/* Tab 切換 */}
        <div className="flex gap-1 mx-5 mb-4 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
          {[
            { id: "infuse" as const, label: "注靈加點", icon: "✨" },
            { id: "preview" as const, label: "數值預覽", icon: "📊" },
            { id: "history" as const, label: "五行相生", icon: "☯" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? "rgba(99,102,241,0.3)" : "transparent",
                color: tab === t.id ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                border: tab === t.id ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── 注靈加點 Tab ── */}
        {tab === "infuse" && (
          <div className="px-5 pb-6">
            {/* 雷達圖 */}
            <div className="mb-4">
              <WuxingRadar
                values={currentWuxing}
                previewValues={previewWuxing}
              />
            </div>

            {/* 五行選擇格 */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {WUXING_DEFS.map((w) => {
                const val = currentWuxing[w.key] ?? 0;
                const isSelected = selectedElement === w.key;
                return (
                  <button
                    key={w.key}
                    onClick={() => setSelectedElement(isSelected ? null : w.key)}
                    disabled={remainingPoints <= 0}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all disabled:opacity-30"
                    style={{
                      background: isSelected ? `${w.color}25` : "rgba(255,255,255,0.03)",
                      border: isSelected ? `2px solid ${w.color}` : "1px solid rgba(255,255,255,0.08)",
                      transform: isSelected ? "scale(1.05)" : "scale(1)",
                      boxShadow: isSelected ? `0 0 20px ${w.color}30` : "none",
                    }}
                  >
                    <div className="text-xl">{w.icon}</div>
                    <div className="text-xs font-bold" style={{ color: w.color }}>{w.zh}</div>
                    <div className="text-white text-sm font-bold">{val}</div>
                    {isSelected && (
                      <div className="text-xs px-1.5 py-0.5 rounded-full mt-0.5" style={{ background: `${w.color}30`, color: w.color }}>
                        +{batchCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 選中後的詳情 */}
            {selectedElement && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{WUXING_DEFS.find(w => w.key === selectedElement)?.icon}</span>
                  <span className="text-white font-semibold">{WUXING_DEFS.find(w => w.key === selectedElement)?.zh}屬性</span>
                  <span className="text-gray-500 text-xs">— {WUXING_DEFS.find(w => w.key === selectedElement)?.desc}</span>
                </div>

                {/* 批量加點控制 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-400 text-sm">加點數量：</span>
                  <div className="flex gap-1.5">
                    {[1, 3, 5, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => setBatchCount(Math.min(n, maxBatch))}
                        disabled={n > maxBatch}
                        className="px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                        style={{
                          background: batchCount === n ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
                          color: batchCount === n ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                          border: batchCount === n ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 代價預覽 */}
                <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-gray-400 text-xs">消耗：</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🪙</span>
                    <span className="text-yellow-400 text-xs font-medium">{batchCost.gold.toLocaleString()}</span>
                  </div>
                  <span className="text-gray-600 text-xs">+</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">💎</span>
                    <span className="text-blue-400 text-xs font-medium">{batchCost.stones}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 確認按鈕 */}
            <button
              onClick={handleInfuse}
              disabled={!selectedElement || remainingPoints <= 0 || infuseMut.isPending}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30"
              style={{
                background: selectedElement
                  ? `linear-gradient(135deg, ${WUXING_DEFS.find(w => w.key === selectedElement)?.color}80, ${WUXING_DEFS.find(w => w.key === selectedElement)?.color}40)`
                  : "rgba(255,255,255,0.05)",
                color: selectedElement ? "#fff" : "rgba(255,255,255,0.3)",
                border: selectedElement ? `1px solid ${WUXING_DEFS.find(w => w.key === selectedElement)?.color}60` : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {infuseMut.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  注靈中...
                </span>
              ) : selectedElement ? (
                `注入 ${WUXING_DEFS.find(w => w.key === selectedElement)?.zh} +${batchCount}`
              ) : (
                "請選擇要注靈的五行屬性"
              )}
            </button>
          </div>
        )}

        {/* ── 數值預覽 Tab ── */}
        {tab === "preview" && (
          <div className="px-5 pb-6">
            <div className="mb-4">
              <WuxingRadar values={currentWuxing} previewValues={previewWuxing} />
            </div>

            {/* 五行數值對比 */}
            <div className="space-y-2">
              {WUXING_DEFS.map((w) => {
                const current = currentWuxing[w.key] ?? 0;
                const preview = previewWuxing?.[w.key] ?? current;
                const diff = preview - current;
                return (
                  <div key={w.key} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="text-lg w-8 text-center">{w.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: w.color }}>{w.zh} · {w.stat}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-white text-sm font-bold">{current}</span>
                          {diff > 0 && (
                            <>
                              <span className="text-gray-500 text-xs">→</span>
                              <span className="text-yellow-400 text-sm font-bold">{preview}</span>
                              <span className="text-green-400 text-xs">(+{diff})</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-500 relative" style={{ width: `${Math.min(100, (current / 150) * 100)}%`, background: w.color }}>
                          {diff > 0 && (
                            <div
                              className="absolute top-0 right-0 h-full rounded-full"
                              style={{
                                width: `${(diff / Math.max(current, 1)) * 100}%`,
                                background: "#fbbf24",
                                opacity: 0.7,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 戰鬥數值推算 */}
            <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-gray-400 text-xs mb-2">戰鬥數值（由五行屬性推導）</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: "HP", formula: "木×8 + 其他×2", color: "#4ade80" },
                  { label: "ATK", formula: "火×2.7 + 其他×0.3", color: "#f87171" },
                  { label: "DEF", formula: "土×2.7 + 其他×0.3", color: "#fbbf24" },
                  { label: "SPD", formula: "金×2.0 + 其他×0.2", color: "#e5e7eb" },
                  { label: "MP", formula: "水×10 + 其他×2", color: "#60a5fa" },
                  { label: "MATK", formula: "水×2.5 + 火×0.3", color: "#818cf8" },
                ].map(s => (
                  <div key={s.label} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="font-bold" style={{ color: s.color }}>{s.label}</div>
                    <div className="text-gray-600 mt-0.5" style={{ fontSize: "9px" }}>{s.formula}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 五行相生 Tab ── */}
        {tab === "history" && (
          <div className="px-5 pb-6">
            {/* 五行相生圖 */}
            <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-white text-sm font-semibold mb-3">五行相生</div>
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {WUXING_RELATIONS.generate.map((rel, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-sm px-2 py-1 rounded-lg" style={{ background: `${WUXING_DEFS.find(w => w.zh === rel.from)?.color}20`, color: WUXING_DEFS.find(w => w.zh === rel.from)?.color }}>
                      {rel.from}
                    </span>
                    <span className="text-green-400 text-xs">→</span>
                    <span className="text-sm px-2 py-1 rounded-lg" style={{ background: `${WUXING_DEFS.find(w => w.zh === rel.to)?.color}20`, color: WUXING_DEFS.find(w => w.zh === rel.to)?.color }}>
                      {rel.to}
                    </span>
                    {i < WUXING_RELATIONS.generate.length - 1 && <span className="text-gray-600 mx-1">·</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 五行相剋圖 */}
            <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-white text-sm font-semibold mb-3">五行相剋</div>
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {WUXING_RELATIONS.overcome.map((rel, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-sm px-2 py-1 rounded-lg" style={{ background: `${WUXING_DEFS.find(w => w.zh === rel.from)?.color}20`, color: WUXING_DEFS.find(w => w.zh === rel.from)?.color }}>
                      {rel.from}
                    </span>
                    <span className="text-red-400 text-xs">⊗</span>
                    <span className="text-sm px-2 py-1 rounded-lg" style={{ background: `${WUXING_DEFS.find(w => w.zh === rel.to)?.color}20`, color: WUXING_DEFS.find(w => w.zh === rel.to)?.color }}>
                      {rel.to}
                    </span>
                    {i < WUXING_RELATIONS.overcome.length - 1 && <span className="text-gray-600 mx-1">·</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 注靈策略建議 */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="text-indigo-300 text-sm font-semibold mb-2">注靈策略建議</div>
              <div className="space-y-2 text-xs text-gray-300">
                <p><span className="text-red-400 font-medium">火力型</span>：集中火屬性（ATK），搭配金屬性（SPD）先手打擊</p>
                <p><span className="text-green-400 font-medium">坦克型</span>：集中木屬性（HP），搭配土屬性（DEF）硬扛傷害</p>
                <p><span className="text-blue-400 font-medium">法師型</span>：集中水屬性（MP/MATK），搭配木屬性（HP）增加續航</p>
                <p><span className="text-yellow-400 font-medium">均衡型</span>：五行平均分配，泛用性強但無突出優勢</p>
                <p><span className="text-purple-400 font-medium">速攻型</span>：金+火雙修，高速高攻但脆皮</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
