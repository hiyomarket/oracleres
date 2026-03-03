/**
 * AdminBanners - 後台全站廣告/公告管理
 * 管理員可新增、編輯、啟用/停用、刪除全站懸浮橫幅
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Megaphone } from "lucide-react";

type BannerType = "info" | "warning" | "success" | "promo";

interface Banner {
  id: number;
  title: string;
  content: string;
  linkUrl: string | null;
  linkText: string | null;
  icon: string | null;
  type: BannerType;
  isActive: number;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}

const TYPE_LABELS: Record<BannerType, string> = {
  info: "一般資訊",
  warning: "警告提示",
  success: "成功/好消息",
  promo: "促銷活動",
};

const TYPE_BADGE: Record<BannerType, string> = {
  info: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  warning: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  promo: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const EMPTY_FORM = {
  title: "",
  content: "",
  linkUrl: "",
  linkText: "",
  icon: "🔔",
  type: "info" as BannerType,
  isActive: true,
  sortOrder: 0,
  startsAt: "",
  endsAt: "",
};

export default function AdminBanners() {
  const { data: banners = [], refetch } = trpc.siteBanner.list.useQuery();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const createMutation = trpc.siteBanner.create.useMutation({
    onSuccess: () => { toast.success("廣告已新增"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(`新增失敗：${e.message}`),
  });

  const updateMutation = trpc.siteBanner.update.useMutation({
    onSuccess: () => { toast.success("廣告已更新"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(`更新失敗：${e.message}`),
  });

  const toggleMutation = trpc.siteBanner.toggleActive.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(`操作失敗：${e.message}`),
  });

  const deleteMutation = trpc.siteBanner.delete.useMutation({
    onSuccess: () => { toast.success("廣告已刪除"); refetch(); },
    onError: (e) => toast.error(`刪除失敗：${e.message}`),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowDialog(true);
  };

  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      content: b.content,
      linkUrl: b.linkUrl ?? "",
      linkText: b.linkText ?? "",
      icon: b.icon ?? "🔔",
      type: b.type,
      isActive: b.isActive === 1,
      sortOrder: b.sortOrder,
      startsAt: b.startsAt ? new Date(b.startsAt).toISOString().slice(0, 16) : "",
      endsAt: b.endsAt ? new Date(b.endsAt).toISOString().slice(0, 16) : "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("標題和內容為必填");
      return;
    }
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      linkUrl: form.linkUrl.trim() || undefined,
      linkText: form.linkText.trim() || undefined,
      icon: form.icon.trim() || "🔔",
      type: form.type,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
    };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* 頁首 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-400" />
              全站廣告/公告管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理全站懸浮橫幅廣告，用戶可一鍵收納成小圓球
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            新增廣告
          </Button>
        </div>

        {/* 廣告列表 */}
        {(banners as Banner[]).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>尚無廣告，點擊「新增廣告」開始建立</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(banners as Banner[]).map((b) => (
              <div
                key={b.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  b.isActive === 1
                    ? "bg-card border-border"
                    : "bg-muted/30 border-border/50 opacity-60"
                }`}
              >
                {/* 圖示 */}
                <div className="text-2xl flex-shrink-0 mt-0.5">{b.icon || "🔔"}</div>

                {/* 內容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{b.title}</span>
                    <Badge className={`text-xs border ${TYPE_BADGE[b.type]}`}>
                      {TYPE_LABELS[b.type]}
                    </Badge>
                    <Badge variant={b.isActive === 1 ? "default" : "secondary"} className="text-xs">
                      {b.isActive === 1 ? "啟用中" : "已停用"}
                    </Badge>
                    {b.sortOrder > 0 && (
                      <span className="text-xs text-muted-foreground">排序 {b.sortOrder}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{b.content}</p>
                  {b.linkUrl && (
                    <p className="text-xs text-blue-400 mt-1 truncate">
                      🔗 {b.linkUrl}
                    </p>
                  )}
                  {(b.startsAt || b.endsAt) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.startsAt && `開始：${new Date(b.startsAt).toLocaleString("zh-TW")}`}
                      {b.startsAt && b.endsAt && " ・ "}
                      {b.endsAt && `結束：${new Date(b.endsAt).toLocaleString("zh-TW")}`}
                    </p>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: b.id, isActive: b.isActive !== 1 })}
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    title={b.isActive === 1 ? "停用" : "啟用"}
                  >
                    {b.isActive === 1 ? (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    title="編輯"
                  >
                    <Pencil className="w-4 h-4 text-blue-400" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`確定刪除「${b.title}」嗎？`)) {
                        deleteMutation.mutate({ id: b.id });
                      }
                    }}
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-red-500/20 flex items-center justify-center transition-colors"
                    title="刪除"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增/編輯 Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "編輯廣告" : "新增廣告"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>圖示（emoji）</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="🔔"
                  className="text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label>類型</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as BannerType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>標題 <span className="text-red-400">*</span></Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例：WBC 2026 天命競猜進行中"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label>內容 <span className="text-red-400">*</span></Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="例：下場 TW中華台北 VS AU澳大利亞・3/5 上午11:00"
                maxLength={300}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>點擊連結（選填）</Label>
                <Input
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="https://... 或 /page"
                />
              </div>
              <div className="space-y-1.5">
                <Label>連結文字（選填）</Label>
                <Input
                  value={form.linkText}
                  onChange={(e) => setForm((f) => ({ ...f, linkText: e.target.value }))}
                  placeholder="查看詳情"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>開始時間（選填）</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>結束時間（選填）</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>排序（數字越小越優先）</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>立即啟用</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                  <span className="text-sm text-muted-foreground">{form.isActive ? "啟用" : "停用"}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
