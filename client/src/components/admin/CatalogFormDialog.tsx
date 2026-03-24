/**
 * 通用圖鑑新增/編輯 Dialog
 * 支援文字、數字、下拉選單、JSON 欄位
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "json" | "linkedSelect";
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  title: string;
  fields: FieldDef[];
  initialData?: Record<string, any> | null;
  isLoading?: boolean;
};

export default function CatalogFormDialog({ open, onClose, onSubmit, title, fields, initialData, isLoading }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, any> = {};
      fields.forEach(f => {
        if (initialData && initialData[f.key] !== undefined) {
          init[f.key] = initialData[f.key];
        } else if (f.defaultValue !== undefined) {
          init[f.key] = f.defaultValue;
        } else if (f.type === "number") {
          init[f.key] = 0;
        } else if (f.type === "json") {
          init[f.key] = "";
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
      if (f.hidden) return;
      let val = form[f.key];
      if (f.type === "number") {
        val = Number(val) || 0;
      } else if (f.type === "json") {
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
    if (f.hidden) return;
    if (f.group) {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    } else {
      ungrouped.push(f);
    }
  });

  const renderField = (f: FieldDef) => {
    if (f.type === "select" || f.type === "linkedSelect") {
      const opts = f.type === "linkedSelect" ? (f.linkedOptions ?? []) : (f.options ?? []);
      return (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-medium">{f.label}</Label>
          <Select value={form[f.key] ?? ""} onValueChange={v => handleChange(f.key, v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={f.placeholder ?? `選擇${f.label}`} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {f.type === "linkedSelect" && <SelectItem value="__none__">（無）</SelectItem>}
              {opts.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Ungrouped fields */}
          <div className="grid grid-cols-2 gap-3">
            {ungrouped.map(renderField)}
          </div>
          {/* Grouped fields */}
          {Object.entries(groups).map(([groupName, gFields]) => (
            <div key={groupName}>
              <h4 className="text-xs font-bold text-muted-foreground border-b pb-1 mb-2">{groupName}</h4>
              <div className="grid grid-cols-2 gap-3">
                {gFields.map(renderField)}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "儲存中…" : (initialData ? "更新" : "新增")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
