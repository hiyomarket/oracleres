/**
 * 六大圖鑑管理 Tab 組件（含進階篩選 + CSV/JSON 匯出 + 分頁 + 批量操作）
 * MonsterCatalogV2Tab / ItemCatalogV2Tab / EquipCatalogV2Tab / SkillCatalogV2Tab / AchievementCatalogTab / MonsterSkillCatalogTab
 */
import React, { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import CatalogFormDialog, { type FieldDef } from "./CatalogFormDialog";

// ===== 共用常數 =====
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
const RARITY_FILTER = [{ value: "", label: "全部稀有度" }, ...RARITY_OPTS];

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

// ===== 共用匯出工具 =====
function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) { toast.error("沒有資料可匯出"); return; }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
      return str;
    }).join(","))
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`已匯出 ${data.length} 筆 CSV`);
}

function exportToJSON(data: any[], filename: string) {
  if (!data || data.length === 0) { toast.error("沒有資料可匯出"); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.json`; a.click();
  URL.revokeObjectURL(url);
  toast.success(`已匯出 ${data.length} 筆 JSON`);
}

// ===== 共用 UI 組件 =====
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
      {label}
    </button>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 mb-4 flex-wrap items-center">{children}</div>;
}

function ExportButtons({ onCSV, onJSON }: { onCSV: () => void; onJSON: () => void }) {
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onCSV}>CSV</Button>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onJSON}>JSON</Button>
    </div>
  );
}

// ===== 分頁控制器 =====
function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: {
  page: number; pageSize: number; total: number;
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // 生成頁碼按鈕
  const pageButtons = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>共 {total} 筆</span>
        <span>·</span>
        <span>第 {startItem}-{endItem} 筆</span>
        <span>·</span>
        <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}
          className="h-6 text-xs rounded border bg-background px-1">
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>每頁 {s} 筆</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>上一頁</Button>
        {pageButtons.map((p, i) =>
          p === "..." ? <span key={`dot-${i}`} className="px-1 text-xs text-muted-foreground">…</span> : (
            <Button key={p} size="sm" variant={p === page ? "default" : "outline"} className="h-7 w-7 px-0 text-xs" onClick={() => onPageChange(p as number)}>{p}</Button>
          )
        )}
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>下一頁</Button>
      </div>
    </div>
  );
}

// ===== 批量操作工具列 =====
function BatchToolbar({ selectedCount, onBatchDelete, onBatchEdit, onClearSelection, isDeleting }: {
  selectedCount: number; onBatchDelete: () => void; onBatchEdit: () => void; onClearSelection: () => void; isDeleting: boolean;
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-3 p-2 bg-primary/10 border border-primary/30 rounded-lg">
      <span className="text-sm font-medium text-primary">已選取 {selectedCount} 筆</span>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onBatchEdit}>批量編輯</Button>
      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onBatchDelete} disabled={isDeleting}>
        {isDeleting ? "刪除中…" : "批量刪除"}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClearSelection}>取消選取</Button>
    </div>
  );
}

// ===== 批量編輯 Dialog（含預覽步驟） =====
function BatchEditDialog({ open, onClose, fields, onSubmit, isLoading, selectedCount, selectedItems }: {
  open: boolean; onClose: () => void; fields: { key: string; label: string; type: string; options?: { value: string; label: string }[] }[];
  onSubmit: (data: Record<string, any>) => void; isLoading: boolean; selectedCount: number;
  selectedItems?: any[]; // 用於預覽變更
}) {
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"edit" | "preview">("edit");

  const toggleField = (key: string) => {
    const next = new Set(enabledFields);
    if (next.has(key)) { next.delete(key); const d = { ...editData }; delete d[key]; setEditData(d); }
    else next.add(key);
    setEnabledFields(next);
  };

  const getFieldLabel = (key: string) => fields.find(f => f.key === key)?.label ?? key;
  const getOptionLabel = (key: string, val: string) => {
    const f = fields.find(f => f.key === key);
    return f?.options?.find(o => o.value === val)?.label ?? val;
  };

  const pendingChanges = useMemo(() => {
    const data: Record<string, any> = {};
    Array.from(enabledFields).forEach(key => {
      if (editData[key] !== undefined && editData[key] !== "") data[key] = editData[key];
    });
    return data;
  }, [enabledFields, editData]);

  const handleGoPreview = () => {
    if (Object.keys(pendingChanges).length === 0) { toast.error("請至少勾選一個欄位並填入新值"); return; }
    setStep("preview");
  };

  const handleConfirm = () => {
    onSubmit(pendingChanges);
  };

  const handleClose = () => {
    onClose(); setEditData({}); setEnabledFields(new Set()); setStep("edit");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "edit" ? `批量編輯（${selectedCount} 筆）` : `預覽變更（${selectedCount} 筆）`}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {step === "edit" ? "勾選要修改的欄位，僅修改已勾選的欄位" : "請確認以下變更內容，確認後將套用到所有選取的項目"}
          </p>
        </DialogHeader>

        {step === "edit" ? (
          <div className="space-y-3 py-2">
            {fields.map(f => (
              <div key={f.key} className="flex items-center gap-3">
                <input type="checkbox" checked={enabledFields.has(f.key)} onChange={() => toggleField(f.key)} className="rounded" />
                <label className="text-sm w-24 shrink-0">{f.label}</label>
                {f.type === "select" && f.options ? (
                  <select disabled={!enabledFields.has(f.key)} value={editData[f.key] ?? ""}
                    onChange={e => setEditData({ ...editData, [f.key]: e.target.value })}
                    className="h-8 text-sm rounded border bg-background px-2 flex-1 disabled:opacity-40">
                    <option value="">-- 選擇 --</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "number" ? (
                  <Input type="number" disabled={!enabledFields.has(f.key)} value={editData[f.key] ?? ""}
                    onChange={e => setEditData({ ...editData, [f.key]: Number(e.target.value) })}
                    className="h-8 text-sm flex-1 disabled:opacity-40" />
                ) : (
                  <Input disabled={!enabledFields.has(f.key)} value={editData[f.key] ?? ""}
                    onChange={e => setEditData({ ...editData, [f.key]: e.target.value })}
                    className="h-8 text-sm flex-1 disabled:opacity-40" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* 變更摘要 */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-semibold mb-2">變更摘要</p>
              <div className="space-y-1">
                {Object.entries(pendingChanges).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-24">{getFieldLabel(key)}</span>
                    <span className="text-primary font-medium">→ {fields.find(f => f.key === key)?.options ? getOptionLabel(key, String(val)) : String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* 受影響項目預覽 */}
            {selectedItems && selectedItems.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">受影響的項目（前 {Math.min(selectedItems.length, 10)} 筆）</p>
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1 px-2">#</th>
                        <th className="text-left py-1 px-2">名稱</th>
                        {Object.keys(pendingChanges).map(key => (
                          <th key={key} className="text-left py-1 px-2">{getFieldLabel(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-1 px-2 text-muted-foreground">{idx + 1}</td>
                          <td className="py-1 px-2 font-medium">{item.name ?? item.monsterId ?? item.itemId ?? item.equipId ?? item.skillId ?? "-"}</td>
                          {Object.entries(pendingChanges).map(([key, newVal]) => (
                            <td key={key} className="py-1 px-2">
                              <span className="text-muted-foreground line-through mr-1">{item[key] ?? "-"}</span>
                              <span className="text-primary font-medium">→ {fields.find(f => f.key === key)?.options ? getOptionLabel(key, String(newVal)) : String(newVal)}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedItems.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-1">…及其他 {selectedItems.length - 10} 筆</p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "edit" ? (
            <>
              <Button variant="outline" onClick={handleClose}>取消</Button>
              <Button onClick={handleGoPreview} disabled={enabledFields.size === 0}>下一步：預覽變更</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("edit")}>返回修改</Button>
              <Button onClick={handleConfirm} disabled={isLoading} variant="destructive">
                {isLoading ? "更新中…" : `確認套用到 ${selectedCount} 筆`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== CSV/JSON 匯入 Dialog =====
function ImportDialog({ open, onClose, onImport, isLoading, catalogName }: {
  open: boolean; onClose: () => void;
  onImport: (items: any[]) => void; isLoading: boolean; catalogName: string;
}) {
  const [importData, setImportData] = useState<any[]>([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          setImportData(arr);
        } else if (file.name.endsWith(".csv")) {
          const lines = text.split("\n").filter(l => l.trim());
          if (lines.length < 2) { setParseError("CSV 至少需要標題行 + 1 筆資料"); return; }
          const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
          const items = lines.slice(1).map(line => {
            const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              const v = vals[i] ?? "";
              if (v === "") return;
              const num = Number(v);
              obj[h] = !isNaN(num) && v !== "" ? num : v;
            });
            return obj;
          });
          setImportData(items);
        } else {
          setParseError("僅支援 .csv 和 .json 檔案");
        }
      } catch (err) {
        setParseError(`解析失敗：${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    onClose(); setImportData([]); setParseError(""); setFileName("");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>匯入{catalogName}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">上傳 CSV 或 JSON 檔案，每次最多 500 筆。CSV 標題行需對應欄位名稱。</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
              <span className="text-sm">選擇檔案</span>
              <input type="file" accept=".csv,.json" onChange={handleFile} className="hidden" />
            </label>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          </div>
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          {importData.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">預覽（共 {importData.length} 筆，顯示前 5 筆）</p>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      {Object.keys(importData[0]).slice(0, 8).map(k => (
                        <th key={k} className="text-left py-1 px-2">{k}</th>
                      ))}
                      {Object.keys(importData[0]).length > 8 && <th className="text-left py-1 px-2">…</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 5).map((item, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.values(item).slice(0, 8).map((v, i) => (
                          <td key={i} className="py-1 px-2 max-w-[120px] truncate">{String(v ?? "")}</td>
                        ))}
                        {Object.keys(item).length > 8 && <td className="py-1 px-2 text-muted-foreground">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importData.length > 5 && <p className="text-xs text-muted-foreground mt-1">…及其他 {importData.length - 5} 筆</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button onClick={() => onImport(importData)} disabled={isLoading || importData.length === 0}>
            {isLoading ? "匯入中…" : `匯入 ${importData.length} 筆`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== 勾選 checkbox 表頭 =====
function SelectAllCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) {
  return (
    <input type="checkbox" checked={checked} ref={el => { if (el) el.indeterminate = indeterminate; }}
      onChange={onChange} className="rounded" />
  );
}

// ════════════════════════════════════════════════════════════════
// 1. 魔物圖鑑 V2
// ════════════════════════════════════════════════════════════════
export function MonsterCatalogV2Tab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [rarity, setRarity] = useState("");
  const [levelMin, setLevelMin] = useState("");
  const [levelMax, setLevelMax] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const queryInput = useMemo(() => ({
    search: search || undefined,
    wuxing: wuxing || undefined,
    rarity: rarity || undefined,
    levelMin: levelMin ? parseInt(levelMin) : undefined,
    levelMax: levelMax ? parseInt(levelMax) : undefined,
    page, pageSize,
  }), [search, wuxing, rarity, levelMin, levelMax, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getMonsterCatalog.useQuery(queryInput);
  const { data: monsterSkills } = trpc.gameCatalog.getAllMonsterSkills.useQuery();
  const { data: allItems } = trpc.gameCatalog.getAllItems.useQuery();
  const exportQuery = trpc.gameCatalog.exportMonsterCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createMonsterCatalog.useMutation({
    onSuccess: (r) => { toast.success(`建立成功 (${r.monsterId})`); setFormOpen(false); refetch(); },
    onError: (e) => toast.error(`${e.message}`),
  });
  const updateMut = trpc.gameCatalog.updateMonsterCatalog.useMutation({
    onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(`${e.message}`),
  });
  const deleteMut = trpc.gameCatalog.deleteMonsterCatalog.useMutation({
    onSuccess: () => { toast.success("已刪除"); refetch(); },
  });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteMonsters.useMutation({
    onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); },
    onError: (e) => toast.error(`${e.message}`),
  });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateMonsters.useMutation({
    onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); },
    onError: (e) => toast.error(`${e.message}`),
  });
  const bulkImportMut = trpc.gameCatalog.bulkImportMonsters.useMutation({
    onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆魔物`); setImportOpen(false); refetch(); },
    onError: (e) => toast.error(`匯入失敗：${e.message}`),
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

  const batchEditFields = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
    { key: "baseHp", label: "HP", type: "number" },
    { key: "baseAttack", label: "攻擊", type: "number" },
    { key: "baseDefense", label: "防禦", type: "number" },
    { key: "growthRate", label: "成長率", type: "number" },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data });
    else createMut.mutate(data);
  };

  const handleExport = useCallback(async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.data) {
      if (format === "csv") exportToCSV(result.data, "monster_catalog");
      else exportToJSON(result.data, "monster_catalog");
    }
  }, [exportQuery]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const allSelected = items.length > 0 && items.every((m: any) => selectedIds.has(m.id));
  const someSelected = items.some((m: any) => selectedIds.has(m.id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((m: any) => m.id)));
  };
  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchDelete = () => {
    if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆魔物？此操作無法復原！`)) return;
    batchDeleteMut.mutate({ ids: Array.from(selectedIds) });
  };

  const handleBatchEdit = (data: Record<string, any>) => {
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    batchUpdateMut.mutate({ ids: Array.from(selectedIds), data });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">🐉 魔物圖鑑（{total}）</h2>
          <p className="text-xs text-muted-foreground">新增時自動生成 ID（如 M_W001）</p>
        </div>
        <div className="flex gap-2 items-center">
          <ExportButtons onCSV={() => handleExport("csv")} onJSON={() => handleExport("json")} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>📥 匯入</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增魔物</Button>
        </div>
      </div>
      <FilterBar>
        <div className="flex gap-1 flex-wrap">
          {WUXING_FILTER.map(w => (
            <FilterPill key={w.value} label={w.label} active={wuxing === w.value} onClick={() => { setWuxing(w.value); setPage(1); }} />
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {RARITY_FILTER.map(r => (
            <FilterPill key={r.value} label={r.label} active={rarity === r.value} onClick={() => { setRarity(r.value); setPage(1); }} />
          ))}
        </div>
      </FilterBar>
      <FilterBar>
        <span className="text-xs text-muted-foreground">等級：</span>
        <Input type="number" placeholder="最低" value={levelMin} onChange={e => { setLevelMin(e.target.value); setPage(1); }} className="w-20 h-7 text-xs" />
        <span className="text-xs text-muted-foreground">~</span>
        <Input type="number" placeholder="最高" value={levelMax} onChange={e => { setLevelMax(e.target.value); setPage(1); }} className="w-20 h-7 text-xs" />
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} className="w-40 h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setSearch(searchInput); setPage(1); }}>搜尋</Button>
          {(search || wuxing || rarity || levelMin || levelMax) && (
            <Button size="sm" variant="ghost" className="h-7" onClick={() => { setSearch(""); setSearchInput(""); setWuxing(""); setRarity(""); setLevelMin(""); setLevelMax(""); setPage(1); }}>清除全部</Button>
          )}
        </div>
      </FilterBar>
      <BatchToolbar selectedCount={selectedIds.size} onBatchDelete={handleBatchDelete} onBatchEdit={() => setBatchEditOpen(true)}
        onClearSelection={() => setSelectedIds(new Set())} isDeleting={batchDeleteMut.isPending} />
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
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
                  <React.Fragment key={m.id}>
                    <tr className={`border-b hover:bg-muted/30 cursor-pointer ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`} onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                      <td className="py-2 px-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                      <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.monsterId}</td>
                      <td className="py-2 px-2 font-medium">{m.name}</td>
                      <td className="py-2 px-2 text-xs">{m.wuxing}</td>
                      <td className="py-2 px-2 text-xs">{m.levelRange}</td>
                      <td className="py-2 px-2">{m.baseHp}</td>
                      <td className="py-2 px-2">{m.baseAttack}</td>
                      <td className="py-2 px-2">{m.baseDefense}</td>
                      <td className="py-2 px-2">{m.baseSpeed}</td>
                      <td className="py-2 px-2 text-xs">{m.rarity}</td>
                      <td className="py-2 px-2 space-x-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                      </td>
                    </tr>
                    {expandedId === m.id && (
                      <tr className="bg-muted/20">
                        <td colSpan={11} className="p-4">
                          <MonsterDetailCard monster={m} skillOpts={skillOpts} itemOpts={itemOpts} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }}
        title={editItem ? `編輯魔物：${editItem.name}` : "新增魔物"} fields={fields} initialData={editItem}
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields}
        onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="魔物圖鑑" />
    </div>
  );
}

// ===== 魔物詳細檢視卡片 =====
function MonsterDetailCard({ monster: m, skillOpts, itemOpts }: { monster: any; skillOpts: { value: string; label: string }[]; itemOpts: { value: string; label: string }[] }) {
  const getSkillName = (id: string) => skillOpts.find(s => s.value === id)?.label ?? id ?? "-";
  const getItemName = (id: string) => itemOpts.find(i => i.value === id)?.label ?? id ?? "-";
  const dropGold = typeof m.dropGold === "object" && m.dropGold ? m.dropGold : null;
  const spawnNodes = Array.isArray(m.spawnNodes) ? m.spawnNodes : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 基礎屬性 */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold border-b pb-1">📊 基礎屬性</h4>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span className="text-muted-foreground">HP</span><span className="font-medium">{m.baseHp}</span>
          <span className="text-muted-foreground">攻擊</span><span className="font-medium">{m.baseAttack}</span>
          <span className="text-muted-foreground">防禦</span><span className="font-medium">{m.baseDefense}</span>
          <span className="text-muted-foreground">速度</span><span className="font-medium">{m.baseSpeed}</span>
          <span className="text-muted-foreground">命中力</span><span className="font-medium">{m.baseAccuracy ?? "-"}</span>
          <span className="text-muted-foreground">魔法攻擊</span><span className="font-medium">{m.baseMagicAttack ?? "-"}</span>
          <span className="text-muted-foreground">成長率</span><span className="font-medium">{m.growthRate ?? "-"}</span>
          <span className="text-muted-foreground">AI等級</span><span className="font-medium">{m.aiLevel ?? "-"}</span>
          <span className="text-muted-foreground">捕獲率</span><span className="font-medium">{m.catchRate != null ? `${(m.catchRate * 100).toFixed(0)}%` : "-"}</span>
        </div>
        <h4 className="text-sm font-semibold border-b pb-1 mt-3">🛡️ 抗性</h4>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span className="text-muted-foreground">🌿 抗木</span><span>{m.resistWood ?? 0}%</span>
          <span className="text-muted-foreground">🔥 抗火</span><span>{m.resistFire ?? 0}%</span>
          <span className="text-muted-foreground">🪨 抗土</span><span>{m.resistEarth ?? 0}%</span>
          <span className="text-muted-foreground">⚔️ 抗金</span><span>{m.resistMetal ?? 0}%</span>
          <span className="text-muted-foreground">💧 抗水</span><span>{m.resistWater ?? 0}%</span>
          <span className="text-muted-foreground">被剋加成</span><span>{m.counterBonus ?? 50}%</span>
        </div>
      </div>

      {/* 技能 */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold border-b pb-1">⚡ 魔物技能</h4>
        <div className="space-y-1 text-xs">
          {m.skillId1 && <div className="p-1.5 bg-background rounded border">🔹 {getSkillName(m.skillId1)}</div>}
          {m.skillId2 && <div className="p-1.5 bg-background rounded border">🔹 {getSkillName(m.skillId2)}</div>}
          {m.skillId3 && <div className="p-1.5 bg-background rounded border">🔹 {getSkillName(m.skillId3)}</div>}
          {!m.skillId1 && !m.skillId2 && !m.skillId3 && <span className="text-muted-foreground">無技能</span>}
        </div>
        {m.destinyClue && (
          <>
            <h4 className="text-sm font-semibold border-b pb-1 mt-3">🔮 天命線索</h4>
            <p className="text-xs text-muted-foreground">{m.destinyClue}</p>
          </>
        )}
        {spawnNodes.length > 0 && (
          <>
            <h4 className="text-sm font-semibold border-b pb-1 mt-3">📍 出沒節點</h4>
            <div className="flex flex-wrap gap-1">
              {spawnNodes.map((n: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-background rounded border">{n}</span>)}
            </div>
          </>
        )}
      </div>

      {/* 掉落系統 */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold border-b pb-1">💰 掉落系統</h4>
        <div className="space-y-1 text-xs">
          {[1,2,3,4,5].map(i => {
            const itemId = m[`dropItem${i}`];
            const rate = m[`dropRate${i}`];
            if (!itemId) return null;
            return <div key={i} className="flex justify-between p-1.5 bg-background rounded border"><span>{getItemName(itemId)}</span><span className="text-primary font-medium">{rate}%</span></div>;
          })}
          {m.legendaryDrop && (
            <div className="flex justify-between p-1.5 bg-yellow-500/10 rounded border border-yellow-500/30">
              <span>🌟 {getItemName(m.legendaryDrop)}</span><span className="text-yellow-600 font-medium">{m.legendaryDropRate}%</span>
            </div>
          )}
          {dropGold && <div className="flex justify-between p-1.5 bg-background rounded border"><span>🪙 金幣</span><span>{dropGold.min}-{dropGold.max}</span></div>}
          {!m.dropItem1 && !m.legendaryDrop && !dropGold && <span className="text-muted-foreground">無掉落物</span>}
        </div>
        {m.imageUrl && (
          <>
            <h4 className="text-sm font-semibold border-b pb-1 mt-3">🖼️ 圖片</h4>
            <img src={m.imageUrl} alt={m.name} className="w-24 h-24 object-cover rounded border" />
          </>
        )}
      </div>
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
const ITEM_CAT_FILTER = [{ value: "", label: "全部分類" }, ...ITEM_CAT_OPTS];

export function ItemCatalogV2Tab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [rarity, setRarity] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const queryInput = useMemo(() => ({
    search: search || undefined, wuxing: wuxing || undefined, rarity: rarity || undefined,
    category: category || undefined, page, pageSize,
  }), [search, wuxing, rarity, category, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getItemCatalog.useQuery(queryInput);
  const { data: allMonsters } = trpc.gameCatalog.getAllMonsters.useQuery();
  const exportQuery = trpc.gameCatalog.exportItemCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createItemCatalog.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.itemId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const updateMut = trpc.gameCatalog.updateItemCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const deleteMut = trpc.gameCatalog.deleteItemCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteItems.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateItems.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const bulkImportMut = trpc.gameCatalog.bulkImportItems.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆道具`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

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

  const batchEditFields = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "category", label: "分類", type: "select", options: ITEM_CAT_OPTS },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
    { key: "shopPrice", label: "商店售價", type: "number" },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    ["inNormalShop", "inSpiritShop", "inSecretShop", "isMonsterDrop", "isActive"].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });
    if (editItem) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
  };

  const handleExport = useCallback(async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.data) { if (format === "csv") exportToCSV(result.data, "item_catalog"); else exportToJSON(result.data, "item_catalog"); }
  }, [exportQuery]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const allSelected = items.length > 0 && items.every((m: any) => selectedIds.has(m.id));
  const someSelected = items.some((m: any) => selectedIds.has(m.id));
  const toggleAll = () => { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(items.map((m: any) => m.id))); };
  const toggleOne = (id: number) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const handleBatchDelete = () => { if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆道具？`)) return; batchDeleteMut.mutate({ ids: Array.from(selectedIds) }); };
  const handleBatchEdit = (data: Record<string, any>) => { if (data.isActive !== undefined) data.isActive = Number(data.isActive); batchUpdateMut.mutate({ ids: Array.from(selectedIds), data }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-semibold">🎒 道具圖鑑（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 I_W001）</p></div>
        <div className="flex gap-2 items-center">
          <ExportButtons onCSV={() => handleExport("csv")} onJSON={() => handleExport("json")} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>📥 匯入</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增道具</Button>
        </div>
      </div>
      <FilterBar>
        <div className="flex gap-1 flex-wrap">{WUXING_FILTER.map(w => (<FilterPill key={w.value} label={w.label} active={wuxing === w.value} onClick={() => { setWuxing(w.value); setPage(1); }} />))}</div>
        <div className="flex gap-1 flex-wrap">{RARITY_FILTER.map(r => (<FilterPill key={r.value} label={r.label} active={rarity === r.value} onClick={() => { setRarity(r.value); setPage(1); }} />))}</div>
      </FilterBar>
      <FilterBar>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">
          {ITEM_CAT_FILTER.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋…" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} className="w-40 h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setSearch(searchInput); setPage(1); }}>搜尋</Button>
          {(search || wuxing || rarity || category) && (<Button size="sm" variant="ghost" className="h-7" onClick={() => { setSearch(""); setSearchInput(""); setWuxing(""); setRarity(""); setCategory(""); setPage(1); }}>清除全部</Button>)}
        </div>
      </FilterBar>
      <BatchToolbar selectedCount={selectedIds.size} onBatchDelete={handleBatchDelete} onBatchEdit={() => setBatchEditOpen(true)} onClearSelection={() => setSelectedIds(new Set())} isDeleting={batchDeleteMut.isPending} />
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2">ID</th><th className="text-left py-2 px-2">名稱</th><th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">分類</th><th className="text-left py-2 px-2">稀有度</th><th className="text-left py-2 px-2">售價</th><th className="text-left py-2 px-2">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.itemId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td><td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.category}</td><td className="py-2 px-2 text-xs">{m.rarity}</td><td className="py-2 px-2">{m.shopPrice}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯道具：${editItem.name}` : "新增道具"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="道具圖鑑" />
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
const SLOT_FILTER = [{ value: "", label: "全部部位" }, ...SLOT_OPTS];
const QUALITY_OPTS = [
  { value: "white", label: "⬜ 白" }, { value: "green", label: "🟩 綠" },
  { value: "blue", label: "🟦 藍" }, { value: "purple", label: "🟪 紫" },
  { value: "orange", label: "🟧 橙" }, { value: "red", label: "🟥 紅" },
];
const QUALITY_FILTER = [{ value: "", label: "全部品質" }, ...QUALITY_OPTS];

export function EquipCatalogV2Tab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [rarity, setRarity] = useState("");
  const [slot, setSlot] = useState("");
  const [quality, setQuality] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const queryInput = useMemo(() => ({
    search: search || undefined, wuxing: wuxing || undefined, rarity: rarity || undefined,
    slot: slot || undefined, quality: quality || undefined, page, pageSize,
  }), [search, wuxing, rarity, slot, quality, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getEquipCatalog.useQuery(queryInput);
  const { data: allItems } = trpc.gameCatalog.getAllItems.useQuery();
  const exportQuery = trpc.gameCatalog.exportEquipCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createEquipCatalog.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.equipId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const updateMut = trpc.gameCatalog.updateEquipCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const deleteMut = trpc.gameCatalog.deleteEquipCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteEquips.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateEquips.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const bulkImportMut = trpc.gameCatalog.bulkImportEquipments.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆裝備`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

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

  const batchEditFields = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "slot", label: "部位", type: "select", options: SLOT_OPTS },
    { key: "quality", label: "品質", type: "select", options: QUALITY_OPTS },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
  };

  const handleExport = useCallback(async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.data) { if (format === "csv") exportToCSV(result.data, "equip_catalog"); else exportToJSON(result.data, "equip_catalog"); }
  }, [exportQuery]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const allSelected = items.length > 0 && items.every((m: any) => selectedIds.has(m.id));
  const someSelected = items.some((m: any) => selectedIds.has(m.id));
  const toggleAll = () => { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(items.map((m: any) => m.id))); };
  const toggleOne = (id: number) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const handleBatchDelete = () => { if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆裝備？`)) return; batchDeleteMut.mutate({ ids: Array.from(selectedIds) }); };
  const handleBatchEdit = (data: Record<string, any>) => { if (data.isActive !== undefined) data.isActive = Number(data.isActive); batchUpdateMut.mutate({ ids: Array.from(selectedIds), data }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-semibold">⚔️ 裝備圖鑑（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 E_W001）</p></div>
        <div className="flex gap-2 items-center">
          <ExportButtons onCSV={() => handleExport("csv")} onJSON={() => handleExport("json")} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>📥 匯入</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增裝備</Button>
        </div>
      </div>
      <FilterBar>
        <div className="flex gap-1 flex-wrap">{WUXING_FILTER.map(w => (<FilterPill key={w.value} label={w.label} active={wuxing === w.value} onClick={() => { setWuxing(w.value); setPage(1); }} />))}</div>
        <div className="flex gap-1 flex-wrap">{RARITY_FILTER.map(r => (<FilterPill key={r.value} label={r.label} active={rarity === r.value} onClick={() => { setRarity(r.value); setPage(1); }} />))}</div>
      </FilterBar>
      <FilterBar>
        <select value={slot} onChange={e => { setSlot(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{SLOT_FILTER.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select value={quality} onChange={e => { setQuality(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{QUALITY_FILTER.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}</select>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} className="w-40 h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setSearch(searchInput); setPage(1); }}>搜尋</Button>
          {(search || wuxing || rarity || slot || quality) && (<Button size="sm" variant="ghost" className="h-7" onClick={() => { setSearch(""); setSearchInput(""); setWuxing(""); setRarity(""); setSlot(""); setQuality(""); setPage(1); }}>清除全部</Button>)}
        </div>
      </FilterBar>
      <BatchToolbar selectedCount={selectedIds.size} onBatchDelete={handleBatchDelete} onBatchEdit={() => setBatchEditOpen(true)} onClearSelection={() => setSelectedIds(new Set())} isDeleting={batchDeleteMut.isPending} />
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2">ID</th><th className="text-left py-2 px-2">名稱</th><th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">部位</th><th className="text-left py-2 px-2">品質</th><th className="text-left py-2 px-2">攻擊</th><th className="text-left py-2 px-2">防禦</th><th className="text-left py-2 px-2">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.equipId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td><td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.slot}</td><td className="py-2 px-2 text-xs">{m.quality}</td>
                  <td className="py-2 px-2">{m.attackBonus}</td><td className="py-2 px-2">{m.defenseBonus}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯裝備：${editItem.name}` : "新增裝備"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="裝備圖鑑" />
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
const SKILL_CAT_FILTER = [{ value: "", label: "全部分類" }, ...SKILL_CAT_OPTS];
const SKILL_TYPE_OPTS = [
  { value: "attack", label: "攻擊" }, { value: "heal", label: "治療" },
  { value: "buff", label: "增益" }, { value: "debuff", label: "減益" },
  { value: "passive", label: "被動" }, { value: "special", label: "特殊" },
];
const SKILL_TYPE_FILTER = [{ value: "", label: "全部類型" }, ...SKILL_TYPE_OPTS];
const ACQUIRE_TYPE_OPTS = [
  { value: "shop", label: "商店" }, { value: "drop", label: "掉落" },
  { value: "quest", label: "任務" }, { value: "craft", label: "製作" },
  { value: "hidden", label: "隱藏" },
];

export function SkillCatalogV2Tab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [rarity, setRarity] = useState("");
  const [category, setCategory] = useState("");
  const [skillType, setSkillType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const queryInput = useMemo(() => ({
    search: search || undefined, wuxing: wuxing || undefined, rarity: rarity || undefined,
    category: category || undefined, skillType: skillType || undefined, page, pageSize,
  }), [search, wuxing, rarity, category, skillType, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getSkillCatalog.useQuery(queryInput);
  const { data: allMonsters } = trpc.gameCatalog.getAllMonsters.useQuery();
  const exportQuery = trpc.gameCatalog.exportSkillCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createSkillCatalog.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.skillId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const updateMut = trpc.gameCatalog.updateSkillCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const deleteMut = trpc.gameCatalog.deleteSkillCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteSkills.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateSkills.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const bulkImportMut = trpc.gameCatalog.bulkImportSkills.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆技能`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

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

  const batchEditFields = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "category", label: "分類", type: "select", options: SKILL_CAT_OPTS },
    { key: "skillType", label: "技能類型", type: "select", options: SKILL_TYPE_OPTS },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
  };

  const handleExport = useCallback(async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.data) { if (format === "csv") exportToCSV(result.data, "skill_catalog"); else exportToJSON(result.data, "skill_catalog"); }
  }, [exportQuery]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const allSelected = items.length > 0 && items.every((m: any) => selectedIds.has(m.id));
  const someSelected = items.some((m: any) => selectedIds.has(m.id));
  const toggleAll = () => { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(items.map((m: any) => m.id))); };
  const toggleOne = (id: number) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const handleBatchDelete = () => { if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆技能？`)) return; batchDeleteMut.mutate({ ids: Array.from(selectedIds) }); };
  const handleBatchEdit = (data: Record<string, any>) => { if (data.isActive !== undefined) data.isActive = Number(data.isActive); batchUpdateMut.mutate({ ids: Array.from(selectedIds), data }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-semibold">✨ 技能圖鑑（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 S_W001）</p></div>
        <div className="flex gap-2 items-center">
          <ExportButtons onCSV={() => handleExport("csv")} onJSON={() => handleExport("json")} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>📥 匯入</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增技能</Button>
        </div>
      </div>
      <FilterBar>
        <div className="flex gap-1 flex-wrap">{WUXING_FILTER.map(w => (<FilterPill key={w.value} label={w.label} active={wuxing === w.value} onClick={() => { setWuxing(w.value); setPage(1); }} />))}</div>
        <div className="flex gap-1 flex-wrap">{RARITY_FILTER.map(r => (<FilterPill key={r.value} label={r.label} active={rarity === r.value} onClick={() => { setRarity(r.value); setPage(1); }} />))}</div>
      </FilterBar>
      <FilterBar>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{SKILL_CAT_FILTER.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        <select value={skillType} onChange={e => { setSkillType(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{SKILL_TYPE_FILTER.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} className="w-40 h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setSearch(searchInput); setPage(1); }}>搜尋</Button>
          {(search || wuxing || rarity || category || skillType) && (<Button size="sm" variant="ghost" className="h-7" onClick={() => { setSearch(""); setSearchInput(""); setWuxing(""); setRarity(""); setCategory(""); setSkillType(""); setPage(1); }}>清除全部</Button>)}
        </div>
      </FilterBar>
      <BatchToolbar selectedCount={selectedIds.size} onBatchDelete={handleBatchDelete} onBatchEdit={() => setBatchEditOpen(true)} onClearSelection={() => setSelectedIds(new Set())} isDeleting={batchDeleteMut.isPending} />
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2">ID</th><th className="text-left py-2 px-2">名稱</th><th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">類型</th><th className="text-left py-2 px-2">威力%</th><th className="text-left py-2 px-2">MP</th><th className="text-left py-2 px-2">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.skillId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td><td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.skillType}</td><td className="py-2 px-2">{m.powerPercent}%</td><td className="py-2 px-2">{m.mpCost}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯技能：${editItem.name}` : "新增技能"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="技能圖鑑" />
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
const ACH_CAT_FILTER = [{ value: "", label: "全部分類" }, ...ACH_CAT_OPTS];
const REWARD_TYPE_OPTS = [
  { value: "stones", label: "靈石" }, { value: "coins", label: "金幣" },
  { value: "title", label: "稱號" }, { value: "item", label: "道具" },
  { value: "frame", label: "邊框" }, { value: "skill", label: "技能" },
];

export function AchievementCatalogTab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [rarity, setRarity] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const queryInput = useMemo(() => ({
    search: search || undefined, category: category || undefined, rarity: rarity || undefined, page, pageSize,
  }), [search, category, rarity, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getAchievementCatalog.useQuery(queryInput);
  const exportQuery = trpc.gameCatalog.exportAchievementCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createAchievement.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.achId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const updateMut = trpc.gameCatalog.updateAchievementCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const deleteMut = trpc.gameCatalog.deleteAchievementCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteAchievements.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateAchievements.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const bulkImportMut = trpc.gameCatalog.bulkImportAchievements.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆成就`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

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

  const batchEditFields = [
    { key: "category", label: "分類", type: "select", options: ACH_CAT_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
    { key: "rewardAmount", label: "獎勵數量", type: "number" },
  ];

  const handleSubmit = (data: any) => {
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
  };

  const handleExport = useCallback(async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.data) { if (format === "csv") exportToCSV(result.data, "achievement_catalog"); else exportToJSON(result.data, "achievement_catalog"); }
  }, [exportQuery]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const allSelected = items.length > 0 && items.every((m: any) => selectedIds.has(m.id));
  const someSelected = items.some((m: any) => selectedIds.has(m.id));
  const toggleAll = () => { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(items.map((m: any) => m.id))); };
  const toggleOne = (id: number) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const handleBatchDelete = () => { if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆成就？`)) return; batchDeleteMut.mutate({ ids: Array.from(selectedIds) }); };
  const handleBatchEdit = (data: Record<string, any>) => { if (data.isActive !== undefined) data.isActive = Number(data.isActive); batchUpdateMut.mutate({ ids: Array.from(selectedIds), data }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-semibold">🏆 成就系統（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 ACH_001）</p></div>
        <div className="flex gap-2 items-center">
          <ExportButtons onCSV={() => handleExport("csv")} onJSON={() => handleExport("json")} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>📥 匯入</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增成就</Button>
        </div>
      </div>
      <FilterBar>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{ACH_CAT_FILTER.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        <div className="flex gap-1 flex-wrap">{RARITY_FILTER.map(r => (<FilterPill key={r.value} label={r.label} active={rarity === r.value} onClick={() => { setRarity(r.value); setPage(1); }} />))}</div>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} className="w-40 h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setSearch(searchInput); setPage(1); }}>搜尋</Button>
          {(search || category || rarity) && (<Button size="sm" variant="ghost" className="h-7" onClick={() => { setSearch(""); setSearchInput(""); setCategory(""); setRarity(""); setPage(1); }}>清除全部</Button>)}
        </div>
      </FilterBar>
      <BatchToolbar selectedCount={selectedIds.size} onBatchDelete={handleBatchDelete} onBatchEdit={() => setBatchEditOpen(true)} onClearSelection={() => setSelectedIds(new Set())} isDeleting={batchDeleteMut.isPending} />
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2">ID</th><th className="text-left py-2 px-2">名稱</th><th className="text-left py-2 px-2">分類</th>
                <th className="text-left py-2 px-2">稀有度</th><th className="text-left py-2 px-2">獎勵</th><th className="text-left py-2 px-2">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.achId}</td>
                  <td className="py-2 px-2 font-medium">{m.title}</td><td className="py-2 px-2 text-xs">{m.category}</td>
                  <td className="py-2 px-2 text-xs">{m.rarity}</td><td className="py-2 px-2 text-xs">{m.rewardType} x{m.rewardAmount}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.title}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯成就：${editItem.title}` : "新增成就"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="成就系統" />
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
const MS_TYPE_FILTER = [{ value: "", label: "全部類型" }, ...MS_TYPE_OPTS];

export function MonsterSkillCatalogTab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [rarity, setRarity] = useState("");
  const [skillType, setSkillType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const queryInput = useMemo(() => ({
    search: search || undefined, wuxing: wuxing || undefined, rarity: rarity || undefined,
    skillType: skillType || undefined, page, pageSize,
  }), [search, wuxing, rarity, skillType, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getMonsterSkillCatalog.useQuery(queryInput);
  const exportQuery = trpc.gameCatalog.exportMonsterSkillCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createMonsterSkill.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.monsterSkillId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const updateMut = trpc.gameCatalog.updateMonsterSkill.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const deleteMut = trpc.gameCatalog.deleteMonsterSkill.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteMonsterSkills.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateMonsterSkills.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(`${e.message}`) });
  const bulkImportMut = trpc.gameCatalog.bulkImportMonsterSkills.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆魔物技能`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

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

  const batchEditFields = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "skillType", label: "類型", type: "select", options: MS_TYPE_OPTS },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
    { key: "powerPercent", label: "威力%", type: "number" },
    { key: "mpCost", label: "MP消耗", type: "number" },
  ];

  const handleSubmit = (data: any) => {
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
  };

  const handleExport = useCallback(async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.data) { if (format === "csv") exportToCSV(result.data, "monster_skill_catalog"); else exportToJSON(result.data, "monster_skill_catalog"); }
  }, [exportQuery]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const allSelected = items.length > 0 && items.every((m: any) => selectedIds.has(m.id));
  const someSelected = items.some((m: any) => selectedIds.has(m.id));
  const toggleAll = () => { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(items.map((m: any) => m.id))); };
  const toggleOne = (id: number) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const handleBatchDelete = () => { if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆魔物技能？`)) return; batchDeleteMut.mutate({ ids: Array.from(selectedIds) }); };
  const handleBatchEdit = (data: Record<string, any>) => { if (data.isActive !== undefined) data.isActive = Number(data.isActive); batchUpdateMut.mutate({ ids: Array.from(selectedIds), data }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-semibold">🐲 魔物技能圖鑑（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 SK_M001）</p></div>
        <div className="flex gap-2 items-center">
          <ExportButtons onCSV={() => handleExport("csv")} onJSON={() => handleExport("json")} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>📥 匯入</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增魔物技能</Button>
        </div>
      </div>
      <FilterBar>
        <div className="flex gap-1 flex-wrap">{WUXING_FILTER.map(w => (<FilterPill key={w.value} label={w.label} active={wuxing === w.value} onClick={() => { setWuxing(w.value); setPage(1); }} />))}</div>
        <div className="flex gap-1 flex-wrap">{RARITY_FILTER.map(r => (<FilterPill key={r.value} label={r.label} active={rarity === r.value} onClick={() => { setRarity(r.value); setPage(1); }} />))}</div>
      </FilterBar>
      <FilterBar>
        <select value={skillType} onChange={e => { setSkillType(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{MS_TYPE_FILTER.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} className="w-40 h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setSearch(searchInput); setPage(1); }}>搜尋</Button>
          {(search || wuxing || rarity || skillType) && (<Button size="sm" variant="ghost" className="h-7" onClick={() => { setSearch(""); setSearchInput(""); setWuxing(""); setRarity(""); setSkillType(""); setPage(1); }}>清除全部</Button>)}
        </div>
      </FilterBar>
      <BatchToolbar selectedCount={selectedIds.size} onBatchDelete={handleBatchDelete} onBatchEdit={() => setBatchEditOpen(true)} onClearSelection={() => setSelectedIds(new Set())} isDeleting={batchDeleteMut.isPending} />
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2">ID</th><th className="text-left py-2 px-2">名稱</th><th className="text-left py-2 px-2">五行</th>
                <th className="text-left py-2 px-2">類型</th><th className="text-left py-2 px-2">威力%</th><th className="text-left py-2 px-2">MP</th><th className="text-left py-2 px-2">冷卻</th><th className="text-left py-2 px-2">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.monsterSkillId}</td>
                  <td className="py-2 px-2 font-medium">{m.name}</td><td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.skillType}</td><td className="py-2 px-2">{m.powerPercent}%</td>
                  <td className="py-2 px-2">{m.mpCost}</td><td className="py-2 px-2">{m.cooldown}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯魔物技能：${editItem.name}` : "新增魔物技能"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="魔物技能圖鑑" />
    </div>
  );
}
