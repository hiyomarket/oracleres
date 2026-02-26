/**
 * 飲食羅盤頁面（鳳凰計畫 Phase 6 全面升級版）
 * 補運指數儀表盤 + planB 切換 + 天氣五行 + 附近餐廳進階篩選
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { NearbyRestaurants } from "@/components/NearbyRestaurants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Thermometer, Wind, Droplets, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

// ─── 工具函數 ─────────────────────────────────────────────────
function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split("T")[0];
}

const ELEMENT_EMOJI: Record<string, string> = { 火: "🔥", 木: "🌳", 水: "🌊", 土: "🌍", 金: "⚪" };
const ELEMENT_BG: Record<string, string> = {
  火: "bg-red-500/15 border-red-500/30 text-red-300",
  木: "bg-green-500/15 border-green-500/30 text-green-300",
  水: "bg-blue-500/15 border-blue-500/30 text-blue-300",
  土: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
  金: "bg-slate-400/15 border-slate-400/30 text-slate-300",
};
const LABEL_COLOR: Record<string, string> = {
  "首選方案": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "次選方案": "bg-sky-500/20 text-sky-300 border-sky-500/40",
  "中性": "bg-slate-500/20 text-slate-300 border-slate-500/40",
  "應避免": "bg-orange-500/20 text-orange-300 border-orange-500/40",
  "強烈避免": "bg-red-500/20 text-red-300 border-red-500/40",
};

// ─── 補運指數量表元件 ─────────────────────────────────────────
function ResonanceGauge({ score, element }: { score: number; element: string }) {
  const pct = Math.max(0, Math.min(100, (score + 100) / 2));
  const color = score >= 60 ? "#10b981" : score >= 0 ? "#f59e0b" : "#ef4444";
  const label = score >= 100 ? "完美" : score >= 60 ? "強振" : score >= 0 ? "中性" : score >= -50 ? "洩漏" : "相剋";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${pct * 1.634} 163.4`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg">{ELEMENT_EMOJI[element]}</span>
        </div>
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score > 0 ? `+${score}` : score}</span>
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  );
}

// ─── 天氣資訊條 ──────────────────────────────────────────────
function WeatherBar({ weather }: {
  weather: { description: string; temperature: number; humidity: number; windSpeed: number; wuxing: Record<string, number> }
}) {
  const dominant = Object.entries(weather.wuxing).sort(([, a], [, b]) => b - a)[0][0];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm flex-wrap">
      <span className="text-base">{ELEMENT_EMOJI[dominant]}</span>
      <span className="text-white/70 font-medium">{weather.description}</span>
      <div className="flex items-center gap-1 text-white/50">
        <Thermometer className="w-3.5 h-3.5" />
        <span>{weather.temperature.toFixed(1)}°C</span>
      </div>
      <div className="flex items-center gap-1 text-white/50">
        <Droplets className="w-3.5 h-3.5" />
        <span>{weather.humidity}%</span>
      </div>
      <div className="flex items-center gap-1 text-white/50">
        <Wind className="w-3.5 h-3.5" />
        <span>{weather.windSpeed.toFixed(0)} km/h</span>
      </div>
      <Badge className={`ml-auto text-xs border ${ELEMENT_BG[dominant]}`}>天氣五行：{dominant}</Badge>
    </div>
  );
}

// ─── 主頁面 ──────────────────────────────────────────────────
export default function DietPage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [activePlanTab, setActivePlanTab] = useState<"planA" | "planB">("planA");

  const selectedDate = getTaiwanDateStr(selectedOffset);

  const { data, isLoading, refetch } = trpc.warRoom.dailyReport.useQuery(
    { date: selectedDate, lat: userCoords?.lat, lon: userCoords?.lon },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);
  useEffect(() => { if (userCoords) refetch(); }, [userCoords, refetch]);

  const dietary = data?.dietary;
  const weather = data?.weather;
  const planB = dietary?.planB ?? [];
  const targetElement = dietary?.targetElement ?? "火";
  const favorableElements = data?.favorableElements ?? [];
  const unfavorableElements = data?.unfavorableElements ?? [];
  const isAccessible = isAdmin || hasFeature("warroom_dietary");

  const dateLabels: Record<string, string> = { "-1": "昨日", "0": "今日", "1": "明日" };
  const dateLabel = dateLabels[String(selectedOffset)] ?? `${selectedOffset > 0 ? "+" : ""}${selectedOffset}日`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SharedNav currentPage="diet" />
      <main className="max-w-2xl mx-auto px-4 pt-20 pb-32 space-y-5">

        {/* 頁頭 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2">
          <h1 className="text-2xl font-bold tracking-tight">飲食羅盤</h1>
          <p className="text-sm text-white/40 mt-1">以五行能量為你選擇今日最佳補運餐食</p>
        </motion.div>

        {/* 日期選擇器 */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedOffset(o => o - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-white/80 w-36 text-center">{dateLabel} · {selectedDate}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedOffset(o => o + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* 天氣資訊條 */}
        {weather && <WeatherBar weather={weather} />}
        {!weather && (
          <button onClick={requestLocation} disabled={locationLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 text-sm hover:border-white/30 hover:text-white/60 transition-colors">
            {locationLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {locationLoading ? "正在取得位置..." : "開啟位置以啟用天氣五行加成（本命30%+環境50%+天氣20%）"}
          </button>
        )}

        {!isAccessible ? (
          <FeatureLockedCard feature="warroom_dietary" description="升級方案以解鎖每日補運飲食建議與附近餐廳五行評分" />
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-white/40">無法載入資料，請稍後再試</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={selectedDate} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

              {/* 補運指數儀表盤 */}
              {planB.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">今日補運指數</h3>
                      <p className="text-sm text-white/70 mt-0.5">
                        目標補充：<span className={`font-bold ${ELEMENT_BG[targetElement].split(' ')[2]}`}>{ELEMENT_EMOJI[targetElement]} {targetElement}</span>
                      </p>
                    </div>
                    {weather && (
                      <div className="text-right">
                        <p className="text-[10px] text-white/30">三維加權已啟用</p>
                        <p className="text-[10px] text-white/30">本命30% · 環境50% · 天氣20%</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {planB.map((item) => (
                      <ResonanceGauge key={item.element} score={item.resonanceScore} element={item.element} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Plan A / Plan B 切換 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <Tabs value={activePlanTab} onValueChange={(v) => setActivePlanTab(v as "planA" | "planB")}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">飲食方案</h3>
                    <TabsList className="h-8 bg-white/10">
                      <TabsTrigger value="planA" className="text-xs px-3 h-6 data-[state=active]:bg-white/20">
                        🎯 首選方案
                      </TabsTrigger>
                      <TabsTrigger value="planB" className="text-xs px-3 h-6 data-[state=active]:bg-white/20">
                        🗺️ 全覽比較
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {activePlanTab === "planA" && (
                    <div className="space-y-4">
                      {dietary?.supplements && dietary.supplements.length > 0 && (
                        <div>
                          <p className="text-xs text-white/40 mb-2">✅ 今日推薦補充</p>
                          <div className="space-y-2">
                            {dietary.supplements.map((s) => (
                              <div key={s.element} className={`rounded-xl border p-3 ${ELEMENT_BG[s.element]}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-base">{ELEMENT_EMOJI[s.element]}</span>
                                  <span className="font-semibold text-sm">{s.element}系食材</span>
                                  <Badge className="ml-auto text-[10px] bg-white/10 border-white/20 text-white/60">優先級 {s.priority}</Badge>
                                </div>
                                <p className="text-xs text-white/60 mb-2">{s.advice}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {s.foods.map((f) => (
                                    <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{f}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {dietary?.avoid && dietary.avoid.length > 0 && (
                        <div>
                          <p className="text-xs text-white/40 mb-2">⚠️ 今日建議避開</p>
                          <div className="space-y-2">
                            {dietary.avoid.map((a) => (
                              <div key={a.element} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base">{ELEMENT_EMOJI[a.element]}</span>
                                  <span className="font-semibold text-sm text-red-300">{a.element}系食材</span>
                                </div>
                                <p className="text-xs text-white/50 mb-2">{a.reason}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {a.foods.map((f) => (
                                    <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300/70">{f}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activePlanTab === "planB" && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 mb-3">五行食材對今日補運目標（{ELEMENT_EMOJI[targetElement]}{targetElement}）的共振效果排行</p>
                      {planB.map((item) => (
                        <motion.div key={item.element} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                            {ELEMENT_EMOJI[item.element]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{item.element}系食材</span>
                              <Badge className={`text-[10px] border ${LABEL_COLOR[item.label] ?? "bg-slate-500/20 text-slate-300 border-slate-500/40"}`}>{item.label}</Badge>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${Math.max(0, (item.resonanceScore + 100) / 2)}%`,
                                  background: item.resonanceScore >= 60 ? "#10b981" : item.resonanceScore >= 0 ? "#f59e0b" : "#ef4444",
                                }} />
                            </div>
                            <p className="text-[10px] text-white/40 mt-1 truncate">{item.advice}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-bold" style={{
                              color: item.resonanceScore >= 60 ? "#10b981" : item.resonanceScore >= 0 ? "#f59e0b" : "#ef4444"
                            }}>
                              {item.resonanceScore > 0 ? `+${item.resonanceScore}` : item.resonanceScore}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Tabs>
              </motion.div>

              {/* 附近餐廳 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <NearbyRestaurants
                  supplements={dietary?.supplements ?? []}
                  todayDirections={data?.todayDirections ?? []}
                  favorableElements={favorableElements}
                  unfavorableElements={unfavorableElements}
                />
              </motion.div>

            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
