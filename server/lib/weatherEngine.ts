/**
 * weatherEngine.ts
 * 天氣五行引擎 - 接入 Open-Meteo 免費 API（無需 API Key）
 * 將天氣狀況映射為五行能量比例
 */

export interface WeatherWuxing {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
  /** 天氣描述（中文） */
  description: string;
  /** 天氣代碼 WMO */
  weatherCode: number;
  /** 溫度（攝氏） */
  temperature: number;
  /** 相對濕度（%） */
  humidity: number;
  /** 風速（km/h） */
  windSpeed: number;
  /** 降水量（mm） */
  precipitation: number;
}

/**
 * WMO 天氣代碼 → 五行映射規則
 *
 * 五行天氣邏輯：
 * 🔥 火（陽光、高溫、乾燥）：晴天、高溫
 * 🌍 土（陰霾、多雲、霧）：陰天、多雲、霧
 * ⚪ 金（涼爽、清風、乾冷）：涼爽有風、冬季晴天
 * 🌊 水（雨水、潮濕、寒冷）：雨天、雪天、低溫
 * 🌳 木（春風、溫和、生機）：春季溫和、微風
 *
 * WMO Code 參考：https://open-meteo.com/en/docs
 */
interface WmoMapping {
  description: string;
  base: { 木: number; 火: number; 土: number; 金: number; 水: number };
}

const WMO_MAPPING: Record<number, WmoMapping> = {
  // 晴天 → 火旺
  0:  { description: "晴天", base: { 木: 0.10, 火: 0.55, 土: 0.15, 金: 0.10, 水: 0.10 } },
  1:  { description: "大致晴朗", base: { 木: 0.12, 火: 0.45, 土: 0.18, 金: 0.12, 水: 0.13 } },
  // 部分多雲 → 火土均衡
  2:  { description: "部分多雲", base: { 木: 0.12, 火: 0.30, 土: 0.30, 金: 0.15, 水: 0.13 } },
  // 陰天 → 土旺
  3:  { description: "陰天", base: { 木: 0.10, 火: 0.10, 土: 0.45, 金: 0.20, 水: 0.15 } },
  // 霧 → 水土
  45: { description: "霧", base: { 木: 0.08, 火: 0.08, 土: 0.30, 金: 0.14, 水: 0.40 } },
  48: { description: "霧凇", base: { 木: 0.05, 火: 0.05, 土: 0.25, 金: 0.20, 水: 0.45 } },
  // 毛毛雨 → 水旺
  51: { description: "輕微毛毛雨", base: { 木: 0.10, 火: 0.08, 土: 0.20, 金: 0.12, 水: 0.50 } },
  53: { description: "中度毛毛雨", base: { 木: 0.08, 火: 0.05, 土: 0.17, 金: 0.10, 水: 0.60 } },
  55: { description: "濃密毛毛雨", base: { 木: 0.05, 火: 0.03, 土: 0.12, 金: 0.10, 水: 0.70 } },
  // 小雨 → 水旺
  61: { description: "小雨", base: { 木: 0.10, 火: 0.05, 土: 0.15, 金: 0.10, 水: 0.60 } },
  63: { description: "中雨", base: { 木: 0.08, 火: 0.03, 土: 0.12, 金: 0.07, 水: 0.70 } },
  65: { description: "大雨", base: { 木: 0.05, 火: 0.02, 土: 0.08, 金: 0.05, 水: 0.80 } },
  // 雪 → 水金
  71: { description: "小雪", base: { 木: 0.05, 火: 0.03, 土: 0.12, 金: 0.30, 水: 0.50 } },
  73: { description: "中雪", base: { 木: 0.03, 火: 0.02, 土: 0.10, 金: 0.35, 水: 0.50 } },
  75: { description: "大雪", base: { 木: 0.02, 火: 0.01, 土: 0.07, 金: 0.40, 水: 0.50 } },
  // 雷雨 → 水火
  80: { description: "陣雨", base: { 木: 0.10, 火: 0.10, 土: 0.15, 金: 0.10, 水: 0.55 } },
  81: { description: "中度陣雨", base: { 木: 0.08, 火: 0.08, 土: 0.12, 金: 0.07, 水: 0.65 } },
  82: { description: "強陣雨", base: { 木: 0.05, 火: 0.05, 土: 0.10, 金: 0.05, 水: 0.75 } },
  95: { description: "雷雨", base: { 木: 0.08, 火: 0.20, 土: 0.12, 金: 0.05, 水: 0.55 } },
  96: { description: "伴有冰雹的雷雨", base: { 木: 0.05, 火: 0.15, 土: 0.10, 金: 0.15, 水: 0.55 } },
  99: { description: "強雷雨伴冰雹", base: { 木: 0.03, 火: 0.12, 土: 0.08, 金: 0.17, 水: 0.60 } },
};

/** 根據溫度調整五行比例 */
function applyTemperatureModifier(
  base: WeatherWuxing,
  temperature: number
): WeatherWuxing {
  const result = { ...base };
  if (temperature >= 35) {
    // 酷熱：強化火，削弱水
    result.火 = Math.min(1, result.火 + 0.15);
    result.水 = Math.max(0, result.水 - 0.10);
    result.金 = Math.max(0, result.金 - 0.05);
  } else if (temperature >= 28) {
    // 炎熱：略增火
    result.火 = Math.min(1, result.火 + 0.08);
    result.水 = Math.max(0, result.水 - 0.05);
    result.金 = Math.max(0, result.金 - 0.03);
  } else if (temperature <= 5) {
    // 嚴寒：強化水金，削弱火
    result.水 = Math.min(1, result.水 + 0.12);
    result.金 = Math.min(1, result.金 + 0.08);
    result.火 = Math.max(0, result.火 - 0.15);
    result.木 = Math.max(0, result.木 - 0.05);
  } else if (temperature <= 15) {
    // 涼爽：略增金
    result.金 = Math.min(1, result.金 + 0.05);
    result.火 = Math.max(0, result.火 - 0.05);
  } else if (temperature >= 20 && temperature <= 27) {
    // 溫和春秋：增木
    result.木 = Math.min(1, result.木 + 0.05);
  }
  return normalizeWuxing(result);
}

/** 根據風速調整五行比例 */
function applyWindModifier(
  base: WeatherWuxing,
  windSpeed: number
): WeatherWuxing {
  const result = { ...base };
  if (windSpeed >= 40) {
    // 強風：強化金（金主決斷、肅殺）
    result.金 = Math.min(1, result.金 + 0.10);
    result.木 = Math.max(0, result.木 - 0.05);
    result.土 = Math.max(0, result.土 - 0.05);
  } else if (windSpeed >= 20) {
    // 中等風：略增金
    result.金 = Math.min(1, result.金 + 0.05);
    result.土 = Math.max(0, result.土 - 0.05);
  } else if (windSpeed <= 5) {
    // 無風：略增土（土主靜）
    result.土 = Math.min(1, result.土 + 0.03);
  }
  return normalizeWuxing(result);
}

/** 根據濕度調整五行比例 */
function applyHumidityModifier(
  base: WeatherWuxing,
  humidity: number
): WeatherWuxing {
  const result = { ...base };
  if (humidity >= 85) {
    // 極濕：強化水
    result.水 = Math.min(1, result.水 + 0.08);
    result.火 = Math.max(0, result.火 - 0.05);
    result.金 = Math.max(0, result.金 - 0.03);
  } else if (humidity <= 30) {
    // 乾燥：強化火金
    result.火 = Math.min(1, result.火 + 0.05);
    result.金 = Math.min(1, result.金 + 0.03);
    result.水 = Math.max(0, result.水 - 0.08);
  }
  return normalizeWuxing(result);
}

/** 正規化五行比例使總和為 1 */
function normalizeWuxing(w: WeatherWuxing): WeatherWuxing {
  const total = w.木 + w.火 + w.土 + w.金 + w.水;
  if (total === 0) return w;
  return {
    ...w,
    木: w.木 / total,
    火: w.火 / total,
    土: w.土 / total,
    金: w.金 / total,
    水: w.水 / total,
  };
}

/** 根據 WMO 代碼取得基礎映射，找不到時用最近的代碼 */
function getWmoBase(code: number): WmoMapping {
  if (WMO_MAPPING[code]) return WMO_MAPPING[code];
  // 找最近的已知代碼
  const known = Object.keys(WMO_MAPPING).map(Number);
  const closest = known.reduce((prev, curr) =>
    Math.abs(curr - code) < Math.abs(prev - code) ? curr : prev
  );
  return WMO_MAPPING[closest] ?? WMO_MAPPING[0];
}

/**
 * 獲取指定座標的當前天氣五行能量
 * 使用 Open-Meteo API（免費，無需 API Key）
 */
export async function getCurrentWeatherWuxing(
  lat: number,
  lon: number
): Promise<WeatherWuxing> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
    const json = await res.json() as {
      current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        precipitation: number;
        weather_code: number;
        wind_speed_10m: number;
      };
    };
    const c = json.current;
    const wmoData = getWmoBase(c.weather_code);
    let result: WeatherWuxing = {
      ...wmoData.base,
      description: wmoData.description,
      weatherCode: c.weather_code,
      temperature: c.temperature_2m,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
      precipitation: c.precipitation,
    };
    // 依溫度、風速、濕度微調
    result = applyTemperatureModifier(result, c.temperature_2m);
    result = applyWindModifier(result, c.wind_speed_10m);
    result = applyHumidityModifier(result, c.relative_humidity_2m);
    return result;
  } catch {
    // API 失敗時回傳中性五行（均等分佈，略偏土）
    return {
      木: 0.18, 火: 0.20, 土: 0.24, 金: 0.20, 水: 0.18,
      description: "無法取得天氣資料",
      weatherCode: -1,
      temperature: 25,
      humidity: 60,
      windSpeed: 10,
      precipitation: 0,
    };
  }
}

/**
 * 根據台灣地區常見城市取得預設座標
 * 若用戶未提供座標，使用台北作為預設
 */
export function getDefaultCoordinates(): { lat: number; lon: number } {
  return { lat: 25.0330, lon: 121.5654 }; // 台北
}
