/**
 * 圖鑑即時預覽面板
 * 根據圖鑑類型和表單資料，顯示遊戲內的實際呈現效果
 */
import { useMemo } from "react";

const WX_ZH: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const WX_COLOR: Record<string, string> = {
  wood: "text-green-400", fire: "text-red-400", earth: "text-yellow-500",
  metal: "text-gray-300", water: "text-blue-400",
};
const WX_BG: Record<string, string> = {
  wood: "bg-green-900/30 border-green-700/50",
  fire: "bg-red-900/30 border-red-700/50",
  earth: "bg-yellow-900/30 border-yellow-700/50",
  metal: "bg-gray-800/30 border-gray-500/50",
  water: "bg-blue-900/30 border-blue-700/50",
};
const RARITY_COLOR: Record<string, string> = {
  common: "text-gray-400", uncommon: "text-green-400", rare: "text-blue-400",
  epic: "text-purple-400", legendary: "text-yellow-400",
};
const RARITY_ZH: Record<string, string> = {
  common: "普通", uncommon: "優良", rare: "稀有", epic: "史詩", legendary: "傳說",
};

type Props = {
  catalogType: string;
  formData: Record<string, any>;
};

export default function CatalogPreview({ catalogType, formData }: Props) {
  const preview = useMemo(() => {
    switch (catalogType) {
      case "monster": return <MonsterPreview data={formData} />;
      case "item": return <ItemPreview data={formData} />;
      case "equipment": return <EquipmentPreview data={formData} />;
      case "skill": return <SkillPreview data={formData} />;
      case "achievement": return <AchievementPreview data={formData} />;
      case "monsterSkill": return <MonsterSkillPreview data={formData} />;
      default: return <div className="text-muted-foreground text-xs">不支援此圖鑑類型的預覽</div>;
    }
  }, [catalogType, formData]);

  return (
    <div className="border border-border/50 rounded-lg p-3 bg-card/50">
      <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        即時預覽
      </div>
      {preview}
    </div>
  );
}

// ─── 怪物預覽 ───
function MonsterPreview({ data }: { data: Record<string, any> }) {
  const el = data.element || "wood";
  const hp = Number(data.hp) || 100;
  const atk = Number(data.attack) || 10;
  const def = Number(data.defense) || 10;
  const spd = Number(data.speed) || 5;
  const lvl = Number(data.level) || 1;
  const rarity = data.rarity || "common";

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${WX_BG[el] || "bg-card"}`}>
      {/* 頭部：名稱 + 等級 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.imageUrl ? "🐉" : "👾"}</span>
          <div>
            <div className={`font-bold text-sm ${RARITY_COLOR[rarity] || "text-foreground"}`}>
              {data.name || "未命名怪物"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Lv.{lvl} · {WX_ZH[el] || el}屬性 · {RARITY_ZH[rarity] || rarity}
            </div>
          </div>
        </div>
        <div className={`text-lg font-bold ${WX_COLOR[el]}`}>{WX_ZH[el]}</div>
      </div>

      {/* 屬性條 */}
      <div className="space-y-1">
        <StatBar label="HP" value={hp} max={Math.max(hp, 500)} color="bg-red-500" />
        <StatBar label="ATK" value={atk} max={Math.max(atk, 100)} color="bg-orange-500" />
        <StatBar label="DEF" value={def} max={Math.max(def, 100)} color="bg-blue-500" />
        <StatBar label="SPD" value={spd} max={Math.max(spd, 50)} color="bg-green-500" />
      </div>

      {/* 掉落金幣 */}
      {data.dropGold && (
        <div className="text-[10px] text-yellow-400">
          💰 掉落金幣：{typeof data.dropGold === "object"
            ? `${data.dropGold.min || 0} ~ ${data.dropGold.max || 0}`
            : data.dropGold}
        </div>
      )}

      {/* 經驗值 */}
      {data.expReward && (
        <div className="text-[10px] text-cyan-400">
          ✨ 經驗值：{data.expReward}
        </div>
      )}

      {/* 描述 */}
      {data.description && (
        <div className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1 mt-1">
          {data.description}
        </div>
      )}
    </div>
  );
}

// ─── 道具預覽 ───
function ItemPreview({ data }: { data: Record<string, any> }) {
  const el = data.element || "wood";
  const rarity = data.rarity || "common";
  const category = data.category || "material";
  const CATEGORY_ZH: Record<string, string> = {
    material: "素材", consumable: "消耗品", quest: "任務道具",
    skillBook: "技能書", key: "鑰匙", treasure: "寶物",
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${WX_BG[el] || "bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">📦</span>
        <div>
          <div className={`font-bold text-sm ${RARITY_COLOR[rarity]}`}>
            {data.name || "未命名道具"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {CATEGORY_ZH[category] || category} · {WX_ZH[el]}屬性 · {RARITY_ZH[rarity]}
          </div>
        </div>
      </div>

      {/* 堆疊上限 & 售價 */}
      <div className="flex gap-3 text-[10px]">
        {data.maxStack && <span>📚 堆疊上限：{data.maxStack}</span>}
        {data.sellPrice && <span>💰 售價：{data.sellPrice}</span>}
      </div>

      {/* 使用效果 */}
      {data.useEffect && (
        <div className="text-[10px] border-t border-border/30 pt-1">
          <span className="text-green-400">🧪 使用效果：</span>
          {renderUseEffect(data.useEffect)}
        </div>
      )}

      {data.description && (
        <div className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1">
          {data.description}
        </div>
      )}
    </div>
  );
}

// ─── 裝備預覽 ───
function EquipmentPreview({ data }: { data: Record<string, any> }) {
  const el = data.element || "wood";
  const rarity = data.rarity || "common";
  const SLOT_ZH: Record<string, string> = {
    weapon: "武器", armor: "防具", accessory: "飾品",
    helmet: "頭盔", boots: "靴子", ring: "戒指",
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${WX_BG[el] || "bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚔️</span>
        <div>
          <div className={`font-bold text-sm ${RARITY_COLOR[rarity]}`}>
            {data.name || "未命名裝備"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {SLOT_ZH[data.slot] || data.slot || "裝備"} · {WX_ZH[el]}屬性 · {RARITY_ZH[rarity]}
            {data.levelReq ? ` · 需求 Lv.${data.levelReq}` : ""}
          </div>
        </div>
      </div>

      {/* 基礎屬性 */}
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        {data.atkBonus > 0 && <span className="text-orange-400">⚔ 攻擊 +{data.atkBonus}</span>}
        {data.defBonus > 0 && <span className="text-blue-400">🛡 防禦 +{data.defBonus}</span>}
        {data.hpBonus > 0 && <span className="text-red-400">❤ HP +{data.hpBonus}</span>}
        {data.spdBonus > 0 && <span className="text-green-400">💨 速度 +{data.spdBonus}</span>}
        {data.mpBonus > 0 && <span className="text-cyan-400">💧 MP +{data.mpBonus}</span>}
        {data.matkBonus > 0 && <span className="text-purple-400">✨ 魔攻 +{data.matkBonus}</span>}
      </div>

      {/* 詞條 */}
      {renderAffixes(data)}

      {data.description && (
        <div className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1">
          {data.description}
        </div>
      )}
    </div>
  );
}

// ─── 技能預覽 ───
function SkillPreview({ data }: { data: Record<string, any> }) {
  const el = data.element || "wood";
  const CATEGORY_ZH: Record<string, string> = {
    active: "主動技能", passive: "被動技能", hidden: "隱藏技能", ultimate: "終極技能",
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${WX_BG[el] || "bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔮</span>
        <div>
          <div className={`font-bold text-sm ${WX_COLOR[el]}`}>
            {data.name || "未命名技能"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {CATEGORY_ZH[data.category] || data.category} · {WX_ZH[el]}屬性
            {data.levelReq ? ` · 需求 Lv.${data.levelReq}` : ""}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px]">
        {data.powerPercent && <span className="text-orange-400">⚡ 威力：{data.powerPercent}%</span>}
        {data.mpCost && <span className="text-cyan-400">💧 消耗 MP：{data.mpCost}</span>}
        {data.cooldown && <span className="text-yellow-400">⏱ 冷卻：{data.cooldown} 回合</span>}
        {data.accuracy && <span className="text-green-400">🎯 命中率：{data.accuracy}%</span>}
      </div>

      {data.description && (
        <div className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1">
          {data.description}
        </div>
      )}
    </div>
  );
}

// ─── 成就預覽 ───
function AchievementPreview({ data }: { data: Record<string, any> }) {
  return (
    <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🏆</span>
        <div>
          <div className="font-bold text-sm text-yellow-400">
            {data.name || "未命名成就"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {data.category || "一般"} · {data.points || 0} 點
          </div>
        </div>
      </div>

      {data.rewardContent && (
        <div className="text-[10px] border-t border-border/30 pt-1">
          <span className="text-green-400">🎁 獎勵：</span>
          {renderRewardContent(data.rewardContent)}
        </div>
      )}

      {data.description && (
        <div className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1">
          {data.description}
        </div>
      )}
    </div>
  );
}

// ─── 魔物技能預覽 ───
function MonsterSkillPreview({ data }: { data: Record<string, any> }) {
  const el = data.element || "wood";
  const SKILL_TYPE_ZH: Record<string, string> = {
    physical: "物理", magical: "魔法", heal: "治癒", buff: "增益", debuff: "減益",
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${WX_BG[el] || "bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">💀</span>
        <div>
          <div className={`font-bold text-sm ${WX_COLOR[el]}`}>
            {data.name || "未命名魔物技能"}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {SKILL_TYPE_ZH[data.skillType] || data.skillType} · {WX_ZH[el]}屬性
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-[10px]">
        {data.basePower && <span className="text-orange-400">⚡ 基礎威力：{data.basePower}</span>}
        {data.accuracy && <span className="text-green-400">🎯 命中率：{data.accuracy}%</span>}
        {data.cooldown && <span className="text-yellow-400">⏱ 冷卻：{data.cooldown}</span>}
        {data.priority && <span className="text-purple-400">📊 優先度：{data.priority}</span>}
      </div>

      {data.description && (
        <div className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-1">
          {data.description}
        </div>
      )}
    </div>
  );
}

// ─── 工具元件 ───
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-7 text-right text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right">{value}</span>
    </div>
  );
}

function renderUseEffect(effect: any) {
  if (!effect) return null;
  if (typeof effect === "string") {
    try { effect = JSON.parse(effect); } catch { return <span>{effect}</span>; }
  }
  if (Array.isArray(effect)) {
    const EFFECT_ZH: Record<string, string> = {
      healHp: "回復 HP", healMp: "回復 MP", boostAtk: "攻擊提升",
      boostDef: "防禦提升", boostSpd: "速度提升", cureStatus: "解除異常",
      teleport: "傳送", revive: "復活",
    };
    return (
      <span>
        {effect.map((e: any, i: number) => (
          <span key={i}>
            {i > 0 && "、"}
            {EFFECT_ZH[e.type] || e.type}{e.value ? ` ${e.value}` : ""}
          </span>
        ))}
      </span>
    );
  }
  return <span>{JSON.stringify(effect)}</span>;
}

function renderRewardContent(reward: any) {
  if (!reward) return null;
  if (typeof reward === "string") {
    try { reward = JSON.parse(reward); } catch { return <span>{reward}</span>; }
  }
  if (Array.isArray(reward)) {
    const REWARD_ZH: Record<string, string> = {
      gold: "金幣", exp: "經驗", item: "道具", equipment: "裝備",
      title: "稱號", skill: "技能", stamina: "體力",
      attack: "攻擊力", defense: "防禦力", hp: "HP", mp: "MP",
      speed: "速度", matk: "魔攻",
    };
    return (
      <span>
        {reward.map((r: any, i: number) => (
          <span key={i}>
            {i > 0 && "、"}
            {REWARD_ZH[r.type] || r.type} +{r.value || r.amount || 0}
          </span>
        ))}
      </span>
    );
  }
  return <span>{JSON.stringify(reward)}</span>;
}

function renderAffixes(data: Record<string, any>) {
  const affixes: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const affix = data[`affix${i}`];
    if (affix) {
      const parsed = typeof affix === "string" ? (() => { try { return JSON.parse(affix); } catch { return null; } })() : affix;
      if (parsed && parsed.type) affixes.push(parsed);
    }
  }
  if (affixes.length === 0) return null;

  const AFFIX_ZH: Record<string, string> = {
    attack: "攻擊", defense: "防禦", hp: "HP", mp: "MP",
    speed: "速度", matk: "魔攻", critRate: "暴擊率", critDmg: "暴擊傷害",
    dodge: "閃避", accuracy: "命中", lifeSteal: "吸血",
  };

  return (
    <div className="text-[10px] border-t border-border/30 pt-1 space-y-0.5">
      <span className="text-purple-400">🔮 詞條：</span>
      {affixes.map((a, i) => (
        <div key={i} className="pl-4 text-purple-300">
          • {AFFIX_ZH[a.type] || a.type} +{a.min ?? 0}~{a.max ?? 0}
        </div>
      ))}
    </div>
  );
}
