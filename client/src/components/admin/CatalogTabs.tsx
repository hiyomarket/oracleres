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
import {
  RewardEditor,
  ConditionEditor,
  SkillEffectEditor,
  AiConditionEditor,
  ResistEditor,
  AffixEditor,
  MaterialEditor,
  UseEffectEditor,
  GatherEditor,
  HiddenTriggerEditor,
  SpawnNodeEditor,
} from "./SmartEditors";

/** 解析 tRPC/zod 錯誤訊息為友善的中文提示 */
function friendlyError(e: { message: string }): string {
  const msg = e.message;
  // 嘗試解析 zod 驗證錯誤 JSON
  try {
    const arr = JSON.parse(msg);
    if (Array.isArray(arr)) {
      const labels: Record<string, string> = {
        too_small: "值太小", too_big: "值太大", invalid_type: "類型錯誤",
        invalid_enum_value: "不合法的選項", invalid_string: "格式錯誤",
      };
      const fieldMap: Record<string, string> = {
        baseHp: "HP", baseAttack: "攻擊", baseDefense: "防禦", baseSpeed: "速度",
        aiLevel: "AI等級", growthRate: "成長率", rarity: "稀有度",
        wuxing: "五行", name: "名稱", shopPrice: "售價", mpCost: "MP消耗",
        powerPercent: "威力%", cooldown: "冷卻", isActive: "啟用狀態",
        catchRate: "捕獲率", actionsPerTurn: "每回合行動數",
      };
      return arr.map((err: any) => {
        const field = err.path?.join(".") ?? "";
        const fieldLabel = fieldMap[field.replace("data.", "")] ?? field;
        const codeLabel = labels[err.code] ?? err.code;
        if (err.code === "too_small") return `${fieldLabel} ${codeLabel}（最小 ${err.minimum}）`;
        if (err.code === "too_big") return `${fieldLabel} ${codeLabel}（最大 ${err.maximum}）`;
        if (err.code === "invalid_enum_value") return `${fieldLabel} ${codeLabel}：${err.received}`;
        return `${fieldLabel} ${codeLabel}`;
      }).join("；");
    }
  } catch {}
  // 非 JSON 錯誤，直接回傳
  return msg;
}

/** 通用 AI 生圖按鈕 */
function AiImageBtn({ type, id, name, hasImage, onSuccess }: { type: "item" | "equipment" | "skill" | "monster" | "achievement" | "boss"; id: string | number; name: string; hasImage: boolean; onSuccess: () => void }) {
  const itemMut = trpc.gameAI.aiGenerateItemImage.useMutation({ onSuccess: (r: any) => { toast.success(`✅ ${r.name} 圖片已生成`); onSuccess(); }, onError: (e: any) => toast.error(`生圖失敗: ${e.message}`) });
  const equipMut = trpc.gameAI.aiGenerateEquipImage.useMutation({ onSuccess: (r: any) => { toast.success(`✅ ${r.name} 圖片已生成`); onSuccess(); }, onError: (e: any) => toast.error(`生圖失敗: ${e.message}`) });
  const skillMut = trpc.gameAI.aiGenerateSkillImage.useMutation({ onSuccess: (r: any) => { toast.success(`✅ ${r.name} 圖片已生成`); onSuccess(); }, onError: (e: any) => toast.error(`生圖失敗: ${e.message}`) });
  const monsterMut = trpc.gameAI.aiGenerateMonsterImage.useMutation({ onSuccess: (r: any) => { toast.success(`✅ ${r.name} 圖片已生成`); onSuccess(); }, onError: (e: any) => toast.error(`生圖失敗: ${e.message}`) });
  const achievementMut = trpc.gameAI.aiGenerateAchievementImage.useMutation({ onSuccess: (r: any) => { toast.success(`✅ ${r.name} 圖片已生成`); onSuccess(); }, onError: (e: any) => toast.error(`生圖失敗: ${e.message}`) });
  const bossMut = trpc.gameAI.aiGenerateBossImage.useMutation({ onSuccess: (r: any) => { toast.success(`✅ ${r.name} 圖片已生成`); onSuccess(); }, onError: (e: any) => toast.error(`生圖失敗: ${e.message}`) });
  const isPending = itemMut.isPending || equipMut.isPending || skillMut.isPending || monsterMut.isPending || achievementMut.isPending || bossMut.isPending;
  const handleClick = () => {
    if (type === "item") itemMut.mutate({ itemId: String(id) });
    else if (type === "equipment") equipMut.mutate({ equipId: String(id) });
    else if (type === "skill") skillMut.mutate({ skillId: String(id) });
    else if (type === "monster") monsterMut.mutate({ monsterId: String(id) });
    else if (type === "achievement") achievementMut.mutate({ achievementId: Number(id) });
    else if (type === "boss") bossMut.mutate({ bossId: Number(id) });
  };
  return <Button size="sm" variant="ghost" className={`h-6 px-2 text-xs ${hasImage ? "text-green-500" : "text-amber-500"}`} title={hasImage ? "重新生成圖片" : "生成圖片"} onClick={handleClick} disabled={isPending}>{isPending ? "⏳" : (hasImage ? "🖼️" : "🎨")}</Button>;
}

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
  { value: "uncommon", label: "稀有" },
  { value: "rare", label: "精良" },
  { value: "epic", label: "史詩" },
  { value: "legendary", label: "傳說" },
];

const WUXING_FILTER = [{ value: "", label: "全部" }, ...WUXING_OPTS];
const RARITY_FILTER = [{ value: "", label: "全部稀有度" }, ...RARITY_OPTS];

// 種族中文標籤
const SPECIES_LABELS: Record<string, string> = {
  beast: "獸類", humanoid: "人形", plant: "植物", undead: "不死",
  dragon: "龍族", flying: "飛行", insect: "蟲類", special: "特殊",
  metal: "金屬", demon: "邪魔",
};

// 五行分配條形圖組件
function WuxingBar({ wood = 0, fire = 0, earth = 0, metal = 0, water = 0 }: {
  wood?: number; fire?: number; earth?: number; metal?: number; water?: number;
}) {
  const bars = [
    { val: wood, color: "#22C55E", label: "木" },
    { val: fire, color: "#EF4444", label: "火" },
    { val: earth, color: "#D97706", label: "土" },
    { val: metal, color: "#9CA3AF", label: "金" },
    { val: water, color: "#3B82F6", label: "水" },
  ].filter(b => b.val > 0);
  return (
    <div className="flex h-3 w-24 rounded-sm overflow-hidden" title={bars.map(b => `${b.label}${b.val}%`).join(" ")}>
      {bars.map(b => (
        <div key={b.label} style={{ width: `${b.val}%`, backgroundColor: b.color }} className="h-full" />
      ))}
    </div>
  );
}

// 稀有度徽章組件
function RarityBadge({ rarity }: { rarity: string }) {
  const styles: Record<string, string> = {
    common: "bg-gray-500/20 text-gray-400",
    uncommon: "bg-green-500/20 text-green-400",
    rare: "bg-blue-500/20 text-blue-400",
    epic: "bg-purple-500/20 text-purple-400",
    legendary: "bg-amber-500/20 text-amber-400",
  };
  const labels: Record<string, string> = {
    common: "普通", uncommon: "稀有", rare: "精良", epic: "史詩", legendary: "傳說",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${styles[rarity] || "bg-muted text-muted-foreground"}`}>
      {labels[rarity] || rarity}
    </span>
  );
}

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
  return <div className="flex gap-2 mb-4 flex-wrap items-center max-sm:gap-1">{children}</div>;
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
// 各圖鑑的 CSV 模板定義
const CSV_TEMPLATES: Record<string, { headers: string[]; example: string[] }> = {
  "魔物圖鑑": {
    headers: ["monsterId", "name", "element", "rarity", "level", "hp", "attack", "defense", "speed", "magicAttack", "description", "dropItem", "dropGold", "expReward"],
    example: ["M_W001", "木靈鼠", "木", "common", "1", "50", "8", "3", "5", "2", "森林中常見的小型魔物", "herb-001", "10", "5"],
  },
  "道具圖鑑": {
    headers: ["itemId", "name", "element", "rarity", "itemType", "effect", "shopPrice", "stackable"],
    example: ["I_W001", "回春草", "木", "common", "consumable", "恢復 50 HP", "100", "1"],
  },
  "裝備圖鑑": {
    headers: ["equipId", "name", "element", "rarity", "slot", "attackBonus", "defenseBonus", "speedBonus", "quality", "description"],
    example: ["E_W001", "翠玉木劍", "木", "rare", "weapon", "15", "0", "3", "fine", "以翠玉打造的木屬性劍"],
  },
  "技能圖鑑": {
    headers: ["skillId", "name", "element", "rarity", "category", "skillType", "mpCost", "cooldown", "baseDamage", "description"],
    example: ["S_W001", "翠葉斬", "木", "common", "attack", "active", "10", "1", "25", "以銳利的木葉攻擊敵人"],
  },
  "成就圖鑑": {
    headers: ["title", "description", "category", "rarity", "rewardPoints", "isActive"],
    example: ["初出茅廠", "完成第一次戰鬥", "combat", "common", "10", "1"],
  },
  "魔物技能圖鑑": {
    headers: ["skillId", "name", "element", "skillType", "baseDamage", "mpCost", "cooldown", "description"],
    example: ["MS_W001", "木屬性撞擊", "木", "physical", "20", "0", "1", "用身體撞擊敵人"],
  },
};

function downloadCsvTemplate(catalogName: string) {
  const tpl = CSV_TEMPLATES[catalogName];
  if (!tpl) return;
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const csv = bom + tpl.headers.join(",") + "\n" + tpl.example.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${catalogName}_匯入範本.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
              <span className="text-sm">選擇檔案</span>
              <input type="file" accept=".csv,.json" onChange={handleFile} className="hidden" />
            </label>
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            {CSV_TEMPLATES[catalogName] && (
              <Button variant="outline" size="sm" onClick={() => downloadCsvTemplate(catalogName)} className="gap-1">
                ⬇️ 下載 CSV 範本
              </Button>
            )}
          </div>
          {CSV_TEMPLATES[catalogName] && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-semibold mb-1">欄位說明：</p>
              <code className="text-[10px] break-all">{CSV_TEMPLATES[catalogName].headers.join(", ")}</code>
            </div>
          )}
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

// ===== 快捷上架商店 Modal =====
function QuickShopListModal({ open, onClose, itemKey, displayName }: {
  open: boolean; onClose: () => void;
  itemKey: string; displayName: string;
}) {
  const [shopType, setShopType] = useState<"normal" | "spirit">("normal");
  const [priceCoins, setPriceCoins] = useState(100);
  const [priceStones, setPriceStones] = useState(10);
  const [stock, setStock] = useState(-1);
  const [purchaseLimit, setPurchaseLimit] = useState(0);
  const [maxPerOrder, setMaxPerOrder] = useState(99);
  const [quantity, setQuantity] = useState(1);

  const quickListMut = trpc.gameAdmin.quickListToShop.useMutation({
    onSuccess: (r) => {
      toast.success(`✅ 已上架到${r.shopType === "normal" ? "一般" : "靈石"}商店！`);
      onClose();
    },
    onError: (e) => toast.error(`上架失敗：${e.message}`),
  });

  const handleSubmit = () => {
    quickListMut.mutate({
      shopType,
      itemKey,
      displayName,
      priceCoins: shopType === "normal" ? priceCoins : 0,
      priceStones: shopType === "spirit" ? priceStones : 0,
      stock,
      purchaseLimit,
      maxPerOrder,
      quantity,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>🛒 快捷上架商店</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">將「{displayName}」上架到商店</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <button onClick={() => setShopType("normal")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${shopType === "normal" ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-muted border-transparent text-muted-foreground"}`}>
              💰 一般商店
            </button>
            <button onClick={() => setShopType("spirit")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${shopType === "spirit" ? "bg-purple-500/20 border-purple-500 text-purple-400" : "bg-muted border-transparent text-muted-foreground"}`}>
              💎 靈石商店
            </button>
          </div>
          {shopType === "normal" ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">金幣售價</label>
              <Input type="number" value={priceCoins} onChange={e => setPriceCoins(Number(e.target.value))} min={0} className="h-8 text-sm" />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">靈石售價</label>
              <Input type="number" value={priceStones} onChange={e => setPriceStones(Number(e.target.value))} min={0} className="h-8 text-sm" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">庫存（-1 = 無限）</label>
              <Input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">每人限購</label>
              <Input type="number" value={purchaseLimit} onChange={e => setPurchaseLimit(Number(e.target.value))} min={0} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">每次最多買</label>
              <Input type="number" value={maxPerOrder} onChange={e => setMaxPerOrder(Number(e.target.value))} min={1} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">每份數量</label>
              <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} className="h-8 text-sm" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            <p>商品 ID：<span className="font-mono text-primary">{itemKey}</span></p>
            <p className="mt-0.5">上架後可在商店管理頁面編輯或下架</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} disabled={quickListMut.isPending}>
            {quickListMut.isPending ? "上架中…" : "確認上架"}
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
    onError: (e) => toast.error(friendlyError(e)),
  });
  const updateMut = trpc.gameCatalog.updateMonsterCatalog.useMutation({
    onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const deleteMut = trpc.gameCatalog.deleteMonsterCatalog.useMutation({
    onSuccess: () => { toast.success("已刪除"); refetch(); },
  });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteMonsters.useMutation({
    onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateMonsters.useMutation({
    onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const bulkImportMut = trpc.gameCatalog.bulkImportMonsters.useMutation({
    onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆魔物`); setImportOpen(false); refetch(); },
    onError: (e) => toast.error(`匯入失敗：${e.message}`),
  });

  const skillOpts = (monsterSkills ?? []).map((s: any) => ({ value: s.skillId, label: `${s.skillId} ${s.name}（${s.wuxing}）` }));
  const itemOpts = (allItems ?? []).map((i: any) => ({ value: i.itemId, label: `${i.itemId} ${i.name}（${i.wuxing}）` }));

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true, placeholder: "輸入怪物名稱" },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS, defaultValue: "木" },
    { key: "levelRange", label: "等級範圍", type: "text", defaultValue: "1-5", placeholder: "如 1-5" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "baseHp", label: "HP", type: "number", defaultValue: 100, group: "基礎屬性" },
    { key: "baseAttack", label: "攻擊", type: "number", defaultValue: 10, group: "基礎屬性" },
    { key: "baseDefense", label: "防禦", type: "number", defaultValue: 5, group: "基礎屬性" },
    { key: "baseSpeed", label: "速度", type: "number", defaultValue: 5, group: "基礎屬性" },
    { key: "baseAccuracy", label: "命中力", type: "number", defaultValue: 80, group: "基礎屬性" },
    { key: "baseMagicAttack", label: "魔法攻擊", type: "number", defaultValue: 8, group: "基礎屬性" },
    { key: "baseMp", label: "MP", type: "number", defaultValue: 30, group: "基礎屬性" },
    { key: "baseMagicDefense", label: "魔法防禦", type: "number", defaultValue: 5, group: "基礎屬性" },
    { key: "baseHealPower", label: "回復力", type: "number", defaultValue: 0, group: "基礎屬性" },
    { key: "baseCritRate", label: "暴擊率%", type: "number", defaultValue: 5, step: 0.1, group: "基礎屬性" },
    { key: "baseCritDamage", label: "暴擊傷害%", type: "number", defaultValue: 150, step: 1, group: "基礎屬性" },
    { key: "species", label: "種族", type: "select", options: [
      { value: "humanoid", label: "人形" },
      { value: "beast", label: "獸類" },
      { value: "plant", label: "植物" },
      { value: "undead", label: "不死" },
      { value: "dragon", label: "龍族" },
      { value: "flying", label: "飛行" },
      { value: "insect", label: "蟲類" },
      { value: "special", label: "特殊" },
      { value: "metal", label: "金屬" },
      { value: "demon", label: "邪魔" },
    ], defaultValue: "beast", group: "基礎屬性" },
    { key: "realm", label: "境界", type: "select", options: [
      { value: "初界", label: "初界" },
      { value: "中界", label: "中界" },
      { value: "高界", label: "高界" },
    ], defaultValue: "初界", group: "基礎屬性" },
    { key: "realmMultiplier", label: "境界倍率", type: "number", defaultValue: 1.0, step: 0.1, min: 0.5, max: 5, group: "基礎屬性" },
    { key: "wuxingWood", label: "五行-木%", type: "number", defaultValue: 20, min: 0, max: 100, group: "五行分配" },
    { key: "wuxingFire", label: "五行-火%", type: "number", defaultValue: 20, min: 0, max: 100, group: "五行分配" },
    { key: "wuxingEarth", label: "五行-土%", type: "number", defaultValue: 20, min: 0, max: 100, group: "五行分配" },
    { key: "wuxingMetal", label: "五行-金%", type: "number", defaultValue: 20, min: 0, max: 100, group: "五行分配" },
    { key: "wuxingWater", label: "五行-水%", type: "number", defaultValue: 20, min: 0, max: 100, group: "五行分配" },
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
    { key: "dropGold", label: "掉落金幣", type: "custom", defaultValue: { min: 5, max: 15 }, group: "掉落系統", skipParse: true,
      render: (val, onChange) => {
        const g = (typeof val === "object" && val) ? val : { min: 5, max: 15 };
        return (
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium">掉落金幣範圍</label>
            <div className="flex gap-2 items-center">
              <input type="number" value={g.min ?? 0} onChange={e => onChange({ ...g, min: Number(e.target.value) })} className="h-8 w-24 text-xs rounded border bg-background px-2" placeholder="最小" />
              <span className="text-xs text-muted-foreground">～</span>
              <input type="number" value={g.max ?? 0} onChange={e => onChange({ ...g, max: Number(e.target.value) })} className="h-8 w-24 text-xs rounded border bg-background px-2" placeholder="最大" />
              <span className="text-xs text-muted-foreground">金幣</span>
            </div>
          </div>
        );
      }
    },
    { key: "legendaryDrop", label: "傳說掉落", type: "linkedSelect", linkedOptions: itemOpts, defaultValue: "", group: "掉落系統" },
    { key: "legendaryDropRate", label: "傳說掉落率%", type: "number", defaultValue: 0, group: "掉落系統" },
    { key: "spawnNodes", label: "出沒節點", type: "custom", defaultValue: [], group: "其他", skipParse: true,
      render: (val, onChange) => <SpawnNodeEditor value={val ?? []} onChange={onChange} />
    },
    { key: "destinyClue", label: "天命線索", type: "textarea", group: "其他" },
    { key: "imageUrl", label: "圖片URL", type: "text", group: "其他" },
    { key: "catchRate", label: "捕獲率 (0-1)", type: "number", defaultValue: 0.1, step: 0.01, min: 0, max: 1, group: "其他" },
    { key: "actionsPerTurn", label: "每回合動作次數", type: "number", defaultValue: 1, min: 1, max: 5, group: "其他" },
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
    if (editItem && editItem.id != null) updateMut.mutate({ id: editItem.id, data });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h2 className="text-lg font-semibold">🐉 魔物圖鑑（{total}）</h2>
          <p className="text-xs text-muted-foreground">新增時自動生成 ID（如 M_W001）</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
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
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">ID</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">名稱</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">五行</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">種族</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">五行分配</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">等級</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">HP</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">攻</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">稀有度</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">捕捉</th>
                  <th className="text-left py-2 px-2 whitespace-nowrap">操作</th>
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
                      <td className="py-2 px-2 text-xs">{SPECIES_LABELS[m.species] || m.species}</td>
                      <td className="py-2 px-2"><WuxingBar wood={m.wuxingWood} fire={m.wuxingFire} earth={m.wuxingEarth} metal={m.wuxingMetal} water={m.wuxingWater} /></td>
                      <td className="py-2 px-2 text-xs">{m.levelRange}</td>
                      <td className="py-2 px-2">{m.baseHp}</td>
                      <td className="py-2 px-2">{m.baseAttack}</td>
                      <td className="py-2 px-2 text-xs"><RarityBadge rarity={m.rarity} /></td>
                      <td className="py-2 px-2 text-xs">{m.isCapturable ? `${m.baseCaptureRate}%` : '❌'}</td>
                      <td className="py-2 px-2 space-x-1" onClick={e => e.stopPropagation()}>
                        <AiImageBtn type="monster" id={m.monsterId} name={m.name} hasImage={!!m.imageUrl} onSuccess={() => refetch()} />
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="複製" onClick={() => { const copy = { ...m }; delete copy.id; copy.name = `${m.name}(複製)`; setEditItem(null); setFormOpen(true); setTimeout(() => setEditItem(copy as any), 50); toast.info(`已複製「${m.name}」，請修改後儲存`); }}>📋</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                      </td>
                    </tr>
                    {expandedId === m.id && (
                      <tr className="bg-muted/20">
                        <td colSpan={13} className="p-4">
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
        onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} catalogType="monster" />
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
  { value: "material", label: "一般素材" },
  { value: "consumable", label: "消耗品" },
  { value: "quest", label: "任務道具" },
  { value: "treasure", label: "珍寶天命" },
  { value: "skillbook", label: "技能書" },
  { value: "equipment_material", label: "裝備材料" },
  { value: "scroll", label: "卷軸" },
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
  const [quickShopItem, setQuickShopItem] = useState<{ itemKey: string; displayName: string } | null>(null);

  const queryInput = useMemo(() => ({
    search: search || undefined, wuxing: wuxing || undefined, rarity: rarity || undefined,
    category: category || undefined, page, pageSize,
  }), [search, wuxing, rarity, category, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getItemCatalog.useQuery(queryInput);
  const { data: allMonsters } = trpc.gameCatalog.getAllMonsters.useQuery();
  const exportQuery = trpc.gameCatalog.exportItemCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createItemCatalog.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.itemId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const updateMut = trpc.gameCatalog.updateItemCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const deleteMut = trpc.gameCatalog.deleteItemCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteItems.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateItems.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const bulkImportMut = trpc.gameCatalog.bulkImportItems.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆道具`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

  const monsterOpts = (allMonsters ?? []).map((m: any) => ({ value: m.monsterId, label: `${m.monsterId} ${m.name}（${m.wuxing}）` }));

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS, defaultValue: "木" },
    { key: "category", label: "分類", type: "select", options: ITEM_CAT_OPTS, defaultValue: "material_basic" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "stackLimit", label: "疊加上限", type: "number", defaultValue: 99 },
    { key: "stackable", label: "可疊加", type: "select", options: [{ value: "1", label: "✅ 可疊加" }, { value: "0", label: "🔒 不可疊加（裝備類）" }], defaultValue: "1" },
    { key: "shopPrice", label: "商店售價", type: "number", defaultValue: 0, group: "商店分配" },
    { key: "inNormalShop", label: "一般商店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "inSpiritShop", label: "靈相商店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "inSecretShop", label: "密店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "isMonsterDrop", label: "怪物掉落", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "掉落來源" },
    { key: "dropMonsterId", label: "掉落怪物", type: "linkedSelect", linkedOptions: monsterOpts, defaultValue: "", group: "掉落來源" },
    { key: "dropRate", label: "掉落率%", type: "number", defaultValue: 0, group: "掉落來源" },
    { key: "gatherLocations", label: "採集地點", type: "custom", defaultValue: [], group: "採集", skipParse: true,
      render: (val, onChange) => <GatherEditor value={val ?? []} onChange={onChange} />
    },
    { key: "useEffect", label: "使用效果", type: "custom", defaultValue: null, group: "效果", skipParse: true,
      render: (val, onChange) => <UseEffectEditor value={val} onChange={onChange} />
    },
    { key: "source", label: "來源說明", type: "text", group: "其他" },
    { key: "effect", label: "效果說明", type: "textarea", group: "其他" },
    { key: "imageUrl", label: "圖片URL", type: "text", group: "其他" },
    { key: "usableInBattle", label: "戰鬥可用", type: "select", options: [{ value: "1", label: "⚔️ 可在戰鬥中使用" }, { value: "0", label: "❌ 不可" }], defaultValue: "0", group: "效果" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const batchEditFields = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "category", label: "分類", type: "select", options: ITEM_CAT_OPTS },
    { key: "shopPrice", label: "商店售價", type: "number" },
    { key: "inNormalShop", label: "一般商店上架", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }] },
    { key: "inSpiritShop", label: "靈相商店上架", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }] },
    { key: "inSecretShop", label: "密店上架", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }] },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    ["inNormalShop", "inSpiritShop", "inSecretShop", "isMonsterDrop", "isActive", "usableInBattle", "stackable"].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });
    // Sanitize useEffect: ensure value/duration are numbers, or null out empty effects
    if (data.useEffect) {
      if (!data.useEffect.type || data.useEffect.type === "") {
        data.useEffect = null;
      } else {
        data.useEffect = {
          type: data.useEffect.type || "",
          value: Number(data.useEffect.value) || 0,
          duration: Number(data.useEffect.duration) || 0,
          description: data.useEffect.description || "",
        };
      }
    }
    if (editItem && editItem.id != null) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
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
  const handleBatchEdit = (data: Record<string, any>) => {
    ["inNormalShop", "inSpiritShop", "inSecretShop", "isActive"].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });
    batchUpdateMut.mutate({ ids: Array.from(selectedIds), data });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div><h2 className="text-lg font-semibold">🎒 道具圖鑑（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 I_W001）</p></div>
        <div className="flex gap-2 items-center flex-wrap">
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
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse min-w-[550px]">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2 whitespace-nowrap">ID</th><th className="text-left py-2 px-2 whitespace-nowrap">名稱</th><th className="text-left py-2 px-2 whitespace-nowrap">五行</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">分類</th><th className="text-left py-2 px-2 whitespace-nowrap">稀有度</th><th className="text-left py-2 px-2 whitespace-nowrap">售價</th><th className="text-left py-2 px-2 whitespace-nowrap">商店</th><th className="text-left py-2 px-2 whitespace-nowrap">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.itemId}</td>
                  <td className="py-2 px-2 font-medium">{m.imageUrl ? <img src={m.imageUrl} alt="" className="w-5 h-5 inline mr-1 rounded" /> : null}{m.name}</td><td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.category}</td><td className="py-2 px-2 text-xs">{m.rarity}</td><td className="py-2 px-2">{m.shopPrice > 0 ? m.shopPrice : '-'}</td>
                  <td className="py-2 px-2 text-xs space-x-0.5">{m.inNormalShop ? <span className="inline-block px-1 rounded bg-green-500/20 text-green-400 text-[10px]">一般</span> : null}{m.inSpiritShop ? <span className="inline-block px-1 rounded bg-purple-500/20 text-purple-400 text-[10px]">靈相</span> : null}{m.inSecretShop ? <span className="inline-block px-1 rounded bg-amber-500/20 text-amber-400 text-[10px]">密店</span> : null}{m.usableInBattle ? <span className="inline-block px-1 rounded bg-red-500/20 text-red-400 text-[10px]">⚔️戰鬥</span> : null}{!m.inNormalShop && !m.inSpiritShop && !m.inSecretShop && !m.usableInBattle ? <span className="text-muted-foreground">-</span> : null}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <AiImageBtn type="item" id={m.itemId} name={m.name} hasImage={!!m.imageUrl} onSuccess={() => refetch()} />
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-400" title="上架到商店" onClick={() => setQuickShopItem({ itemKey: m.itemId, displayName: m.name })}>🛒</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="複製" onClick={() => { const copy = { ...m }; delete copy.id; copy.name = `${m.name}(複製)`; setEditItem(null); setFormOpen(true); setTimeout(() => setEditItem(copy as any), 50); toast.info(`已複製「${m.name}」，請修改後儲存`); }}>📋</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯道具：${editItem.name}` : "新增道具"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} catalogType="item" />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="道具圖鑑" />
      {quickShopItem && <QuickShopListModal open={!!quickShopItem} onClose={() => setQuickShopItem(null)} itemKey={quickShopItem.itemKey} displayName={quickShopItem.displayName} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 3. 裝備圖鑑 V2
// ════════════════════════════════════════════════════════════════
const SLOT_OPTS = [
  { value: "weapon", label: "武器" }, { value: "helmet", label: "頭盔" },
  { value: "armor", label: "護甲" }, { value: "gloves", label: "手套" },
  { value: "shoes", label: "鞋子" }, { value: "accessory", label: "飾品" },
  { value: "offhand", label: "副手" },
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
  const [quickShopItem, setQuickShopItem] = useState<{ itemKey: string; displayName: string } | null>(null);

  const queryInput = useMemo(() => ({
    search: search || undefined, wuxing: wuxing || undefined, rarity: rarity || undefined,
    slot: slot || undefined, quality: quality || undefined, page, pageSize,
  }), [search, wuxing, rarity, slot, quality, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getEquipCatalog.useQuery(queryInput);
  const { data: allItems } = trpc.gameCatalog.getAllItems.useQuery();
  const exportQuery = trpc.gameCatalog.exportEquipCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createEquipCatalog.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.equipId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const updateMut = trpc.gameCatalog.updateEquipCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const deleteMut = trpc.gameCatalog.deleteEquipCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteEquips.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateEquips.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const bulkImportMut = trpc.gameCatalog.bulkImportEquipments.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆裝備`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

  const fields: FieldDef[] = [
    { key: "name", label: "名稱", type: "text", required: true },
    { key: "wuxing", label: "五行", type: "select", required: true, options: WUXING_OPTS, defaultValue: "木" },
    { key: "slot", label: "部位", type: "select", options: SLOT_OPTS, defaultValue: "weapon" },
    { key: "quality", label: "品質", type: "select", options: QUALITY_OPTS, defaultValue: "white" },
    { key: "tier", label: "階級", type: "text", defaultValue: "初階" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "levelRequired", label: "需求等級", type: "number", defaultValue: 1, group: "需求" },
    { key: "hpBonus", label: "HP加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "attackBonus", label: "攻擊加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "defenseBonus", label: "防禦加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "speedBonus", label: "速度加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "mpBonus", label: "MP加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "magicAttackBonus", label: "魔攻加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "magicDefenseBonus", label: "魔防加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "healPowerBonus", label: "回復力加成", type: "number", defaultValue: 0, group: "屬性加成" },
    { key: "critRateBonus", label: "暴擊率加成%", type: "number", defaultValue: 0, step: 0.1, group: "屬性加成" },
    { key: "critDamageBonus", label: "暴擊傷害加成%", type: "number", defaultValue: 0, step: 1, group: "屬性加成" },
    { key: "resistBonus", label: "抗性加成", type: "custom", defaultValue: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }, group: "屬性加成", skipParse: true,
      render: (val, onChange) => <ResistEditor value={val ?? { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }} onChange={onChange} />
    },
    { key: "_affixes", label: "裝備詞條", type: "custom", defaultValue: null, group: "詞條", skipParse: true,
      render: (_val, _onChange, formData, setFormData) => {
        const affixes = [1,2,3,4,5].map(i => formData?.[`affix${i}`] ?? null);
        return <AffixEditor affixes={affixes} onChange={(newAffixes) => {
          const update: any = {};
          newAffixes.forEach((a, i) => { update[`affix${i+1}`] = a; });
          setFormData?.((prev: any) => ({ ...prev, ...update }));
        }} />;
      }
    },
    { key: "affix1", label: "", type: "hidden", defaultValue: null },
    { key: "affix2", label: "", type: "hidden", defaultValue: null },
    { key: "affix3", label: "", type: "hidden", defaultValue: null },
    { key: "affix4", label: "", type: "hidden", defaultValue: null },
    { key: "affix5", label: "", type: "hidden", defaultValue: null },
    { key: "craftMaterialsList", label: "製作材料", type: "custom", defaultValue: [], group: "製作", skipParse: true,
      render: (val, onChange) => {
        const itemOpts = (allItems ?? []).map((it: any) => ({ value: it.itemId, label: `${it.itemId} ${it.name}` }));
        return <MaterialEditor value={val ?? []} onChange={onChange} itemOptions={itemOpts} />;
      }
    },
    { key: "setId", label: "套裝ID", type: "text", defaultValue: "", group: "製作" },
    { key: "shopPrice", label: "商店售價", type: "number", defaultValue: 0, group: "商店分配" },
    { key: "inNormalShop", label: "一般商店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "inSpiritShop", label: "靈相商店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "inSecretShop", label: "密店", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }], defaultValue: "0", group: "商店分配" },
    { key: "specialEffect", label: "特殊效果", type: "textarea", group: "其他" },
    { key: "imageUrl", label: "圖片URL", type: "text", group: "其他" },
    { key: "stackable", label: "可疊加", type: "select", options: [{ value: "0", label: "🔒 不可疊加（裝備預設）" }, { value: "1", label: "✅ 可疊加" }], defaultValue: "0", group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const batchEditFields: FieldDef[] = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "slot", label: "部位", type: "select", options: SLOT_OPTS },
    { key: "quality", label: "品質", type: "select", options: QUALITY_OPTS },
    { key: "shopPrice", label: "商店售價", type: "number" },
    { key: "inNormalShop", label: "一般商店上架", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }] },
    { key: "inSpiritShop", label: "靈相商店上架", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }] },
    { key: "inSecretShop", label: "密店上架", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }] },
    { key: "stackable", label: "可疊加", type: "select", options: [{ value: "0", label: "🔒 不可疊加" }, { value: "1", label: "✅ 可疊加" }] },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "是" }, { value: "0", label: "否" }] },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    ["inNormalShop", "inSpiritShop", "inSecretShop", "isActive", "stackable"].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });
    if (editItem && editItem.id != null) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
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
  const handleBatchEdit = (data: Record<string, any>) => {
    ["inNormalShop", "inSpiritShop", "inSecretShop", "isActive"].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });
    batchUpdateMut.mutate({ ids: Array.from(selectedIds), data });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div><h2 className="text-lg font-semibold">⚔️ 裝備圖鑑（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 E_W001）</p></div>
        <div className="flex gap-2 items-center flex-wrap">
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
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse min-w-[600px]">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2 whitespace-nowrap">ID</th><th className="text-left py-2 px-2 whitespace-nowrap">名稱</th><th className="text-left py-2 px-2 whitespace-nowrap">五行</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">部位</th><th className="text-left py-2 px-2 whitespace-nowrap">品質</th><th className="text-left py-2 px-2 whitespace-nowrap">售價</th><th className="text-left py-2 px-2 whitespace-nowrap">商店</th><th className="text-left py-2 px-2 whitespace-nowrap">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.equipId}</td>
                  <td className="py-2 px-2 font-medium">{m.imageUrl ? <img src={m.imageUrl} alt="" className="w-5 h-5 inline mr-1 rounded" /> : null}{m.name}</td><td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{m.slot}</td><td className="py-2 px-2 text-xs">{m.quality}</td>
                  <td className="py-2 px-2">{m.shopPrice > 0 ? m.shopPrice : '-'}</td>
                  <td className="py-2 px-2 text-xs space-x-0.5">{m.inNormalShop ? <span className="inline-block px-1 rounded bg-green-500/20 text-green-400 text-[10px]">一般</span> : null}{m.inSpiritShop ? <span className="inline-block px-1 rounded bg-purple-500/20 text-purple-400 text-[10px]">靈相</span> : null}{m.inSecretShop ? <span className="inline-block px-1 rounded bg-amber-500/20 text-amber-400 text-[10px]">密店</span> : null}{!m.inNormalShop && !m.inSpiritShop && !m.inSecretShop ? <span className="text-muted-foreground">-</span> : null}</td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <AiImageBtn type="equipment" id={m.equipId} name={m.name} hasImage={!!m.imageUrl} onSuccess={() => refetch()} />
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-400" title="上架到商店" onClick={() => setQuickShopItem({ itemKey: m.equipId, displayName: m.name })}>🛒</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="複製" onClick={() => { const copy = { ...m }; delete copy.id; copy.name = `${m.name}(複製)`; setEditItem(null); setFormOpen(true); setTimeout(() => setEditItem(copy as any), 50); toast.info(`已複製「${m.name}」，請修改後儲存`); }}>📋</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯裝備：${editItem.name}` : "新增裝備"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} catalogType="equipment" />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="裝備圖鑑" />
      {quickShopItem && <QuickShopListModal open={!!quickShopItem} onClose={() => setQuickShopItem(null)} itemKey={quickShopItem.itemKey} displayName={quickShopItem.displayName} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 4. 統一技能圖鑑（合併玩家技能 + 魔物技能）
// ════════════════════════════════════════════════════════════════
const SKILL_CAT_OPTS = [
  { value: "physical", label: "物理" }, { value: "magic", label: "魔法" },
  { value: "status", label: "狀態" }, { value: "support", label: "輔助" },
  { value: "special", label: "特殊" }, { value: "resistance", label: "抗性" },
];
const SKILL_CAT_FILTER = [{ value: "", label: "全部分類" }, ...SKILL_CAT_OPTS];
const SKILL_TYPE_OPTS = [
  { value: "attack", label: "攻擊" }, { value: "heal", label: "治療" },
  { value: "buff", label: "增益" }, { value: "debuff", label: "減益" },
  { value: "passive", label: "被動" }, { value: "utility", label: "功能" },
  { value: "defense", label: "防禦" },
];
const SKILL_TYPE_FILTER = [{ value: "", label: "全部類型" }, ...SKILL_TYPE_OPTS];
const TARGET_TYPE_OPTS = [
  { value: "single", label: "單體" }, { value: "t_shape", label: "T字範圍" },
  { value: "cross", label: "十字範圍" }, { value: "all_enemy", label: "全體敵方" },
  { value: "all_ally", label: "全體我方" }, { value: "self", label: "自身" },
  { value: "party", label: "隊伍" },
];
const SCALE_STAT_OPTS = [
  { value: "atk", label: "物理攻擊(ATK)" }, { value: "mtk", label: "魔法攻擊(MTK)" },
  { value: "none", label: "無" },
];
const STATUS_EFFECT_OPTS = [
  { value: "none", label: "無" }, { value: "poison", label: "中毒" },
  { value: "burn", label: "灼燒" }, { value: "freeze", label: "冰凍" },
  { value: "stun", label: "氣絕" }, { value: "slow", label: "減速" },
  { value: "sleep", label: "昏睡" }, { value: "petrify", label: "石化" },
  { value: "confuse", label: "混亂" }, { value: "drunk", label: "酒醉" },
  { value: "forget", label: "遺忘" }, { value: "bleed", label: "流血" },
];
const HEAL_TYPE_OPTS = [
  { value: "none", label: "無" }, { value: "instant", label: "瞬間治療" },
  { value: "hot", label: "持續回復(HoT)" }, { value: "revive", label: "復活" },
  { value: "mpRestore", label: "MP回復" }, { value: "cleanse", label: "淨化解除" },
];
const BUFF_STAT_OPTS = [
  { value: "none", label: "無" }, { value: "atk", label: "攻擊" },
  { value: "def", label: "防禦" }, { value: "mtk", label: "魔攻" },
  { value: "spd", label: "速度" }, { value: "mdef", label: "魔防" },
  { value: "all", label: "全屬性" },
];
const SHIELD_TYPE_OPTS = [
  { value: "none", label: "無" }, { value: "physical", label: "物理護盾" },
  { value: "magical", label: "魔法護盾" }, { value: "all", label: "全護盾" },
];
const ABSORB_TYPE_OPTS = [
  { value: "none", label: "無" }, { value: "physical", label: "物理吸收" },
  { value: "magical", label: "魔法吸收" },
];
const PASSIVE_TYPE_OPTS = [
  { value: "none", label: "無" }, { value: "counter", label: "反擊" },
  { value: "dodge", label: "閃避" }, { value: "guard", label: "護衛" },
  { value: "lowHpBoost", label: "低血強化" }, { value: "statusResist", label: "異常抗性" },
];
const RESIST_TYPE_OPTS = [
  { value: "none", label: "無" }, { value: "petrify", label: "石化" },
  { value: "sleep", label: "昏睡" }, { value: "confuse", label: "混亂" },
  { value: "poison", label: "中毒" }, { value: "forget", label: "遺忘" },
  { value: "drunk", label: "酒醉" },
];
const WUXING_SKILL_OPTS = [
  { value: "金", label: "⚔️ 金" }, { value: "木", label: "🌿 木" },
  { value: "水", label: "💧 水" }, { value: "火", label: "🔥 火" },
  { value: "土", label: "🪨 土" }, { value: "無", label: "⚪ 無" },
];
const WUXING_SKILL_FILTER = [{ value: "", label: "全部" }, ...WUXING_SKILL_OPTS];
const BOOL_OPTS = [{ value: "1", label: "是" }, { value: "0", label: "否" }];
const USABLE_FILTER = [
  { value: "", label: "全部使用者" },
  { value: "player", label: "玩家可用" },
  { value: "pet", label: "寵物可用" },
  { value: "monster", label: "魔物可用" },
];

// ===== 學習系統自訂編輯器組件 =====

/** NPC 選擇器（下拉搜尋 + 顯示 NPC 資訊） */
function NpcSelector({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const { data: npcs } = trpc.gameCatalog.getAllNpcs.useQuery();
  const [search, setSearch] = useState("");
  const npcId = value ? Number(value) : 0;
  const selected = npcs?.find(n => n.id === npcId);
  const filtered = npcs?.filter(n =>
    !search || n.name.includes(search) || n.code.includes(search) || (n.location ?? "").includes(search)
  ) ?? [];

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">教導 NPC</label>
      <Input placeholder="搜尋 NPC 名稱/代碼/地點..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
      <div className="max-h-32 overflow-y-auto border rounded-md">
        <div className={`px-2 py-1 text-xs cursor-pointer hover:bg-accent ${npcId === 0 ? 'bg-accent font-bold' : ''}`}
          onClick={() => onChange(0)}>（無 NPC）</div>
        {filtered.map(n => (
          <div key={n.id}
            className={`px-2 py-1 text-xs cursor-pointer hover:bg-accent flex justify-between ${n.id === npcId ? 'bg-accent font-bold' : ''}`}
            onClick={() => onChange(n.id)}>
            <span>{n.name}{n.title ? ` (${n.title})` : ''}</span>
            <span className="text-muted-foreground">{n.region} · {n.location ?? '未知'}</span>
          </div>
        ))}
      </div>
      {selected && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          已選：<strong>{selected.name}</strong> [{selected.code}] — {selected.region} · {selected.location}
        </div>
      )}
    </div>
  );
}

/** 習得代價編輯器（金幣/靈晶/道具/聲望 全表單化） */
function LearnCostEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const { data: allItems, refetch: refetchItems } = trpc.gameCatalog.getAllItems.useQuery();
  const quickCreateMut = trpc.gameCatalog.quickCreateQuestItem.useMutation({
    onSuccess: (r) => { toast.success(`已建立任務道具: ${r.name} (${r.itemId})`); refetchItems(); },
    onError: (e) => toast.error(`建立失敗: ${e.message}`),
  });
  const [newItemName, setNewItemName] = useState("");
  const [newItemWuxing, setNewItemWuxing] = useState("木");

  // Parse value
  const cost = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return {}; } })() : (value ?? {});
  const gold = cost.gold ?? 0;
  const soulCrystal = cost.soulCrystal ?? 0;
  const items: Array<{itemId: string; name: string; count: number}> = cost.items ?? [];
  const reputation = cost.reputation ?? null;

  const update = (patch: any) => {
    const next = { ...cost, ...patch };
    // Clean up empty values
    if (!next.gold) delete next.gold;
    if (!next.soulCrystal) delete next.soulCrystal;
    if (!next.items?.length) delete next.items;
    if (!next.reputation?.amount) delete next.reputation;
    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const addItem = (itemId: string) => {
    const item = allItems?.find(i => i.itemId === itemId);
    if (!item) return;
    const existing = items.find(i => i.itemId === itemId);
    if (existing) {
      update({ items: items.map(i => i.itemId === itemId ? { ...i, count: i.count + 1 } : i) });
    } else {
      update({ items: [...items, { itemId, name: item.name, count: 1 }] });
    }
  };

  const removeItem = (itemId: string) => {
    update({ items: items.filter(i => i.itemId !== itemId) });
  };

  const updateItemCount = (itemId: string, count: number) => {
    update({ items: items.map(i => i.itemId === itemId ? { ...i, count } : i) });
  };

  const questItems = allItems?.filter(i => i.category === 'quest') ?? [];
  const [itemSearch, setItemSearch] = useState("");
  const filteredItems = questItems.filter(i => !itemSearch || i.name.includes(itemSearch) || i.itemId.includes(itemSearch));

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium">習得代價</label>
      {/* 金幣 & 靈晶 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">金幣</label>
          <Input type="number" value={gold} onChange={e => update({ gold: Number(e.target.value) })} min={0} className="h-7 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">靈晶</label>
          <Input type="number" value={soulCrystal} onChange={e => update({ soulCrystal: Number(e.target.value) })} min={0} className="h-7 text-xs" />
        </div>
      </div>

      {/* 所需道具 */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">所需道具</label>
        {items.map(item => (
          <div key={item.itemId} className="flex items-center gap-1 text-xs">
            <span className="flex-1">{item.name} ({item.itemId})</span>
            <Input type="number" value={item.count} onChange={e => updateItemCount(item.itemId, Number(e.target.value))} min={1} className="h-6 w-16 text-xs" />
            <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => removeItem(item.itemId)}>✕</Button>
          </div>
        ))}
        <div className="flex gap-1">
          <Input placeholder="搜尋任務道具..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="h-7 text-xs flex-1" />
        </div>
        {itemSearch && (
          <div className="max-h-24 overflow-y-auto border rounded text-xs">
            {filteredItems.map(i => (
              <div key={i.itemId} className="px-2 py-0.5 cursor-pointer hover:bg-accent flex justify-between" onClick={() => { addItem(i.itemId); setItemSearch(""); }}>
                <span>{i.name}</span><span className="text-muted-foreground">{i.itemId}</span>
              </div>
            ))}
            {filteredItems.length === 0 && <div className="px-2 py-1 text-muted-foreground">無匹配道具</div>}
          </div>
        )}
        {/* 快速新增任務道具 */}
        <div className="flex gap-1 items-center mt-1">
          <Input placeholder="新道具名稱" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="h-7 text-xs flex-1" />
          <select value={newItemWuxing} onChange={e => setNewItemWuxing(e.target.value)} className="h-7 text-xs border rounded px-1">
            <option value="木">木</option><option value="火">火</option><option value="土">土</option><option value="金">金</option><option value="水">水</option>
          </select>
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!newItemName || quickCreateMut.isPending}
            onClick={() => { quickCreateMut.mutate({ name: newItemName, wuxing: newItemWuxing }); setNewItemName(""); }}>
            {quickCreateMut.isPending ? '建立中...' : '＋新增道具'}
          </Button>
        </div>
      </div>

      {/* 聲望需求 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">聲望區域</label>
          <Input value={reputation?.area ?? ''} onChange={e => update({ reputation: { area: e.target.value, amount: reputation?.amount ?? 0 } })} placeholder="如：迷霧城" className="h-7 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">聲望需求量</label>
          <Input type="number" value={reputation?.amount ?? 0} onChange={e => update({ reputation: { area: reputation?.area ?? '', amount: Number(e.target.value) } })} min={0} className="h-7 text-xs" />
        </div>
      </div>
    </div>
  );
}

/** 前置技能選擇器（多選，支援舊格式數字 ID 和新格式 skillId） */
function PrerequisiteSkillSelector({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const { data: allSkills } = trpc.gameCatalog.getAllSkills.useQuery();
  const [search, setSearch] = useState("");

  // Parse value: can be JSON string or array of numbers/strings
  const rawSelected: (string | number)[] = typeof value === 'string'
    ? (() => { try { return JSON.parse(value); } catch { return []; } })()
    : (Array.isArray(value) ? value : []);

  // Normalize: convert old numeric IDs to skillId strings for display
  const resolveSkill = (sid: string | number) => {
    if (!allSkills) return null;
    if (typeof sid === 'number') return allSkills.find(s => s.id === sid);
    return allSkills.find(s => s.skillId === sid || s.code === sid);
  };

  const filtered = allSkills?.filter(s =>
    !search || s.name.includes(search) || s.skillId.includes(search) || (s.code ?? '').includes(search)
  ) ?? [];

  // Always save as numeric IDs (consistent with DB format)
  const toggle = (numericId: number) => {
    const next = rawSelected.includes(numericId)
      ? rawSelected.filter(s => s !== numericId)
      : [...rawSelected, numericId];
    onChange(next.length > 0 ? next : null);
  };

  const remove = (sid: string | number) => {
    const next = rawSelected.filter(s => s !== sid);
    onChange(next.length > 0 ? next : null);
  };

  const isSelected = (numericId: number) => rawSelected.includes(numericId);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">前置技能條件</label>
      {/* 已選列表 */}
      {rawSelected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {rawSelected.map(sid => {
            const skill = resolveSkill(sid);
            return (
              <span key={String(sid)} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded px-2 py-0.5 text-xs">
                {skill ? `${skill.name} (${skill.skillId})` : `ID:${sid}`}
                <button className="hover:text-destructive" onClick={() => remove(sid)}>✕</button>
              </span>
            );
          })}
        </div>
      )}
      {/* 搜尋 & 選取 */}
      <Input placeholder="搜尋技能名稱/代碼..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs" />
      {search && (
        <div className="max-h-32 overflow-y-auto border rounded text-xs">
          {filtered.slice(0, 30).map(s => (
            <div key={s.skillId}
              className={`px-2 py-0.5 cursor-pointer hover:bg-accent flex justify-between ${isSelected(s.id) ? 'bg-accent font-bold' : ''}`}
              onClick={() => toggle(s.id)}>
              <span>{isSelected(s.id) ? '✓ ' : ''}{s.name}</span>
              <span className="text-muted-foreground">{s.skillId} · {s.wuxing} · {s.category}</span>
            </div>
          ))}
          {filtered.length === 0 && <div className="px-2 py-1 text-muted-foreground">無匹配技能</div>}
          {filtered.length > 30 && <div className="px-2 py-1 text-muted-foreground">還有 {filtered.length - 30} 個結果，請縮小搜尋範圍</div>}
        </div>
      )}
      {rawSelected.length === 0 && !search && <div className="text-xs text-muted-foreground">無前置技能要求（點擊搜尋框選取技能）</div>}
    </div>
  );
}

export function SkillCatalogV2Tab() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [wuxing, setWuxing] = useState("");
  const [rarity, setRarity] = useState("");
  const [category, setCategory] = useState("");
  const [skillType, setSkillType] = useState("");
  const [usableFilter, setUsableFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [quickShopItem, setQuickShopItem] = useState<{ itemKey: string; displayName: string } | null>(null);

  const queryInput = useMemo(() => ({
    search: search || undefined, wuxing: wuxing || undefined, rarity: rarity || undefined,
    category: category || undefined, skillType: skillType || undefined,
    usableByPlayer: usableFilter === "player" ? 1 : undefined,
    usableByPet: usableFilter === "pet" ? 1 : undefined,
    usableByMonster: usableFilter === "monster" ? 1 : undefined,
    page, pageSize,
  }), [search, wuxing, rarity, category, skillType, usableFilter, page, pageSize]);

  const { data, isLoading, refetch } = trpc.gameCatalog.getSkillCatalog.useQuery(queryInput);
  const exportQuery = trpc.gameCatalog.exportSkillCatalog.useQuery(undefined, { enabled: false });

  const createMut = trpc.gameCatalog.createSkillCatalog.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.skillId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const updateMut = trpc.gameCatalog.updateSkillCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const deleteMut = trpc.gameCatalog.deleteSkillCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteSkills.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateSkills.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const bulkImportMut = trpc.gameCatalog.bulkImportSkills.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆技能`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

  // ===== 統一技能圖鑑全表單化欄位定義 =====
  const fields: FieldDef[] = [
    // 基礎資訊
    { key: "name", label: "技能名稱", type: "text", required: true },
    { key: "code", label: "代碼", type: "text", placeholder: "如 P01, M02", defaultValue: "" },
    { key: "wuxing", label: "五行屬性", type: "select", required: true, options: WUXING_SKILL_OPTS, defaultValue: "無" },
    { key: "category", label: "技能分類", type: "select", options: SKILL_CAT_OPTS, defaultValue: "physical" },
    { key: "skillType", label: "技能子類型", type: "select", options: SKILL_TYPE_OPTS, defaultValue: "attack" },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "rare" },
    { key: "questTitle", label: "任務副標題", type: "text", placeholder: "如「碎影雙刃・連環之路」" },
    { key: "description", label: "效果說明", type: "textarea" },

    // 數值基礎
    { key: "powerPercent", label: "威力%", type: "number", defaultValue: 100, min: 0, group: "數值基礎" },
    { key: "mpCost", label: "MP消耗", type: "number", defaultValue: 10, min: 0, group: "數值基礎" },
    { key: "cooldown", label: "冷却(回合)", type: "number", defaultValue: 3, min: 0, group: "數值基礎" },
    { key: "maxLevel", label: "等級上限", type: "number", defaultValue: 10, min: 1, group: "數值基礎" },
    { key: "levelUpBonus", label: "每級加成%", type: "number", defaultValue: 10, min: 0, group: "數值基礎" },
    { key: "accuracyMod", label: "命中修正%", type: "number", defaultValue: 100, group: "數值基礎" },

    // 目標與計算
    { key: "targetType", label: "目標範圍", type: "select", options: TARGET_TYPE_OPTS, defaultValue: "single", group: "目標與計算" },
    { key: "scaleStat", label: "傷害基準屬性", type: "select", options: SCALE_STAT_OPTS, defaultValue: "atk", group: "目標與計算" },

    // 可用性控制
    { key: "usableByPlayer", label: "玩家可用", type: "select", options: BOOL_OPTS, defaultValue: "1", group: "可用性控制" },
    { key: "usableByPet", label: "寵物可用", type: "select", options: BOOL_OPTS, defaultValue: "1", group: "可用性控制" },
    { key: "usableByMonster", label: "魔物可用", type: "select", options: BOOL_OPTS, defaultValue: "1", group: "可用性控制" },

    // 狀態異常
    { key: "statusEffectType", label: "狀態異常類型", type: "select", options: STATUS_EFFECT_OPTS, defaultValue: "none", group: "狀態異常" },
    { key: "statusEffectChance", label: "觸發機率%", type: "number", defaultValue: 0, min: 0, max: 100, group: "狀態異常" },
    { key: "statusEffectDuration", label: "持續回合", type: "number", defaultValue: 0, min: 0, max: 20, group: "狀態異常" },
    { key: "statusEffectValue", label: "效果值", type: "number", defaultValue: 0, min: 0, group: "狀態異常" },

    // 連擊系統
    { key: "hitCountMin", label: "最少攻擊次數", type: "number", defaultValue: 1, min: 1, max: 10, group: "連擊系統" },
    { key: "hitCountMax", label: "最多攻擊次數", type: "number", defaultValue: 1, min: 1, max: 10, group: "連擊系統" },
    { key: "multiTargetHit", label: "多段隨機目標", type: "select", options: BOOL_OPTS, defaultValue: "0", group: "連擊系統" },

    // 吸血/自傷/穿透
    { key: "lifestealPercent", label: "吸血%", type: "number", defaultValue: 0, min: 0, max: 100, group: "吸血/自傷/穿透" },
    { key: "selfDamagePercent", label: "自傷%", type: "number", defaultValue: 0, min: 0, max: 100, group: "吸血/自傷/穿透" },
    { key: "ignoreDefPercent", label: "穿透防禦%", type: "number", defaultValue: 0, min: 0, max: 100, group: "吸血/自傷/穿透" },
    { key: "isPriority", label: "先制攻擊", type: "select", options: BOOL_OPTS, defaultValue: "0", group: "吸血/自傷/穿透" },

    // 治療系統
    { key: "healType", label: "治療類型", type: "select", options: HEAL_TYPE_OPTS, defaultValue: "none", group: "治療系統" },
    { key: "hotDuration", label: "HoT持續回合", type: "number", defaultValue: 0, min: 0, group: "治療系統" },
    { key: "mpRestorePercent", label: "MP回復%", type: "number", defaultValue: 0, min: 0, group: "治療系統" },
    { key: "cleanseCount", label: "淨化數量(-1=全部)", type: "number", defaultValue: 0, group: "治療系統" },

    // 增益/減益系統
    { key: "buffStat", label: "Buff屬性", type: "select", options: BUFF_STAT_OPTS, defaultValue: "none", group: "增益/減益系統" },
    { key: "buffPercent", label: "Buff百分比", type: "number", defaultValue: 0, group: "增益/減益系統" },
    { key: "buffDuration", label: "Buff持續回合", type: "number", defaultValue: 0, min: 0, group: "增益/減益系統" },

    // 護盾系統
    { key: "shieldType", label: "護盾類型", type: "select", options: SHIELD_TYPE_OPTS, defaultValue: "none", group: "護盾系統" },
    { key: "shieldCharges", label: "護盾次數", type: "number", defaultValue: 0, min: 0, group: "護盾系統" },
    { key: "shieldDuration", label: "護盾持續回合", type: "number", defaultValue: 0, min: 0, group: "護盾系統" },
    { key: "shieldAbsorbPercent", label: "護盾吸收%", type: "number", defaultValue: 0, min: 0, max: 100, group: "護盾系統" },

    // 吸收系統
    { key: "absorbType", label: "吸收類型", type: "select", options: ABSORB_TYPE_OPTS, defaultValue: "none", group: "吸收系統" },
    { key: "absorbPercent", label: "吸收轉HP%", type: "number", defaultValue: 0, min: 0, max: 100, group: "吸收系統" },
    { key: "absorbDuration", label: "吸收持續回合", type: "number", defaultValue: 0, min: 0, group: "吸收系統" },

    // 嘲諽
    { key: "tauntDuration", label: "嘲諽持續回合", type: "number", defaultValue: 0, min: 0, group: "嘲諽" },

    // 被動技能系統
    { key: "isPassive", label: "是否被動", type: "select", options: BOOL_OPTS, defaultValue: "0", group: "被動技能系統" },
    { key: "passiveType", label: "被動類型", type: "select", options: PASSIVE_TYPE_OPTS, defaultValue: "none", group: "被動技能系統" },
    { key: "passiveTriggerChance", label: "觸發基礎機率%", type: "number", defaultValue: 0, min: 0, max: 100, group: "被動技能系統" },
    { key: "passiveChancePerLevel", label: "每級增加機率%", type: "number", defaultValue: 0, min: 0, group: "被動技能系統" },
    { key: "guardDamageReduction", label: "護衛減傷%", type: "number", defaultValue: 0, min: 0, max: 100, group: "被動技能系統" },
    { key: "lowHpThreshold", label: "低血閾值%", type: "number", defaultValue: 0, min: 0, max: 100, group: "被動技能系統" },
    { key: "lowHpBoostPercent", label: "低血強化%", type: "number", defaultValue: 0, min: 0, group: "被動技能系統" },
    { key: "resistType", label: "抗性異常類型", type: "select", options: RESIST_TYPE_OPTS, defaultValue: "none", group: "被動技能系統" },
    { key: "resistChancePerLevel", label: "每級抗性機率%", type: "number", defaultValue: 0, min: 0, group: "被動技能系統" },

    // 特殊效果
    { key: "hasInstantKill", label: "即死效果", type: "select", options: BOOL_OPTS, defaultValue: "0", group: "特殊效果" },
    { key: "instantKillChance", label: "即死機率%", type: "number", defaultValue: 0, min: 0, max: 100, group: "特殊效果" },
    { key: "hasSteal", label: "偷竊效果", type: "select", options: BOOL_OPTS, defaultValue: "0", group: "特殊效果" },
    { key: "stealChance", label: "偷竊機率%", type: "number", defaultValue: 0, min: 0, max: 100, group: "特殊效果" },
    { key: "hasSealWuxing", label: "封印五行", type: "select", options: BOOL_OPTS, defaultValue: "0", group: "特殊效果" },
    { key: "sealDuration", label: "封印持續回合", type: "number", defaultValue: 0, min: 0, group: "特殊效果" },

    // 防禦觸發
    { key: "onDefendTrigger", label: "防禦時觸發", type: "select", options: BOOL_OPTS, defaultValue: "0", group: "防禦觸發" },
    { key: "defendHealPercent", label: "防禦回HP%", type: "number", defaultValue: 0, min: 0, group: "防禦觸發" },
    { key: "defendMpPercent", label: "防禦回MP%", type: "number", defaultValue: 0, min: 0, group: "防禦觸發" },

    // AI 使用條件
    { key: "aiHpBelow", label: "AI觸發HP低於%", type: "number", defaultValue: 0, min: 0, max: 100, group: "AI使用條件" },
    { key: "aiPriority", label: "AI優先級(0-10)", type: "number", defaultValue: 5, min: 0, max: 10, group: "AI使用條件" },
    { key: "aiTargetElement", label: "AI目標偏好元素", type: "select", options: [{ value: "", label: "無偏好" }, ...WUXING_SKILL_OPTS], defaultValue: "", group: "AI使用條件" },

    // 學習/取得
    { key: "prerequisiteLevel", label: "前置等級需求", type: "number", defaultValue: 0, min: 0, group: "學習/取得" },
    { key: "npcId", label: "教導 NPC", type: "custom", group: "學習/取得", skipParse: true,
      render: (value, onChange) => <NpcSelector value={value} onChange={onChange} />
    },
    { key: "learnCost", label: "習得代價", type: "custom", group: "學習/取得", skipParse: true,
      render: (value, onChange) => <LearnCostEditor value={value} onChange={onChange} />
    },
    { key: "prerequisites", label: "前置技能", type: "custom", group: "學習/取得", skipParse: true,
      render: (value, onChange) => <PrerequisiteSkillSelector value={value} onChange={onChange} />
    },

    // 其他
    { key: "iconUrl", label: "圖示URL", type: "text", group: "其他" },
    { key: "sortOrder", label: "排序權重", type: "number", defaultValue: 0, min: 0, group: "其他" },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const batchEditFields = [
    { key: "wuxing", label: "五行", type: "select", options: WUXING_SKILL_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "category", label: "分類", type: "select", options: SKILL_CAT_OPTS },
    { key: "skillType", label: "技能類型", type: "select", options: SKILL_TYPE_OPTS },
    { key: "usableByPlayer", label: "玩家可用", type: "select", options: BOOL_OPTS },
    { key: "usableByPet", label: "寵物可用", type: "select", options: BOOL_OPTS },
    { key: "usableByMonster", label: "魔物可用", type: "select", options: BOOL_OPTS },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
  ];

  const handleSubmit = (data: any) => {
    for (const k of Object.keys(data)) { if (data[k] === "__none__") data[k] = ""; }
    ["usableByPlayer", "usableByPet", "usableByMonster", "multiTargetHit", "isPriority",
     "isPassive", "hasInstantKill", "hasSteal", "hasSealWuxing", "onDefendTrigger", "isActive"].forEach(k => {
      if (data[k] !== undefined) data[k] = Number(data[k]);
    });
    if (editItem && editItem.id != null) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
  };

  const handleExport = useCallback(async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.data) { if (format === "csv") exportToCSV(result.data, "unified_skill_catalog"); else exportToJSON(result.data, "unified_skill_catalog"); }
  }, [exportQuery]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const allSelected = items.length > 0 && items.every((m: any) => selectedIds.has(m.id));
  const someSelected = items.some((m: any) => selectedIds.has(m.id));
  const toggleAll = () => { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(items.map((m: any) => m.id))); };
  const toggleOne = (id: number) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const handleBatchDelete = () => { if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆技能？`)) return; batchDeleteMut.mutate({ ids: Array.from(selectedIds) }); };
  const handleBatchEdit = (data: Record<string, any>) => {
    ["usableByPlayer", "usableByPet", "usableByMonster", "isActive"].forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });
    batchUpdateMut.mutate({ ids: Array.from(selectedIds), data });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div><h2 className="text-lg font-semibold">✨ 統一技能圖鑑（{total}）</h2><p className="text-xs text-muted-foreground">合併玩家/寵物/魔物技能，自動生成 ID（USK_001）</p></div>
        <div className="flex gap-2 items-center flex-wrap">
          <ExportButtons onCSV={() => handleExport("csv")} onJSON={() => handleExport("json")} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>📥 匯入</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>＋ 新增技能</Button>
        </div>
      </div>
      <FilterBar>
        <div className="flex gap-1 flex-wrap">{WUXING_SKILL_FILTER.map(w => (<FilterPill key={w.value} label={w.label} active={wuxing === w.value} onClick={() => { setWuxing(w.value); setPage(1); }} />))}</div>
        <div className="flex gap-1 flex-wrap">{RARITY_FILTER.map(r => (<FilterPill key={r.value} label={r.label} active={rarity === r.value} onClick={() => { setRarity(r.value); setPage(1); }} />))}</div>
      </FilterBar>
      <FilterBar>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{SKILL_CAT_FILTER.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        <select value={skillType} onChange={e => { setSkillType(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{SKILL_TYPE_FILTER.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        <select value={usableFilter} onChange={e => { setUsableFilter(e.target.value); setPage(1); }} className="h-7 text-xs rounded border bg-background px-2">{USABLE_FILTER.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
        <div className="flex gap-2 ml-auto">
          <Input placeholder="搜尋名稱…" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} className="w-40 h-7 text-xs" />
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setSearch(searchInput); setPage(1); }}>搜尋</Button>
          {(search || wuxing || rarity || category || skillType || usableFilter) && (<Button size="sm" variant="ghost" className="h-7" onClick={() => { setSearch(""); setSearchInput(""); setWuxing(""); setRarity(""); setCategory(""); setSkillType(""); setUsableFilter(""); setPage(1); }}>清除全部</Button>)}
        </div>
      </FilterBar>
      <BatchToolbar selectedCount={selectedIds.size} onBatchDelete={handleBatchDelete} onBatchEdit={() => setBatchEditOpen(true)} onClearSelection={() => setSelectedIds(new Set())} isDeleting={batchDeleteMut.isPending} />
      {isLoading ? <p className="text-muted-foreground">載入中…</p> : (
        <>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2 whitespace-nowrap">ID</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">名稱</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">五行</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">分類</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">類型</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">威力%</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">MP</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">可用</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.skillId || m.code}</td>
                  <td className="py-2 px-2 font-medium">
                    {m.iconUrl ? <img src={m.iconUrl} alt="" className="w-5 h-5 inline mr-1 rounded" /> : null}
                    {m.name}
                    <RarityBadge rarity={m.rarity} />
                  </td>
                  <td className="py-2 px-2 text-xs">{m.wuxing}</td>
                  <td className="py-2 px-2 text-xs">{SKILL_CAT_OPTS.find(c => c.value === m.category)?.label || m.category}</td>
                  <td className="py-2 px-2 text-xs">{SKILL_TYPE_OPTS.find(t => t.value === m.skillType)?.label || m.skillType}</td>
                  <td className="py-2 px-2 text-xs">{m.powerPercent}%</td>
                  <td className="py-2 px-2 text-xs">{m.mpCost}</td>
                  <td className="py-2 px-2 text-xs space-x-0.5">
                    {m.usableByPlayer ? <span className="inline-block px-1 rounded bg-blue-500/20 text-blue-400 text-[10px]">玩家</span> : null}
                    {m.usableByPet ? <span className="inline-block px-1 rounded bg-green-500/20 text-green-400 text-[10px]">寵物</span> : null}
                    {m.usableByMonster ? <span className="inline-block px-1 rounded bg-red-500/20 text-red-400 text-[10px]">魔物</span> : null}
                  </td>
                  <td className="py-2 px-2 space-x-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <AiImageBtn type="skill" id={m.skillId || m.id} name={m.name} hasImage={!!m.iconUrl} onSuccess={() => refetch()} />
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-400" title="上架到商店" onClick={() => setQuickShopItem({ itemKey: m.skillId || String(m.id), displayName: m.name })}>🛒</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="複製" onClick={() => { const copy = { ...m }; delete copy.id; copy.name = `${m.name}(複製)`; setEditItem(null); setFormOpen(true); setTimeout(() => setEditItem(copy as any), 50); toast.info(`已複製「${m.name}」，請修改後儲存`); }}>📋</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.name}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯統一技能：${editItem.name}` : "新增統一技能"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} catalogType="skill" />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="統一技能圖鑑" />
      {quickShopItem && <QuickShopListModal open={!!quickShopItem} onClose={() => setQuickShopItem(null)} itemKey={quickShopItem.itemKey} displayName={quickShopItem.displayName} />}
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

  const createMut = trpc.gameCatalog.createAchievement.useMutation({ onSuccess: (r) => { toast.success(`建立成功 (${r.achId})`); setFormOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const updateMut = trpc.gameCatalog.updateAchievementCatalog.useMutation({ onSuccess: () => { toast.success("更新成功"); setFormOpen(false); setEditItem(null); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const deleteMut = trpc.gameCatalog.deleteAchievementCatalog.useMutation({ onSuccess: () => { toast.success("已刪除"); refetch(); } });
  const batchDeleteMut = trpc.gameCatalog.batchDeleteAchievements.useMutation({ onSuccess: (r) => { toast.success(`已刪除 ${r.deleted} 筆`); setSelectedIds(new Set()); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const batchUpdateMut = trpc.gameCatalog.batchUpdateAchievements.useMutation({ onSuccess: (r) => { toast.success(`已更新 ${r.updated} 筆`); setSelectedIds(new Set()); setBatchEditOpen(false); refetch(); }, onError: (e) => toast.error(friendlyError(e)) });
  const bulkImportMut = trpc.gameCatalog.bulkImportAchievements.useMutation({ onSuccess: (r) => { toast.success(`成功匯入 ${r.imported} 筆成就`); setImportOpen(false); refetch(); }, onError: (e) => toast.error(`匯入失敗：${e.message}`) });

  const fields: FieldDef[] = [
    { key: "title", label: "名稱", type: "text", required: true },
    { key: "category", label: "分類", type: "select", required: true, options: ACH_CAT_OPTS },
    { key: "description", label: "說明", type: "textarea", required: true },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS, defaultValue: "common" },
    { key: "_condition", label: "達成條件", type: "custom", defaultValue: null, group: "條件", skipParse: true,
      render: (_val, _onChange, formData, setFormData) => {
        return <ConditionEditor
          conditionType={formData?.conditionType ?? ""}
          conditionValue={formData?.conditionValue ?? 1}
          conditionParams={formData?.conditionParams ?? {}}
          onChange={(field: string, val: any) => setFormData?.((prev: any) => ({ ...prev, [field]: val }))}
        />;
      }
    },
    { key: "conditionType", label: "", type: "hidden", defaultValue: "" },
    { key: "conditionValue", label: "", type: "hidden", defaultValue: 1 },
    { key: "conditionParams", label: "", type: "hidden", defaultValue: {} },
    { key: "rewardType", label: "獎勵類型", type: "select", options: REWARD_TYPE_OPTS, group: "獎勵" },
    { key: "rewardAmount", label: "獎勵數量", type: "number", defaultValue: 0, group: "獎勵" },
    { key: "rewardContent", label: "獎勵內容", type: "custom", defaultValue: [], group: "獎勵", skipParse: true,
      render: (val, onChange) => <RewardEditor value={val ?? []} onChange={onChange} />
    },
    { key: "titleReward", label: "稱號獎勵", type: "text", group: "獎勵" },
    { key: "glowEffect", label: "光效代碼", type: "text", group: "獎勵" },
    { key: "iconUrl", label: "徽章圖片", type: "text", group: "其他" },
    { key: "isActive", label: "啟用", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }], defaultValue: "1", group: "其他" },
  ];

  const CONDITION_LABEL: Record<string, string> = {
    kill_count: "擊殺怪物", kill_specific: "擊殺特定怪物", explore_count: "探索節點",
    explore_specific: "探索特定節點", level_reach: "等級達到", collect_item: "收集道具",
    equip_quality: "裝備品質", skill_learn: "學習技能", craft_count: "製作次數",
    pvp_win: "PVP勝利", pvp_total: "PVP總場", oracle_count: "擲筊次數",
    gold_earn: "累計金幣", login_days: "登入天數", hp_below: "HP低於", wuxing_match: "五行匹配",
  };

  const batchEditFields = [
    { key: "category", label: "分類", type: "select", options: ACH_CAT_OPTS },
    { key: "rarity", label: "稀有度", type: "select", options: RARITY_OPTS },
    { key: "rewardType", label: "獎勵類型", type: "select", options: REWARD_TYPE_OPTS },
    { key: "rewardAmount", label: "獎勵數量", type: "number" },
    { key: "isActive", label: "啟用狀態", type: "select", options: [{ value: "1", label: "啟用" }, { value: "0", label: "停用" }] },
  ];

  const handleSubmit = (data: any) => {
    if (data.isActive !== undefined) data.isActive = Number(data.isActive);
    if (editItem && editItem.id != null) updateMut.mutate({ id: editItem.id, data }); else createMut.mutate(data);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div><h2 className="text-lg font-semibold">🏆 成就系統（{total}）</h2><p className="text-xs text-muted-foreground">自動生成 ID（如 ACH_001）</p></div>
        <div className="flex gap-2 items-center flex-wrap">
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
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm border-collapse min-w-[500px]">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="py-2 px-2 w-8"><SelectAllCheckbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} /></th>
                <th className="text-left py-2 px-2 whitespace-nowrap">ID</th><th className="text-left py-2 px-2 whitespace-nowrap">名稱</th><th className="text-left py-2 px-2 whitespace-nowrap">分類</th>
                <th className="text-left py-2 px-2 whitespace-nowrap">條件</th><th className="text-left py-2 px-2 whitespace-nowrap">獎勵</th><th className="text-left py-2 px-2 whitespace-nowrap">操作</th>
              </tr></thead>
              <tbody>{items.map((m: any) => (
                <tr key={m.id} className={`border-b hover:bg-muted/30 ${selectedIds.has(m.id) ? "bg-primary/5" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleOne(m.id)} className="rounded" /></td>
                  <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{m.achId}</td>
                  <td className="py-2 px-2 font-medium">{m.title}</td><td className="py-2 px-2 text-xs">{m.category}</td>
                  <td className="py-2 px-2 text-xs"><span className="inline-block px-1 rounded bg-blue-500/15 text-blue-400 text-[10px]">{CONDITION_LABEL[m.conditionType] || m.conditionType}</span> <span className="text-muted-foreground">≥{m.conditionValue}</span></td>
                  <td className="py-2 px-2 text-xs">{m.rewardType} x{m.rewardAmount}</td>
                  <td className="py-2 px-2 space-x-1">
                    <AiImageBtn type="achievement" id={m.id} name={m.title} hasImage={!!m.imageUrl} onSuccess={() => refetch()} />
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setEditItem(m); setFormOpen(true); }}>✏️</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" title="複製" onClick={() => { const copy = { ...m }; delete copy.id; copy.title = `${m.title}(複製)`; setEditItem(null); setFormOpen(true); setTimeout(() => setEditItem(copy as any), 50); toast.info(`已複製「${m.title}」，請修改後儲存`); }}>📋</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => { if (confirm(`確定刪除 ${m.title}？`)) deleteMut.mutate({ id: m.id }); }}>🗑️</Button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={p => { setPage(p); setSelectedIds(new Set()); }} onPageSizeChange={s => { setPageSize(s); setPage(1); setSelectedIds(new Set()); }} />
        </>
      )}
      <CatalogFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditItem(null); }} title={editItem ? `編輯成就：${editItem.title}` : "新增成就"} fields={fields} initialData={editItem} onSubmit={handleSubmit} isLoading={createMut.isPending || updateMut.isPending} catalogType="achievement" />
      <BatchEditDialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} fields={batchEditFields} onSubmit={handleBatchEdit} isLoading={batchUpdateMut.isPending} selectedCount={selectedIds.size}
        selectedItems={items.filter((m: any) => selectedIds.has(m.id))} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={(rows) => bulkImportMut.mutate({ items: rows })}
        isLoading={bulkImportMut.isPending} catalogName="成就系統" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 6. 魔物技能圖鑑（已合併至統一技能圖鑑，保留空殼向後兼容）
// ════════════════════════════════════════════════════════════════
export function MonsterSkillCatalogTab() {
  return (
    <div className="p-8 text-center">
      <p className="text-lg font-semibold mb-2">魔物技能已合併至「統一技能圖鑑」</p>
      <p className="text-sm text-muted-foreground">請切換到「統一技能」分頁，使用「使用者」篩選器選擇「魔物可用」即可管理魔物技能。</p>
    </div>
  );
}


