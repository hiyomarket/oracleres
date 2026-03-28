/**
 * PetPage.tsx — 寵物系統主頁面（重構版）
 * GD-019：寵物列表、詳情、技能管理（內嵌）、出戰切換
 *
 * 重構重點：
 *   - 整個頁面可上下滾動
 *   - 天生技能和天命技能直接在詳情頁中管理（不需跳到另一個頁面）
 *   - 技能裝備/卸除功能 — 每個技能格位可以直接操作
 *   - 整體 UI 優化 — 更清晰的區塊劃分和視覺層次
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import GameTabLayout from "@/components/GameTabLayout";
import PetBpRadarChart from "@/components/PetBpRadarChart";

// ─── 常量 ─────────────────────────────────────────────────
const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
};
const WX_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const WX_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
};
const RACE_ZH: Record<string, string> = {
  dragon: "龍族", undead: "不死族", normal: "一般", insect: "蟲族", plant: "植物族", flying: "飛行族",
};
const RARITY_ZH: Record<string, string> = {
  common: "普通", rare: "稀有", epic: "史詩", legendary: "傳說",
};
const RARITY_COLOR: Record<string, string> = {
  common: "#9ca3af", rare: "#3b82f6", epic: "#a855f7", legendary: "#f59e0b",
};
const GROWTH_ZH: Record<string, string> = {
  fighter: "力量型", guardian: "防禦型", swift: "敏捷型", mage: "魔法型", balanced: "均衡型",
};
const TIER_COLOR: Record<string, string> = {
  S: "#ff6b6b", A: "#ffa502", B: "#2ed573", C: "#70a1ff", D: "#a4b0be", E: "#636e72",
};

type ViewMode = "list" | "detail" | "catalog";

export default function PetPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<{ wuxing?: string; rarity?: string; race?: string }>({});
  const [showDestinyLearn, setShowDestinyLearn] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

  // ─── 資料查詢 ───
  const { data: myPets, refetch: refetchPets } = trpc.gamePet.getMyPets.useQuery(undefined, { enabled: !!user });
  const { data: petDetail, refetch: refetchDetail } = trpc.gamePet.getPetDetail.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId && viewMode === "detail" },
  );
  const { data: catalogList } = trpc.gamePet.browsePetCatalog.useQuery(
    catalogFilter.wuxing || catalogFilter.rarity || catalogFilter.race ? catalogFilter : undefined,
    { enabled: viewMode === "catalog" },
  );
  const { data: destinySkills } = trpc.gamePet.getAvailableDestinySkills.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId && showDestinyLearn },
  );
  const { data: tierConfig } = trpc.gamePet.getTierConfig.useQuery();
  const { data: bpHistory } = trpc.gamePet.getPetBpHistory.useQuery(
    { petId: selectedPetId!, limit: 100 },
    { enabled: !!selectedPetId && viewMode === "detail" },
  );

  // ─── Mutations ───
  const setActiveMut = trpc.gamePet.setActivePet.useMutation({
    onSuccess: () => { toast.success("出戰寵物已更新"); refetchPets(); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  const unsetActiveMut = trpc.gamePet.unsetActivePet.useMutation({
    onSuccess: () => { toast.success("已取消出戰"); refetchPets(); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  const renameMut = trpc.gamePet.renamePet.useMutation({
    onSuccess: () => { toast.success("暱稱已更新"); setShowRenameModal(false); refetchPets(); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  const learnSkillMut = trpc.gamePet.learnDestinySkill.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setShowDestinyLearn(false);
      setTargetSlotIndex(null);
      refetchDetail();
    },
    onError: (e) => toast.error(e.message),
  });

  // ═══════════════════════════════════════════════════════════
  // 寵物列表
  // ═══════════════════════════════════════════════════════════
  function PetListView() {
    const activePet = myPets?.find(p => p.isActive);
    const otherPets = myPets?.filter(p => !p.isActive) ?? [];

    return (
      <div className="space-y-4">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            🐾 我的寵物 <span className="text-sm text-gray-400">({myPets?.length ?? 0})</span>
          </h2>
          <button
            onClick={() => setViewMode("catalog")}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            📖 圖鑑
          </button>
        </div>

        {/* 出戰寵物 */}
        {activePet && (
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.03))", border: "1px solid rgba(255,215,0,0.25)" }}>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-yellow-400 text-xs font-bold">⭐ 出戰中</span>
            </div>
            <PetCard pet={activePet} isActive onSelect={() => { setSelectedPetId(activePet.id); setViewMode("detail"); }} />
          </div>
        )}

        {/* 其他寵物 */}
        {otherPets.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-gray-400 text-sm font-medium">待命寵物</h3>
            {otherPets.map(pet => (
              <PetCard key={pet.id} pet={pet} onSelect={() => { setSelectedPetId(pet.id); setViewMode("detail"); }} />
            ))}
          </div>
        )}

        {(!myPets || myPets.length === 0) && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🥚</div>
            <p className="text-gray-400 text-sm">尚未捕捉任何寵物</p>
            <p className="text-gray-500 text-xs mt-1">在虛相世界探索時可遇到野生寵物</p>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 寵物卡片
  // ═══════════════════════════════════════════════════════════
  function PetCard({ pet, isActive, onSelect }: { pet: any; isActive?: boolean; onSelect: () => void }) {
    const catalog = pet.catalog;
    const rarityColor = RARITY_COLOR[catalog?.rarity ?? "common"];
    const tierColor = TIER_COLOR[pet.tier] ?? "#70a1ff";
    const wuxingColor = WX_HEX[catalog?.wuxing ?? "earth"];
    const totalBp = pet.bpConstitution + pet.bpStrength + pet.bpDefense + pet.bpAgility + pet.bpMagic;

    return (
      <button
        onClick={onSelect}
        className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: `${wuxingColor}15`, border: `1px solid ${wuxingColor}30` }}>
            {catalog?.imageUrl ? (
              <img src={catalog.imageUrl} alt={pet.nickname} className="w-10 h-10 object-contain" />
            ) : WX_EMOJI[catalog?.wuxing ?? "earth"]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm truncate">{pet.nickname ?? catalog?.name ?? "未知"}</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ color: tierColor, background: `${tierColor}20` }}>
                {pet.tier}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: rarityColor, background: `${rarityColor}15` }}>
                {RARITY_ZH[catalog?.rarity ?? "common"]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-gray-400 text-xs">Lv.{pet.level}</span>
              <span className="text-xs" style={{ color: wuxingColor }}>{WX_ZH[catalog?.wuxing ?? "earth"]}屬</span>
              <span className="text-gray-500 text-xs">{RACE_ZH[catalog?.race ?? "normal"]}</span>
              <span className="text-gray-500 text-xs">BP:{totalBp}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100, (pet.exp / (pet.expToNext || 1)) * 100)}%`,
                background: `linear-gradient(90deg, ${wuxingColor}, ${wuxingColor}80)`,
              }} />
            </div>
          </div>
          <span className="text-gray-500 text-lg">›</span>
        </div>
      </button>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 寵物詳情（含技能管理內嵌）
  // ═══════════════════════════════════════════════════════════
  function PetDetailView() {
    if (!petDetail) return <div className="text-center py-12 text-gray-400">載入中...</div>;
    const { pet, catalog, innateSkills, learnedSkills, stats, destinySlots, innateSlots, expToNext, totalBp } = petDetail;
    const wuxingColor = WX_HEX[catalog?.wuxing ?? "earth"];
    const tierColor = TIER_COLOR[pet.tier] ?? "#70a1ff";

    return (
      <div className="space-y-4">
        {/* 返回按鈕 */}
        <button onClick={() => { setViewMode("list"); setShowDestinyLearn(false); setTargetSlotIndex(null); }}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
          ← 返回列表
        </button>

        {/* ── 頭部資訊卡 ── */}
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${wuxingColor}12, rgba(0,0,0,0.4))`, border: `1px solid ${wuxingColor}25` }}>
          {/* 背景光暈 */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{ background: wuxingColor }} />

          <div className="relative flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ background: `${wuxingColor}15`, border: `2px solid ${wuxingColor}40`, boxShadow: `0 0 20px ${wuxingColor}15` }}>
              {catalog?.imageUrl ? (
                <img src={catalog.imageUrl} alt="" className="w-16 h-16 object-contain" />
              ) : WX_EMOJI[catalog?.wuxing ?? "earth"]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-lg">{pet.nickname ?? catalog?.name}</h3>
                <button onClick={() => { setNewNickname(pet.nickname ?? ""); setShowRenameModal(true); }}
                  className="text-gray-500 hover:text-white text-xs transition-colors">✏️</button>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ color: tierColor, background: `${tierColor}20`, border: `1px solid ${tierColor}40` }}>
                  {pet.tier} 檔
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{ color: RARITY_COLOR[catalog?.rarity ?? "common"], background: `${RARITY_COLOR[catalog?.rarity ?? "common"]}15` }}>
                  {RARITY_ZH[catalog?.rarity ?? "common"]}
                </span>
                <span className="text-xs" style={{ color: wuxingColor }}>{WX_EMOJI[catalog?.wuxing ?? "earth"]} {WX_ZH[catalog?.wuxing ?? "earth"]}屬</span>
                <span className="text-gray-500 text-xs">{RACE_ZH[catalog?.race ?? "normal"]}</span>
                <span className="text-gray-500 text-xs">{GROWTH_ZH[pet.growthType]}</span>
              </div>
              {/* 等級 + 經驗條 */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-white text-sm font-bold">Lv.{pet.level}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, (pet.exp / (expToNext || 1)) * 100)}%`,
                    background: `linear-gradient(90deg, ${wuxingColor}, ${wuxingColor}80)`,
                  }} />
                </div>
                <span className="text-gray-500 text-xs whitespace-nowrap">{pet.exp}/{expToNext}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 操作按鈕 ── */}
        <div className="flex gap-2">
          {pet.isActive ? (
            <button onClick={() => unsetActiveMut.mutate()} disabled={unsetActiveMut.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              取消出戰
            </button>
          ) : (
            <button onClick={() => setActiveMut.mutate({ petId: pet.id })} disabled={setActiveMut.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
              ⭐ 設為出戰
            </button>
          )}
        </div>

        {/* ── BP 五維雷達圖 ── */}
        <SectionCard title="📊 BP 五維分佈" accentColor={wuxingColor}>
          <PetBpRadarChart
            history={bpHistory ?? []}
            currentBp={{
              constitution: pet.bpConstitution,
              strength: pet.bpStrength,
              defense: pet.bpDefense,
              agility: pet.bpAgility,
              magic: pet.bpMagic,
            }}
            accentColor={wuxingColor}
          />
        </SectionCard>

        {/* ── BP 手動分配 ── */}
        <BpAllocatePanel pet={pet} wuxingColor={wuxingColor} onDone={() => { refetchDetail(); refetchPets(); }} />

        {/* ── 戰鬥數值 ── */}
        <SectionCard title="⚔️ 戰鬥數值" accentColor={wuxingColor}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "HP", value: stats.hp, color: "#22c55e", icon: "❤️" },
              { label: "MP", value: stats.mp, color: "#38bdf8", icon: "💧" },
              { label: "攻擊", value: stats.attack, color: "#ef4444", icon: "⚔️" },
              { label: "防禦", value: stats.defense, color: "#f59e0b", icon: "🛡️" },
              { label: "速度", value: stats.speed, color: "#e2e8f0", icon: "⚡" },
              { label: "魔攻", value: stats.magicAttack, color: "#a855f7", icon: "🔮" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-xs">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-400 text-xs leading-none">{s.label}</div>
                  <div className="font-bold text-sm leading-tight mt-0.5" style={{ color: s.color }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 天生技能（內嵌管理） ── */}
        <SectionCard title="🎯 天生技能" accentColor="#22c55e"
          subtitle={`${innateSlots.filter(s => s.isUnlocked).length}/${innateSlots.length} 格已解鎖`}>
          <div className="space-y-2">
            {innateSlots.map(slot => {
              const skill = innateSkills.find(s => s.slotIndex === slot.slotIndex);
              return (
                <SkillSlotRow
                  key={slot.slotIndex}
                  slotIndex={slot.slotIndex}
                  isUnlocked={slot.isUnlocked}
                  unlockLevel={slot.unlockLevel}
                  skill={skill ? {
                    name: skill.name,
                    wuxing: skill.wuxing,
                    powerPercent: skill.powerPercent,
                    mpCost: skill.mpCost,
                    cooldown: skill.cooldown,
                    skillType: skill.skillType,
                  } : null}
                  type="innate"
                />
              );
            })}
          </div>
        </SectionCard>

        {/* ── 天命技能（內嵌管理 + 裝備/替換） ── */}
        <SectionCard title="🌟 天命技能" accentColor="#a855f7"
          subtitle={`${destinySlots.filter(s => s.isUnlocked).length}/${destinySlots.length} 格已解鎖`}>
          <div className="space-y-2">
            {destinySlots.map(slot => {
              const skill = learnedSkills.find(s => s.slotIndex === slot.slotIndex);
              return (
                <SkillSlotRow
                  key={slot.slotIndex}
                  slotIndex={slot.slotIndex}
                  isUnlocked={slot.isUnlocked}
                  unlockLevel={slot.unlockLevel}
                  skill={skill ? {
                    name: skill.skillName,
                    wuxing: skill.wuxing,
                    powerPercent: skill.powerPercent,
                    mpCost: skill.mpCost,
                    cooldown: skill.cooldown,
                    skillType: skill.skillType,
                    skillLevel: skill.skillLevel,
                    usageCount: skill.usageCount,
                  } : null}
                  type="destiny"
                  onLearn={() => {
                    setTargetSlotIndex(slot.slotIndex);
                    setShowDestinyLearn(true);
                  }}
                  onReplace={() => {
                    setTargetSlotIndex(slot.slotIndex);
                    setShowDestinyLearn(true);
                  }}
                />
              );
            })}
          </div>

          {/* 天命技能學習面板（展開式） */}
          {showDestinyLearn && targetSlotIndex !== null && (
            <DestinyLearnPanel
              petId={pet.id}
              targetSlot={targetSlotIndex}
              destinySkills={destinySkills ?? []}
              onClose={() => { setShowDestinyLearn(false); setTargetSlotIndex(null); }}
              onLearn={(skillKey) => learnSkillMut.mutate({ petId: pet.id, skillKey, slotIndex: targetSlotIndex })}
              isPending={learnSkillMut.isPending}
            />
          )}
        </SectionCard>

        {/* ── 好感度 ── */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">❤️ 好感度</span>
            <span className="text-pink-400 text-sm font-bold">{pet.friendship}/100</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: `${pet.friendship}%`, background: "linear-gradient(90deg, #ec4899, #f43f5e)" }} />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 技能格位行（通用）
  // ═══════════════════════════════════════════════════════════
  function SkillSlotRow({ slotIndex, isUnlocked, unlockLevel, skill, type, onLearn, onReplace }: {
    slotIndex: number;
    isUnlocked: boolean;
    unlockLevel: number;
    skill: {
      name: string;
      wuxing: string | null;
      powerPercent: number;
      mpCost: number;
      cooldown: number;
      skillType: string;
      skillLevel?: number;
      usageCount?: number;
    } | null;
    type: "innate" | "destiny";
    onLearn?: () => void;
    onReplace?: () => void;
  }) {
    const isDestiny = type === "destiny";
    const accentColor = isDestiny ? "#a855f7" : "#22c55e";
    const bgActive = isDestiny ? "rgba(168,85,247,0.12)" : "rgba(34,197,94,0.12)";
    const bgLocked = "rgba(255,255,255,0.02)";

    if (!isUnlocked) {
      return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: bgLocked, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.04)", color: "#475569" }}>
            🔒
          </div>
          <span className="text-gray-600 text-xs">Lv.{unlockLevel} 解鎖第 {slotIndex} 格</span>
        </div>
      );
    }

    if (!skill) {
      return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: bgLocked, border: `1px dashed ${accentColor}30` }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
            style={{ background: `${accentColor}10`, color: accentColor }}>
            {slotIndex}
          </div>
          <span className="text-gray-500 text-xs flex-1">
            {isDestiny ? "可學習天命技能" : "（空格）"}
          </span>
          {isDestiny && onLearn && (
            <button onClick={onLearn}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 active:scale-[0.96]"
              style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
              學習
            </button>
          )}
        </div>
      );
    }

    const wuxingColor = skill.wuxing ? (WX_HEX[skill.wuxing] ?? "#9ca3af") : "#9ca3af";

    return (
      <div className="rounded-xl px-3 py-2.5 transition-all" style={{ background: bgActive, border: `1px solid ${accentColor}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: `${accentColor}20`, color: accentColor }}>
            {slotIndex}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-medium">{skill.name}</span>
              {skill.wuxing && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: wuxingColor, background: `${wuxingColor}15` }}>
                  {WX_ZH[skill.wuxing] ?? skill.wuxing}
                </span>
              )}
              {isDestiny && skill.skillLevel && (
                <span className="text-xs font-bold" style={{ color: accentColor }}>Lv.{skill.skillLevel}</span>
              )}
            </div>
            <div className="text-gray-500 text-xs mt-0.5 flex items-center gap-2 flex-wrap">
              <span>威力 {skill.powerPercent}%</span>
              <span>·</span>
              <span>MP {skill.mpCost}</span>
              <span>·</span>
              <span>CD {skill.cooldown}回合</span>
              {isDestiny && skill.usageCount !== undefined && (
                <>
                  <span>·</span>
                  <span>使用 {skill.usageCount} 次</span>
                </>
              )}
            </div>
          </div>
          {isDestiny && onReplace && (
            <button onClick={onReplace}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 active:scale-[0.96] shrink-0"
              style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
              替換
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 天命技能學習面板（展開式，在詳情頁內）
  // ═══════════════════════════════════════════════════════════
  function DestinyLearnPanel({ petId, targetSlot, destinySkills, onClose, onLearn, isPending }: {
    petId: number;
    targetSlot: number;
    destinySkills: Array<any>;
    onClose: () => void;
    onLearn: (skillKey: string) => void;
    isPending: boolean;
  }) {
    return (
      <div className="mt-3 rounded-xl p-4" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-white text-sm font-bold">選擇天命技能</h4>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7" }}>
              格位 {targetSlot}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm transition-colors">✕</button>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(168,85,247,0.3) transparent" }}>
          {destinySkills.map(skill => {
            const wuxingColor = skill.wuxing ? (WX_HEX[skill.wuxing] ?? "#9ca3af") : "#9ca3af";
            return (
              <div key={skill.key} className="rounded-lg p-3 transition-all hover:bg-white/[0.03]"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-bold">{skill.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: wuxingColor, background: `${wuxingColor}15` }}>
                        {skill.wuxing ? WX_ZH[skill.wuxing] : "無屬性"}
                      </span>
                      <span className="text-gray-600 text-xs">{skill.skillType}</span>
                      {skill.isLearned && <span className="text-green-400 text-xs font-bold">已學</span>}
                    </div>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-1">{skill.description}</p>
                    <div className="text-gray-600 text-xs mt-0.5">
                      威力 {skill.basePower}% · MP {skill.baseMp} · CD {skill.baseCooldown}回合
                    </div>
                    {skill.isLearned && skill.learnedData && (
                      <div className="text-purple-400/60 text-xs mt-0.5">
                        目前 Lv.{skill.learnedData.skillLevel} · 格位 {skill.learnedData.slotIndex} · 使用 {skill.learnedData.usageCount} 次
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onLearn(skill.key)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 active:scale-[0.96] shrink-0 disabled:opacity-40"
                    style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
                    {skill.isLearned ? "替換" : "學習"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // BP 手動分配面板
  // ═══════════════════════════════════════════════════════════
  function BpAllocatePanel({ pet, wuxingColor, onDone }: { pet: any; wuxingColor: string; onDone: () => void }) {
    const [alloc, setAlloc] = useState({ constitution: 0, strength: 0, defense: 0, agility: 0, magic: 0 });
    const unallocated = pet.bpUnallocated ?? 0;
    const totalUsed = alloc.constitution + alloc.strength + alloc.defense + alloc.agility + alloc.magic;
    const remaining = unallocated - totalUsed;

    const allocMut = trpc.gamePet.allocateBp.useMutation({
      onSuccess: () => {
        toast.success(`成功分配 ${totalUsed} 點 BP`);
        setAlloc({ constitution: 0, strength: 0, defense: 0, agility: 0, magic: 0 });
        onDone();
      },
      onError: (e) => toast.error(e.message),
    });

    if (unallocated <= 0) return null;

    const dims = [
      { key: "constitution" as const, label: "體質", emoji: "❤️", color: "#22c55e", current: pet.bpConstitution },
      { key: "strength" as const, label: "力量", emoji: "⚔️", color: "#ef4444", current: pet.bpStrength },
      { key: "defense" as const, label: "防禦", emoji: "🛡️", color: "#f59e0b", current: pet.bpDefense },
      { key: "agility" as const, label: "敏捷", emoji: "⚡", color: "#38bdf8", current: pet.bpAgility },
      { key: "magic" as const, label: "魔力", emoji: "🔮", color: "#a855f7", current: pet.bpMagic },
    ];

    return (
      <SectionCard title="🎯 BP 分配" accentColor={wuxingColor}
        headerRight={
          <span className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
            可用 {remaining} / {unallocated}
          </span>
        }>
        <div className="space-y-3">
          {dims.map(d => (
            <div key={d.key} className="flex items-center gap-2">
              <span className="text-sm w-6 text-center">{d.emoji}</span>
              <span className="text-gray-400 text-xs w-8">{d.label}</span>
              <span className="text-gray-500 text-xs w-6 text-right">{d.current}</span>
              <div className="flex-1 flex items-center gap-1">
                <button
                  onClick={() => setAlloc(a => ({ ...a, [d.key]: Math.max(0, a[d.key] - 1) }))}
                  disabled={alloc[d.key] <= 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all disabled:opacity-20"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#e2e8f0" }}
                >−</button>
                <div className="flex-1 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    background: alloc[d.key] > 0 ? `${d.color}15` : "rgba(255,255,255,0.03)",
                    color: alloc[d.key] > 0 ? d.color : "#475569",
                    border: `1px solid ${alloc[d.key] > 0 ? d.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                  {alloc[d.key] > 0 ? `+${alloc[d.key]}` : "0"}
                </div>
                <button
                  onClick={() => setAlloc(a => ({ ...a, [d.key]: a[d.key] + 1 }))}
                  disabled={remaining <= 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all disabled:opacity-20"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#e2e8f0" }}
                >+</button>
                <button
                  onClick={() => setAlloc(a => ({ ...a, [d.key]: a[d.key] + Math.min(5, remaining) }))}
                  disabled={remaining <= 0}
                  className="text-xs px-1.5 py-1 rounded transition-all disabled:opacity-20"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}
                >+5</button>
              </div>
            </div>
          ))}
        </div>

        {totalUsed > 0 && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setAlloc({ constitution: 0, strength: 0, defense: 0, agility: 0, magic: 0 })}
              className="flex-1 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-all"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >重置</button>
            <button
              onClick={() => allocMut.mutate({ petId: pet.id, ...alloc })}
              disabled={allocMut.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${wuxingColor}, ${wuxingColor}80)` }}
            >
              {allocMut.isPending ? "分配中..." : `確認分配 (${totalUsed} 點)`}
            </button>
          </div>
        )}
      </SectionCard>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 寵物圖鑑
  // ═══════════════════════════════════════════════════════════
  function CatalogView() {
    return (
      <div className="space-y-4">
        <button onClick={() => setViewMode("list")} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
          ← 返回列表
        </button>
        <h2 className="text-white text-lg font-bold">📖 寵物圖鑑</h2>

        {/* 篩選 */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={catalogFilter.wuxing ?? ""}
            onChange={e => setCatalogFilter(f => ({ ...f, wuxing: e.target.value || undefined }))}
            className="text-xs px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 border border-white/10"
          >
            <option value="">全部屬性</option>
            {Object.entries(WX_ZH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={catalogFilter.rarity ?? ""}
            onChange={e => setCatalogFilter(f => ({ ...f, rarity: e.target.value || undefined }))}
            className="text-xs px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 border border-white/10"
          >
            <option value="">全部稀有度</option>
            {Object.entries(RARITY_ZH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={catalogFilter.race ?? ""}
            onChange={e => setCatalogFilter(f => ({ ...f, race: e.target.value || undefined }))}
            className="text-xs px-2 py-1.5 rounded-lg bg-white/5 text-gray-300 border border-white/10"
          >
            <option value="">全部種族</option>
            {Object.entries(RACE_ZH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* 圖鑑列表 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {catalogList?.map(pet => {
            const wuxingColor = WX_HEX[pet.wuxing] ?? "#9ca3af";
            const rarityColor = RARITY_COLOR[pet.rarity] ?? "#9ca3af";
            return (
              <div key={pet.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${rarityColor}20` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${wuxingColor}15`, border: `1px solid ${wuxingColor}30` }}>
                    {pet.imageUrl ? <img src={pet.imageUrl} alt="" className="w-9 h-9 object-contain" /> : WX_EMOJI[pet.wuxing]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-bold">{pet.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: rarityColor, background: `${rarityColor}15` }}>
                        {RARITY_ZH[pet.rarity]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: wuxingColor }}>{WX_EMOJI[pet.wuxing]} {WX_ZH[pet.wuxing]}</span>
                      <span className="text-gray-500 text-xs">{RACE_ZH[pet.race]}</span>
                      <span className="text-gray-500 text-xs">{GROWTH_ZH[pet.growthType]}</span>
                    </div>
                    <div className="text-gray-600 text-xs mt-0.5">
                      Lv.{pet.minLevel}-{pet.maxLevel} · 捕捉率 {pet.baseCaptureRate}%
                    </div>
                  </div>
                </div>
                {pet.description && (
                  <p className="text-gray-500 text-xs mt-2 line-clamp-2">{pet.description}</p>
                )}
              </div>
            );
          })}
        </div>

        {(!catalogList || catalogList.length === 0) && (
          <div className="text-center py-8 text-gray-500 text-sm">尚無寵物圖鑑資料</div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 通用區塊卡片
  // ═══════════════════════════════════════════════════════════
  function SectionCard({ title, accentColor, subtitle, headerRight, children }: {
    title: string;
    accentColor: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
  }) {
    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-white text-sm font-bold">{title}</h4>
            {subtitle && <span className="text-gray-500 text-xs">{subtitle}</span>}
          </div>
          {headerRight}
        </div>
        {children}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 改名 Modal
  // ═══════════════════════════════════════════════════════════
  function RenameModal() {
    if (!showRenameModal || !selectedPetId) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
        <div className="w-[90%] max-w-sm rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h3 className="text-white text-lg font-bold mb-4">✏️ 修改暱稱</h3>
          <input
            type="text"
            value={newNickname}
            onChange={e => setNewNickname(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg bg-white/5 text-white border border-white/10 text-sm mb-4"
            placeholder="輸入新暱稱"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRenameModal(false)} className="flex-1 py-2 rounded-xl text-sm text-gray-400 hover:text-white" style={{ background: "rgba(255,255,255,0.05)" }}>
              取消
            </button>
            <button
              onClick={() => renameMut.mutate({ petId: selectedPetId, nickname: newNickname })}
              disabled={!newNickname.trim() || renameMut.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}
            >確認</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 主渲染
  // ═══════════════════════════════════════════════════════════
  return (
    <GameTabLayout activeTab="pets">
      <div className="min-h-screen overflow-y-auto pb-24" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #111827 100%)" }}>
        <div className="max-w-lg mx-auto px-4 py-4">
          {viewMode === "list" && <PetListView />}
          {viewMode === "detail" && <PetDetailView />}
          {viewMode === "catalog" && <CatalogView />}
        </div>
        <RenameModal />
      </div>
    </GameTabLayout>
  );
}
