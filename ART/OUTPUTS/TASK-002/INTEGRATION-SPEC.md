# 天命共振 - 命格身份證分享卡整合規格書

## 1. 概述
本規格書定義了「命格身份證分享卡」的素材整合方式。分享卡採用**左圖右文**的橫排版設計（比例 4:3），以確保在手機端截圖分享時的視覺完整性。

## 2. 素材清單與路徑
所有塔羅牌插畫素材皆位於 `ART/OUTPUTS/TASK-002/tarot-cards/` 目錄下。

### 2.1 塔羅牌插畫 (22張)
- **格式**：PNG (不透明背景，自帶金色細線卡框)
- **尺寸**：1696 × 2528 px (比例 2:3)
- **命名規則**：`tarot-{編號}-{英文名}.png`
  - `tarot-00-fool.png` (愚者)
  - `tarot-01-magician.png` (魔術師)
  - `tarot-02-high-priestess.png` (女祭司)
  - `tarot-03-empress.png` (女皇)
  - `tarot-04-emperor.png` (皇帝)
  - `tarot-05-hierophant.png` (教皇)
  - `tarot-06-lovers.png` (戀人)
  - `tarot-07-chariot.png` (戰車)
  - `tarot-08-strength.png` (力量)
  - `tarot-09-hermit.png` (隱士)
  - `tarot-10-wheel.png` (命運之輪)
  - `tarot-11-justice.png` (正義)
  - `tarot-12-hanged-man.png` (倒吊人)
  - `tarot-13-death.png` (死神)
  - `tarot-14-temperance.png` (節制)
  - `tarot-15-devil.png` (惡魔)
  - `tarot-16-tower.png` (塔)
  - `tarot-17-star.png` (星星)
  - `tarot-18-moon.png` (月亮)
  - `tarot-19-sun.png` (太陽)
  - `tarot-20-judgement.png` (審判)
  - `tarot-21-world.png` (世界)

## 3. 前端整合建議 (供 System Agent 參考)

為了達到最佳的視覺效果，建議前端在渲染分享卡時採用以下 CSS 佈局：

### 3.1 整體容器 (Container)
- **比例**：4:3 (例如 `width: 800px; height: 600px;`)
- **背景**：建議使用深藍紫漸層背景，以呼應賽博少女風。
  - CSS 範例：`background: linear-gradient(135deg, #1A1A2A 0%, #2D1B4E 100%);`
- **佈局**：Flexbox 或 Grid，分為左右兩區塊。

### 3.2 左側：塔羅牌區 (Left Panel)
- **寬度佔比**：約 45% - 50%
- **內容**：動態載入對應的塔羅牌圖片。
- **樣式**：圖片應設定 `object-fit: contain;` 並加上適當的陰影 (Drop Shadow) 以增加立體感。
  - CSS 範例：`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);`

### 3.3 右側：資訊欄區 (Right Panel)
- **寬度佔比**：約 50% - 55%
- **背景**：玻璃擬態 (Glassmorphism) 效果。
  - CSS 範例：
    ```css
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    ```
- **文字配色**：
  - 主標題/品牌字：<span style="color:#C9A227; font-weight:bold;">天命金 (#C9A227)</span>
  - 內文/數據：白色 (#FFFFFF) 或淡玫瑰粉 (#E8D8F0)
- **排版**：使用 Flexbox 垂直排列各項資訊（姓名、生命靈數、塔羅原型等），並在各項目之間加入細緻的金色分隔線。

## 4. 協作流程
1. **System Agent** 根據用戶的命盤數據，判斷其對應的塔羅牌編號。
2. 從 `ART/OUTPUTS/TASK-002/tarot-cards/` 讀取對應的圖片。
3. 將圖片與用戶數據結合，透過前端 CSS 渲染出完整的分享卡。
4. 提供用戶一鍵截圖或下載的功能。
