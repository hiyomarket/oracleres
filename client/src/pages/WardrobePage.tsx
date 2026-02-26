import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Edit2, Shirt } from "lucide-react";

const CATEGORIES = [
  { value: "upper", label: "上衣" },
  { value: "lower", label: "下身" },
  { value: "outer", label: "外套" },
  { value: "shoes", label: "鞋子" },
  { value: "accessory", label: "配件" },
];

const WUXING_OPTIONS = [
  { value: "木", label: "🌿 木", color: "text-green-400" },
  { value: "火", label: "🔥 火", color: "text-red-400" },
  { value: "土", label: "🌍 土", color: "text-yellow-600" },
  { value: "金", label: "✨ 金", color: "text-yellow-300" },
  { value: "水", label: "💧 水", color: "text-blue-400" },
];

const WUXING_COLORS: Record<string, string> = {
  木: "bg-green-900/40 text-green-300 border-green-700",
  火: "bg-red-900/40 text-red-300 border-red-700",
  土: "bg-yellow-900/40 text-yellow-600 border-yellow-700",
  金: "bg-yellow-800/40 text-yellow-200 border-yellow-500",
  水: "bg-blue-900/40 text-blue-300 border-blue-700",
};

type WardrobeItem = {
  id: number;
  name: string;
  category: string;
  color: string;
  wuxing: string;
  occasion?: string | null;
  imageUrl?: string | null;
  note?: string | null;
};

type FormData = {
  name: string;
  category: string;
  color: string;
  wuxing: string;
  occasion: string;
  note: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  category: "top",
  color: "",
  wuxing: "",
  occasion: "",
  note: "",
};

export default function WardrobePage() {
  // toast from sonner
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<WardrobeItem | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: items = [], isLoading } = trpc.wardrobe.list.useQuery(
    filterCategory !== "all" ? { category: filterCategory } : undefined
  );

  const addMutation = trpc.wardrobe.add.useMutation({
    onSuccess: () => {
      utils.wardrobe.list.invalidate();
      toast.success("已新增衣物");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error("新增失敗: " + e.message),
  });

  const updateMutation = trpc.wardrobe.update.useMutation({
    onSuccess: () => {
      utils.wardrobe.list.invalidate();
      toast.success("已更新衣物");
      setDialogOpen(false);
      setEditItem(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error("更新失敗: " + e.message),
  });

  const deleteMutation = trpc.wardrobe.delete.useMutation({
    onSuccess: () => {
      utils.wardrobe.list.invalidate();
      toast.success("已刪除衣物");
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error("刪除失敗: " + e.message),
  });

  function openAdd() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: WardrobeItem) {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      color: item.color,
      wuxing: item.wuxing,
      occasion: item.occasion ?? "",
      note: item.note ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.color.trim()) {
      toast.error("請填寫名稱與顏色");
      return;
    }
    const catVal = form.category as "upper" | "lower" | "shoes" | "outer" | "accessory";
    if (editItem) {
      updateMutation.mutate({
        id: editItem.id,
        name: form.name,
        category: catVal,
        color: form.color,
        wuxing: form.wuxing as "木" | "火" | "土" | "金" | "水" | undefined,
        occasion: form.occasion || undefined,
        note: form.note || undefined,
      });
    } else {
      addMutation.mutate({
        name: form.name,
        category: catVal,
        color: form.color,
        wuxing: form.wuxing as "木" | "火" | "土" | "金" | "水" | undefined,
        occasion: form.occasion || undefined,
        note: form.note || undefined,
      });
    }
  }

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SharedNav currentPage="outfit" />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shirt className="w-6 h-6 text-amber-400" />
              虛擬衣櫥
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              建立你的衣物資料庫，讓神諭穿搭從你的衣櫥中挑選最佳搭配
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="bg-amber-600 hover:bg-amber-500 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            新增衣物
          </Button>
        </div>

        {/* 分類篩選 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filterCategory === "all"
                ? "bg-amber-600 border-amber-500 text-white"
                : "border-white/20 text-gray-400 hover:border-amber-500 hover:text-amber-400"
            }`}
          >
            全部 ({items.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  filterCategory === cat.value
                    ? "bg-amber-600 border-amber-500 text-white"
                    : "border-white/20 text-gray-400 hover:border-amber-500 hover:text-amber-400"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 衣物列表 */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Shirt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">衣櫥是空的</p>
            <p className="text-sm mt-1">點擊「新增衣物」開始建立你的衣物資料庫</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative bg-white/5 border border-white/10 rounded-xl p-4 hover:border-amber-500/40 transition-colors group"
              >
                {/* 五行標籤 */}
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full border mb-2 ${
                    WUXING_COLORS[item.wuxing] ?? "bg-gray-700 text-gray-300 border-gray-600"
                  }`}
                >
                  {item.wuxing} 系
                </span>

                {/* 顏色色塊 */}
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: item.color.startsWith("#") ? item.color : undefined }}
                  />
                  <span className="font-medium text-sm truncate">{item.name}</span>
                </div>

                <div className="text-xs text-gray-400 space-y-0.5">
                  <div>{categoryLabel(item.category)} · {item.color}</div>
                  {item.occasion && <div className="truncate">場合：{item.occasion}</div>}
                  {item.note && <div className="truncate text-gray-500">{item.note}</div>}
                </div>

                {/* 操作按鈕 */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1 rounded bg-white/10 hover:bg-amber-600/50 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-1 rounded bg-white/10 hover:bg-red-600/50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 統計小結 */}
        {items.length > 0 && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-sm text-gray-400 mb-2">衣櫥五行分佈</p>
            <div className="flex flex-wrap gap-2">
              {["木", "火", "土", "金", "水"].map((wx) => {
                const count = items.filter((i) => i.wuxing === wx).length;
                return (
                  <span
                    key={wx}
                    className={`text-xs px-3 py-1 rounded-full border ${WUXING_COLORS[wx]}`}
                  >
                    {wx} {count} 件
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditItem(null); }}>
        <DialogContent className="bg-[#1a1a2e] border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "編輯衣物" : "新增衣物"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">名稱 *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例：白色棉質T恤"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">分類 *</label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/20 text-white">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">主色 *</label>
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  placeholder="例：白色、#FFFFFF"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">五行屬性（留空自動推算）</label>
              <Select value={form.wuxing} onValueChange={(v) => setForm((f) => ({ ...f, wuxing: v }))}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="自動推算" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/20 text-white">
                  {WUXING_OPTIONS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">適合場合</label>
              <Input
                value={form.occasion}
                onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                placeholder="例：上班、約會、休閒"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">備註</label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="例：媽媽送的、只有夏天穿"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/20">
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addMutation.isPending || updateMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {editItem ? "儲存變更" : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="bg-[#1a1a2e] border-white/20 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400 text-sm">確定要從衣櫥中移除這件衣物嗎？此操作無法復原。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-white/20">
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate({ id: deleteConfirmId })}
              disabled={deleteMutation.isPending}
            >
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
