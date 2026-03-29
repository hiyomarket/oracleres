/**
 * 魔物數值倍率管理 Tab
 * 在魔物圖鑑管理中，提供全域倍率調整 + 即時預覽
 */
import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Eye, Swords, Shield, Heart, Zap, Target, Star, Flame } from "lucide-react";

// 倍率分類
const STAT_MULTIPLIERS = [
  { key: "monster_hp_multiplier", label: "HP", icon: Heart, color: "text-red-400" },
  { key: "monster_mp_multiplier", label: "MP", icon: Zap, color: "text-blue-400" },
  { key: "monster_atk_multiplier", label: "物攻", icon: Swords, color: "text-orange-400" },
  { key: "monster_matk_multiplier", label: "魔攻", icon: Flame, color: "text-purple-400" },
  { key: "monster_def_multiplier", label: "物防", icon: Shield, color: "text-green-400" },
  { key: "monster_mdef_multiplier", label: "魔防", icon: Shield, color: "text-cyan-400" },
  { key: "monster_spd_multiplier", label: "速度", icon: Zap, color: "text-yellow-400" },
  { key: "monster_acc_multiplier", label: "命中", icon: Target, color: "text-amber-400" },
  { key: "monster_crit_rate_multiplier", label: "暴擊率", icon: Star, color: "text-rose-400" },
  { key: "monster_crit_dmg_multiplier", label: "暴擊傷害", icon: Star, color: "text-rose-500" },
  { key: "monster_bp_multiplier", label: "BP", icon: Swords, color: "text-indigo-400" },
  { key: "monster_heal_multiplier", label: "治療力", icon: Heart, color: "text-emerald-400" },
  { key: "monster_resist_multiplier", label: "五行抗性", icon: Shield, color: "text-teal-400" },
];

const RARITY_MULTIPLIERS = [
  { key: "monster_rarity_common_multiplier", label: "普通", color: "bg-gray-600" },
  { key: "monster_rarity_rare_multiplier", label: "稀有", color: "bg-blue-600" },
  { key: "monster_rarity_elite_multiplier", label: "精英", color: "bg-purple-600" },
  { key: "monster_rarity_epic_multiplier", label: "史詩", color: "bg-orange-600" },
  { key: "monster_rarity_boss_multiplier", label: "Boss", color: "bg-red-600" },
  { key: "monster_rarity_legendary_multiplier", label: "傳說", color: "bg-yellow-600" },
];

export default function MonsterMultiplierTab() {
  const { data: configs, isLoading, refetch } = trpc.gameAdmin.getMonsterMultipliers.useQuery();
  const updateMut = trpc.gameAdmin.updateMonsterMultipliers.useMutation({
    onSuccess: () => {
      toast.success("倍率已更新：魔物數值倍率已儲存並即時生效");
      refetch();
    },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  // 本地編輯狀態
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [showPreview, setShowPreview] = useState(false);

  // 初始化本地值
  useEffect(() => {
    if (configs) {
      const vals: Record<string, number> = {};
      for (const c of configs) {
        vals[c.configKey] = parseFloat(c.configValue) || 1;
      }
      setLocalValues(vals);
    }
  }, [configs]);

  // 是否有未儲存的變更
  const hasChanges = useMemo(() => {
    if (!configs) return false;
    return configs.some(c => {
      const orig = parseFloat(c.configValue) || 1;
      const local = localValues[c.configKey] ?? 1;
      return Math.abs(orig - local) > 0.001;
    });
  }, [configs, localValues]);

  // 預覽查詢
  const { data: previewData, isFetching: previewLoading } = trpc.gameAdmin.previewMonsterMultipliers.useQuery(
    { multipliers: localValues },
    { enabled: showPreview && Object.keys(localValues).length > 0 },
  );

  const handleSliderChange = (key: string, value: number[]) => {
    setLocalValues(prev => ({ ...prev, [key]: value[0] }));
  };

  const handleInputChange = (key: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.1) {
      setLocalValues(prev => ({ ...prev, [key]: num }));
    }
  };

  const handleSave = () => {
    if (!configs) return;
    const updates = configs
      .filter(c => {
        const orig = parseFloat(c.configValue) || 1;
        const local = localValues[c.configKey] ?? 1;
        return Math.abs(orig - local) > 0.001;
      })
      .map(c => ({
        configKey: c.configKey,
        configValue: String(localValues[c.configKey] ?? 1),
      }));
    if (updates.length === 0) return;
    updateMut.mutate(updates);
  };

  const handleReset = () => {
    if (configs) {
      const vals: Record<string, number> = {};
      for (const c of configs) {
        vals[c.configKey] = parseFloat(c.configValue) || 1;
      }
      setLocalValues(vals);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">載入倍率設定...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">魔物數值倍率管理</h3>
          <p className="text-sm text-muted-foreground">
            調整全域倍率會即時影響所有魔物的戰鬥數值。倍率 = 1.0 表示原始值不變。
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? "隱藏預覽" : "即時預覽"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || updateMut.isPending}>
            {updateMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            儲存變更
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-sm text-amber-300">
          有未儲存的變更，請記得點擊「儲存變更」。
        </div>
      )}

      {/* 數值倍率 */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">戰鬥數值倍率</CardTitle>
          <CardDescription>每項數值獨立調整，影響所有魔物</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {STAT_MULTIPLIERS.map(({ key, label, icon: Icon, color }) => {
              const val = localValues[key] ?? 1;
              const cfg = configs?.find(c => c.configKey === key);
              const origVal = cfg ? parseFloat(cfg.configValue) || 1 : 1;
              const changed = Math.abs(origVal - val) > 0.001;
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-3 transition-colors ${changed ? "border-amber-500/50 bg-amber-500/5" : "border-border/30 bg-background/30"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <Label className="text-sm font-medium">{label}</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        value={val}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className="w-20 h-7 text-xs text-center"
                      />
                      <span className="text-xs text-muted-foreground">x</span>
                    </div>
                  </div>
                  <Slider
                    value={[val]}
                    min={0.1}
                    max={20}
                    step={0.1}
                    onValueChange={(v) => handleSliderChange(key, v)}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>0.1x</span>
                    <span>1x</span>
                    <span>10x</span>
                    <span>20x</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 稀有度倍率 */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">稀有度額外倍率</CardTitle>
          <CardDescription>按稀有度疊加的額外倍率，與上方數值倍率相乘</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {RARITY_MULTIPLIERS.map(({ key, label, color }) => {
              const val = localValues[key] ?? 1;
              const cfg = configs?.find(c => c.configKey === key);
              const origVal = cfg ? parseFloat(cfg.configValue) || 1 : 1;
              const changed = Math.abs(origVal - val) > 0.001;
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-3 text-center transition-colors ${changed ? "border-amber-500/50 bg-amber-500/5" : "border-border/30 bg-background/30"}`}
                >
                  <Badge className={`${color} text-white mb-2`}>{label}</Badge>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={val}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-full h-8 text-center text-sm"
                  />
                  <Slider
                    value={[val]}
                    min={0.1}
                    max={10}
                    step={0.1}
                    onValueChange={(v) => handleSliderChange(key, v)}
                    className="w-full mt-2"
                  />
                  <div className="text-[10px] text-muted-foreground mt-1">{val}x</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 即時預覽 */}
      {showPreview && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              即時預覽（前 10 隻魔物）
            </CardTitle>
            <CardDescription>左側為原始值，右側為套用倍率後的值</CardDescription>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : previewData && previewData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-1">魔物</th>
                      <th className="text-left py-2 px-1">稀有度</th>
                      <th className="text-center py-2 px-1">HP</th>
                      <th className="text-center py-2 px-1">MP</th>
                      <th className="text-center py-2 px-1">物攻</th>
                      <th className="text-center py-2 px-1">魔攻</th>
                      <th className="text-center py-2 px-1">物防</th>
                      <th className="text-center py-2 px-1">魔防</th>
                      <th className="text-center py-2 px-1">速度</th>
                      <th className="text-center py-2 px-1">BP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((mon) => (
                      <tr key={mon.monsterId} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="py-2 px-1 font-medium">{mon.name}</td>
                        <td className="py-2 px-1">
                          <Badge variant="outline" className="text-[10px]">{mon.rarity}</Badge>
                        </td>
                        {(["hp", "mp", "atk", "matk", "def", "mdef", "spd", "bp"] as const).map(stat => {
                          const orig = mon.original[stat];
                          const scaled = mon.scaled[stat];
                          const changed = orig !== scaled;
                          return (
                            <td key={stat} className="py-2 px-1 text-center">
                              <div className="text-muted-foreground line-through text-[10px]">{orig}</div>
                              <div className={changed ? "text-amber-400 font-semibold" : ""}>{scaled}</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">無預覽資料</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 說明 */}
      <Card className="bg-muted/20 border-border/30">
        <CardContent className="pt-4">
          <h4 className="text-sm font-semibold mb-2">倍率計算公式</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>最終數值</strong> = 圖鑑原始值 × 數值倍率 × 稀有度倍率
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            例如：木魔 HP=548，HP倍率=10x，普通倍率=1x → 最終 HP = 548 × 10 × 1 = 5480
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            倍率修改後會即時清除快取，下次戰鬥即套用新數值。不會修改圖鑑中的原始數據。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
