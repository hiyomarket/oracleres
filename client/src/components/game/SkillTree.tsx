import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Flame, Droplets, Leaf, Mountain, Gem, Star,
  Lock, CheckCircle2, Sword, Wand2, Skull, Heart, Sparkles, Shield,
  ChevronDown, ChevronRight, Eye
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface SkillNode {
  id: number;
  name: string;
  category: string;
  wuxing: string;
  rarity: string;
  skillType: string;
  powerPercent: number;
  mpCost: number;
  cooldown: number;
  maxLevel: number;
  description?: string;
  prerequisites?: number[] | null;
  prerequisiteLevel?: number | null;
  targetType?: string;
  scaleStat?: string;
  petLearnable?: number;
  playerLearnable?: number;
}

interface LearnedInfo {
  skillId: number;
  level: number;
  isEquipped: number;
}

interface SkillTreeProps {
  skills: SkillNode[];
  learnedMap: Map<number, LearnedInfo>;
  agentLevel: number;
  onSkillSelect: (skillId: number) => void;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════
const WUXING_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  fire: { label: "火", color: "text-red-400", bg: "bg-red-950/40", icon: Flame },
  water: { label: "水", color: "text-blue-400", bg: "bg-blue-950/40", icon: Droplets },
  wood: { label: "木", color: "text-green-400", bg: "bg-green-950/40", icon: Leaf },
  earth: { label: "土", color: "text-amber-400", bg: "bg-amber-950/40", icon: Mountain },
  metal: { label: "金", color: "text-gray-300", bg: "bg-gray-800/40", icon: Gem },
  none: { label: "無", color: "text-gray-400", bg: "bg-gray-800/40", icon: Star },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  physical: { label: "物理戰鬥", color: "text-red-400", icon: Sword },
  magic: { label: "五行魔法", color: "text-purple-400", icon: Wand2 },
  status: { label: "咒術控制", color: "text-amber-400", icon: Skull },
  support: { label: "治療輔助", color: "text-green-400", icon: Heart },
  special: { label: "特殊技能", color: "text-cyan-400", icon: Sparkles },
  resistance: { label: "抵抗被動", color: "text-gray-400", icon: Shield },
};

const RARITY_CONFIG: Record<string, { label: string; color: string; border: string; glow?: string }> = {
  common: { label: "普通", color: "text-gray-400", border: "border-gray-600" },
  uncommon: { label: "優良", color: "text-green-400", border: "border-green-600" },
  rare: { label: "稀有", color: "text-blue-400", border: "border-blue-600" },
  epic: { label: "史詩", color: "text-purple-400", border: "border-purple-600", glow: "shadow-purple-500/20" },
  legendary: { label: "傳說", color: "text-amber-400", border: "border-amber-600", glow: "shadow-amber-500/20" },
};

// ═══════════════════════════════════════════════════════════════
// Build tree structure
// ═══════════════════════════════════════════════════════════════
interface TreeNode {
  skill: SkillNode;
  children: TreeNode[];
  depth: number;
}

function buildSkillTrees(skills: SkillNode[]): Map<string, TreeNode[]> {
  const skillMap = new Map<number, SkillNode>();
  skills.forEach(s => skillMap.set(s.id, s));

  // Find root nodes (no prerequisites or empty prerequisites)
  const childIds = new Set<number>();
  skills.forEach(s => {
    const prereqs = s.prerequisites;
    if (prereqs && Array.isArray(prereqs)) {
      prereqs.forEach((pid: number) => {
        // pid is a parent, current skill is a child
      });
    }
  });

  // Build parent -> children map
  const childrenMap = new Map<number, number[]>();
  skills.forEach(s => {
    const prereqs = s.prerequisites;
    if (prereqs && Array.isArray(prereqs) && prereqs.length > 0) {
      // Use the first prerequisite as the primary parent for tree layout
      const primaryParent = prereqs[0];
      if (!childrenMap.has(primaryParent)) childrenMap.set(primaryParent, []);
      childrenMap.get(primaryParent)!.push(s.id);
      childIds.add(s.id);
    }
  });

  // Build tree nodes recursively
  function buildNode(skillId: number, depth: number, visited: Set<number>): TreeNode | null {
    if (visited.has(skillId)) return null;
    visited.add(skillId);
    const skill = skillMap.get(skillId);
    if (!skill) return null;

    const children: TreeNode[] = [];
    const childSkillIds = childrenMap.get(skillId) ?? [];
    for (const cid of childSkillIds) {
      const child = buildNode(cid, depth + 1, visited);
      if (child) children.push(child);
    }

    // Sort children by rarity weight
    const rarityWeight: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    children.sort((a, b) => (rarityWeight[a.skill.rarity] ?? 0) - (rarityWeight[b.skill.rarity] ?? 0));

    return { skill, children, depth };
  }

  // Group by category
  const categoryTrees = new Map<string, TreeNode[]>();

  for (const skill of skills) {
    // Root nodes: no prerequisites or only level requirement
    const prereqs = skill.prerequisites;
    const isRoot = !prereqs || !Array.isArray(prereqs) || prereqs.length === 0;

    if (isRoot) {
      const cat = skill.category;
      if (!categoryTrees.has(cat)) categoryTrees.set(cat, []);
      const node = buildNode(skill.id, 0, new Set());
      if (node) categoryTrees.get(cat)!.push(node);
    }
  }

  return categoryTrees;
}

// ═══════════════════════════════════════════════════════════════
// Skill Tree Node Component
// ═══════════════════════════════════════════════════════════════
function SkillTreeNode({
  node,
  learnedMap,
  agentLevel,
  onSkillSelect,
  isLast = false,
}: {
  node: TreeNode;
  learnedMap: Map<number, LearnedInfo>;
  agentLevel: number;
  onSkillSelect: (id: number) => void;
  isLast?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const skill = node.skill;
  const learned = learnedMap.get(skill.id);
  const isLearned = !!learned;
  const wuxing = WUXING_CONFIG[skill.wuxing] ?? WUXING_CONFIG.none;
  const rarity = RARITY_CONFIG[skill.rarity] ?? RARITY_CONFIG.common;
  const WuxingIcon = wuxing.icon;

  // Check if prerequisites are met
  const prereqs = skill.prerequisites;
  const prereqsMet = !prereqs || !Array.isArray(prereqs) || prereqs.length === 0 ||
    prereqs.every((pid: number) => learnedMap.has(pid));
  const levelMet = !skill.prerequisiteLevel || agentLevel >= skill.prerequisiteLevel;
  const canLearn = prereqsMet && levelMet && !isLearned;
  const isLocked = !prereqsMet || !levelMet;

  return (
    <div className="relative">
      {/* Node */}
      <div className="flex items-start gap-2">
        {/* Expand/collapse toggle */}
        {node.children.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 p-0.5 rounded hover:bg-gray-700/50 transition-colors shrink-0"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-4.5 shrink-0" />
        )}

        {/* Skill card */}
        <button
          onClick={() => onSkillSelect(skill.id)}
          className={`flex-1 flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 border
            ${isLearned
              ? "bg-green-950/30 border-green-700/50 hover:bg-green-950/50"
              : canLearn
                ? "bg-cyan-950/20 border-cyan-700/40 hover:bg-cyan-950/40 hover:scale-[1.01]"
                : isLocked
                  ? "bg-gray-900/30 border-gray-700/30 opacity-60 hover:opacity-80"
                  : "bg-gray-800/30 border-gray-700/40 hover:bg-gray-800/50"
            }
            ${rarity.glow && isLearned ? `shadow-md ${rarity.glow}` : ""}
          `}
        >
          {/* Status indicator */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isLearned ? "bg-green-600" : canLearn ? "bg-cyan-600/80" : "bg-gray-700"
          }`}>
            {isLearned ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : isLocked ? (
              <Lock className="w-4 h-4 text-gray-400" />
            ) : (
              <WuxingIcon className={`w-4 h-4 ${wuxing.color}`} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${isLearned ? "text-green-300" : isLocked ? "text-gray-500" : "text-gray-200"}`}>
                {skill.name}
              </span>
              <span className={`text-[10px] ${rarity.color}`}>{rarity.label}</span>
              {isLearned && learned && (
                <span className="text-[10px] text-green-400 font-mono">Lv.{learned.level}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <WuxingIcon className={`w-3 h-3 ${wuxing.color}`} />
              <span>{wuxing.label}</span>
              <span>·</span>
              <span>威力 {skill.powerPercent}%</span>
              <span>·</span>
              <span>MP {skill.mpCost}</span>
              {skill.prerequisiteLevel && !isLearned && (
                <>
                  <span>·</span>
                  <span className={levelMet ? "text-green-500" : "text-red-400"}>
                    需Lv.{skill.prerequisiteLevel}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Equipped badge */}
          {learned?.isEquipped === 1 && (
            <Badge className="bg-green-900/50 text-green-300 border-green-700 text-[10px] shrink-0">
              <Shield className="w-3 h-3 mr-0.5" />
              裝備中
            </Badge>
          )}
        </button>
      </div>

      {/* Children */}
      {expanded && node.children.length > 0 && (
        <div className="ml-4 mt-1 pl-4 border-l border-gray-700/50 space-y-1">
          {node.children.map((child, idx) => (
            <SkillTreeNode
              key={child.skill.id}
              node={child}
              learnedMap={learnedMap}
              agentLevel={agentLevel}
              onSkillSelect={onSkillSelect}
              isLast={idx === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main SkillTree Component
// ═══════════════════════════════════════════════════════════════
export function SkillTree({ skills, learnedMap, agentLevel, onSkillSelect }: SkillTreeProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categoryTrees = useMemo(() => buildSkillTrees(skills), [skills]);

  // Stats
  const totalSkills = skills.length;
  const learnedCount = learnedMap.size;
  const equippedCount = Array.from(learnedMap.values()).filter(l => l.isEquipped === 1).length;

  // Category order
  const categoryOrder = ["physical", "magic", "status", "support", "special", "resistance"];
  const filteredCategories = selectedCategory === "all"
    ? categoryOrder
    : [selectedCategory];

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            已習得 <span className="text-green-400 font-bold">{learnedCount}</span>/{totalSkills}
          </span>
          <span className="text-gray-400">
            已裝備 <span className="text-cyan-400 font-bold">{equippedCount}</span>/6
          </span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
            selectedCategory === "all"
              ? "bg-gray-600 text-white"
              : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
          }`}
        >
          全部
        </button>
        {categoryOrder.map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          const count = categoryTrees.get(cat)?.length ?? 0;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                selectedCategory === cat
                  ? "bg-gray-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
              }`}
            >
              <Icon className={`w-3 h-3 ${cfg.color}`} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Skill trees by category */}
      <div className="space-y-6">
        {filteredCategories.map(cat => {
          const trees = categoryTrees.get(cat) ?? [];
          if (trees.length === 0) return null;
          const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.physical;
          const CatIcon = cfg.icon;

          return (
            <div key={cat}>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${cfg.color}`}>
                <CatIcon className="w-4 h-4" />
                {cfg.label}
                <span className="text-gray-500 font-normal text-xs">
                  ({trees.reduce((acc, t) => acc + countNodes(t), 0)} 技能)
                </span>
              </h3>
              <div className="space-y-1">
                {trees.map(tree => (
                  <SkillTreeNode
                    key={tree.skill.id}
                    node={tree}
                    learnedMap={learnedMap}
                    agentLevel={agentLevel}
                    onSkillSelect={onSkillSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-2 border-t border-gray-800">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-600" />
          <span>已習得</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-cyan-600/80" />
          <span>可學習</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-700" />
          <span>未解鎖</span>
        </div>
        <div className="flex items-center gap-1">
          <ChevronDown className="w-3 h-3" />
          <span>點擊展開/收合</span>
        </div>
      </div>
    </div>
  );
}

function countNodes(node: TreeNode): number {
  return 1 + node.children.reduce((acc, c) => acc + countNodes(c), 0);
}

export default SkillTree;
