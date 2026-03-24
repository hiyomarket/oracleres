/**
 * LeafletMap.tsx
 * 基於 Leaflet.js + CartoDB Dark Matter 暗色底圖的台灣遊戲地圖
 * 所有節點使用真實經緯度，點擊節點自動 flyTo 放大
 */
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import type { MapNode } from "../../../shared/mapNodes";

// 節點 ID → 真實經緯度對應表
// 格式：[lat, lng]（WGS84）
const NODE_COORDS: Record<string, [number, number]> = {
  // ── 台北市 ──
  "tp-zhongzheng":   [25.0340, 121.5200],
  "tp-zhongshan":    [25.0630, 121.5240],
  "tp-daan":         [25.0260, 121.5430],
  "tp-xinyi":        [25.0330, 121.5640],
  "tp-shilin":       [25.0880, 121.5260],
  "tp-beitou":       [25.1320, 121.4990],
  "tp-yangming":     [25.1570, 121.5450],
  "tp-wanhua":       [25.0350, 121.4990],
  "tp-datong":       [25.0630, 121.5130],
  "tp-neihu":        [25.0790, 121.5870],
  "tp-nangang":      [25.0540, 121.6070],
  "tp-wenshan":      [24.9990, 121.5700],
  "tp-songshan":     [25.0500, 121.5770],
  "tp-muzha":        [24.9870, 121.5780],
  "tp-shezidao":     [25.0980, 121.5130],
  "tp-jingmei":      [24.9990, 121.5450],
  // ── 新北市 ──
  "nb-banqiao":      [25.0140, 121.4630],
  "nb-zhonghe":      [24.9960, 121.4940],
  "nb-yonghe":       [25.0120, 121.5170],
  "nb-xinzhuang":    [25.0350, 121.4440],
  "nb-sanchong":     [25.0640, 121.4870],
  "nb-tucheng":      [24.9740, 121.4440],
  "nb-sanxia":       [24.9370, 121.3700],
  "nb-yingge":       [24.9540, 121.3460],
  "nb-xindian":      [24.9640, 121.5380],
  "nb-wulai":        [24.8640, 121.5510],
  "nb-pinglin":      [24.9400, 121.7120],
  "nb-danshui":      [25.1680, 121.4450],
  "nb-bali":         [25.1540, 121.4140],
  "nb-linkou":       [25.0770, 121.3870],
  "nb-ruifang":      [25.1080, 121.8020],
  "nb-jiufen-shenao":[25.1090, 121.8440],
  // ── 基隆市 ──
  "keelung-main":    [25.1280, 121.7410],
  "keelung-zhongzheng":[25.1200, 121.7320],
  "keelung-badouzi": [25.1540, 121.7900],
  "keelung-heping":  [25.1380, 121.7680],
  "keelung-nuannuan":[25.0830, 121.7380],
  "keelung-dawulun": [25.1490, 121.7200],
  // ── 桃園市 ──
  "taoyuan-zhongli": [24.9540, 121.2240],
  "taoyuan-main":    [24.9930, 121.3010],
  "taoyuan-guishan": [25.0470, 121.3530],
  "taoyuan-daxi":    [24.8840, 121.2870],
  "taoyuan-fuxing":  [24.8050, 121.3260],
  "taoyuan-shimen":  [24.9820, 121.2260],
  "taoyuan-pingzhen":[24.9430, 121.2160],
  "taoyuan-longtan": [24.8760, 121.2130],
  "taoyuan-airport": [25.0770, 121.2330],
  "taoyuan-guanyin": [25.0180, 121.1040],
  "taoyuan-yangmei": [24.9160, 121.1480],
  "taoyuan-luzhu":   [25.0820, 121.2730],
  // ── 新竹市 ──
  "hsinchu-city":    [24.8066, 120.9686],
  "hsinchu-science": [24.7870, 121.0120],
  "hsinchu-xiangshan":[24.7540, 120.9350],
  "hsinchu-city-glass":[24.8180, 120.9820],
  "hsinchu-city-nanliao":[24.8350, 120.9260],
  "hsinchu-city-beimen":[24.8340, 120.9620],
  // ── 新竹縣 ──
  "hsinchu-zhudong": [24.6940, 121.0960],
  "hsinchu-jianshi": [24.6630, 121.1700],
  "hsinchu-beipu":   [24.6970, 121.0620],
  "hsinchu-county-guanxi":[24.7920, 121.1730],
  "hsinchu-county-wufeng":[24.7350, 121.1800],
  "hsinchu-county-emei":[24.7280, 121.0430],
  "hsinchu-xinpu":   [24.8410, 121.0540],
  "hsinchu-guanxi":  [24.7920, 121.1730],
  // ── 苗栗縣 ──
  "miaoli-zhunan":   [24.6790, 120.8710],
  "miaoli-main":     [24.5600, 120.8200],
  "miaoli-tongxiao": [24.4740, 120.6960],
  "miaoli-yuanli":   [24.3590, 120.6560],
  "miaoli-sanyi":    [24.3950, 120.7580],
  "miaoli-dahu":     [24.4130, 120.8490],
  "miaoli-shitan":   [24.5010, 120.8780],
  "miaoli-nanzhuang":[24.6040, 120.9440],
  "miaoli-houlong":  [24.6080, 120.7930],
  // ── 台中市 ──
  "taichung-main":   [24.1477, 120.6736],
  "taichung-xitun":  [24.1630, 120.6380],
  "taichung-nantun": [24.1200, 120.6490],
  "taichung-beitun": [24.1980, 120.6820],
  "taichung-fengyuan":[24.2540, 120.7180],
  "taichung-dongshi":[24.2560, 120.8290],
  "taichung-heping": [24.2830, 121.0920],
  "taichung-xinshe": [24.2090, 120.8420],
  "taichung-wufeng": [24.0940, 120.6940],
  "taichung-dali":   [24.1020, 120.6840],
  "taichung-qingshui":[24.2640, 120.5600],
  "taichung-dajia":  [24.3510, 120.6210],
  "taichung-wuqi":   [24.2640, 120.5110],
  "taichung-taiping":[24.1310, 120.7230],
  // ── 彰化縣 ──
  "changhua-main":   [24.0760, 120.5420],
  "changhua-lukang": [24.0540, 120.4330],
  "changhua-xianxi": [24.0530, 120.3940],
  "changhua-fuxing": [23.9520, 120.4500],
  "changhua-yuanlin":[23.9600, 120.5700],
  "changhua-tianzhong":[23.8660, 120.5700],
  "changhua-ershui": [23.8130, 120.6160],
  "changhua-baguashan":[24.0490, 120.5720],
  "changhua-xihu":   [23.9900, 120.4390],
  // ── 南投縣 ──
  "nantou-caotun":   [23.9620, 120.6760],
  "nantou-main":     [23.9160, 120.6870],
  "nantou-jiji":     [23.8380, 120.7840],
  "nantou-shuili":   [23.8140, 120.8530],
  "nantou-yuchi":    [23.9040, 120.9220],
  "nantou-puli":     [23.9710, 120.9730],
  "nantou-renai":    [24.0440, 121.1590],
  "nantou-xinyi":    [23.6830, 120.8440],
  "nantou-lugu":     [23.7490, 120.6870],
  "nantou-zhongliao":[23.9840, 120.7970],
  // ── 雲林縣 ──
  "yunlin-douliu":   [23.7090, 120.5440],
  "yunlin-xiluo":    [23.7890, 120.4790],
  "yunlin-gukeng":   [23.6590, 120.5730],
  "yunlin-linnei":   [23.7010, 120.5110],
  "yunlin-beigang":  [23.5700, 120.3070],
  "yunlin-tuku":     [23.6640, 120.3980],
  "yunlin-huwei":    [23.7100, 120.4310],
  "yunlin-mailiao":  [23.7710, 120.2510],
  "yunlin-linnei-cao":[23.7010, 120.5110],
  // ── 嘉義市 ──
  "chiayi-main":     [23.4800, 120.4490],
  "chiayi-city-wenhua":[23.4780, 120.4510],
  "chiayi-city-beimen":[23.4930, 120.4490],
  "chiayi-city-lantan":[23.4620, 120.4640],
  // ── 嘉義縣 ──
  "chiayi-county":   [23.4590, 120.2740],
  "chiayi-dongshi":  [23.4690, 120.5250],
  "chiayi-alishan":  [23.5130, 120.8040],
  "chiayi-budai":    [23.3600, 120.1570],
  "chiayi-county-meishan":[23.5660, 120.5560],
  "chiayi-county-zhuqi":[23.5240, 120.5020],
  "chiayi-county-lucao":[23.5930, 120.3730],
  // ── 台南市 ──
  "tainan-main":     [22.9998, 120.2269],
  "tainan-anping":   [22.9930, 120.1580],
  "tainan-jiangjun": [23.1770, 120.0830],
  "tainan-qigu":     [23.1260, 120.0960],
  "tainan-xinying":  [23.3040, 120.3180],
  "tainan-baihe":    [23.3640, 120.4600],
  "tainan-guiren":   [22.9750, 120.3040],
  "tainan-shanhua":  [23.1380, 120.3360],
  "tainan-yujing":   [23.1230, 120.4700],
  "tainan-zuozhen":  [23.2020, 120.5010],
  "tainan-dongshan": [23.2490, 120.4440],
  "tainan-nanxi":    [23.1680, 120.5570],
  "tainan-yanshui":  [23.3180, 120.2810],
  "tainan-taijiang": [23.0640, 120.1360],
  // ── 高雄市 ──
  "kaohsiung-main":  [22.6273, 120.3014],
  "kaohsiung-zuoying":[22.6870, 120.2970],
  "kaohsiung-cijin": [22.6100, 120.2680],
  "kaohsiung-lingya":[22.6200, 120.3120],
  "kaohsiung-sanmin":[22.6480, 120.3200],
  "kaohsiung-fengshan":[22.6270, 120.3580],
  "kaohsiung-renwu": [22.6990, 120.3440],
  "kaohsiung-nanzi": [22.7200, 120.3300],
  "kaohsiung-dashu": [22.7620, 120.4290],
  "kaohsiung-liugui":[22.9720, 120.6490],
  "kaohsiung-maolin":[22.8870, 120.6870],
  "kaohsiung-qishan":[22.8880, 120.4810],
  "kaohsiung-meinong":[22.9060, 120.5450],
  "kaohsiung-xiaogang":[22.5720, 120.3490],
  // ── 屏東縣 ──
  "pingtung-main":   [22.6720, 120.4870],
  "pingtung-chaozhou":[22.5440, 120.5380],
  "pingtung-donggang":[22.4680, 120.4520],
  "pingtung-liuqiu": [22.3420, 120.3720],
  "pingtung-sandimen":[22.7020, 120.6490],
  "pingtung-wutai":  [22.6360, 120.6990],
  "pingtung-majia":  [22.7360, 120.6320],
  "pingtung-fangliao":[22.3640, 120.5880],
  "pingtung-hengchun":[22.0010, 120.7440],
  "pingtung-kenting":[21.9460, 120.8020],
  // ── 宜蘭縣 ──
  "yilan-luodong":   [24.6770, 121.7670],
  "yilan-main":      [24.7570, 121.7540],
  "yilan-jiaoxi":    [24.8240, 121.7760],
  "yilan-toucheng":  [24.8680, 121.8260],
  "yilan-dongshan":  [24.6590, 121.7710],
  "yilan-suao":      [24.5980, 121.8560],
  "yilan-datong":    [24.6940, 121.6870],
  "yilan-nanao":     [24.5050, 121.8280],
  "yilan-yuanshan":  [24.7590, 121.7230],
  // ── 花蓮縣 ──
  "hualien-main":    [23.9769, 121.6044],
  "hualien-xiulin":  [24.1390, 121.6210],
  "hualien-xincheng":[24.1300, 121.6490],
  "hualien-fuyuan":  [23.8960, 121.5630],
  "hualien-guangfu": [23.6510, 121.4640],
  "hualien-ruisui":  [23.4980, 121.4200],
  "hualien-yuli":    [23.3380, 121.3080],
  "hualien-fuli":    [23.1660, 121.2870],
  "hualien-shoufeng":[23.9060, 121.5820],
  "hualien-fengbin": [23.6220, 121.5210],
  // ── 台東縣 ──
  "taitung-main":    [22.7583, 121.1444],
  "taitung-beinan":  [22.7060, 121.1190],
  "taitung-chenggong":[23.0970, 121.3760],
  "taitung-luye":    [22.9060, 121.1480],
  "taitung-chishang":[23.0960, 121.1910],
  "taitung-taimali": [22.5990, 121.0030],
  "taitung-dawu":    [22.3580, 120.9010],
  "taitung-lanyu":   [22.0460, 121.5490],
  "taitung-lyudao":  [22.6680, 121.4720],
  "taitung-yanping": [22.8870, 121.0780],
  // ── 澎湖縣 ──
  "penghu-main":     [23.5650, 119.5630],
  "penghu-xiyu":     [23.5750, 119.4440],
  "penghu-baisha":   [23.6380, 119.5690],
  "penghu-qimei":    [23.2130, 119.4260],
  "penghu-wangan":   [23.3580, 119.5020],
  "penghu-huayu":    [23.6790, 119.6310],
  // ── 金門縣 ──
  "kinmen-main":     [24.4490, 118.3760],
  "kinmen-jinhu":    [24.4340, 118.4140],
  "kinmen-jinsha":   [24.4700, 118.4380],
  "kinmen-lieyu":    [24.4390, 118.2970],
  "kinmen-jinning":  [24.4590, 118.3380],
  // ── 連江縣（馬祖）──
  "matsu-nangan":    [26.1600, 119.9490],
  "matsu-beigan":    [26.2280, 120.0020],
  "matsu-juguang":   [25.9780, 119.9150],
  "matsu-dongyin":   [26.3680, 120.4870],
  "matsu-qinbi":     [26.2350, 120.0060],
  // ── 其他 ──
  "xizhi-main":      [25.0640, 121.6560],
  "xindian-main":    [24.9640, 121.5380],
  "xindian-zhonghe": [24.9960, 121.4940],
};

// 五行顏色
const WX_COLOR: Record<string, string> = {
  wood:  "#4ade80",
  fire:  "#f87171",
  earth: "#fbbf24",
  metal: "#e2e8f0",
  water: "#60a5fa",
};

// 地形 emoji
const TERRAIN_ICON: Record<string, string> = {
  "都市廣場": "🏛️", "都市商業區": "🏙️", "都市森林": "🌳",
  "現代商業中心": "🏢", "山區": "⛰️", "海岸": "🌊",
  "古蹟": "🏯", "溫泉": "♨️", "港口": "⚓",
  "國家公園": "🏔️", "農村": "🌾", "漁村": "🎣",
  "工業區": "🏭", "科學園區": "🔬", "離島": "🏝️",
};

export interface LeafletMapHandle {
  flyToNode: (nodeId: string) => void;
  highlightNode: (nodeId: string) => void;
}

interface LeafletMapProps {
  nodes: MapNode[];
  currentNodeId: string;
  onNodeClick?: (nodeId: string) => void;
  /** 隱藏節點 ID 列表（體力足夠的玩家可看到發光） */
  hiddenNodeIds?: string[];
}

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap({ nodes, currentNodeId, onNodeClick, hiddenNodeIds = [] }, ref) {
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const markersRef = useRef<Map<string, ReturnType<typeof import("leaflet")["marker"]>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化地圖
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let L: typeof import("leaflet");
    import("leaflet").then((leaflet) => {
      L = leaflet.default ?? leaflet;

      // 修正 Leaflet 預設 icon 路徑問題
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // 建立地圖，初始對準台灣中心
      const map = L.map(containerRef.current!, {
        center: [23.8, 121.0],
        zoom: 8,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Dark Matter 底圖（最接近 CLAWMUD 風格）
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "© CartoDB",
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // 縮放控制（右下角）
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // 加入所有節點 Marker
      nodes.forEach((node) => {
        const coords = NODE_COORDS[node.id];
        if (!coords) return;

        const isCurrent = node.id === currentNodeId;
        const isHidden = hiddenNodeIds.includes(node.id);
        const color = WX_COLOR[node.element] ?? "#888";
        const terrainIcon = TERRAIN_ICON[node.terrain] ?? "📍";

        // 自訂 SVG 圖示
        const svgIcon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:${isCurrent ? 28 : isHidden ? 22 : 18}px;height:${isCurrent ? 28 : isHidden ? 22 : 18}px;">
              ${isCurrent ? `
                <div style="
                  position:absolute;inset:-8px;
                  border-radius:50%;
                  border:2px solid ${color};
                  animation:pulse 1.5s ease-in-out infinite;
                  opacity:0.5;
                "></div>
                <div style="
                  position:absolute;inset:-4px;
                  border-radius:50%;
                  border:1.5px solid ${color};
                  opacity:0.7;
                "></div>
              ` : ""}
              ${isHidden && !isCurrent ? `
                <div style="
                  position:absolute;inset:-10px;
                  border-radius:50%;
                  background:radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%);
                  animation:pulse 2s ease-in-out infinite;
                "></div>
                <div style="
                  position:absolute;inset:-5px;
                  border-radius:50%;
                  border:1.5px solid rgba(255,215,0,0.7);
                  animation:pulse 1.5s ease-in-out infinite;
                "></div>
              ` : ""}
              <div style="
                width:100%;height:100%;
                border-radius:50%;
                background:${isCurrent ? color : isHidden ? "rgba(255,215,0,0.85)" : color + "99"};
                border:${isCurrent ? "2.5px solid #fff" : isHidden ? "2px solid gold" : "1.5px solid " + color + "cc"};
                box-shadow:0 0 ${isCurrent ? "12px 4px" : isHidden ? "16px 6px rgba(255,215,0,0.8)" : "6px 2px"} ${isCurrent ? color + "88" : isHidden ? "rgba(255,215,0,0.6)" : color + "88"};
                display:flex;align-items:center;justify-content:center;
                font-size:${isCurrent ? "11px" : isHidden ? "10px" : "8px"};
                cursor:pointer;
              ">${isCurrent ? "★" : isHidden ? "✨" : ""}</div>
            </div>
          `,
          iconSize: [isCurrent ? 28 : isHidden ? 22 : 18, isCurrent ? 28 : isHidden ? 22 : 18],
          iconAnchor: [isCurrent ? 14 : isHidden ? 11 : 9, isCurrent ? 14 : isHidden ? 11 : 9],
        });

        const marker = L.marker(coords, { icon: svgIcon });

        // Popup 內容
        const isCurNode = node.id === currentNodeId;
        const popupHtml = `
          <div style="
            background:#0f1923;
            border:1px solid ${color}44;
            border-radius:10px;
            padding:12px 14px;
            min-width:180px;
            font-family:'Noto Serif TC',serif;
            color:#e2e8f0;
          ">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:18px;">${terrainIcon}</span>
              <div>
                <div style="font-size:14px;font-weight:700;color:#fff;">${node.name}</div>
                <div style="font-size:11px;color:${color};margin-top:1px;">${node.county}</div>
              </div>
            </div>
            <div style="font-size:11px;color:#94a3b8;line-height:1.5;margin-bottom:8px;">${node.description.slice(0, 60)}...</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
              <span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;padding:2px 6px;font-size:10px;">${node.terrain}</span>
              <span style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:2px 6px;font-size:10px;">危險 Lv.${node.dangerLevel}</span>
            </div>
            ${node.landmarks.length > 0 ? `
              <div style="font-size:10px;color:#64748b;border-top:1px solid rgba(255,255,255,0.07);padding-top:6px;margin-bottom:8px;">
                📍 ${node.landmarks.slice(0, 3).join(" · ")}
              </div>
            ` : ""}
            ${!isCurNode ? `
              <button
                data-node-id="${node.id}"
                class="oracle-teleport-btn"
                style="
                  width:100%;padding:7px 0;border-radius:8px;
                  background:linear-gradient(135deg,${color},${color}cc);
                  color:#000;font-weight:700;font-size:12px;
                  border:none;cursor:pointer;font-family:'Noto Serif TC',serif;
                ">
                🗺️ 前往此地
              </button>
            ` : `
              <div style="text-align:center;font-size:11px;color:${color};padding:4px 0;">★ 當前所在地</div>
            `}
          </div>
        `;

        marker.bindPopup(popupHtml, {
          maxWidth: 240,
          className: "oracle-popup",
        });

        // 監聽 popup 內的「前往此地」按鈕點擊
        marker.on("popupopen", () => {
          const popupEl = marker.getPopup()?.getElement();
          if (!popupEl) return;
          const btn = popupEl.querySelector(".oracle-teleport-btn") as HTMLButtonElement | null;
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation();
              const nodeId = btn.getAttribute("data-node-id");
              if (nodeId) {
                marker.closePopup();
                onNodeClick?.(nodeId);
              }
            };
          }
        });

        marker.on("click", () => {
          // 點擊 marker 時開啟 popup，不直接觸發傳送
          // 傳送由 popup 內的按鈕觸發
        });

        marker.addTo(map);
        markersRef.current.set(node.id, marker);
      });

      mapRef.current = map;

      // 飛到當前節點
      const currentCoords = NODE_COORDS[currentNodeId];
      if (currentCoords) {
        map.flyTo(currentCoords, 13, { duration: 1.5 });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 當 currentNodeId 改變時，飛到新位置並更新 Marker 樣式
  const prevNodeId = useRef(currentNodeId);
  useEffect(() => {
    if (!mapRef.current || prevNodeId.current === currentNodeId) return;
    prevNodeId.current = currentNodeId;

    const coords = NODE_COORDS[currentNodeId];
    if (coords) {
      mapRef.current.flyTo(coords, 14, { duration: 1.2 });
    }

    // 重新渲染所有 marker（更新當前節點的樣式）
    import("leaflet").then((leaflet) => {
      const L = leaflet.default ?? leaflet;
      markersRef.current.forEach((marker, nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const isCurrent = nodeId === currentNodeId;
        const isHiddenNode = hiddenNodeIds.includes(nodeId);
        const color = WX_COLOR[node.element] ?? "#888";
        const svgIcon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:${isCurrent ? 28 : isHiddenNode ? 22 : 18}px;height:${isCurrent ? 28 : isHiddenNode ? 22 : 18}px;">
              ${isCurrent ? `
                <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};animation:pulse 1.5s ease-in-out infinite;opacity:0.5;"></div>
                <div style="position:absolute;inset:-4px;border-radius:50%;border:1.5px solid ${color};opacity:0.7;"></div>
              ` : ""}
              ${isHiddenNode && !isCurrent ? `
                <div style="position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle, rgba(255,215,0,0.35) 0%, transparent 70%);animation:pulse 2s ease-in-out infinite;"></div>
                <div style="position:absolute;inset:-5px;border-radius:50%;border:1.5px solid rgba(255,215,0,0.7);animation:pulse 1.5s ease-in-out infinite;"></div>
              ` : ""}
              <div style="
                width:100%;height:100%;border-radius:50%;
                background:${isCurrent ? color : isHiddenNode ? "rgba(255,215,0,0.85)" : color + "99"};
                border:${isCurrent ? "2.5px solid #fff" : isHiddenNode ? "2px solid gold" : "1.5px solid " + color + "cc"};
                box-shadow:0 0 ${isCurrent ? "12px 4px" : isHiddenNode ? "16px 6px rgba(255,215,0,0.8)" : "6px 2px"} ${isCurrent ? color + "88" : isHiddenNode ? "rgba(255,215,0,0.6)" : color + "88"};
                display:flex;align-items:center;justify-content:center;
                font-size:${isCurrent ? "11px" : isHiddenNode ? "10px" : "8px"};cursor:pointer;
              ">${isCurrent ? "★" : isHiddenNode ? "✨" : ""}</div>
            </div>
          `,
          iconSize: [isCurrent ? 28 : isHiddenNode ? 22 : 18, isCurrent ? 28 : isHiddenNode ? 22 : 18],
          iconAnchor: [isCurrent ? 14 : isHiddenNode ? 11 : 9, isCurrent ? 14 : isHiddenNode ? 11 : 9],
        });
        marker.setIcon(svgIcon);
      });
    });
  }, [currentNodeId, nodes]);

  // 點擊節點時飛到該位置
  const flyToNode = useCallback((nodeId: string) => {
    const coords = NODE_COORDS[nodeId];
    if (coords && mapRef.current) {
      mapRef.current.flyTo(coords, 14, { duration: 1.2 });
    }
  }, []);

  // highlightNode：讓指定節點閃爍紫光（跟隨冒險者用）
  const highlightNode = useCallback((nodeId: string) => {
    flyToNode(nodeId);
    import("leaflet").then((leaflet) => {
      const L = leaflet.default ?? leaflet;
      const marker = markersRef.current.get(nodeId);
      if (!marker) return;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const pulseIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:40px;height:40px;">
            <div style="position:absolute;inset:-14px;border-radius:50%;border:2px solid #a855f7;animation:pulse 0.7s ease-in-out infinite;opacity:0.9;"></div>
            <div style="position:absolute;inset:-7px;border-radius:50%;border:2px solid #a855f7;animation:pulse 0.7s ease-in-out 0.15s infinite;opacity:0.7;"></div>
            <div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#a855f7,#7c3aed);border:3px solid #fff;box-shadow:0 0 24px 8px rgba(168,85,247,0.95);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;">★</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      marker.setIcon(pulseIcon);
      setTimeout(() => {
        const isCurrent = nodeId === currentNodeId;
        const color = (WX_COLOR as Record<string,string>)[node.element] ?? "#888";
        const normalIcon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:${isCurrent ? 28 : 18}px;height:${isCurrent ? 28 : 18}px;">
              ${isCurrent ? `<div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${color};animation:pulse 1.5s ease-in-out infinite;opacity:0.5;"></div>` : ""}
              <div style="width:100%;height:100%;border-radius:50%;background:${isCurrent ? color : color + "99"};border:${isCurrent ? "2.5px solid #fff" : "1.5px solid " + color + "cc"};box-shadow:0 0 ${isCurrent ? "12px 4px" : "6px 2px"} ${color}88;display:flex;align-items:center;justify-content:center;font-size:${isCurrent ? "11px" : "8px"};cursor:pointer;">${isCurrent ? "★" : ""}</div>
            </div>
          `,
          iconSize: [isCurrent ? 28 : 18, isCurrent ? 28 : 18],
          iconAnchor: [isCurrent ? 14 : 9, isCurrent ? 14 : 9],
        });
        marker.setIcon(normalIcon);
      }, 3500);
    });
  }, [flyToNode, nodes, currentNodeId]);

  // 暴露 flyToNode 和 highlightNode 給父元件
  useImperativeHandle(ref, () => ({ flyToNode, highlightNode }), [flyToNode, highlightNode]);

  // 暴露 flyToNode 給父元件（透過 ref 或 callback）
  useEffect(() => {
    // 當 onNodeClick 觸發時自動 flyTo
    const marker = markersRef.current.get(currentNodeId);
    if (marker) {
      flyToNode(currentNodeId);
    }
  }, [currentNodeId, flyToNode]);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      {/* 自訂 Popup 樣式 */}
      <style>{`
        .oracle-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .oracle-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .oracle-popup .leaflet-popup-tip-container {
          display: none !important;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.2; }
        }
        .leaflet-container {
          background: #0d1117 !important;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.1) !important;
          background: rgba(15,25,35,0.9) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(15,25,35,0.9) !important;
          color: #94a3b8 !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30,50,70,0.9) !important;
          color: #e2e8f0 !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: "300px" }}
      />
    </>
  );
});

export default LeafletMap;
