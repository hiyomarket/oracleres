import { useState } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Clock, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";

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

export default function ExpertServices() {

  const utils = trpc.useUtils();
  const { data: services = [], isLoading } = trpc.expert.listMyServices.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(defaultForm);

  const createMutation = trpc.expert.createService.useMutation({
    onSuccess: () => {
      toast("✅ 服務項目已新增");
      utils.expert.listMyServices.invalidate();
      setDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error("新增失敗: " + e.message),
  });

  const updateMutation = trpc.expert.updateService.useMutation({
    onSuccess: () => {
      toast("✅ 服務項目已更新");
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
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

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
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6">
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">服務項目管理</h1>
            <p className="text-muted-foreground text-sm mt-1">設定您提供的服務類型和收費標準</p>
          </div>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-1" /> 新增服務
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">載入中…</div>
        ) : services.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">還沒有服務項目</p>
              <Button variant="outline" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> 新增第一個服務
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <Card key={s.id} className={s.isActive ? "" : "opacity-60"}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{s.title}</h3>
                      <Badge
                        className={
                          s.type === "online"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs"
                            : "bg-green-500/20 text-green-400 border border-green-500/30 text-xs"
                        }
                      >
                        {s.type === "online" ? "線上" : "面對面"}
                      </Badge>
                      {!s.isActive && (
                        <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30 text-xs">
                          已停用
                        </Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{s.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {s.durationMinutes} 分鐘
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <DollarSign className="w-3 h-3" /> NT$ {s.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleMutation.mutate({ id: s.id, isActive: !s.isActive })}
                    >
                      {s.isActive ? (
                        <ToggleRight className="w-4 h-4 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      onClick={() => deleteMutation.mutate({ id: s.id })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 新增/編輯 Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "編輯服務項目" : "新增服務項目"}</DialogTitle>
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
                  placeholder="詳細說明這個服務包含什麼…"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">時長（分鐘）</label>
                  <Input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">收費（元）</label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">服務方式</label>
                <div className="flex gap-2">
                  {[
                    { key: "online", label: "線上" },
                    { key: "offline", label: "面對面" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setForm((f) => ({ ...f, type: t.key as "online" | "offline" }))}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        form.type === t.key
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "border-border text-muted-foreground hover:border-amber-500/40"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
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
                {editingId ? "更新" : "新增"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ExpertLayout>
  );
}
