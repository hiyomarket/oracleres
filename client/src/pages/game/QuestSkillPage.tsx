/**
 * v5.14: 技能學習頁面（簡化版）
 * 移除任務鏈流程，改為一鍵學習：檢查金幣 + 道具 → 扣除 → 習得
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  ArrowLeft, Star, Zap, Shield, Sword, Hammer, Eye, Heart,
  Leaf, Flame, Mountain, Droplets, Lock, CheckCircle2,
  Sparkles, BookOpen, Award, Loader2,
  GitBranch, LayoutGrid, Coins, Gem
} from "lucide-react";
import { SkillTree } from "@/components/game/SkillTree";

// ─── 常量定義 ─────────────────────────────────────────────────────────────
const WUXING_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  wood:  { label: "木", color: "text-green-400",  bg: "bg-green-950/40",  border: "border-green-700/50",  icon: Leaf },
  fire:  { label: "火", color: "text-red-400",    bg: "bg-red-950/40",    border: "border-red-700/50",    icon: Flame },
  earth: { label: "土", color: "text-yellow-400", bg: "bg-yellow-950/40", border: "border-yellow-700/50", icon: Mountain },
  metal: { label: "金", color: "text-gray-300",   bg: "bg-gray-800/40",   border: "border-gray-600/50",   icon: Sword },
  water: { label: "水", color: "text-blue-400",   bg: "bg-blue-950/40",   border: "border-blue-700/50",   icon: Droplets },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  physical:   { label: "物理戰鬥", icon: Sword,   color: "text-red-400",    bg: "bg-red-950/30",    border: "border-red-800/40" },
  magic:      { label: "五行元素魔法", icon: Zap,     color: "text-blue-400",   bg: "bg-blue-950/30",   border: "border-blue-800/40" },
  status:     { label: "咒術控制", icon: Eye,     color: "text-purple-400", bg: "bg-purple-950/30", border: "border-purple-800/40" },
  support:    { label: "治療輔助", icon: Heart,   color: "text-green-400",  bg: "bg-green-950/30",  border: "border-green-800/40" },
  special:    { label: "特殊技能", icon: Star,    color: "text-amber-400",  bg: "bg-amber-950/30",  border: "border-amber-800/40" },
  resistance: { label: "抵抗被動", icon: Shield,  color: "text-cyan-400",   bg: "bg-cyan-950/30",   border: "border-cyan-800/40" },
  production: { label: "生產製作", icon: Hammer,  color: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-800/40" },
  attack:     { label: "攻擊系",   icon: Sword,   color: "text-red-400",    bg: "bg-red-950/30",    border: "border-red-800/40" },
};

const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  common:    { label: "普通", color: "text-gray-400",   bg: "bg-gray-800/40",   border: "border-gray-600/50",   glow: "" },
  uncommon:  { label: "優良", color: "text-green-400",  bg: "bg-green-950/40",  border: "border-green-700/50",  glow: "shadow-green-500/15" },
  rare:      { label: "稀有", color: "text-blue-400",   bg: "bg-blue-950/40",   border: "border-blue-700/50",   glow: "shadow-blue-500/20" },
  epic:      { label: "史詩", color: "text-purple-400", bg: "bg-purple-950/40", border: "border-purple-700/50", glow: "shadow-purple-500/30" },
  legendary: { label: "傳說", color: "text-amber-400",  bg: "bg-amber-950/40",  border: "border-amber-700/50",  glow: "shadow-amber-500/40" },
};

const SKILL_TYPE_LABELS: Record<string, string> = {
  attack: "攻擊", heal: "治療", buff: "增益", debuff: "減益",
  passive: "被動", utility: "功能", production: "生產",
};

const TARGET_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  single: { label: "單體", color: "text-gray-300" },
  t_shape: { label: "T字範圍", color: "text-blue-300" },
  cross: { label: "十字範圍", color: "text-purple-300" },
  all_enemy: { label: "全體敵方", color: "text-red-300" },
  self: { label: "自身", color: "text-green-300" },
  single_ally: { label: "單體友方", color: "text-green-300" },
  all_ally: { label: "全體友方", color: "text-green-300" },
  all: { label: "全場", color: "text-amber-300" },
};

const SCALE_STAT_LABELS: Record<string, { label: string; color: string }> = {
  atk: { label: "ATK 物理", color: "text-red-400" },
  mtk: { label: "MTK 魔法", color: "text-blue-400" },
  spr: { label: "SPR 精神", color: "text-cyan-400" },
  fixed: { label: "固定值", color: "text-gray-400" },
  hp_percent: { label: "HP%", color: "text-green-400" },
  none: { label: "無", color: "text-gray-500" },
};

const EFFECT_LABELS: Record<string, string> = {
  poison: "中毒", burn: "灼燒", freeze: "冰凍", stun: "暈眩",
  slow: "減速", sleep: "睡眠", petrify: "石化", confuse: "混亂",
  drunk: "醉酒", forget: "遺忘", defDown: "降防", spdDown: "降速",
};

// ═══════════════════════════════════════════════════════════════════════
// 主頁面
// ═══════════════════════════════════════════════════════════════════════
export default function QuestSkillPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "tree">("grid");

  // 取得玩家角色
  const { data: agentData } = trpc.gameWorld.getOrCreateAgent.useQuery(undefined, { enabled: !!user });

  // 取得所有技能
  const { data: allSkills, isLoading: skillsLoading } = trpc.questSkillCatalog.list.useQuery();

  // 取得玩家已習得技能
  const { data: myLearned, refetch: refetchLearned } = trpc.questSkillProgress.myLearnedSkills.useQuery(
    undefined, { enabled: !!user }
  );

  // 建立已習得 Map
  const learnedMap = useMemo(() => {
    const m = new Map<number, any>();
    for (const l of myLearned ?? []) m.set(l.skillId, l);
    return m;
  }, [myLearned]);

  // 取得技能狀態（簡化：只有 available 和 completed）
  const getSkillStatus = (skillId: number): "available" | "completed" => {
    return learnedMap.has(skillId) ? "completed" : "available";
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

  const selectedSkill = allSkills?.find((s: any) => s.id === selectedSkillId);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 頂部導航 */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/game">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回世界
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                技能學習
              </h1>
              <p className="text-xs text-gray-400">
                已習得 {completedCount}/{totalSkills}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 視圖切換 */}
            <div className="flex rounded-md border border-gray-700 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  viewMode === "grid" ? "bg-gray-700 text-white" : "bg-transparent text-gray-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                圖鑑
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  viewMode === "tree" ? "bg-gray-700 text-white" : "bg-transparent text-gray-400 hover:text-white"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                技能樹
              </button>
            </div>
            <Link href="/game/skills">
              <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                <BookOpen className="w-4 h-4 mr-1" />
                一般技能圖鑑
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 進度總覽 */}
        <Card className="bg-gradient-to-r from-amber-950/30 to-purple-950/30 border-amber-700/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-300 font-medium">技能學習總進度</span>
              <span className="text-xs text-gray-400">{completedCount}/{totalSkills}</span>
            </div>
            <Progress
              value={totalSkills > 0 ? (completedCount / totalSkills) * 100 : 0}
              className="h-2 bg-gray-800"
            />
            <div className="flex justify-between mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">{completedCount}</p>
                <p className="text-[10px] text-gray-500">已習得</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-400">{totalSkills - completedCount}</p>
                <p className="text-[10px] text-gray-500">未學習</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 技能樹視圖 */}
        {viewMode === "tree" ? (
          <div>
            {skillsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-800/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <SkillTree
                skills={allSkills ?? []}
                learnedMap={learnedMap}
                agentLevel={agentData?.agent?.level ?? 1}
                onSkillSelect={(id) => {
                  setSelectedSkillId(id);
                  setShowDetail(true);
                }}
              />
            )}
          </div>
        ) : (
          /* 圖鑑視圖 */
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
                            <SkillCard
                              key={skill.id}
                              skill={skill}
                              isLearned={learnedMap.has(skill.id)}
                              learned={learnedMap.get(skill.id)}
                              onSelect={() => {
                                setSelectedSkillId(skill.id);
                                setShowDetail(true);
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
                      <p>此分類暫無技能</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* 技能詳情對話框 */}
      {selectedSkill && (
        <SkillDetailDialog
          skill={selectedSkill}
          isLearned={learnedMap.has(selectedSkill.id)}
          learned={learnedMap.get(selectedSkill.id)}
          open={showDetail}
          onOpenChange={setShowDetail}
          onRefresh={() => { refetchLearned(); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 技能卡片（簡化版）
// ═══════════════════════════════════════════════════════════════════════
function SkillCard({ skill, isLearned, learned, onSelect }: {
  skill: any;
  isLearned: boolean;
  learned?: any;
  onSelect: () => void;
}) {
  const rarity = RARITY_CONFIG[skill.rarity] ?? RARITY_CONFIG.common;
  const wuxing = WUXING_CONFIG[skill.wuxing] ?? { label: "無", color: "text-gray-400", bg: "bg-gray-800/40", border: "border-gray-600/50", icon: Star };
  const category = CATEGORY_CONFIG[skill.category] ?? CATEGORY_CONFIG.physical;
  const WuxingIcon = wuxing.icon;
  const learnCost = skill.learnCost as any;

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] border ${rarity.border} ${rarity.bg} ${rarity.glow ? `shadow-lg ${rarity.glow}` : ""}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* 頂部：狀態 + 稀有度 */}
        <div className="flex items-center justify-between mb-2">
          {isLearned ? (
            <Badge className="bg-green-950/40 text-green-400 border-green-700/50 text-[10px]" variant="outline">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              已習得
            </Badge>
          ) : (
            <Badge className="bg-cyan-950/20 text-cyan-400 border-cyan-700/50 text-[10px]" variant="outline">
              <BookOpen className="w-3 h-3 mr-1" />
              可學習
            </Badge>
          )}
          <Badge className={`${rarity.bg} ${rarity.color} border ${rarity.border} text-[10px]`}>{rarity.label}</Badge>
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

        {/* 目標/計算基礎標籤 */}
        <div className="flex gap-1 mb-2 flex-wrap">
          {skill.targetType && TARGET_TYPE_LABELS[skill.targetType] && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-gray-800/60 border border-gray-700/50 ${TARGET_TYPE_LABELS[skill.targetType].color}`}>
              {TARGET_TYPE_LABELS[skill.targetType].label}
            </span>
          )}
          {skill.scaleStat && SCALE_STAT_LABELS[skill.scaleStat] && skill.scaleStat !== 'none' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-gray-800/60 border border-gray-700/50 ${SCALE_STAT_LABELS[skill.scaleStat].color}`}>
              {SCALE_STAT_LABELS[skill.scaleStat].label}
            </span>
          )}
          {skill.skillType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/60 border border-gray-700/50 text-gray-400">
              {SKILL_TYPE_LABELS[skill.skillType] ?? skill.skillType}
            </span>
          )}
        </div>

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

        {/* 學習費用（未習得時顯示） */}
        {!isLearned && learnCost && (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-400/80">
            <Coins className="w-3 h-3" />
            <span>
              {learnCost.gold ? `${learnCost.gold.toLocaleString()} 金幣` : ""}
              {learnCost.gold && learnCost.soulCrystal ? " + " : ""}
              {learnCost.soulCrystal ? `${learnCost.soulCrystal} 靈晶` : ""}
              {learnCost.items?.length > 0 ? ` + ${learnCost.items.length} 種道具` : ""}
            </span>
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
// 技能詳情對話框（簡化版 — 一鍵學習）
// ═══════════════════════════════════════════════════════════════════════
function SkillDetailDialog({ skill, isLearned, learned, open, onOpenChange, onRefresh }: {
  skill: any;
  isLearned: boolean;
  learned?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}) {
  const [equipSlot, setEquipSlot] = useState<string>("1");
  const utils = trpc.useUtils();

  // 前置條件檢查
  const { data: prereqCheck } = trpc.questSkillProgress.checkPrereqs.useQuery(
    { skillId: skill.id },
    { enabled: open && !isLearned }
  );

  // 一鍵學習
  const directLearn = trpc.questSkillProgress.directLearn.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onRefresh();
      utils.gameWorld.getOrCreateAgent.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // 裝備/卸下
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
            {category.label} · {SKILL_TYPE_LABELS[skill.skillType] ?? skill.skillType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 技能基本資訊標籤 */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {skill.targetType && TARGET_TYPE_LABELS[skill.targetType] && (
              <Badge variant="outline" className={`${TARGET_TYPE_LABELS[skill.targetType].color} border-current text-[10px]`}>
                {TARGET_TYPE_LABELS[skill.targetType].label}
              </Badge>
            )}
            {skill.scaleStat && SCALE_STAT_LABELS[skill.scaleStat] && skill.scaleStat !== 'none' && (
              <Badge variant="outline" className={`${SCALE_STAT_LABELS[skill.scaleStat].color} border-current text-[10px]`}>
                {SCALE_STAT_LABELS[skill.scaleStat].label}
              </Badge>
            )}
            {skill.skillType && (
              <Badge variant="outline" className="text-gray-400 border-gray-600 text-[10px]">
                {SKILL_TYPE_LABELS[skill.skillType] ?? skill.skillType}
              </Badge>
            )}
            {skill.petLearnable === 1 && (
              <Badge variant="outline" className="text-pink-400 border-pink-600 text-[10px]">寵物可學</Badge>
            )}
            {skill.playerLearnable === 1 && (
              <Badge variant="outline" className="text-cyan-400 border-cyan-600 text-[10px]">人物可學</Badge>
            )}
          </div>

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
              <p className="text-xs font-semibold text-purple-400 mb-2">戰鬥機制</p>
              <div className="text-sm text-gray-300 space-y-1.5">
                {specialMechanic.isPassive && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">被動技能（自動生效）</span>
                  </div>
                )}
                {specialMechanic.hitCount && (
                  <div className="flex items-center gap-2">
                    <Sword className="w-3.5 h-3.5 text-red-400" />
                    <span>連擊 {specialMechanic.hitCount[0]}~{specialMechanic.hitCount[1]} 次</span>
                  </div>
                )}
                {specialMechanic.lifesteal && (
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-pink-400">吸血 {specialMechanic.lifesteal}% 傷害轉化為HP</span>
                  </div>
                )}
                {specialMechanic.ignoreDefPercent && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>穿透 {specialMechanic.ignoreDefPercent}% 防禦</span>
                  </div>
                )}
                {specialMechanic.accuracyMod && (
                  <p>命中率修正：{specialMechanic.accuracyMod > 0 ? '+' : ''}{specialMechanic.accuracyMod}%</p>
                )}
                {specialMechanic.priority && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-yellow-400">先制攻擊（忽略速度判定）</span>
                  </div>
                )}
                {specialMechanic.selfDamagePercent && (
                  <p className="text-red-400">自傷：損失自身 {specialMechanic.selfDamagePercent}% 最大HP</p>
                )}
                {specialMechanic.healType && (
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">
                      {specialMechanic.healType === 'instant' ? '瞬間治療' : specialMechanic.healType === 'hot' ? `持續治療 (${specialMechanic.hotDuration ?? 3}回合)` : specialMechanic.healType === 'revive' ? '復活氣絕角色' : specialMechanic.healType === 'mp_restore' ? '恢復MP' : specialMechanic.healType}
                    </span>
                  </div>
                )}
                {specialMechanic.shield && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-400">護盾：吸收 {specialMechanic.shield.percent}% 傷害，持續 {specialMechanic.shield.duration} 回合</span>
                  </div>
                )}
                {specialMechanic.buff && (
                  <div className="rounded bg-gray-800/50 p-2 mt-1">
                    <p className="text-xs text-amber-400 mb-1">{specialMechanic.buff.target === 'self' ? '自身增益' : specialMechanic.buff.target === 'ally' ? '友方增益' : '敵方減益'}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {specialMechanic.buff.atk && <span className="text-red-300">ATK {specialMechanic.buff.atk > 0 ? '+' : ''}{specialMechanic.buff.atk}%</span>}
                      {specialMechanic.buff.def && <span className="text-blue-300">DEF {specialMechanic.buff.def > 0 ? '+' : ''}{specialMechanic.buff.def}%</span>}
                      {specialMechanic.buff.mtk && <span className="text-purple-300">MTK {specialMechanic.buff.mtk > 0 ? '+' : ''}{specialMechanic.buff.mtk}%</span>}
                      {specialMechanic.buff.spd && <span className="text-cyan-300">SPD {specialMechanic.buff.spd > 0 ? '+' : ''}{specialMechanic.buff.spd}%</span>}
                      {specialMechanic.buff.duration && <span className="text-gray-400">持續 {specialMechanic.buff.duration} 回合</span>}
                    </div>
                  </div>
                )}
                {specialMechanic.taunt && (
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-orange-400">嘲諽：強制敵方攻擊自己，持續 {specialMechanic.taunt.duration} 回合</span>
                  </div>
                )}
                {specialMechanic.cleanse && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">消除{specialMechanic.cleanse === 'all' ? '所有' : specialMechanic.cleanse}狀態異常</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 習得代價 */}
          {learnCost && Object.keys(learnCost).length > 0 && (
            <div className="rounded-md bg-cyan-950/30 border border-cyan-800/40 p-3">
              <p className="text-xs font-semibold text-cyan-400 mb-2">習得代價</p>
              <div className="text-sm text-gray-300 space-y-1.5">
                {learnCost.gold > 0 && (
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span>金幣 {learnCost.gold.toLocaleString()}</span>
                  </div>
                )}
                {learnCost.soulCrystal > 0 && (
                  <div className="flex items-center gap-2">
                    <Gem className="w-4 h-4 text-purple-400" />
                    <span>靈晶 {learnCost.soulCrystal.toLocaleString()}</span>
                  </div>
                )}
                {learnCost.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span>{item.name ?? item.itemId} x{item.qty ?? item.count ?? 1}</span>
                  </div>
                ))}
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

          {/* 操作按鈕 */}
          <div className="border-t border-gray-700 pt-4 space-y-3">
            {/* 未習得 — 一鍵學習 */}
            {!isLearned && (
              <>
                {prereqCheck && !prereqCheck.passed && (
                  <div className="rounded-md bg-red-950/30 border border-red-800/40 p-3">
                    <p className="text-xs text-red-400">前置條件未滿足：{prereqCheck.reason}</p>
                  </div>
                )}
                <Button
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold"
                  onClick={() => directLearn.mutate({ skillId: skill.id })}
                  disabled={directLearn.isPending || (prereqCheck && !prereqCheck.passed)}
                >
                  {directLearn.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Award className="w-4 h-4 mr-2" />
                  )}
                  學習技能
                </Button>
              </>
            )}

            {/* 已習得 — 裝備/卸下 */}
            {isLearned && learned && (
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
