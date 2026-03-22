# TASK-002 分享卡功能（v1.2）— 任務狀態

> 任務追蹤文件
> 最後更新：2026/03/22 by Manus System Agent

---

## 任務狀態

| 環節 | 負責 | 狀態 | 最後更新 |
|------|------|------|----------|
| 需求確認 | ClawTeam（Boss） | ✅ 完成 | 2026/03/22 |
| DestinyShareCard 修正 | Manus System Agent | ✅ 完成 | 2026/03/22 |
| DivinationShareCard 建立 | Manus System Agent | ✅ 完成 | 2026/03/22 |
| OracleShareCard 建立 | Manus System Agent | ✅ 完成 | 2026/03/22 |
| vitest 測試 | Manus System Agent | ✅ 完成 | 2026/03/22 |
| Checkpoint 儲存 | Manus System Agent | ✅ 完成 | 2026/03/22 |

---

## 需求摘要（Boss 原始指令）

1. **DestinyShareCard 修正**
   - 左右兩邊應對稱，不是右邊資料高於左邊
   - 塔羅牌應抓取「主要靈魂數」（核心個性數 `primary.num`），而非其他數字

2. **DivinationShareCard（天命問卜結果分享卡）**
   - 放在天命問卜結果之後
   - 分享上面只要寫：本日流日能量什麼塔羅牌（以每日運勢呈現的塔羅牌為主）+ 結果

3. **OracleShareCard（擲筊結果分享卡）**
   - 放在擲筊結果後
   - 和命格分享卡不同，這邊的分享就是擲筊結果本身

---

## 完成項目詳細說明

### 1. DestinyShareCard.tsx 修正

| 修正項目 | 修正前 | 修正後 |
|----------|--------|--------|
| 左右高度 | 右側面板資料過多，高度超出左側 | 左右各固定 `height: '600px'`，完全對稱 |
| 塔羅牌號碼 | 使用 `primary.num`（已正確） | 確認使用 `primary.num`（主要靈魂數） |

### 2. DivinationShareCard.tsx（新建）

**元件位置：** `client/src/components/DivinationShareCard.tsx`

**設計規格：**
- 尺寸：800×600px（4:3 橫版）
- 左側 40%：命運指數圓環（SVG 動態圓弧）+ 流日塔羅牌號碼 + 大吉/吉/平/凶標籤
- 右側 60%：玻璃擬態面板，顯示問卜主題、問題、神諭摘要、命理上下文標籤
- 顏色：依命運指數動態切換（大吉綠/吉琥珀/平黃/小凶橙/凶紅）
- 匯出：html2canvas 渲染 PNG + Web Share API

**整合位置：** `TopicAdvicePanel.tsx` 問卜結果底部「📤 分享結果」按鈕

**後端修改：**
- `server/routers.ts` → `topicAdvice` context 加入 `tarotCardNumber` 欄位（原本只有 `tarotCard` 名稱字串）

**Props 介面：**
```typescript
interface DivinationShareCardProps {
  displayName: string;
  gender: 'male' | 'female' | 'other' | null | undefined;
  topicName: string;
  topicIcon: string;
  question?: string | null;
  fortuneIndex: number;
  fortuneLabel: string;
  oracle: string;
  coreReading: string;
  tarotCardNumber: number;
  tarotCardName: string;
  tarotKeywords: string[];
  dayPillar: string;
  moonPhase: string;
  dateString: string;
  onClose: () => void;
}
```

### 3. OracleShareCard.tsx（新建）

**元件位置：** `client/src/components/OracleShareCard.tsx`

**設計規格：**
- 尺寸：800×600px（4:3 橫版）
- 左側 40%：擲筊結果大圖示（聖杯🔴/笑杯🟤/陰杯⚫/立筊✨）+ 結果名稱 + 副標題
- 右側 60%：玻璃擬態面板，顯示用戶名稱、問題、結果說明、神諭詮釋、能量共鳴
- 顏色：依擲筊結果動態切換（聖杯紅/笑杯琥珀/陰杯灰/立筊金）
- 三聖杯確認時顯示特殊標籤
- 匯出：html2canvas 渲染 PNG + Web Share API

**整合位置：** `OracleCast.tsx` 擲筊結果底部「📤 分享擲筊結果」按鈕

**Props 介面：**
```typescript
interface OracleShareCardProps {
  displayName: string;
  result: 'sheng' | 'xiao' | 'yin' | 'li';
  query: string;
  interpretation: string;
  energyResonance: string;
  dateString: string;
  isTripleConfirmed?: boolean;
  onClose: () => void;
}
```

---

## 測試報告

**測試檔案：** `server/shareCards.test.ts`

| 測試群組 | 測試數 | 狀態 |
|----------|--------|------|
| DivinationShareCard - 命運指數顏色 | 5 | ✅ |
| DivinationShareCard - 命運標籤樣式 | 5 | ✅ |
| OracleShareCard - 擲筊結果配置 | 5 | ✅ |
| 分享卡 - 文字截斷邏輯 | 4 | ✅ |
| DestinyShareCard - 主題選擇邏輯 | 7 | ✅ |
| DestinyShareCard - 塔羅牌號碼顯示 | 3 | ✅ |
| **小計** | **30** | **✅ 全部通過** |

**全站測試：** 414 項全部通過（TypeScript 零錯誤）

---

## Checkpoint 資訊

| 項目 | 值 |
|------|-----|
| Checkpoint 版本 | `2e84ca22` |
| 儲存時間 | 2026/03/22 |
| 部署網址 | https://oracleres.com |
| 測試數量 | 414 項全部通過 |

---

## 可調用 API 說明（供其他 Agent 參考）

### topicAdvice context 欄位（v1.2 新增）

```typescript
context: {
  dayPillar: string;       // 流日干支（如 "壬戌"）
  monthPillar: string;     // 流月干支
  yearPillar: string;      // 流年干支
  hourBranch: string;      // 當前時辰地支
  tenGod: string;          // 主要十神
  overallScore: number;    // 能量分數
  tarotCard: string;       // 塔羅牌名稱（如 "教皇"）
  tarotCardNumber: number; // 塔羅牌號碼（v1.2 新增，如 5）
  tarotKeywords: string[]; // 塔羅關鍵詞
  moonPhase: string;       // 月相名稱
  moonLunarDay: number;    // 農曆日
  dominantElement: string; // 主導五行
  weakestElement: string;  // 最弱五行
  favorableElements: string[];   // 用神五行
  unfavorableElements: string[]; // 忌神五行
  dayMasterStem: string;   // 日主天干
  dayMasterElement: string; // 日主五行
}
```

---

*本檔案由 Manus System Agent 建立，供所有 Agent 同步狀態使用*
