/**
 * M3P: 天命考核技能列表頁 + 任務鏈詳情頁
 * 玩家可以瀏覽所有天命考核技能、查看任務鏈進度、推進任務、習得和裝備技能
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  ArrowLeft, Star, Zap, Shield, Sword, Hammer, Eye, Heart,
  Leaf, Flame, Mountain, Droplets, Lock, CheckCircle2, Circle,
  ChevronRight, Sparkles, BookOpen, Play, Award, Loader2
} from "lucide-react";

// ─── 常量定義 ─────────────────────────────────────────────────────────────
const WUXING_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  wood:  { label: "木", color: "text-green-400",  bg: "bg-green-950/40",  border: "border-green-700/50",  icon: Leaf },
  fire:  { label: "火", color: "text-red-400",    bg: "bg-red-950/40",    border: "border-red-700/50",    icon: Flame },
  earth: { label: "土", color: "text-yellow-400", bg: "bg-yellow-950/40", border: "border-yellow-700/50", icon: Mountain },
  metal: { label: "金", color: "text-gray-300",   bg: "bg-gray-800/40",   border: "border-gray-600/50",   icon: Sword },
  water: { label: "水", color: "text-blue-400",   bg: "bg-blue-950/40",   border: "border-blue-700/50",   icon: Droplets },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  physical:   { label: "物理攻擊", icon: Sword,   color: "text-red-400",    bg: "bg-red-950/30",    border: "border-red-800/40" },
  magic:      { label: "法術攻擊", icon: Zap,     color: "text-blue-400",   bg: "bg-blue-950/30",   border: "border-blue-800/40" },
  status:     { label: "狀態異常", icon: Eye,     color: "text-purple-400", bg: "bg-purple-950/30", border: "border-purple-800/40" },
  support:    { label: "輔助增益", icon: Shield,  color: "text-green-400",  bg: "bg-green-950/30",  border: "border-green-800/40" },
  special:    { label: "特殊功能", icon: Star,    color: "text-amber-400",  bg: "bg-amber-950/30",  border: "border-amber-800/40" },
  production: { label: "生產製作", icon: Hammer,  color: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-800/40" },
  attack:     { label: "攻擊系",   icon: Sword,   color: "text-red-400",    bg: "bg-red-950/30",    border: "border-red-800/40" },
};

const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  common:    { label: "普通", color: "text-gray-400",   bg: "bg-gray-800/40",   border: "border-gray-600/50",   glow: "" },
  rare:      { label: "稀有", color: "text-blue-400",   bg: "bg-blue-950/40",   border: "border-blue-700/50",   glow: "shadow-blue-500/20" },
  epic:      { label: "史詩", color: "text-purple-400", bg: "bg-purple-950/40", border: "border-purple-700/50", glow: "shadow-purple-500/30" },
  legendary: { label: "傳說", color: "text-amber-400",  bg: "bg-amber-950/40",  border: "border-amber-700/50",  glow: "shadow-amber-500/40" },
};

const SKILL_TYPE_LABELS: Record<string, string> = {
  attack: "攻擊", heal: "治療", buff: "增益", debuff: "減益",
  passive: "被動", utility: "功能", production: "生產",
};

const EFFECT_LABELS: Record<string, string> = {
  poison: "中毒", burn: "灼燒", freeze: "冰凍", stun: "暈眩",
  slow: "減速", sleep: "睡眠", petrify: "石化", confuse: "混亂",
  drunk: "醉酒", forget: "遺忘", defDown: "降防", spdDown: "降速",
};

type SkillStatus = "locked" | "available" | "in_progress" | "ready_to_confirm" | "completed";

// ═══════════════════════════════════════════════════════════════════════
// 主頁面
// ═══════════════════════════════════════════════════════════════════════
export default function QuestSkillPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [showQuestDetail, setShowQuestDetail] = useState(false);

  // 取得玩家角色
  const { data: agentData } = trpc.gameWorld.getOrCreateAgent.useQuery(undefined, { enabled: !!user });
  const agentId = agentData?.agent?.id;

  // 取得所有天命考核技能
  const { data: allSkills, isLoading: skillsLoading } = trpc.questSkillCatalog.list.useQuery();

  // 取得玩家任務進度
  const { data: myProgress, refetch: refetchProgress } = trpc.questSkillProgress.myProgress.useQuery(
    undefined, { enabled: !!user }
  );

  // 取得玩家已習得技能
  const { data: myLearned, refetch: refetchLearned } = trpc.questSkillProgress.myLearnedSkills.useQuery(
    undefined, { enabled: !!user }
  );

  // 建立進度 Map
  const progressMap = useMemo(() => {
    const m = new Map<number, any>();
    for (const p of myProgress ?? []) m.set(p.skillId, p);
    return m;
  }, [myProgress]);

  // 建立已習得 Map
  const learnedMap = useMemo(() => {
    const m = new Map<number, any>();
    for (const l of myLearned ?? []) m.set(l.skillId, l);
    return m;
  }, [myLearned]);

  // 取得技能狀態
  const getSkillStatus = (skillId: number): SkillStatus => {
    if (learnedMap.has(skillId)) return "completed";
    const p = progressMap.get(skillId);
    if (!p) return "available";
    if (p.status === "ready_to_confirm") return "ready_to_confirm";
    if (p.status === "in_progress") return "in_progress";
    if (p.status === "completed") return "completed";
    return "available";
  };

  // 按分類篩選
  const filteredSkills = useMemo(() => {
    if (!allSkills) return [];
    if (selectedCategory === "all") return allSkills;
    return allSkills.filter((s: any) => s.category === selectedCategory);
  }, [allSkills, selectedCategory]);

  // 按分類分組
  const groupedSkills = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const s of filteredSkills) {
      const cat = s.category ?? "physical";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [filteredSkills]);

  // 統計
  const totalSkills = allSkills?.length ?? 0;
  const completedCount = (myLearned ?? []).length;
  const inProgressCount = (myProgress ?? []).filter((p: any) => p.status === "in_progress").length;

  const selectedSkill = allSkills?.find((s: any) => s.id === selectedSkillId);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 頂部導航 */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/game/lobby">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回大廳
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                天命考核
              </h1>
              <p className="text-xs text-gray-400">
                已習得 {completedCount}/{totalSkills} · 進行中 {inProgressCount}
              </p>
            </div>
          </div>
          <Link href="/game/skills">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
              <BookOpen className="w-4 h-4 mr-1" />
              一般技能圖鑑
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 進度總覽 */}
        <Card className="bg-gradient-to-r from-amber-950/30 to-purple-950/30 border-amber-700/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-300 font-medium">天命考核總進度</span>
              <span className="text-xs text-gray-400">{completedCount}/{totalSkills}</span>
            </div>
            <Progress value={totalSkills > 0 ? (completedCount / totalSkills) * 100 : 0} className="h-2 bg-gray-800" />
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">{completedCount}</p>
                <p className="text-[10px] text-gray-500">已習得</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-400">{inProgressCount}</p>
                <p className="text-[10px] text-gray-500">進行中</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-400">{totalSkills - completedCount - inProgressCount}</p>
                <p className="text-[10px] text-gray-500">待開啟</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 分類篩選 */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-4 sm:grid-cols-7 bg-gray-900 border border-gray-700 mb-6 h-auto p-1">
            <TabsTrigger value="all" className="text-xs py-2 data-[state=active]:bg-gray-700">全部</TabsTrigger>
            {Object.entries(CATEGORY_CONFIG).filter(([k]) => !["attack"].includes(k)).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <TabsTrigger key={key} value={key} className={`text-xs py-2 data-[state=active]:${cfg.bg}`}>
                  <Icon className={`w-3 h-3 mr-1 ${cfg.color}`} />
                  <span className="hidden sm:inline">{cfg.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategory}>
            {skillsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 bg-gray-800/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {Object.entries(groupedSkills).map(([cat, skills]) => {
                  const catCfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.physical;
                  const CatIcon = catCfg.icon;
                  return (
                    <div key={cat} className="mb-8">
                      <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${catCfg.color}`}>
                        <CatIcon className="w-4 h-4" />
                        {catCfg.label}
                        <span className="text-gray-500 font-normal">({skills.length})</span>
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {skills.map((skill: any) => (
                          <QuestSkillCard
                            key={skill.id}
                            skill={skill}
                            status={getSkillStatus(skill.id)}
                            progress={progressMap.get(skill.id)}
                            learned={learnedMap.get(skill.id)}
                            onSelect={() => {
                              setSelectedSkillId(skill.id);
                              setShowQuestDetail(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredSkills.length === 0 && (
                  <div className="text-center py-16 text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>此分類暫無天命考核技能</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 任務鏈詳情對話框 */}
      {selectedSkill && (
        <QuestDetailDialog
          skill={selectedSkill}
          status={getSkillStatus(selectedSkill.id)}
          progress={progressMap.get(selectedSkill.id)}
          learned={learnedMap.get(selectedSkill.id)}
          open={showQuestDetail}
          onOpenChange={setShowQuestDetail}
          onRefresh={() => { refetchProgress(); refetchLearned(); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 天命技能卡片
// ═══════════════════════════════════════════════════════════════════════
function QuestSkillCard({ skill, status, progress, learned, onSelect }: {
  skill: any;
  status: SkillStatus;
  progress?: any;
  learned?: any;
  onSelect: () => void;
}) {
  const rarity = RARITY_CONFIG[skill.rarity] ?? RARITY_CONFIG.common;
  const wuxing = WUXING_CONFIG[skill.wuxing] ?? { label: "無", color: "text-gray-400", bg: "bg-gray-800/40", border: "border-gray-600/50", icon: Star };
  const category = CATEGORY_CONFIG[skill.category] ?? CATEGORY_CONFIG.physical;
  const WuxingIcon = wuxing.icon;

  const statusConfig = {
    locked: { label: "未開啟", color: "text-gray-500", icon: Lock, bg: "bg-gray-800/20" },
    available: { label: "可開始", color: "text-cyan-400", icon: Play, bg: "bg-cyan-950/20" },
    in_progress: { label: "進行中", color: "text-blue-400", icon: Loader2, bg: "bg-blue-950/20" },
    ready_to_confirm: { label: "待確認", color: "text-amber-400", icon: Award, bg: "bg-amber-950/20" },
    completed: { label: "已習得", color: "text-green-400", icon: CheckCircle2, bg: "bg-green-950/20" },
  };
  const st = statusConfig[status];
  const StIcon = st.icon;

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] border ${rarity.border} ${rarity.bg} ${rarity.glow ? `shadow-lg ${rarity.glow}` : ""}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* 頂部：狀態 + 稀有度 */}
        <div className="flex items-center justify-between mb-2">
          <Badge className={`${st.bg} ${st.color} border-current text-[10px]`} variant="outline">
            <StIcon className={`w-3 h-3 mr-1 ${status === "in_progress" ? "animate-spin" : ""}`} />
            {st.label}
          </Badge>
          <div className="flex items-center gap-1">
            <Badge className={`${rarity.bg} ${rarity.color} border ${rarity.border} text-[10px]`}>{rarity.label}</Badge>
          </div>
        </div>

        {/* 名稱和屬性 */}
        <div className="flex items-center gap-2 mb-2">
          <WuxingIcon className={`w-4 h-4 ${wuxing.color} shrink-0`} />
          <h3 className="font-bold text-sm truncate">{skill.name}</h3>
        </div>

        {/* 描述 */}
        {skill.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{skill.description}</p>
        )}

        {/* 數值條 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-900/50 rounded px-1 py-1">
            <p className="text-[10px] text-gray-500">威力</p>
            <p className="text-xs font-bold text-red-400">{skill.powerPercent}%</p>
          </div>
          <div className="bg-gray-900/50 rounded px-1 py-1">
            <p className="text-[10px] text-gray-500">MP</p>
            <p className="text-xs font-bold text-blue-400">{skill.mpCost}</p>
          </div>
          <div className="bg-gray-900/50 rounded px-1 py-1">
            <p className="text-[10px] text-gray-500">CD</p>
            <p className="text-xs font-bold text-cyan-400">{skill.cooldown}</p>
          </div>
        </div>

        {/* 進度條（進行中時顯示） */}
        {status === "in_progress" && progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
              <span>步驟 {progress.currentStep}</span>
              <span>進行中</span>
            </div>
            <Progress value={33} className="h-1.5 bg-gray-800" />
          </div>
        )}

        {/* 已裝備標記 */}
        {learned?.isEquipped === 1 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-green-400">
            <Shield className="w-3 h-3" />
            已裝備於技能欄 {learned.slotIndex}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 任務鏈詳情對話框
// ═══════════════════════════════════════════════════════════════════════
function QuestDetailDialog({ skill, status, progress, learned, open, onOpenChange, onRefresh }: {
  skill: any;
  status: SkillStatus;
  progress?: any;
  learned?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}) {
  const [equipSlot, setEquipSlot] = useState<string>("1");

  // 取得任務步驟
  const { data: steps } = trpc.questSkillStep.listBySkill.useQuery(
    { skillId: skill.id },
    { enabled: open }
  );

  // 取得 NPC 列表
  const { data: npcs } = trpc.questSkillNpc.list.useQuery(undefined, { enabled: open });
  const npcMap = useMemo(() => {
    const m: Record<number, any> = {};
    for (const n of npcs ?? []) m[n.id] = n;
    return m;
  }, [npcs]);

  // 前置條件檢查
  const { data: prereqCheck } = trpc.questSkillProgress.checkPrereqs.useQuery(
    { skillId: skill.id },
    { enabled: open && status === "available" }
  );

  // Mutations
  const startQuest = trpc.questSkillProgress.startQuest.useMutation({
    onSuccess: (data) => { toast.success(data.message); onRefresh(); },
    onError: (err) => toast.error(err.message),
  });

  const advanceStep = trpc.questSkillProgress.advanceStep.useMutation({
    onSuccess: (data) => { toast.success(data.message); onRefresh(); },
    onError: (err) => toast.error(err.message),
  });

  const confirmLearn = trpc.questSkillProgress.confirmLearn.useMutation({
    onSuccess: (data) => { toast.success(data.message); onRefresh(); },
    onError: (err) => toast.error(err.message),
  });

  const equipSkill = trpc.questSkillProgress.equipSkill.useMutation({
    onSuccess: () => { toast.success("技能已裝備！"); onRefresh(); },
    onError: (err) => toast.error(err.message),
  });

  const unequipSkill = trpc.questSkillProgress.unequipSkill.useMutation({
    onSuccess: () => { toast.success("技能已卸下"); onRefresh(); },
    onError: (err) => toast.error(err.message),
  });

  const rarity = RARITY_CONFIG[skill.rarity] ?? RARITY_CONFIG.common;
  const wuxing = WUXING_CONFIG[skill.wuxing] ?? { label: "無", color: "text-gray-400", bg: "bg-gray-800/40", border: "border-gray-600/50", icon: Star };
  const category = CATEGORY_CONFIG[skill.category] ?? CATEGORY_CONFIG.physical;
  const WuxingIcon = wuxing.icon;
  const CategoryIcon = category.icon;

  const sortedSteps = useMemo(() => {
    return [...(steps ?? [])].sort((a: any, b: any) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0));
  }, [steps]);

  const additionalEffect = skill.additionalEffect as any;
  const specialMechanic = skill.specialMechanic as any;
  const learnCost = skill.learnCost as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WuxingIcon className={`w-5 h-5 ${wuxing.color}`} />
            {skill.name}
            <Badge className={`${rarity.bg} ${rarity.color} border ${rarity.border} text-[10px]`}>{rarity.label}</Badge>
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            {skill.questTitle ?? `${category.label} · ${SKILL_TYPE_LABELS[skill.skillType] ?? skill.skillType}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 技能數值 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <StatBlock label="威力" value={`${skill.powerPercent}%`} color="text-red-400" />
            <StatBlock label="MP 消耗" value={skill.mpCost} color="text-blue-400" />
            <StatBlock label="冷卻" value={`${skill.cooldown} 回合`} color="text-cyan-400" />
            <StatBlock label="等級上限" value={`Lv.${skill.maxLevel}`} color="text-green-400" />
            <StatBlock label="升級加成" value={`+${skill.levelUpBonus ?? 10}%`} color="text-amber-400" />
          </div>

          {/* 描述 */}
          {skill.description && (
            <p className="text-sm text-gray-300 leading-relaxed">{skill.description}</p>
          )}

          {/* 附加效果 */}
          {additionalEffect && additionalEffect.type && (
            <div className="rounded-md bg-amber-950/30 border border-amber-800/40 p-3">
              <p className="text-xs font-semibold text-amber-400 mb-1">附加效果</p>
              <p className="text-sm text-gray-300">
                {EFFECT_LABELS[additionalEffect.type] ?? additionalEffect.type}
                {additionalEffect.chance && ` · ${additionalEffect.chance}% 機率`}
                {additionalEffect.value && ` · ${additionalEffect.value} 傷害`}
                {additionalEffect.duration && ` · 持續 ${additionalEffect.duration} 回合`}
              </p>
            </div>
          )}

          {/* 特殊機制 */}
          {specialMechanic && Object.keys(specialMechanic).length > 0 && (
            <div className="rounded-md bg-purple-950/30 border border-purple-800/40 p-3">
              <p className="text-xs font-semibold text-purple-400 mb-1">特殊機制</p>
              <div className="text-sm text-gray-300 space-y-1">
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
          {learnCost && Object.keys(learnCost).length > 0 && (
            <div className="rounded-md bg-cyan-950/30 border border-cyan-800/40 p-3">
              <p className="text-xs font-semibold text-cyan-400 mb-1">習得代價</p>
              <div className="text-sm text-gray-300 flex flex-wrap gap-3">
                {learnCost.gold && <span>金幣 {learnCost.gold.toLocaleString()}</span>}
                {learnCost.soulCrystal && <span>魂晶 {learnCost.soulCrystal.toLocaleString()}</span>}
                {learnCost.items?.map((item: any, i: number) => (
                  <span key={i}>{item.name} x{item.count}</span>
                ))}
              </div>
            </div>
          )}

          {/* 任務鏈步驟 */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              任務鏈步驟
            </h3>
            {sortedSteps.length === 0 ? (
              <p className="text-sm text-gray-500">此技能尚未設定任務步驟</p>
            ) : (
              <div className="space-y-3">
                {sortedSteps.map((step: any, idx: number) => {
                  const isCurrentStep = progress?.currentStep === step.stepNumber && status === "in_progress";
                  const isCompleted = progress && (
                    (progress.currentStep > step.stepNumber) ||
                    status === "completed" ||
                    status === "ready_to_confirm"
                  );
                  const npc = step.npcId ? npcMap[step.npcId] : null;

                  return (
                    <div key={step.id}>
                      <div className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                        isCurrentStep ? "bg-blue-950/40 border border-blue-700/50" :
                        isCompleted ? "bg-green-950/20 border border-green-800/30" :
                        "bg-gray-800/30 border border-gray-700/30"
                      }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCompleted ? "bg-green-600 text-white" :
                          isCurrentStep ? "bg-blue-600 text-white animate-pulse" :
                          "bg-gray-700 text-gray-400"
                        }`}>
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.stepNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${isCurrentStep ? "text-blue-300" : isCompleted ? "text-green-300" : "text-gray-300"}`}>
                              {step.title}
                            </span>
                            {isCurrentStep && <Badge className="bg-blue-900 text-blue-200 text-[10px]">目前步驟</Badge>}
                          </div>
                          {step.objective && <p className="text-xs text-gray-400 mt-1">{step.objective}</p>}
                          {step.dialogue && (
                            <p className="text-xs italic text-amber-400/70 mt-1">「{step.dialogue}」</p>
                          )}
                          {step.location && (
                            <p className="text-xs text-gray-500 mt-1">地點：{step.location}</p>
                          )}
                          {npc && (
                            <div className="flex items-center gap-2 mt-1">
                              {npc.avatarUrl ? (
                                <img src={npc.avatarUrl} alt={npc.name} className="w-5 h-5 rounded-full" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-600" />
                              )}
                              <span className="text-xs text-gray-400">{npc.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {idx < sortedSteps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ChevronRight className="w-4 h-4 text-gray-600 rotate-90" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 操作按鈕 */}
          <div className="border-t border-gray-700 pt-4 space-y-3">
            {/* 可開始 */}
            {status === "available" && (
              <>
                {prereqCheck && !prereqCheck.passed && (
                  <div className="rounded-md bg-red-950/30 border border-red-800/40 p-3">
                    <p className="text-xs text-red-400">前置條件未滿足：{prereqCheck.reason}</p>
                  </div>
                )}
                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => startQuest.mutate({ skillId: skill.id })}
                  disabled={startQuest.isPending || (prereqCheck && !prereqCheck.passed)}
                >
                  {startQuest.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  開始天命考核
                </Button>
              </>
            )}

            {/* 進行中 — 推進步驟 */}
            {status === "in_progress" && (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => advanceStep.mutate({ skillId: skill.id })}
                disabled={advanceStep.isPending}
              >
                {advanceStep.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                完成當前步驟
              </Button>
            )}

            {/* 待確認 — 最終習得 */}
            {status === "ready_to_confirm" && (
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={() => confirmLearn.mutate({ skillId: skill.id })}
                disabled={confirmLearn.isPending}
              >
                {confirmLearn.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}
                確認習得技能
              </Button>
            )}

            {/* 已完成 — 裝備/卸下 */}
            {status === "completed" && learned && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  已習得 · Lv.{learned.level ?? 1}
                </div>
                {learned.isEquipped === 1 ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-900 text-green-200 border-green-700">
                      <Shield className="w-3 h-3 mr-1" />
                      已裝備於技能欄 {learned.slotIndex}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-700 text-red-400 hover:bg-red-950"
                      onClick={() => unequipSkill.mutate({ skillId: skill.id })}
                      disabled={unequipSkill.isPending}
                    >
                      卸下
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select value={equipSlot} onValueChange={setEquipSlot}>
                      <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
                        <SelectValue placeholder="選擇欄位" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <SelectItem key={i} value={i.toString()}>技能欄 {i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => equipSkill.mutate({ skillId: skill.id, slotIndex: parseInt(equipSlot) })}
                      disabled={equipSkill.isPending}
                    >
                      {equipSkill.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                      裝備到技能欄
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 數值區塊
// ═══════════════════════════════════════════════════════════════════════
function StatBlock({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-md bg-gray-800/50 border border-gray-700/50 p-2 text-center">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
