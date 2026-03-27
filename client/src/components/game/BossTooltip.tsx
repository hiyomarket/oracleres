/**
 * BossTooltip.tsx — Boss 懸停詳細資訊彈出卡片
 * 在地圖節點的怪物列表中，滑鼠懸停 Boss 行時顯示完整屬性、技能、掉落物等
 * 手機端改為點擊展開/收合
 */
import { useState } from "react";

// 五行顏色
const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#a3a322", metal: "#f59e0b", water: "#3b82f6",
  "木": "#22c55e", "火": "#ef4444", "土": "#a3a322", "金": "#f59e0b", "水": "#3b82f6",
};
const WX_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
  "木": "🌿", "火": "🔥", "土": "🪨", "金": "⚡", "水": "💧",
};

type BossMonster = {
  id: string;
  name: string;
  element: string;
  level: number;
  hp: number;
  isBoss?: boolean;
  description?: string;
  attack?: number;
  defense?: number;
  speed?: number;
  rarity?: string;
  skills?: string[];
  race?: string;
  expReward?: number;
  dropItems?: Array<{ itemId: string; chance: number }>;
};

export function BossMonsterRow({
  m,
  onChallenge,
}: {
  m: BossMonster;
  onChallenge?: (monsterId: string, monsterName: string, isBoss?: boolean) => void;
}) {
  const mc = WX_HEX[m.element] ?? "#888";
  const isBossMonster = m.isBoss;
  const [showDetail, setShowDetail] = useState(false);

  if (!isBossMonster) {
    // 普通怪物 — 保持原樣
    return (
      <div className="flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all"
        style={{
          background: `${mc}08`,
          borderColor: `${mc}25`,
        }}>
        <span className="text-sm shrink-0">{WX_EMOJI[m.element] ?? "👾"}</span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm" style={{ color: mc }}>{m.name}</span>
          {m.description && <p className="text-xs truncate text-slate-600">{m.description}</p>}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <p className="font-bold text-xs text-slate-300">Lv.{m.level}</p>
          <p className="text-red-400 text-xs">HP {typeof m.hp === "number" ? m.hp.toLocaleString() : m.hp}</p>
          {onChallenge && (
            <button
              onClick={() => onChallenge(m.id, m.name, m.isBoss)}
              className="text-[10px] px-2 py-0.5 font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: `${mc}25`, color: mc, border: `1px solid ${mc}40` }}>
              ⚔️ 挑戰
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══ Boss 怪物 — 帶懸停 / 點擊展開的詳細資訊 ═══
  return (
    <div className="relative group">
      {/* Boss 主行 */}
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-3 relative overflow-hidden cursor-pointer transition-all"
        style={{
          background: `rgba(220,38,38,0.12)`,
          borderColor: `rgba(220,38,38,0.5)`,
          boxShadow: `0 0 12px rgba(220,38,38,0.35), 0 0 24px rgba(220,38,38,0.15)`,
        }}
        onClick={() => setShowDetail(v => !v)}
      >
        {/* Boss 紅光脈動背景 */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, rgba(220,38,38,0.15) 0%, transparent 70%)`,
            animation: "pulse 2s ease-in-out infinite",
          }} />
        {/* Boss 大頭像 */}
        <div className="shrink-0 relative" style={{ width: 48, height: 48 }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black"
            style={{
              background: `radial-gradient(circle, rgba(220,38,38,0.3) 0%, rgba(220,38,38,0.05) 100%)`,
              border: `2px solid rgba(220,38,38,0.6)`,
              boxShadow: `0 0 8px rgba(220,38,38,0.5), inset 0 0 6px rgba(220,38,38,0.2)`,
              color: "#ef4444",
            }}>
            👹
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500"
            style={{ animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite", boxShadow: "0 0 6px rgba(239,68,68,0.8)" }} />
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-base" style={{ color: "#ef4444" }}>{m.name}</span>
            <span className="text-xs px-2 py-0.5 rounded font-black tracking-wider"
              style={{
                background: "linear-gradient(135deg, rgba(220,38,38,0.3), rgba(245,158,11,0.3))",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.4)",
                textShadow: "0 0 4px rgba(245,158,11,0.5)",
              }}>
              ☠️ BOSS
            </span>
            {/* 懸停提示 */}
            <span className="text-[9px] text-red-400/40 hidden sm:inline ml-1">(懸停查看詳情)</span>
          </div>
          {m.description && <p className="text-xs truncate text-red-300/70">{m.description}</p>}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1 relative z-10">
          <p className="font-bold text-sm text-red-300">Lv.{m.level}</p>
          <p className="text-red-400 text-sm font-bold">HP {typeof m.hp === "number" ? m.hp.toLocaleString() : m.hp}</p>
          {onChallenge && (
            <button
              onClick={(e) => { e.stopPropagation(); onChallenge(m.id, m.name, m.isBoss); }}
              className="text-xs px-3 py-1 font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: `rgba(220,38,38,0.25)`, color: "#fca5a5", border: `1px solid rgba(220,38,38,0.5)` }}>
              ⚔️ 挑戰 Boss
            </button>
          )}
        </div>
      </div>

      {/* ═══ 懸停彈出卡片（桌面端 hover 顯示） ═══ */}
      <div
        className="absolute left-0 right-0 top-full mt-1 z-50 hidden sm:block opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto"
        style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.6))" }}
      >
        <BossDetailCard m={m} mc={mc} />
      </div>

      {/* ═══ 點擊展開（手機端） ═══ */}
      {showDetail && (
        <div className="sm:hidden mt-1 z-50" style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.6))" }}>
          <BossDetailCard m={m} mc={mc} />
        </div>
      )}
    </div>
  );
}

// ─── Boss 詳細資訊卡片內容 ───
function BossDetailCard({ m, mc }: { m: BossMonster; mc: string }) {
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(15,5,5,0.97) 0%, rgba(30,10,10,0.97) 100%)",
        borderColor: "rgba(220,38,38,0.4)",
        backdropFilter: "blur(12px)",
      }}>
      {/* 頭部標題列 */}
      <div className="px-3 py-2.5 flex items-center gap-2"
        style={{ background: "linear-gradient(90deg, rgba(220,38,38,0.2) 0%, transparent 100%)", borderBottom: "1px solid rgba(220,38,38,0.2)" }}>
        <span className="text-xl">👹</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-red-400 truncate">{m.name}</p>
          <p className="text-[10px] text-red-300/60">
            {m.rarity === "legendary" ? "🌟 傳說級" : "🔥 Boss級"}
            {m.race && ` · ${m.race}`}
          </p>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(220,38,38,0.2)", color: "#fca5a5" }}>Lv.{m.level}</span>
      </div>

      {/* 屬性數值區 */}
      <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <StatRow icon="❤️" label="血量" value={typeof m.hp === "number" ? m.hp.toLocaleString() : String(m.hp)} color="#fca5a5" />
        <StatRow icon="⚔️" label="攻擊" value={m.attack != null ? String(m.attack) : "???"} color="#fdba74" />
        <StatRow icon="🛡️" label="防禦" value={m.defense != null ? String(m.defense) : "???"} color="#93c5fd" />
        <StatRow icon="💨" label="速度" value={m.speed != null ? String(m.speed) : "???"} color="#86efac" />
        <StatRow icon="✨" label="經驗" value={m.expReward != null ? String(m.expReward) : "???"} color="#fde047" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">🌊 屬性</span>
          <span className="text-xs font-bold" style={{ color: mc }}>
            {WX_EMOJI[m.element] ?? ""} {m.element}
          </span>
        </div>
      </div>

      {/* 技能區 */}
      {m.skills && m.skills.length > 0 && (
        <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(220,38,38,0.15)" }}>
          <p className="text-[10px] text-slate-500 mb-1.5">💥 Boss 技能</p>
          <div className="flex flex-wrap gap-1">
            {m.skills.map((sk, si) => (
              <span key={si} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: "rgba(220,38,38,0.15)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.25)" }}>
                {sk}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 掉落物區 */}
      {m.dropItems && m.dropItems.length > 0 && (
        <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(220,38,38,0.15)" }}>
          <p className="text-[10px] text-slate-500 mb-1.5">🎁 可能掉落</p>
          <div className="flex flex-wrap gap-1">
            {m.dropItems.map((d, di) => (
              <span key={di} className="text-[10px] px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
                {d.itemId} ({Math.round(d.chance * 100)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 描述區 */}
      {m.description && (
        <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(220,38,38,0.15)" }}>
          <p className="text-[10px] text-red-300/60 italic leading-relaxed">"{m.description}"</p>
        </div>
      )}

      {/* 底部警告提示 */}
      <div className="px-3 py-1.5 text-center"
        style={{ background: "rgba(220,38,38,0.08)", borderTop: "1px solid rgba(220,38,38,0.1)" }}>
        <p className="text-[9px] text-red-400/40">⚠️ 危險生物 · 請做好充分準備再挑戰</p>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-500">{icon} {label}</span>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default BossMonsterRow;
