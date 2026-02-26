/**
 * AdminLogicConfig.tsx
 * 後台「管理邏輯計算權限」頁面
 *
 * Tab 1：能量模擬器規則（各部位權重、加成比例、分數上下限）
 * Tab 2：手串/配飾管理（新增/編輯/刪除/啟停用）
 * Tab 3：餐廳分類管理（新增/編輯/刪除/排序/啟停用）
 */
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

// ============================================================
// 分類標籤中文對應
// ============================================================
const CATEGORY_LABELS: Record<string, string> = {
  category_weights: "各部位計分權重",
  boost_ratios: "加成比例設定",
  score_limits: "分數上下限",
  innate_weights: "天命底盤各維度權重",
};

const ELEMENT_OPTIONS = ["木", "火", "土", "金", "水"] as const;
const ELEMENT_COLORS: Record<string, string> = {
  木: "text-green-400",
  火: "text-red-400",
  土: "text-yellow-400",
  金: "text-gray-300",
  水: "text-blue-400",
};

// ============================================================
// Tab 1：能量模擬器規則
// ============================================================
function AuraRulesTab() {
  const utils = trpc.useUtils();
  const { data: grouped, isLoading } = trpc.adminConfig.getAuraRules.useQuery();

  const updateRule = trpc.adminConfig.updateAuraRule.useMutation({
    onSuccess: () => {
      utils.adminConfig.getAuraRules.invalidate();
      toast.success("規則已更新");
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const resetRules = trpc.adminConfig.resetAuraRules.useMutation({
    onSuccess: (data) => {
      utils.adminConfig.getAuraRules.invalidate();
      toast.success(data.message);
    },
    onError: (e) => toast.error(`重置失敗：${e.message}`),
  });

  const [editingValues, setEditingValues] = useState<Record<number, string>>({});

  const handleSave = (id: number, value: string) => {
    updateRule.mutate({ id, configValue: value });
  };

  if (isLoading) {
    return <div className="text-slate-400 text-sm animate-pulse py-8 text-center">載入規則中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">調整能量模擬器的計算邏輯，變更後即時生效。</p>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={() => resetRules.mutate()}
          disabled={resetRules.isPending}
        >
          🔄 重置為預設值
        </Button>
      </div>

      {Object.entries(grouped ?? {}).map(([category, rules]) => (
        <div key={category} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700">
            <h3 className="text-amber-400 font-semibold text-sm">
              {CATEGORY_LABELS[category] ?? category}
            </h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {rules.map((rule) => {
              const currentVal = editingValues[rule.id] ?? rule.configValue;
              const numVal = parseFloat(currentVal);
              const min = parseFloat(rule.minValue ?? "0");
              const max = parseFloat(rule.maxValue ?? "100");
              const step = parseFloat(rule.step ?? "1");

              return (
                <div key={rule.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{rule.label}</div>
                    {rule.description && (
                      <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{rule.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {rule.valueType === "number" && (
                      <>
                        <div className="w-36">
                          <Slider
                            min={min}
                            max={max}
                            step={step}
                            value={[numVal]}
                            onValueChange={([v]) => setEditingValues(prev => ({ ...prev, [rule.id]: String(v) }))}
                            className="w-full"
                          />
                        </div>
                        <div className="w-16">
                          <Input
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={currentVal}
                            onChange={(e) => setEditingValues(prev => ({ ...prev, [rule.id]: e.target.value }))}
                            className="h-8 text-center text-sm bg-slate-900 border-slate-600 text-white"
                          />
                        </div>
                      </>
                    )}
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold"
                      onClick={() => handleSave(rule.id, currentVal)}
                      disabled={updateRule.isPending}
                    >
                      儲存
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Tab 2：手串/配飾管理
// ============================================================
interface BraceletFormData {
  id?: number;
  code: string;
  name: string;
  element: "木" | "火" | "土" | "金" | "水";
  color: string;
  functionDesc: string;
  tacticalRoles: Record<string, string>;
  sortOrder: number;
  enabled: boolean;
}

function BraceletsTab() {
  const utils = trpc.useUtils();
  const { data: bracelets, isLoading } = trpc.adminConfig.getCustomBracelets.useQuery();

  const syncBuiltin = trpc.adminConfig.syncBuiltinBracelets.useMutation({
    onSuccess: (data) => {
      utils.adminConfig.getCustomBracelets.invalidate();
      toast.success(data.message);
    },
    onError: (e) => toast.error(`同步失敗：${e.message}`),
  });

  const upsert = trpc.adminConfig.upsertCustomBracelet.useMutation({
    onSuccess: () => {
      utils.adminConfig.getCustomBracelets.invalidate();
      setDialogOpen(false);
      toast.success("已儲存");
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const deleteBracelet = trpc.adminConfig.deleteCustomBracelet.useMutation({
    onSuccess: () => {
      utils.adminConfig.getCustomBracelets.invalidate();
      toast.success("已刪除");
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const toggle = trpc.adminConfig.toggleCustomBracelet.useMutation({
    onSuccess: () => utils.adminConfig.getCustomBracelets.invalidate(),
    onError: (e) => toast.error(`操作失敗：${e.message}`),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BraceletFormData>({
    code: "", name: "", element: "火", color: "", functionDesc: "",
    tacticalRoles: {}, sortOrder: 99, enabled: true,
  });
  const [tacticalRoleInput, setTacticalRoleInput] = useState("");

  const openNew = () => {
    setForm({ code: "", name: "", element: "火", color: "", functionDesc: "", tacticalRoles: {}, sortOrder: 99, enabled: true });
    setTacticalRoleInput("");
    setDialogOpen(true);
  };

  const openEdit = (b: NonNullable<typeof bracelets>[number]) => {
    let roles: Record<string, string> = {};
    try { roles = JSON.parse(b.tacticalRoles) as Record<string, string>; } catch { /* ignore */ }
    setForm({
      id: b.id,
      code: b.code,
      name: b.name,
      element: b.element as "木" | "火" | "土" | "金" | "水",
      color: b.color,
      functionDesc: b.functionDesc,
      tacticalRoles: roles,
      sortOrder: b.sortOrder,
      enabled: b.enabled === 1,
    });
    setTacticalRoleInput(Object.entries(roles).map(([k, v]) => `${k}:${v}`).join("\n"));
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    // 解析 tacticalRoles 輸入（每行 key:value）
    const roles: Record<string, string> = {};
    for (const line of tacticalRoleInput.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        roles[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    upsert.mutate({ ...form, tacticalRoles: roles });
  };

  if (isLoading) {
    return <div className="text-slate-400 text-sm animate-pulse py-8 text-center">載入手串資料中...</div>;
  }

  const hasBuiltin = (bracelets ?? []).some(b => b.isBuiltin === 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-slate-400 text-sm">管理能量模擬器中的手串/配飾選項。</p>
        <div className="flex gap-2">
          {!hasBuiltin && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => syncBuiltin.mutate()}
              disabled={syncBuiltin.isPending}
            >
              🔄 同步內建手串
            </Button>
          )}
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={openNew}
          >
            + 新增手串/配飾
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {(bracelets ?? []).map((b) => {
          let roles: Record<string, string> = {};
          try { roles = JSON.parse(b.tacticalRoles) as Record<string, string>; } catch { /* ignore */ }
          return (
            <div
              key={b.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                b.enabled === 1
                  ? "bg-slate-800/60 border-slate-700"
                  : "bg-slate-900/40 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${ELEMENT_COLORS[b.element] ?? "text-white"}`}>
                    {b.element}
                  </span>
                  <span className="text-white text-sm font-medium">{b.name}</span>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 px-1.5 py-0">
                    {b.code}
                  </Badge>
                  {b.isBuiltin === 1 && (
                    <Badge className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0">內建</Badge>
                  )}
                </div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {b.color} · {b.functionDesc}
                  {Object.keys(roles).length > 0 && (
                    <span className="ml-2 text-slate-500">
                      戰術角色：{Object.keys(roles).join("、")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={b.enabled === 1}
                  onCheckedChange={(v) => toggle.mutate({ id: b.id, enabled: v })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => openEdit(b)}
                >
                  ✏️
                </Button>
                {b.isBuiltin !== 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => {
                      if (confirm(`確定刪除「${b.name}」？`)) deleteBracelet.mutate({ id: b.id });
                    }}
                  >
                    🗑️
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {(bracelets ?? []).length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <div className="text-3xl mb-2">📿</div>
            <p className="text-sm">尚無手串資料，請先點擊「同步內建手串」或「新增手串/配飾」</p>
          </div>
        )}
      </div>

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              {form.id ? "編輯手串/配飾" : "新增手串/配飾"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">代碼 *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                  placeholder="例：CUSTOM-01"
                  className="bg-slate-800 border-slate-600 text-white text-sm"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">五行屬性 *</Label>
                <Select
                  value={form.element}
                  onValueChange={(v) => setForm(p => ({ ...p, element: v as typeof form.element }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {ELEMENT_OPTIONS.map(el => (
                      <SelectItem key={el} value={el} className={`${ELEMENT_COLORS[el]} text-sm`}>{el}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">名稱 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例：紫晶智慧招財手串"
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">顏色描述 *</Label>
              <Input
                value={form.color}
                onChange={(e) => setForm(p => ({ ...p, color: e.target.value }))}
                placeholder="例：紫/黃/紅/綠"
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">功能說明 *</Label>
              <Input
                value={form.functionDesc}
                onChange={(e) => setForm(p => ({ ...p, functionDesc: e.target.value }))}
                placeholder="例：才華引爆器"
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">
                戰術角色（每行一個，格式：情境:說明）
              </Label>
              <textarea
                value={tacticalRoleInput}
                onChange={(e) => setTacticalRoleInput(e.target.value)}
                placeholder={"補火:創意太陽\n補土:財富磁場\ndefault:智慧共振器"}
                rows={4}
                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">排序（越小越前面）</Label>
              <Input
                type="number"
                min={0}
                max={999}
                value={form.sortOrder}
                onChange={(e) => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 99 }))}
                className="bg-slate-800 border-slate-600 text-white text-sm w-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={handleSubmit}
              disabled={upsert.isPending || !form.code || !form.name || !form.color || !form.functionDesc}
            >
              {upsert.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tab 3：餐廳分類管理
// ============================================================
interface CategoryFormData {
  id?: number;
  categoryId: string;
  label: string;
  emoji: string;
  types: string;
  textSuffix: string;
  sortOrder: number;
  enabled: boolean;
}

function RestaurantCategoriesTab() {
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.adminConfig.getRestaurantCategories.useQuery();

  const upsert = trpc.adminConfig.upsertRestaurantCategory.useMutation({
    onSuccess: () => {
      utils.adminConfig.getRestaurantCategories.invalidate();
      setDialogOpen(false);
      toast.success("已儲存");
    },
    onError: (e) => toast.error(`儲存失敗：${e.message}`),
  });

  const deleteCategory = trpc.adminConfig.deleteRestaurantCategory.useMutation({
    onSuccess: () => {
      utils.adminConfig.getRestaurantCategories.invalidate();
      toast.success("已刪除");
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const toggle = trpc.adminConfig.toggleRestaurantCategory.useMutation({
    onSuccess: () => utils.adminConfig.getRestaurantCategories.invalidate(),
    onError: (e) => toast.error(`操作失敗：${e.message}`),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormData>({
    categoryId: "", label: "", emoji: "🍽️", types: '["restaurant"]',
    textSuffix: "", sortOrder: 99, enabled: true,
  });

  const openNew = () => {
    setForm({ categoryId: "", label: "", emoji: "🍽️", types: '["restaurant"]', textSuffix: "", sortOrder: 99, enabled: true });
    setDialogOpen(true);
  };

  const openEdit = (c: NonNullable<typeof categories>[number]) => {
    setForm({
      id: c.id,
      categoryId: c.categoryId,
      label: c.label,
      emoji: c.emoji,
      types: c.types,
      textSuffix: c.textSuffix ?? "",
      sortOrder: c.sortOrder,
      enabled: c.enabled === 1,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    let parsedTypes: string[];
    try {
      parsedTypes = JSON.parse(form.types) as string[];
      if (!Array.isArray(parsedTypes)) throw new Error();
    } catch {
      toast.error("types 必須是有效的 JSON 陣列，例：[\"restaurant\"]");
      return;
    }
    upsert.mutate({
      id: form.id,
      categoryId: form.categoryId,
      label: form.label,
      emoji: form.emoji,
      types: parsedTypes,
      textSuffix: form.textSuffix || undefined,
      sortOrder: form.sortOrder,
      enabled: form.enabled,
    });
  };

  if (isLoading) {
    return <div className="text-slate-400 text-sm animate-pulse py-8 text-center">載入分類中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-slate-400 text-sm">管理飲食羅盤「附近命理推薦餐廳」的篩選分類。</p>
          <p className="text-slate-500 text-xs mt-0.5">
            types 對應 Google Places API 類型；textSuffix 為搜尋關鍵字後綴（留空則只用 types 搜尋）
          </p>
        </div>
        <Button
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0"
          onClick={openNew}
        >
          + 新增分類
        </Button>
      </div>

      {/* 分類列表 */}
      <div className="grid gap-2">
        {(categories ?? []).map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
              c.enabled === 1
                ? "bg-slate-800/60 border-slate-700"
                : "bg-slate-900/40 border-slate-800 opacity-60"
            }`}
          >
            <div className="text-xl w-8 text-center shrink-0">{c.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-sm font-medium">{c.label}</span>
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 px-1.5 py-0">
                  {c.categoryId}
                </Badge>
                {c.isDefault === 1 && (
                  <Badge className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0">系統預設</Badge>
                )}
                <span className="text-xs text-slate-500">排序 {c.sortOrder}</span>
              </div>
              <div className="text-slate-500 text-xs mt-0.5 font-mono truncate">
                types: {c.types}
                {c.textSuffix && <span className="ml-2 text-slate-400">後綴: 「{c.textSuffix}」</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={c.enabled === 1}
                onCheckedChange={(v) => toggle.mutate({ id: c.id, enabled: v })}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={() => openEdit(c)}
              >
                ✏️
              </Button>
              {c.isDefault !== 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => {
                    if (confirm(`確定刪除分類「${c.label}」？`)) deleteCategory.mutate({ id: c.id });
                  }}
                >
                  🗑️
                </Button>
              )}
            </div>
          </div>
        ))}
        {(categories ?? []).length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <div className="text-3xl mb-2">🍽️</div>
            <p className="text-sm">尚無分類資料</p>
          </div>
        )}
      </div>

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              {form.id ? "編輯餐廳分類" : "新增餐廳分類"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-slate-300 text-xs mb-1 block">分類 ID *（英文小寫+底線）</Label>
                <Input
                  value={form.categoryId}
                  onChange={(e) => setForm(p => ({ ...p, categoryId: e.target.value }))}
                  placeholder="例：night_market"
                  className="bg-slate-800 border-slate-600 text-white text-sm"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Emoji</Label>
                <Input
                  value={form.emoji}
                  onChange={(e) => setForm(p => ({ ...p, emoji: e.target.value }))}
                  placeholder="🍽️"
                  className="bg-slate-800 border-slate-600 text-white text-sm text-center"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">顯示名稱 *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="例：夜市小吃"
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">
                Google Places types（JSON 陣列）*
              </Label>
              <Input
                value={form.types}
                onChange={(e) => setForm(p => ({ ...p, types: e.target.value }))}
                placeholder='["restaurant"]'
                className="bg-slate-800 border-slate-600 text-white text-sm font-mono"
              />
              <p className="text-slate-500 text-xs mt-1">
                常用值：restaurant / cafe / bar / breakfast_restaurant / japanese_restaurant / korean_restaurant / chinese_restaurant / seafood_restaurant / dessert_restaurant / noodle_restaurant
              </p>
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">
                搜尋關鍵字後綴（留空則只用 types）
              </Label>
              <Input
                value={form.textSuffix}
                onChange={(e) => setForm(p => ({ ...p, textSuffix: e.target.value }))}
                placeholder="例：夜市小吃（會搜尋「夜市小吃」）"
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-1 block">排序（越小越前面）</Label>
              <Input
                type="number"
                min={0}
                max={999}
                value={form.sortOrder}
                onChange={(e) => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 99 }))}
                className="bg-slate-800 border-slate-600 text-white text-sm w-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={handleSubmit}
              disabled={upsert.isPending || !form.categoryId || !form.label || !form.types}
            >
              {upsert.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 主頁面
// ============================================================
export default function AdminLogicConfig() {
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400 mb-1">管理邏輯計算權限</h1>
          <p className="text-slate-400 text-sm">
            調整能量模擬器計算規則、手串/配飾資料庫、飲食羅盤餐廳分類——所有變更即時生效。
          </p>
        </div>

        <Tabs defaultValue="aura" className="space-y-6">
          <TabsList className="bg-slate-800/60 border border-slate-700 h-auto p-1 flex flex-wrap gap-1">
            <TabsTrigger
              value="aura"
              className="text-slate-300 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-sm px-4 py-2"
            >
              ⚡ 能量模擬器規則
            </TabsTrigger>
            <TabsTrigger
              value="bracelets"
              className="text-slate-300 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-sm px-4 py-2"
            >
              📿 手串/配飾管理
            </TabsTrigger>
            <TabsTrigger
              value="restaurants"
              className="text-slate-300 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-sm px-4 py-2"
            >
              🍽️ 餐廳分類管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aura">
            <AuraRulesTab />
          </TabsContent>

          <TabsContent value="bracelets">
            <BraceletsTab />
          </TabsContent>

          <TabsContent value="restaurants">
            <RestaurantCategoriesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
