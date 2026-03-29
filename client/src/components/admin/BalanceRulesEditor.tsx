/**
 * 平衡規則自訂編輯器
 * 管理員可在此調整各圖鑑各稀有度的數值範圍上下限
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ─── 圖鑑類型和欄位的中文對照 ──────────────────────────────────
const CATALOG_LABELS: Record<string, string> = {
  monster: "怪物",
  monsterSkill: "怪物技能",
  item: "道具",
  equipment: "裝備",
  skill: "人物技能",
  achievement: "成就",
};

const CATALOG_ORDER = ["monster", "monsterSkill", "item", "equipment", "skill", "achievement"];

const RARITY_LABELS: Record<string, string> = {
  common: "普通",
  rare: "稀有",
  elite: "精英",
  epic: "史詩",
  boss: "首領",
  legendary: "傳說",
  white: "白色",
  green: "綠色",
  blue: "藍色",
  purple: "紫色",
  orange: "橙色",
  red: "紅色",
};

const FIELD_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "攻擊",
  def: "防禦",
  spd: "速度",
  matk: "魔攻",
  mdef: "魔防",
  mp: "MP",
  accuracy: "命中",
  critRate: "暴擊率",
  critDamage: "暴擊傷害",
  growthRate: "成長率",
  level: "等級",
  actionsPerTurn: "每回合行動數",
  counterBonus: "反擊加成",
  aiLevel: "AI等級",
  power: "威力%",
  cd: "冷卻",
  price: "售價",
  coins: "金幣獎勵",
  stones: "靈石獎勵",
  gold: "金幣費用",
  soul: "靈魂費用",
  healPower: "治癒力",
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400",
  rare: "text-blue-400",
  elite: "text-purple-400",
  epic: "text-purple-300",
  boss: "text-red-400",
  legendary: "text-amber-400",
  white: "text-gray-300",
  green: "text-green-400",
  blue: "text-blue-400",
  purple: "text-purple-400",
  orange: "text-orange-400",
  red: "text-red-400",
};

type RuleRow = {
  catalogType: string;
  rarity: string;
  field: string;
  minValue: number;
  maxValue: number;
  defaultMin: number;
  defaultMax: number;
  isCustom: boolean;
};

export default function BalanceRulesEditor() {
  const { data: rules, isLoading, refetch } = trpc.balanceRules.getAll.useQuery();
  const updateBatch = trpc.balanceRules.updateBatch.useMutation();
  const resetToDefault = trpc.balanceRules.resetToDefault.useMutation();

  const [activeCatalog, setActiveCatalog] = useState("monster");
  const [edits, setEdits] = useState<Record<string, { min: number; max: number }>>({});
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);

  // 按 catalogType 分組
  const grouped = useMemo(() => {
    if (!rules) return {};
    const g: Record<string, RuleRow[]> = {};
    for (const r of rules) {
      if (!g[r.catalogType]) g[r.catalogType] = [];
      g[r.catalogType].push(r);
    }
    return g;
  }, [rules]);

  // 當前顯示的規則
  const currentRules = useMemo(() => {
    const list = grouped[activeCatalog] ?? [];
    if (showOnlyCustom) return list.filter(r => r.isCustom || edits[`${r.catalogType}|${r.rarity}|${r.field}`]);
    return list;
  }, [grouped, activeCatalog, showOnlyCustom, edits]);

  // 按稀有度分組
  const byRarity = useMemo(() => {
    const g: Record<string, RuleRow[]> = {};
    for (const r of currentRules) {
      if (!g[r.rarity]) g[r.rarity] = [];
      g[r.rarity].push(r);
    }
    return g;
  }, [currentRules]);

  const handleEdit = useCallback((key: string, field: "min" | "max", value: number) => {
    setEdits(prev => ({
      ...prev,
      [key]: {
        min: field === "min" ? value : (prev[key]?.min ?? 0),
        max: field === "max" ? value : (prev[key]?.max ?? 0),
      },
    }));
  }, []);

  const getEditKey = (r: RuleRow) => `${r.catalogType}|${r.rarity}|${r.field}`;

  const hasChanges = Object.keys(edits).length > 0;

  const handleSave = async () => {
    if (!rules) return;
    const changedRules = Object.entries(edits).map(([key, val]) => {
      const [catalogType, rarity, field] = key.split("|");
      return { catalogType, rarity, field, minValue: val.min, maxValue: val.max };
    });

    if (changedRules.length === 0) {
      toast.info("請先修改數值再儲存");
      return;
    }

    try {
      const result = await updateBatch.mutateAsync({ rules: changedRules });
      toast.success(result.message);
      setEdits({});
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReset = async (catalogType?: string) => {
    try {
      const result = await resetToDefault.mutateAsync({ catalogType });
      toast.success(result.message);
      setEdits({});
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">載入平衡規則中…</div>;
  }

  return (
    <div className="space-y-4">
      {/* 標題和操作列 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-bold">平衡規則自訂</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyCustom}
              onChange={e => setShowOnlyCustom(e.target.checked)}
              className="rounded border-white/20"
            />
            僅顯示已修改
          </label>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={updateBatch.isPending}>
              {updateBatch.isPending ? "儲存中…" : `儲存 (${Object.keys(edits).length} 項)`}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReset(activeCatalog)}
            disabled={resetToDefault.isPending}
          >
            重置此圖鑑
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReset()}
            disabled={resetToDefault.isPending}
            className="text-red-400 border-red-400/30 hover:bg-red-400/10"
          >
            全部重置
          </Button>
        </div>
      </div>

      {/* 圖鑑類型切換 */}
      <div className="flex flex-wrap gap-1.5">
        {CATALOG_ORDER.map(ct => {
          const count = grouped[ct]?.filter(r => r.isCustom).length ?? 0;
          return (
            <button
              key={ct}
              onClick={() => setActiveCatalog(ct)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCatalog === ct
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
              }`}
            >
              {CATALOG_LABELS[ct] ?? ct}
              {count > 0 && <span className="ml-1 text-[10px] text-amber-400">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* 規則表格 */}
      {Object.entries(byRarity).map(([rarity, rows]) => (
        <div key={rarity} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-4 py-2 bg-white/[0.05] border-b border-white/10">
            <span className={`text-sm font-bold ${RARITY_COLORS[rarity] ?? "text-white"}`}>
              {RARITY_LABELS[rarity] ?? rarity}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="text-left py-2 px-4 w-28">欄位</th>
                  <th className="text-center py-2 px-3 w-24">預設下限</th>
                  <th className="text-center py-2 px-3 w-24">預設上限</th>
                  <th className="text-center py-2 px-3 w-28">自訂下限</th>
                  <th className="text-center py-2 px-3 w-28">自訂上限</th>
                  <th className="text-center py-2 px-3 w-16">狀態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const key = getEditKey(r);
                  const edit = edits[key];
                  const currentMin = edit?.min ?? r.minValue;
                  const currentMax = edit?.max ?? r.maxValue;
                  const isModified = !!edit || r.isCustom;

                  return (
                    <tr key={key} className={`border-b border-white/5 ${isModified ? "bg-amber-500/5" : "hover:bg-white/5"}`}>
                      <td className="py-2 px-4 font-medium">{FIELD_LABELS[r.field] ?? r.field}</td>
                      <td className="py-2 px-3 text-center text-muted-foreground">{r.defaultMin}</td>
                      <td className="py-2 px-3 text-center text-muted-foreground">{r.defaultMax}</td>
                      <td className="py-2 px-3 text-center">
                        <Input
                          type="number"
                          value={currentMin}
                          onChange={e => handleEdit(key, "min", Number(e.target.value))}
                          className="h-7 w-20 text-center text-xs mx-auto bg-white/5 border-white/10"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Input
                          type="number"
                          value={currentMax}
                          onChange={e => handleEdit(key, "max", Number(e.target.value))}
                          className="h-7 w-20 text-center text-xs mx-auto bg-white/5 border-white/10"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        {r.isCustom ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                            已自訂
                          </span>
                        ) : edit ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400">
                            待儲存
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">預設</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {currentRules.length === 0 && showOnlyCustom && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          此圖鑑尚無自訂規則
        </div>
      )}
    </div>
  );
}
