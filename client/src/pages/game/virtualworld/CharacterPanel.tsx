/**
 * CharacterPanel — 角色面板組件
 * 從 VirtualWorldPage.tsx 提取的獨立組件
 */
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BossMonsterRow } from "@/components/game/BossTooltip";
import ItemDetailModal from "@/components/ItemDetailModal";
import {
  calcExpToNextFn, WX_HEX, WX_ZH, WX_EMOJI, WX_GLOW,
  STRATEGIES, QUALITY_COLOR, QUALITY_ZH, SKILL_DEFS, WX_SKILL_ICON,
  WX_ZH_TO_EN, COMBAT_ATTRS, LIFE_ATTRS, EQUIP_SLOTS,
  REALM_LABELS, PROFESSION_LABELS, FATE_LABELS,
  type PanelId, type AgentData,
} from "./constants";
import { StatBar, MiniAttrBar } from "./StatBars";
import { PotentialAllocPanel } from "./PotentialAllocPanel";
import { ProfessionPanel } from "./ProfessionPanel";
import { SkillTreePanel } from "./SkillTreePanel";

export function CharacterPanel({
  agent, staminaInfo, natalStats, equippedData, balanceData, dailyData,
  divineHeal, divineEye, divineStamina, setStrategy, ec, mobileMode = false,
}: {
  agent: AgentData | null | undefined;
  staminaInfo: { current?: number; max?: number; nextRegenMin?: number; regenAmount?: number; regenMinutes?: number; staminaPerTick?: number; moveStaminaCost?: number; sellDiscountRate?: number } | null | undefined;
  natalStats: { hp?: number; atk?: number; def?: number; spd?: number; mp?: number } | null | undefined;
  equippedData: { userGender?: string; dayMasterElementEn?: string; equipped?: Record<string, { name: string; quality?: string; equipId?: string; hpBonus?: number; attackBonus?: number; defenseBonus?: number; speedBonus?: number } | null>; equipBonus?: { hp?: number; atk?: number; def?: number; spd?: number }; statCaps?: { hp?: number; mp?: number; atk?: number; def?: number; spd?: number; matk?: number; mdef?: number; wuxing?: number } } | null | undefined;
  balanceData: { gameCoins?: number; gameStones?: number } | null | undefined;
  dailyData: { dayPillar?: { stem?: string; branch?: string; stemElement?: string } } | null | undefined;
  divineHeal: { mutate: () => void; isPending: boolean };
  divineEye: { mutate: () => void; isPending: boolean };
  divineStamina: { mutate: () => void; isPending: boolean };
  setStrategy: { mutate: (a: { strategy: "combat" | "gather" | "rest" | "explore" | "infuse" }) => void; isPending: boolean };
  ec: string;
  mobileMode?: boolean;
}) {
  const [activePanel, setActivePanel] = useState<PanelId>("combat");
  const [showProfessionPanel, setShowProfessionPanel] = useState(false);
  // 背包道具查詢（頂層呼叫，遵守 React Hooks 規則）
  const invQuery = trpc.gameWorld.getInventory.useQuery(undefined, { staleTime: 30000 });
  const invItems = (invQuery.data ?? []) as Array<{ id: number; itemId: string; itemName: string; quantity: number; rarity?: string; itemType?: string; emoji?: string }>;
  const agentElement = agent?.dominantElement ?? equippedData?.dayMasterElementEn ?? "metal";
  const agentName = agent?.agentName ?? "旅人";
  const agentLevel = agent?.level ?? 1;
  const agentHp = agent?.hp ?? 100;
  const agentMaxHp = (agent?.maxHp ?? 100) + (equippedData?.equipBonus?.hp ?? 0);
  const agentMp = agent?.mp ?? 50;
  const agentMaxMp = agent?.maxMp ?? 50;
  const agentStamina = staminaInfo?.current ?? agent?.stamina ?? 100;
  const agentMaxStamina = staminaInfo?.max ?? agent?.maxStamina ?? 100;
  const agentGold = agent?.gold ?? 0;
  const agentStrategy = agent?.strategy ?? "explore";
  const agentStatus = agent?.status ?? "idle";
  const agentAP = agent?.actionPoints ?? 5;
  const agentMaxAP = agent?.maxActionPoints ?? 5;
  const agentExp = agent?.exp ?? 0;
  // GD-028 V3: 使用和後端 statEngine.calcExpToNextV2 相同的變指數公式
  const calcExpToNextFn = (level: number): number => {
    if (level >= 99) return 999999;
    if (level <= 0) return 2;
    return Math.floor(2 * Math.pow(level, 1.6 + 0.25 * Math.log(level)));
  };
  const agentExpToNext = calcExpToNextFn(agent?.level ?? 1);
  const userGender = equippedData?.userGender ?? "female";
  const gameCoins = balanceData?.gameCoins ?? 0;
  const gameStones = balanceData?.gameStones ?? 0;
  const todayStem = dailyData?.dayPillar?.stem ?? "甲";
  const todayBranch = dailyData?.dayPillar?.branch ?? "子";
  const todayElement = dailyData?.dayPillar?.stemElement ?? "木";
  const todayElementEn = ({"木":"wood","火":"fire","土":"earth","金":"metal","水":"water"} as Record<string,string>)[todayElement] ?? "wood";
  const todayColor = WX_HEX[todayElementEn] ?? "#22c55e";
  const equipped = equippedData?.equipped ?? {};
  const statusLabel = agentStatus === "idle" ? "待機" : agentStatus === "moving" ? "移動中" : agentStatus === "resting" ? "休息中" : agentStatus === "combat" ? "戰鬥中" : agentStatus;
  const statusBg = agentStatus === "combat" ? "rgba(239,68,68,0.12)" : agentStatus === "idle" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)";
  const statusFg = agentStatus === "combat" ? "#ef4444" : agentStatus === "idle" ? "#22c55e" : "#f59e0b";

  // 靈相干預已取消每日限制，只要有靈力值即可使用
  const healUsedToday = false;
  const eyeUsedToday = false;
  const staminaUsedToday = false;

  // GD-002 戰鬥系屬性値（加上裝備加成）
  const eb = equippedData?.equipBonus ?? {} as Record<string, number>;
  const caps = {
    hp: equippedData?.statCaps?.hp ?? 99999,
    mp: equippedData?.statCaps?.mp ?? 9999,
    atk: equippedData?.statCaps?.atk ?? 1500,
    def: equippedData?.statCaps?.def ?? 1500,
    spd: equippedData?.statCaps?.spd ?? 1500,
    matk: equippedData?.statCaps?.matk ?? 1500,
    mdef: equippedData?.statCaps?.mdef ?? 1500,
    wuxing: equippedData?.statCaps?.wuxing ?? 100,
  };
  const combatValues: Record<string, number> = {
    attack: (agent?.attack ?? 10) + (eb.atk ?? 0),
    defense: (agent?.defense ?? 5) + (eb.def ?? 0),
    speed: (agent?.speed ?? 8) + (eb.spd ?? 0),
    healPower: agent?.healPower ?? 20,
    magicAttack: agent?.magicAttack ?? 20,
    // GD-028 新增屬性
    mdef: agent?.mdef ?? 0,
    spr: agent?.spr ?? 0,
    critRate: agent?.critRate ?? 0,
    critDamage: agent?.critDamage ?? 150,
  };
  // 角色身份資訊
  const agentRealm = agent?.realm ?? "初界";
  const agentProfession = agent?.profession ?? "none";
  const agentFateElement = agent?.fateElement ?? agentElement;
  const agentFreePoints = agent?.freeStatPoints ?? 0;
  const realmInfo = REALM_LABELS[agentRealm] ?? REALM_LABELS["初界"];
  const profInfo = PROFESSION_LABELS[agentProfession] ?? PROFESSION_LABELS["none"];
  const fateInfo = FATE_LABELS[agentFateElement] ?? FATE_LABELS["wood"];
  // GD-002 生活系屬性值
  const lifeValues: Record<string, number> = {
    gatherPower: agent?.gatherPower ?? 20,
    forgePower: agent?.forgePower ?? 20,
    carryWeight: agent?.carryWeight ?? 20,
    refinePower: agent?.refinePower ?? 20,
    treasureHunting: agent?.treasureHunting ?? 20,
  };

  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillPickerSlot, setSkillPickerSlot] = useState<{ type: "active" | "passive"; index: number; slot: "skillSlot1" | "skillSlot2" | "skillSlot3" | "skillSlot4" | "passiveSlot1" | "passiveSlot2" | "hiddenSlot1" } | null>(null);
  const [skillWuxingFilter, setSkillWuxingFilter] = useState("");
  // ★ 技能目錄查詢：始終啟用（用於技能槽位顯示 + Picker）
  const skillCatalogAllQuery = trpc.gameWorld.getSkillCatalogForPlayer.useQuery(
    undefined, { staleTime: 120000 }
  );
  // 建立 skillId → 技能資訊的查找表
  const skillCatalogMap = useMemo(() => {
    const map: Record<string, { name: string; element: string; type: "active" | "passive"; desc: string; icon: string }> = {};
    for (const sk of skillCatalogAllQuery.data ?? []) {
      const elEn = WX_ZH_TO_EN[sk.wuxing ?? ""] ?? sk.wuxing ?? "";
      map[sk.skillId] = {
        name: sk.name,
        element: elEn,
        type: sk.category?.includes("passive") ? "passive" : "active",
        desc: sk.description ?? "",
        icon: WX_SKILL_ICON[sk.wuxing ?? ""] ?? "\u2728",
      };
    }
    return map;
  }, [skillCatalogAllQuery.data]);
  // Picker 用的過濾查詢（可按五行過濾）
  const skillCatalogQuery = trpc.gameWorld.getSkillCatalogForPlayer.useQuery(
    skillWuxingFilter ? { wuxing: skillWuxingFilter } : undefined,
    { enabled: showSkillPicker, staleTime: 60000 }
  );
  // 查詢已學技能列表（從 agent_skills 表）
  const learnedSkillsQuery = trpc.gameWorld.getMyLearnedSkills.useQuery(undefined, { staleTime: 30000 });
  const learnedSkillIds = new Set((learnedSkillsQuery.data ?? []).map(s => s.skillId));
  // ★ 天命考核技能查詢
  const questLearnedQuery = trpc.questSkillProgress.myLearnedSkills.useQuery(undefined, { staleTime: 30000 });
  const equippedQuestSkills = useMemo(() => {
    return (questLearnedQuery.data ?? []).filter((l: any) => l.isEquipped === 1);
  }, [questLearnedQuery.data]);
  const cpUtils = trpc.useUtils();
  const installSkillMutation = trpc.gameWorld.installSkill.useMutation({
    onSuccess: () => {
      setShowSkillPicker(false);
      toast.success("技能安裝成功！");
      // Bug 1 fix: 安裝後立即刷新 agent 資料，讓技能槽 UI 更新
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      cpUtils.gameWorld.getAgentStatus.invalidate();
    },
    onError: (e) => toast.error("安裝失敗：" + e.message),
  });
  const [itemCategory, setItemCategory] = useState<"all" | "material" | "consumable" | "equipment" | "skill_book">("all");
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [detailItemMeta, setDetailItemMeta] = useState<{ name?: string; emoji?: string; rarity?: string } | null>(null);
  const [showEquipShop, setShowEquipShop] = useState(false);
  const [equipShopWuxing, setEquipShopWuxing] = useState("");
  const [equipShopSlot, setEquipShopSlot] = useState("");
  // 裝備槽選取式 Modal
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<string | null>(null);
  const [equipPickerWuxing, setEquipPickerWuxing] = useState("");
  const [compareEquipId, setCompareEquipId] = useState<string | null>(null);
  const compareQuery = trpc.gameWorld.getEquipCompare.useQuery(
    { equipId: compareEquipId! },
    { enabled: !!compareEquipId, staleTime: 30000 }
  );
  const equipCatalogQuery = trpc.gameWorld.getEquipmentCatalog.useQuery(
    { wuxing: equipShopWuxing || undefined, slot: equipShopSlot || undefined },
    { enabled: showEquipShop, staleTime: 60000 }
  );
  // 裝備槽選取 Modal 用的背包裝備查詢（提升到頂層避免違反 Hooks 規則）
  // 重要：查詢的是角色背包中的裝備道具，而非圖鑑全部裝備
  const FRONT_TO_CATALOG_MAP: Record<string, string> = {
    weapon: "weapon", offhand: "offhand",
    head: "helmet", body: "armor",
    hands: "gloves", feet: "shoes",
    ringA: "ringA", ringB: "ringB",
    necklace: "necklace", amulet: "amulet",
  };
  const WX_ZH_TO_EN_PICKER: Record<string, string> = { "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water" };
  const pickerCatalogSlot = selectedEquipSlot ? (FRONT_TO_CATALOG_MAP[selectedEquipSlot] ?? selectedEquipSlot) : undefined;
  // 改用 getInventoryEquipments：只顯示角色背包中實際擁有的裝備道具
  const equipPickerQuery = trpc.gameWorld.getInventoryEquipments.useQuery(
    { slot: pickerCatalogSlot },
    { enabled: !!selectedEquipSlot, staleTime: 10000 }
  );
  const equipItemMutation = trpc.gameWorld.equipItem.useMutation({
    onSuccess: (data) => {
      const msg = data.action === 'equip' ? `裝備了「${data.equipName}」` : `卸下了「${data.equipName}」`;
      toast.success(msg);
      // 同步刷新裝備資料和角色屬性（即時更新裝備加成）
      cpUtils.gameAvatar.getEquipped.invalidate();
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      invQuery.refetch();
    },
    onError: (e) => toast.error("裝備失敗：" + e.message),
  });
  const useItemMutation = trpc.gameWorld.useItem.useMutation({
    onSuccess: (data) => {
      toast.success(`使用了「${data.itemName}」！HP: ${data.newHp}, MP: ${data.newMp}`);
      invQuery.refetch();
    },
    onError: (e) => toast.error("使用失敗：" + e.message),
  });
  const [skillLearnEffect, setSkillLearnEffect] = useState<{ name: string; show: boolean } | null>(null);
  const learnSkillMutation = trpc.gameWorld.learnSkillFromBook.useMutation({
    onSuccess: (data) => {
      // 顯示學習成功特效
      setSkillLearnEffect({ name: data.skillName, show: true });
      toast.success(`✨ 成功習得技能「${data.skillName}」！`);
      invQuery.refetch();
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      cpUtils.gameWorld.getMyLearnedSkills.invalidate();
      // 1.5 秒後自動跳轉到技能面板
      setTimeout(() => {
        setActivePanel("skill");
        setSkillLearnEffect(null);
      }, 1800);
    },
    onError: (e) => toast.error("學習失敗：" + e.message),
  });
  const uploadAvatarMutation = trpc.gameWorld.uploadAgentAvatar.useMutation();
  const PANELS: { id: PanelId; icon: string; label: string }[] = [
    { id: "combat", icon: "⚔️", label: "戰鬥" },
    { id: "life",   icon: "🏠", label: "生活" },
    { id: "items",  icon: "🎒", label: "道具" },
    { id: "equip",  icon: "🛡️", label: "裝備" },
    { id: "skill",  icon: "✨", label: "技能" },
    { id: "natal",  icon: "🔮", label: "命格" },
  ];

  return (
    <>
    {/* 技能學習成功特效覆蓋層 */}
    {skillLearnEffect?.show && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ animation: 'fadeIn 0.3s ease-out' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(255,200,50,0.15) 0%, transparent 70%)' }} />
        <div className="relative flex flex-col items-center gap-4" style={{ animation: 'skillLearnBounce 0.6s ease-out' }}>
          <div className="text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(255,200,50,0.8))', animation: 'skillLearnSpin 1s ease-out' }}>✨</div>
          <div className="text-2xl font-bold text-center" style={{ color: '#ffd700', textShadow: '0 0 20px rgba(255,200,50,0.6)', animation: 'skillLearnFadeUp 0.8s ease-out 0.3s both' }}>
            習得新技能！
          </div>
          <div className="text-xl font-semibold text-center px-6 py-2 rounded-xl" style={{ background: 'rgba(255,200,50,0.15)', border: '1px solid rgba(255,200,50,0.3)', color: '#ffeaa7', animation: 'skillLearnFadeUp 0.8s ease-out 0.5s both' }}>
            「{skillLearnEffect.name}」
          </div>
          <div className="text-sm opacity-60 mt-2" style={{ color: '#ffeaa7', animation: 'skillLearnFadeUp 0.8s ease-out 0.8s both' }}>
            即將跳轉至技能面板...
          </div>
        </div>
      </div>
    )}
    <style>{`
      @keyframes skillLearnBounce { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes skillLearnSpin { 0% { transform: rotate(0deg) scale(0.5); } 50% { transform: rotate(180deg) scale(1.2); } 100% { transform: rotate(360deg) scale(1); } }
      @keyframes skillLearnFadeUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
    `}</style>
    <div className="flex flex-col overflow-hidden flex-1">
      {/* 旅人頭部：手機版底部拜屋模式下隱藏 */}
      {!mobileMode && (
        <div className="px-4 py-3 flex items-center gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(135deg, rgba(8,12,25,0.99) 0%, rgba(15,20,40,0.99) 100%)" }}>
          {/* 角色頭像（點擊可上傳自訂圖片） */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 shrink-0 relative overflow-hidden cursor-pointer group"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${ec}30, rgba(6,10,22,0.9))`,
              borderColor: `${ec}60`,
              boxShadow: `0 0 20px ${ec}40, inset 0 0 10px ${ec}15`,
            }}
            title="點擊更換頭像"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                // 在瀏覽器中壓縮圖片到 200x200 JPEG
                const canvas = document.createElement("canvas");
                canvas.width = 200; canvas.height = 200;
                const ctx2d = canvas.getContext("2d")!;
                const img = new Image();
                img.onload = async () => {
                  // 裁切為正方形居中
                  const size = Math.min(img.width, img.height);
                  const sx = (img.width - size) / 2;
                  const sy = (img.height - size) / 2;
                  ctx2d.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
                  const base64 = canvas.toDataURL("image/jpeg", 0.8);
                  try {
                    const result = await uploadAvatarMutation.mutateAsync({ imageBase64: base64, mimeType: "image/jpeg" });
                    toast.success("頭像已更新！地圖標記將顯示您的照片");
                    cpUtils.gameWorld.getOrCreateAgent.invalidate();
                    void result;
                  } catch (err: unknown) {
                    toast.error("上傳失敗：" + (err instanceof Error ? err.message : "未知錯誤"));
                  }
                };
                img.src = URL.createObjectURL(file);
              };
              input.click();
            }}
          >
            {agent?.avatarUrl ? (
              <img src={agent.avatarUrl} alt="頭像" className="w-full h-full object-cover" />
            ) : (
              userGender === "male" ? "🧙" : "🧙‍♀️"
            )}
            {/* Hover 提示 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
              📷
            </div>
            {/* 等級徽章 */}
            <span className="absolute -bottom-1 -right-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full border"
              style={{ background: `${ec}22`, borderColor: `${ec}50`, color: ec }}>Lv.{agentLevel}</span>
          </div>
          {/* 角色資訊 */}
          <div className="flex-1 min-w-0">
            {/* 名稱行 */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-slate-100 font-bold text-base leading-tight">{agentName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0 border"
                style={{ background: `${ec}18`, borderColor: `${ec}45`, color: ec }}>{WX_ZH[agentElement] ?? "金"}命</span>
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-semibold border"
                style={{ background: statusBg, borderColor: statusFg + "50", color: statusFg }}>{statusLabel}</span>
            </div>
            {/* 經驗條 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${agentExpToNext > 0 ? Math.min(100,(agentExp/agentExpToNext)*100) : 0}%`, background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
              </div>
              <span className="text-xs text-slate-500 shrink-0 tabular-nums">{agentExp}/{agentExpToNext}</span>
            </div>
            {/* 靈力指示 */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {Array.from({ length: agentMaxAP }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full border transition-all"
                  style={{
                    background: i < agentAP ? "#a78bfa" : "transparent",
                    borderColor: i < agentAP ? "#a78bfa" : "rgba(255,255,255,0.15)",
                    boxShadow: i < agentAP ? "0 0 4px #a78bfa" : "none",
                  }} />
              ))}
              <span className="text-[10px] text-slate-600 ml-1">靈力 {agentAP}/{agentMaxAP}</span>
            </div>
          </div>
          {/* 幣値小卡 */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm font-bold text-amber-400">🪙 {gameCoins.toLocaleString()}</span>
            <span className="text-sm font-bold text-sky-400">💎 {gameStones.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Tab 列 */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,12,25,0.97)" }}>
        {PANELS.map(p => (
          <button key={p.id} onClick={() => setActivePanel(p.id)}
            className="flex-1 py-2.5 flex flex-col items-center gap-1 transition-all"
            style={{
              background: activePanel === p.id ? `${ec}12` : "transparent",
              color: activePanel === p.id ? ec : "rgba(148,163,184,0.5)",
              borderBottom: activePanel === p.id ? `2px solid ${ec}` : "2px solid transparent",
            }}>
            <span className="text-[26px] leading-none">{p.icon}</span>
            <span className="text-[11px] font-medium">{p.label}</span>
          </button>
        ))}
      </div>

      {/* 面板內容：overflow-y-auto 讓內容在固定高度內滾動 */}
      <div className="overflow-y-auto flex-1 px-3 py-2.5 space-y-2.5"
        style={{ background: "rgba(8,12,25,0.97)" }}>

        {/* ── 戰鬥面板 ── */}
        {activePanel === "combat" && (
          <div className="space-y-2.5">
            {/* ═══ 角色身份卡片（境界/職業/命格） ═══ */}
            <div className="rounded-xl border p-2.5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500">🃏 角色身份</span>
                {agentFreePoints > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse"
                    style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.4)" }}>
                    潛能點 +{agentFreePoints}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* 境界 */}
                <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg"
                  style={{ background: `${realmInfo.color}10`, border: `1px solid ${realmInfo.color}30` }}>
                  <span className="text-lg">{realmInfo.icon}</span>
                  <span className="text-[10px] text-slate-500">境界</span>
                  <span className="text-xs font-bold" style={{ color: realmInfo.color }}>{realmInfo.label}</span>
                </div>
                {/* 職業（可點擊開啟轉職面板） */}
                <button onClick={() => setShowProfessionPanel(!showProfessionPanel)}
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all hover:scale-105"
                  style={{ background: `${profInfo.color}10`, border: `1px solid ${profInfo.color}30` }}>
                  <span className="text-lg">{profInfo.icon}</span>
                  <span className="text-[10px] text-slate-500">職業</span>
                  <span className="text-xs font-bold" style={{ color: profInfo.color }}>{profInfo.label}</span>
                  <span className="text-[8px] text-slate-600">點擊轉職</span>
                </button>
                {/* 命格 */}
                <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg"
                  style={{ background: `${fateInfo.color}10`, border: `1px solid ${fateInfo.color}30` }}>
                  <span className="text-lg">{fateInfo.icon}</span>
                  <span className="text-[10px] text-slate-500">命格</span>
                  <span className="text-xs font-bold" style={{ color: fateInfo.color }}>{(fateInfo as any).fateName ?? fateInfo.label}</span>
                  <span className="text-[9px] text-slate-600">{(fateInfo as any).desc ?? ""}</span>
                </div>
              </div>
            </div>

            {/* 生命/魔力/體力 */}
            <StatBar icon="❤️" label="HP"   value={agentHp}      max={agentMaxHp}      color="#ef4444" />
            {(equippedData?.equipBonus?.hp ?? 0) > 0 && (
              <div className="flex justify-end gap-1 text-[9px] px-1">
                <span className="text-slate-500">基礎 {agent?.maxHp ?? 100}</span>
                <span className="text-emerald-400 font-bold">+{equippedData?.equipBonus?.hp ?? 0} 裝備</span>
                <span className="text-slate-400">= {agentMaxHp}</span>
              </div>
            )}
            <StatBar icon="💧" label="MP"   value={agentMp}      max={agentMaxMp}      color="#38bdf8" />
            <StatBar icon="🏃" label="體力" value={agentStamina} max={agentMaxStamina} color="#22c55e" />
              {staminaInfo && agentStamina < agentMaxStamina && (
              <p className="text-xs text-slate-600 text-right">下次恢復：{staminaInfo.nextRegenMin} 分鐘後（+{staminaInfo.regenAmount ?? 30}）</p>
            )}

            {/* GD-002 戰鬥系五行屬性 */}
            <div className="rounded-xl border p-2.5 space-y-1.5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-slate-500">⚔️ 戰鬥系屬性</p>
                <span className="text-[10px] text-slate-600">上限 {caps.atk}</span>
              </div>
              {COMBAT_ATTRS.map(a => {
                const baseVal = (() => {
                  switch (a.key) {
                    case "attack": return agent?.attack ?? 10;
                    case "defense": return agent?.defense ?? 5;
                    case "speed": return agent?.speed ?? 8;
                    case "healPower": return agent?.healPower ?? 20;
                    case "magicAttack": return agent?.magicAttack ?? 20;
                    default: return 0;
                  }
                })();
                const attrCap = (() => {
                  switch (a.key) {
                    case "attack": return caps.atk;
                    case "defense": return caps.def;
                    case "speed": return caps.spd;
                    case "magicAttack": return caps.matk;
                    default: return caps.atk;
                  }
                })();
                const equipBonus = (() => {
                  switch (a.key) {
                    case "attack": return eb.atk ?? 0;
                    case "defense": return eb.def ?? 0;
                    case "speed": return eb.spd ?? 0;
                    default: return 0;
                  }
                })();
                const total = combatValues[a.key] ?? 0;
                return (
                  <div key={a.key} className="space-y-0.5">
                    <MiniAttrBar icon={a.icon} label={a.label}
                      value={total}
                      color={WX_HEX[a.wx] ?? "#888"} max={attrCap} />
                    {equipBonus > 0 && (
                      <div className="flex justify-end gap-1 text-[9px] px-1">
                        <span className="text-slate-500">{baseVal}</span>
                        <span className="text-emerald-400 font-bold">+{equipBonus} 裝備</span>
                        <span className="text-slate-400">= {total}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="mt-1.5 px-2 py-1.5 rounded-lg text-[10px] space-y-0.5"
                style={{ background: "rgba(255,255,255,0.03)", borderLeft: "2px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                <p>🌲 木屬性 × 3.0 → 最大HP</p>
                <p>🔥 火屬性 × 2.0 → 攻擊力</p>
                <p>🌍 土屬性 × 2.5 → 防禦力</p>
                <p>⚔️ 金屬性 × 1.5 → 速度</p>
                <p>💧 水屬性 × 2.0 → 法力/最大MP</p>
              </div>
            </div>

            {/* GD-028 進階戰鬥屬性（魔防/精神/暴擊） */}
            <div className="rounded-xl border p-2.5 space-y-1.5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-slate-500">🛡️ 進階屬性</p>
                <span className="text-[10px] text-slate-600">GD-028</span>
              </div>
              {[
                { key: "mdef",       icon: "🛡️", label: "魔法防禦", color: "#a78bfa", max: caps.mdef, desc: "減少受到的魔法傷害" },
                { key: "spr",        icon: "✨",   label: "精神力",   color: "#e879f9", max: caps.mdef, desc: "狀態抗性與魔法回復" },
                { key: "critRate",   icon: "🎯",   label: "暴擊率",   color: "#fb923c", max: 100, desc: "觸發暴擊的機率 %" },
                { key: "critDamage", icon: "💥",   label: "暴擊傷害", color: "#f43f5e", max: 300, desc: "暴擊時的傷害倍率 %" },
              ].map(a => {
                const val = combatValues[a.key] ?? 0;
                return (
                  <div key={a.key} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] w-4">{a.icon}</span>
                      <span className="text-[11px] text-slate-400" style={{ minWidth: "52px" }}>{a.label}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (val / a.max) * 100)}%`, background: a.color }} />
                      </div>
                      <span className="text-[11px] font-bold w-10 text-right tabular-nums" style={{ color: val > 0 ? a.color : "#475569" }}>
                        {a.key === "critRate" || a.key === "critDamage" ? `${val}%` : val}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-600 pl-6">{a.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* 五行抗性顯示（由注靈計算） */}
            <div className="rounded-xl border p-2.5 space-y-1.5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-slate-500">🛡️ 五行抗性</p>
                <span className="text-[10px] text-slate-600">注靈每100點 +5%（上限 50%）</span>
              </div>
              {([
                { key: "resistWood",  label: "抗木", icon: "🌲", color: "#22c55e" },
                { key: "resistFire",  label: "抗火", icon: "🔥", color: "#ef4444" },
                { key: "resistEarth", label: "抗土", icon: "🌍", color: "#f59e0b" },
                { key: "resistMetal", label: "抗金", icon: "⚔️", color: "#94a3b8" },
                { key: "resistWater", label: "抗水", icon: "💧", color: "#38bdf8" },
              ] as const).map(r => {
                const pct = (agent as any)?.[r.key] ?? 0;
                return (
                  <div key={r.key} className="flex items-center gap-2">
                    <span className="text-[11px] w-4">{r.icon}</span>
                    <span className="text-[11px] text-slate-400 w-8">{r.label}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, pct * 2)}%`, background: r.color }} />
                    </div>
                    <span className="text-[11px] font-bold w-8 text-right" style={{ color: pct > 0 ? r.color : "#475569" }}>{pct}%</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-600 mt-1">注靈注入對應屬性可提升抗性，最高減傷 50%</p>
            </div>

            {/* GD-028 職業轉職面板 */}
            {showProfessionPanel && (
              <ProfessionPanel
                currentProfession={agentProfession}
                agentLevel={agentLevel}
                agentGold={agentGold}
                onClose={() => setShowProfessionPanel(false)}
              />
            )}

            {/* GD-028 潛能點數分配 */}
            <PotentialAllocPanel agent={agent} />

            {/* 提示：行動策略和靈相干預已移至地圖浮動控件 */}
            <div className="px-2.5 py-2 rounded-xl border text-xs text-slate-600"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <p className="text-slate-500 font-bold mb-1">💡 快速操作</p>
              <p>⚔️ 行動策略 → 地圖右下角浮動面板</p>
              <p>✨ 靈相干預 → 地圖右上角浮動面板</p>
              <p>❤️ HP/MP/體力 → 地圖左側浮動條</p>
            </div>
          </div>
        )}

        {/* ── 生活面板 ── */}
        {activePanel === "life" && (
          <div className="space-y-2.5">
            {/* 今日流日加成 */}
            <div className="px-2.5 py-2 rounded-xl border"
              style={{ background: `${todayColor}08`, borderColor: `${todayColor}28` }}>
              <p className="text-xs text-slate-500 mb-0.5">今日流日加成</p>
              <p className="text-sm font-bold" style={{ color: todayColor }}>{todayStem}{todayBranch}（{todayElement}旺）</p>
              <p className="text-xs text-slate-400 mt-0.5">{todayElement}屬性掉落率 +30%・技能傷害 +20%</p>
            </div>

            {/* GD-002 生活系五行屬性 */}
            <div className="rounded-xl border p-2.5 space-y-1.5"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-slate-500">🌿 生活系屬性</p>
                <span className="text-[10px] text-slate-600">上限 {caps.wuxing}</span>
              </div>
              {LIFE_ATTRS.map(a => (
                <MiniAttrBar key={a.key} icon={a.icon} label={a.label}
                  value={lifeValues[a.key] ?? 0}
                  color={WX_HEX[a.wx] ?? "#888"} max={caps.wuxing} />
              ))}
              {/* 尋寶力特別說明 */}
              <div className="mt-1.5 px-2 py-1.5 rounded-lg text-xs"
                style={{ background: "rgba(56,189,248,0.06)", borderLeft: "2px solid rgba(56,189,248,0.4)", color: "#94a3b8" }}>
💧 尋寶力 {lifeValues.treasureHunting} → {lifeValues.treasureHunting >= 80 ? "密店感知強（最高80%機率）" : lifeValues.treasureHunting >= 50 ? "偶有感知（約40%機率）" : lifeValues.treasureHunting >= 30 ? "微弱感知（約20%機率）" : "最低機率（5%）—仿然有機會發現密店、隱藏NPC、隱藏任務"}
              </div>
            </div>
          </div>
        )}

        {/* ── 道具面板 ── */}
        {activePanel === "items" && (
          <div className="space-y-2.5">
            {/* 分類筛選 */}
            <div className="flex gap-1.5">
              {([
                { id: "all",         label: "全部" },
                { id: "material",    label: "鍛造素材" },
                { id: "consumable",  label: "消耗道具" },
                { id: "equipment",   label: "裝備" },
                { id: "skill_book",  label: "📖 技能書" },
              ] as const).map(cat => (
                <button key={cat.id} onClick={() => setItemCategory(cat.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: itemCategory === cat.id ? `${ec}18` : "rgba(255,255,255,0.03)",
                    borderColor: itemCategory === cat.id ? `${ec}55` : "rgba(255,255,255,0.08)",
                    color: itemCategory === cat.id ? ec : "rgba(148,163,184,0.5)",
                  }}>
                  {cat.label}
                </button>
              ))}
            </div>
            {/* 道具列表 */}
            {invQuery.isLoading ? (
              <p className="text-xs text-slate-600 text-center py-4">載入中…</p>
            ) : (() => {
              const filtered = invItems.filter(item => {
                if (itemCategory === "all") return true;
                if (itemCategory === "material") return item.itemType === "material" || (!item.itemType && !item.rarity);
                if (itemCategory === "consumable") return item.itemType === "consumable" || item.itemType === "potion";
                // 裝備分類：只根據 itemType，不用 rarity 判斷（避免鍵造素材被誤分入裝備）
                if (itemCategory === "equipment") return item.itemType === "equipment";
                if (itemCategory === "skill_book") return item.itemType === "skill_book";
                return true;
              });
              if (filtered.length === 0) return (
                <div className="text-center py-6">
                  <p className="text-slate-600 text-sm">此分類為空</p>
                  <p className="text-slate-700 text-xs mt-1">擊敗怪物後將獲得道具</p>
                </div>
              );
              return (
                <div className="space-y-1.5">
                  {filtered.map(item => {
                    const rc = item.rarity ? QUALITY_COLOR[item.rarity] ?? "#94a3b8" : "#94a3b8";
                    const typeLabel = item.itemType === "material" ? "鍛造素材" :
                      item.itemType === "consumable" || item.itemType === "potion" ? "消耗道具" :
                      item.itemType === "equipment" ? "裝備" :
                      item.itemType === "skill_book" ? "技能書" : "道具";
                    return (
                      <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer active:scale-[0.98] transition-transform"
                        style={{ background: `${rc}08`, borderColor: `${rc}25` }}
                        onClick={() => { setDetailItemId(item.itemId); setDetailItemMeta({ name: item.itemName, emoji: item.emoji, rarity: item.rarity }); }}>
                        <span className="text-xl shrink-0">{item.emoji ?? "📦"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold" style={{ color: rc }}>{item.itemName}</p>
                            <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: `${rc}20`, color: rc }}>{typeLabel}</span>
                            {item.rarity && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>{QUALITY_ZH[item.rarity] ?? item.rarity}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-400 shrink-0">x{item.quantity}</span>
                      {(item.itemType === "consumable" || item.itemType === "potion") && (
                        <button
                          onClick={() => useItemMutation.mutate({ inventoryId: item.id })}
                          disabled={useItemMutation.isPending}
                          className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95"
                          style={{ background: `${ec}25`, color: ec, border: `1px solid ${ec}40` }}>
                          使用
                        </button>
                      )}
                      {item.itemType === "skill_book" && (
                        <button
                          onClick={() => learnSkillMutation.mutate({ inventoryId: item.id })}
                          disabled={learnSkillMutation.isPending}
                          className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95"
                          style={{ background: `${ec}25`, color: ec, border: `1px solid ${ec}40` }}>
                          學習
                        </button>
                      )}
                      {item.itemType === "equipment" && (() => {
                        const isEquipped = Object.values(equipped).some((e: any) => e?.equipId === item.itemId || e?.id === item.itemId);
                        return (
                          <button
                            onClick={() => equipItemMutation.mutate({ equipId: item.itemId, action: isEquipped ? 'unequip' : 'equip' })}
                            disabled={equipItemMutation.isPending}
                            className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95"
                            style={{
                              background: isEquipped ? 'rgba(239,68,68,0.15)' : `${ec}25`,
                              color: isEquipped ? '#ef4444' : ec,
                              border: `1px solid ${isEquipped ? 'rgba(239,68,68,0.3)' : `${ec}40`}`,
                            }}>
                            {isEquipped ? '卸下' : '裝備'}
                          </button>
                        );
                      })()}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── 裝備面板（GD-006）── */}
        {activePanel === "equip" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">裝備欄位（10格）</p>
                <p className="text-[10px] text-slate-600">點擊槽位可選取裝備</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {EQUIP_SLOTS.map(({ slot, icon, label, desc }) => {
                  const item = equipped[slot];
                  const qc = item?.quality ? QUALITY_COLOR[item.quality] ?? "#94a3b8" : null;
                  return (
                    <div key={slot}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-pointer active:scale-[0.98] transition-transform"
                      style={{
                        background: item ? `${qc ?? ec}08` : "rgba(255,255,255,0.02)",
                        borderColor: item ? `${qc ?? ec}30` : "rgba(255,255,255,0.07)",
                      }}
                      onClick={() => { setSelectedEquipSlot(slot); setEquipPickerWuxing(""); }}>
                      <span className="text-lg shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">{label}</p>
                        {item ? (
                          <div>
                            <p className="text-xs font-bold text-slate-200 leading-tight truncate">{item.name}</p>
                            {item.quality && qc && (
                              <span className="text-xs px-1 py-0.5 rounded-full"
                                style={{ background: `${qc}20`, color: qc }}>
                                {QUALITY_ZH[item.quality] ?? item.quality}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-700 italic">{desc}</p>
                        )}
                      </div>
                      {/* 裝備區卸下按鈕 */}
                      {item && item.equipId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); equipItemMutation.mutate({ equipId: item.equipId!, action: 'unequip' }); }}
                          disabled={equipItemMutation.isPending}
                          className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border transition-colors"
                          style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
                          title="卸下裝備">
                          卸
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 裝備屬性加成摘要 */}
              {(() => {
                const equippedList = Object.entries(equipped).filter(([, v]) => v != null) as [string, { name: string; quality?: string; hpBonus?: number; attackBonus?: number; defenseBonus?: number; speedBonus?: number }][];
                // 計算總加成
                const totalHp  = equippedList.reduce((s, [, e]) => s + (e?.hpBonus ?? 0), 0);
                const totalAtk = equippedList.reduce((s, [, e]) => s + (e?.attackBonus ?? 0), 0);
                const totalDef = equippedList.reduce((s, [, e]) => s + (e?.defenseBonus ?? 0), 0);
                const totalSpd = equippedList.reduce((s, [, e]) => s + (e?.speedBonus ?? 0), 0);
                if (equippedList.length === 0) return (
                  <div className="px-2.5 py-2 rounded-xl border text-center"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                    <p className="text-xs text-slate-600">尚未裝備任何裝備</p>
                    <p className="text-[10px] text-slate-700 mt-0.5">至「道具」頁簽選擇裝備並安裝</p>
                  </div>
                );
                return (
                  <div className="rounded-xl border p-2.5 space-y-2"
                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                    {/* 裝備列表 */}
                    <p className="text-xs font-bold text-slate-400">⚔️ 裝備列表</p>
                    {equippedList.map(([slot, e]) => {
                      const qc = e?.quality ? QUALITY_COLOR[e.quality] ?? '#94a3b8' : '#94a3b8';
                      const bonusParts: string[] = [];
                      if (e?.hpBonus) bonusParts.push(`HP+${e.hpBonus}`);
                      if (e?.attackBonus) bonusParts.push(`攻+${e.attackBonus}`);
                      if (e?.defenseBonus) bonusParts.push(`防+${e.defenseBonus}`);
                      if (e?.speedBonus) bonusParts.push(`速+${e.speedBonus}`);
                      return (
                        <div key={slot} className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 w-10 shrink-0">{EQUIP_SLOTS.find(s => s.slot === slot)?.label ?? slot}</span>
                          <span className="text-xs font-bold truncate" style={{ color: qc }}>{e?.name ?? ''}</span>
                          {bonusParts.length > 0 && (
                            <span className="text-[10px] text-emerald-400 ml-auto shrink-0">{bonusParts.join(' ')}</span>
                          )}
                        </div>
                      );
                    })}
                    {/* 總加成摘要 */}
                    <div className="pt-1.5 border-t border-slate-800/60">
                      <p className="text-xs font-bold text-slate-400 mb-1">✨ 總加成</p>
                      <div className="grid grid-cols-4 gap-1">
                        {[{ label: 'HP', val: totalHp, color: '#ef4444' }, { label: '攻擊', val: totalAtk, color: '#f59e0b' }, { label: '防禦', val: totalDef, color: '#3b82f6' }, { label: '速度', val: totalSpd, color: '#22c55e' }].map(({ label, val, color }) => (
                          <div key={label} className="text-center rounded-lg py-1" style={{ background: `${color}10` }}>
                            <p className="text-[10px] text-slate-500">{label}</p>
                            <p className="text-xs font-bold" style={{ color }}>+{val}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">• 裝備加成已實際套用至戰鬥屬性</p>
                    </div>
                  </div>
                );
              })()}
            </div>
        )}

        {/* ── 裝備槽選取 Modal ── */}
        {selectedEquipSlot && (() => {
          const slotInfo = EQUIP_SLOTS.find(s => s.slot === selectedEquipSlot);
          const currentEquip = equipped[selectedEquipSlot];
          return (
            <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: "rgba(4,8,20,0.97)" }}>
              <div className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <p className="text-sm font-bold text-slate-100">{slotInfo?.icon} {slotInfo?.label} 選取裝備</p>
                  <p className="text-xs text-slate-500">點擊裝備即可裝備至此槽位</p>
                </div>
                <button onClick={() => setSelectedEquipSlot(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400"
                  style={{ background: "rgba(255,255,255,0.08)" }}>✕</button>
              </div>
              {/* 已裝備的裝備 */}
              {currentEquip && (
                <div className="px-4 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] text-slate-600 mb-1">目前裝備</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                    style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <span className="text-sm font-bold text-slate-200 flex-1">{currentEquip.name}</span>
                    <button
                      onClick={() => { equipItemMutation.mutate({ equipId: currentEquip.equipId!, action: 'unequip' }); setSelectedEquipSlot(null); }}
                      disabled={equipItemMutation.isPending}
                      className="shrink-0 px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{ background: "rgba(239,68,68,0.15)", color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                      卸下
                    </button>
                  </div>
                </div>
              )}
              {/* 背包裝備列表（只顯示角色實際擁有的裝備） */}
              {(() => {
                const invEquips = equipPickerQuery.data ?? [];
                if (equipPickerQuery.isLoading) return <p className="text-xs text-slate-600 text-center py-8">載入中…</p>;
                if (invEquips.length === 0) return (
                  <div className="text-center py-8 px-4">
                    <p className="text-2xl mb-2">🎒</p>
                    <p className="text-slate-400 text-sm font-bold">背包中沒有此槽位的裝備</p>
                    <p className="text-slate-600 text-xs mt-1">擊敗怪物或到商店購買裝備後再回來選取</p>
                  </div>
                );
                return (
                  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                    {invEquips.map(eq => {
                      const qc = QUALITY_COLOR[eq.quality ?? 'common'] ?? '#94a3b8';
                      const isCurrentlyEquipped = eq.isEquipped;
                      const enhLv = eq.enhanceLevel ?? 0;
                      const bonusParts: string[] = [];
                      if (eq.hpBonus) bonusParts.push(`HP+${eq.hpBonus}`);
                      if (eq.attackBonus) bonusParts.push(`攻+${eq.attackBonus}`);
                      if (eq.defenseBonus) bonusParts.push(`防+${eq.defenseBonus}`);
                      if (eq.speedBonus) bonusParts.push(`速+${eq.speedBonus}`);
                      if (eq.matkBonus) bonusParts.push(`魔攻+${eq.matkBonus}`);
                      return (
                        <div key={`${eq.equipId}-${eq.invId}`}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer active:scale-[0.98] transition-transform"
                          style={{
                            background: isCurrentlyEquipped ? `${qc}15` : `${qc}08`,
                            borderColor: isCurrentlyEquipped ? `${qc}50` : `${qc}25`,
                          }}
                          onClick={() => {
                            if (!isCurrentlyEquipped) {
                              equipItemMutation.mutate({ equipId: eq.equipId, action: 'equip' });
                              setSelectedEquipSlot(null);
                            }
                          }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold" style={{ color: qc }}>
                                {eq.name}{enhLv > 0 ? <span className="text-amber-400 ml-0.5">+{enhLv}</span> : null}
                              </p>
                              <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: `${qc}20`, color: qc }}>{QUALITY_ZH[eq.quality ?? 'common'] ?? eq.quality}</span>
                              {isCurrentlyEquipped && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>已裝備</span>}
                              {eq.quantity > 1 && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>x{eq.quantity}</span>}
                            </div>
                            {bonusParts.length > 0 && <p className="text-[10px] text-emerald-400 mt-0.5">{bonusParts.join(' · ')}</p>}
                          </div>
                          {!isCurrentlyEquipped && (
                            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md font-bold"
                              style={{ background: `${ec}20`, color: ec, border: `1px solid ${ec}40` }}>裝備</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── 裝備商店全視窗 ── */}
        {showEquipShop && (
          <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "rgba(4,8,20,0.95)" }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="text-sm font-bold text-slate-100">🛒 裝備商店</p>
                <p className="text-xs text-slate-500">選擇裝備並裝備至對應欄位</p>
              </div>
              <button onClick={() => setShowEquipShop(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200"
                style={{ background: "rgba(255,255,255,0.08)" }}>✕</button>
            </div>
            {/* 筛選列 */}
            <div className="flex gap-1.5 px-3 py-2 shrink-0 overflow-x-auto">
              {["", "木", "火", "土", "金", "水"].map(w => (
                <button key={w} onClick={() => setEquipShopWuxing(w)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: equipShopWuxing === w ? `${ec}20` : "rgba(255,255,255,0.04)",
                    borderColor: equipShopWuxing === w ? `${ec}50` : "rgba(255,255,255,0.08)",
                    color: equipShopWuxing === w ? ec : "#64748b",
                  }}>{w || "全部"}</button>
              ))}
              <div className="w-px bg-slate-800 mx-1 shrink-0" />
              {["", "weapon", "helmet", "armor", "shoes", "accessory"].map(s => (
                <button key={s} onClick={() => setEquipShopSlot(s)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: equipShopSlot === s ? `${ec}20` : "rgba(255,255,255,0.04)",
                    borderColor: equipShopSlot === s ? `${ec}50` : "rgba(255,255,255,0.08)",
                    color: equipShopSlot === s ? ec : "#64748b",
                  }}>{s || "全部"}{s === "weapon" ? "🗡️" : s === "helmet" ? "⛑️" : s === "armor" ? "🛡️" : s === "shoes" ? "👢" : s === "accessory" ? "💍" : ""}</button>
              ))}
            </div>
            {/* 裝備列表 */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {equipCatalogQuery.isLoading ? (
                <p className="text-xs text-slate-600 text-center py-8">載入裝備圖鑑中…</p>
              ) : (equipCatalogQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-8">沒有符合條件的裝備</p>
              ) : (
                <div className="space-y-2 mt-1">
                  {(equipCatalogQuery.data ?? []).map((equip: any) => {
                    const wc = WX_HEX[({'木':'wood','火':'fire','土':'earth','金':'metal','水':'water'} as Record<string,string>)[equip.wuxing] ?? 'metal'] ?? '#94a3b8';
                    const tierColor = equip.tier === '傳說' ? '#f59e0b' : equip.tier === '高階' ? '#a78bfa' : equip.tier === '中階' ? '#38bdf8' : '#94a3b8';
                    return (
                      <div key={equip.id} className="px-3 py-3 rounded-xl border"
                        style={{ background: `${wc}06`, borderColor: `${wc}20` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <p className="text-sm font-bold text-slate-100">{equip.name}</p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: `${wc}20`, color: wc }}>{equip.wuxing}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: `${tierColor}20`, color: tierColor }}>{equip.tier}</span>
                              {equip.isEquipped && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-900/40 text-green-400 font-bold">已裝備</span>}
                            </div>
                            {equip.baseStats && <p className="text-xs text-slate-400 leading-tight">{equip.baseStats}</p>}
                            {equip.specialEffect && <p className="text-[10px] text-amber-400/80 mt-0.5 leading-tight">✨ {equip.specialEffect}</p>}
                            <p className="text-[10px] text-slate-600 mt-0.5">需等級 Lv.{equip.levelRequired}</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => setCompareEquipId(compareEquipId === equip.equipId ? null : equip.equipId)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                              style={{
                                background: compareEquipId === equip.equipId ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                                color: compareEquipId === equip.equipId ? '#a855f7' : '#94a3b8',
                                border: `1px solid ${compareEquipId === equip.equipId ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
                              }}>⚖️ 比較</button>
                            <button
                              onClick={() => equipItemMutation.mutate({ equipId: equip.equipId, action: equip.isEquipped ? 'unequip' : 'equip' })}
                              disabled={equipItemMutation.isPending}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                              style={{
                                background: equip.isEquipped ? 'rgba(239,68,68,0.15)' : `${wc}20`,
                                color: equip.isEquipped ? '#ef4444' : wc,
                                border: `1px solid ${equip.isEquipped ? 'rgba(239,68,68,0.3)' : `${wc}40`}`,
                              }}>{equip.isEquipped ? '卸下' : '裝備'}</button>
                          </div>
                        </div>
                        {/* 裝備比較面板 */}
                        {compareEquipId === equip.equipId && compareQuery.data && (
                          <div className="mt-2 p-2.5 rounded-lg border" style={{ background: 'rgba(168,85,247,0.06)', borderColor: 'rgba(168,85,247,0.2)' }}>
                            <p className="text-[10px] font-bold text-purple-400 mb-1.5">⚖️ 裝備比較</p>
                            <div className="grid grid-cols-3 gap-1 text-center text-[10px] mb-1">
                              <div className="text-slate-500">屬性</div>
                              <div className="text-slate-400 font-bold">{compareQuery.data.currentEquip ? compareQuery.data.currentEquip.name : '（無）'}</div>
                              <div className="font-bold" style={{ color: wc }}>{compareQuery.data.newEquip.name}</div>
                            </div>
                            {compareQuery.data.comparison.map((c: any) => (
                              <div key={c.stat} className="grid grid-cols-3 gap-1 text-center text-[10px] py-0.5 border-t border-slate-800/40">
                                <div className="text-slate-500">{c.label}</div>
                                <div className="text-slate-400">{c.currentVal}</div>
                                <div className="flex items-center justify-center gap-1">
                                  <span style={{ color: wc }}>{c.newVal}</span>
                                  {c.diff !== 0 && (
                                    <span className="font-bold" style={{ color: c.diff > 0 ? '#22c55e' : '#ef4444' }}>
                                      {c.diff > 0 ? `+${c.diff}` : c.diff}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {compareQuery.data.isUpgrade && (
                              <p className="text-[10px] text-green-400 mt-1.5 text-center font-bold">✨ 整體提升！建議更換</p>
                            )}
                            {!compareQuery.data.isUpgrade && compareQuery.data.currentEquip && (
                              <p className="text-[10px] text-amber-400 mt-1.5 text-center">⚠️ 整體下降，請謹慎更換</p>
                            )}
                          </div>
                        )}
                        {compareEquipId === equip.equipId && compareQuery.isLoading && (
                          <div className="mt-2 p-2 text-center text-[10px] text-slate-500">載入比較中…</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 技能面板（GD-001 + 木屬性動態擴充）── */}
        {activePanel === "skill" && (() => {
          // 職業技能樹區塊
          const showSkillTree = (agent?.profession ?? "none") !== "none";

          // 木屬性動態擴充技能槽數量
          const woodVal = agent?.wuxingWood ?? 0;
          // 主動技能槽：預設4，木屬性門檻擴充（最失8）
          const activeSlotCount = woodVal >= 200 ? 8 : woodVal >= 150 ? 7 : woodVal >= 100 ? 6 : woodVal >= 60 ? 5 : 4;
          // 被動技能槽：預設2，木屬性門檻擴充（最失5）
          const passiveSlotCount = woodVal >= 200 ? 5 : woodVal >= 150 ? 4 : woodVal >= 80 ? 3 : 2;
          // 隱藏技能槽：預設1，木屬性門檻擴充（最失3）
          const hiddenSlotCount = woodVal >= 200 ? 3 : woodVal >= 120 ? 2 : 1;
          const ACTIVE_SLOT_KEYS = ["skillSlot1", "skillSlot2", "skillSlot3", "skillSlot4"] as const;
          const PASSIVE_SLOT_KEYS = ["passiveSlot1", "passiveSlot2"] as const;
          type AllSlotKey = typeof ACTIVE_SLOT_KEYS[number] | typeof PASSIVE_SLOT_KEYS[number] | "hiddenSlot1";
          const activeSlots = ACTIVE_SLOT_KEYS.map(k => (agent as any)?.[k] as string | undefined);
          const passiveSlots = PASSIVE_SLOT_KEYS.map(k => (agent as any)?.[k] as string | undefined);
          // 技能槽門檻說明
          const nextActiveThreshold = activeSlotCount < 8 ? [4,60,100,150,200].find(t => t > woodVal) : null;
          const nextPassiveThreshold = passiveSlotCount < 5 ? [2,80,150,200].find(t => t > woodVal) : null;
          // 技能圖鑑顯示擁有的技能（背包 skill_book + 已學技能 + 已安裝技能）
          const ownedSkillIds = new Set(invItems.filter(i => i.itemType === "skill_book").map(i => i.itemId));
          // 加入已學技能（從 agent_skills 表）
          learnedSkillIds.forEach(id => ownedSkillIds.add(id));
          // 也加入已安裝的技能
          [...activeSlots, ...passiveSlots].forEach(s => { if (s) ownedSkillIds.add(s); });
          return (
            <div className="space-y-2">
              {/* 職業技能樹 */}
              {showSkillTree && (
                <SkillTreePanel agent={agent} learnedSkillIds={learnedSkillIds} />
              )}
              {/* 木屬性門檻說明 */}
              <div className="px-2.5 py-1.5 rounded-lg text-[10px]"
                style={{ background: "rgba(34,197,94,0.06)", borderLeft: "2px solid rgba(34,197,94,0.3)", color: "#64748b" }}>
                🌲 木屬性 {woodVal} → 主動{activeSlotCount}槽 / 被動{passiveSlotCount}槽 / 隱藏{hiddenSlotCount}槽
                {nextActiveThreshold && <span className="ml-2 text-green-500/60">（主動槽下一步解鎖：木{nextActiveThreshold}）</span>}
              </div>
              {/* 主動技能槽（動態數量） */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-slate-500">主動技能（{activeSlotCount}槽）</p>
                  <p className="text-[10px] text-slate-600">點擊槽位可選擇技能</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: activeSlotCount }).map((_, i) => {
                    const slotId = activeSlots[i];
                    const sk = slotId ? (skillCatalogMap[slotId] ?? SKILL_DEFS[slotId] ?? null) : null;
                    const c = sk ? WX_HEX[sk.element] ?? "#888" : "#334155";
                    const slotKey = ACTIVE_SLOT_KEYS[i] ?? "skillSlot1";
                    const isLocked = i >= 4; // 木屬性解鎖的額外槽
                    return (
                      <button key={i}
                        onClick={() => { setSkillPickerSlot({ type: "active", index: i, slot: slotKey as AllSlotKey }); setShowSkillPicker(true); }}
                        className="px-2.5 py-2 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: sk ? `${c}10` : isLocked ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)", borderColor: sk ? `${c}30` : isLocked ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)" }}>
                        <p className="text-xs mb-0.5" style={{ color: isLocked ? "#22c55e80" : "#64748b" }}>主動 {i + 1}{isLocked ? " 🌲" : ""}</p>
                        {sk ? (
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-sm">{sk.icon}</span>
                              <p className="text-xs font-bold" style={{ color: c }}>{sk.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-tight">{sk.desc}</p>
                          </div>
                        ) : <p className="text-xs text-slate-700 italic">點擊安裝技能</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 被動技能槽（動態數量） */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">被動技能（{passiveSlotCount}槽）</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: passiveSlotCount }).map((_, i) => {
                    const slotId = passiveSlots[i];
                    const sk = slotId ? (skillCatalogMap[slotId] ?? SKILL_DEFS[slotId] ?? null) : null;
                    const c = sk ? WX_HEX[sk.element] ?? "#888" : "#334155";
                    const isLocked = i >= 2;
                    return (
                      <button key={i}
                        onClick={() => { setSkillPickerSlot({ type: "passive", index: i, slot: (PASSIVE_SLOT_KEYS[i] ?? "passiveSlot1") as AllSlotKey }); setShowSkillPicker(true); }}
                        className="px-2.5 py-2 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: sk ? `${c}10` : isLocked ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)", borderColor: sk ? `${c}30` : isLocked ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)" }}>
                        <p className="text-xs mb-0.5" style={{ color: isLocked ? "#22c55e80" : "#64748b" }}>被動 {i + 1}{isLocked ? " 🌲" : ""}</p>
                        {sk ? (
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-sm">{sk.icon}</span>
                              <p className="text-xs font-bold" style={{ color: c }}>{sk.name}</p>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-tight">{sk.desc}</p>
                          </div>
                        ) : <p className="text-xs text-slate-700 italic">點擊安裝技能</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* 隱藏技能槽 */}
              <div>
                <p className="text-xs text-slate-500 mb-1.5">隱藏技能（{hiddenSlotCount}槽）</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: hiddenSlotCount }).map((_, i) => {
                    const isLocked = i >= 1;
                    return (
                      <div key={i} className="px-2.5 py-2 rounded-xl border"
                        style={{ background: isLocked ? "rgba(168,85,247,0.04)" : "rgba(255,255,255,0.02)", borderColor: isLocked ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.07)" }}>
                        <p className="text-xs mb-0.5" style={{ color: isLocked ? "#a855f780" : "#64748b" }}>隱藏 {i + 1}{isLocked ? " 🌲" : ""}</p>
                        <p className="text-xs text-slate-700 italic">需機緣觸發</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* 天命考核技能槽 */}
              {equippedQuestSkills.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-amber-400/80">🔥 天命技能（{equippedQuestSkills.length}）</p>
                    <a href="/game/quest-skills" className="text-[10px] text-amber-500/60 hover:text-amber-400">管理 →</a>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {equippedQuestSkills.map((qs: any) => {
                      const qSkill = qs.skill;
                      const wc = qSkill?.wuxing ? (WX_HEX[qSkill.wuxing] ?? "#f59e0b") : "#f59e0b";
                      return (
                        <div key={qs.id} className="px-2.5 py-2 rounded-xl border text-left"
                          style={{ background: `${wc}10`, borderColor: `${wc}30` }}>
                          <p className="text-xs mb-0.5" style={{ color: "#f59e0b80" }}>天命 {qs.slotIndex}</p>
                          {qSkill ? (
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-sm">🔥</span>
                                <p className="text-xs font-bold" style={{ color: wc }}>{qSkill.name}</p>
                              </div>
                              <p className="text-[10px] text-slate-600 leading-tight">威力 {qSkill.powerPercent}% · MP {qSkill.mpCost}</p>
                            </div>
                          ) : <p className="text-xs text-slate-700 italic">技能資料載入中</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 技能選擇全視窗（連動真實圖鑑資料庫） */}
        {showSkillPicker && skillPickerSlot && (
          <div className="fixed inset-0 z-[500] flex flex-col"
            style={{ background: "rgba(6,10,22,0.92)", backdropFilter: "blur(20px)" }}
            onClick={() => setShowSkillPicker(false)}>
            <div className="flex-1 overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
              {/* 標題列 */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">技能圖鑑</h3>
                  <p className="text-xs text-slate-500">
                    {skillPickerSlot.type === "active" ? `安裝至主動槽 ${skillPickerSlot.index + 1}` : `安裝至被動槽 ${skillPickerSlot.index + 1}`}
                  </p>
                </div>
                <button onClick={() => setShowSkillPicker(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 border"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}>✕</button>
              </div>
              {/* 五行篩選 */}
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {["","wood","fire","earth","metal","water"].map(wx => (
                  <button key={wx} onClick={() => setSkillWuxingFilter(wx)}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    style={skillWuxingFilter === wx
                      ? { background: WX_HEX[wx] ?? "#64748b", color: "#fff", borderColor: WX_HEX[wx] ?? "#64748b" }
                      : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", borderColor: "rgba(255,255,255,0.1)" }}>
                    {wx ? `${WX_EMOJI[wx]}${WX_ZH[wx]}` : "全部"}
                  </button>
                ))}
              </div>
              {/* 技能列表 */}
              {skillCatalogQuery.isLoading ? (
                <p className="text-slate-500 text-center py-8">載入技能圖鑑中…</p>
              ) : (() => {
                // 只顯示玩家擁有的技能（skill_book 道具 + 已安裝的技能）
                const pickerOwnedIds = new Set(invItems.filter(i => i.itemType === "skill_book").map(i => i.itemId));
                const agentSlots = [agent?.skillSlot1, agent?.skillSlot2, agent?.skillSlot3, agent?.skillSlot4, agent?.passiveSlot1, agent?.passiveSlot2];
                agentSlots.forEach(s => { if (s) pickerOwnedIds.add(s); });
                // 加入已學技能（從 agent_skills 表）
                learnedSkillIds.forEach(id => pickerOwnedIds.add(id));
                const filteredSkills = (skillCatalogQuery.data ?? []).filter(sk => {
                  const typeOk = skillPickerSlot.type === "active"
                    ? sk.category === "active_combat"
                    : sk.category === "passive_combat" || sk.category === "life_gather" || sk.category === "craft_forge";
                  return typeOk && pickerOwnedIds.has(sk.skillId);
                });
                if (filteredSkills.length === 0) return (
                  <div className="text-center py-8">
                    <p className="text-slate-500">尚未擁有任何技能</p>
                    <p className="text-xs text-slate-600 mt-1">擊敗怪物或完成任務得到技能書</p>
                  </div>
                );
                return (
                <div className="grid grid-cols-2 gap-2">
                  {filteredSkills.map(sk => {
                    const wc = WX_HEX[sk.wuxing ?? ""] ?? "#64748b";
                    const isInstalling = installSkillMutation.isPending;
                    return (
                      <button key={sk.skillId}
                        disabled={isInstalling}
                        onClick={() => {
                          if (skillPickerSlot.slot) {
                            installSkillMutation.mutate({ skillId: sk.skillId, slot: skillPickerSlot.slot });
                          }
                        }}
                        className="flex items-start gap-2 p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        style={{ background: `${wc}10`, borderColor: `${wc}30` }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <p className="text-xs font-bold" style={{ color: wc }}>{sk.name}</p>
                            <span className="text-[9px] px-1 rounded" style={{ background: `${wc}20`, color: wc }}>{sk.tier}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">{sk.description}</p>
                          {sk.mpCost > 0 && <p className="text-[9px] text-blue-400 mt-0.5">MP -{sk.mpCost}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── 命格面板 ── */}
        {activePanel === "natal" && (() => {
          // 五行比例計算
          const wxVals = {
            wood:  agent?.wuxingWood  ?? 0,
            fire:  agent?.wuxingFire  ?? 0,
            earth: agent?.wuxingEarth ?? 0,
            metal: agent?.wuxingMetal ?? 0,
            water: agent?.wuxingWater ?? 0,
          };
          const wxTotal = Object.values(wxVals).reduce((a, b) => a + b, 0) || 1;
          const wxPct = Object.fromEntries(
            Object.entries(wxVals).map(([k, v]) => [k, Math.round((v / wxTotal) * 100)])
          ) as Record<string, number>;
          // 命格強度：主屬性占比
          const dominantPct = wxPct[agentElement] ?? 0;
          // SVG 圓餅圖計算
          const PIE_R = 36; const PIE_CX = 44; const PIE_CY = 44;
          const wxOrder = ["wood", "fire", "earth", "metal", "water"] as const;
          let cumulAngle = -90;
          const pieSlices = wxOrder.map(k => {
            const pct = wxPct[k] ?? 0;
            const angle = (pct / 100) * 360;
            const startAngle = cumulAngle;
            cumulAngle += angle;
            const toRad = (d: number) => (d * Math.PI) / 180;
            const x1 = PIE_CX + PIE_R * Math.cos(toRad(startAngle));
            const y1 = PIE_CY + PIE_R * Math.sin(toRad(startAngle));
            const x2 = PIE_CX + PIE_R * Math.cos(toRad(startAngle + angle));
            const y2 = PIE_CY + PIE_R * Math.sin(toRad(startAngle + angle));
            const large = angle > 180 ? 1 : 0;
            const path = pct >= 100
              ? `M ${PIE_CX} ${PIE_CY - PIE_R} A ${PIE_R} ${PIE_R} 0 1 1 ${PIE_CX - 0.001} ${PIE_CY - PIE_R} Z`
              : pct === 0 ? ""
              : `M ${PIE_CX} ${PIE_CY} L ${x1} ${y1} A ${PIE_R} ${PIE_R} 0 ${large} 1 ${x2} ${y2} Z`;
            return { key: k, path, color: WX_HEX[k] ?? "#888", pct };
          });
          return (
            <div className="space-y-2.5">
              {/* 命格身份卡片（境界/職業/命格） */}
              <div className="rounded-xl border p-2.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-2">🃏 命格身份</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg"
                    style={{ background: `${realmInfo.color}10`, border: `1px solid ${realmInfo.color}30` }}>
                    <span className="text-lg">{realmInfo.icon}</span>
                    <span className="text-[10px] text-slate-500">境界</span>
                    <span className="text-xs font-bold" style={{ color: realmInfo.color }}>{realmInfo.label}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg"
                    style={{ background: `${profInfo.color}10`, border: `1px solid ${profInfo.color}30` }}>
                    <span className="text-lg">{profInfo.icon}</span>
                    <span className="text-[10px] text-slate-500">職業</span>
                    <span className="text-xs font-bold" style={{ color: profInfo.color }}>{profInfo.label}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg"
                    style={{ background: `${fateInfo.color}10`, border: `1px solid ${fateInfo.color}30` }}>
                    <span className="text-lg">{fateInfo.icon}</span>
                    <span className="text-[10px] text-slate-500">命格</span>
                    <span className="text-xs font-bold" style={{ color: fateInfo.color }}>{(fateInfo as any).fateName ?? fateInfo.label}</span>
                    <span className="text-[9px] text-slate-600">{(fateInfo as any).desc ?? ""}</span>
                  </div>
                </div>
              </div>

              {/* 命格格局名稱 + 命格% */}
              <div className="px-2.5 py-2 rounded-xl border flex items-center gap-3"
                style={{ background: `${ec}08`, borderColor: `${ec}28` }}>
                {/* 命格強度圓形指示器 */}
                <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle cx="28" cy="28" r="22" fill="none"
                      stroke={ec} strokeWidth="6"
                      strokeDasharray={`${(dominantPct / 100) * 138.2} 138.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold" style={{ color: ec }}>{dominantPct}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5">命格格局（本命五行）</p>
                  <p className="text-sm font-bold" style={{ color: ec }}>{WX_ZH[agentElement] ?? "金"}命旅人</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                    你的八字命格主屬性為{WX_ZH[agentElement]}，佔比 {dominantPct}%，直接影響角色全部屬性計算
                  </p>
                </div>
              </div>

              {/* 五行圓餅圖 + 比例列表 */}
              <div className="rounded-xl border p-2.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-2">☘️ 五行比例（命格根源）</p>
                <div className="flex items-center gap-3">
                  {/* 圓餅圖 */}
                  <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
                    {pieSlices.map(s => s.path ? (
                      <path key={s.key} d={s.path} fill={s.color}
                        opacity={s.key === agentElement ? 1 : 0.6}
                        stroke="rgba(8,12,25,0.8)" strokeWidth="1.5" />
                    ) : null)}
                    <circle cx="44" cy="44" r="18" fill="rgba(8,12,25,0.9)" />
                    <text x="44" y="47" textAnchor="middle" fontSize="11" fontWeight="bold" fill={ec}>
                      {WX_ZH[agentElement] ?? "金"}
                    </text>
                  </svg>
                  {/* 列表 */}
                  <div className="flex-1 space-y-1">
                    {wxOrder.map(k => (
                      <div key={k} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: WX_HEX[k] ?? "#888" }} />
                        <span className="text-xs text-slate-400 shrink-0" style={{ minWidth: "14px" }}>{WX_ZH[k]}</span>
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${wxPct[k] ?? 0}%`, background: WX_HEX[k] ?? "#888" }} />
                        </div>
                        <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: WX_HEX[k] ?? "#888", minWidth: "28px", textAlign: "right" }}>{wxPct[k] ?? 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 命格基礎値（五行素質） */}
              <div className="rounded-xl border p-2.5 space-y-1.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-1.5">🔮 命格基礎値（五行素質）</p>
                <p className="text-xs text-slate-600 mb-2">各屬性上限 1000，預設總合 100</p>
                {[
                  { key: "wuxingWood",  icon: "🌿", label: "木",  color: "#22c55e" },
                  { key: "wuxingFire",  icon: "🔥", label: "火",  color: "#ef4444" },
                  { key: "wuxingEarth", icon: "🪨", label: "土",  color: "#f59e0b" },
                  { key: "wuxingMetal", icon: "⚡",    label: "金",  color: "#e2e8f0" },
                  { key: "wuxingWater", icon: "💧", label: "水",  color: "#38bdf8" },
                ].map(({ key, icon, label, color }) => {
                  const val = (agent as Record<string, number> | null | undefined)?.[key] ?? 0;
                  return (
                    <MiniAttrBar key={key} icon={icon} label={label} value={val} color={color} max={1000} />
                  );
                })}
              </div>

              {/* 稱號系統 */}
              <div className="rounded-xl border p-2.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-2">🏅 稱號</p>
                <div className="flex flex-wrap gap-1.5">
                  {/* 命格稱號（主屬性決定） */}
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: `${ec}18`, color: ec, border: `1px solid ${ec}40` }}>
                    {agentElement === "wood" ? "🌿 木行先天" :
                     agentElement === "fire" ? "🔥 火行先天" :
                     agentElement === "earth" ? "🪨 土行先天" :
                     agentElement === "metal" ? "⚡ 金行先天" : "💧 水行先天"}
                  </span>
                  {/* 等級稱號 */}
                  {agentLevel >= 5 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                      ⭐ 天命旅人
                    </span>
                  )}
                  {agentLevel >= 10 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
                      🔮 命格深造
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-xs text-slate-600 border border-slate-800">
                    更多稱號開發中…
                  </span>
                </div>
              </div>              {/* 命格 → 屬性對照表 */}
              <div className="rounded-xl border p-2.5"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs font-bold text-slate-500 mb-2">📊 命格 → 屬性對照（GD-028）</p>
                <div className="space-y-1.5">
                  {[
                    { wx: "wood",  icon: "🌿", label: "木", stats: "HP上限、治癒力、採集力" },
                    { wx: "fire",  icon: "🔥", label: "火", stats: "物理攻擊、暴擊傷害、鍛冶力" },
                    { wx: "earth", icon: "🪨", label: "土", stats: "物理防禦、魔法防禦、承重力" },
                    { wx: "metal", icon: "⚡",   label: "金", stats: "命中力、暴擊率、精煉力" },
                    { wx: "water", icon: "💧", label: "水", stats: "MP上限、魔法攻擊、精神力、尋寶力" },
                  ].map(item => {
                    const val = wxVals[item.wx as keyof typeof wxVals] ?? 0;
                    const isMain = item.wx === agentElement;
                    return (
                      <div key={item.wx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                        style={{ background: isMain ? `${WX_HEX[item.wx]}10` : "transparent", border: isMain ? `1px solid ${WX_HEX[item.wx]}25` : "1px solid transparent" }}>
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs font-bold w-4" style={{ color: WX_HEX[item.wx] }}>{item.label}</span>
                        <span className="text-xs font-bold tabular-nums w-6" style={{ color: WX_HEX[item.wx] }}>{val}</span>
                        <span className="text-[10px] text-slate-600">→</span>
                        <span className="text-[10px] text-slate-400 flex-1">{item.stats}</span>
                        {isMain && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${WX_HEX[item.wx]}20`, color: WX_HEX[item.wx] }}>主命</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 加成來源說明 */}
              <div className="px-2.5 py-2 rounded-xl border"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-xs text-slate-500 mb-1.5">加成來源</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>🔮 八字命格 → 基礎能力値（已套用）</p>
                  <p>⚔️ 裝備詞條 → 額外加成（已套用）</p>
                  <p>🎯 技能 Combo → 特殊效果（開發中）</p>
                  <p>🐾 寵物加成 → 屬性提升（開發中）</p>
                  <p>📅 流日加成 → 今日屬性浮動（已套用）</p>
                </div>
              </div>

              {/* 旅人頭像上傳 */}
              <div className="px-2.5 py-2 rounded-xl border"
                style={{ background: "rgba(168,85,247,0.04)", borderColor: "rgba(168,85,247,0.2)" }}>
                <p className="text-xs font-bold text-slate-400 mb-2">📷 旅人頭像</p>
                <div className="flex items-center gap-3">
                  {/* 預覽 */}
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 shrink-0"
                    style={{ borderColor: ec + "60" }}>
                    {agent?.avatarUrl ? (
                      <img src={agent.avatarUrl} alt="頭像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl"
                        style={{ background: ec + "22" }}>
                        {userGender === "male" ? "🧙" : "🧙‍♀️"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1.5">上傳後將顯示於地圖標記上</p>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 text-xs font-bold"
                      style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.4)" }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // 在瀏覽器端壓縮為 200x200 JPEG
                          const canvas = document.createElement("canvas");
                          canvas.width = 200; canvas.height = 200;
                          const ctx2d = canvas.getContext("2d")!;
                          const img = new Image();
                          img.onload = async () => {
                            const size = Math.min(img.width, img.height);
                            const sx = (img.width - size) / 2;
                            const sy = (img.height - size) / 2;
                            ctx2d.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
                            const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
                            try {
                              await uploadAvatarMutation.mutateAsync({ imageBase64: base64, mimeType: "image/jpeg" });
                            } catch (err) {
                              import("sonner").then(({ toast }) => toast.error("上傳失敗"));
                            }
                          };
                          img.src = URL.createObjectURL(file);
                          e.target.value = "";
                        }}
                      />
                      {uploadAvatarMutation.isPending ? "⏳ 上傳中..." : "📷 選擇照片"}
                    </label>
                    {agent?.avatarUrl && (
                      <p className="text-[10px] text-green-400 mt-1">✓ 已設定自訂頭像</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      }
      </div>
    </div>
    {/* 道具詳細說明彈窗 */}
    <ItemDetailModal
      itemId={detailItemId}
      itemName={detailItemMeta?.name}
      emoji={detailItemMeta?.emoji}
      rarity={detailItemMeta?.rarity}
      onClose={() => { setDetailItemId(null); setDetailItemMeta(null); }}
    />
    </>
  );
}

