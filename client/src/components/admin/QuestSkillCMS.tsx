/**
 * M3O/M3P: 天命考核技能任務鏈 CMS 管理組件
 * 包含：NPC 管理、天命技能圖鑑管理（含即時預覽）、任務鏈步驟管理
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sword, Shield, Zap, Heart, Star, Hammer, Eye, Trash2, Pencil, Plus, Search, ChevronRight, Flame, Droplets, Mountain, Leaf } from "lucide-react";

// ─── 常量定義 ─────────────────────────────────────────────────────────────
const WUXING_OPTIONS = ["wood", "fire", "earth", "metal", "water", "無"] as const;
const WUXING_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  wood:  { label: "木", color: "text-green-400",  bg: "bg-green-900/30",  icon: Leaf },
  fire:  { label: "火", color: "text-red-400",    bg: "bg-red-900/30",    icon: Flame },
  earth: { label: "土", color: "text-yellow-400", bg: "bg-yellow-900/30", icon: Mountain },
  metal: { label: "金", color: "text-gray-300",   bg: "bg-gray-700/30",   icon: Sword },
  water: { label: "水", color: "text-blue-400",   bg: "bg-blue-900/30",   icon: Droplets },
  "無":  { label: "無", color: "text-gray-400",   bg: "bg-gray-800/30",   icon: Star },
};

const CATEGORY_OPTIONS = ["physical", "magic", "status", "support", "special", "production"] as const;
const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  physical:   { label: "物理攻擊",   icon: Sword,   color: "text-red-400" },
  magic:      { label: "法術攻擊",   icon: Zap,     color: "text-blue-400" },
  status:     { label: "狀態異常",   icon: Eye,     color: "text-purple-400" },
  support:    { label: "輔助增益",   icon: Shield,  color: "text-green-400" },
  special:    { label: "特殊功能",   icon: Star,    color: "text-amber-400" },
  production: { label: "生產製作",   icon: Hammer,  color: "text-orange-400" },
  // 向下相容舊分類
  attack:     { label: "攻擊系",     icon: Sword,   color: "text-red-400" },
};

const SKILL_TYPE_OPTIONS = ["attack", "heal", "buff", "debuff", "passive", "utility", "production"] as const;
const SKILL_TYPE_LABELS: Record<string, string> = {
  attack: "攻擊", heal: "治療", buff: "增益", debuff: "減益",
  passive: "被動", utility: "功能", production: "生產",
};

const RARITY_OPTIONS = ["common", "rare", "epic", "legendary"] as const;
const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  common:    { label: "普通", color: "text-gray-400",   bg: "bg-gray-700/40",   border: "border-gray-600" },
  rare:      { label: "稀有", color: "text-blue-400",   bg: "bg-blue-900/40",   border: "border-blue-600" },
  epic:      { label: "史詩", color: "text-purple-400", bg: "bg-purple-900/40", border: "border-purple-600" },
  legendary: { label: "傳說", color: "text-amber-400",  bg: "bg-amber-900/40",  border: "border-amber-600" },
};

const EFFECT_TYPES = [
  "poison", "burn", "freeze", "stun", "slow", "sleep",
  "petrify", "confuse", "drunk", "forget", "defDown", "spdDown",
] as const;
const EFFECT_LABELS: Record<string, string> = {
  poison: "中毒", burn: "灼燒", freeze: "冰凍", stun: "暈眩",
  slow: "減速", sleep: "睡眠", petrify: "石化", confuse: "混亂",
  drunk: "醉酒", forget: "遺忘", defDown: "降防", spdDown: "降速",
};

// ═══════════════════════════════════════════════════════════════════════
// 即時預覽面板
// ═══════════════════════════════════════════════════════════════════════
function SkillPreviewPanel({ skill }: { skill: any }) {
  if (!skill) return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
      選擇一個技能查看詳細預覽
    </div>
  );

  const rarity = RARITY_CONFIG[skill.rarity] ?? RARITY_CONFIG.common;
  const wuxing = WUXING_CONFIG[skill.wuxing] ?? WUXING_CONFIG["無"];
  const category = CATEGORY_CONFIG[skill.category] ?? CATEGORY_CONFIG.physical;
  const CategoryIcon = category.icon;
  const WuxingIcon = wuxing.icon;

  const additionalEffect = skill.additionalEffect as any;
  const specialMechanic = skill.specialMechanic as any;
  const learnCost = skill.learnCost as any;
  const prerequisites = skill.prerequisites as any;

  return (
    <div className={`rounded-lg border ${rarity.border} ${rarity.bg} p-4 space-y-4`}>
      {/* 標題區 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${rarity.bg} ${rarity.color} border ${rarity.border} text-xs`}>
              {rarity.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <CategoryIcon className="w-3 h-3 mr-1" />
              {category.label}
            </Badge>
            <Badge variant="outline" className={`text-xs ${wuxing.color}`}>
              <WuxingIcon className="w-3 h-3 mr-1" />
              {wuxing.label}
            </Badge>
          </div>
          <h3 className="text-lg font-bold">{skill.name}</h3>
          <p className="text-xs text-muted-foreground">{skill.code} · {SKILL_TYPE_LABELS[skill.skillType] ?? skill.skillType}</p>
          {skill.questTitle && <p className="text-xs text-amber-400 mt-1">任務鏈：{skill.questTitle}</p>}
        </div>
        {skill.iconUrl && (
          <img src={skill.iconUrl} alt={skill.name} className="w-12 h-12 rounded-lg border border-border object-cover" />
        )}
      </div>

      {/* 描述 */}
      {skill.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{skill.description}</p>
      )}

      {/* 數值面板 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatBlock label="威力" value={`${skill.powerPercent}%`} color="text-red-400" />
        <StatBlock label="MP 消耗" value={skill.mpCost} color="text-blue-400" />
        <StatBlock label="冷卻" value={`${skill.cooldown} 回合`} color="text-cyan-400" />
        <StatBlock label="等級上限" value={`Lv.${skill.maxLevel}`} color="text-green-400" />
      </div>

      {/* 升級加成 */}
      <div className="text-xs text-muted-foreground">
        每升一級：效果 +{skill.levelUpBonus ?? 10}%
      </div>

      {/* 附加效果 */}
      {additionalEffect && (typeof additionalEffect === "object") && additionalEffect.type && (
        <div className="rounded-md bg-amber-950/30 border border-amber-800/40 p-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">附加效果</p>
          <p className="text-sm">
            {EFFECT_LABELS[additionalEffect.type] ?? additionalEffect.type}
            {additionalEffect.chance && ` · ${additionalEffect.chance}% 機率`}
            {additionalEffect.value && ` · ${additionalEffect.value} 傷害`}
            {additionalEffect.duration && ` · 持續 ${additionalEffect.duration} 回合`}
          </p>
        </div>
      )}

      {/* 特殊機制 */}
      {specialMechanic && typeof specialMechanic === "object" && Object.keys(specialMechanic).length > 0 && (
        <div className="rounded-md bg-purple-950/30 border border-purple-800/40 p-3">
          <p className="text-xs font-semibold text-purple-400 mb-1">特殊機制</p>
          <div className="text-sm space-y-1">
            {specialMechanic.hitCount && <p>連擊次數：{specialMechanic.hitCount[0]}~{specialMechanic.hitCount[1]}</p>}
            {specialMechanic.accuracyMod && <p>命中率修正：{specialMechanic.accuracyMod > 0 ? "+" : ""}{specialMechanic.accuracyMod}%</p>}
            {specialMechanic.aoe && <p>範圍：{specialMechanic.aoe}</p>}
            {specialMechanic.selfDamage && <p className="text-red-400">自傷效果</p>}
            {specialMechanic.skipNextTurn && <p className="text-red-400">使用後跳過下一回合</p>}
            {specialMechanic.isPassive && <p className="text-green-400">被動技能（自動生效）</p>}
          </div>
        </div>
      )}

      {/* 習得代價 */}
      {learnCost && typeof learnCost === "object" && Object.keys(learnCost).length > 0 && (
        <div className="rounded-md bg-cyan-950/30 border border-cyan-800/40 p-3">
          <p className="text-xs font-semibold text-cyan-400 mb-1">習得代價</p>
          <div className="text-sm flex flex-wrap gap-3">
            {learnCost.gold && <span>金幣 {learnCost.gold.toLocaleString()}</span>}
            {learnCost.soulCrystal && <span>魂晶 {learnCost.soulCrystal.toLocaleString()}</span>}
            {learnCost.items && Array.isArray(learnCost.items) && learnCost.items.map((item: any, i: number) => (
              <span key={i}>{item.name} x{item.count}</span>
            ))}
          </div>
        </div>
      )}

      {/* 前置條件 */}
      {prerequisites && typeof prerequisites === "object" && Object.keys(prerequisites).length > 0 && (
        <div className="rounded-md bg-rose-950/30 border border-rose-800/40 p-3">
          <p className="text-xs font-semibold text-rose-400 mb-1">前置條件</p>
          <div className="text-sm space-y-1">
            {prerequisites.level && <p>角色等級 {prerequisites.level} 以上</p>}
            {prerequisites.skills && Array.isArray(prerequisites.skills) && (
              <p>需習得：{prerequisites.skills.join("、")}</p>
            )}
            {prerequisites.special && <p>{prerequisites.special}</p>}
          </div>
        </div>
      )}

      {/* NPC 資訊 */}
      {skill.npc && (
        <div className="flex items-center gap-3 rounded-md bg-muted/30 p-3">
          {skill.npc.avatarUrl && (
            <img src={skill.npc.avatarUrl} alt={skill.npc.name} className="w-10 h-10 rounded-full border border-border" />
          )}
          <div>
            <p className="text-sm font-semibold">{skill.npc.name}</p>
            {skill.npc.location && <p className="text-xs text-muted-foreground">{skill.npc.location}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-md bg-background/50 border border-border/50 p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NPC 管理 Tab
// ═══════════════════════════════════════════════════════════════════════
export function NPCManagementTab() {
  const npcs = trpc.questSkillNpc.list.useQuery();
  const createNpc = trpc.questSkillNpc.create.useMutation({ onSuccess: () => { npcs.refetch(); toast.success("NPC 已建立"); } });
  const updateNpc = trpc.questSkillNpc.update.useMutation({ onSuccess: () => { npcs.refetch(); toast.success("NPC 已更新"); } });
  const deleteNpc = trpc.questSkillNpc.delete.useMutation({ onSuccess: () => { npcs.refetch(); toast.success("NPC 已刪除"); } });

  const [editingNpc, setEditingNpc] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", title: "", location: "", description: "", avatarUrl: "" });
  const [searchInput, setSearchInput] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const filteredNpcs = useMemo(() => {
    if (!npcs.data) return [];
    const q = searchInput.toLowerCase();
    return npcs.data.filter((n: any) => n.name.toLowerCase().includes(q) || (n.location ?? "").toLowerCase().includes(q));
  }, [npcs.data, searchInput]);

  const openCreate = () => {
    setEditingNpc(null);
    setForm({ code: "", name: "", title: "", location: "", description: "", avatarUrl: "" });
    setShowDialog(true);
  };

  const openEdit = (npc: any) => {
    setEditingNpc(npc);
    setForm({
      code: npc.code ?? "", name: npc.name, title: npc.title ?? "", location: npc.location ?? "",
      description: npc.description ?? "", avatarUrl: npc.avatarUrl ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("NPC 名稱不能為空"); return; }
    if (!form.code.trim()) { toast.error("NPC 代碼不能為空"); return; }
    if (editingNpc) {
      await updateNpc.mutateAsync({ id: editingNpc.id, ...form });
    } else {
      await createNpc.mutateAsync(form);
    }
    setShowDialog(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜尋 NPC 名稱/地點…" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> 新增 NPC</Button>
        <span className="text-sm text-muted-foreground">共 {npcs.data?.length ?? 0} 位 NPC</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNpcs.map((npc: any) => (
          <Card key={npc.id} className="group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {npc.avatarUrl ? (
                  <img src={npc.avatarUrl} alt={npc.name} className="w-10 h-10 rounded-full border border-border object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{npc.name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm truncate">{npc.name}</CardTitle>
                  <CardDescription className="text-xs truncate">{npc.code} · {npc.location ?? "未知地點"}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {npc.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{npc.description}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(npc)}><Pencil className="w-3 h-3 mr-1" /> 編輯</Button>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("確定刪除此 NPC？")) deleteNpc.mutate({ id: npc.id }); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingNpc ? "編輯 NPC" : "新增 NPC"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="NPC 代碼 *" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              <Input placeholder="NPC 名稱 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <Input placeholder="稱號" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input placeholder="地點" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            <Textarea placeholder="描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <Input placeholder="頭像 URL" value={form.avatarUrl} onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createNpc.isPending || updateNpc.isPending}>
              {createNpc.isPending || updateNpc.isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 天命技能圖鑑管理 Tab（含即時預覽）
// ═══════════════════════════════════════════════════════════════════════
export function QuestSkillCatalogTab() {
  const skills = trpc.questSkillCatalog.list.useQuery();
  const npcs = trpc.questSkillNpc.list.useQuery();
  const createSkill = trpc.questSkillCatalog.create.useMutation({ onSuccess: () => { skills.refetch(); toast.success("技能已建立"); } });
  const updateSkill = trpc.questSkillCatalog.update.useMutation({ onSuccess: () => { skills.refetch(); toast.success("技能已更新"); } });
  const deleteSkill = trpc.questSkillCatalog.delete.useMutation({ onSuccess: () => { skills.refetch(); toast.success("技能已刪除"); } });

  const [previewSkill, setPreviewSkill] = useState<any>(null);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRarity, setFilterRarity] = useState<string>("all");

  const emptyForm = {
    code: "", name: "", questTitle: "", description: "",
    category: "physical" as string, skillType: "attack" as string,
    wuxing: "fire" as string, rarity: "rare" as string,
    powerPercent: 100, mpCost: 10, cooldown: 3, maxLevel: 10, levelUpBonus: 10,
    additionalEffectType: "" as string, additionalEffectChance: 0, additionalEffectValue: 0, additionalEffectDuration: 0,
    specialHitCountMin: 0, specialHitCountMax: 0, specialAccuracyMod: 0, specialAoe: "",
    specialSelfDamage: false, specialSkipNextTurn: false, specialIsPassive: false,
    learnCostGold: 0, learnCostSoulCrystal: 0, learnCostItems: "",
    prereqSkills: "", prereqLevel: 0, prereqSpecial: "",
    npcId: undefined as number | undefined,
    iconUrl: "", sortOrder: 0,
  };
  const [form, setForm] = useState(emptyForm);

  const filteredSkills = useMemo(() => {
    if (!skills.data) return [];
    const q = searchInput.toLowerCase();
    return skills.data.filter((s: any) => {
      const matchSearch = s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q);
      const matchCategory = filterCategory === "all" || s.category === filterCategory;
      const matchRarity = filterRarity === "all" || s.rarity === filterRarity;
      return matchSearch && matchCategory && matchRarity;
    });
  }, [skills.data, searchInput, filterCategory, filterRarity]);

  const groupedSkills = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const s of filteredSkills) {
      const cat = s.category ?? "physical";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [filteredSkills]);

  const openCreate = () => {
    setEditingSkill(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (skill: any) => {
    setEditingSkill(skill);
    const ae = skill.additionalEffect as any;
    const sm = skill.specialMechanic as any;
    const lc = skill.learnCost as any;
    const pr = skill.prerequisites as any;
    setForm({
      code: skill.code ?? "", name: skill.name, questTitle: skill.questTitle ?? "",
      description: skill.description ?? "",
      category: skill.category, skillType: skill.skillType ?? "attack",
      wuxing: skill.wuxing ?? "fire", rarity: skill.rarity ?? "rare",
      powerPercent: skill.powerPercent ?? 100, mpCost: skill.mpCost ?? 10,
      cooldown: skill.cooldown ?? 3, maxLevel: skill.maxLevel ?? 10, levelUpBonus: skill.levelUpBonus ?? 10,
      additionalEffectType: ae?.type ?? "", additionalEffectChance: ae?.chance ?? 0,
      additionalEffectValue: ae?.value ?? 0, additionalEffectDuration: ae?.duration ?? 0,
      specialHitCountMin: sm?.hitCount?.[0] ?? 0, specialHitCountMax: sm?.hitCount?.[1] ?? 0,
      specialAccuracyMod: sm?.accuracyMod ?? 0, specialAoe: sm?.aoe ?? "",
      specialSelfDamage: sm?.selfDamage ?? false, specialSkipNextTurn: sm?.skipNextTurn ?? false,
      specialIsPassive: sm?.isPassive ?? false,
      learnCostGold: lc?.gold ?? 0, learnCostSoulCrystal: lc?.soulCrystal ?? 0,
      learnCostItems: lc?.items ? lc.items.map((i: any) => `${i.name}:${i.count}`).join(",") : "",
      prereqSkills: pr?.skills ? pr.skills.join(",") : "", prereqLevel: pr?.level ?? 0,
      prereqSpecial: pr?.special ?? "",
      npcId: skill.npcId ?? undefined, iconUrl: skill.iconUrl ?? "", sortOrder: skill.sortOrder ?? 0,
    });
    setShowDialog(true);
  };

  const buildPayload = () => {
    const additionalEffect = form.additionalEffectType ? {
      type: form.additionalEffectType,
      chance: form.additionalEffectChance || undefined,
      value: form.additionalEffectValue || undefined,
      duration: form.additionalEffectDuration || undefined,
    } : undefined;

    const specialMechanic: any = {};
    if (form.specialHitCountMin > 0 && form.specialHitCountMax > 0) specialMechanic.hitCount = [form.specialHitCountMin, form.specialHitCountMax];
    if (form.specialAccuracyMod) specialMechanic.accuracyMod = form.specialAccuracyMod;
    if (form.specialAoe) specialMechanic.aoe = form.specialAoe;
    if (form.specialSelfDamage) specialMechanic.selfDamage = true;
    if (form.specialSkipNextTurn) specialMechanic.skipNextTurn = true;
    if (form.specialIsPassive) specialMechanic.isPassive = true;

    const learnCost: any = {};
    if (form.learnCostGold > 0) learnCost.gold = form.learnCostGold;
    if (form.learnCostSoulCrystal > 0) learnCost.soulCrystal = form.learnCostSoulCrystal;
    if (form.learnCostItems.trim()) {
      learnCost.items = form.learnCostItems.split(",").map(s => {
        const [name, count] = s.split(":");
        return { name: name.trim(), count: parseInt(count) || 1 };
      });
    }

    const prerequisites: any = {};
    if (form.prereqSkills.trim()) prerequisites.skills = form.prereqSkills.split(",").map(s => s.trim());
    if (form.prereqLevel > 0) prerequisites.level = form.prereqLevel;
    if (form.prereqSpecial.trim()) prerequisites.special = form.prereqSpecial;

    return {
      code: form.code, name: form.name, questTitle: form.questTitle || undefined,
      description: form.description || undefined,
      category: form.category, skillType: form.skillType,
      wuxing: form.wuxing, rarity: form.rarity,
      powerPercent: form.powerPercent, mpCost: form.mpCost,
      cooldown: form.cooldown, maxLevel: form.maxLevel, levelUpBonus: form.levelUpBonus,
      additionalEffect: Object.keys(additionalEffect ?? {}).length > 0 ? additionalEffect : undefined,
      specialMechanic: Object.keys(specialMechanic).length > 0 ? specialMechanic : undefined,
      learnCost: Object.keys(learnCost).length > 0 ? learnCost : undefined,
      prerequisites: Object.keys(prerequisites).length > 0 ? prerequisites : undefined,
      npcId: form.npcId, iconUrl: form.iconUrl || undefined, sortOrder: form.sortOrder,
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("技能名稱不能為空"); return; }
    if (!form.code.trim()) { toast.error("技能代碼不能為空"); return; }
    const payload = buildPayload();
    if (editingSkill) {
      await updateSkill.mutateAsync({ id: editingSkill.id, ...payload });
    } else {
      await createSkill.mutateAsync(payload);
    }
    setShowDialog(false);
  };

  return (
    <div className="flex gap-4 h-full">
      {/* 左側：技能列表 */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜尋技能…" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分類</SelectItem>
              {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRarity} onValueChange={setFilterRarity}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部稀有度</SelectItem>
              {RARITY_OPTIONS.map(r => <SelectItem key={r} value={r}>{RARITY_CONFIG[r].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> 新增</Button>
          <span className="text-xs text-muted-foreground">{filteredSkills.length}/{skills.data?.length ?? 0}</span>
        </div>

        {Object.entries(groupedSkills).map(([cat, items]) => {
          const catCfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.physical;
          const CatIcon = catCfg.icon;
          return (
            <div key={cat}>
              <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1 ${catCfg.color}`}>
                <CatIcon className="w-4 h-4" /> {catCfg.label}（{items.length}）
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {items.map((skill: any) => {
                  const r = RARITY_CONFIG[skill.rarity] ?? RARITY_CONFIG.common;
                  const w = WUXING_CONFIG[skill.wuxing] ?? WUXING_CONFIG["無"];
                  const isSelected = previewSkill?.id === skill.id;
                  return (
                    <Card
                      key={skill.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${isSelected ? "border-primary ring-1 ring-primary/30" : ""}`}
                      onClick={() => setPreviewSkill(skill)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={`${r.bg} ${r.color} border ${r.border} text-[10px] shrink-0`}>{r.label}</Badge>
                            <span className="font-medium text-sm truncate">{skill.name}</span>
                            <span className={`text-xs ${w.color}`}>{w.label}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openEdit(skill); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`確定刪除「${skill.name}」？`)) deleteSkill.mutate({ id: skill.id });
                            }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {SKILL_TYPE_LABELS[skill.skillType] ?? skill.skillType} · 威力 {skill.powerPercent}% · MP {skill.mpCost} · CD {skill.cooldown}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredSkills.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {skills.data?.length === 0 ? "尚未建立任何天命考核技能，點擊「+ 新增」開始建立" : "沒有符合篩選條件的技能"}
          </div>
        )}
      </div>

      {/* 右側：即時預覽面板 */}
      <div className="hidden xl:block w-80 shrink-0 sticky top-0">
        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Eye className="w-3 h-3" /> 即時預覽
        </div>
        <SkillPreviewPanel skill={previewSkill} />
      </div>

      {/* 編輯對話框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSkill ? `編輯：${editingSkill.name}` : "新增天命考核技能"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 基本資訊 */}
            <fieldset className="border border-border/50 rounded-lg p-3 space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground px-2">基本資訊</legend>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="技能代碼 *（如 P1）" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                <Input placeholder="技能名稱 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <Input placeholder="任務鏈副標題" value={form.questTitle} onChange={e => setForm(f => ({ ...f, questTitle: e.target.value }))} />
              </div>
              <Textarea placeholder="技能描述" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              <div className="grid grid-cols-4 gap-2">
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="分類" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{CATEGORY_CONFIG[c].label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.skillType} onValueChange={v => setForm(f => ({ ...f, skillType: v }))}>
                  <SelectTrigger><SelectValue placeholder="技能類型" /></SelectTrigger>
                  <SelectContent>
                    {SKILL_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{SKILL_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.wuxing} onValueChange={v => setForm(f => ({ ...f, wuxing: v }))}>
                  <SelectTrigger><SelectValue placeholder="五行" /></SelectTrigger>
                  <SelectContent>
                    {WUXING_OPTIONS.map(w => <SelectItem key={w} value={w}>{WUXING_CONFIG[w]?.label ?? w}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.rarity} onValueChange={v => setForm(f => ({ ...f, rarity: v }))}>
                  <SelectTrigger><SelectValue placeholder="稀有度" /></SelectTrigger>
                  <SelectContent>
                    {RARITY_OPTIONS.map(r => <SelectItem key={r} value={r}>{RARITY_CONFIG[r].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            {/* 數值設定 */}
            <fieldset className="border border-border/50 rounded-lg p-3 space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground px-2">數值設定</legend>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">威力 %</label>
                  <Input type="number" value={form.powerPercent} onChange={e => setForm(f => ({ ...f, powerPercent: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">MP 消耗</label>
                  <Input type="number" value={form.mpCost} onChange={e => setForm(f => ({ ...f, mpCost: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">冷卻回合</label>
                  <Input type="number" value={form.cooldown} onChange={e => setForm(f => ({ ...f, cooldown: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">等級上限</label>
                  <Input type="number" value={form.maxLevel} onChange={e => setForm(f => ({ ...f, maxLevel: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">升級加成 %</label>
                  <Input type="number" value={form.levelUpBonus} onChange={e => setForm(f => ({ ...f, levelUpBonus: +e.target.value }))} />
                </div>
              </div>
            </fieldset>

            {/* 附加效果 */}
            <fieldset className="border border-amber-800/30 rounded-lg p-3 space-y-2">
              <legend className="text-xs font-semibold text-amber-400 px-2">附加效果</legend>
              <div className="grid grid-cols-4 gap-2">
                <Select value={form.additionalEffectType || "none"} onValueChange={v => setForm(f => ({ ...f, additionalEffectType: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="效果類型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">無</SelectItem>
                    {EFFECT_TYPES.map(e => <SelectItem key={e} value={e}>{EFFECT_LABELS[e]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div>
                  <label className="text-[10px] text-muted-foreground">機率 %</label>
                  <Input type="number" value={form.additionalEffectChance} onChange={e => setForm(f => ({ ...f, additionalEffectChance: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">效果值</label>
                  <Input type="number" value={form.additionalEffectValue} onChange={e => setForm(f => ({ ...f, additionalEffectValue: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">持續回合</label>
                  <Input type="number" value={form.additionalEffectDuration} onChange={e => setForm(f => ({ ...f, additionalEffectDuration: +e.target.value }))} />
                </div>
              </div>
            </fieldset>

            {/* 特殊機制 */}
            <fieldset className="border border-purple-800/30 rounded-lg p-3 space-y-2">
              <legend className="text-xs font-semibold text-purple-400 px-2">特殊機制</legend>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">連擊最小</label>
                  <Input type="number" value={form.specialHitCountMin} onChange={e => setForm(f => ({ ...f, specialHitCountMin: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">連擊最大</label>
                  <Input type="number" value={form.specialHitCountMax} onChange={e => setForm(f => ({ ...f, specialHitCountMax: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">命中修正 %</label>
                  <Input type="number" value={form.specialAccuracyMod} onChange={e => setForm(f => ({ ...f, specialAccuracyMod: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">範圍</label>
                  <Input placeholder="如 全體" value={form.specialAoe} onChange={e => setForm(f => ({ ...f, specialAoe: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={form.specialSelfDamage} onChange={e => setForm(f => ({ ...f, specialSelfDamage: e.target.checked }))} className="rounded" />
                  自傷效果
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={form.specialSkipNextTurn} onChange={e => setForm(f => ({ ...f, specialSkipNextTurn: e.target.checked }))} className="rounded" />
                  跳過下一回合
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={form.specialIsPassive} onChange={e => setForm(f => ({ ...f, specialIsPassive: e.target.checked }))} className="rounded" />
                  被動技能
                </label>
              </div>
            </fieldset>

            {/* 習得代價 */}
            <fieldset className="border border-cyan-800/30 rounded-lg p-3 space-y-2">
              <legend className="text-xs font-semibold text-cyan-400 px-2">習得代價</legend>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">金幣</label>
                  <Input type="number" value={form.learnCostGold} onChange={e => setForm(f => ({ ...f, learnCostGold: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">魂晶</label>
                  <Input type="number" value={form.learnCostSoulCrystal} onChange={e => setForm(f => ({ ...f, learnCostSoulCrystal: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">道具（名稱:數量,…）</label>
                  <Input placeholder="如 火焰石:3,鐵礦:5" value={form.learnCostItems} onChange={e => setForm(f => ({ ...f, learnCostItems: e.target.value }))} />
                </div>
              </div>
            </fieldset>

            {/* 前置條件 */}
            <fieldset className="border border-rose-800/30 rounded-lg p-3 space-y-2">
              <legend className="text-xs font-semibold text-rose-400 px-2">前置條件</legend>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">前置技能代碼（逗號分隔）</label>
                  <Input placeholder="如 P1,M2" value={form.prereqSkills} onChange={e => setForm(f => ({ ...f, prereqSkills: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">等級要求</label>
                  <Input type="number" value={form.prereqLevel} onChange={e => setForm(f => ({ ...f, prereqLevel: +e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">特殊條件</label>
                  <Input placeholder="如 完成主線任務" value={form.prereqSpecial} onChange={e => setForm(f => ({ ...f, prereqSpecial: e.target.value }))} />
                </div>
              </div>
            </fieldset>

            {/* 指派 NPC 和圖示 */}
            <fieldset className="border border-border/50 rounded-lg p-3 space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground px-2">其他設定</legend>
              <div className="grid grid-cols-3 gap-2">
                <Select value={form.npcId?.toString() ?? "none"} onValueChange={v => setForm(f => ({ ...f, npcId: v === "none" ? undefined : Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="指派 NPC" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">無 NPC</SelectItem>
                    {(npcs.data ?? []).map((n: any) => (
                      <SelectItem key={n.id} value={n.id.toString()}>{n.name}{n.location ? ` (${n.location})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="技能圖示 URL" value={form.iconUrl} onChange={e => setForm(f => ({ ...f, iconUrl: e.target.value }))} />
                <div>
                  <label className="text-[10px] text-muted-foreground">排序權重</label>
                  <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} />
                </div>
              </div>
            </fieldset>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createSkill.isPending || updateSkill.isPending}>
              {createSkill.isPending || updateSkill.isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 任務鏈步驟管理 Tab
// ═══════════════════════════════════════════════════════════════════════
export function QuestStepManagementTab() {
  const skills = trpc.questSkillCatalog.list.useQuery();
  const npcs = trpc.questSkillNpc.list.useQuery();
  const [selectedSkillId, setSelectedSkillId] = useState<string>("none");
  const steps = trpc.questSkillStep.listBySkill.useQuery(
    { skillId: Number(selectedSkillId) },
    { enabled: selectedSkillId !== "none" }
  );
  const createStep = trpc.questSkillStep.create.useMutation({ onSuccess: () => { steps.refetch(); toast.success("步驟已建立"); } });
  const updateStep = trpc.questSkillStep.update.useMutation({ onSuccess: () => { steps.refetch(); toast.success("步驟已更新"); } });
  const deleteStep = trpc.questSkillStep.delete.useMutation({ onSuccess: () => { steps.refetch(); toast.success("步驟已刪除"); } });

  const [editingStep, setEditingStep] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  const emptyStepForm = {
    stepNumber: 1, title: "", dialogue: "", objective: "", location: "",
    objectivesJson: "", rewardsJson: "", specialNote: "",
    npcId: undefined as number | undefined,
  };
  const [form, setForm] = useState(emptyStepForm);

  const openCreate = () => {
    setEditingStep(null);
    const nextOrder = (steps.data?.length ?? 0) + 1;
    setForm({ ...emptyStepForm, stepNumber: nextOrder });
    setShowDialog(true);
  };

  const openEdit = (step: any) => {
    setEditingStep(step);
    setForm({
      stepNumber: step.stepNumber ?? 1, title: step.title ?? "",
      dialogue: step.dialogue ?? "", objective: step.objective ?? "",
      location: step.location ?? "",
      objectivesJson: step.objectives ? JSON.stringify(step.objectives, null, 2) : "",
      rewardsJson: step.rewards ? JSON.stringify(step.rewards, null, 2) : "",
      specialNote: step.specialNote ?? "",
      npcId: step.npcId ?? undefined,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("步驟標題不能為空"); return; }
    if (selectedSkillId === "none") { toast.error("請先選擇技能"); return; }

    let objectives: any = undefined;
    let rewards: any = undefined;
    try {
      if (form.objectivesJson.trim()) objectives = JSON.parse(form.objectivesJson);
    } catch { toast.error("目標 JSON 格式錯誤"); return; }
    try {
      if (form.rewardsJson.trim()) rewards = JSON.parse(form.rewardsJson);
    } catch { toast.error("獎勵 JSON 格式錯誤"); return; }

    const payload = {
      stepNumber: form.stepNumber, title: form.title,
      dialogue: form.dialogue || undefined, objective: form.objective || undefined,
      location: form.location || undefined,
      objectives, rewards,
      specialNote: form.specialNote || undefined,
      npcId: form.npcId,
    };

    if (editingStep) {
      await updateStep.mutateAsync({ id: editingStep.id, ...payload });
    } else {
      await createStep.mutateAsync({ skillId: Number(selectedSkillId), ...payload });
    }
    setShowDialog(false);
  };

  const selectedSkill = skills.data?.find((s: any) => s.id === Number(selectedSkillId));
  const npcMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const n of npcs.data ?? []) m[n.id] = n.name;
    return m;
  }, [npcs.data]);

  const sortedSteps = useMemo(() => {
    return [...(steps.data ?? [])].sort((a: any, b: any) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0));
  }, [steps.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="選擇天命技能" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-- 請選擇技能 --</SelectItem>
            {(skills.data ?? []).map((s: any) => {
              const cat = CATEGORY_CONFIG[s.category] ?? CATEGORY_CONFIG.physical;
              return (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {cat.label} · {s.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {selectedSkillId !== "none" && (
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> 新增步驟</Button>
        )}
      </div>

      {selectedSkill && (
        <Card className="bg-muted/20 border-primary/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Badge className={`${RARITY_CONFIG[selectedSkill.rarity]?.bg} ${RARITY_CONFIG[selectedSkill.rarity]?.color} border ${RARITY_CONFIG[selectedSkill.rarity]?.border} text-[10px]`}>
                {RARITY_CONFIG[selectedSkill.rarity]?.label ?? selectedSkill.rarity}
              </Badge>
              <span className="font-medium text-sm">{selectedSkill.name}</span>
              <span className="text-xs text-muted-foreground">
                {SKILL_TYPE_LABELS[selectedSkill.skillType]} · 威力 {selectedSkill.powerPercent}% · MP {selectedSkill.mpCost} · CD {selectedSkill.cooldown}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSkillId !== "none" && (
        <div className="space-y-2">
          {sortedSteps.map((step: any, idx: number) => (
            <Card key={step.id} className="group hover:border-primary/50 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{step.title}</span>
                      {step.npcId && <Badge variant="outline" className="text-[10px]">{npcMap[step.npcId] ?? `NPC#${step.npcId}`}</Badge>}
                    </div>
                    {step.objective && <p className="text-xs text-muted-foreground mt-1">{step.objective}</p>}
                    {step.dialogue && <p className="text-xs italic text-amber-400/80 mt-1">「{step.dialogue}」</p>}
                    {step.location && <p className="text-xs text-muted-foreground mt-1">地點：{step.location}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(step)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("確定刪除此步驟？")) deleteStep.mutate({ id: step.id }); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                {idx < sortedSteps.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {sortedSteps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              此技能尚未設定任務步驟，點擊「+ 新增步驟」開始建立任務鏈
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStep ? "編輯任務步驟" : "新增任務步驟"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">步驟序號</label>
                <Input type="number" value={form.stepNumber} onChange={e => setForm(f => ({ ...f, stepNumber: +e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">步驟標題 *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">任務目標描述</label>
              <Input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">地點</label>
              <Input placeholder="如：虛界·火山口" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <Select value={form.npcId?.toString() ?? "none"} onValueChange={v => setForm(f => ({ ...f, npcId: v === "none" ? undefined : Number(v) }))}>
              <SelectTrigger><SelectValue placeholder="指派 NPC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">無 NPC</SelectItem>
                {(npcs.data ?? []).map((n: any) => (
                  <SelectItem key={n.id} value={n.id.toString()}>{n.name}{n.location ? ` (${n.location})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <label className="text-[10px] text-muted-foreground">NPC 對話</label>
              <Textarea value={form.dialogue} onChange={e => setForm(f => ({ ...f, dialogue: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">目標 JSON（結構化）</label>
              <Textarea placeholder='{"type":"kill","targets":[{"name":"火焰狼","count":10}]}' value={form.objectivesJson} onChange={e => setForm(f => ({ ...f, objectivesJson: e.target.value }))} rows={3} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">獎勵 JSON</label>
              <Textarea placeholder='{"exp":500,"gold":200,"items":[{"name":"火焰石","count":1}]}' value={form.rewardsJson} onChange={e => setForm(f => ({ ...f, rewardsJson: e.target.value }))} rows={3} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">特殊備註</label>
              <Input value={form.specialNote} onChange={e => setForm(f => ({ ...f, specialNote: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleSave} disabled={createStep.isPending || updateStep.isPending}>
              {createStep.isPending || updateStep.isPending ? "儲存中…" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 天命考核管理主組件（整合三個子 Tab）
// ═══════════════════════════════════════════════════════════════════════
export function QuestSkillCMSTab() {
  return (
    <Tabs defaultValue="skills" className="w-full">
      <TabsList>
        <TabsTrigger value="skills">天命技能</TabsTrigger>
        <TabsTrigger value="steps">任務鏈步驟</TabsTrigger>
        <TabsTrigger value="npcs">NPC 管理</TabsTrigger>
      </TabsList>
      <TabsContent value="skills"><QuestSkillCatalogTab /></TabsContent>
      <TabsContent value="steps"><QuestStepManagementTab /></TabsContent>
      <TabsContent value="npcs"><NPCManagementTab /></TabsContent>
    </Tabs>
  );
}
