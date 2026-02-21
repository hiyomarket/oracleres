import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
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

const ELEMENT_COLORS: Record<WuXing, { text: string; bg: string; border: string; label: string }> = {
  fire:  { text: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/40",  label: "火" },
  earth: { text: "text-yellow-500",  bg: "bg-yellow-600/15",  border: "border-yellow-600/40",  label: "土" },
  metal: { text: "text-slate-300",   bg: "bg-slate-400/15",   border: "border-slate-400/40",   label: "金" },
  wood:  { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40", label: "木" },
  water: { text: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/40",    label: "水" },
};

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
}: {
  store: ScoredStore;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const bearingColors = ELEMENT_COLORS[store.bearingElement];

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

        {/* 展開詳細理由 */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          {expanded ? "▲" : "▼"} 天命分析詳情
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
              <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                {store.reasons.map((reason, i) => (
                  <div key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                    <span className="text-amber-500/60 shrink-0">◆</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 導航按鈕 */}
        <button
          onClick={handleNavigate}
          className="mt-3 w-full text-xs py-2 rounded-xl font-semibold transition-all"
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
      </div>
    </motion.div>
  );
}

export function NearbyStores() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [rawStores, setRawStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const scoreMutation = trpc.lottery.scoreStores.useMutation();

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

  // 地圖就緒後搜尋附近彩券行
  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (!userLocation) return;

      setIsSearching(true);
      const service = new google.maps.places.PlacesService(map);
      const center = new google.maps.LatLng(userLocation.lat, userLocation.lng);

      service.nearbySearch(
        {
          location: center,
          radius: 2000,
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
            const dx = (lat - userLocation.lat) * 111000;
            const dy = (lng - userLocation.lng) * 111000 * Math.cos((userLocation.lat * Math.PI) / 180);
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

          // 呼叫後端天命共振評分
          scoreMutation.mutate(
            {
              userLat: userLocation.lat,
              userLng: userLocation.lng,
              stores: storeList,
            },
            {
              onSuccess: () => setIsSearching(false),
              onError: () => {
                setIsSearching(false);
                toast.error("天命評分暫時無法使用");
              },
            },
          );
        },
      );
    },
    [userLocation, scoreMutation],
  );

  // 當取得位置後自動觸發地圖搜尋
  useEffect(() => {
    if (userLocation && mapRef.current) {
      handleMapReady(mapRef.current);
    }
  }, [userLocation, handleMapReady]);

  const scoredStores = scoreMutation.data?.stores ?? [];
  const dayPillar = scoreMutation.data?.dayPillar;
  const hourPillar = scoreMutation.data?.hourPillar;

  return (
    <div className="space-y-4">
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
              <span className="text-slate-500">· 命格用神：火土</span>
            </div>
          )}

          {/* 地圖 */}
          <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 220 }}>
            <MapView
              onMapReady={handleMapReady}
              initialCenter={userLocation}
              initialZoom={15}
            />
          </div>

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

          {/* 彩券行列表 */}
          {scoredStores.length > 0 && !isSearching && !scoreMutation.isPending && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  找到 {scoredStores.length} 家彩券行，依天命共振指數排序
                </p>
                <button
                  onClick={requestLocation}
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
                  onClick={() => setSelectedStore(
                    selectedStore === store.placeId ? null : store.placeId
                  )}
                />
              ))}
            </div>
          )}

          {/* 無結果 */}
          {rawStores.length === 0 && !isSearching && !scoreMutation.isPending && (
            <div className="text-center py-6 text-slate-500 text-sm">
              附近 2 公里內未找到彩券行
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
