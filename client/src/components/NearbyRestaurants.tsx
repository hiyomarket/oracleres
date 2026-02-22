import { useState, useRef, useCallback } from "react";
import { MapView } from "@/components/Map";

// 五行 → Google Maps 搜尋關鍵字（台灣在地化）
const ELEMENT_KEYWORDS: Record<string, { keywords: string[]; label: string; emoji: string; color: string }> = {
  土: {
    keywords: ["甜點", "米食", "台灣料理", "蛋糕甜食"],
    label: "補土（甜食/米食）",
    emoji: "🌍",
    color: "text-amber-400 border-amber-500/40 bg-amber-950/20",
  },
  金: {
    keywords: ["豆腐", "日式料理", "清淡料理", "白肉"],
    label: "補金（白色食物）",
    emoji: "⚪",
    color: "text-slate-300 border-slate-400/40 bg-slate-800/30",
  },
  火: {
    keywords: ["燒烤", "辛辣料理", "麻辣", "烤肉"],
    label: "補火（辛辣/燒烤）",
    emoji: "🔥",
    color: "text-red-400 border-red-500/40 bg-red-950/20",
  },
  水: {
    keywords: ["海鮮", "湯品", "火鍋", "清湯"],
    label: "補水（湯品/海鮮）",
    emoji: "🌊",
    color: "text-blue-400 border-blue-500/40 bg-blue-950/20",
  },
  木: {
    keywords: ["蔬食", "素食", "沙拉", "健康餐"],
    label: "補木（蔬食/健康）",
    emoji: "🌿",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
  },
};

// 計算命理匹配分數（1-5星）
function calcMatchScore(element: string, priority: number): number {
  // 優先級越高（數字越小）→ 匹配度越高
  if (priority === 1) return 5;
  if (priority === 2) return 4;
  return 3;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  distance?: number;
  element: string;
  matchScore: number;
  keyword: string;
  placeId: string;
}

interface Props {
  supplements: Array<{ element: string; priority: number; foods: string[] }>;
}

export function NearbyRestaurants({ supplements }: Props) {
  const [phase, setPhase] = useState<"idle" | "locating" | "searching" | "done" | "error">("idle");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleSearch = useCallback(() => {
    setPhase("locating");
    setRestaurants([]);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setPhase("searching");
        setShowMap(true);
      },
      (err) => {
        setPhase("error");
        setErrorMsg(`無法取得定位：${err.message}。請確認已允許位置存取。`);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleMapReady = useCallback(
    async (map: google.maps.Map) => {
      mapRef.current = map;
      if (!userLocation) return;

      try {
        const results: Restaurant[] = [];
        const seen = new Set<string>();

        // 依優先級搜尋前兩個需補五行
        const topSupplements = supplements.slice(0, 2);

        for (const sup of topSupplements) {
          const info = ELEMENT_KEYWORDS[sup.element];
          if (!info) continue;

          // 取第一個關鍵字搜尋
          const keyword = info.keywords[0];

          const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
          const request = {
            textQuery: keyword,
            fields: ["id", "displayName", "formattedAddress", "rating", "userRatingCount", "location"],
            locationBias: {
              center: userLocation,
              radius: 1000,
            },
            maxResultCount: 5,
            language: "zh-TW",
          };

          const { places } = await Place.searchByText(request);

          for (const place of places) {
            if (!place.id || seen.has(place.id)) continue;
            seen.add(place.id);

            // 計算距離（Haversine）
            let distance: number | undefined;
            if (place.location) {
              const lat2 = place.location.lat();
              const lng2 = place.location.lng();
              const R = 6371000;
              const dLat = ((lat2 - userLocation.lat) * Math.PI) / 180;
              const dLng = ((lng2 - userLocation.lng) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos((userLocation.lat * Math.PI) / 180) *
                  Math.cos((lat2 * Math.PI) / 180) *
                  Math.sin(dLng / 2) ** 2;
              distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
            }

            results.push({
              id: place.id,
              name: place.displayName ?? "未知餐廳",
              address: place.formattedAddress ?? "",
              rating: place.rating ?? 0,
              userRatingsTotal: place.userRatingCount ?? 0,
              distance,
              element: sup.element,
              matchScore: calcMatchScore(sup.element, sup.priority),
              keyword,
              placeId: place.id,
            });
          }
        }

        // 依命理匹配分數 + 評分排序
        results.sort((a, b) => b.matchScore - a.matchScore || b.rating - a.rating);
        setRestaurants(results.slice(0, 8));
        setPhase("done");
      } catch (err) {
        console.error(err);
        setPhase("error");
        setErrorMsg("搜尋餐廳時發生錯誤，請稍後再試。");
      }
    },
    [userLocation, supplements]
  );

  const topElements = supplements.slice(0, 2).map((s) => s.element);

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/3 overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">📍</span>
          <span className="text-sm font-semibold text-white/80">附近命理推薦餐廳</span>
          {topElements.length > 0 && (
            <div className="flex gap-1">
              {topElements.map((el) => (
                <span key={el} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ELEMENT_KEYWORDS[el]?.color ?? ''}`}>
                  {ELEMENT_KEYWORDS[el]?.emoji} 補{el}
                </span>
              ))}
            </div>
          )}
        </div>
        {phase === "idle" && (
          <button
            onClick={handleSearch}
            className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-all"
          >
            🔍 尋找附近餐廳
          </button>
        )}
        {(phase === "locating" || phase === "searching") && (
          <span className="text-xs text-white/40 animate-pulse">
            {phase === "locating" ? "📡 取得定位中..." : "🔍 搜尋餐廳中..."}
          </span>
        )}
        {phase === "done" && (
          <button
            onClick={() => { setPhase("idle"); setShowMap(false); setRestaurants([]); }}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            重新搜尋
          </button>
        )}
      </div>

      {/* 錯誤訊息 */}
      {phase === "error" && (
        <div className="px-4 py-3 text-xs text-red-400">{errorMsg}</div>
      )}

      {/* 地圖（隱藏但需要初始化 Places API） */}
      {showMap && userLocation && (
        <div className="h-0 overflow-hidden">
          <MapView
            initialCenter={userLocation}
            initialZoom={15}
            onMapReady={handleMapReady}
          />
        </div>
      )}

      {/* 餐廳清單 */}
      {phase === "done" && restaurants.length > 0 && (
        <div className="divide-y divide-white/5">
          {restaurants.map((r, i) => {
            const info = ELEMENT_KEYWORDS[r.element];
            const stars = "★".repeat(r.matchScore) + "☆".repeat(5 - r.matchScore);
            return (
              <div key={r.id} className="px-4 py-3 hover:bg-white/3 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-white/30 font-mono w-4">{i + 1}</span>
                      <span className="text-sm font-medium text-white/85 truncate">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6 flex-wrap">
                      {/* 命理匹配標籤 */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${info?.color ?? ''}`}>
                        {info?.emoji} {info?.label}
                      </span>
                      {/* 命理匹配星數 */}
                      <span className="text-[10px] text-amber-400/80">{stars}</span>
                      {/* Google 評分 */}
                      {r.rating > 0 && (
                        <span className="text-[10px] text-white/40">
                          ⭐ {r.rating.toFixed(1)} ({r.userRatingsTotal > 999 ? '999+' : r.userRatingsTotal})
                        </span>
                      )}
                      {/* 距離 */}
                      {r.distance !== undefined && (
                        <span className="text-[10px] text-white/30">
                          📏 {r.distance < 1000 ? `${r.distance}m` : `${(r.distance / 1000).toFixed(1)}km`}
                        </span>
                      )}
                    </div>
                    {r.address && (
                      <p className="text-[10px] text-white/25 ml-6 mt-0.5 truncate">{r.address}</p>
                    )}
                  </div>
                  {/* Google Maps 連結 */}
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${r.placeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-[10px] text-blue-400/60 hover:text-blue-400 transition-colors mt-1"
                  >
                    地圖 →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {phase === "done" && restaurants.length === 0 && (
        <div className="px-4 py-4 text-xs text-white/40 text-center">
          附近 1km 內未找到符合命理的餐廳，請嘗試擴大範圍。
        </div>
      )}

      {/* 說明文字 */}
      {phase === "idle" && (
        <div className="px-4 py-3 text-[10px] text-white/25 leading-relaxed">
          依今日五行缺乏能量，推薦附近命理相符的餐廳。點擊「尋找附近餐廳」後需允許位置存取。
        </div>
      )}
    </div>
  );
}
