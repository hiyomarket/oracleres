/**
 * SkillTreePanel — 職業技能樹面板
 *
 * 顯示當前職業可學技能、學習條件、命格加成等
 * 整合到 CharacterPanel 的技能頁籤中
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { WX_HEX, WX_ZH, type AgentData } from "./constants";

// ─── 職業中文名 ───
const PROF_ZH: Record<string, string> = {
  hunter: "獵人", mage: "法師", tank: "鬥士", thief: "盜賊", wizard: "巫師", none: "無職業",
};
const PROF_EMOJI: Record<string, string> = {
  hunter: "🏹", mage: "🔮", tank: "🛡️", thief: "🗡️", wizard: "🧙", none: "👤",
};

// ─── 技能階級配色 ───
const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  basic:        { label: "初階", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
  intermediate: { label: "中階", color: "#38bdf8", bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.2)" },
  advanced:     { label: "高階", color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)" },
  destiny:      { label: "天命", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  legendary:    { label: "傳說", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
};

// ─── 命格中文名 ───
const FATE_ZH: Record<string, string> = {
  wood: "青龍命", fire: "朱雀命", earth: "麒麟命", metal: "白虎命", water: "玄武命",
};

interface SkillTreePanelProps {
  agent: AgentData | null;
  learnedSkillIds: Set<string>;
}

export function SkillTreePanel({ agent, learnedSkillIds }: SkillTreePanelProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>("basic");
  const [filterElement, setFilterElement] = useState<string>("");

  const profession = agent?.profession ?? "none";
  const fateElement = agent?.fateElement ?? agent?.dominantElement ?? "wood";
  const agentLevel = agent?.level ?? 1;

  // 查詢技能目錄
  const skillCatalogQuery = trpc.gameWorld.getSkillCatalogForPlayer.useQuery(undefined, {
    staleTime: 60000,
  });

  // 按職業和階級分組技能
  const groupedSkills = useMemo(() => {
    const allSkills = skillCatalogQuery.data ?? [];
    const groups: Record<string, typeof allSkills> = {
      basic: [],
      intermediate: [],
      advanced: [],
      destiny: [],
      legendary: [],
    };

    for (const skill of allSkills) {
      // 過濾：只顯示當前職業可學的 + 無職業限制的
      const profReq = (skill as any).professionRequired ?? "none";
      if (profReq !== "none" && profReq !== profession) continue;

      // 五行篩選
      if (filterElement && skill.element !== filterElement) continue;

      const tier = (skill as any).skillTier ?? "basic";
      if (groups[tier]) {
        groups[tier].push(skill);
      } else {
        groups.basic.push(skill);
      }
    }

    return groups;
  }, [skillCatalogQuery.data, profession, filterElement]);

  // 計算五行點數
  const agentWuxing: Record<string, number> = {
    wood: agent?.wuxingWood ?? 0,
    fire: agent?.wuxingFire ?? 0,
    earth: agent?.wuxingEarth ?? 0,
    metal: agent?.wuxingMetal ?? 0,
    water: agent?.wuxingWater ?? 0,
  };

  // 技能階級門檻
  const TIER_REQS: Record<string, { minLevel: number; minWuxing: number }> = {
    basic:        { minLevel: 1,  minWuxing: 0 },
    intermediate: { minLevel: 15, minWuxing: 15 },
    advanced:     { minLevel: 30, minWuxing: 40 },
    destiny:      { minLevel: 61, minWuxing: 80 },
    legendary:    { minLevel: 81, minWuxing: 95 },
  };

  if (profession === "none") {
    return (
      <div className="p-3 rounded-xl border text-center"
        style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-2xl mb-2">👤</p>
        <p className="text-xs text-slate-400 mb-1">尚未選擇職業</p>
        <p className="text-[10px] text-slate-600">轉職後可解鎖職業專屬技能樹</p>
        <p className="text-[10px] text-slate-600 mt-1">前往「戰鬥」頁籤 → 點擊職業卡片轉職</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 職業標題 */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
        style={{ background: "rgba(168,85,247,0.06)", borderLeft: "2px solid rgba(168,85,247,0.3)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{PROF_EMOJI[profession]}</span>
          <div>
            <p className="text-xs font-bold text-purple-300">{PROF_ZH[profession]}技能樹</p>
            <p className="text-[10px] text-slate-500">
              命格：{FATE_ZH[fateElement] ?? fateElement}（{WX_ZH[fateElement]}行技能經驗 +50%）
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">已學 {learnedSkillIds.size} 技能</p>
        </div>
      </div>

      {/* 五行篩選 */}
      <div className="flex gap-1 flex-wrap">
        {["", "wood", "fire", "earth", "metal", "water"].map(wx => (
          <button key={wx} onClick={() => setFilterElement(wx)}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all"
            style={filterElement === wx
              ? { background: WX_HEX[wx] ?? "#64748b", color: "#fff", borderColor: WX_HEX[wx] ?? "#64748b" }
              : { background: "rgba(255,255,255,0.04)", color: "#64748b", borderColor: "rgba(255,255,255,0.08)" }}>
            {wx ? WX_ZH[wx] : "全部"}
          </button>
        ))}
      </div>

      {/* 技能階級列表 */}
      {Object.entries(TIER_CONFIG).map(([tier, cfg]) => {
        const skills = groupedSkills[tier] ?? [];
        const req = TIER_REQS[tier];
        const isExpanded = expandedTier === tier;
        const levelOk = agentLevel >= (req?.minLevel ?? 1);

        return (
          <div key={tier} className="rounded-xl border overflow-hidden"
            style={{ borderColor: cfg.border, background: cfg.bg }}>
            {/* 階級標題 */}
            <button
              onClick={() => setExpandedTier(isExpanded ? null : tier)}
              className="w-full flex items-center justify-between px-3 py-2 text-left transition-all hover:brightness-110">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-[10px] text-slate-500">
                  Lv.{req?.minLevel ?? 1}+ · {WX_ZH[fateElement] ?? ""}行 ≥{req?.minWuxing ?? 0}
                </span>
                {!levelOk && <span className="text-[9px] text-red-400/60">🔒 等級不足</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{skills.length} 技能</span>
                <span className="text-xs text-slate-600">{isExpanded ? "▾" : "▸"}</span>
              </div>
            </button>

            {/* 展開的技能列表 */}
            {isExpanded && skills.length > 0 && (
              <div className="px-2 pb-2 space-y-1">
                {skills.map((skill: any) => {
                  const isLearned = learnedSkillIds.has(skill.skillId ?? skill.id);
                  const wxColor = WX_HEX[skill.element] ?? "#888";
                  const isFateMatch = skill.element === fateElement;
                  const wuxingPoints = agentWuxing[skill.element] ?? 0;
                  const wuxingOk = wuxingPoints >= (req?.minWuxing ?? 0);
                  const canLearn = levelOk && wuxingOk;

                  return (
                    <div key={skill.skillId ?? skill.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all"
                      style={{
                        background: isLearned ? `${wxColor}10` : "rgba(255,255,255,0.02)",
                        borderColor: isLearned ? `${wxColor}30` : "rgba(255,255,255,0.05)",
                        opacity: canLearn || isLearned ? 1 : 0.5,
                      }}>
                      {/* 技能圖標 */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                        style={{ background: `${wxColor}15`, border: `1px solid ${wxColor}30` }}>
                        {skill.icon ?? "✨"}
                      </div>

                      {/* 技能資訊 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold truncate" style={{ color: wxColor }}>
                            {skill.displayName ?? skill.name}
                          </p>
                          {isLearned && <span className="text-[9px] text-green-400">✓已學</span>}
                          {isFateMatch && !isLearned && <span className="text-[9px] text-amber-400">★命格+50%</span>}
                        </div>
                        <p className="text-[10px] text-slate-600 truncate">
                          {skill.displayDesc ?? skill.effectDesc ?? ""}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-slate-600">
                            Lv.{skill.learnLevel ?? 1}
                          </span>
                          <span className="text-[9px]" style={{ color: wxColor }}>
                            {WX_ZH[skill.element]}{Math.floor(wuxingPoints)}/{req?.minWuxing ?? 0}
                          </span>
                          {skill.mpCost > 0 && (
                            <span className="text-[9px] text-blue-400/60">MP {skill.mpCost}</span>
                          )}
                          <span className="text-[9px] text-slate-600">
                            威力 {skill.effectValue ?? skill.powerPercent ?? 100}%
                          </span>
                        </div>
                      </div>

                      {/* 狀態標記 */}
                      <div className="shrink-0">
                        {isLearned ? (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(34,197,94,0.15)" }}>
                            <span className="text-[10px] text-green-400">✓</span>
                          </div>
                        ) : canLearn ? (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(56,189,248,0.15)" }}>
                            <span className="text-[10px] text-blue-400">◎</span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(239,68,68,0.1)" }}>
                            <span className="text-[10px] text-red-400/60">🔒</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isExpanded && skills.length === 0 && (
              <p className="px-3 pb-2 text-[10px] text-slate-600 italic">
                {filterElement ? `無${WX_ZH[filterElement]}行${cfg.label}技能` : `暫無${cfg.label}技能`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
