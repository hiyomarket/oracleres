/**
 * SmartEditors - 統一的人性化表單編輯器元件
 * 取代所有手動 JSON 輸入，改為下拉選單 + 數值輸入的直覺操作
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ═══════════════════════════════════════════════════════════
// 共用常數
// ═══════════════════════════════════════════════════════════

const STAT_OPTIONS = [
  { value: "attack", label: "攻擊力" },
  { value: "defense", label: "防禦力" },
  { value: "hp", label: "生命值" },
  { value: "speed", label: "速度" },
  { value: "accuracy", label: "命中力" },
  { value: "magicAttack", label: "魔法攻擊" },
  { value: "critRate", label: "暴擊率%" },
  { value: "critDamage", label: "暴擊傷害%" },
  { value: "dodge", label: "閃避率%" },
  { value: "resistWood", label: "抗木%" },
  { value: "resistFire", label: "抗火%" },
  { value: "resistEarth", label: "抗土%" },
  { value: "resistMetal", label: "抗金%" },
  { value: "resistWater", label: "抗水%" },
];

const REWARD_TYPE_OPTIONS = [
  { value: "stones", label: "靈石" },
  { value: "coins", label: "金幣" },
  { value: "exp", label: "經驗值" },
  { value: "item", label: "道具" },
  { value: "equipment", label: "裝備" },
  { value: "skill", label: "技能" },
  { value: "title", label: "稱號" },
  { value: "frame", label: "邊框" },
  { value: "stat_attack", label: "攻擊力提升" },
  { value: "stat_defense", label: "防禦力提升" },
  { value: "stat_hp", label: "生命值提升" },
  { value: "stat_speed", label: "速度提升" },
];

const CONDITION_TYPE_OPTIONS = [
  { value: "kill_count", label: "擊殺怪物數量" },
  { value: "kill_specific", label: "擊殺特定怪物" },
  { value: "explore_count", label: "探索節點數量" },
  { value: "explore_specific", label: "探索特定節點" },
  { value: "level_reach", label: "等級達到" },
  { value: "collect_item", label: "收集道具" },
  { value: "equip_quality", label: "裝備品質達到" },
  { value: "skill_learn", label: "學習技能數量" },
  { value: "craft_count", label: "製作次數" },
  { value: "pvp_win", label: "PVP勝利次數" },
  { value: "pvp_total", label: "PVP總場次" },
  { value: "oracle_count", label: "擲筊次數" },
  { value: "gold_earn", label: "累計獲得金幣" },
  { value: "login_days", label: "累計登入天數" },
  { value: "hp_below", label: "HP低於百分比" },
  { value: "wuxing_match", label: "五行屬性匹配" },
];

const EFFECT_TYPE_OPTIONS = [
  { value: "damage", label: "造成傷害" },
  { value: "heal", label: "回復HP" },
  { value: "buff_attack", label: "增加攻擊力" },
  { value: "buff_defense", label: "增加防禦力" },
  { value: "buff_speed", label: "增加速度" },
  { value: "debuff_attack", label: "降低攻擊力" },
  { value: "debuff_defense", label: "降低防禦力" },
  { value: "debuff_speed", label: "降低速度" },
  { value: "burn", label: "灼燒（持續傷害）" },
  { value: "poison", label: "中毒（持續傷害）" },
  { value: "stun", label: "暈眩（跳過回合）" },
  { value: "shield", label: "護盾（吸收傷害）" },
  { value: "drain", label: "吸血（傷害轉HP）" },
  { value: "reflect", label: "反射（反彈傷害）" },
];

const AI_CONDITION_OPTIONS = [
  { value: "always", label: "每回合都嘗試" },
  { value: "hpBelow", label: "HP低於百分比時" },
  { value: "hpAbove", label: "HP高於百分比時" },
  { value: "firstTurn", label: "第一回合" },
  { value: "enemyWeak", label: "敵人屬性被剋時" },
  { value: "random", label: "隨機觸發" },
];

const WUXING_OPTIONS = [
  { value: "木", label: "🌿 木" },
  { value: "火", label: "🔥 火" },
  { value: "土", label: "🪨 土" },
  { value: "金", label: "⚔️ 金" },
  { value: "水", label: "💧 水" },
];

// ═══════════════════════════════════════════════════════════
// 1. 獎勵內容編輯器（最多5筆）
// ═══════════════════════════════════════════════════════════

type RewardEntry = {
  type: string;
  value: number;
  itemId?: string;
  description?: string;
};

type RewardEditorProps = {
  value: RewardEntry[];
  onChange: (v: RewardEntry[]) => void;
  maxItems?: number;
  itemOptions?: { value: string; label: string }[];
  label?: string;
};

export function RewardEditor({ value, onChange, maxItems = 5, itemOptions = [], label = "獎勵內容" }: RewardEditorProps) {
  const items = Array.isArray(value) ? value : [];

  const addItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, { type: "coins", value: 100 }]);
  };

  const updateItem = (idx: number, field: string, val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const needsItemId = (type: string) => ["item", "equipment", "skill"].includes(type);

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}（最多 {maxItems} 筆）</Label>
        {items.length < maxItems && (
          <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={addItem}>
            + 新增獎勵
          </Button>
        )}
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">尚未設定獎勵</p>}
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="space-y-1 min-w-[120px] flex-1">
            <Label className="text-[10px] text-muted-foreground">獎勵 {idx + 1} 類型</Label>
            <Select value={item.type} onValueChange={v => updateItem(idx, "type", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {REWARD_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">數值</Label>
            <Input type="number" value={item.value} onChange={e => updateItem(idx, "value", Number(e.target.value))} className="h-7 text-xs" />
          </div>
          {needsItemId(item.type) && itemOptions.length > 0 && (
            <div className="space-y-1 min-w-[140px] flex-1">
              <Label className="text-[10px] text-muted-foreground">指定道具/裝備</Label>
              <Select value={item.itemId ?? ""} onValueChange={v => updateItem(idx, "itemId", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {itemOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive shrink-0" onClick={() => removeItem(idx)}>
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. 條件編輯器（條件類型+條件值+條件參數）
// ═══════════════════════════════════════════════════════════

type ConditionEditorProps = {
  conditionType: string;
  conditionValue: number;
  conditionParams: Record<string, any>;
  onChange: (field: string, val: any) => void;
  monsterOptions?: { value: string; label: string }[];
  itemOptions?: { value: string; label: string }[];
  nodeOptions?: { value: string; label: string }[];
};

export function ConditionEditor({ conditionType, conditionValue, conditionParams, onChange, monsterOptions = [], itemOptions = [], nodeOptions = [] }: ConditionEditorProps) {
  const params = typeof conditionParams === "object" && conditionParams ? conditionParams : {};

  const updateParam = (key: string, val: any) => {
    onChange("conditionParams", { ...params, [key]: val });
  };

  const needsMonster = ["kill_specific"].includes(conditionType);
  const needsItem = ["collect_item"].includes(conditionType);
  const needsNode = ["explore_specific"].includes(conditionType);
  const needsWuxing = ["wuxing_match"].includes(conditionType);

  return (
    <div className="space-y-2 col-span-2">
      <Label className="text-xs font-medium">觸發條件</Label>
      <div className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
        <div className="space-y-1 min-w-[140px] flex-1">
          <Label className="text-[10px] text-muted-foreground">條件類型</Label>
          <Select value={conditionType} onValueChange={v => onChange("conditionType", v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇條件" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {CONDITION_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-24">
          <Label className="text-[10px] text-muted-foreground">目標值</Label>
          <Input type="number" value={conditionValue} onChange={e => onChange("conditionValue", Number(e.target.value))} className="h-7 text-xs" />
        </div>
        {needsMonster && monsterOptions.length > 0 && (
          <div className="space-y-1 min-w-[140px] flex-1">
            <Label className="text-[10px] text-muted-foreground">指定怪物</Label>
            <Select value={params.monsterId ?? ""} onValueChange={v => updateParam("monsterId", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇怪物" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {monsterOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {needsItem && itemOptions.length > 0 && (
          <div className="space-y-1 min-w-[140px] flex-1">
            <Label className="text-[10px] text-muted-foreground">指定道具</Label>
            <Select value={params.itemId ?? ""} onValueChange={v => updateParam("itemId", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇道具" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {itemOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {needsNode && (
          <div className="space-y-1 min-w-[140px] flex-1">
            <Label className="text-[10px] text-muted-foreground">指定節點</Label>
            {nodeOptions.length > 0 ? (
              <Select value={params.nodeId ?? ""} onValueChange={v => updateParam("nodeId", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇節點" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {nodeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={params.nodeId ?? ""} onChange={e => updateParam("nodeId", e.target.value)} placeholder="節點ID" className="h-7 text-xs" />
            )}
          </div>
        )}
        {needsWuxing && (
          <div className="space-y-1 min-w-[100px]">
            <Label className="text-[10px] text-muted-foreground">五行屬性</Label>
            <Select value={params.wuxing ?? ""} onValueChange={v => updateParam("wuxing", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇" /></SelectTrigger>
              <SelectContent>
                {WUXING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3. 技能效果編輯器（附加效果/AI條件）
// ═══════════════════════════════════════════════════════════

type SkillEffectEntry = {
  type: string;
  chance: number;
  duration?: number;
  value?: number;
};

type SkillEffectEditorProps = {
  value: SkillEffectEntry | null;
  onChange: (v: SkillEffectEntry | null) => void;
  label?: string;
};

export function SkillEffectEditor({ value, onChange, label = "附加效果" }: SkillEffectEditorProps) {
  const hasEffect = value !== null && typeof value === "object";

  const toggleEffect = () => {
    if (hasEffect) onChange(null);
    else onChange({ type: "burn", chance: 20, duration: 3, value: 5 });
  };

  const update = (field: string, val: any) => {
    if (!value) return;
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={toggleEffect}>
          {hasEffect ? "移除效果" : "+ 新增效果"}
        </Button>
      </div>
      {hasEffect && value && (
        <div className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="space-y-1 min-w-[120px] flex-1">
            <Label className="text-[10px] text-muted-foreground">效果類型</Label>
            <Select value={value.type} onValueChange={v => update("type", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {EFFECT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">觸發率%</Label>
            <Input type="number" value={value.chance} onChange={e => update("chance", Number(e.target.value))} className="h-7 text-xs" min={0} max={100} />
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">持續回合</Label>
            <Input type="number" value={value.duration ?? 0} onChange={e => update("duration", Number(e.target.value))} className="h-7 text-xs" min={0} />
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">數值</Label>
            <Input type="number" value={value.value ?? 0} onChange={e => update("value", Number(e.target.value))} className="h-7 text-xs" />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 4. AI 觸發條件編輯器
// ═══════════════════════════════════════════════════════════

type AiConditionEntry = {
  condition: string;
  threshold?: number;
  priority: number;
};

type AiConditionEditorProps = {
  value: AiConditionEntry | null;
  onChange: (v: AiConditionEntry | null) => void;
  label?: string;
};

export function AiConditionEditor({ value, onChange, label = "AI觸發條件" }: AiConditionEditorProps) {
  const hasCondition = value !== null && typeof value === "object";

  const toggle = () => {
    if (hasCondition) onChange(null);
    else onChange({ condition: "always", priority: 1 });
  };

  const update = (field: string, val: any) => {
    if (!value) return;
    onChange({ ...value, [field]: val });
  };

  const needsThreshold = value?.condition === "hpBelow" || value?.condition === "hpAbove";

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={toggle}>
          {hasCondition ? "移除條件" : "+ 設定條件"}
        </Button>
      </div>
      {hasCondition && value && (
        <div className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="space-y-1 min-w-[120px] flex-1">
            <Label className="text-[10px] text-muted-foreground">觸發時機</Label>
            <Select value={value.condition} onValueChange={v => update("condition", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_CONDITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {needsThreshold && (
            <div className="space-y-1 w-24">
              <Label className="text-[10px] text-muted-foreground">HP門檻%</Label>
              <Input type="number" value={value.threshold ?? 30} onChange={e => update("threshold", Number(e.target.value))} className="h-7 text-xs" min={0} max={100} />
            </div>
          )}
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">優先度</Label>
            <Input type="number" value={value.priority} onChange={e => update("priority", Number(e.target.value))} className="h-7 text-xs" min={1} max={10} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 5. 五行抗性編輯器
// ═══════════════════════════════════════════════════════════

type ResistValues = { wood: number; fire: number; earth: number; metal: number; water: number };

type ResistEditorProps = {
  value: ResistValues;
  onChange: (v: ResistValues) => void;
  label?: string;
};

export function ResistEditor({ value, onChange, label = "五行抗性加成" }: ResistEditorProps) {
  const v = typeof value === "object" && value ? value : { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  const update = (key: keyof ResistValues, val: number) => {
    onChange({ ...v, [key]: val });
  };

  const entries: { key: keyof ResistValues; icon: string; label: string }[] = [
    { key: "wood", icon: "🌿", label: "木" },
    { key: "fire", icon: "🔥", label: "火" },
    { key: "earth", icon: "🪨", label: "土" },
    { key: "metal", icon: "⚔️", label: "金" },
    { key: "water", icon: "💧", label: "水" },
  ];

  return (
    <div className="space-y-2 col-span-2">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="grid grid-cols-5 gap-2 p-2 rounded-md border bg-muted/20">
        {entries.map(e => (
          <div key={e.key} className="space-y-1 text-center">
            <Label className="text-[10px] text-muted-foreground">{e.icon} {e.label}</Label>
            <Input type="number" value={v[e.key]} onChange={ev => update(e.key, Number(ev.target.value))} className="h-7 text-xs text-center" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 6. 裝備詞條編輯器（最多5條）
// ═══════════════════════════════════════════════════════════

type AffixEntry = {
  name: string;
  type: string;
  value: number;
  description?: string;
};

type AffixEditorProps = {
  affixes: (AffixEntry | null)[];
  onChange: (affixes: (AffixEntry | null)[]) => void;
  maxSlots?: number;
  label?: string;
};

export function AffixEditor({ affixes, onChange, maxSlots = 5, label = "裝備詞條" }: AffixEditorProps) {
  const slots = Array.from({ length: maxSlots }, (_, i) => affixes[i] ?? null);

  const AFFIX_NAME_OPTIONS = [
    { value: "鋒利", label: "鋒利" }, { value: "堅固", label: "堅固" },
    { value: "迅捷", label: "迅捷" }, { value: "精準", label: "精準" },
    { value: "強韌", label: "強韌" }, { value: "靈動", label: "靈動" },
    { value: "破甲", label: "破甲" }, { value: "吸血", label: "吸血" },
    { value: "反擊", label: "反擊" }, { value: "護盾", label: "護盾" },
    { value: "五行共鳴", label: "五行共鳴" }, { value: "天命加護", label: "天命加護" },
  ];

  const toggleSlot = (idx: number) => {
    const next = [...slots];
    if (next[idx]) {
      next[idx] = null;
    } else {
      next[idx] = { name: "鋒利", type: "attack", value: 5 };
    }
    onChange(next);
  };

  const updateSlot = (idx: number, field: string, val: any) => {
    const next = [...slots];
    if (!next[idx]) return;
    next[idx] = { ...next[idx]!, [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2 col-span-2">
      <Label className="text-xs font-medium">{label}（最多 {maxSlots} 條）</Label>
      {slots.map((slot, idx) => (
        <div key={idx} className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground font-medium w-16 shrink-0">詞條 {idx + 1}</span>
            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs ml-auto" onClick={() => toggleSlot(idx)}>
              {slot ? "移除" : "+ 啟用"}
            </Button>
          </div>
          {slot && (
            <div className="flex flex-wrap gap-2 w-full">
              <div className="space-y-1 min-w-[100px] flex-1">
                <Label className="text-[10px] text-muted-foreground">詞條名稱</Label>
                <Select value={slot.name} onValueChange={v => updateSlot(idx, "name", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {AFFIX_NAME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[100px] flex-1">
                <Label className="text-[10px] text-muted-foreground">加成屬性</Label>
                <Select value={slot.type} onValueChange={v => updateSlot(idx, "type", v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {STAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-20">
                <Label className="text-[10px] text-muted-foreground">數值</Label>
                <Input type="number" value={slot.value} onChange={e => updateSlot(idx, "value", Number(e.target.value))} className="h-7 text-xs" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 7. 製作材料編輯器
// ═══════════════════════════════════════════════════════════

type MaterialEntry = {
  itemId: string;
  name?: string;
  quantity: number;
};

type MaterialEditorProps = {
  value: MaterialEntry[];
  onChange: (v: MaterialEntry[]) => void;
  itemOptions: { value: string; label: string }[];
  maxItems?: number;
  label?: string;
};

export function MaterialEditor({ value, onChange, itemOptions, maxItems = 8, label = "製作材料" }: MaterialEditorProps) {
  const items = Array.isArray(value) ? value : [];

  const addItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, { itemId: "", quantity: 1 }]);
  };

  const updateItem = (idx: number, field: string, val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    if (field === "itemId") {
      const opt = itemOptions.find(o => o.value === val);
      if (opt) next[idx].name = opt.label.split(" ").pop() ?? val;
    }
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}（最多 {maxItems} 種）</Label>
        {items.length < maxItems && (
          <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={addItem}>+ 新增材料</Button>
        )}
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">尚未設定材料</p>}
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="space-y-1 min-w-[140px] flex-1">
            <Label className="text-[10px] text-muted-foreground">材料 {idx + 1}</Label>
            <Select value={item.itemId} onValueChange={v => updateItem(idx, "itemId", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇道具" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {itemOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">數量</Label>
            <Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} className="h-7 text-xs" min={1} />
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive shrink-0" onClick={() => removeItem(idx)}>✕</Button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 8. 使用效果編輯器（道具）
// ═══════════════════════════════════════════════════════════

const USE_EFFECT_TYPE_OPTIONS = [
  { value: "heal", label: "回復HP" },
  { value: "healPercent", label: "回復HP（百分比）" },
  { value: "restoreStamina", label: "回復體力" },
  { value: "buff_attack", label: "暫時增加攻擊" },
  { value: "buff_defense", label: "暫時增加防禦" },
  { value: "buff_speed", label: "暫時增加速度" },
  { value: "exp_boost", label: "經驗加成" },
  { value: "teleport", label: "傳送" },
  { value: "revive", label: "復活" },
  { value: "learn_skill", label: "學習技能" },
  { value: "none", label: "無效果（素材）" },
];

type UseEffectEntry = {
  type: string;
  value: number;
  duration?: number;
  description?: string;
};

type UseEffectEditorProps = {
  value: UseEffectEntry | null;
  onChange: (v: UseEffectEntry | null) => void;
  label?: string;
};

export function UseEffectEditor({ value, onChange, label = "使用效果" }: UseEffectEditorProps) {
  const hasEffect = value !== null && typeof value === "object";

  const toggle = () => {
    if (hasEffect) onChange(null);
    else onChange({ type: "heal", value: 50, description: "回復50HP" });
  };

  const update = (field: string, val: any) => {
    if (!value) return;
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={toggle}>
          {hasEffect ? "移除效果" : "+ 設定效果"}
        </Button>
      </div>
      {hasEffect && value && (
        <div className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="space-y-1 min-w-[120px] flex-1">
            <Label className="text-[10px] text-muted-foreground">效果類型</Label>
            <Select value={value.type} onValueChange={v => update("type", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {USE_EFFECT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">數值</Label>
            <Input type="number" value={value.value} onChange={e => update("value", Number(e.target.value))} className="h-7 text-xs" />
          </div>
          <div className="space-y-1 w-24">
            <Label className="text-[10px] text-muted-foreground">持續(秒)</Label>
            <Input type="number" value={value.duration ?? 0} onChange={e => update("duration", Number(e.target.value))} className="h-7 text-xs" />
          </div>
          <div className="space-y-1 min-w-[120px] flex-1">
            <Label className="text-[10px] text-muted-foreground">效果說明</Label>
            <Input value={value.description ?? ""} onChange={e => update("description", e.target.value)} placeholder="如：回復50HP" className="h-7 text-xs" />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 9. 採集地點編輯器
// ═══════════════════════════════════════════════════════════

type GatherEntry = {
  nodeId: string;
  nodeName: string;
  rate: number;
};

type GatherEditorProps = {
  value: GatherEntry[];
  onChange: (v: GatherEntry[]) => void;
  maxItems?: number;
  label?: string;
};

export function GatherEditor({ value, onChange, maxItems = 5, label = "採集地點" }: GatherEditorProps) {
  const items = Array.isArray(value) ? value : [];

  const NODE_OPTIONS = [
    { id: "n1", name: "翠竹林" }, { id: "n2", name: "赤焰山" },
    { id: "n3", name: "黃土高原" }, { id: "n4", name: "白金礦脈" },
    { id: "n5", name: "碧水潭" }, { id: "n6", name: "靈峰頂" },
    { id: "n7", name: "幽暗森林" }, { id: "n8", name: "古戰場" },
    { id: "n9", name: "龍脈洞窟" }, { id: "n10", name: "天命祭壇" },
  ];

  const addItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, { nodeId: "n1", nodeName: "翠竹林", rate: 30 }]);
  };

  const updateItem = (idx: number, nodeId: string) => {
    const next = [...items];
    const node = NODE_OPTIONS.find(n => n.id === nodeId);
    next[idx] = { ...next[idx], nodeId, nodeName: node?.name ?? nodeId };
    onChange(next);
  };

  const updateRate = (idx: number, rate: number) => {
    const next = [...items];
    next[idx] = { ...next[idx], rate };
    onChange(next);
  };

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}（最多 {maxItems} 處）</Label>
        {items.length < maxItems && (
          <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={addItem}>+ 新增地點</Button>
        )}
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">尚未設定採集地點</p>}
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="space-y-1 min-w-[120px] flex-1">
            <Label className="text-[10px] text-muted-foreground">地點 {idx + 1}</Label>
            <Select value={item.nodeId} onValueChange={v => updateItem(idx, v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {NODE_OPTIONS.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-[10px] text-muted-foreground">採集率%</Label>
            <Input type="number" value={item.rate} onChange={e => updateRate(idx, Number(e.target.value))} className="h-7 text-xs" min={0} max={100} />
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive shrink-0" onClick={() => removeItem(idx)}>✕</Button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 10. 隱藏觸發條件編輯器（最多3個）
// ═══════════════════════════════════════════════════════════

type HiddenTriggerEntry = {
  type: string;
  description: string;
};

const HIDDEN_TRIGGER_OPTIONS = [
  { value: "kill_boss", label: "擊敗特定Boss" },
  { value: "explore_secret", label: "探索隱藏區域" },
  { value: "collect_set", label: "集齊套裝" },
  { value: "oracle_special", label: "擲筊特殊結果" },
  { value: "level_milestone", label: "等級里程碑" },
  { value: "pvp_streak", label: "PVP連勝" },
  { value: "time_event", label: "限時事件" },
  { value: "npc_quest", label: "NPC任務" },
  { value: "custom", label: "自訂條件" },
];

type HiddenTriggerEditorProps = {
  value: string | HiddenTriggerEntry[];
  onChange: (v: HiddenTriggerEntry[]) => void;
  maxItems?: number;
  label?: string;
};

export function HiddenTriggerEditor({ value, onChange, maxItems = 3, label = "隱藏觸發條件" }: HiddenTriggerEditorProps) {
  // 相容舊的字串格式
  const items: HiddenTriggerEntry[] = Array.isArray(value) ? value
    : typeof value === "string" && value ? [{ type: "custom", description: value }]
    : [];

  const addItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, { type: "kill_boss", description: "" }]);
  };

  const updateItem = (idx: number, field: string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}（最多 {maxItems} 個）</Label>
        {items.length < maxItems && (
          <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={addItem}>+ 新增條件</Button>
        )}
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">尚未設定隱藏條件</p>}
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-wrap gap-2 items-end p-2 rounded-md border bg-muted/20">
          <div className="space-y-1 min-w-[120px] flex-1">
            <Label className="text-[10px] text-muted-foreground">條件 {idx + 1} 類型</Label>
            <Select value={item.type} onValueChange={v => updateItem(idx, "type", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {HIDDEN_TRIGGER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[140px] flex-1">
            <Label className="text-[10px] text-muted-foreground">說明</Label>
            <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="描述觸發條件..." className="h-7 text-xs" />
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive shrink-0" onClick={() => removeItem(idx)}>✕</Button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 11. 出沒節點編輯器（怪物）
// ═══════════════════════════════════════════════════════════

type SpawnNodeEditorProps = {
  value: string[];
  onChange: (v: string[]) => void;
  maxItems?: number;
  label?: string;
};

export function SpawnNodeEditor({ value, onChange, maxItems = 5, label = "出沒節點" }: SpawnNodeEditorProps) {
  const items = Array.isArray(value) ? value : [];

  const NODE_LIST = [
    "翠竹林", "赤焰山", "黃土高原", "白金礦脈", "碧水潭",
    "靈峰頂", "幽暗森林", "古戰場", "龍脈洞窟", "天命祭壇",
    "迷霧沼澤", "星辰塔", "冰晶谷",
  ];

  const addItem = () => {
    if (items.length >= maxItems) return;
    const available = NODE_LIST.filter(n => !items.includes(n));
    onChange([...items, available[0] ?? "新節點"]);
  };

  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  };

  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2 col-span-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}（最多 {maxItems} 處）</Label>
        {items.length < maxItems && (
          <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={addItem}>+ 新增節點</Button>
        )}
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">尚未設定出沒節點</p>}
      <div className="flex flex-wrap gap-2">
        {items.map((node, idx) => (
          <div key={idx} className="flex items-center gap-1 p-1 rounded border bg-muted/20">
            <Select value={node} onValueChange={v => updateItem(idx, v)}>
              <SelectTrigger className="h-7 text-xs border-0 bg-transparent w-auto min-w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {NODE_LIST.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0 text-xs text-destructive" onClick={() => removeItem(idx)}>✕</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
