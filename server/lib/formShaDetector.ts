/**
 * formShaDetector.ts
 * 形煞識別引擎：
 * 1. LLM 視覺分析（照片）
 * 2. 問答診斷（規則匹配 + LLM 補充分析）
 */
import { invokeLLM } from "../_core/llm";

// ─── 型別定義 ───

export type ShaPriority = 'critical' | 'high' | 'medium' | 'low';

export interface FormSha {
  id: string;
  name: string;
  description: string;
  priority: ShaPriority;
  detection_keywords: string[];
  remedy: string;
  remedy_items: string[];
  enabled: boolean;
}

export interface FormShaDetection {
  detected: boolean;
  shaId: string;
  shaName: string;
  priority: ShaPriority;
  confidence: number;
  description: string;
  location: string;
  remedy: string;
  remedyItems: string[];
  urgencyMessage: string;
}

export interface FormShaReport {
  detections: FormShaDetection[];
  overallScore: number;
  overallAdvice: string;
  prioritizedActions: string[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

// ─── 預設形煞庫 ───

export const DEFAULT_FORM_SHA_LIBRARY: FormSha[] = [
  {
    id: 'sha_back_no_support',
    name: '背後無靠',
    description: '座位背後是走道、窗戶或空曠區域，沒有實牆支撐，容易感到不安全、被人從背後打擾',
    priority: 'high',
    detection_keywords: ['背後走道', '背後窗戶', '背後空曠', '無靠山', '背後通道'],
    remedy: '最好的解決方式是換到有實牆的座位。如果無法換位，可以在椅背放一件深色外套，或在背後放一個較高的書架/收納架，製造「靠山」效果。',
    remedy_items: ['高背辦公椅', '深色外套（掛椅背）', '靠墊（椅背用）'],
    enabled: true,
  },
  {
    id: 'sha_beam_press',
    name: '頭頂壓樑',
    description: '座位正上方有橫樑或管線，長期在壓迫感下工作，容易頭痛、思路不清',
    priority: 'high',
    detection_keywords: ['橫樑壓頂', '管線頭頂', '天花板橫樑', '頭頂管線'],
    remedy: '最好的解決方式是移動座位，避開橫樑正下方。如果無法移動，可以在桌上放一盆向上生長的植物（如富貴竹），視覺上化解壓迫感。',
    remedy_items: ['富貴竹（水培）', '暖色桌燈（LED）'],
    enabled: true,
  },
  {
    id: 'sha_door_rush',
    name: '門沖座位',
    description: '座位正對門口，門一開就直衝座位，容易分心、被打擾，也容易有緊張感',
    priority: 'high',
    detection_keywords: ['正對門口', '門直沖', '座位面對門', '走道直沖'],
    remedy: '在桌上放一個較高的文件架或小屏風，擋住門口直射的氣流。或者在座位旁邊放一盆植物，轉移氣流方向。',
    remedy_items: ['桌上小屏風（文件架）', '黃金葛（盆栽）'],
    enabled: true,
  },
  {
    id: 'sha_wall_knife',
    name: '尖角對沖',
    description: '附近有柱子角、牆角或桌角對著你，長期在尖銳物件的指向下工作，容易感到壓力',
    priority: 'medium',
    detection_keywords: ['尖角對著', '柱子角', '牆角', '桌角對沖'],
    remedy: '在尖角位置放一盆圓葉植物（如黃金葛），或用圓形物品（水晶球、圓形相框）擋住尖角的方向。',
    remedy_items: ['黃金葛（盆栽）', '水晶球（小型）', '圓形相框（家人照片）'],
    enabled: true,
  },
  {
    id: 'sha_mirror_reflect',
    name: '鏡面反射',
    description: '座位附近有大面積鏡子或玻璃反光，容易造成視覺干擾和注意力分散',
    priority: 'medium',
    detection_keywords: ['鏡子反射', '玻璃反光', '鏡面對著', '反光面'],
    remedy: '用霧面貼紙貼在反光的玻璃或鏡面上，消除反射。或者在鏡子前放植物遮擋。',
    remedy_items: ['霧面貼紙（玻璃用）', '黃金葛（盆栽）'],
    enabled: true,
  },
  {
    id: 'sha_toilet_adjacent',
    name: '廁所相鄰',
    description: '座位緊鄰廁所門或廁所牆壁，氣味和濕氣影響工作環境',
    priority: 'medium',
    detection_keywords: ['緊鄰廁所', '廁所門旁', '廁所牆壁', '洗手間旁'],
    remedy: '在靠近廁所的一側放一碟粗鹽（每週更換），或放一盆植物吸收濕氣。保持廁所門常關。',
    remedy_items: ['粗鹽小碟（天然海鹽）', '綠蘿（吊盆）', '空氣清新劑（天然植物萃取）'],
    enabled: true,
  },
  {
    id: 'sha_dark_corner',
    name: '採光不足',
    description: '座位所在區域光線昏暗，長期在陰暗環境工作容易情緒低落、效率下降',
    priority: 'medium',
    detection_keywords: ['採光不足', '陰暗角落', '光線昏暗', '沒有窗戶'],
    remedy: '在桌上加一盞暖色桌燈（色溫3000K左右），或在桌底貼LED燈條補光。選擇暖黃色光，讓工作環境更有活力。',
    remedy_items: ['暖色桌燈（LED）', 'LED 燈條（暖白）'],
    enabled: true,
  },
  {
    id: 'sha_clutter',
    name: '桌面雜亂',
    description: '桌面或工作區域堆滿雜物，凌亂的環境會影響思路清晰度和工作效率',
    priority: 'low',
    detection_keywords: ['桌面凌亂', '雜物堆積', '文件堆疊', '桌面混亂'],
    remedy: '用收納盒整理桌面雜物，只留當天需要用的東西在桌上。養成每天下班前整理桌面的習慣。',
    remedy_items: ['木質桌上收納架', '白色收納盒（金屬/塑膠）', '垃圾桶（桌邊）'],
    enabled: true,
  },
  {
    id: 'sha_exposed_wires',
    name: '電線外露',
    description: '桌面下方或周圍有大量外露電線，雜亂的線路影響環境整潔感',
    priority: 'low',
    detection_keywords: ['電線外露', '線路雜亂', '電線纏繞', '充電線散落'],
    remedy: '用束線帶或線槽整理電線，讓桌面下方整潔。',
    remedy_items: ['束線帶（理線器）', '線槽（電線整理）'],
    enabled: true,
  },
  {
    id: 'sha_sharp_plants',
    name: '尖刺植物朝內',
    description: '仙人掌或其他有尖刺的植物放在座位旁邊且尖刺朝向自己',
    priority: 'low',
    detection_keywords: ['仙人掌朝內', '尖刺植物', '仙人掌對著'],
    remedy: '把仙人掌移到窗台，讓尖刺朝外而不是朝向自己。',
    remedy_items: ['仙人掌移位（移到窗台朝外）'],
    enabled: true,
  },
];

// ─── LLM 照片分析 ───

/**
 * 用 LLM 分析辦公環境照片，識別形煞問題
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
    `- ${s.name}：${s.description}。關鍵詞：${s.detection_keywords.join('、')}`
  ).join('\n');

  const systemPrompt = `你是一位專門幫助上班族和租屋族改善居住和工作環境的專家。

你的任務是分析用戶提供的照片，找出環境中可能影響工作效率和心情的問題，並給出實用的改善建議。

## 重要原則
1. **物理環境優先**：直接看得到的環境問題（如壓樑、背後無靠）比方位分析更重要
2. **務實建議**：所有改善建議必須是一般上班族和租屋族負擔得起的（不超過500元）
3. **誠實分析**：只報告你有把握識別到的問題，不要為了顯示專業而虛報
4. **安全第一**：如果看到嚴重的安全隱患（如結構問題），要特別標註
5. **不要用專業術語**：用一般人看得懂的語言解釋，不要用「八宅明鏡」、「玄空飛星」等專業術語

## 可識別的環境問題清單
${shaList}

## 輸出格式
請以 JSON 格式回覆，包含以下結構：
{
  "detections": [
    {
      "shaId": "問題ID",
      "confidence": 0-100,
      "location": "在照片中的位置描述",
      "specificAdvice": "針對這張照片的具體改善建議"
    }
  ],
  "overallScore": 0-100,
  "overallAdvice": "整體環境評語"
}

如果照片不清楚或無法判斷，請誠實說明。`;

  const userPrompt = context
    ? `請分析這張${context}的照片，識別其中的環境問題：`
    : '請分析這張辦公環境照片，識別其中的環境問題：';

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt + '\n\n' + userPrompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' } as any,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return buildReport(parsed, library);
  } catch (e) {
    console.error('Form sha detection failed:', e);
    return buildReportFromDetections([]);
  }
}

// ─── 問答診斷 ───

/**
 * 根據問答結果診斷形煞
 * 支援新版 key（back_support, door_position 等）和舊版 key（背後環境, 座位朝向 等）
 */
export async function diagnoseByDescription(
  answers: Record<string, string>,
  shaLibrary?: FormSha[],
): Promise<FormShaReport> {
  const library = (shaLibrary || DEFAULT_FORM_SHA_LIBRARY).filter(s => s.enabled);
  const detections: FormShaDetection[] = [];

  // 背後無靠檢測（back_support 或 背後環境）
  const backAnswer = answers['back_support'] || answers['背後環境'] || '';
  if (backAnswer.includes('走道') || backAnswer.includes('通道') || backAnswer.includes('窗戶') || backAnswer.includes('空曠')) {
    const sha = library.find(s => s.id === 'sha_back_no_support');
    if (sha) detections.push(createDetection(sha, 90, '座位背後', sha.remedy));
  }

  // 門的方位檢測（door_position）— 這是核心判斷依據
  const doorAnswer = answers['door_position'] || answers['座位朝向'] || '';
  if (doorAnswer.includes('正前方')) {
    // 門在正前方：最嚴重的門沖
    const sha = library.find(s => s.id === 'sha_door_rush');
    if (sha) detections.push(createDetection(sha, 90, '門在座位正前方，氣流直衝', sha.remedy));
  } else if (doorAnswer.includes('正後方')) {
    // 門在背後：背後無靠且容易被驚到
    const sha = library.find(s => s.id === 'sha_back_no_support');
    if (sha && !detections.find(d => d.shaId === 'sha_back_no_support')) {
      detections.push(createDetection(sha, 85, '門在背後，容易被突然進入的人嚇到，也無法掌握進出情況', sha.remedy));
    }
  } else if (doorAnswer.includes('左前方') || doorAnswer.includes('右前方')) {
    // 門在斜前方：輕度門沖
    const sha = library.find(s => s.id === 'sha_door_rush');
    if (sha) detections.push(createDetection(sha, 60, '門在斜前方，氣流對座位有一定影響', sha.remedy));
  }

  // 頭頂壓樑檢測（above_head 或 頭頂環境）
  const aboveAnswer = answers['above_head'] || answers['頭頂環境'] || '';
  if (aboveAnswer.includes('橫樑') || aboveAnswer.includes('管線') || aboveAnswer.includes('風管')) {
    const sha = library.find(s => s.id === 'sha_beam_press');
    if (sha) detections.push(createDetection(sha, 85, '座位上方', sha.remedy));
  }

  // 桌面朝向檢測（desk_facing）
  const facingAnswer = answers['desk_facing'] || '';
  if (facingAnswer.includes('門口') || facingAnswer.includes('走道')) {
    const sha = library.find(s => s.id === 'sha_door_rush');
    if (sha && !detections.find(d => d.shaId === 'sha_door_rush')) {
      detections.push(createDetection(sha, 75, '桌面正對門口或走道', sha.remedy));
    }
  }

  // 尖角檢測（sharp_corners）
  const sharpAnswer = answers['sharp_corners'] || '';
  if (sharpAnswer.includes('有，在前方') || sharpAnswer.includes('有，在側面')) {
    const sha = library.find(s => s.id === 'sha_wall_knife');
    if (sha) detections.push(createDetection(sha, 80, '座位附近有尖角', sha.remedy));
  }

  // 植物狀態檢測（plants）
  const plantsAnswer = answers['plants'] || '';
  if (plantsAnswer.includes('枯萎')) {
    const sha = library.find(s => s.id === 'sha_sharp_plants');
    if (sha) detections.push(createDetection(sha, 70, '桌上有枯萎植物', '將枯萎植物移除或替換成健康的植物，枯萎的植物會帶來負面能量'));
  }

  // 採光檢測（舊版 key）
  const lightAnswer = answers['採光情況'] || '';
  if (lightAnswer.includes('不足') || lightAnswer.includes('陰暗')) {
    const sha = library.find(s => s.id === 'sha_dark_corner');
    if (sha) detections.push(createDetection(sha, 70, '整體環境', sha.remedy));
  }

  // 桌面狀況檢測（舊版 key）
  const deskAnswer = answers['桌面狀況'] || '';
  if (deskAnswer.includes('凌亂') || deskAnswer.includes('堆滿')) {
    const sha = library.find(s => s.id === 'sha_clutter');
    if (sha) detections.push(createDetection(sha, 75, '桌面', sha.remedy));
  }

  // 如果規則匹配沒有找到任何問題，用 LLM 做更深入分析
  if (detections.length === 0) {
    return await diagnoseWithLLM(answers, library);
  }

  return buildReportFromDetections(detections);
}

/** 用 LLM 做全面分析（當規則匹配無結果時） */
async function diagnoseWithLLM(
  answers: Record<string, string>,
  library: FormSha[],
): Promise<FormShaReport> {
  const labelMap: Record<string, string> = {
    'back_support': '座位背後',
    'door_position': '門的方位',
    'above_head': '頭頂上方',
    'desk_facing': '桌面朝向',
    'left_side': '左手邊',
    'right_side': '右手邊',
    'sharp_corners': '尖角情況',
    'plants': '植物狀態',
  };
  const answerText = Object.entries(answers).map(([q, a]) => {
    return `${labelMap[q] || q}: ${a}`;
  }).join('\n');

  const shaList = library.map(s =>
    `- ID: ${s.id}\n  問題名稱: ${s.name}\n  描述: ${s.description}`
  ).join('\n');

  const systemPrompt = `你是一位幫助上班族改善工作環境的專家。
根據用戶回答的問卷，分析座位環境問題。

可識別的環境問題：
${shaList}

重要原則：
1. 用一般人看得懂的語言，不要用專業術語
2. 建議必須是負擔得起的（500元內）
3. 如果環境很好，誠實說明即可

請以 JSON 格式回覆：
{
  "detections": [{"shaId": "ID", "confidence": 0-100, "location": "位置", "specificAdvice": "建議"}],
  "overallScore": 0-100,
  "overallAdvice": "整體評語"
}`;

  const userPrompt = `用戶的座位環境問答：\n${answerText}\n\n請分析這個座位環境的優化建議。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' } as any,
    });
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return buildReport(parsed, library);
  } catch (e) {
    console.error('LLM diagnose failed:', e);
    return buildReportFromDetections([]);
  }
}

// ═══ 輔助函數 ═══

function createDetection(sha: FormSha, confidence: number, location: string, specificAdvice: string): FormShaDetection {
  const urgencyMap: Record<ShaPriority, string> = {
    'critical': '必須立即處理！這個問題直接影響你的工作效率和健康',
    'high': '建議盡快處理，這個問題會持續影響你的工作狀態',
    'medium': '建議在一週內處理，改善工作環境品質',
    'low': '有空時處理即可，屬於微調優化',
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
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    })
    .map(d => `${d.urgencyMessage}：${d.remedy}`);

  // 生成整體建議
  let advice = overallAdvice;
  if (!advice) {
    if (criticalCount > 0) {
      advice = `你的辦公環境有 ${criticalCount} 個需要立即處理的問題，建議盡快改善。`;
    } else if (highCount > 0) {
      advice = `你的辦公環境有幾個值得改善的地方，處理後工作效率和心情都會有明顯提升。`;
    } else if (mediumCount + lowCount > 0) {
      advice = `你的辦公環境整體不錯！只需要做些微調就能更好。`;
    } else {
      advice = `你的辦公環境很好！目前沒有發現明顯的問題，繼續保持。`;
    }
  }

  return {
    detections,
    overallScore: score,
    overallAdvice: advice,
    prioritizedActions,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  };
}
