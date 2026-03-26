/**
 * PetPage.tsx — 寵物系統主頁面
 * GD-019：寵物列表、詳情、技能管理、出戰切換
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import GameTabLayout from "@/components/GameTabLayout";

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

type ViewMode = "list" | "detail" | "catalog" | "destiny";

export default function PetPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<{ wuxing?: string; rarity?: string; race?: string }>({});

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
    { enabled: !!selectedPetId && viewMode === "destiny" },
  );
  const { data: destinyDefs } = trpc.gamePet.getDestinySkillDefs.useQuery(undefined, { enabled: viewMode === "destiny" });
  const { data: tierConfig } = trpc.gamePet.getTierConfig.useQuery();

  // ─── Mutations ───
  const setActiveMut = trpc.gamePet.setActivePet.useMutation({
    onSuccess: () => { toast.success("出戰寵物已更新"); refetchPets(); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  const unsetActiveMut = trpc.gamePet.unsetActivePet.useMutation({
    onSuccess: () => { toast.success("已取消出戰"); refetchPets(); },
    onError: (e) => toast.error(e.message),
  });
  const renameMut = trpc.gamePet.renamePet.useMutation({
    onSuccess: () => { toast.success("暱稱已更新"); setShowRenameModal(false); refetchPets(); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });
  const learnSkillMut = trpc.gamePet.learnDestinySkill.useMutation({
    onSuccess: (res) => { toast.success(res.message); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });

  // ─── 寵物列表 ───
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
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("catalog")}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}
            >
              📖 圖鑑
            </button>
          </div>
        </div>

        {/* 出戰寵物 */}
        {activePet && (
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.05))", border: "1px solid rgba(255,215,0,0.3)" }}>
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

  // ─── 寵物卡片 ───
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
          {/* 寵物圖標 */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: `${wuxingColor}15`, border: `1px solid ${wuxingColor}30` }}>
            {catalog?.imageUrl ? (
              <img src={catalog.imageUrl} alt={pet.nickname} className="w-10 h-10 object-contain" />
            ) : (
              WX_EMOJI[catalog?.wuxing ?? "earth"]
            )}
          </div>
          {/* 資訊 */}
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
            {/* 經驗條 */}
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

  // ─── 寵物詳情 ───
  function PetDetailView() {
    if (!petDetail) return <div className="text-center py-12 text-gray-400">載入中...</div>;
    const { pet, catalog, innateSkills, learnedSkills, stats, destinySlots, innateSlots, expToNext, totalBp } = petDetail;
    const wuxingColor = WX_HEX[catalog?.wuxing ?? "earth"];
    const tierColor = TIER_COLOR[pet.tier] ?? "#70a1ff";

    return (
      <div className="space-y-4">
        {/* 返回按鈕 */}
        <button onClick={() => setViewMode("list")} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
          ← 返回列表
        </button>

        {/* 頭部資訊 */}
        <div className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, ${wuxingColor}10, rgba(0,0,0,0.3))`, border: `1px solid ${wuxingColor}20` }}>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ background: `${wuxingColor}15`, border: `2px solid ${wuxingColor}40` }}>
              {catalog?.imageUrl ? (
                <img src={catalog.imageUrl} alt="" className="w-16 h-16 object-contain" />
              ) : WX_EMOJI[catalog?.wuxing ?? "earth"]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-lg">{pet.nickname ?? catalog?.name}</h3>
                <button onClick={() => { setNewNickname(pet.nickname ?? ""); setShowRenameModal(true); }}
                  className="text-gray-500 hover:text-white text-xs">✏️</button>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: tierColor, background: `${tierColor}20`, border: `1px solid ${tierColor}40` }}>
                  {pet.tier} 檔
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded" style={{ color: RARITY_COLOR[catalog?.rarity ?? "common"], background: `${RARITY_COLOR[catalog?.rarity ?? "common"]}15` }}>
                  {RARITY_ZH[catalog?.rarity ?? "common"]}
                </span>
                <span className="text-xs" style={{ color: wuxingColor }}>{WX_EMOJI[catalog?.wuxing ?? "earth"]} {WX_ZH[catalog?.wuxing ?? "earth"]}屬</span>
                <span className="text-gray-500 text-xs">{RACE_ZH[catalog?.race ?? "normal"]}</span>
                <span className="text-gray-500 text-xs">{GROWTH_ZH[pet.growthType]}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-white text-sm font-bold">Lv.{pet.level}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (pet.exp / (expToNext || 1)) * 100)}%`,
                    background: `linear-gradient(90deg, ${wuxingColor}, ${wuxingColor}80)`,
                  }} />
                </div>
                <span className="text-gray-500 text-xs">{pet.exp}/{expToNext}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2">
          {pet.isActive ? (
            <button onClick={() => unsetActiveMut.mutate()} disabled={unsetActiveMut.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              取消出戰
            </button>
          ) : (
            <button onClick={() => setActiveMut.mutate({ petId: pet.id })} disabled={setActiveMut.isPending}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
              ⭐ 設為出戰
            </button>
          )}
          <button onClick={() => { setSelectedPetId(pet.id); setViewMode("destiny"); }}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
            🌟 天命技能
          </button>
        </div>

        {/* BP 五維 */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h4 className="text-white text-sm font-bold mb-3">📊 BP 五維 <span className="text-gray-500 font-normal">（總計 {totalBp}）</span></h4>
          <div className="grid grid-cols-5 gap-2">
            {[
              { key: "constitution", label: "體質", value: pet.bpConstitution, color: "#22c55e" },
              { key: "strength", label: "力量", value: pet.bpStrength, color: "#ef4444" },
              { key: "defense", label: "防禦", value: pet.bpDefense, color: "#f59e0b" },
              { key: "agility", label: "敏捷", value: pet.bpAgility, color: "#e2e8f0" },
              { key: "magic", label: "魔力", value: pet.bpMagic, color: "#38bdf8" },
            ].map(bp => (
              <div key={bp.key} className="text-center">
                <div className="text-lg font-bold" style={{ color: bp.color }}>{bp.value}</div>
                <div className="text-gray-500 text-xs">{bp.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 戰鬥數值 */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h4 className="text-white text-sm font-bold mb-3">⚔️ 戰鬥數值</h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "HP", value: stats.hp, color: "#22c55e" },
              { label: "MP", value: stats.mp, color: "#38bdf8" },
              { label: "攻擊", value: stats.attack, color: "#ef4444" },
              { label: "防禦", value: stats.defense, color: "#f59e0b" },
              { label: "速度", value: stats.speed, color: "#e2e8f0" },
              { label: "魔攻", value: stats.magicAttack, color: "#a855f7" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                <span className="text-gray-400 text-xs">{s.label}</span>
                <span className="font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 天生技能 */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h4 className="text-white text-sm font-bold mb-3">🎯 天生技能</h4>
          <div className="space-y-2">
            {innateSlots.map(slot => {
              const skill = innateSkills.find(s => s.slotIndex === slot.slotIndex);
              return (
                <div key={slot.slotIndex} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: slot.isUnlocked ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", color: slot.isUnlocked ? "#22c55e" : "#636e72" }}>
                    {slot.slotIndex}
                  </div>
                  {slot.isUnlocked && skill ? (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{skill.name}</span>
                        {skill.wuxing && <span className="text-xs" style={{ color: WX_HEX[skill.wuxing] }}>{WX_ZH[skill.wuxing]}</span>}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        威力 {skill.powerPercent}% · MP {skill.mpCost} · CD {skill.cooldown}回合
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">
                      {slot.isUnlocked ? "（空）" : `Lv.${slot.unlockLevel} 解鎖`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 天命技能 */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h4 className="text-white text-sm font-bold mb-3">🌟 天命技能</h4>
          <div className="space-y-2">
            {destinySlots.map(slot => {
              const skill = learnedSkills.find(s => s.slotIndex === slot.slotIndex);
              return (
                <div key={slot.slotIndex} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ background: slot.isUnlocked ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)", color: slot.isUnlocked ? "#a855f7" : "#636e72" }}>
                    {slot.slotIndex}
                  </div>
                  {slot.isUnlocked && skill ? (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{skill.skillName}</span>
                        <span className="text-xs text-purple-400">Lv.{skill.skillLevel}</span>
                        {skill.wuxing && <span className="text-xs" style={{ color: WX_HEX[skill.wuxing] }}>{WX_ZH[skill.wuxing]}</span>}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        威力 {skill.powerPercent}% · MP {skill.mpCost} · CD {skill.cooldown}回合 · 使用 {skill.usageCount} 次
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">
                      {slot.isUnlocked ? "（可學習天命技能）" : `Lv.${slot.unlockLevel} 解鎖`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 好感度 */}
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

  // ─── 天命技能學習 ───
  function DestinySkillView() {
    if (!destinySkills || !petDetail) return <div className="text-center py-12 text-gray-400">載入中...</div>;
    const { pet, catalog } = petDetail;
    const unlockedSlots = petDetail.destinySlots.filter(s => s.isUnlocked);

    return (
      <div className="space-y-4">
        <button onClick={() => setViewMode("detail")} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
          ← 返回詳情
        </button>

        <div className="flex items-center gap-2">
          <h2 className="text-white text-lg font-bold">🌟 天命技能學習</h2>
          <span className="text-gray-500 text-xs">({pet.nickname ?? catalog?.name})</span>
        </div>

        <div className="text-gray-400 text-xs px-1">
          已解鎖 {unlockedSlots.length}/{petDetail.destinySlots.length} 格 · 
          可學習 14 種天命技能，每格可替換
        </div>

        {/* 可用格位 */}
        <div className="flex gap-2 mb-2">
          {petDetail.destinySlots.map(slot => (
            <div key={slot.slotIndex} className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: slot.isUnlocked ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
                color: slot.isUnlocked ? "#a855f7" : "#636e72",
                border: `1px solid ${slot.isUnlocked ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}>
              格{slot.slotIndex} {slot.isUnlocked ? "✓" : `Lv.${slot.unlockLevel}`}
            </div>
          ))}
        </div>

        {/* 技能列表 */}
        <div className="space-y-2">
          {destinySkills.map(skill => {
            const wuxingColor = skill.wuxing ? WX_HEX[skill.wuxing] : "#9ca3af";
            return (
              <div key={skill.key} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-bold">{skill.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: wuxingColor, background: `${wuxingColor}15` }}>
                        {skill.wuxing ? WX_ZH[skill.wuxing] : "無屬性"}
                      </span>
                      <span className="text-gray-500 text-xs">{skill.skillType}</span>
                      {skill.isLearned && <span className="text-green-400 text-xs font-bold">已學</span>}
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{skill.description}</p>
                    <div className="text-gray-600 text-xs mt-0.5">
                      威力 {skill.basePower}% · MP {skill.baseMp} · CD {skill.baseCooldown}回合
                    </div>
                  </div>
                  {!skill.isLearned && unlockedSlots.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {unlockedSlots.map(slot => (
                        <button
                          key={slot.slotIndex}
                          onClick={() => learnSkillMut.mutate({ petId: pet.id, skillKey: skill.key, slotIndex: slot.slotIndex })}
                          disabled={learnSkillMut.isPending}
                          className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                          style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}
                        >
                          裝到格{slot.slotIndex}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {skill.isLearned && skill.learnedData && (
                  <div className="mt-2 pt-2 border-t border-white/5 text-xs text-gray-500">
                    等級 Lv.{skill.learnedData.skillLevel} · 使用 {skill.learnedData.usageCount} 次 · 格位 {skill.learnedData.slotIndex}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── 寵物圖鑑 ───
  function CatalogView() {
    return (
      <div className="space-y-4">
        <button onClick={() => setViewMode("list")} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
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
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${wuxingColor}15`, border: `1px solid ${wuxingColor}30` }}>
                    {pet.imageUrl ? <img src={pet.imageUrl} alt="" className="w-9 h-9 object-contain" /> : WX_EMOJI[pet.wuxing]}
                  </div>
                  <div className="flex-1">
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

  // ─── 改名 Modal ───
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
            >
              確認
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GameTabLayout activeTab="pets">
      <div className="min-h-screen pb-20" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #111827 100%)" }}>
        <div className="max-w-lg mx-auto px-4 py-4">
          {viewMode === "list" && <PetListView />}
          {viewMode === "detail" && <PetDetailView />}
          {viewMode === "catalog" && <CatalogView />}
          {viewMode === "destiny" && <DestinySkillView />}
        </div>
        <RenameModal />
      </div>
    </GameTabLayout>
  );
}
