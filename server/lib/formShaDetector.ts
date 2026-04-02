/**
 * 形煞識別引擎 (formShaDetector.ts)
 * ====================================
 * 使用 LLM 視覺分析辦公桌/租屋環境照片，
 * 識別常見形煞並提供窮人友善的化解方案。
 *
 * 核心原則：「形煞 > 理氣」
 * 形煞是物理環境的直接影響，優先級高於方位理氣。
 *
 * 形煞庫可透過後台 formShaLibrary 動態管理。
 */

import { invokeLLM } from '../_core/llm.js';

// ═══ 類型定義 ═══

/** 形煞優先級 */
export type ShaPriority = 'critical' | 'high' | 'medium' | 'low';

/** 形煞類型 */
export interface FormSha {
  id: string;
  name: string;
  description: string;
  priority: ShaPriority;
  category: 'office' | 'rental' | 'both';
  detection_keywords: string[];  // LLM 識別關鍵詞
  remedy: string;                // 化解方案
  remedy_items: string[];        // 化解物品
  enabled: boolean;              // 是否啟用（後台可控）
}

/** 形煞識別結果 */
export interface FormShaDetection {
  detected: boolean;
  shaId: string;
  shaName: string;
  priority: ShaPriority;
  confidence: number;       // 0-100 信心度
  description: string;
  location: string;         // 在照片中的位置描述
  remedy: string;
  remedyItems: string[];
  urgencyMessage: string;
}

/** 完整形煞分析報告 */
export interface FormShaReport {
  totalDetected: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  detections: FormShaDetection[];
  overallScore: number;      // 環境安全分數 0-100
  overallAdvice: string;
  prioritizedActions: string[];  // 按優先級排序的行動清單
}

// ═══ 預設形煞庫（辦公室/租屋族版） ═══

export const DEFAULT_FORM_SHA_LIBRARY: FormSha[] = [
  // === Critical 級 ===
  {
    id: 'sha_back_no_support',
    name: '背後無靠',
    description: '座位背後是走道、窗戶或空曠空間，沒有實牆或高背椅支撐',
    priority: 'critical',
    category: 'both',
    detection_keywords: ['背後空曠', '背對走道', '背對窗戶', '座位後方無牆'],
    remedy: '最簡單的方式是換一把高背辦公椅（椅背高過肩膀），或在椅背掛一件深色外套',
    remedy_items: ['高背辦公椅', '深色外套掛椅背', '靠墊'],
    enabled: true,
  },
  {
    id: 'sha_beam_press',
    name: '壓樑煞',
    description: '座位正上方有橫樑、管線、或低矮天花板結構壓迫',
    priority: 'critical',
    category: 'both',
    detection_keywords: ['頭頂橫樑', '天花板管線', '低矮壓迫', '樑柱正上方'],
    remedy: '將座位移開樑下至少30公分。無法移動時，在桌上放一盆向上生長的植物（如富貴竹）象徵頂住壓力',
    remedy_items: ['富貴竹', '向上生長的植物', '桌上小檯燈（光向上照）'],
    enabled: true,
  },

  // === High 級 ===
  {
    id: 'sha_wall_knife',
    name: '壁刀煞',
    description: '座位正對牆角、柱角、或隔板銳角，形成「刀」切向座位',
    priority: 'high',
    category: 'both',
    detection_keywords: ['牆角對座位', '柱角', '銳角', '隔板尖角'],
    remedy: '在尖角方向放一盆圓葉植物（如黃金葛）擋住銳角。或用圓形物品（圓形時鐘、圓形相框）化解',
    remedy_items: ['圓葉植物', '圓形相框', '圓形時鐘'],
    enabled: true,
  },
  {
    id: 'sha_door_rush',
    name: '門沖煞',
    description: '座位正對門口，門一開就直衝座位，氣流直沖',
    priority: 'high',
    category: 'both',
    detection_keywords: ['正對門口', '門直沖', '座位面對門', '走道直沖'],
    remedy: '在桌上放一個小屏風或文件架擋住直沖氣流。或放一盆較高的植物在桌角',
    remedy_items: ['桌上小屏風', '高文件架', '較高盆栽'],
    enabled: true,
  },
  {
    id: 'sha_mirror_reflect',
    name: '鏡煞',
    description: '座位附近有鏡子或高反光表面直接反射到座位',
    priority: 'high',
    category: 'both',
    detection_keywords: ['鏡子反射', '玻璃反光', '反射到座位', '鏡面對座位'],
    remedy: '用布或紙遮住反光面，或調整座位角度避開反射。辦公室可用霧面貼紙貼在反光處',
    remedy_items: ['霧面貼紙', '布簾遮擋', '調整座位角度'],
    enabled: true,
  },

  // === Medium 級 ===
  {
    id: 'sha_toilet_adjacent',
    name: '廁所相鄰',
    description: '座位緊鄰廁所門或廁所牆壁',
    priority: 'medium',
    category: 'both',
    detection_keywords: ['緊鄰廁所', '廁所門旁', '廁所牆壁'],
    remedy: '在靠近廁所的一側放綠色植物淨化氣場，桌上放一小碟粗鹽吸收穢氣（每週更換）',
    remedy_items: ['綠色植物', '粗鹽小碟', '空氣清新劑'],
    enabled: true,
  },
  {
    id: 'sha_clutter',
    name: '雜物堆積',
    description: '桌面或座位周圍堆滿雜物、文件、垃圾，氣場混亂',
    priority: 'medium',
    category: 'both',
    detection_keywords: ['雜物堆積', '桌面凌亂', '文件堆疊', '垃圾堆'],
    remedy: '每天下班前花5分鐘整理桌面。用文件架和收納盒歸類。丟掉不需要的東西',
    remedy_items: ['文件架', '收納盒', '垃圾桶'],
    enabled: true,
  },
  {
    id: 'sha_dark_corner',
    name: '陰暗角落',
    description: '座位在採光不足的角落，長期陰暗',
    priority: 'medium',
    category: 'both',
    detection_keywords: ['採光不足', '陰暗角落', '沒有窗戶', '光線昏暗'],
    remedy: '加一盞暖色桌燈補光。如果可以，在附近放一面小鏡子反射自然光',
    remedy_items: ['暖色桌燈', '小鏡子反射光線', 'LED 燈條'],
    enabled: true,
  },

  // === Low 級 ===
  {
    id: 'sha_sharp_plants',
    name: '尖葉植物',
    description: '桌上或附近有仙人掌、尖葉植物等帶刺植物',
    priority: 'low',
    category: 'both',
    detection_keywords: ['仙人掌', '尖葉', '帶刺植物', '尖銳植物'],
    remedy: '換成圓葉植物（黃金葛、綠蘿、多肉）。仙人掌可以放在窗台朝外，不要對著自己',
    remedy_items: ['圓葉植物替換', '將仙人掌移至窗台朝外'],
    enabled: true,
  },
  {
    id: 'sha_exposed_wires',
    name: '線路外露',
    description: '大量電線、網路線外露纏繞在桌面或腳下',
    priority: 'low',
    category: 'both',
    detection_keywords: ['電線外露', '線路纏繞', '電線雜亂'],
    remedy: '用束線帶或理線器整理。電線走桌面下方或牆邊，不要橫跨桌面',
    remedy_items: ['束線帶', '理線器', '線槽'],
    enabled: true,
  },
];

// ═══ 核心函數 ═══

/**
 * 使用 LLM 分析辦公環境照片中的形煞
 * @param imageUrl 照片 URL
 * @param shaLibrary 形煞庫（從後台讀取，或使用預設）
 * @param context 額外上下文（如：這是辦公桌/租屋房間）
 */
export async function detectFormSha(
  imageUrl: string,
  shaLibrary?: FormSha[],
  context?: string,
): Promise<FormShaReport> {
  const library = (shaLibrary || DEFAULT_FORM_SHA_LIBRARY).filter(s => s.enabled);

  // 建構 LLM Prompt
  const shaList = library.map(s =>
    `- ${s.name}（${s.priority}級）：${s.description}。關鍵詞：${s.detection_keywords.join('、')}`
  ).join('\n');

  const systemPrompt = `你是一位專業的風水形煞分析師，專門為辦公室上班族和租屋族提供實用的環境診斷。

你的任務是分析用戶提供的辦公環境或居住空間照片，識別其中的形煞問題。

## 重要原則
1. **形煞優先於理氣**：物理環境的直接影響（如壓樑、背後無靠）比方位理氣更重要
2. **務實建議**：所有化解方案必須是上班族/租屋族負擔得起的（不超過500元）
3. **不誇大**：只報告你有信心識別到的形煞，不要為了顯示專業而虛報
4. **安全第一**：如果看到嚴重的安全隱患（如結構問題），要特別標註

## 可識別的形煞清單
${shaList}

## 輸出格式
請以 JSON 格式回覆，包含以下結構：
{
  "detections": [
    {
      "shaId": "形煞ID",
      "confidence": 0-100,
      "location": "在照片中的位置描述",
      "specificAdvice": "針對這張照片的具體建議"
    }
  ],
  "overallScore": 0-100,
  "overallAdvice": "整體環境評語"
}

如果照片不清楚或無法判斷，請誠實說明。`;

  const userPrompt = context
    ? `請分析這張${context}的照片，識別其中的形煞問題：`
    : '請分析這張辦公環境照片，識別其中的形煞問題：';

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'form_sha_detection',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              detections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    shaId: { type: 'string' },
                    confidence: { type: 'number' },
                    location: { type: 'string' },
                    specificAdvice: { type: 'string' },
                  },
                  required: ['shaId', 'confidence', 'location', 'specificAdvice'],
                  additionalProperties: false,
                },
              },
              overallScore: { type: 'number' },
              overallAdvice: { type: 'string' },
            },
            required: ['detections', 'overallScore', 'overallAdvice'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return createEmptyReport('LLM 未返回有效結果');
    }

    const textContent = typeof content === 'string' ? content : '';
    const parsed = JSON.parse(textContent);
    return buildReport(parsed, library);
  } catch (error) {
    console.error('Form sha detection error:', error);
    return createEmptyReport('形煞分析暫時無法使用，請稍後再試');
  }
}

/**
 * 文字描述式形煞診斷（不需要照片）
 * 用於快速問答式辦公環境診斷
 */
export async function diagnoseByDescription(
  answers: Record<string, string>,
  shaLibrary?: FormSha[],
): Promise<FormShaReport> {
  const library = (shaLibrary || DEFAULT_FORM_SHA_LIBRARY).filter(s => s.enabled);

  const detections: FormShaDetection[] = [];

  // 根據問答結果匹配形煞
  const answerText = Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join('\n');

  // 背後無靠檢測
  if (answers['背後環境']?.includes('走道') || answers['背後環境']?.includes('窗戶') || answers['背後環境']?.includes('空曠')) {
    const sha = library.find(s => s.id === 'sha_back_no_support');
    if (sha) {
      detections.push(createDetection(sha, 90, '座位背後', sha.remedy));
    }
  }

  // 壓樑檢測
  if (answers['頭頂環境']?.includes('橫樑') || answers['頭頂環境']?.includes('管線')) {
    const sha = library.find(s => s.id === 'sha_beam_press');
    if (sha) {
      detections.push(createDetection(sha, 85, '座位上方', sha.remedy));
    }
  }

  // 門沖檢測
  if (answers['座位朝向']?.includes('對門') || answers['座位朝向']?.includes('正對走道')) {
    const sha = library.find(s => s.id === 'sha_door_rush');
    if (sha) {
      detections.push(createDetection(sha, 80, '座位前方', sha.remedy));
    }
  }

  // 鏡煞檢測
  if (answers['周圍環境']?.includes('鏡子') || answers['周圍環境']?.includes('玻璃反光')) {
    const sha = library.find(s => s.id === 'sha_mirror_reflect');
    if (sha) {
      detections.push(createDetection(sha, 75, '座位附近', sha.remedy));
    }
  }

  // 廁所相鄰
  if (answers['周圍環境']?.includes('廁所') || answers['周圍環境']?.includes('洗手間')) {
    const sha = library.find(s => s.id === 'sha_toilet_adjacent');
    if (sha) {
      detections.push(createDetection(sha, 80, '座位旁邊', sha.remedy));
    }
  }

  // 陰暗角落
  if (answers['採光情況']?.includes('不足') || answers['採光情況']?.includes('陰暗')) {
    const sha = library.find(s => s.id === 'sha_dark_corner');
    if (sha) {
      detections.push(createDetection(sha, 70, '整體環境', sha.remedy));
    }
  }

  // 雜物堆積
  if (answers['桌面狀況']?.includes('凌亂') || answers['桌面狀況']?.includes('堆滿')) {
    const sha = library.find(s => s.id === 'sha_clutter');
    if (sha) {
      detections.push(createDetection(sha, 75, '桌面', sha.remedy));
    }
  }

  return buildReportFromDetections(detections);
}

// ═══ 輔助函數 ═══

function createDetection(sha: FormSha, confidence: number, location: string, specificAdvice: string): FormShaDetection {
  const urgencyMap: Record<ShaPriority, string> = {
    'critical': '🚨 必須立即處理！這是最嚴重的形煞，直接影響你的工作效率和健康',
    'high': '⚠️ 建議盡快處理，這個形煞會持續消耗你的運勢',
    'medium': '📋 建議在一週內處理，改善工作環境品質',
    'low': '💡 有空時處理即可，屬於微調優化',
  };

  return {
    detected: true,
    shaId: sha.id,
    shaName: sha.name,
    priority: sha.priority,
    confidence,
    description: sha.description,
    location,
    remedy: specificAdvice || sha.remedy,
    remedyItems: sha.remedy_items,
    urgencyMessage: urgencyMap[sha.priority],
  };
}

function buildReport(parsed: any, library: FormSha[]): FormShaReport {
  const detections: FormShaDetection[] = [];

  for (const d of parsed.detections || []) {
    const sha = library.find(s => s.id === d.shaId);
    if (sha && d.confidence >= 40) {
      detections.push(createDetection(sha, d.confidence, d.location, d.specificAdvice));
    }
  }

  return buildReportFromDetections(detections, parsed.overallScore, parsed.overallAdvice);
}

function buildReportFromDetections(
  detections: FormShaDetection[],
  overallScore?: number,
  overallAdvice?: string,
): FormShaReport {
  const criticalCount = detections.filter(d => d.priority === 'critical').length;
  const highCount = detections.filter(d => d.priority === 'high').length;
  const mediumCount = detections.filter(d => d.priority === 'medium').length;
  const lowCount = detections.filter(d => d.priority === 'low').length;

  // 計算環境安全分數
  const score = overallScore ?? Math.max(0, 100 - criticalCount * 25 - highCount * 15 - mediumCount * 8 - lowCount * 3);

  // 按優先級排序行動清單
  const prioritizedActions = detections
    .sort((a, b) => {
      const order: Record<ShaPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    })
    .map((d, i) => `${i + 1}. 【${d.shaName}】${d.remedy}`);

  const advice = overallAdvice ?? (
    score >= 80 ? '你的辦公環境整體不錯！只需要做些微調就能更好' :
    score >= 60 ? '環境有幾個需要注意的地方，建議按優先級逐步改善' :
    score >= 40 ? '環境存在較多問題，建議優先處理 Critical 和 High 級別的形煞' :
    '環境問題較嚴重，強烈建議盡快處理最關鍵的形煞問題'
  );

  return {
    totalDetected: detections.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    detections,
    overallScore: score,
    overallAdvice: advice,
    prioritizedActions,
  };
}

function createEmptyReport(message: string): FormShaReport {
  return {
    totalDetected: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    detections: [],
    overallScore: -1,
    overallAdvice: message,
    prioritizedActions: [],
  };
}
