# ART/MANIFEST.json 規格說明 v2.0

> 本文件定義美術 Agent 與系統建造 Agent 之間的素材交接協議。
> **美術 Agent 每次提交素材前，必須按照本規格更新 MANIFEST.json。**

---

## 一、檔案位置

```
ART/MANIFEST.json
```

---

## 二、頂層欄位說明

| 欄位 | 類型 | 由誰填寫 | 說明 |
|------|------|----------|------|
| `version` | string | 系統維護 | 目前固定為 `"2.0"`，不需修改 |
| `schema` | string | 系統維護 | 指向本規格文件，不需修改 |
| `last_updated` | string | **美術 Agent** | 最後更新日期，格式 `YYYY/MM/DD` |
| `updated_by` | string | **美術 Agent** | 填入 `"Manus Art Agent"` |
| `sync_status` | object | 系統自動更新 | 系統巡邏後自動填寫，**不需手動修改** |
| `assets` | object | **美術 Agent** | 素材清單，每個 key 為素材 ID |

---

## 三、assets 素材物件格式

每個素材用一個唯一的 `asset_id` 作為 key，格式如下：

```json
{
  "assets": {
    "landing-hero-bg": {
      "task": "TASK-001",
      "name": "首頁 Hero 背景圖",
      "description": "深邃星空背景，帶有八卦符文光暈，夜間版本",
      "file": "ART/OUTPUTS/TASK-001/landing-hero-bg.png",
      "format": "PNG",
      "dimensions": "1920x1080",
      "status": "ready",
      "version": "1.0",
      "created_at": "2026/03/22",
      "notes": "已按照 SPEC 規格製作，背景為深色 #050d14"
    }
  }
}
```

### assets 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `task` | string | ✅ | 對應任務編號，如 `"TASK-001"` |
| `name` | string | ✅ | 素材中文名稱 |
| `description` | string | ✅ | 素材用途與視覺描述 |
| `file` | string | ✅ | 相對於倉庫根目錄的檔案路徑 |
| `format` | string | ✅ | 檔案格式，如 `"PNG"`, `"SVG"`, `"WEBP"` |
| `dimensions` | string | ✅ | 尺寸，如 `"1920x1080"` 或 `"512x512"` |
| `status` | string | ✅ | **狀態欄位，見下方說明** |
| `version` | string | ✅ | 素材版本，從 `"1.0"` 開始，修改後遞增 |
| `created_at` | string | ✅ | 建立日期，格式 `YYYY/MM/DD` |
| `notes` | string | 選填 | 給系統 Agent 的備注，如特殊用法說明 |

---

## 四、status 狀態欄位（最重要）

系統建造 Agent 的巡邏機制完全依賴 `status` 欄位判斷是否需要整合。

| 狀態值 | 由誰設定 | 意義 |
|--------|----------|------|
| `"pending"` | 美術 Agent | 素材製作中，尚未完成，系統 Agent 忽略 |
| `"ready"` | **美術 Agent** | **素材已完成，請系統 Agent 整合** |
| `"integrated"` | 系統 Agent | 系統已整合完畢，美術 Agent 可知悉 |
| `"error"` | 系統 Agent | 整合時發生錯誤，需美術 Agent 確認 |

> **重點：美術 Agent 完成素材後，必須將 status 改為 `"ready"`，系統 Agent 才會自動整合。**

---

## 五、完整範例

```json
{
  "version": "2.0",
  "schema": "ART/MANIFEST-SPEC.md",
  "last_updated": "2026/03/23",
  "updated_by": "Manus Art Agent",
  "sync_status": {
    "last_checked_by_system": "2026/03/23 10:00",
    "last_integrated_version": "2026/03/22"
  },
  "assets": {
    "landing-hero-bg": {
      "task": "TASK-001",
      "name": "首頁 Hero 背景圖",
      "description": "深邃星空背景，帶有八卦符文光暈，夜間版本",
      "file": "ART/OUTPUTS/TASK-001/landing-hero-bg.png",
      "format": "PNG",
      "dimensions": "1920x1080",
      "status": "ready",
      "version": "1.0",
      "created_at": "2026/03/23",
      "notes": "背景色 #050d14，符文光暈使用橙金色 #f59e0b"
    },
    "destiny-card-icon": {
      "task": "TASK-001",
      "name": "命格身份證圖示",
      "description": "命格身份證功能卡片的代表圖示，風格：中式符文+現代線條",
      "file": "ART/OUTPUTS/TASK-001/destiny-card-icon.svg",
      "format": "SVG",
      "dimensions": "128x128",
      "status": "pending",
      "version": "1.0",
      "created_at": "2026/03/23",
      "notes": "製作中，預計明日完成"
    }
  }
}
```

---

## 六、美術 Agent 工作流程

1. 製作素材，上傳至 `ART/OUTPUTS/對應任務/` 資料夾
2. 更新 `ART/MANIFEST.json`，填寫素材資訊，`status` 設為 `"ready"`
3. 更新 `last_updated` 和 `updated_by` 欄位
4. Commit 並 Push 到 GitHub
5. **無需通知任何人**，系統建造 Agent 每 2 小時會自動巡邏並整合

---

## 七、系統建造 Agent 巡邏機制

- 每 **2 小時**自動執行一次巡邏
- 巡邏時讀取 `ART/MANIFEST.json`，尋找 `status: "ready"` 的素材
- 自動下載素材並整合進網站
- 整合完成後將 `status` 更新為 `"integrated"`
- 更新 `sync_status.last_checked_by_system` 時間戳

---

*本規格由 Manus System Agent 制定，2026/03/22*
*如有疑問，請在 GitHub Issue 回報或透過 Boss 協調*
