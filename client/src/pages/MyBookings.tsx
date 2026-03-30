import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, Clock, Star, MessageCircle, Upload,
  CheckCircle2, CreditCard, AlertCircle, Image, Info,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { BOOKING_STATUS_COLOR as STATUS_COLOR, BOOKING_STATUS_LABEL as STATUS_LABEL } from "@/lib/expertConstants";
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending_payment: <AlertCircle className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle2 className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  cancelled: <AlertCircle className="w-3.5 h-3.5" />,
};

type StatusFilter = "all" | "pending_payment" | "confirmed" | "completed" | "cancelled";

export default function MyBookings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [paymentBookingId, setPaymentBookingId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "credit_card" | "other">("bank_transfer");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: bookings = [], isLoading } = trpc.expert.myBookings.useQuery({ status: statusFilter });

  // P0-2: 動態讀取 ATM 轉帳資訊
  const { data: bankNameSetting } = trpc.expert.getSystemSetting.useQuery({ key: "payment_bank_name" });
  const { data: bankAccountSetting } = trpc.expert.getSystemSetting.useQuery({ key: "payment_bank_account" });
  const { data: bankHolderSetting } = trpc.expert.getSystemSetting.useQuery({ key: "payment_bank_holder" });
  const bankName = bankNameSetting?.settingValue || "（尚未設定，請聯繫專家）";
  const bankAccount = bankAccountSetting?.settingValue || "（尚未設定，請聯繫專家）";
  const bankHolder = bankHolderSetting?.settingValue || "（尚未設定，請聯繫專家）";

  const submitReviewMutation = trpc.expert.submitReview.useMutation({
    onSuccess: () => {
      toast.success("✅ 評價已送出，感謝您的回饋！");
      setReviewBookingId(null);
      setReviewComment("");
      setReviewRating(5);
      utils.expert.myBookings.invalidate();
    },
    onError: (e: { message: string }) => toast.error("送出失敗: " + e.message),
  });

  const cancelMutation = trpc.expert.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success("訂單已取消");
      setCancelBookingId(null);
      setCancelReason("");
      utils.expert.myBookings.invalidate();
    },
    onError: (e: { message: string }) => toast.error("取消失敗: " + e.message),
  });

  const uploadProofMutation = trpc.expert.uploadPaymentProof.useMutation({
    onSuccess: () => {
      toast.success("✅ 付款憑證已上傳，等待專家確認");
      setPaymentBookingId(null);
      setPaymentProofFile(null);
      utils.expert.myBookings.invalidate();
    },
    onError: (e: { message: string }) => toast.error("上傳失敗: " + e.message),
  });

  const handleUploadProof = async () => {
    if (!paymentProofFile || !paymentBookingId) return;
    setUploadingProof(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(paymentProofFile);
      });
      await uploadProofMutation.mutateAsync({
        bookingId: paymentBookingId,
        imageBase64: base64,
        mimeType: paymentProofFile.type,
      });
    } catch (e: unknown) {
      toast.error("上傳失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploadingProof(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">請先登入以查看預約記錄</p>
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black">
            <a href={getLoginUrl()}>立即登入</a>
          </Button>
        </div>
      </div>
    );
  }

  const tabs: { label: string; value: StatusFilter; count?: number }[] = [
    { label: "全部", value: "all" },
    { label: "待付款", value: "pending_payment" },
    { label: "已確認", value: "confirmed" },
    { label: "已完成", value: "completed" },
    { label: "已取消", value: "cancelled" },
  ];

  const pendingCount = bookings.filter((b) => b.status === "pending_payment").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/experts")}>
            <ArrowLeft className="w-4 h-4" /> 返回
          </Button>
          <h1 className="font-bold text-lg">我的預約</h1>
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs ml-auto">
              {pendingCount} 筆待付款
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                statusFilter === tab.value
                  ? "bg-amber-500 text-black font-medium"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Booking List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-accent/30 animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">
                {statusFilter === "all" ? "目前沒有預約記錄" : `沒有「${STATUS_LABEL[statusFilter]}」的訂單`}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                前往專家市集，找到適合您的命理師
              </p>
              <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black">
                <Link href="/experts">瀏覽專家市集</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card
                key={booking.id}
                className={`border-border/50 transition-all ${
                  booking.status === "pending_payment" ? "border-yellow-500/30 bg-yellow-500/5" : ""
                }`}
              >
                <CardContent className="p-0">
                  {/* 頂部色條 */}
                  <div
                    className={`h-0.5 rounded-t-xl ${
                      booking.status === "pending_payment"
                        ? "bg-yellow-500"
                        : booking.status === "confirmed"
                        ? "bg-green-500"
                        : booking.status === "completed"
                        ? "bg-blue-500"
                        : "bg-red-500/50"
                    }`}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold">{booking.expertName ?? "專家"}</span>
                          <Badge
                            className={`text-xs border flex-shrink-0 flex items-center gap-1 ${STATUS_COLOR[booking.status] ?? ""}`}
                          >
                            {STATUS_ICON[booking.status]}
                            {STATUS_LABEL[booking.status] ?? booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {booking.serviceTitle ?? "服務"}
                        </p>
                      </div>
                      {booking.servicePrice != null && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-amber-400">
                            NT$ {booking.servicePrice.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 時間資訊 */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(booking.bookingTime).toLocaleDateString("zh-TW", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(booking.bookingTime).toLocaleTimeString("zh-TW", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {booking.serviceDuration && ` (${booking.serviceDuration} 分鐘)`}
                      </span>
                    </div>

                    {/* 備註 */}
                    {booking.notes && (
                      <p className="text-xs text-muted-foreground bg-accent/30 rounded-lg p-2.5 mb-3">
                        <span className="font-medium">備註：</span>{booking.notes}
                      </p>
                    )}

                    {/* 待付款提示 */}
                    {booking.status === "pending_payment" && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs mb-3">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>請完成付款以確認訂單。付款後請上傳付款憑證，等待專家確認。</span>
                      </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex gap-2 flex-wrap">
                      {booking.status === "pending_payment" && (
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-black text-xs"
                          onClick={() => setPaymentBookingId(booking.id)}
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" /> 付款說明 / 上傳憑證
                        </Button>
                      )}
                      {(booking.status === "confirmed" || booking.status === "pending_payment") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => navigate(`/messages?bookingId=${booking.id}`)}
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> 聯絡老師
                        </Button>
                      )}
                      {booking.status === "completed" && (
                        <Button
                          size="sm"
                          className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs"
                          onClick={() => setReviewBookingId(booking.id)}
                        >
                          <Star className="w-3.5 h-3.5 mr-1" /> 留下評價
                        </Button>
                      )}
                      {(booking.status === "pending_payment" || booking.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-red-400 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10"
                          onClick={() => { setCancelBookingId(booking.id); setCancelReason(""); }}
                        >
                          取消訂單
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 取消訂單 Dialog */}
      <Dialog open={cancelBookingId !== null} onOpenChange={(open) => !open && setCancelBookingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">確認取消訂單</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">取消後無法恢復，確定要取消此預約嗎？</p>
            <Textarea
              placeholder="取消原因（選填，將通知老師）"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelBookingId(null)}>保留訂單</Button>
            <Button
              variant="destructive"
              onClick={() => cancelBookingId && cancelMutation.mutate({ bookingId: cancelBookingId, reason: cancelReason || undefined })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "取消中…" : "確認取消"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 付款說明 Dialog */}
      <Dialog open={paymentBookingId !== null} onOpenChange={(open) => !open && setPaymentBookingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" /> 付款說明
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 付款方式說明 */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm space-y-2">
              <p className="font-medium text-amber-400">目前支援的付款方式</p>
              <div className="space-y-1.5 text-muted-foreground text-xs">
                <p>• <strong className="text-foreground">ATM 轉帳</strong>：請轉帳至指定帳戶後上傳轉帳截圖</p>
                <p>• <strong className="text-foreground">信用卡</strong>：線上金流串接開通後即可使用（即將上線）</p>
                <p>• <strong className="text-foreground">其他方式</strong>：請直接聯繫專家確認付款方式</p>
              </div>
            </div>

            {/* 轉帳資訊（從 systemSettings 動態讀取） */}
            <div className="p-3 rounded-lg bg-card border border-border text-xs space-y-1.5">
              <p className="font-medium text-sm mb-2">ATM 轉帳資訊</p>
              <p className="text-muted-foreground">銀行：{bankName}</p>
              <p className="text-muted-foreground">帳號：{bankAccount}</p>
              <p className="text-muted-foreground">戶名：{bankHolder}</p>
              {(!bankNameSetting?.settingValue || !bankAccountSetting?.settingValue) && (
                <p className="text-amber-400/80 text-xs mt-2">管理員尚未設定轉帳資訊，請直接聯繫專家確認付款方式</p>
              )}
            </div>

            {/* 付款方式選擇 */}
            <div>
              <label className="text-sm font-medium mb-2 block">付款方式</label>
              <div className="flex gap-2">
                {[
                  { key: "bank_transfer", label: "ATM 轉帳" },
                  { key: "credit_card", label: "信用卡" },
                  { key: "other", label: "其他" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key as typeof paymentMethod)}
                    className={`flex-1 py-2 rounded-lg text-xs border transition-colors ${
                      paymentMethod === m.key
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "border-border text-muted-foreground hover:border-amber-500/30"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 上傳付款憑證 */}
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> 上傳付款憑證（截圖/照片）
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentProofFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </div>
              {paymentProofFile && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-green-400">
                  <Image className="w-3 h-3" /> {paymentProofFile.name}
                </div>
              )}
              <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  上傳的付款憑證僅保留 <strong>15 天</strong>，請自行妥善保管電子檔備份。
                  系統僅作為確認依據，不作為永久存檔。
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentBookingId(null)}>關閉</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={handleUploadProof}
              disabled={!paymentProofFile || uploadingProof || uploadProofMutation.isPending}
            >
              {uploadingProof ? "上傳中…" : "確認上傳"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 評價 Dialog */}
      <Dialog open={reviewBookingId !== null} onOpenChange={(open) => !open && setReviewBookingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>為這次服務留下評價</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">評分</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= reviewRating ? "text-amber-400" : "text-muted-foreground/30"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">評論（選填）</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="分享您的諮詢體驗，幫助其他用戶做決定…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewBookingId(null)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => {
                if (!reviewBookingId) return;
                submitReviewMutation.mutate({
                  bookingId: reviewBookingId,
                  rating: reviewRating,
                  comment: reviewComment.trim() || undefined,
                });
              }}
              disabled={submitReviewMutation.isPending}
            >
              送出評價
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
