import { useState, useMemo } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar, Plus, Trash2, Clock, ChevronLeft, ChevronRight,
  Users, MapPin, Megaphone, Video, CalendarPlus, Info, Download,
} from "lucide-react";
import { BOOKING_STATUS_COLOR as STATUS_COLOR, BOOKING_STATUS_LABEL as STATUS_LABEL } from "@/lib/expertConstants";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CalendarSkeleton } from "@/components/ExpertSkeleton";

const EVENT_TYPE_CONFIG = {
  offline: { label: "線下活動", icon: MapPin, color: "text-green-400 bg-green-500/10 border-green-500/20" },
  online: { label: "線上活動", icon: Video, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  announcement: { label: "公告", icon: Megaphone, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

// 生成時間選項（每 30 分鐘）
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export default function ExpertCalendar() {
  const utils = trpc.useUtils();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 新增時段表單
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("17:00");
  const [batchMode, setBatchMode] = useState(false);
  const [batchDates, setBatchDates] = useState<string[]>([]);
  const [batchStart, setBatchStart] = useState("09:00");
  const [batchEnd, setBatchEnd] = useState("17:00");

  // 每週重複時段
  const [recurringDay, setRecurringDay] = useState("1");
  const [recurringStart, setRecurringStart] = useState("09:00");
  const [recurringEnd, setRecurringEnd] = useState("17:00");
  const [recurringWeeks, setRecurringWeeks] = useState("4");

  // 行事歷活動表單
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "10:00",
    endDate: "",
    endTime: "12:00",
    eventType: "offline" as "offline" | "online" | "announcement",
    location: "",
    maxAttendees: "",
    price: "0",
    isPublic: true,
  });

  const { data, isLoading } = trpc.expert.getCalendarData.useQuery({ year, month });
  const { data: calEvents = [] } = trpc.expert.listMyCalendarEvents.useQuery({ year, month });

  const setAvailMutation = trpc.expert.setAvailability.useMutation({
    onSuccess: () => {
      toast.success("✅ 可預約時段已新增");
      utils.expert.getCalendarData.invalidate();
      setBatchDates([]);
    },
    onError: (e) => toast.error("新增失敗: " + e.message),
  });

  const recurringMutation = trpc.expert.setWeeklyRecurringSlots.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ 已建立 ${data.count} 個每週重複時段`);
      utils.expert.getCalendarData.invalidate();
    },
    onError: (e) => toast.error("建立失敗: " + e.message),
  });

  const deleteAvailMutation = trpc.expert.deleteAvailability.useMutation({
    onSuccess: () => {
      toast("已刪除時段");
      utils.expert.getCalendarData.invalidate();
    },
  });

  const createEventMutation = trpc.expert.createCalendarEvent.useMutation({
    onSuccess: () => {
      toast.success("✅ 活動已新增");
      utils.expert.listMyCalendarEvents.invalidate();
      setEventDialogOpen(false);
      setEventForm({ title: "", description: "", eventDate: "", eventTime: "10:00", endDate: "", endTime: "12:00", eventType: "offline", location: "", maxAttendees: "", price: "0", isPublic: true });
    },
    onError: (e) => toast.error("新增失敗: " + e.message),
  });

  const deleteEventMutation = trpc.expert.deleteCalendarEvent.useMutation({
    onSuccess: () => {
      toast("已刪除活動");
      utils.expert.listMyCalendarEvents.invalidate();
    },
  });

  const availSlots = data?.availSlots ?? [];
  const bookings = data?.bookings ?? [];

  // 月曆格子
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  // 每日的時段數量
  const slotCountByDay = useMemo(() => {
    const map: Record<number, { total: number; booked: number }> = {};
    for (const s of availSlots) {
      const d = new Date(s.startTime).getDate();
      if (!map[d]) map[d] = { total: 0, booked: 0 };
      map[d].total++;
      if (s.isBooked) map[d].booked++;
    }
    return map;
  }, [availSlots]);

  // 每日的活動
  const eventsByDay = useMemo(() => {
    const map: Record<number, typeof calEvents> = {};
    for (const e of calEvents) {
      const d = new Date(e.eventDate).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    return map;
  }, [calEvents]);

  // 每日的訂單
  const bookingsByDay = useMemo(() => {
    const map: Record<number, typeof bookings> = {};
    for (const b of bookings) {
      const d = new Date(b.bookingTime).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(b);
    }
    return map;
  }, [bookings]);

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const handleAddSlot = () => {
    if (!selectedDate) { toast.error("請先在月曆點選日期"); return; }
    const startTime = new Date(`${selectedDate}T${slotStart}:00`);
    const endTime = new Date(`${selectedDate}T${slotEnd}:00`);
    if (endTime <= startTime) { toast.error("結束時間必須晚於開始時間"); return; }
    setAvailMutation.mutate({ slots: [{ startTime, endTime }] });
  };

  const handleBatchAddSlots = () => {
    if (batchDates.length === 0) { toast.error("請選擇至少一個日期"); return; }
    const slots = batchDates.map((d) => ({
      startTime: new Date(`${d}T${batchStart}:00`),
      endTime: new Date(`${d}T${batchEnd}:00`),
    }));
    setAvailMutation.mutate({ slots });
  };

  const toggleBatchDate = (dateStr: string) => {
    setBatchDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleCreateEvent = () => {
    if (!eventForm.title.trim()) { toast.error("請填寫活動名稱"); return; }
    if (!eventForm.eventDate) { toast.error("請選擇活動日期"); return; }
    const eventDate = new Date(`${eventForm.eventDate}T${eventForm.eventTime}:00`);
    const endDate = eventForm.endDate
      ? new Date(`${eventForm.endDate}T${eventForm.endTime}:00`)
      : undefined;
    createEventMutation.mutate({
      title: eventForm.title,
      description: eventForm.description || undefined,
      eventDate,
      endDate,
      eventType: eventForm.eventType,
      location: eventForm.location || undefined,
      maxAttendees: eventForm.maxAttendees ? Number(eventForm.maxAttendees) : undefined,
      price: Number(eventForm.price) || 0,
      isPublic: eventForm.isPublic,
    });
  };

  // 選取日期的時段
  const selectedSlots = useMemo(() => {
    if (!selectedDate) return [];
    return availSlots.filter((s) => {
      const d = new Date(s.startTime);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return dateStr === selectedDate;
    });
  }, [selectedDate, availSlots]);

  const selectedBookings = useMemo(() => {
    if (!selectedDate) return [];
    return bookings.filter((b) => {
      const d = new Date(b.bookingTime);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return dateStr === selectedDate;
    });
  }, [selectedDate, bookings]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return calEvents.filter((e) => {
      const d = new Date(e.eventDate);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return dateStr === selectedDate;
    });
  }, [selectedDate, calEvents]);

  const monthNavBtn = (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-xs font-medium w-16 text-center">
        {year}/{String(month).padStart(2, "0")}
      </span>
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <ExpertLayout headerAction={monthNavBtn} pageTitle="行事曆">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">行事曆管理</h1>
            <p className="text-muted-foreground text-sm mt-1">管理可預約時段與活動公告</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={() => {
                const icalQuery = utils.client.expert.exportICalData.query({ year, month });
                icalQuery.then((res) => {
                  if (!res.ical) { toast.error("無資料可匯出"); return; }
                  const blob = new Blob([res.ical], { type: "text/calendar;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `calendar-${year}-${String(month).padStart(2, "0")}.ics`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("✅ 已匯出 iCal 檔案");
                }).catch(() => toast.error("匯出失敗"));
              }}
            >
              <Download className="w-3.5 h-3.5" /> 匯出 iCal
            </Button>
            <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold w-24 text-center">{year} 年 {month} 月</span>
            <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* 說明提示 */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-blue-400 text-xs">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>預約邏輯：</strong>您設定的時段可被多位用戶查看，但只有在用戶<strong>完成付款</strong>後，系統才會正式佔用該時段。同一時段若有多人同時預約，以最先完成付款者優先。
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 左側：月曆 */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                {/* 星期標題 */}
                <div className="grid grid-cols-7 mb-2">
                  {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                    <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
                      {d}
                    </div>
                  ))}
                </div>
                {/* 日期格子 */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isToday =
                      day === now.getDate() &&
                      month === now.getMonth() + 1 &&
                      year === now.getFullYear();
                    const isSelected = selectedDate === dateStr;
                    const isBatchSelected = batchDates.includes(dateStr);
                    const slotInfo = slotCountByDay[day];
                    const hasEvents = eventsByDay[day]?.length > 0;
                    const hasBookings = bookingsByDay[day]?.length > 0;
                    const isPast = new Date(dateStr) < new Date(now.toDateString());

                    // Determine cell background color based on content
                    const hasAvailableSlots = slotInfo && slotInfo.total > 0 && slotInfo.booked < slotInfo.total;
                    const allBooked = slotInfo && slotInfo.total > 0 && slotInfo.booked >= slotInfo.total;

                    let cellBg = "border-transparent hover:bg-accent/50";
                    if (isSelected) cellBg = "bg-amber-500/20 border-amber-500/50";
                    else if (isBatchSelected) cellBg = "bg-violet-500/20 border-violet-500/50";
                    else if (isToday) cellBg = "bg-accent border-amber-500/30";
                    else if (isPast) cellBg = "border-transparent opacity-50";
                    else if (allBooked) cellBg = "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15";
                    else if (hasAvailableSlots) cellBg = "bg-green-500/10 border-green-500/20 hover:bg-green-500/15";
                    else if (hasEvents) cellBg = "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15";

                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (batchMode) {
                            toggleBatchDate(dateStr);
                          } else {
                            setSelectedDate(isSelected ? null : dateStr);
                          }
                        }}
                        className={`relative aspect-square rounded-lg text-xs flex flex-col items-center justify-start pt-1 transition-all border ${cellBg}`}
                      >
                        <span className={`font-semibold text-[11px] ${
                          isSelected ? "text-amber-400"
                          : isBatchSelected ? "text-violet-400"
                          : isToday ? "text-amber-400"
                          : allBooked ? "text-orange-400"
                          : hasAvailableSlots ? "text-green-400"
                          : isPast ? "text-muted-foreground/40"
                          : "text-foreground"
                        }`}>{day}</span>
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {hasAvailableSlots && !allBooked && (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" title="可預約" />
                          )}
                          {allBooked && (
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" title="已滿" />
                          )}
                          {slotInfo && slotInfo.booked > 0 && !allBooked && (
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" title="部分預約" />
                          )}
                          {hasEvents && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="活動" />}
                          {hasBookings && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="訂單" />}
                        </div>
                        {/* Slot count badge */}
                        {slotInfo && slotInfo.total > 0 && (
                          <span className={`absolute bottom-0.5 right-0.5 text-[8px] font-bold ${
                            allBooked ? "text-orange-400/70" : "text-green-400/70"
                          }`}>
                            {slotInfo.booked}/{slotInfo.total}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* 圖例 */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-500/20 border border-green-500/30 inline-block" /> 可預約</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-500/20 border border-orange-500/30 inline-block" /> 已預約/滿</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500/30 inline-block" /> 活動公告</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> 訂單</span>
                  <span className="flex items-center gap-1.5"><span className="text-[9px] text-green-400/70 font-bold">已/總</span> 預約比例</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：操作面板 */}
          <div className="space-y-4">
            <Tabs defaultValue="slots">
              <TabsList className="w-full">
                <TabsTrigger value="slots" className="flex-1 text-xs">預約時段</TabsTrigger>
                <TabsTrigger value="events" className="flex-1 text-xs">活動公告</TabsTrigger>
              </TabsList>

              {/* 預約時段 Tab */}
              <TabsContent value="slots" className="space-y-3 mt-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBatchMode(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${!batchMode ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "border-border text-muted-foreground"}`}
                  >
                    單日
                  </button>
                  <button
                    onClick={() => setBatchMode(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${batchMode ? "bg-blue-500/20 text-blue-400 border-blue-500/40" : "border-border text-muted-foreground"}`}
                  >
                    批次
                  </button>
                </div>

                {!batchMode ? (
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        {selectedDate ? `選取日期：${selectedDate}` : "請在月曆點選日期"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">開始時間</label>
                          <Select value={slotStart} onValueChange={setSlotStart}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">結束時間</label>
                          <Select value={slotEnd} onValueChange={setSlotEnd}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs"
                        onClick={handleAddSlot}
                        disabled={!selectedDate || setAvailMutation.isPending}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> 新增時段
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        已選 {batchDates.length} 天（在月曆點選多個日期）
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">開始時間</label>
                          <Select value={batchStart} onValueChange={setBatchStart}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">結束時間</label>
                          <Select value={batchEnd} onValueChange={setBatchEnd}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs"
                        onClick={handleBatchAddSlots}
                        disabled={batchDates.length === 0 || setAvailMutation.isPending}
                      >
                        <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                        批次新增 {batchDates.length} 天
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* 每週重複時段 */}
                <Card className="border-violet-500/20">
                  <CardContent className="p-3 space-y-3">
                    <p className="text-xs font-medium text-violet-400 flex items-center gap-1">
                      <CalendarPlus className="w-3.5 h-3.5" /> 每週重複時段
                    </p>
                    <p className="text-xs text-muted-foreground">自動建立未來數週的固定可預約時段</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">星期幾</label>
                        <Select value={recurringDay} onValueChange={setRecurringDay}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["日", "一", "二", "三", "四", "五", "六"].map((d, i) => (
                              <SelectItem key={i} value={String(i)} className="text-xs">星期{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">重複週數</label>
                        <Select value={recurringWeeks} onValueChange={setRecurringWeeks}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6,7,8].map((w) => (
                              <SelectItem key={w} value={String(w)} className="text-xs">{w} 週</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">開始時間</label>
                        <Select value={recurringStart} onValueChange={setRecurringStart}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">結束時間</label>
                        <Select value={recurringEnd} onValueChange={setRecurringEnd}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-violet-500 hover:bg-violet-600 text-white text-xs"
                      onClick={() => {
                        const [sh, sm] = recurringStart.split(":").map(Number);
                        const [eh, em] = recurringEnd.split(":").map(Number);
                        recurringMutation.mutate({
                          dayOfWeek: Number(recurringDay),
                          startHour: sh,
                          startMinute: sm,
                          endHour: eh,
                          endMinute: em,
                          weeks: Number(recurringWeeks),
                        });
                      }}
                      disabled={recurringMutation.isPending}
                    >
                      <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                      {recurringMutation.isPending ? "建立中..." : `建立 ${recurringWeeks} 週重複時段`}
                    </Button>
                  </CardContent>
                </Card>

                {/* 選取日期的時段詳情 */}
                {selectedDate && (
                  <div className="space-y-2">
                    {selectedSlots.length > 0 ? (
                      selectedSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                            slot.isBooked
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-green-500/10 border-green-500/20 text-green-400"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {new Date(slot.startTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(slot.endTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="flex items-center gap-2">
                            {slot.isBooked ? (
                              <span className="text-red-400">已預約</span>
                            ) : (
                              <button
                                onClick={() => deleteAvailMutation.mutate({ id: slot.id })}
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">此日尚無時段</p>
                    )}
                    {selectedBookings.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">當日訂單</p>
                        {selectedBookings.map((b) => (
                          <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                            <span className="text-blue-300">{b.userName || "用戶"} · {b.serviceTitle}</span>
                            <Badge className={`text-xs border ${STATUS_COLOR[b.status] ?? ""}`}>
                              {STATUS_LABEL[b.status] ?? b.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedEvents.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">當日活動</p>
                        {selectedEvents.map((e) => {
                          const cfg = EVENT_TYPE_CONFIG[e.eventType as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.announcement;
                          return (
                            <div key={e.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${cfg.color}`}>
                              <span>{e.title}</span>
                              <button
                                onClick={() => deleteEventMutation.mutate({ id: e.id })}
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* 活動公告 Tab */}
              <TabsContent value="events" className="space-y-3 mt-3">
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs"
                  onClick={() => setEventDialogOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> 新增活動/公告
                </Button>
                {calEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">本月尚無活動公告</p>
                ) : (
                  <div className="space-y-2">
                    {calEvents.map((e) => {
                      const cfg = EVENT_TYPE_CONFIG[e.eventType as keyof typeof EVENT_TYPE_CONFIG] || EVENT_TYPE_CONFIG.announcement;
                      const Icon = cfg.icon;
                      return (
                        <div key={e.id} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{e.title}</p>
                            <p className="text-muted-foreground mt-0.5">
                              {new Date(e.eventDate).toLocaleDateString("zh-TW")}
                              {e.location && ` · ${e.location}`}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteEventMutation.mutate({ id: e.id })}
                            className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 本月訂單總覽 */}
        {bookings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> 本月預約訂單（{bookings.length}）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{b.userName || "用戶"}</p>
                      <p className="text-xs text-muted-foreground">{b.serviceTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(b.bookingTime).toLocaleString("zh-TW", {
                          month: "numeric", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLOR[b.status] ?? ""}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 新增活動 Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" /> 新增活動/公告
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">活動名稱 *</label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例如：2026 年春季命理講座"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">活動說明</label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="活動內容、報名方式、注意事項…"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">開始日期 *</label>
                <Input
                  type="date"
                  value={eventForm.eventDate}
                  onChange={(e) => setEventForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">開始時間</label>
                <Select value={eventForm.eventTime} onValueChange={(v) => setEventForm((f) => ({ ...f, eventTime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">結束日期（選填）</label>
                <Input
                  type="date"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">結束時間</label>
                <Select value={eventForm.endTime} onValueChange={(v) => setEventForm((f) => ({ ...f, endTime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">活動類型</label>
              <div className="flex gap-2">
                {(Object.entries(EVENT_TYPE_CONFIG) as [string, typeof EVENT_TYPE_CONFIG[keyof typeof EVENT_TYPE_CONFIG]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setEventForm((f) => ({ ...f, eventType: key as "offline" | "online" | "announcement" }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-colors ${
                        eventForm.eventType === key
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "border-border text-muted-foreground hover:border-amber-500/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {eventForm.eventType !== "announcement" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">地點/連結</label>
                <Input
                  value={eventForm.location}
                  onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder={eventForm.eventType === "offline" ? "例如：台北市信義區..." : "例如：Zoom 連結..."}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">人數上限（選填）</label>
                <Input
                  type="number"
                  value={eventForm.maxAttendees}
                  onChange={(e) => setEventForm((f) => ({ ...f, maxAttendees: e.target.value }))}
                  placeholder="不限"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">費用（元）</label>
                <Input
                  type="number"
                  value={eventForm.price}
                  onChange={(e) => setEventForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0 = 免費"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={handleCreateEvent}
              disabled={createEventMutation.isPending}
            >
              新增活動
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ExpertLayout>
  );
}
