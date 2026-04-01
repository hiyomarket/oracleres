import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import DOMPurify from "dompurify";
import { SharedNav } from "@/components/SharedNav";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Star, ArrowLeft, Calendar, Clock, MessageSquare, Video, Handshake,
  MapPin, Megaphone, ChevronLeft, ChevronRight, Info, CheckCircle2, Heart, Share2,
} from "lucide-react";

const EVENT_TYPE_CONFIG = {
  offline: { label: "線下活動", icon: MapPin, color: "text-green-400 bg-green-500/10 border-green-500/20" },
  online: { label: "線上活動", icon: Video, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  announcement: { label: "公告", icon: Megaphone, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

function ReviewsSection({ expertId }: { expertId: number }) {
  const [page, setPage] = useState(0);
  const LIMIT = 10;
  const { data: reviewsList, isLoading } = trpc.expert.getExpertReviews.useQuery(
    { expertId, limit: LIMIT, offset: page * LIMIT },
    { enabled: expertId > 0 }
  );
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">載入評價中...</div>;
  if (!reviewsList || reviewsList.length === 0) {
    return (
      <Card><CardContent className="py-8">
        <p className="text-sm text-muted-foreground text-center">目前尚無評價，成為第一個留下評價的人吧！</p>
      </CardContent></Card>
    );
  }
  const starCounts = [0,0,0,0,0];
  reviewsList.forEach(r => { if (r.rating >= 1 && r.rating <= 5) starCounts[r.rating - 1]++; });
  const total = reviewsList.length;
  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        <div className="space-y-1">
          {[5,4,3,2,1].map(star => (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-8 text-right">{star}星</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: total ? ((starCounts[star-1]/total)*100).toString() + "%" : "0%" }} />
              </div>
              <span className="w-8 text-muted-foreground">{starCounts[star-1]}</span>
            </div>
          ))}
        </div>
      </CardContent></Card>
      {reviewsList.map(review => (
        <Card key={review.id}><CardContent className="pt-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="font-medium text-sm">{review.userName ?? "匿名用戶"}</span>
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={"w-3 h-3 " + (i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {review.createdAt ? new Date(review.createdAt).toLocaleDateString("zh-TW") : ""}
            </span>
          </div>
          {review.comment && <p className="text-sm mt-2">{review.comment}</p>}
          {review.expertReply && (
            <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r p-2">
              <p className="text-xs font-medium text-primary mb-1">專家回覆</p>
              <p className="text-sm">{review.expertReply}</p>
              {review.expertReplyAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(review.expertReplyAt).toLocaleDateString("zh-TW")}
                </p>
              )}
            </div>
          )}
        </CardContent></Card>
      ))}
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="w-4 h-4" /> 上一頁
        </Button>
        <Button variant="outline" size="sm" disabled={reviewsList.length < LIMIT} onClick={() => setPage(p => p + 1)}>
          下一頁 <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ExpertDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  useSEO({
    title: expert?.publicName ? `${expert.publicName} - 天命聯盟` : "天命聯盟",
    description: expert?.bio ? expert.bio.slice(0, 160) : "天命共振線上命理諮詢平台",
    ogImage: expert?.profileImage ?? undefined,
  });

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<number | null>(null);
  // Window booking: user picks start/end within the slot window
  const [requestedStart, setRequestedStart] = useState("");
  const [requestedEnd, setRequestedEnd] = useState("");

  // Favorite
  const { data: favData } = trpc.expert.checkFavorite.useQuery(
    { expertId },
    { enabled: expertId > 0 && !!user }
  );
  const isFavorited = favData?.isFavorited ?? false;
  const toggleFavMutation = trpc.expert.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.expert.checkFavorite.invalidate({ expertId });
      utils.expert.getMyFavorites.invalidate();
      toast.success(isFavorited ? "已取消收藏" : "已加入收藏 ❤️");
    },
    onError: (e) => toast.error("操作失敗: " + e.message),
  });


  // Calendar state for public view
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  // Determine if id is numeric or slug
  const isNumeric = /^\d+$/.test(id ?? "");

  // Fetch by ID or by slug
  const { data: expertDataById, isLoading: loadingById } = trpc.expert.getExpertDetails.useQuery(
    { expertId: parseInt(id ?? "0") },
    { enabled: isNumeric }
  );
  const { data: expertDataBySlug, isLoading: loadingBySlug } = trpc.expert.getExpertBySlug.useQuery(
    { slug: id ?? "" },
    { enabled: !isNumeric }
  );

  const expertData = isNumeric ? expertDataById : expertDataBySlug;
  const isLoading = isNumeric ? loadingById : loadingBySlug;
  const expert = expertData?.expert;
  const availableSlots = expertData?.availSlots ?? [];
  const services = expertData?.services ?? [];

  // Calendar events for this expert
  const expertId = expert?.id ?? 0;
  const { data: calEvents = [] } = trpc.expert.listExpertCalendarEvents.useQuery(
    { expertId, year: calYear, month: calMonth },
    { enabled: expertId > 0 }
  );

  const bookMutation = trpc.expert.createBookingInWindow.useMutation({
    onSuccess: (data) => {
      toast.success("✅ 預約請求已送出！老師確認後將通知您");
      utils.expert.getExpertDetails.invalidate();
      setBookingSuccess(data.bookingId);
      setSelectedSlotId(null);
      setRequestedStart("");
      setRequestedEnd("");
      setNotes("");
    },
    onError: (e) => toast.error("預約失敗: " + e.message),
  });

  const handleBook = () => {
    if (!user) { toast.error("請先登入"); return; }
    if (!selectedServiceId || !selectedSlotId) {
      toast.error("請選擇服務項目和時段");
      return;
    }
    if (!requestedStart || !requestedEnd) {
      toast.error("請填寫希望預約的開始與結束時間");
      return;
    }
    const slot = availableSlots.find((s) => s.id === selectedSlotId);
    if (!slot) return;
    const slotDate = new Date(slot.startTime).toISOString().slice(0, 10);
    const start = new Date(`${slotDate}T${requestedStart}:00`);
    const end = new Date(`${slotDate}T${requestedEnd}:00`);
    if (end <= start) { toast.error("結束時間必須晚於開始時間"); return; }
    if (start < slot.startTime || end > slot.endTime) {
      toast.error("請在老師的可用區間內選擇時間"); return;
    }
    bookMutation.mutate({
      expertId: expertId,
      serviceId: selectedServiceId,
      availabilityId: selectedSlotId,
      requestedStartTime: start,
      requestedEndTime: end,
      notes: notes.trim() || undefined,
    });
  };

  // Group available slots by date
  const slotsByDate = useMemo(() => {
    const map: Record<string, typeof availableSlots> = {};
    for (const s of availableSlots) {
      const d = new Date(s.startTime);
      const dateStr = d.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(s);
    }
    return map;
  }, [availableSlots]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calYear, calMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, typeof calEvents> = {};
    for (const e of calEvents) {
      const d = new Date(e.eventDate).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    return map;
  }, [calEvents]);

  const slotDays = useMemo(() => {
    const days = new Set<number>();
    for (const s of availableSlots) {
      const d = new Date(s.startTime);
      if (d.getFullYear() === calYear && d.getMonth() + 1 === calMonth) {
        days.add(d.getDate());
      }
    }
    return days;
  }, [availableSlots, calYear, calMonth]);

  const [selectedCalDay, setSelectedCalDay] = useState<number | null>(null);

  const selectedDaySlots = useMemo(() => {
    if (!selectedCalDay) return [];
    return availableSlots.filter((s) => {
      const d = new Date(s.startTime);
      return d.getFullYear() === calYear && d.getMonth() + 1 === calMonth && d.getDate() === selectedCalDay;
    });
  }, [selectedCalDay, availableSlots, calYear, calMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedCalDay) return [];
    return calEvents.filter((e) => {
      const d = new Date(e.eventDate);
      return d.getFullYear() === calYear && d.getMonth() + 1 === calMonth && d.getDate() === selectedCalDay;
    });
  }, [selectedCalDay, calEvents, calYear, calMonth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SharedNav currentPage="experts" />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <div className="h-48 rounded-xl bg-accent/30 animate-pulse" />
          <div className="h-32 rounded-xl bg-accent/30 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-background">
        <SharedNav currentPage="experts" />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-muted-foreground">
          <p className="text-lg">找不到此專家</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/experts")}>
            返回專家市集
          </Button>
        </div>
      </div>
    );
  }

  const specialties = (expert.specialties as string[] | null) ?? [];
  const tags = (expert.tags as string[] | null) ?? [];
  const allTags = [...specialties, ...tags].filter((t, i, arr) => arr.indexOf(t) === i);
  const bioHtml = (expert as any).bioHtml as string | null;
  const consultModes = (expert as any).consultationModes as string[] | null;

  return (
    <div className="min-h-screen bg-background">
      <SharedNav currentPage="experts" />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/experts")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 返回專家市集
        </button>

        {/* Expert Header */}
        <div className="relative rounded-2xl">
          {/* Cover image */}
          <div className="h-32 rounded-t-2xl overflow-hidden bg-gradient-to-br from-amber-900/50 via-stone-900/60 to-black/70 relative">
            {(expert as any).coverImageUrl && (
              <img src={(expert as any).coverImageUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="px-6 pb-6 bg-card rounded-b-2xl border border-border border-t-0">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="w-20 h-20 rounded-full border-3 border-background bg-gradient-to-br from-amber-500/30 to-amber-700/30 flex-shrink-0 overflow-hidden ring-2 ring-amber-500/30 relative z-10">
                {expert.profileImageUrl ? (
                  <img src={expert.profileImageUrl} alt={expert.publicName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-amber-400">
                    {expert.publicName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-2xl font-bold">{expert.publicName}</h1>
                {expert.title && <p className="text-muted-foreground text-sm mt-0.5">{expert.title}</p>}
              </div>
              <div className="pb-1 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-amber-400 font-semibold">
                  {expert.ratingAvg ? Number(expert.ratingAvg).toFixed(1) : "新"}
                </span>
                <span className="text-muted-foreground text-sm">({expert.ratingCount ?? 0})</span>
              </div>
              <button
                onClick={() => {
                  if (!user) { toast.error("請先登入"); return; }
                  toggleFavMutation.mutate({ expertId });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  isFavorited
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent border-border"
                }`}
                disabled={toggleFavMutation.isLoading}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-400 text-red-400" : ""}`} />
                {isFavorited ? "已收藏" : "收藏"}
              </button>
            </div>

            {/* Tags & modes */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {allTags.map((tag) => (
                <Badge key={tag} className="text-xs bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                  {tag}
                </Badge>
              ))}
              {consultModes?.includes("video") && (
                <Badge className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <Video className="w-3 h-3" /> 視訊諮詢
                </Badge>
              )}
              {consultModes?.includes("in_person") && (
                <Badge className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                  <Handshake className="w-3 h-3" /> 面對面
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="intro">
          <TabsList className="w-full">
            <TabsTrigger value="intro" className="flex-1">個人介紹</TabsTrigger>
            <TabsTrigger value="services" className="flex-1">服務項目</TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1">行事曆</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">評價</TabsTrigger>
          </TabsList>

          {/* 個人介紹 Tab */}
          <TabsContent value="intro" className="mt-4">
            <Card>
              <CardContent className="p-6">
                {bioHtml ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bioHtml) }}
                  />
                ) : expert.bio ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{expert.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">此專家尚未填寫個人介紹</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 服務項目 Tab */}
          <TabsContent value="services" className="mt-4 space-y-3">
            {services.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  目前尚未設定服務項目
                </CardContent>
              </Card>
            ) : (
              services.map((svc) => (
                <Card
                  key={svc.id}
                  className={`cursor-pointer transition-all hover:border-amber-500/50 ${
                    selectedServiceId === svc.id ? "border-amber-500 bg-amber-500/5" : ""
                  }`}
                  onClick={() => {
                    if (!user) { toast.error("請先登入才能預約"); return; }
                    setSelectedServiceId(svc.id === selectedServiceId ? null : svc.id);
                    setSelectedSlotId(null);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{svc.title}</h3>
                          {selectedServiceId === svc.id && (
                            <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        {svc.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{svc.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {svc.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {svc.durationMinutes} 分鐘
                            </span>
                          )}
                          <Badge
                            className={`text-xs border ${
                              svc.type === "online"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                            }`}
                          >
                            {svc.type === "online" ? "線上" : "面對面"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-amber-400">
                          NT$ {svc.price?.toLocaleString() ?? "洽談"}
                        </p>
                        {!user ? (
                          <p className="text-xs text-muted-foreground mt-1">登入後預約</p>
                        ) : (
                          <p className="text-xs text-amber-400/70 mt-1">點擊選取</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* 時段選擇（在服務選取後展開） */}
            {selectedServiceId && !bookingSuccess && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" /> 選擇預約時段
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-blue-400 text-xs">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>選取時段後需完成付款，訂單才會正式確認。同一時段先付款者優先。</span>
                  </div>
                  {Object.keys(slotsByDate).length === 0 ? (
                    <p className="text-sm text-muted-foreground">近期暫無可預約時段，請稍後再查或聯繫專家</p>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">選擇老師的可用區間，再填寫您希望的具體時間段</p>
                      {Object.entries(slotsByDate).map(([date, slots]) => (
                        <div key={date}>
                          <p className="text-xs font-medium text-muted-foreground mb-2">{date}</p>
                          <div className="space-y-2">
                            {slots.map((slot) => {
                              const slotStart = new Date(slot.startTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
                              const slotEnd = new Date(slot.endTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
                              const isSelected = selectedSlotId === slot.id;
                              return (
                                <div key={slot.id} className={`rounded-lg border p-3 transition-all ${isSelected ? "border-amber-500/60 bg-amber-500/8" : "border-border/50 hover:border-amber-500/30"}`}>
                                  <button
                                    className="w-full text-left"
                                    onClick={() => {
                                      setSelectedSlotId(isSelected ? null : slot.id);
                                      if (!isSelected) {
                                        // Pre-fill with slot start/end
                                        setRequestedStart(new Date(slot.startTime).toTimeString().slice(0, 5));
                                        setRequestedEnd(new Date(slot.endTime).toTimeString().slice(0, 5));
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                                      <span className="text-sm font-medium">可用區間：{slotStart} – {slotEnd}</span>
                                      {isSelected && <Badge className="ml-auto text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">已選取</Badge>}
                                    </div>
                                  </button>
                                  {isSelected && (
                                    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                                      <p className="text-xs text-muted-foreground">填寫您希望預約的具體時間（在區間內）</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-xs text-muted-foreground mb-1 block">開始時間</label>
                                          <input
                                            type="time"
                                            value={requestedStart}
                                            onChange={(e) => setRequestedStart(e.target.value)}
                                            min={new Date(slot.startTime).toTimeString().slice(0, 5)}
                                            max={new Date(slot.endTime).toTimeString().slice(0, 5)}
                                            className="w-full h-8 px-2 rounded-md border border-border bg-background text-sm text-foreground"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-muted-foreground mb-1 block">結束時間</label>
                                          <input
                                            type="time"
                                            value={requestedEnd}
                                            onChange={(e) => setRequestedEnd(e.target.value)}
                                            min={new Date(slot.startTime).toTimeString().slice(0, 5)}
                                            max={new Date(slot.endTime).toTimeString().slice(0, 5)}
                                            className="w-full h-8 px-2 rounded-md border border-border bg-background text-sm text-foreground"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
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
                      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                      onClick={handleBook}
                      disabled={!selectedSlotId || !requestedStart || !requestedEnd || bookMutation.isPending}
                    >
                      {bookMutation.isPending ? "預約中…" : "送出預約請求"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setSelectedServiceId(null); setSelectedSlotId(null); setRequestedStart(""); setRequestedEnd(""); }}
                    >
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 預約成功提示 */}
            {bookingSuccess && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-5 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-lg">預約請求已送出！</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      老師收到請求後將透過訊息與您確認時間，確認後再完成付款。
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                      onClick={() => navigate("/my-bookings")}
                    >
                      前往我的預約
                    </Button>
                    <Button variant="outline" onClick={() => setBookingSuccess(null)}>
                      繼續瀏覽
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 行事曆 Tab */}
          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 行事曆
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
                        else setCalMonth((m) => m - 1);
                        setSelectedCalDay(null);
                      }}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs font-medium w-20 text-center">
                      {calYear} 年 {calMonth} 月
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
                        else setCalMonth((m) => m + 1);
                        setSelectedCalDay(null);
                      }}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {/* Calendar grid */}
                <div className="grid grid-cols-7 mb-1">
                  {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                    <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;
                    const hasSlots = slotDays.has(day);
                    const hasEvts = eventsByDay[day]?.length > 0;
                    const isToday = day === now.getDate() && calMonth === now.getMonth() + 1 && calYear === now.getFullYear();
                    const isSelected = selectedCalDay === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedCalDay(isSelected ? null : day)}
                        className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-start pt-1 transition-all border ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                            : isToday
                            ? "bg-accent border-amber-500/30"
                            : (hasSlots || hasEvts)
                            ? "border-transparent hover:bg-accent/50"
                            : "border-transparent text-muted-foreground/50"
                        }`}
                      >
                        <span className={`font-medium ${isToday ? "text-amber-400" : ""}`}>{day}</span>
                        <div className="flex gap-0.5 mt-0.5">
                          {hasSlots && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                          {hasEvts && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> 可預約</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 活動</span>
                </div>

                {/* Selected day details */}
                {selectedCalDay && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium">
                      {calYear} 年 {calMonth} 月 {selectedCalDay} 日
                    </p>
                    {selectedDaySlots.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">可預約時段</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedDaySlots.map((s) => (
                            <div
                              key={s.id}
                              className="px-3 py-1.5 rounded-lg text-xs border border-green-500/30 bg-green-500/10 text-green-400"
                            >
                              {new Date(s.startTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                              {" – "}
                              {new Date(s.endTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedDayEvents.map((e) => {
                      const cfg = EVENT_TYPE_CONFIG[e.eventType as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.announcement;
                      const Icon = cfg.icon;
                      return (
                        <div key={e.id} className={`p-3 rounded-lg border text-sm ${cfg.color}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="font-medium">{e.title}</span>
                          </div>
                          {e.description && <p className="text-xs opacity-80 leading-relaxed">{e.description}</p>}
                          {e.location && (
                            <p className="text-xs mt-1 flex items-center gap-1 opacity-70">
                              <MapPin className="w-3 h-3" /> {e.location}
                            </p>
                          )}
                          {e.price && e.price > 0 && (
                            <p className="text-xs mt-1 opacity-70">費用：NT$ {e.price.toLocaleString()}</p>
                          )}
                        </div>
                      );
                    })}
                    {selectedDaySlots.length === 0 && selectedDayEvents.length === 0 && (
                      <p className="text-xs text-muted-foreground">此日無安排</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 評價 Tab */}
          <TabsContent value="reviews" className="mt-4">
            <ReviewsSection expertId={expert?.id ?? 0} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
