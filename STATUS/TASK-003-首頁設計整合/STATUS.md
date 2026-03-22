# TASK-003：首頁設計整合 + 分享卡功能擴充

**狀態**：✅ 完成  
**完成日期**：2026-03-22  
**版本號**：ae7c8ed4  
**執行 Agent**：Manus 主要開發 Agent

---

## 任務概述

本次任務包含兩大部分：

1. **分享卡功能擴充（v1.2）**：新增天命問卜結果分享卡與擲筊結果分享卡
2. **首頁設計整合（v1.3）**：對齊排程 Agent 設計稿，全面升級 LandingPage 視覺效果

---

## 完成項目

### 分享卡功能擴充（v1.2）

| 項目 | 狀態 | 說明 |
|------|------|------|
| DestinyShareCard 左右對稱修正 | ✅ | 兩欄高度統一為 600px |
| DestinyShareCard 塔羅牌邏輯修正 | ✅ | 改用主要靈魂數（核心個性數 `primary.num`）而非流日塔羅 |
| DivinationShareCard.tsx 新建 | ✅ | 天命問卜結果 + 流日塔羅牌分享卡 |
| TopicAdvicePanel 整合分享按鈕 | ✅ | 問卜結果底部加入「分享問卜結果」按鈕 |
| OracleShareCard.tsx 新建 | ✅ | 擲筊結果（聖杯/笑杯/陰杯）分享卡 |
| OracleCast 整合分享按鈕 | ✅ | 擲筊結果底部加入「分享擲筊結果」按鈕 |
| shareCards.test.ts | ✅ | 30 項測試全部通過，總計 414 項 |

### 分享卡設計規格

**DivinationShareCard（天命問卜）**：
- 顯示主題（工作/愛情/健康/財運/決策）
- 顯示流日塔羅牌（卡號 + 牌名 + 關鍵詞）
- 顯示問卜結果摘要（前 120 字）
- 顯示日期與品牌標識
- 支援 html2canvas 匯出 PNG + Web Share API

**OracleShareCard（擲筊結果）**：
- 顯示擲筊結果（聖杯/笑杯/陰杯）
- 顯示問題文字
- 顯示神諭解讀摘要（前 100 字）
- 顯示當日能量等級
- 支援 html2canvas 匯出 PNG + Web Share API

---

### 首頁設計整合（v1.3）

對齊參考設計：https://destinyweb-svfigzte.manus.space/

| 項目 | 狀態 | 說明 |
|------|------|------|
| text-holographic CSS 類別 | ✅ | 全息漸層動效文字（holographic-shift keyframe） |
| text-gold-gradient CSS 類別 | ✅ | 金色漸層文字 |
| gold-pulse CSS 類別 | ✅ | 金色脈衝發光動效（2s 循環） |
| orb-float CSS 類別 | ✅ | 光球漂浮動效（6s 循環） |
| animate-slide-up CSS 類別 | ✅ | 滑入動效 |
| animate-fade-in CSS 類別 | ✅ | 淡入動效 |
| ripple-expand keyframe | ✅ | 波紋擴散動效 |
| glass-card hover 金光效果 | ✅ | hover 時 translateY(-4px) + gold glow |
| Hero 布局居中 | ✅ | flex-col lg:flex-row，命盤光球在右側 |
| 主標題全息動效 | ✅ | 「解讀天命」使用 text-holographic |
| 導覽列 fixed + 背景模糊 | ✅ | fixed top-0 + backdrop-blur-xl + rgba(13,27,46,0.85) |
| 命盤光球 ripple 波紋 | ✅ | 3 層波紋環，各有不同延遲和速度 |
| CTA 按鈕 gold-pulse 動效 | ✅ | 「立即覺醒元神」按鈕有金色脈衝 |
| Stats 數值更新 | ✅ | 4,019+ / 78% / 293 / 9 |
| Logo 文字 text-gold-gradient | ✅ | 導覽列「天命共振」改為金色漸層 |
| 日夜切換按鈕 | ✅ | Sun/Moon icon 切換 |
| 星星粒子原生 Canvas | ✅ | 不依賴外部元件，120 顆星星閃爍動效 |
| glass-card 重複定義修正 | ✅ | 整合三個定義為一個，避免 CSS 衝突 |

---

## 技術細節

### 新增 CSS 動畫（index.css）

```css
@keyframes holographic-shift { /* 全息漸層位移 4s */ }
@keyframes gold-pulse-anim { /* 金色脈衝發光 2s */ }
@keyframes orb-float-anim { /* 光球漂浮 6s */ }
@keyframes ripple-expand { /* 波紋擴散 */ }
@keyframes slide-up { /* 滑入 0.7s */ }
@keyframes fade-in-anim { /* 淡入 0.5s */ }
```

### 後端修改

- `server/routers.ts`：`topicAdvice` context 加入 `tarotCardNumber` 欄位（供 DivinationShareCard 使用）

### 前端修改

- `client/src/components/DivinationShareCard.tsx`（新建）
- `client/src/components/OracleShareCard.tsx`（新建）
- `client/src/components/TopicAdvicePanel.tsx`（加入分享按鈕）
- `client/src/pages/OracleCast.tsx`（加入分享按鈕）
- `client/src/pages/LandingPage.tsx`（全面重設計）
- `client/src/index.css`（新增動畫類別 + glass-card 整合）

---

## 測試結果

```
Test Suites: 全部通過
Tests: 414 項全部通過
TypeScript: 零錯誤
```

---

## 其他團隊調用說明

### DivinationShareCard Props

```typescript
interface DivinationShareCardProps {
  topic: string;           // 主題（工作/愛情/健康/財運/決策）
  result: string;          // 問卜結果文字
  tarotCardNumber: number; // 流日塔羅牌號碼（0-22）
  tarotCardName: string;   // 流日塔羅牌名稱
  tarotKeywords: string[]; // 塔羅牌關鍵詞
  date?: string;           // 日期（預設今日）
  onClose: () => void;
}
```

### OracleShareCard Props

```typescript
interface OracleShareCardProps {
  result: 'holy' | 'laugh' | 'yin'; // 擲筊結果
  question: string;                  // 問題
  interpretation: string;            // 神諭解讀
  energyLevel?: string;              // 當日能量等級
  date?: string;
  onClose: () => void;
}
```

---

## 下一步建議

1. 測試 LandingPage 在未登入狀態下的實際效果（需在瀏覽器無痕模式訪問）
2. 確認分享卡在手機上的 Web Share API 是否正常運作
3. 考慮在 DivinationShareCard 加入用戶名稱顯示
