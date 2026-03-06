import { useState } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Clock, DollarSign, ToggleLeft, ToggleRight,
  Video, Users, MessageSquare, Handshake, Star, Zap, Sparkles,
} from "lucide-react";

interface ServiceForm {
  title: string;
  description: string;
  durationMinutes: number;
  price: number;
  type: "online" | "offline";
}

const defaultForm: ServiceForm = {
  title: "",
  description: "",
  durationMinutes: 60,
  price: 1000,
  type: "online",
};

const DURATION_PRESETS = [30, 45, 60, 90, 120];
const PRICE_PRESETS = [500, 800, 1000, 1500, 2000, 3000];

// Service card icon based on duration/type
function ServiceIcon({ type, price }: { type: string; price: number }) {
  if (price >= 2000) return <Star className="w-5 h-5 text-amber-400" />;
  if (type === "offline") return <Handshake className="w-5 h-5 text-green-400" />;
  return <Video className="w-5 h-5 text-blue-400" />;
}

export default function ExpertServices() {
  const utils = trpc.useUtils();
  const { data: services = [], isLoading } = trpc.expert.listMyServices.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(defaultForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const createMutation = trpc.expert.createService.useMutation({
    onSuccess: () => {
      toast.success("✅ 服務項目已新增");
      utils.expert.listMyServices.invalidate();
      setDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error("新增失敗: " + e.message),
  });

  const updateMutation = trpc.expert.updateService.useMutation({
    onSuccess: () => {
      toast.success("✅ 服務項目已更新");
      utils.expert.listMyServices.invalidate();
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (e) => toast.error("更新失敗: " + e.message),
  });

  const deleteMutation = trpc.expert.deleteService.useMutation({
    onSuccess: () => {
      toast("已刪除服務項目");
      utils.expert.listMyServices.invalidate();
      setDeleteConfirmId(null);
    },
  });

  const toggleMutation = trpc.expert.toggleServiceActive.useMutation({
    onSuccess: () => utils.expert.listMyServices.invalidate(),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (s: typeof services[0]) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      description: s.description || "",
      durationMinutes: s.durationMinutes,
      price: s.price,
      type: s.type as "online" | "offline",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("請填寫服務名稱"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const activeServices = services.filter((s) => s.isActive);
  const inactiveServices = services.filter((s) => !s.isActive);

  const quickAddBtn = (
    <Button
      size="sm"
      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-3 h-8"
      onClick={openCreate}
    >
      <Plus className="w-3.5 h-3.5 mr-1" /> 新增服務
    </Button>
  );

  return (
    <ExpertLayout headerAction={quickAddBtn} pageTitle="服務項目">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">服務項目管理</h1>
            <p className="text-muted-foreground text-sm mt-1">設計您的服務套餐，吸引更多客戶預約</p>
          </div>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-1" /> 新增服務
          </Button>
        </div>

        {/* 統計摘要 */}
        {services.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{services.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">總服務數</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{activeServices.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">上架中</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-3 text-center">
              <div className="text-2xl font-bold text-foreground">
                {services.length > 0 ? `NT$${Math.min(...services.map((s) => s.price)).toLocaleString()}` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">最低起價</div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">還沒有服務項目</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              新增您的第一個服務套餐，讓用戶可以預約您的諮詢服務
            </p>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> 新增第一個服務
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 上架中的服務 */}
            {activeServices.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-green-400" /> 上架中（{activeServices.length}）
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeServices.map((s) => (
                    <ServiceCard
                      key={s.id}
                      service={s}
                      onEdit={() => openEdit(s)}
                      onToggle={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                      onDelete={() => setDeleteConfirmId(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 已停用的服務 */}
            {inactiveServices.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <ToggleLeft className="w-3.5 h-3.5" /> 已停用（{inactiveServices.length}）
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                  {inactiveServices.map((s) => (
                    <ServiceCard
                      key={s.id}
                      service={s}
                      onEdit={() => openEdit(s)}
                      onToggle={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                      onDelete={() => setDeleteConfirmId(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 新增/編輯 Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? "編輯服務項目" : "新增服務項目"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">服務名稱 *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例如：八字命盤深度解析"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">服務說明</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="詳細說明這個服務包含什麼、適合哪些人、可以解答哪些問題…"
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* 時長 */}
              <div>
                <label className="text-sm font-medium mb-2 block">服務時長</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setForm((f) => ({ ...f, durationMinutes: d }))}
                      className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                        form.durationMinutes === d
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "border-border text-muted-foreground hover:border-amber-500/40"
                      }`}
                    >
                      {d} 分鐘
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                    className="w-24 text-sm"
                    min={15}
                    max={480}
                  />
                  <span className="text-sm text-muted-foreground">分鐘（自訂）</span>
                </div>
              </div>

              {/* 收費 */}
              <div>
                <label className="text-sm font-medium mb-2 block">收費金額</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {PRICE_PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm((f) => ({ ...f, price: p }))}
                      className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                        form.price === p
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "border-border text-muted-foreground hover:border-amber-500/40"
                      }`}
                    >
                      NT${p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">NT$</span>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    className="w-28 text-sm"
                    min={0}
                  />
                  <span className="text-sm text-muted-foreground">（自訂）</span>
                </div>
              </div>

              {/* 服務方式 */}
              <div>
                <label className="text-sm font-medium mb-2 block">服務方式</label>
                <div className="flex gap-2">
                  {[
                    { key: "online", label: "線上諮詢", icon: Video },
                    { key: "offline", label: "面對面", icon: Handshake },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setForm((f) => ({ ...f, type: t.key as "online" | "offline" }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm border transition-colors ${
                          form.type === t.key
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "border-border text-muted-foreground hover:border-amber-500/40"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-black"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "更新服務" : "新增服務"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 刪除確認 Dialog */}
        <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>確認刪除</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              刪除後無法復原，且此服務相關的歷史訂單不受影響。確定要刪除嗎？
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>取消</Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })}
                disabled={deleteMutation.isPending}
              >
                確認刪除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ExpertLayout>
  );
}

// ── 服務卡片元件 ──────────────────────────────────────────────────────────────
function ServiceCard({
  service,
  onEdit,
  onToggle,
  onDelete,
}: {
  service: {
    id: number;
    title: string;
    description: string | null;
    durationMinutes: number;
    price: number;
    type: string;
    isActive: number | boolean;
  };
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isActive = Boolean(service.isActive);
  return (
    <Card className={`group relative overflow-hidden transition-all hover:border-amber-500/30 ${isActive ? "" : "opacity-70"}`}>
      {/* 頂部色條 */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${
          service.type === "offline" ? "bg-gradient-to-r from-green-500 to-teal-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
        }`}
      />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              service.type === "offline" ? "bg-green-500/10" : "bg-blue-500/10"
            }`}>
              <ServiceIcon type={service.type} price={service.price} />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{service.title}</h3>
              <Badge
                className={`text-xs mt-0.5 ${
                  service.type === "online"
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                    : "bg-green-500/15 text-green-400 border-green-500/25"
                } border`}
              >
                {service.type === "online" ? "線上" : "面對面"}
              </Badge>
            </div>
          </div>
          {/* 操作按鈕 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onToggle}
              title={isActive ? "停用" : "啟用"}
            >
              {isActive ? (
                <ToggleRight className="w-4 h-4 text-green-400" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-400/70 hover:text-red-400"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {service.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {service.durationMinutes} 分鐘
            </span>
          </div>
          <div className="text-base font-bold text-amber-400">
            NT$ {service.price.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
