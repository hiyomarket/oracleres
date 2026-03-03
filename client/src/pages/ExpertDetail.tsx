import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { SharedNav } from "@/components/SharedNav";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, ArrowLeft, Calendar, Clock, MessageSquare, Upload } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款確認",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
};

export default function ExpertDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [showBooking, setShowBooking] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const expertId = parseInt(id ?? "0");
  const now = new Date();
  const [slotYear] = useState(now.getFullYear());
  const [slotMonth] = useState(now.getMonth() + 1);

  const { data: expertData, isLoading } = trpc.expert.getExpertDetails.useQuery({ expertId });
  const expert = expertData?.expert;
  const availableSlots = (expertData?.availSlots ?? []);

  const bookMutation = trpc.expert.createBooking.useMutation({
    onSuccess: () => {
      toast("✅ 預約成功！請上傳付款憑證以完成確認");
      utils.expert.getCalendarData.invalidate();
      setShowBooking(false);
      setSelectedSlotId(null);
      setNotes("");
    },
    onError: (e) => toast.error("預約失敗: " + e.message),
  });

  const uploadProofMutation = trpc.expert.uploadPaymentProof.useMutation({
    onSuccess: () => {
      toast("✅ 付款憑證已上傳，等待專家確認");
      setPaymentProofFile(null);
    },
    onError: (e) => toast.error("上傳失敗: " + e.message),
  });
  void uploadProofMutation;

  const handleBook = () => {
    if (!selectedServiceId || !selectedSlotId) {
      toast.error("請選擇服務項目和時段");
      return;
    }
    bookMutation.mutate({
      expertId,
      serviceId: selectedServiceId,
      availabilityId: selectedSlotId,
      notes: notes.trim() || undefined,
    });
  };

  const handleUploadProof = async (bookingId: number) => {
    if (!paymentProofFile) return;
    setUploadingProof(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(paymentProofFile);
      });
      await uploadProofMutation.mutateAsync({ bookingId, imageBase64: base64, mimeType: paymentProofFile.type });
    } catch (e: unknown) {
      toast.error("上傳失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploadingProof(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SharedNav currentPage="experts" />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-48 rounded-xl bg-accent/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-background">
        <SharedNav currentPage="experts" />
        <div className="max-w-3xl mx-auto px-4 py-8 text-center text-muted-foreground">
          找不到此專家
        </div>
      </div>
    );
  }

  const services = expertData?.services ?? [];
  const reviews: Array<{ id: number; rating: number; comment: string | null; expertReply: string | null; createdAt: Date }> = [];

  return (
    <div className="min-h-screen bg-background">
      <SharedNav currentPage="experts" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/experts")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 返回專家市集
        </button>

        {/* Expert Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 flex-shrink-0 overflow-hidden">
                {expert.profileImageUrl ? (
                  <img src={expert.profileImageUrl} alt={expert.publicName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {expert.publicName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold">{expert.publicName}</h1>
                {expert.title && <p className="text-muted-foreground mt-0.5">{expert.title}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-amber-400 font-medium">
                    {expert.ratingAvg ? Number(expert.ratingAvg).toFixed(1) : "新"}
                  </span>
                  <span className="text-muted-foreground text-sm">({expert.ratingCount ?? 0} 評價)</span>
                </div>
                {expert.tags && (expert.tags as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(expert.tags as string[]).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {expert.bio && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{expert.bio}</p>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">服務項目</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">目前尚未設定服務項目</p>
            ) : (
              <>
                {services.map((svc: { id: number; title: string; description: string | null; durationMinutes: number | null; price: number | null }) => (
                <div
                  key={svc.id}
                  onClick={() => {
                    if (!user) { toast.error("請先登入"); return; }
                    setSelectedServiceId(svc.id);
                    setShowBooking(true);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedServiceId === svc.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border/50 hover:border-amber-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{svc.title}</h3>
                      {svc.description && (
                        <p className="text-sm text-muted-foreground mt-1">{svc.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {svc.durationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {svc.durationMinutes} 分鐘
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-amber-400">NT$ {svc.price?.toLocaleString() ?? "洽談"}</p>
                    </div>
                  </div>
                </div>
              ))}
              </>
            )}
          </CardContent>
        </Card>
        {/* Booking Panel */}
        {showBooking && selectedServiceId && (
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> 選擇預約時段
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">本月暫無可預約時段，請聯繫專家</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        selectedSlotId === slot.id
                          ? "bg-amber-500 text-black border-amber-500"
                          : "border-border/50 hover:border-amber-500/50"
                      }`}
                    >
                      {new Date(slot.startTime).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}{" "}
                      {new Date(slot.startTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <Label className="text-sm">備註（選填）</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="請輸入您的問題或特殊需求…"
                  className="mt-1.5 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                  onClick={handleBook}
                  disabled={!selectedSlotId || bookMutation.isPending}
                >
                  確認預約
                </Button>
                <Button variant="outline" onClick={() => { setShowBooking(false); setSelectedServiceId(null); }}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> 用戶評價
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">目前尚無評價</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r: { id: number; rating: number; comment: string | null; expertReply: string | null; createdAt: Date }) => (
                  <div key={r.id} className="border-b border-border/30 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm">{r.comment}</p>}
                    {r.expertReply && (
                      <div className="mt-2 pl-3 border-l-2 border-amber-500/30">
                        <p className="text-xs text-muted-foreground">專家回覆：</p>
                        <p className="text-sm mt-0.5">{r.expertReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
