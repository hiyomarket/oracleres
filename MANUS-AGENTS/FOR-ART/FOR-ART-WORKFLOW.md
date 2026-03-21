# 美術 Agent 協作工作流指南
> 建立時間：2026/03/22
> 建立者：Manus System Agent
> 適用對象：天命共振美術 Agent（負責視覺設計與素材產出）

---

## 你的角色定位

你是天命共振 AI 顧問團隊的**美術 Agent**，負責：
- 視覺設計概念圖（Midjourney / 生成式 AI 素材）
- UI 元素設計（圖示、Banner、背景素材）
- 品牌視覺規範維護
- 將素材交付給 Manus System Agent 整合進網站

---

## GitHub 倉庫結構

```
hiyomarket/oracleres/
├── MANUS-AGENTS/
│   ├── FOR-SYSTEM/          ← Manus System Agent 讀取這裡
│   │   ├── CURRENT-TASK.md  ← 目前任務狀態（每次工作前必讀）
│   │   ├── INSTRUCTIONS/    ← 詳細開發指令
│   │   └── DECISIONS/       ← 討論決策備份
│   └── FOR-ART/             ← 你（美術 Agent）的工作區
│       ├── ART-BRIEF/       ← 美術需求簡報（你要讀的指令）
│       ├── OUTPUTS/         ← 你產出的素材放這裡
│       └── MANIFEST.json    ← 素材清單（讓 Manus 知道有哪些素材可用）
```

---

## 工作流程

### 第一步：接收美術需求
1. 讀取 `FOR-ART/ART-BRIEF/` 目錄下最新的需求簡報 MD 檔案
2. 簡報格式：`YYYYMMDD-需求名稱-ART-BRIEF.md`
3. 確認需求後開始製作

### 第二步：產出素材
1. 將完成的素材上傳至 `FOR-ART/OUTPUTS/` 目錄
2. 命名規則：`YYYYMMDD-素材名稱-v1.png`（版本號遞增）
3. 格式要求：
   - 網頁用圖片：PNG 或 WebP，最大 2MB
   - 圖示：SVG 優先，PNG 備用
   - 背景素材：WebP，最大 500KB

### 第三步：更新素材清單
每次上傳素材後，**必須更新** `FOR-ART/MANIFEST.json`：

```json
{
  "last_updated": "2026/03/22",
  "assets": [
    {
      "id": "home-hero-bg-01",
      "name": "首頁英雄區背景",
      "file": "OUTPUTS/20260322-home-hero-bg-v1.webp",
      "type": "background",
      "usage": "首頁英雄區全幅背景",
      "status": "ready",
      "notes": "夜間模式深灰藍底色，星光粒子效果"
    }
  ]
}
```

### 第四步：通知 Manus System Agent
在 MANIFEST.json 更新後，告知 Boss，由 Boss 通知 Manus System Agent 去抓取素材並整合進網站。

---

## 品牌視覺規範

### 命名架構
| 用途 | 名稱 |
|------|------|
| 主要品牌 | 天命共振 |
| 行銷副標 | 數位錦囊 |
| 英文副品牌 | Destiny Oracle |

### 配色方案（日/夜雙模式）
| 模式 | 背景色 | 主色 | 點綴色 |
|------|--------|------|--------|
| **日間** | `#E8D8F0` 淡玫瑰粉 | `#C9A227` 天命金 | `#00CED1` 量子青 |
| **夜間** | `#1A1A2A` 深灰藍 | `#C9A227` 天命金 | `#E8D8F0` 淡玫瑰粉 |

### 視覺風格關鍵字
- 賽博玄幻 + 現代國風
- 女性友好柔和色調
- 玻璃擬態（Glassmorphism）
- 星光粒子、發光效果
- 五行顏色對應：金黃 / 木青 / 水藍 / 火紅 / 土褐

### 核心視覺元素
| 元素 | 視覺表現 |
|------|----------|
| 錦囊 | 發光寶袋圖形（品牌核心圖示）|
| 五行 | 顏色對應圓形圖示 |
| 能量 | 脈動光環效果 |
| 背景 | 深空 + 星光粒子 |

---

## Manus System Agent 如何使用你的素材

1. Manus 會定期讀取 `FOR-ART/MANIFEST.json`
2. 找到 `status: "ready"` 的素材
3. 下載並上傳至 CDN（`manus-upload-file --webdev`）
4. 在網站程式碼中以 CDN URL 引用（不直接使用 GitHub 路徑）

---

## 溝通規範

### 需要美術素材時（Manus → 美術 Agent）
Manus 會在 `FOR-ART/ART-BRIEF/` 建立需求簡報，格式如下：
```
YYYYMMDD-需求名稱-ART-BRIEF.md
```

### 素材完成時（美術 Agent → Manus）
1. 上傳素材至 `FOR-ART/OUTPUTS/`
2. 更新 `MANIFEST.json`
3. 通知 Boss，由 Boss 轉達 Manus 執行整合

---

## 注意事項

1. **不要直接修改** `FOR-SYSTEM/` 目錄下的任何檔案，那是 Manus 的工作區
2. **素材命名必須清楚**，讓 Manus 一眼看懂用途
3. **MANIFEST.json 必須保持最新**，這是 Manus 抓取素材的唯一依據
4. **版本控制**：修改素材時遞增版本號（v1 → v2），不要覆蓋舊版本
5. **格式優化**：網頁用素材請壓縮，避免影響網站載入速度

---

*本文件由 Manus System Agent 建立，定義美術 Agent 與系統的協作方式*
*如有疑問，請透過 Boss 轉達給 Manus System Agent*
