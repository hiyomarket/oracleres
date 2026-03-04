import { useState, useMemo } from "react";
import { ExpertLayout } from "@/components/ExpertLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Plus, Trash2 } from "lucide-react";

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

export default function ExpertCalendar() {
  const utils = trpc.useUtils();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  const { data, isLoading } = trpc.expert.getCalendarData.useQuery({ year, month });

  const setAvailMutation = trpc.expert.setAvailability.useMutation({
    onSuccess: () => {
      toast("✅ 可預約時段已新增");
      utils.expert.getCalendarData.invalidate();
      setNewDate("");
    },
    onError: (e) => toast.error("新增失敗: " + e.message),
  });

  const deleteAvailMutation = trpc.expert.deleteAvailability.useMutation({
    onSuccess: () => {
      toast("已刪除時段");
      utils.expert.getCalendarData.invalidate();
    },
  });

  const availSlots = data?.availSlots ?? [];
  const bookings = data?.bookings ?? [];

  const handleAddSlot = () => {
    if (!newDate) { toast.error("請選擇日期"); return; }
    const startTime = new Date(`${newDate}T${newStart}:00`);
    const endTime = new Date(`${newDate}T${newEnd}:00`);
    if (endTime <= startTime) { toast.error("結束時間必須晚於開始時間"); return; }
    setAvailMutation.mutate({ slots: [{ startTime, endTime }] });
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map: Record<string, typeof availSlots> = {};
    for (const s of availSlots) {
      const d = new Date(s.startTime).toLocaleDateString("zh-TW");
      if (!map[d]) map[d] = [];
      map[d].push(s);
    }
    return map;
  }, [availSlots]);

  const monthNavBtn = (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>‹</Button>
      <span className="text-xs font-medium w-14 text-center">{year}/{String(month).padStart(2, "0")}</span>
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>›</Button>
    </div>
  );

  return (
    <ExpertLayout headerAction={monthNavBtn} pageTitle="行事曆">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6">
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">行事曆管理</h1>
            <p className="text-muted-foreground text-sm mt-1">設定可接受預約的時段</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>‹</Button>
            <span className="text-sm font-medium w-20 text-center">{year}/{String(month).padStart(2, "0")}</span>
            <Button variant="outline" size="sm" onClick={nextMonth}>›</Button>
          </div>
        </div>

        {/* 新增時段 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" /> 新增可預約時段
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">日期</label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">開始</label>
                <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-32" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">結束</label>
                <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="w-32" />
              </div>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-black"
                onClick={handleAddSlot}
                disabled={setAvailMutation.isPending}
              >
                新增
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 本月可預約時段 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> 本月可預約時段
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">載入中…</p>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <p className="text-center text-muted-foreground py-4">本月尚未設定可預約時段</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(slotsByDate).map(([date, slots]) => (
                  <div key={date} className="flex items-start gap-3">
                    <span className="text-sm font-medium w-24 flex-shrink-0 mt-1">{date}</span>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                            slot.isBooked ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          }`}
                        >
                          <span>
                            {new Date(slot.startTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(slot.endTime).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                            {slot.isBooked ? " (已預約)" : ""}
                          </span>
                          {!slot.isBooked && (
                            <button
                              onClick={() => deleteAvailMutation.mutate({ id: slot.id })}
                              className="text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 本月預約訂單 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" /> 本月預約訂單
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">本月沒有預約訂單</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{b.userName || "用戶"}</p>
                      <p className="text-xs text-muted-foreground">{b.serviceTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(b.bookingTime).toLocaleString("zh-TW")}
                      </p>
                    </div>
                    <Badge className={`text-xs border ${STATUS_COLOR[b.status] ?? ""}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ExpertLayout>
  );
}
