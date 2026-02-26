import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { FavoriteStores } from "@/components/FavoriteStores";
import { Star, Map as MapIcon, List } from "lucide-react";
import { toast } from "sonner";

type WuXing = "wood" | "fire" | "earth" | "metal" | "water";

interface ScoredStore {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  rating?: number;
  isOpen?: boolean;
  resonanceScore: number;
  resonanceStars: number;
  bearingElement: WuXing;
  bearingLabel: string;
  bearingDegree: number;
  addressAnalysis: { element: WuXing; digits: string; explanation: string };
  nameAnalysis: { element: WuXing; matchedKeyword: string; explanation: string };
  dailyBonus: { bonus: number; explanation: string };
  recommendation: string;
  reasons: string[];
  rank: number;
}

interface BestHour {
  chineseName: string;
  displayTime: string;
  energyLabel: string;
  energyScore: number;
  branch: string;
  isCurrentHour: boolean;
}

const ELEMENT_COLORS: Record<WuXing, { text: string; bg: string; border: string; label: string; hex: string }> = {
  fire:  { text: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/40",  label: "火", hex: "#f97316" },
  earth: { text: "text-yellow-500",  bg: "bg-yellow-600/15",  border: "border-yellow-600/40",  label: "土", hex: "#eab308" },
  metal: { text: "text-slate-300",   bg: "bg-slate-400/15",   border: "border-slate-400/40",   label: "金", hex: "#cbd5e1" },
  wood:  { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40", label: "木", hex: "#34d399" },
  water: { text: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/40",    label: "水", hex: "#60a5fa" },
};

// 依共振指數決定標記顏色
function getMarkerColor(score: number): string {
  if (score >= 80) return "#f59e0b"; // 金色 - 大吉
  if (score >= 60) return "#10b981"; // 綠色 - 吉
  if (score >= 40) return "#3b82f6"; // 藍色 - 平
  return "#64748b";                  // 灰色 - 弱
}

function getMarkerLabel(score: number): string {
  if (score >= 80) return "大吉";
  if (score >= 60) return "吉";
  if (score >= 40) return "平";
  return "弱";
}

function ResonanceFlames({ count, total = 5 }: { count: number; total?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`text-base ${i < count ? "opacity-100" : "opacity-20"}`}>
          🔥
        </span>
      ))}
    </div>
  );
}

function StoreCard({
  store,
  isSelected,
  onClick,
  onFavorite,
  isFavorited,
}: {
  store: ScoredStore;
  isSelected: boolean;
  onClick: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const bearingColors = ELEMENT_COLORS[store.bearingElement];
  const addressColors = ELEMENT_COLORS[store.addressAnalysis.element];
  const nameColors = ELEMENT_COLORS[store.nameAnalysis.element];

  const scoreColor =
    store.resonanceScore >= 80 ? "text-amber-400" :
    store.resonanceScore >= 60 ? "text-emerald-400" :
    store.resonanceScore >= 40 ? "text-blue-400" : "text-slate-400";

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}&destination_place_id=${store.placeId}`;
    window.open(url, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: store.rank * 0.05 }}
      onClick={onClick}
      className={`
        relative rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden
        ${isSelected
          ? "border-amber-500/60 bg-amber-900/20 shadow-lg shadow-amber-900/20"
          : "border-white/10 bg-white/3 hover:border-amber-500/30 hover:bg-white/5"
        }
      `}
    >
      {/* 排名徽章 */}
      {store.rank <= 3 && (
        <div className={`
          absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
          ${store.rank === 1 ? "bg-amber-500 text-black" :
            store.rank === 2 ? "bg-slate-300 text-black" :
            "bg-amber-700 text-white"}
        `}>
          {store.rank}
        </div>
      )}

      <div className="p-4">
        {/* 店名 + 共振分數 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-white truncate">{store.name}</h3>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{store.address}</p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xl font-black ${scoreColor}`}>{store.resonanceScore}</div>
            <div className="text-[9px] text-slate-500">共振指數</div>
          </div>
        </div>

        {/* 火焰星等 */}
        <div className="flex items-center gap-2 mb-3">
          <ResonanceFlames count={store.resonanceStars} />
          <span className={`text-xs px-2 py-0.5 rounded-full ${bearingColors.bg} ${bearingColors.text} ${bearingColors.border} border`}>
            {store.bearingLabel}方 · {bearingColors.label}
          </span>
          {store.isOpen === true && (
            <span className="text-xs text-emerald-400">● 營業中</span>
          )}
          {store.isOpen === false && (
            <span className="text-xs text-slate-500">● 已打烊</span>
          )}
        </div>

        {/* 推薦語 */}
        <p className="text-xs text-amber-300/80 mb-3 leading-relaxed">{store.recommendation}</p>

        {/* 距離 + 評分 */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span>📍 {store.distance < 1000 ? `${store.distance}m` : `${(store.distance / 1000).toFixed(1)}km`}</span>
          {store.rating && <span>⭐ {store.rating.toFixed(1)}</span>}
        </div>

        {/* 展開三維分析 */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          {expanded ? "▲" : "▼"} 天命三維分析
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 border-t border-white/5 pt-3 space-y-3">
                {/* 三維分析卡片 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-[9px] text-white/40 mb-0.5">方位</div>
                    <div className="text-xs font-bold text-white/70">{store.bearingLabel}山</div>
                    <div className={`text-[9px] mt-0.5 ${bearingColors.text}`}>
                      {bearingColors.label}氣 {store.bearingDegree}°
                    </div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-[9px] text-white/40 mb-0.5">門牌</div>
                    <div className="text-xs font-bold text-white/70">{store.addressAnalysis.digits || "—"}</div>
                    <div className={`text-[9px] mt-0.5 ${addressColors.text}`}>
                      {addressColors.label}屬
                    </div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                    <div className="text-[9px] text-white/40 mb-0.5">店名</div>
                    <div className="text-xs font-bold text-white/70 truncate">{store.nameAnalysis.matchedKeyword || "字根"}</div>
                    <div className={`text-[9px] mt-0.5 ${nameColors.text}`}>
                      {nameColors.label}屬
                    </div>
                  </div>
                </div>

                {/* 分析理由 */}
                <div className="space-y-1.5">
                  {store.reasons.map((reason, i) => (
                    <div key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                      <span className="text-amber-500/60 shrink-0">◆</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 操作按鈕區 */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleNavigate}
            className="flex-1 text-xs py-2 rounded-xl font-semibold transition-all"
            style={{
              background: store.resonanceScore >= 70
                ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                : "rgba(255,255,255,0.05)",
              color: store.resonanceScore >= 70 ? "#000" : "#94a3b8",
              border: store.resonanceScore >= 70 ? "none" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            🗺 前往此彩券行
          </button>
          {onFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(); }}
              className={`w-10 rounded-xl text-sm flex items-center justify-center transition-all border ${
                isFavorited
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-amber-400 hover:border-amber-500/30'
              }`}
              title={isFavorited ? '已收藏' : '收藏此彩券行'}
            >
              <Star className="w-4 h-4" fill={isFavorited ? '#f59e0b' : 'none'} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km',  value: 1000 },
  { label: '2km',  value: 2000 },
  { label: '5km',  value: 5000 },
];

export function NearbyStores() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [rawStores, setRawStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchRadius, setSearchRadius] = useState(2000);
  const [mapVisible, setMapVisible] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapReadyRef = useRef(false);

  const utils = trpc.useUtils();
  const scoreMutation = trpc.lottery.scoreStores.useMutation();
  const addFavoriteMutation = trpc.lottery.addFavorite.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success('已收藏彩券行！可在「我的收藏」查看');
        utils.lottery.getFavorites.invalidate();
      } else {
        toast.error(res.message ?? '收藏失敗');
      }
    },
    onError: () => toast.error('收藏失敗，請稍後再試'),
  });
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  // 清除地圖標記
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  // 繪製彩券行標記
  const drawStoreMarkers = useCallback((map: google.maps.Map, stores: ScoredStore[], userLoc: { lat: number; lng: number }) => {
    clearMarkers();
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // 用戶位置標記
    const userMarker = new google.maps.Marker({
      position: new google.maps.LatLng(userLoc.lat, userLoc.lng),
      map,
      title: "您的位置",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#6366f1",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      },
      zIndex: 999,
    });
    markersRef.current.push(userMarker);

    // 彩券行標記
    stores.forEach((store) => {
      const color = getMarkerColor(store.resonanceScore);
      const label = getMarkerLabel(store.resonanceScore);

      const svgMarker = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
            </filter>
            <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
              fill="${color}" filter="url(#shadow)"/>
            <circle cx="18" cy="18" r="11" fill="rgba(0,0,0,0.25)"/>
            <text x="18" y="15" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="white">${store.resonanceScore}</text>
            <text x="18" y="25" text-anchor="middle" font-family="sans-serif" font-size="7" fill="rgba(255,255,255,0.85)">${label}</text>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(36, 44),
        anchor: new google.maps.Point(18, 44),
      };

      const marker = new google.maps.Marker({
        position: new google.maps.LatLng(store.lat, store.lng),
        map,
        title: store.name,
        icon: svgMarker,
        zIndex: store.resonanceScore,
      });

      marker.addListener("click", () => {
        const bearingLabel = ELEMENT_COLORS[store.bearingElement]?.label ?? "";
        const content = `
          <div style="background:#1a1a2e;color:#fff;padding:10px 12px;border-radius:10px;min-width:160px;font-family:sans-serif;border:1px solid rgba(255,255,255,0.15)">
            <div style="font-weight:bold;font-size:13px;margin-bottom:4px">${store.name}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">${store.address}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:20px;font-weight:900;color:${color}">${store.resonanceScore}</span>
              <span style="font-size:10px;color:#94a3b8">共振指數</span>
            </div>
            <div style="font-size:11px;color:${color};margin-bottom:4px">${store.recommendation}</div>
            <div style="font-size:10px;color:#64748b">${store.bearingLabel}方 · ${bearingLabel} · ${store.distance < 1000 ? store.distance + "m" : (store.distance / 1000).toFixed(1) + "km"}</div>
          </div>
        `;
        infoWindowRef.current!.setContent(content);
        infoWindowRef.current!.open(map, marker);
        setSelectedStore(store.placeId);
      });

      markersRef.current.push(marker);
    });

    // 調整地圖視野
    if (stores.length > 0) {
      try {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(userLoc.lat, userLoc.lng));
        stores.forEach(s => bounds.extend(new google.maps.LatLng(s.lat, s.lng)));
        map.fitBounds(bounds, 50);
        const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom()! > 16) map.setZoom(16);
        });
        setTimeout(() => google.maps.event.removeListener(listener), 2000);
      } catch (e) {
        console.warn("fitBounds error:", e);
      }
    }
  }, [clearMarkers]);

  // 取得 GPS 定位
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("您的瀏覽器不支援 GPS 定位");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        setLocationError("無法取得位置，請確認已允許定位權限");
        setIsLocating(false);
        console.warn("Geolocation error:", err);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  // 執行搜尋
  const doSearch = useCallback(
    (map: google.maps.Map, loc: { lat: number; lng: number }) => {
      setIsSearching(true);
      clearMarkers();
      const service = new google.maps.places.PlacesService(map);
      const center = new google.maps.LatLng(loc.lat, loc.lng);

      service.nearbySearch(
        {
          location: center,
          radius: searchRadius,
          keyword: "公益彩券 彩券行 樂透",
          type: "store",
        },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            setIsSearching(false);
            toast.error("附近未找到彩券行，請擴大搜尋範圍");
            return;
          }

          const storeList = results.slice(0, 12).map((place) => {
            const lat = place.geometry?.location?.lat() ?? 0;
            const lng = place.geometry?.location?.lng() ?? 0;
            const dx = (lat - loc.lat) * 111000;
            const dy = (lng - loc.lng) * 111000 * Math.cos((loc.lat * Math.PI) / 180);
            const distance = Math.round(Math.sqrt(dx * dx + dy * dy));

            return {
              placeId: place.place_id ?? "",
              name: place.name ?? "彩券行",
              address: place.vicinity ?? "",
              lat,
              lng,
              distance,
              rating: place.rating,
              isOpen: place.opening_hours?.isOpen?.() ?? undefined,
            };
          });

          setRawStores(storeList);

          scoreMutation.mutate(
            {
              userLat: loc.lat,
              userLng: loc.lng,
              stores: storeList,
            },
            {
              onSuccess: (data) => {
                setIsSearching(false);
                // 搜尋完成後繪製標記
                if (mapRef.current && data.stores) {
                  drawStoreMarkers(mapRef.current, data.stores as ScoredStore[], loc);
                }
              },
              onError: () => {
                setIsSearching(false);
                toast.error("天命評分暫時無法使用");
              },
            },
          );
        },
      );
    },
    [scoreMutation, searchRadius, clearMarkers, drawStoreMarkers],
  );

  // 地圖就緒後執行搜尋（只執行一次）
  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      if (mapReadyRef.current) return;
      mapReadyRef.current = true;
      mapRef.current = map;
      if (userLocation) {
        doSearch(map, userLocation);
      }
    },
    [userLocation, doSearch],
  );

  // 當取得位置後自動觸發地圖搜尋
  useEffect(() => {
    if (userLocation && mapRef.current) {
      doSearch(mapRef.current, userLocation);
    }
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // 搜尋範圍改變時重新搜尋
  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    setRawStores([]);
    scoreMutation.reset();
    clearMarkers();
    if (userLocation && mapRef.current) {
      setTimeout(() => {
        if (mapRef.current && userLocation) doSearch(mapRef.current, userLocation);
      }, 50);
    }
  };

  const scoredStores = scoreMutation.data?.stores ?? [];
  const dayPillar = scoreMutation.data?.dayPillar;
  const hourPillar = scoreMutation.data?.hourPillar;
  const favorableElements = scoreMutation.data?.favorableElements;
  const bestHours = (scoreMutation.data as any)?.bestHours as BestHour[] | undefined;

  // Top 3 排行榜
  const top3 = [...scoredStores].sort((a: ScoredStore, b: ScoredStore) => b.resonanceScore - a.resonanceScore).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* 收藏彩券行入口 */}
      <FavoriteStores />

      {/* 標題 */}
      <div className="text-center">
        <h2 className="text-lg font-bold oracle-text-gradient tracking-widest mb-1">
          附近彩券行天命共振
        </h2>
        <p className="text-xs text-slate-500">
          結合流日流時與命格，找出此刻天命最強的彩券行
        </p>
      </div>

      {/* 定位狀態 */}
      {!userLocation ? (
        <div className="glass-card rounded-2xl p-6 text-center border border-white/10">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-sm text-slate-400 mb-4">
            開啟 GPS 定位，系統將根據您的位置與當前流日流時，計算附近每家彩券行的天命共振指數
          </p>
          {locationError && (
            <p className="text-xs text-red-400 mb-3">{locationError}</p>
          )}
          <button
            onClick={requestLocation}
            disabled={isLocating}
            className="flame-button px-6 py-2.5 rounded-xl text-sm font-semibold"
          >
            {isLocating ? (
              <span className="flex items-center gap-2">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>☯</motion.span>
                定位中...
              </span>
            ) : "🔍 開啟定位搜尋"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 當前分析條件 */}
          {(dayPillar || hourPillar) && (
            <div className="glass-card rounded-xl p-3 border border-amber-600/20 flex flex-wrap gap-3 text-xs">
              <span className="text-slate-400">分析條件：</span>
              {dayPillar && (
                <span className="text-amber-300">
                  流日 {dayPillar.stem}{dayPillar.branch}（{dayPillar.stemElement}）
                </span>
              )}
              {hourPillar && (
                <span className="text-amber-300">
                  流時 {hourPillar.chineseName}（{hourPillar.stemElement}）
                </span>
              )}
              {favorableElements && favorableElements.length > 0 ? (
                <span className="text-slate-500">· 命格用神：{favorableElements.join('、')}</span>
              ) : (
                <span className="text-slate-500/50">· 未設定命格</span>
              )}
            </div>
          )}

          {/* 最佳購彩時段推薦 */}
          {bestHours && bestHours.length > 0 && (
            <div className="glass-card rounded-xl p-3 border border-amber-500/20">
              <p className="text-xs font-semibold text-amber-400 mb-2">⏰ 今日最佳購彩時段</p>
              <div className="grid grid-cols-3 gap-2">
                {bestHours.map((h, i) => (
                  <div
                    key={h.branch}
                    className={`text-center p-2 rounded-lg border transition-all ${
                      h.isCurrentHour
                        ? "bg-amber-500/20 border-amber-500/50"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    {i === 0 && <div className="text-[9px] text-amber-400 mb-0.5">🥇 最佳</div>}
                    {i === 1 && <div className="text-[9px] text-slate-400 mb-0.5">🥈 次佳</div>}
                    {i === 2 && <div className="text-[9px] text-slate-500 mb-0.5">🥉 第三</div>}
                    <div className={`text-xs font-bold ${h.isCurrentHour ? "text-amber-300" : "text-white/70"}`}>
                      {h.chineseName}
                    </div>
                    <div className="text-[9px] text-slate-500">{h.displayTime}</div>
                    <div className={`text-[9px] mt-0.5 ${
                      h.energyLabel === "大吉" ? "text-amber-400" :
                      h.energyLabel === "吉" ? "text-emerald-400" : "text-slate-400"
                    }`}>{h.energyLabel}</div>
                    {h.isCurrentHour && (
                      <div className="text-[8px] text-amber-300 mt-0.5 animate-pulse">● 當前時辰</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 搜尋範圍選擇器 */}
          <div className="glass-card rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-slate-500">搜尋範圍</div>
              {/* 地圖/列表切換 */}
              {scoredStores.length > 0 && (
                <button
                  onClick={() => setMapVisible(!mapVisible)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white/70 transition-colors"
                >
                  {mapVisible ? <List className="w-3 h-3" /> : <MapIcon className="w-3 h-3" />}
                  {mapVisible ? "隱藏地圖" : "顯示地圖"}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleRadiusChange(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    searchRadius === opt.value
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 地圖（放大版，360px） */}
          <AnimatePresence>
            {mapVisible && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 360, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden rounded-2xl border border-white/10"
              >
                <div style={{ height: 360 }}>
                  <MapView
                    onMapReady={handleMapReady}
                    initialCenter={userLocation}
                    initialZoom={15}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 搜尋中 */}
          {(isSearching || scoreMutation.isPending) && (
            <div className="text-center py-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-3xl inline-block mb-2"
              >
                ☯
              </motion.div>
              <p className="text-sm text-amber-400">天命共振計算中...</p>
              <p className="text-xs text-slate-500 mt-1">分析方位五行、門牌數字、流日流時...</p>
            </div>
          )}

          {/* 今日最強彩券行排行榜 */}
          {top3.length > 0 && !isSearching && !scoreMutation.isPending && (
            <div className="glass-card rounded-xl p-3 border border-amber-600/20">
              <p className="text-xs font-semibold text-amber-400 mb-2">🏆 今日最強彩券行 Top 3</p>
              <div className="space-y-2">
                {top3.map((store: ScoredStore, i) => (
                  <div
                    key={store.placeId}
                    onClick={() => {
                      setSelectedStore(store.placeId);
                      if (mapRef.current) {
                        mapRef.current.panTo(new google.maps.LatLng(store.lat, store.lng));
                        mapRef.current.setZoom(17);
                        setMapVisible(true);
                      }
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/8 cursor-pointer hover:border-amber-500/30 transition-colors"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-amber-500 text-black" :
                      i === 1 ? "bg-slate-300 text-black" :
                      "bg-amber-700 text-white"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{store.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{store.address}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-black ${
                        store.resonanceScore >= 80 ? "text-amber-400" :
                        store.resonanceScore >= 60 ? "text-emerald-400" : "text-blue-400"
                      }`}>{store.resonanceScore}</div>
                      <div className="text-[9px] text-slate-500">共振</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 彩券行列表 */}
          {scoredStores.length > 0 && !isSearching && !scoreMutation.isPending && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  找到 {scoredStores.length} 家彩券行（{RADIUS_OPTIONS.find(o => o.value === searchRadius)?.label} 內），依天命共振指數排序
                </p>
                <button
                  onClick={() => {
                    if (userLocation && mapRef.current) {
                      doSearch(mapRef.current, userLocation);
                    } else {
                      requestLocation();
                    }
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  🔄 重新搜尋
                </button>
              </div>
              {scoredStores.map((store: ScoredStore) => (
                <StoreCard
                  key={store.placeId}
                  store={store}
                  isSelected={selectedStore === store.placeId}
                  onClick={() => {
                    const newSelected = selectedStore === store.placeId ? null : store.placeId;
                    setSelectedStore(newSelected);
                    if (newSelected && mapRef.current) {
                      mapRef.current.panTo(new google.maps.LatLng(store.lat, store.lng));
                      mapRef.current.setZoom(17);
                      setMapVisible(true);
                    }
                  }}
                  isFavorited={favoritedIds.has(store.placeId)}
                  onFavorite={() => {
                    setFavoritedIds(prev => { const s = new Set(prev); s.add(store.placeId); return s; });
                    addFavoriteMutation.mutate({
                      placeId: store.placeId,
                      name: store.name,
                      address: store.address,
                      lat: store.lat,
                      lng: store.lng,
                    });
                  }}
                />
              ))}
            </div>
          )}

          {/* 無結果 */}
          {rawStores.length === 0 && !isSearching && !scoreMutation.isPending && (
            <div className="text-center py-6 text-slate-500 text-sm">
              {RADIUS_OPTIONS.find(o => o.value === searchRadius)?.label} 內未找到彩券行
              <br />
              <span className="text-xs text-slate-600">可嘗試擴大搜尋範圍</span>
              <br />
              <button onClick={requestLocation} className="text-amber-400 mt-2 text-xs">
                重新搜尋
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
