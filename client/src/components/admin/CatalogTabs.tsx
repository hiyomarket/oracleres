/**
 * 六大圖鑑管理 Tab 組件
 * MonsterCatalogV2Tab / ItemCatalogV2Tab / EquipCatalogV2Tab / SkillCatalogV2Tab / AchievementCatalogTab / MonsterSkillCatalogTab
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CatalogFormDialog, { type FieldDef } from "./CatalogFormDialog";

const WUXING_OPTS = [
  { value: "木", label: "🌿 木" },
  { value: "火", label: "🔥 火" },
  { value: "土", label: "🪨 土" },
  { value: "金", label: "⚔️ 金" },
  { value: "水", label: "💧 水" },
];

const RARITY_OPTS = [
  { value: "common", label: "普通" },
  { value: "rare", label: "稀有" },
  { value: "epic", label: "史詩" },
  { value: "legendary", label: "傳說" },
];

const WUXING_FILTER = [{ value: "", label: "全部" }, ...WUXING_OPTS];

// ════════════════════════════════════════════════════════════════
// 1. 魔物圖鑑 V2
// ════════════════════════════════════════════════════════════════
export function MonsterCatalogV2Tab() {
  // using sonner toast directly
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.gameCatalog.getMonsterCatalog.useQuery({
    search: search || undefined, wuxing: wuxing || undefined, page: 1, pageSize: 200,
  });
  const { data: monsterSkills } = trpc.gameCatalog.getAllMonsterSkills.useQuery();
  const { data: allItems } = trpc.gameCatalog.getAllItems.useQuery();

  const createMut = trpc.gameCatalog.createMonsterCatalog.useMutation({
    onSuccess: (r) => { toast.success(`✅ 建立成功 (${r.monsterId})`); setFormOpen(false); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const updateMut = trpc.gameCatalog.updateMonsterCatalog.useMutation({
    onSuccess: () => { toast.success("✅ 更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteMut = trpc.gameCatalog.deleteMonsterCatalog.useMutation({
    onSuccess: () => { toast.success("🗑️ 已刪除"); refetch(); },
  });

  const skillOpts = (monsterSkills ?? []).map((s: any) => ({ value: s.monsterSkillId, label: `${s.monsterSkillId} ${s.name}（${s.wuxing}）` }));
  const itemOpts = (allItems ?? []).map((i: any) => ({ value: i.itemId, label: `${i.itemId} ${i.name}（${i.wuxing}）` }));

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true, placeholder: "輸入怪物名稱" },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS },
    { key: "levelRange", label: "等級範圍", type: "text", defaultValue: "1-5", placeholder: "如 1-5" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "baseHp", label: "HP", type: "number", defaultValue: 100, group: "基礎屬性" },
    { key: "baseAttack", label: "攻擊", type: "number", defaultValue: 10, group: "基礎屬性" },
    { key: "baseDefense", label: "防禦", type: "number", defaultValue: 5, group: "基礎屬性" },
    { key: "baseSpeed", label: "速度", type: "number", defaultValue: 5, group: "基礎屬性" },
    { key: "baseAccuracy", label: "命中力", type: "number", defaultValue: 80, group: "基礎屬性" },
    { key: "baseMagicAttack", label: "魔法攻擊", type: "number", defaultValue: 8, group: "基礎屬性" },
    { key: "resistWood", label: "抗木%", type: "number", defaultValue: 0, group: "抗性" },
    { key: "resistFire", label: "抗火%", type: "number", defaultValue: 0, group: "抗性" },
    { key: "resistEarth", label: "抗土%", type: "number", defaultValue: 0, group: "抗性" },
    { key: "resistMetal", label: "抗金%", type: "number", defaultValue: 0, group: "抗性" },
    { key: "resistWater", label: "抗水%", type: "number", defaultValue: 0, group: "抗性" },
    { key: "counterBonus", label: "被剋制加成%", type: "number", defaultValue: 50, group: "抗性" },
    { key: "skillId1", label: "技能1", type: "linkedSelect", linkedOptions: skillOpts, defaultValue: "", group: "魔物技能" },
    { key: "skillId2", label: "技能2", type: "linkedSelect", linkedOptions: skillOpts, defaultValue: "", group: "魔物技能" },
    { key: "skillId3", label: "技能3", type: "linkedSelect", linkedOptions: skillOpts, defaultValue: "", group: "魔物技能" },
    { key: "aiLevel", label: "AI等級 (1-4)", type: "number", defaultValue: 1, min: 1, max: 4, group: "魔物技能" },
    { key: "growthRate", label: "成長率", type: "number", defaultValue: 1.0, step: 0.01, group: "魔物技能" },
    { key: "dropItem1", label: "掉落物1", type: "linkedSelect", linkedOptions: itemOpts, defaultValue: "", group: "掉落系統" },
    { key: "dropRate1", label: "掉落率1%", type: "number", defaultValue: 0, group: "掉落系統" },
    { key: "dropItem2", label: "掉落物2", type: "linkedSelect", linkedOptions: itemOpts, defaultValue: "", group: "掉落系統" },
    { key: "dropRate2", label: "掉落率2%", type: "number", defaultValue: 0, group: "掉落系統" },
    { key: "dropItem3", label: "掉落物3", type: "linkedSelect", linkedOptions: itemOpts, defaultValue: "", group: "掉落系統" },
    { key: "dropRate3", label: "掉落率3%", type: "number", defaultValue: 0, group: "掉落系統" },
    { key: "dropItem4", label: "掉落物4", type: "linkedSelect", linkedOptions: itemOpts, defaultValue: "", group: "掉落系統" },
    { key: "dropRate4", label: "掉落率4%", type: "number", defaultValue: 0, group: "掉落系統" },
    { key: "dropItem5", label: "掉落物5", type: "linkedSelect", linkedOptions: itemOpts, defaultValue: "", group: "掉落系統" },
    { key: "dropRate5", label: "掉落率5%", type: "number", defaultValue: 0, group: "掉落系統" },
    { key: "dropGold", label: "掉落金幣 {min,max}", type: "json", defaultValue: { min: 5, max: 15 }, group: "掉落系統", placeholder: '{"min":5,"max":15}' },
    { key: "legendaryDrop", label: "傳說掉落", type: "linkedSelect", linkedOptions: itemOpts, defaultValue: "", group: "掉落系統" },
    { key: "legendaryDropRate", label: "傳說掉落率%", type: "number", defaultValue: 0, group: "掉落系統" },
    { key: "spawnNodes", label: "出沒節點 (JSON陣列)", type: "json", defaultValue: [], group: "其他", placeholder: '["node_1","node_2"]' },
    { key: "destinyClue", label: "天命線索", type: "textarea", group: "其他" },
    { key: "imageUrl", label: "圖片URL", type: "text", group: "其他" },
    { key: "catchRate", label: "捕獲率 (0-1)", type: "number", defaultValue: 0.1, step: 0.01, min: 0, max: 1, group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const handleSubmit = (data: any) => {
    // Clean linkedSelect "__none__" values
    for (const k of Object.keys(data)) {
      if (data[k] === "__none__") data[k] = "";
    }
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) {
      updateMut.mutate({ id: editItem.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">🐉 魔物圖鑑（{data?.total ?? 0}）</h2>
          <p className="text-xs text-muted-foreground">新增時自動生成 ID（如 M_W001）</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增魔物</Button>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {WUXING_FILTER.map(w => (
            <button key={w.value} onClick={() => setWuxing(w.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${wuxing === w.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {w.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)} className="w-40 h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
          {search && <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>清除</Button>}
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">等級</th>
                <th className="text-left py-2 px-2">HP</th>
                <th className="text-left py-2 px-2">攻</th>
                <th className="text-left py-2 px-2">防</th>
                <th className="text-left py-2 px-2">速</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.monsterId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td>
                  <td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.levelRange}</td>
                  <td className="py-2 px-2">{m.baseHp}</td>
                  <td className="py-2 px-2">{m.baseAttack}</td>
                  <td className="py-2 px-2">{m.baseDefense}</td>
                  <td className="py-2 px-2">{m.baseSpeed}</td>
                  <td className="py-2 px-2 text-xs">{m.rarity}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CatalogFormDialog
        open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }}
        title={editItem ? `編輯魔物：${editItem.name}` : "新增魔物"}
        fields={fields} initialData={editItem}
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 2. 道具圖鑑 V2
// ════════════════════════════════════════════════════════════════
const ITEM_CAT_OPTS = [
  { value: "material_basic", label: "基礎素材" },
  { value: "material_drop", label: "怪物掉落" },
  { value: "consumable", label: "消耗品" },
  { value: "quest", label: "任務道具" },
  { value: "treasure", label: "珍寶天命" },
  { value: "skillbook", label: "技能書" },
  { value: "equipment_material", label: "裝備材料" },
];

export function ItemCatalogV2Tab() {
  // using sonner toast directly
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.gameCatalog.getItemCatalog.useQuery({
    search: search || undefined, wuxing: wuxing || undefined, page: 1, pageSize: 200,
  });
  const { data: allMonsters } = trpc.gameCatalog.getAllMonsters.useQuery();

  const createMut = trpc.gameCatalog.createItemCatalog.useMutation({
    onSuccess: (r) => { toast.success(`✅ 建立成功 (${r.itemId})`); setFormOpen(false); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const updateMut = trpc.gameCatalog.updateItemCatalog.useMutation({
    onSuccess: () => { toast.success("✅ 更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteMut = trpc.gameCatalog.deleteItemCatalog.useMutation({
    onSuccess: () => { toast.success("🗑️ 已刪除"); refetch(); },
  });

  const monsterOpts = (allMonsters ?? []).map((m: any) => ({ value: m.monsterId, label: `${m.monsterId} ${m.name}（${m.wuxing}）` }));

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS },
    { key: "category", label: "分類", type: "select", options: ITEM_CAT_OPTS, defaultValue: "material_basic" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "stackLimit", label: "疊加上限", type: "number", defaultValue: 99 },
    { key: "shopPrice", label: "商店售價", type: "number", defaultValue: 0, group: "商店分配" },
    { key: "inNormalShop", label: "一般商店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "inSpiritShop", label: "靈相商店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "inSecretShop", label: "密店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "isMonsterDrop", label: "怪物掉落", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "掉落來源" },
    { key: "dropMonsterId", label: "掉落怪物", type: "linkedSelect", linkedOptions: monsterOpts, defaultValue: "", group: "掉落來源" },
    { key: "dropRate", label: "掉落率%", type: "number", defaultValue: 0, group: "掉落來源" },
    { key: "gatherLocations", label: "採集地點", type: "json", defaultValue: [], group: "採集", placeholder: '[{"nodeId":"n1","nodeName":"翠竹林","rate":30}]' },
    { key: "useEffect", label: "使用效果", type: "json", defaultValue: null, group: "效果", placeholder: '{"type":"heal","value":50,"description":"回復50HP"}' },
    { key: "source", label: "來源說明", type: "text", group: "其他" },
    { key: "effect", label: "效果說明", type: "textarea", group: "其他" },
    { key: "imageUrl", label: "圖片URL", type: "text", group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    ["inNormalShop", "inSpiritShop", "inSecretShop", "isMonsterDrop", "isActive"].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">🎒 道具圖鑑（{data?.total ?? 0}）</h2>
          <p className="text-xs text-muted-foreground">自動生成 ID（如 I_W001）</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增道具</Button>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {WUXING_FILTER.map(w => (
            <button key={w.value} onClick={() => setWuxing(w.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${wuxing === w.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {w.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setSearch(searchInput)} className="w-40 h-8 text-xs" />
          <Button size="sm" variant="outline" onClick={() => setSearch(searchInput)}>搜尋</Button>
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">分類</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">售價</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.itemId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td>
                  <td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.category}</td>
                  <td className="py-2 px-2 text-xs">{m.rarity}</td>
                  <td className="py-2 px-2">{m.shopPrice}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }}
        title={editItem ? `編輯道具：${editItem.name}` : "新增道具"} fields={fields} initialData={editItem}
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 3. 裝備圖鑑 V2
// ════════════════════════════════════════════════════════════════
const SLOT_OPTS = [
  { value: "weapon", label: "武器" }, { value: "helmet", label: "頭盔" },
  { value: "armor", label: "護甲" }, { value: "shoes", label: "鞋子" },
  { value: "accessory", label: "飾品" }, { value: "offhand", label: "副手" },
];
const QUALITY_OPTS = [
  { value: "white", label: "⬜ 白" }, { value: "green", label: "🟩 綠" },
  { value: "blue", label: "🟦 藍" }, { value: "purple", label: "🟪 紫" },
  { value: "orange", label: "🟧 橙" }, { value: "red", label: "🟥 紅" },
];

export function EquipCatalogV2Tab() {
  // using sonner toast directly
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.gameCatalog.getEquipCatalog.useQuery({ page: 1, pageSize: 200 });
  const { data: allItems } = trpc.gameCatalog.getAllItems.useQuery();

  const createMut = trpc.gameCatalog.createEquipCatalog.useMutation({
    onSuccess: (r) => { toast.success(`✅ 建立成功 (${r.equipId})`); setFormOpen(false); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const updateMut = trpc.gameCatalog.updateEquipCatalog.useMutation({
    onSuccess: () => { toast.success("✅ 更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteMut = trpc.gameCatalog.deleteEquipCatalog.useMutation({
    onSuccess: () => { toast.success("🗑️ 已刪除"); refetch(); },
  });

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS },
    { key: "slot", label: "部位", type: "select", options: SLOT_OPTS, defaultValue: "weapon" },
    { key: "quality", label: "品質", type: "select", options: QUALITY_OPTS, defaultValue: "white" },
    { key: "tier", label: "階級", type: "text", defaultValue: "初階" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "levelRequired", label: "需求等級", type: "number", defaultValue: 1, group: "需求" },
    { key: "hpBonus", label: "HP加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "attackBonus", label: "攻擊加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "defenseBonus", label: "防禦加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "speedBonus", label: "速度加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "resistBonus", label: "抗性加成", type: "json", defaultValue: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }, group: "屬性加成", placeholder: '{"wood":0,"fire":0,"earth":0,"metal":0,"water":0}' },
    { key: "affix1", label: "詞條1", type: "json", defaultValue: null, group: "詞條", placeholder: '{"name":"鋒利","type":"attack","value":5,"description":"+5攻擊"}' },
    { key: "affix2", label: "詞條2", type: "json", defaultValue: null, group: "詞條" },
    { key: "affix3", label: "詞條3", type: "json", defaultValue: null, group: "詞條" },
    { key: "affix4", label: "詞條4", type: "json", defaultValue: null, group: "詞條" },
    { key: "affix5", label: "詞條5", type: "json", defaultValue: null, group: "詞條" },
    { key: "craftMaterialsList", label: "製作材料", type: "json", defaultValue: [], group: "製作", placeholder: '[{"itemId":"I_W001","name":"翠竹","quantity":5}]' },
    { key: "setId", label: "套裝ID", type: "text", defaultValue: "", group: "製作" },
    { key: "specialEffect", label: "特殊效果", type: "textarea", group: "其他" },
    { key: "imageUrl", label: "圖片URL", type: "text", group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">⚔️ 裝備圖鑑（{data?.total ?? 0}）</h2>
          <p className="text-xs text-muted-foreground">自動生成 ID（如 E_W001）</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增裝備</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">部位</th>
                <th className="text-left py-2 px-2">品質</th>
                <th className="text-left py-2 px-2">攻擊</th>
                <th className="text-left py-2 px-2">防禦</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.equipId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td>
                  <td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.slot}</td>
                  <td className="py-2 px-2 text-xs">{m.quality}</td>
                  <td className="py-2 px-2">{m.attackBonus}</td>
                  <td className="py-2 px-2">{m.defenseBonus}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }}
        title={editItem ? `編輯裝備：${editItem.name}` : "新增裝備"} fields={fields} initialData={editItem}
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 4. 技能圖鑑 V2
// ════════════════════════════════════════════════════════════════
const SKILL_CAT_OPTS = [
  { value: "active_combat", label: "主動戰鬥" }, { value: "passive_combat", label: "被動戰鬥" },
  { value: "life_gather", label: "生活採集" }, { value: "craft_forge", label: "製作鍛造" },
];
const SKILL_TYPE_OPTS = [
  { value: "attack", label: "攻擊" }, { value: "heal", label: "治療" },
  { value: "buff", label: "增益" }, { value: "debuff", label: "減益" },
  { value: "passive", label: "被動" }, { value: "special", label: "特殊" },
];
const ACQUIRE_TYPE_OPTS = [
  { value: "shop", label: "商店" }, { value: "drop", label: "掉落" },
  { value: "quest", label: "任務" }, { value: "craft", label: "製作" },
  { value: "hidden", label: "隱藏" },
];

export function SkillCatalogV2Tab() {
  // using sonner toast directly
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.gameCatalog.getSkillCatalog.useQuery({ page: 1, pageSize: 200 });
  const { data: allMonsters } = trpc.gameCatalog.getAllMonsters.useQuery();

  const createMut = trpc.gameCatalog.createSkillCatalog.useMutation({
    onSuccess: (r) => { toast.success(`✅ 建立成功 (${r.skillId})`); setFormOpen(false); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const updateMut = trpc.gameCatalog.updateSkillCatalog.useMutation({
    onSuccess: () => { toast.success("✅ 更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteMut = trpc.gameCatalog.deleteSkillCatalog.useMutation({
    onSuccess: () => { toast.success("🗑️ 已刪除"); refetch(); },
  });

  const monsterOpts = (allMonsters ?? []).map((m: any) => ({ value: m.monsterId, label: `${m.monsterId} ${m.name}` }));

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS },
    { key: "category", label: "分類", type: "select", options: SKILL_CAT_OPTS, defaultValue: "active_combat" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "tier", label: "階級", type: "text", defaultValue: "初階" },
    { key: "skillType", label: "技能類型", type: "select", options: SKILL_TYPE_OPTS, defaultValue: "attack" },
    { key: "mpCost", label: "MP消耗", type: "number", defaultValue: 0, group: "數值" },
    { key: "cooldown", label: "冷卻(回合)", type: "number", defaultValue: 0, group: "數值" },
    { key: "powerPercent", label: "威力%", type: "number", defaultValue: 100, group: "數值" },
    { key: "learnLevel", label: "習得等級", type: "number", defaultValue: 1, group: "數值" },
    { key: "acquireType", label: "獲取方式", type: "select", options: ACQUIRE_TYPE_OPTS, defaultValue: "shop", group: "獲取" },
    { key: "shopPrice", label: "商店售價", type: "number", defaultValue: 0, group: "獲取" },
    { key: "dropMonsterId", label: "掉落怪物", type: "linkedSelect", linkedOptions: monsterOpts, defaultValue: "", group: "獲取" },
    { key: "hiddenTrigger", label: "隱藏觸發條件", type: "textarea", group: "獲取" },
    { key: "description", label: "效果說明", type: "textarea", group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">✨ 技能圖鑑（{data?.total ?? 0}）</h2>
          <p className="text-xs text-muted-foreground">自動生成 ID（如 S_W001）</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增技能</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">類型</th>
                <th className="text-left py-2 px-2">威力%</th>
                <th className="text-left py-2 px-2">MP</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.skillId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td>
                  <td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.skillType}</td>
                  <td className="py-2 px-2">{m.powerPercent}%</td>
                  <td className="py-2 px-2">{m.mpCost}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }}
        title={editItem ? `編輯技能：${editItem.name}` : "新增技能"} fields={fields} initialData={editItem}
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 5. 成就系統
// ════════════════════════════════════════════════════════════════
const ACH_CAT_OPTS = [
  { value: "avatar", label: "角色" }, { value: "explore", label: "探索" },
  { value: "combat", label: "戰鬥" }, { value: "oracle", label: "天命" },
  { value: "social", label: "社交" }, { value: "collection", label: "收集" },
];
const REWARD_TYPE_OPTS = [
  { value: "stones", label: "靈石" }, { value: "coins", label: "金幣" },
  { value: "title", label: "稱號" }, { value: "item", label: "道具" },
  { value: "frame", label: "邊框" }, { value: "skill", label: "技能" },
];

export function AchievementCatalogTab() {
  // using sonner toast directly
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.gameCatalog.getAchievementCatalog.useQuery({ page: 1, pageSize: 200 });

  const createMut = trpc.gameCatalog.createAchievement.useMutation({
    onSuccess: (r) => { toast.success(`✅ 建立成功 (${r.achId})`); setFormOpen(false); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const updateMut = trpc.gameCatalog.updateAchievementCatalog.useMutation({
    onSuccess: () => { toast.success("✅ 更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteMut = trpc.gameCatalog.deleteAchievementCatalog.useMutation({
    onSuccess: () => { toast.success("🗑️ 已刪除"); refetch(); },
  });

  const fields: FieldDef[] = [
    { key: "title", label: "名稱", type: "text", required: true },
    { key: "category", label: "分類", type: "select", required: true, options: ACH_CAT_OPTS },
    { key: "description", label: "說明", type: "textarea", required: true },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "conditionType", label: "條件類型", type: "text", required: true, placeholder: "如 kill_count, explore_count" },
    { key: "conditionValue", label: "條件值", type: "number", defaultValue: 1, group: "條件" },
    { key: "conditionParams", label: "條件參數", type: "json", defaultValue: {}, group: "條件", placeholder: '{"monsterId":"M_W001"}' },
    { key: "rewardType", label: "獎勵類型", type: "select", options: REWARD_TYPE_OPTS, group: "獎勵" },
    { key: "rewardAmount", label: "獎勵數量", type: "number", defaultValue: 0, group: "獎勵" },
    { key: "rewardContent", label: "獎勵內容", type: "json", defaultValue: [], group: "獎勵", placeholder: '[{"type":"item","itemId":"I_W001","amount":1}]' },
    { key: "titleReward", label: "稱號獎勵", type: "text", group: "獎勵" },
    { key: "glowEffect", label: "光效代碼", type: "text", group: "獎勵" },
    { key: "iconUrl", label: "徽章圖片", type: "text", group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const handleSubmit = (data: any) => {
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">🏆 成就系統（{data?.total ?? 0}）</h2>
          <p className="text-xs text-muted-foreground">自動生成 ID（如 ACH_001）</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增成就</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">分類</th>
                <th className="text-left py-2 px-2">稀有度</th>
                <th className="text-left py-2 px-2">獎勵</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.achId}</td>
                  <td className="py-2 px-2 font-medium">{m.title}</td>
                  <td className="py-2 px-2 text-xs">{m.category}</td>
                  <td className="py-2 px-2 text-xs">{m.rarity}</td>
                  <td className="py-2 px-2 text-xs">{m.rewardType} x{m.rewardAmount}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.title}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }}
        title={editItem ? `編輯成就：${editItem.title}` : "新增成就"} fields={fields} initialData={editItem}
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 6. 魔物技能圖鑑
// ════════════════════════════════════════════════════════════════
const MS_TYPE_OPTS = [
  { value: "attack", label: "攻擊" }, { value: "heal", label: "治療" },
  { value: "buff", label: "增益" }, { value: "debuff", label: "減益" },
  { value: "special", label: "特殊" }, { value: "passive", label: "被動" },
];

export function MonsterSkillCatalogTab() {
  // using sonner toast directly
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading, refetch } = trpc.gameCatalog.getMonsterSkillCatalog.useQuery({ page: 1, pageSize: 200 });

  const createMut = trpc.gameCatalog.createMonsterSkill.useMutation({
    onSuccess: (r) => { toast.success(`✅ 建立成功 (${r.monsterSkillId})`); setFormOpen(false); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const updateMut = trpc.gameCatalog.updateMonsterSkill.useMutation({
    onSuccess: () => { toast.success("✅ 更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(`❌ ${e.message}`),
  });
  const deleteMut = trpc.gameCatalog.deleteMonsterSkill.useMutation({
    onSuccess: () => { toast.success("🗑️ 已刪除"); refetch(); },
  });

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS },
    { key: "skillType", label: "類型", type: "select", options: MS_TYPE_OPTS, defaultValue: "attack" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "powerPercent", label: "威力%", type: "number", defaultValue: 100, group: "數值" },
    { key: "mpCost", label: "MP消耗", type: "number", defaultValue: 0, group: "數值" },
    { key: "cooldown", label: "冷卻(回合)", type: "number", defaultValue: 0, group: "數值" },
    { key: "accuracyMod", label: "命中修正%", type: "number", defaultValue: 100, group: "數值" },
    { key: "additionalEffect", label: "附加效果", type: "json", defaultValue: null, group: "效果", placeholder: '{"type":"burn","chance":20,"duration":3,"value":5}' },
    { key: "aiCondition", label: "AI觸發條件", type: "json", defaultValue: null, group: "效果", placeholder: '{"hpBelow":30,"priority":2}' },
    { key: "description", label: "說明", type: "textarea", group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const handleSubmit = (data: any) => {
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">🐲 魔物技能圖鑑（{data?.total ?? 0}）</h2>
          <p className="text-xs text-muted-foreground">自動生成 ID（如 SK_M001）</p>
        </div>
        <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增魔物技能</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">名稱</th>
                <th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">類型</th>
                <th className="text-left py-2 px-2">威力%</th>
                <th className="text-left py-2 px-2">MP</th>
                <th className="text-left py-2 px-2">冷卻</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m: any) => (
                <tr key={m.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.monsterSkillId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td>
                  <td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.skillType}</td>
                  <td className="py-2 px-2">{m.powerPercent}%</td>
                  <td className="py-2 px-2">{m.mpCost}</td>
                  <td className="py-2 px-2">{m.cooldown}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }}
        title={editItem ? `編輯魔物技能：${editItem.name}` : "新增魔物技能"} fields={fields} initialData={editItem}
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
    </div>
  );
}
