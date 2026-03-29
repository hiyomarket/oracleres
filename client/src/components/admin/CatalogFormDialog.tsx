/**
 * 通用圖鑑新增/編輯 Dialog
 * 支援文字、數字、下拉選單、JSON 欄位、自訂 SmartEditor 元件
 * 新增：右側即時預覽面板（桌面版並排，手機版摺疊）
 */
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CatalogPreview from "./CatalogPreview";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "json" | "linkedSelect" | "custom" | "hidden";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  linkedOptions?: { value: string; label: string }[];
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  hidden?: boolean;
  group?: string;
  /** 自訂渲染函數，type="custom" 時使用
   * 第4個參數 setFormData 可用於跨欄位更新（如裝備詞條、條件編輯器） */
  render?: (value: any, onChange: (val: any) => void, form: Record<string, any>, setFormData?: React.Dispatch<React.SetStateAction<Record<string, any>>>) => ReactNode;
  /** 提交時是否跳過 JSON.parse（已是物件） */
  skipParse?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  title: string;
  fields: FieldDef[];
  initialData?: Record<string, any> | null;
  isLoading?: boolean;
  /** 圖鑑類型，用於即時預覽 */
  catalogType?: string;
};

/** 帶搜尋篩選的關聯選擇器（取代原本的 Select） */
function LinkedSelectField({ field: f, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opts = f.linkedOptions ?? [];
  const filtered = search
    ? opts.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.value.toLowerCase().includes(search.toLowerCase()))
    : opts;
  const selectedLabel = value ? (opts.find(o => o.value === value)?.label ?? value) : "";

  // 點擊外部關閉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div key={f.key} className="space-y-1 relative" ref={ref}>
      <Label className="text-xs font-medium">{f.label}</Label>
      <div
        className="flex items-center h-8 px-2 text-xs border rounded cursor-pointer bg-background hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        <span className="flex-1 truncate">{selectedLabel || <span className="text-muted-foreground">選擇{f.label}</span>}</span>
        <span className="text-muted-foreground ml-1">▾</span>
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 flex flex-col">
          <div className="p-1.5 border-b">
            <input
              type="text"
              className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="🔍 搜尋篩選..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <div
              className="px-2 py-1.5 text-xs cursor-pointer hover:bg-muted text-muted-foreground"
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
            >
              （無）
            </div>
            {filtered.slice(0, 100).map(o => (
              <div
                key={o.value}
                className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-muted ${o.value === value ? "bg-primary/10 font-semibold" : ""}`}
                onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
              >
                {o.label}
              </div>
            ))}
            {filtered.length > 100 && (
              <div className="px-2 py-1 text-xs text-muted-foreground text-center">… 還有 {filtered.length - 100} 項，請輸入更多關鍵字</div>
            )}
            {filtered.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">找不到符合的項目</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CatalogFormDialog({ open, onClose, onSubmit, title, fields, initialData, isLoading, catalogType }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (open) {
      const init: Record<string, any> = {};
      fields.forEach(f => {
        if (initialData && initialData[f.key] !== undefined) {
          const raw = initialData[f.key];
          if ((f.type === "custom" || f.type === "json") && typeof raw === "string" && raw.trim()) {
            try { init[f.key] = JSON.parse(raw); } catch { init[f.key] = raw; }
          } else {
            init[f.key] = raw;
          }
        } else if (f.defaultValue !== undefined) {
          init[f.key] = f.defaultValue;
        } else if (f.type === "number") {
          init[f.key] = 0;
        } else if (f.type === "json" || f.type === "custom") {
          init[f.key] = f.defaultValue ?? null;
        } else {
          init[f.key] = "";
        }
      });
      setForm(init);
    }
  }, [open, initialData]);

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const data: Record<string, any> = {};
    fields.forEach(f => {
      if (f.key.startsWith("_")) return;
      let val = form[f.key];
      if (f.type === "hidden") {
        data[f.key] = val;
        return;
      }
      if (f.hidden) return;
      if (f.type === "number") {
        val = Number(val) || 0;
      } else if (f.type === "json" && !f.skipParse) {
        try { val = typeof val === "string" ? JSON.parse(val) : val; } catch { val = f.defaultValue ?? []; }
      }
      data[f.key] = val;
    });
    onSubmit(data);
  };

  // Group fields
  const groups: Record<string, FieldDef[]> = {};
  const ungrouped: FieldDef[] = [];
  fields.forEach(f => {
    if (f.hidden || f.type === "hidden") return;
    if (f.group) {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    } else {
      ungrouped.push(f);
    }
  });

  const renderField = (f: FieldDef) => {
    if (f.type === "hidden") return null;
    if (f.type === "custom" && f.render) {
      return (
        <div key={f.key} className="col-span-2">
          {f.render(form[f.key], (val) => handleChange(f.key, val), form, setForm)}
        </div>
      );
    }
    if (f.type === "select") {
      const opts = (f.options ?? []).map(o => ({ ...o, value: o.value === "" ? "__none__" : o.value }));
      const rawVal = form[f.key];
      const selectVal = (rawVal === null || rawVal === undefined || rawVal === "") ? "__none__" : String(rawVal);
      return (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-medium">{f.label}</Label>
          <Select value={selectVal} onValueChange={v => handleChange(f.key, v === "__none__" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={f.placeholder ?? `選擇${f.label}`} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {!opts.some(o => o.value === "__none__") && <SelectItem value="__none__">（未設定）</SelectItem>}
              {opts.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (f.type === "linkedSelect") {
      return <LinkedSelectField key={f.key} field={f} value={form[f.key] ?? ""} onChange={(v) => handleChange(f.key, v)} />;
    }
    if (f.type === "textarea") {
      return (
        <div key={f.key} className="space-y-1 col-span-2">
          <Label className="text-xs font-medium">{f.label}</Label>
          <Textarea value={form[f.key] ?? ""} onChange={e => handleChange(f.key, e.target.value)}
            placeholder={f.placeholder} className="text-xs min-h-[60px]" />
        </div>
      );
    }
    if (f.type === "json") {
      const val = form[f.key];
      const display = typeof val === "string" ? val : JSON.stringify(val, null, 2);
      return (
        <div key={f.key} className="space-y-1 col-span-2">
          <Label className="text-xs font-medium">{f.label} <span className="text-muted-foreground">(JSON)</span></Label>
          <Textarea value={display} onChange={e => handleChange(f.key, e.target.value)}
            placeholder={f.placeholder ?? '[]'} className="text-xs min-h-[60px] font-mono" />
        </div>
      );
    }
    if (f.type === "number") {
      return (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-medium">{f.label}</Label>
          <Input type="number" value={form[f.key] ?? 0} onChange={e => handleChange(f.key, e.target.value)}
            min={f.min} max={f.max} step={f.step ?? 1} className="h-8 text-xs" />
        </div>
      );
    }
    return (
      <div key={f.key} className="space-y-1">
        <Label className="text-xs font-medium">{f.label}</Label>
        <Input value={form[f.key] ?? ""} onChange={e => handleChange(f.key, e.target.value)}
          placeholder={f.placeholder} className="h-8 text-xs" />
      </div>
    );
  };

  const hasPreview = !!catalogType;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={`max-h-[85vh] overflow-y-auto max-sm:max-w-[95vw] max-sm:p-3 ${hasPreview ? "sm:max-w-4xl" : "sm:max-w-2xl"}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{title}</DialogTitle>
            {hasPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                {showPreview ? "隱藏預覽" : "顯示預覽"}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className={`flex gap-4 ${hasPreview && showPreview ? "flex-col sm:flex-row" : ""}`}>
          {/* 左側：表單 */}
          <div className={`space-y-4 ${hasPreview && showPreview ? "sm:flex-1 sm:min-w-0" : "w-full"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ungrouped.map(renderField)}
            </div>
            {Object.entries(groups).map(([groupName, gFields]) => (
              <div key={groupName}>
                <h4 className="text-xs font-bold text-muted-foreground border-b pb-1 mb-2">{groupName}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gFields.map(renderField)}
                </div>
              </div>
            ))}
          </div>

          {/* 右側：即時預覽 */}
          {hasPreview && showPreview && (
            <div className="sm:w-64 sm:shrink-0 sm:sticky sm:top-0">
              <CatalogPreview catalogType={catalogType!} formData={form} />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">取消</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? "儲存中…" : (initialData ? "更新" : "新增")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
