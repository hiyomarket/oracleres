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
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Camera, Sparkles } from "lucide-react";
import PhotoUploadAnalyzer from "@/components/wardrobe/PhotoUploadAnalyzer";

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
  const { data: history, isLoading: historyLoading } = trpc.adminConfig.getAuraRuleHistory.useQuery();

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

  const snapshot = trpc.adminConfig.snapshotAuraRules.useMutation({
    onSuccess: (data) => {
      utils.adminConfig.getAuraRuleHistory.invalidate();
      toast.success(data.message);
      setSnapshotLabel("");
    },
    onError: (e) => toast.error(`建立快照失敗：${e.message}`),
  });

  const restore = trpc.adminConfig.restoreAuraRuleSnapshot.useMutation({
    onSuccess: (data) => {
      utils.adminConfig.getAuraRules.invalidate();
      toast.success(data.message);
    },
    onError: (e) => toast.error(`還原失敗：${e.message}`),
  });

  const deleteSnapshot = trpc.adminConfig.deleteAuraRuleSnapshot.useMutation({
    onSuccess: () => {
      utils.adminConfig.getAuraRuleHistory.invalidate();
      toast.success("快照已刪除");
    },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const [editingValues, setEditingValues] = useState<Record<number, string>>({});
  const [snapshotLabel, setSnapshotLabel] = useState("");

  const handleSave = (id: number, value: string) => {
    updateRule.mutate({ id, configValue: value });
  };

  if (isLoading) {
    return <div className="text-slate-400 text-sm animate-pulse py-8 text-center">載入規則中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-slate-400 text-sm">調整能量模擬器的計算邏輯，變更後即時生效。</p>
        <div className="flex gap-2 flex-wrap">
          {/* 建立快照 */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                💾 歷史版本 ({history?.length ?? 0})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-slate-900 border-slate-700 text-white w-96">
              <SheetHeader>
                <SheetTitle className="text-amber-400">能量規則歷史版本</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {/* 建立新快照 */}
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 space-y-2">
                  <p className="text-slate-300 text-xs font-medium">建立當前規則快照</p>
                  <Input
                    value={snapshotLabel}
                    onChange={(e) => setSnapshotLabel(e.target.value)}
                    placeholder="快照名稱，例：調整手串權重 v2"
                    className="bg-slate-900 border-slate-600 text-white text-sm"
                  />
                  <Button
                    size="sm"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    onClick={() => snapshotLabel.trim() && snapshot.mutate({ label: snapshotLabel.trim() })}
                    disabled={snapshot.isPending || !snapshotLabel.trim()}
                  >
                    {snapshot.isPending ? "建立中..." : "💾 建立快照"}
                  </Button>
                </div>

                {/* 快照列表 */}
                <div className="space-y-2">
                  {historyLoading && <p className="text-slate-400 text-sm text-center animate-pulse">載入中...</p>}
                  {!historyLoading && (history ?? []).length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-4">尚無快照記錄</p>
                  )}
                  {(history ?? []).map((h) => (
                    <div key={h.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{h.snapshotLabel}</p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {new Date(h.createdAt).toLocaleString("zh-TW")}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => {
                              if (confirm(`確定還原到「${h.snapshotLabel}」？當前規則將被覆蓋。`))
                                restore.mutate({ id: h.id });
                            }}
                            disabled={restore.isPending}
                          >
                            還原
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => {
                              if (confirm("確定刪除此快照？"))
                                deleteSnapshot.mutate({ id: h.id });
                            }}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => resetRules.mutate()}
            disabled={resetRules.isPending}
          >
            🔄 重置為預設値
          </Button>
        </div>
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
  pairingItems: string[]; // 建議搭配的手串 code 陣列
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

  const updatePairing = trpc.adminConfig.updateBraceletPairing.useMutation({
    onSuccess: () => {
      utils.adminConfig.getCustomBracelets.invalidate();
      toast.success("建議搭配已更新");
    },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [form, setForm] = useState<BraceletFormData>({
    code: "", name: "", element: "火", color: "", functionDesc: "",
    tacticalRoles: {}, pairingItems: [], sortOrder: 99, enabled: true,
  });
  const [tacticalRoleInput, setTacticalRoleInput] = useState("");
  const [pairingInput, setPairingInput] = useState(""); // 逗號分隔的 code 字串

  const openNew = () => {
    setForm({ code: "", name: "", element: "火", color: "", functionDesc: "", tacticalRoles: {}, pairingItems: [], sortOrder: 99, enabled: true });
    setTacticalRoleInput("");
    setPairingInput("");
    setDialogOpen(true);
  };

  const openEdit = (b: NonNullable<typeof bracelets>[number]) => {
    let roles: Record<string, string> = {};
    try { roles = JSON.parse(b.tacticalRoles) as Record<string, string>; } catch { /* ignore */ }
    let pairing: string[] = [];
    try { pairing = JSON.parse(b.pairingItems ?? "[]") as string[]; } catch { /* ignore */ }
    setForm({
      id: b.id,
      code: b.code,
      name: b.name,
      element: b.element as "木" | "火" | "土" | "金" | "水",
      color: b.color,
      functionDesc: b.functionDesc,
      tacticalRoles: roles,
      pairingItems: pairing,
      sortOrder: b.sortOrder,
      enabled: b.enabled === 1,
    });
    setTacticalRoleInput(Object.entries(roles).map(([k, v]) => `${k}:${v}`).join("\n"));
    setPairingInput(pairing.join(", "));
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
    // 解析 pairingItems（逗號分隔）
    const pairing = pairingInput
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const formWithPairing = { ...form, tacticalRoles: roles, pairingItems: pairing };
    upsert.mutate(formWithPairing, {
      onSuccess: () => {
        // 如果是編輯模式，順便更新 pairingItems
        if (form.id) {
          updatePairing.mutate({ id: form.id, pairingItems: pairing });
        }
      }
    });
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
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1.5"
            onClick={() => setPhotoSheetOpen(true)}
          >
            <Camera className="w-3.5 h-3.5" />
            拍照分析
            <Sparkles className="w-3 h-3" />
          </Button>
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
                  {(() => {
                    try {
                      const p = JSON.parse(b.pairingItems ?? "[]") as string[];
                      if (p.length > 0) return (
                        <span className="ml-2 text-amber-500/70">
                          搭配：{p.join("、")}
                        </span>
                      );
                    } catch { /* ignore */ }
                    return null;
                  })()}
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
              <Label className="text-slate-300 text-xs mb-1 block">
                建議搭配（逗號分隔的手串 code）
              </Label>
              <Input
                value={pairingInput}
                onChange={(e) => setPairingInput(e.target.value)}
                placeholder="例：HS-B, HS-C, CUSTOM-01"
                className="bg-slate-800 border-slate-600 text-white text-sm"
              />
              <p className="text-slate-500 text-xs mt-1">
                輸入其他手串的代碼，逗號分隔，最多 10 個。這些手串會在用戶選擇此手串時被推薦搭配。
              </p>
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

      {/* 拍照 AI 分析 Sheet */}
      <Sheet open={photoSheetOpen} onOpenChange={setPhotoSheetOpen}>
        <SheetContent
          side="right"
          className="bg-slate-900 border-l border-slate-700 text-white w-full sm:max-w-md overflow-y-auto"
        >
          <div className="p-4">
            <PhotoUploadAnalyzer
              mode="admin"
              defaultCategory="bracelet"
              onSuccess={(item) => {
                // 後台分析完成後，自動帶入新增表單
                setForm(prev => ({
                  ...prev,
                  name: item.name,
                  element: (item.wuxing as "\u6728" | "\u706b" | "\u571f" | "\u91d1" | "\u6c34") ?? "火",
                  color: item.color,
                  functionDesc: item.energyExplanation,
                }));
                setPhotoSheetOpen(false);
                setDialogOpen(true);
                toast.success("分析完成！請確認手串資料後儲存");
              }}
              onClose={() => setPhotoSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
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
  scheduleEnabled: boolean;
  scheduleStartHour: number;
  scheduleEndHour: number;
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

  const updateSchedule = trpc.adminConfig.updateCategorySchedule.useMutation({
    onSuccess: () => {
      utils.adminConfig.getRestaurantCategories.invalidate();
      toast.success("時段設定已更新");
    },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormData>({
    categoryId: "", label: "", emoji: "🍽️", types: '["restaurant"]',
    textSuffix: "", sortOrder: 99, enabled: true,
    scheduleEnabled: false, scheduleStartHour: 0, scheduleEndHour: 23,
  });

  const openNew = () => {
    setForm({ categoryId: "", label: "", emoji: "🍽️", types: '["restaurant"]', textSuffix: "", sortOrder: 99, enabled: true, scheduleEnabled: false, scheduleStartHour: 0, scheduleEndHour: 23 });
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
      scheduleEnabled: c.scheduleEnabled === 1,
      scheduleStartHour: c.scheduleStartHour,
      scheduleEndHour: c.scheduleEndHour,
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
    }, {
      onSuccess: () => {
        // 如果是編輯模式，順便更新時段設定
        if (form.id) {
          updateSchedule.mutate({
            id: form.id,
            scheduleEnabled: form.scheduleEnabled,
            scheduleStartHour: form.scheduleStartHour,
            scheduleEndHour: form.scheduleEndHour,
          });
        }
      }
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
              {c.scheduleEnabled === 1 && (
                <div className="text-xs mt-0.5">
                  <span className="text-blue-400/80">
                    ⏰ 時段控制：{c.scheduleStartHour}:00 – {c.scheduleEndHour}:59
                    {c.scheduleStartHour > c.scheduleEndHour && <span className="ml-1 text-slate-500">(跨日)</span>}
                  </span>
                </div>
              )}
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

            {/* 時段自動啟用/停用 */}
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300 text-xs font-medium">時段控制</Label>
                  <p className="text-slate-500 text-xs mt-0.5">開啟後，此分類僅在指定時段顯示給用戶</p>
                </div>
                <Switch
                  checked={form.scheduleEnabled}
                  onCheckedChange={(v) => setForm(p => ({ ...p, scheduleEnabled: v }))}
                />
              </div>
              {form.scheduleEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-xs mb-1 block">開始小時（0–23）</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={form.scheduleStartHour}
                      onChange={(e) => setForm(p => ({ ...p, scheduleStartHour: parseInt(e.target.value) || 0 }))}
                      className="bg-slate-900 border-slate-600 text-white text-sm"
                    />
                    <p className="text-slate-500 text-xs mt-0.5">例：18 = 18:00</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs mb-1 block">結束小時（0–23）</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={form.scheduleEndHour}
                      onChange={(e) => setForm(p => ({ ...p, scheduleEndHour: parseInt(e.target.value) || 23 }))}
                      className="bg-slate-900 border-slate-600 text-white text-sm"
                    />
                    <p className="text-slate-500 text-xs mt-0.5">例：23 = 23:59（跨日時結束 &lt; 開始）</p>
                  </div>
                </div>
              )}
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
// 策略引擎說明面板（靜態展示，未來可接 DB 動態調整）
// ============================================================
function StrategyEnginePanel() {
  const strategies = [
    {
      id: "強勢補弱",
      icon: "⚔️",
      color: "text-red-400",
      border: "border-red-500/30",
      bg: "bg-red-950/20",
      trigger: "日主五行最強 ≥ 35% 且最弱 ≤ 8%",
      primaryTarget: "最弱五行",
      secondaryTarget: "日主喜用神",
      desc: "今日能量極度失衡，主動補充最弱元素以恢復平衡，同時鞏固喜用神。適合需要突破瓶頸的日子。",
      outfitHint: "主色選最弱五行對應色，輔色選喜用神色",
    },
    {
      id: "順勢生旺",
      icon: "🌊",
      color: "text-blue-400",
      border: "border-blue-500/30",
      bg: "bg-blue-950/20",
      trigger: "日主喜用神比例 ≥ 30% 且最弱 > 8%",
      primaryTarget: "喜用神",
      secondaryTarget: "生喜用神的五行",
      desc: "今日喜用神能量充沛，順勢強化，讓好能量持續發酵。適合重要決策、談判、創作的日子。",
      outfitHint: "主色選喜用神色，輔色選生喜用神的五行色",
    },
    {
      id: "借力打力",
      icon: "🔄",
      color: "text-purple-400",
      border: "border-purple-500/30",
      bg: "bg-purple-950/20",
      trigger: "日主忌神比例 ≥ 30%（環境能量對日主不利）",
      primaryTarget: "剋制忌神的五行",
      secondaryTarget: "喜用神",
      desc: "今日環境能量對你不利，以剋制忌神的五行來化解阻力。適合需要化解衝突的日子。",
      outfitHint: "主色選剋忌神的五行色，輔色選喜用神色",
    },
    {
      id: "食神生財",
      icon: "💰",
      color: "text-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-950/20",
      trigger: "食神/傷官比例 ≥ 25% 且財星 ≤ 15%",
      primaryTarget: "財星（土/金）",
      secondaryTarget: "食神/傷官對應五行",
      desc: "今日才華能量旺盛但財星偏弱，補充財星讓才華轉化為實際收益。適合創作、展示、銷售的日子。",
      outfitHint: "主色選財星對應色（土=黃棕、金=白灰），輔色選食神色",
    },
    {
      id: "均衡守成",
      icon: "⚖️",
      color: "text-green-400",
      border: "border-green-500/30",
      bg: "bg-green-950/20",
      trigger: "五行分布相對均衡（無元素 ≥ 35% 或 ≤ 5%）",
      primaryTarget: "喜用神",
      secondaryTarget: "次弱五行",
      desc: "今日能量相對平衡，維持穩定狀態，小幅補強喜用神即可。適合日常工作、維持關係的日子。",
      outfitHint: "主色選喜用神色，整體穿搭以和諧為主",
    },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 mb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-amber-400 text-lg">⚙️</span>
          <span className="text-amber-300 font-semibold text-sm">策略引擎 V10.0 說明</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          每日系統依據「本命四柱 × 流日天干地支 × 流時時柱」計算加權五行比例，再依下列五大策略的觸發條件，
          自動判定當日最佳策略，並驅動穿搭主色、手串選擇、行動建議的生成。
          未來版本將支援在此頁面直接調整各策略的觸發閾值。
        </p>
      </div>
      {strategies.map((s) => (
        <div key={s.id} className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{s.icon}</span>
            <span className={`font-bold text-sm ${s.color}`}>{s.id}</span>
            <span className="ml-auto text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">策略 ID: {s.id}</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex gap-2">
              <span className="text-slate-500 w-16 flex-shrink-0">觸發條件</span>
              <span className="text-slate-300">{s.trigger}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-16 flex-shrink-0">主攻目標</span>
              <span className={`font-medium ${s.color}`}>{s.primaryTarget}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-16 flex-shrink-0">輔助目標</span>
              <span className="text-slate-300">{s.secondaryTarget}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-16 flex-shrink-0">策略說明</span>
              <span className="text-slate-400 leading-relaxed">{s.desc}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-16 flex-shrink-0">穿搭提示</span>
              <span className="text-slate-400 italic">{s.outfitHint}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 五行顏色對應表（靜態展示）
// ============================================================
function ElementColorMapPanel() {
  const colorMap = [
    { element: "木", colors: ["翠綠", "青色", "翠碧", "橄欖綠"], hex: ["#22c55e", "#06b6d4", "#16a34a", "#84cc16"], avoid: "白色、銀色（金剋木）", season: "春", direction: "東" },
    { element: "火", colors: ["紅色", "橙色", "粉紅", "紫色"], hex: ["#ef4444", "#f97316", "#ec4899", "#a855f7"], avoid: "黑色、深藍（水剋火）", season: "夏", direction: "南" },
    { element: "土", colors: ["黃色", "棕色", "米色", "咖啡"], hex: ["#eab308", "#92400e", "#d4a574", "#78350f"], avoid: "青色、綠色（木剋土）", season: "四季末", direction: "中" },
    { element: "金", colors: ["白色", "銀色", "金色", "灰色"], hex: ["#f8fafc", "#94a3b8", "#f59e0b", "#6b7280"], avoid: "紅色、橙色（火剋金）", season: "秋", direction: "西" },
    { element: "水", colors: ["黑色", "深藍", "靛藍", "深紫"], hex: ["#0f172a", "#1e3a5f", "#312e81", "#1e1b4b"], avoid: "黃色、棕色（土剋水）", season: "冬", direction: "北" },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4 mb-2">
        <p className="text-slate-400 text-xs leading-relaxed">
          此對應表定義了系統生成穿搭建議時的顏色選擇邏輯。每個五行元素對應一組推薦色系，
          系統會依當日策略的主攻/輔助目標元素，從對應色系中選取穿搭主色與輔色。
        </p>
      </div>
      {colorMap.map((item) => (
        <div key={item.element} className="rounded-xl border border-slate-700 bg-slate-800/20 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: item.hex[0] + "33", color: item.hex[0] }}
            >
              {item.element}
            </div>
            <div>
              <span className="text-white font-semibold text-sm">{item.element}元素</span>
              <span className="text-slate-500 text-xs ml-2">{item.season}・{item.direction}方</span>
            </div>
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {item.hex.map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: h }} />
                <span className="text-[10px] text-slate-500">{item.colors[i]}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">避免：</span>
            <span className="text-red-400/70">{item.avoid}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 主頁面（主從佈局）
// ============================================================
export default function AdminLogicConfig() {
  const [activeSection, setActiveSection] = useState<string>("strategy");

  const navItems = [
    { id: "strategy", icon: "🧠", label: "策略引擎", desc: "五大策略觸發邏輯" },
    { id: "colormap", icon: "🎨", label: "五行顏色對應", desc: "穿搭顏色選擇規則" },
    { id: "aura", icon: "⚡", label: "能量模擬器規則", desc: "部位權重與加成比例" },
    { id: "bracelets", icon: "📿", label: "手串/配飾資料庫", desc: "新增/編輯/停用手串" },
    { id: "restaurants", icon: "🍽️", label: "餐廳分類管理", desc: "飲食羅盤分類設定" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-amber-400 mb-1">算法核心控制中心</h1>
          <p className="text-slate-400 text-sm">管理策略引擎、能量計算規則、手串資料庫與飲食分類——所有變更即時生效。</p>
        </div>

        {/* 主從佈局 */}
        <div className="flex gap-6">
          {/* 左側導覽選單 */}
          <div className="w-52 flex-shrink-0">
            <nav className="space-y-1 sticky top-6">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                    activeSection === item.id
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-6">{item.desc}</div>
                </button>
              ))}
            </nav>
          </div>

          {/* 右側內容區 */}
          <div className="flex-1 min-w-0">
            {activeSection === "strategy" && <StrategyEnginePanel />}
            {activeSection === "colormap" && <ElementColorMapPanel />}
            {activeSection === "aura" && <AuraRulesTab />}
            {activeSection === "bracelets" && <BraceletsTab />}
            {activeSection === "restaurants" && <RestaurantCategoriesTab />}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
