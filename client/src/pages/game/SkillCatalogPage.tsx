import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "wouter";
import { ArrowLeft, Lock, Star, Zap, Shield, Leaf, Flame, Mountain, Sword, Droplets } from "lucide-react";

// ─── 五行元素設定 ─────────────────────────────────────────────────────────────
const ELEMENT_CONFIG = {
  wood:  { label: "木", icon: Leaf,     color: "text-green-400",  bg: "bg-green-950/40",  border: "border-green-700/50",  badge: "bg-green-900 text-green-200" },
  fire:  { label: "火", icon: Flame,    color: "text-red-400",    bg: "bg-red-950/40",    border: "border-red-700/50",    badge: "bg-red-900 text-red-200" },
  earth: { label: "土", icon: Mountain, color: "text-yellow-400", bg: "bg-yellow-950/40", border: "border-yellow-700/50", badge: "bg-yellow-900 text-yellow-200" },
  metal: { label: "金", icon: Sword,    color: "text-gray-300",   bg: "bg-gray-800/40",   border: "border-gray-600/50",   badge: "bg-gray-700 text-gray-200" },
  water: { label: "水", icon: Droplets, color: "text-blue-400",   bg: "bg-blue-950/40",   border: "border-blue-700/50",   badge: "bg-blue-900 text-blue-200" },
  cross: { label: "天命", icon: Star,   color: "text-purple-400", bg: "bg-purple-950/40", border: "border-purple-700/50", badge: "bg-purple-900 text-purple-200" },
};

// ─── 稀有度設定 ───────────────────────────────────────────────────────────────
const RARITY_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  basic:   { label: "普通",   color: "text-gray-400",   glow: "" },
  rare:    { label: "稀有",   color: "text-blue-400",   glow: "shadow-blue-500/20" },
  epic:    { label: "史詩",   color: "text-purple-400", glow: "shadow-purple-500/30" },
  legend:  { label: "傳說",   color: "text-yellow-400", glow: "shadow-yellow-500/40" },
  fate:    { label: "天命",   color: "text-pink-400",   glow: "shadow-pink-500/50" },
  hidden:  { label: "隱藏",   color: "text-emerald-400",glow: "shadow-emerald-500/40" },
};

// ─── 覺醒階段設定 ─────────────────────────────────────────────────────────────
const AWAKE_TIER_CONFIG = [
  { label: "普通", color: "text-gray-400" },
  { label: "大招", color: "text-blue-400" },
  { label: "奧義", color: "text-purple-400" },
  { label: "神技", color: "text-yellow-400" },
];

type ElementKey = keyof typeof ELEMENT_CONFIG;

interface SkillCardProps {
  skill: {
    id: string;
    name: string;
    element: string;
    category: string;
    rarity: string;
    tier: number;
    effectDesc: string;
    effectValue: number;
    mpCost: number;
    cooldown: number;
    acquireMethod: string;
    comboTags: string | null;
    fogged: boolean;
    displayName: string;
    displayDesc: string;
    unlocked: boolean;
  };
  agentSkill?: { awakeTier: number; useCount: number; installedSlot: string | null } | null;
  onSelect: () => void;
}

function SkillCard({ skill, agentSkill, onSelect }: SkillCardProps) {
  const elemCfg = ELEMENT_CONFIG[skill.element as ElementKey] ?? ELEMENT_CONFIG.cross;
  const rarityCfg = RARITY_CONFIG[skill.rarity] ?? RARITY_CONFIG.basic;
  const ElemIcon = elemCfg.icon;
  const awakeTier = agentSkill?.awakeTier ?? 0;
  const awakeCfg = AWAKE_TIER_CONFIG[awakeTier] ?? AWAKE_TIER_CONFIG[0];

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] border ${elemCfg.border} ${elemCfg.bg} ${skill.fogged ? "opacity-60" : ""} ${rarityCfg.glow ? `shadow-lg ${rarityCfg.glow}` : ""}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* 頂部：名稱 + 稀有度 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {skill.fogged ? (
              <Lock className="w-4 h-4 text-gray-500" />
            ) : (
              <ElemIcon className={`w-4 h-4 ${elemCfg.color}`} />
            )}
            <span className={`font-bold text-sm ${skill.fogged ? "text-gray-500" : "text-white"}`}>
              {skill.displayName}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={`text-xs px-1.5 py-0 ${rarityCfg.color} border-current`} variant="outline">
              {rarityCfg.label}
            </Badge>
            {awakeTier > 0 && (
              <Badge className={`text-xs px-1.5 py-0 ${awakeCfg.color} border-current`} variant="outline">
                {awakeCfg.label}
              </Badge>
            )}
          </div>
        </div>

        {/* 效果描述 */}
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{skill.displayDesc}</p>

        {/* 底部：費用 + 狀態 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {!skill.fogged && (
              <>
                <span className="flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-blue-400" />{skill.mpCost}
                </span>
                {skill.cooldown > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Shield className="w-3 h-3 text-gray-400" />{skill.cooldown}回
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {skill.unlocked && (
              <span className="text-xs text-green-400">✓ 已習得</span>
            )}
            {agentSkill?.installedSlot && (
              <span className="text-xs text-yellow-400">⚡ 裝備中</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SkillCatalogPage() {
  const { user } = useAuth();
  const [selectedElement, setSelectedElement] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // 取得玩家角色資訊
  const { data: agentData } = trpc.gameWorld.getOrCreateAgent.useQuery(undefined, {
    enabled: !!user,
  });

  const agentId = agentData?.agent?.id;

  // 取得技能圖鑑
  const { data: catalog, isLoading } = trpc.gameSkill.getSkillCatalog.useQuery(
    {
      element: selectedElement as "wood" | "fire" | "earth" | "metal" | "water" | "cross" | "all",
      agentId,
    },
    { enabled: !!user }
  );

  // 取得玩家已習得技能
  const { data: agentSkillsData } = trpc.gameSkill.getAgentSkills.useQuery(
    { agentId: agentId! },
    { enabled: !!agentId }
  );

  // 取得技能書
  const { data: skillBooksData } = trpc.gameSkill.getSkillBooks.useQuery(
    { agentId: agentId! },
    { enabled: !!agentId }
  );

  // 取得隱藏技能追蹤器
  const { data: trackersData } = trpc.gameSkill.getHiddenSkillTrackers.useQuery(
    { agentId: agentId! },
    { enabled: !!agentId }
  );

  // 使用技能書
  const useSkillBook = trpc.gameSkill.useSkillBook.useMutation({
    onSuccess: (data) => {
      toast.success(`✨ 習得技能：${data.skillName}！${data.isHidden ? " 🌟 隱藏技能解鎖！" : ""}`);
    },
    onError: (err) => toast.error(`使用失敗：${err.message}`),
  });

  // 裝備技能
  const equipSkill = trpc.gameSkill.equipSkill.useMutation({
    onSuccess: () => toast.success("技能裝備成功！"),
    onError: (err) => toast.error(`裝備失敗：${err.message}`),
  });

  // 建立 agentSkill Map
  const agentSkillMap = new Map(
    (agentSkillsData ?? []).map(({ agentSkill, template }) => [template.id, agentSkill])
  );

  // 選中的技能詳情
  const selectedSkillData = catalog?.find(s => s.id === selectedSkill);
  const selectedAgentSkill = selectedSkill ? agentSkillMap.get(selectedSkill) : null;

  // 統計數字
  const totalSkills = catalog?.length ?? 0;
  const unlockedSkills = catalog?.filter(s => s.unlocked).length ?? 0;
  const hiddenSkills = catalog?.filter(s => s.fogged).length ?? 0;

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
              <h1 className="text-lg font-bold text-white">技能圖鑑</h1>
              <p className="text-xs text-gray-400">已習得 {unlockedSkills}/{totalSkills} · {hiddenSkills} 個隱藏技能待揭示</p>
            </div>
          </div>
          {/* 技能書數量 */}
          {(skillBooksData?.length ?? 0) > 0 && (
            <Badge className="bg-yellow-900 text-yellow-200 border-yellow-700">
              📖 {skillBooksData!.length} 本技能書
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={selectedElement} onValueChange={setSelectedElement}>
          {/* 五行頁簽 */}
          <TabsList className="grid grid-cols-7 bg-gray-900 border border-gray-700 mb-6 h-auto p-1">
            <TabsTrigger value="all" className="text-xs py-2 data-[state=active]:bg-gray-700">
              全部
            </TabsTrigger>
            {(["wood", "fire", "earth", "metal", "water", "cross"] as const).map(elem => {
              const cfg = ELEMENT_CONFIG[elem];
              const ElemIcon = cfg.icon;
              return (
                <TabsTrigger key={elem} value={elem} className={`text-xs py-2 data-[state=active]:${cfg.bg}`}>
                  <ElemIcon className={`w-3 h-3 mr-1 ${cfg.color}`} />
                  {cfg.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* 技能書提示區 */}
          {(skillBooksData?.length ?? 0) > 0 && (
            <Card className="bg-yellow-950/30 border-yellow-700/50 mb-4">
              <CardContent className="p-3">
                <p className="text-sm text-yellow-300 font-medium mb-2">📖 背包中的技能書</p>
                <div className="flex flex-wrap gap-2">
                  {skillBooksData!.map(({ book, template }) => (
                    <div key={book.id} className="flex items-center gap-2 bg-yellow-900/30 rounded-lg px-3 py-1.5 border border-yellow-700/30">
                      <span className="text-xs text-yellow-200">{template.name} ×{book.quantity}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-2 text-xs text-yellow-400 hover:text-yellow-200"
                        onClick={() => agentId && useSkillBook.mutate({ agentId, bookId: book.id })}
                        disabled={useSkillBook.isPending}
                      >
                        使用
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 隱藏技能追蹤器 */}
          {(trackersData?.length ?? 0) > 0 && (
            <Card className="bg-emerald-950/30 border-emerald-700/50 mb-4">
              <CardContent className="p-3">
                <p className="text-sm text-emerald-300 font-medium mb-2">🔍 隱藏技能追蹤進度</p>
                <div className="space-y-2">
                  {trackersData!.filter(t => !t.isUnlocked).slice(0, 3).map(tracker => (
                    <div key={tracker.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-32 truncate">{tracker.trackerId}</span>
                      <Progress
                        value={(tracker.currentValue / tracker.targetValue) * 100}
                        className="flex-1 h-2 bg-gray-800"
                      />
                      <span className="text-xs text-emerald-400 w-16 text-right">
                        {tracker.currentValue}/{tracker.targetValue}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 技能列表 */}
          <TabsContent value={selectedElement}>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-28 bg-gray-800/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(catalog ?? []).map(skill => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    agentSkill={agentSkillMap.get(skill.id) ?? null}
                    onSelect={() => setSelectedSkill(skill.id)}
                  />
                ))}
                {(catalog ?? []).length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>此屬性暫無技能資料</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 技能詳情對話框 */}
      <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          {selectedSkillData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const elemCfg = ELEMENT_CONFIG[selectedSkillData.element as ElementKey] ?? ELEMENT_CONFIG.cross;
                    const ElemIcon = elemCfg.icon;
                    return <ElemIcon className={`w-5 h-5 ${elemCfg.color}`} />;
                  })()}
                  {selectedSkillData.displayName}
                  {selectedSkillData.fogged && <Lock className="w-4 h-4 text-gray-500" />}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* 基本資訊 */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-gray-400 text-xs">屬性</p>
                    <p className={ELEMENT_CONFIG[selectedSkillData.element as ElementKey]?.color ?? "text-white"}>
                      {ELEMENT_CONFIG[selectedSkillData.element as ElementKey]?.label ?? selectedSkillData.element}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-gray-400 text-xs">稀有度</p>
                    <p className={RARITY_CONFIG[selectedSkillData.rarity]?.color ?? "text-white"}>
                      {RARITY_CONFIG[selectedSkillData.rarity]?.label ?? selectedSkillData.rarity}
                    </p>
                  </div>
                  {!selectedSkillData.fogged && (
                    <>
                      <div className="bg-gray-800 rounded p-2">
                        <p className="text-gray-400 text-xs">MP 消耗</p>
                        <p className="text-blue-400">{selectedSkillData.mpCost}</p>
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        <p className="text-gray-400 text-xs">冷卻回合</p>
                        <p className="text-gray-300">{selectedSkillData.cooldown}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* 效果描述 */}
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">技能效果</p>
                  <p className="text-sm text-gray-200">{selectedSkillData.displayDesc}</p>
                </div>

                {/* Combo 標籤 */}
                {!selectedSkillData.fogged && selectedSkillData.comboTags && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Combo 標籤</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSkillData.comboTags.split(",").map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs text-purple-300 border-purple-700">
                          #{tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 覺醒進度 */}
                {selectedAgentSkill && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-2">覺醒進度</p>
                    <div className="flex items-center gap-2">
                      {AWAKE_TIER_CONFIG.map((tier, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-6 rounded text-xs flex items-center justify-center border ${
                            i <= selectedAgentSkill.awakeTier
                              ? `${tier.color} border-current bg-gray-700`
                              : "text-gray-600 border-gray-700"
                          }`}
                        >
                          {tier.label}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">使用次數：{selectedAgentSkill.useCount}</p>
                  </div>
                )}

                {/* 取得方式 */}
                {!selectedSkillData.fogged && (
                  <div className="text-xs text-gray-500">
                    取得方式：{
                      { shop: "商店購買", quest: "任務獎勵", drop: "怪物掉落", trigger: "特殊觸發" }[selectedSkillData.acquireMethod]
                      ?? selectedSkillData.acquireMethod
                    }
                  </div>
                )}

                {/* 裝備按鈕 */}
                {selectedSkillData.unlocked && agentId && (
                  <div className="flex gap-2">
                    {selectedAgentSkill?.installedSlot ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-700 text-red-400 hover:bg-red-950"
                        onClick={() => equipSkill.mutate({ agentId, skillId: selectedSkillData.id, slot: null })}
                        disabled={equipSkill.isPending}
                      >
                        卸下技能
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-700 hover:bg-purple-600"
                        onClick={() => equipSkill.mutate({ agentId, skillId: selectedSkillData.id, slot: "skillSlot1" })}
                        disabled={equipSkill.isPending}
                      >
                        裝備技能
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
