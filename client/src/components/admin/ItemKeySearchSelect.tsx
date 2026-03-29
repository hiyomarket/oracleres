/**
 * ItemKeySearchSelect — 道具 Key 搜尋選擇器
 * 從道具圖鑑 + 裝備圖鑑中搜尋並選擇，取代手動輸入 Key
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

interface Props {
  value: string;
  onChange: (itemKey: string, displayName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CATEGORY_ZH: Record<string, string> = {
  material_basic: "基礎素材", material_drop: "掉落素材", material: "素材",
  consumable: "消耗品", quest: "任務道具", treasure: "寶物",
  skillbook: "技能書", equipment_material: "裝備材料", scroll: "卷軸",
};

export default function ItemKeySearchSelect({ value, onChange, placeholder = "搜尋道具名稱或 Key…", disabled }: Props) {
  const { data: items = [] } = trpc.gameAdmin.getAllItems.useQuery();
  const { data: equips = [] } = trpc.gameAdmin.getAllEquipments.useQuery();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Merge items + equips into a unified list
  const allOptions = useMemo(() => {
    const opts: { key: string; name: string; tag: string; tagColor: string }[] = [];
    for (const i of items) {
      opts.push({ key: i.itemId, name: i.name, tag: CATEGORY_ZH[i.category] ?? i.category, tagColor: "bg-emerald-500/20 text-emerald-400" });
    }
    for (const e of equips) {
      const slotZH: Record<string, string> = { weapon: "武器", armor: "防具", accessory: "飾品", helmet: "頭盔", boots: "鞋子", shield: "盾牌", ring: "戒指", necklace: "項鏈" };
      opts.push({ key: e.equipId, name: e.name, tag: slotZH[e.slot] ?? e.slot, tagColor: "bg-blue-500/20 text-blue-400" });
    }
    return opts;
  }, [items, equips]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return allOptions.slice(0, 50);
    const q = search.toLowerCase();
    return allOptions.filter(o => o.name.toLowerCase().includes(q) || o.key.toLowerCase().includes(q)).slice(0, 50);
  }, [allOptions, search]);

  // Resolve display name for current value
  const displayName = useMemo(() => {
    if (!value) return "";
    const found = allOptions.find(o => o.key === value);
    return found ? `${found.name}（${found.key}）` : value;
  }, [value, allOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder={placeholder}
        value={open ? search : displayName}
        onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(""); }}
        disabled={disabled}
        className={value && !open ? "font-medium" : ""}
      />
      {value && !open && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          onClick={() => { onChange("", ""); setSearch(""); }}
        >
          ✕
        </button>
      )}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              找不到符合的道具
            </div>
          ) : (
            filtered.map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 ${opt.key === value ? "bg-muted/30" : ""}`}
                onClick={() => {
                  onChange(opt.key, opt.name);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${opt.tagColor}`}>{opt.tag}</span>
                <span className="font-medium">{opt.name}</span>
                <span className="text-xs text-muted-foreground font-mono ml-auto">{opt.key}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
