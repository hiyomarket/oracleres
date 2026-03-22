# 美術 Agent × 系統建造 Agent 協作指南

> **寫給美術 Agent 的說明**
> 最後更新：2026/03/22 by Manus System Agent

---

## 一、好消息：你不需要通知任何人

從現在開始，你完成素材後，**只需要做兩件事**：

1. 把素材檔案上傳到 `ART/OUTPUTS/對應任務/`
2. 更新 `ART/MANIFEST.json`，把該素材的 `status` 改為 `"ready"`

系統建造 Agent 每 **2 小時**會自動巡邏一次，發現 `status: "ready"` 的素材後，會自動下載並整合進網站。**你不需要呼叫任何 API，也不需要通知 Boss 或系統 Agent。**

---

## 二、你需要維護的唯一檔案

```
ART/MANIFEST.json
```

這是你和系統建造 Agent 之間的唯一溝通介面。規格說明在 `ART/MANIFEST-SPEC.md`，這裡只說最重要的部分。

---

## 三、工作流程（每次提交素材）

```
第一步：製作素材
  ↓
第二步：上傳到 ART/OUTPUTS/TASK-XXX/你的素材.png
  ↓
第三步：更新 ART/MANIFEST.json
        - 填寫素材資訊（name, description, file, format, dimensions 等）
        - 把 status 設為 "ready"
        - 更新 last_updated 和 updated_by
  ↓
第四步：Commit + Push 到 GitHub
  ↓
完成！等待系統 Agent 在下一個巡邏週期（最多 2 小時）自動整合
```

---

## 四、status 欄位是關鍵

| 你設定的值 | 意義 |
|-----------|------|
| `"pending"` | 製作中，系統 Agent 會忽略 |
| `"ready"` | **完成了，請系統 Agent 整合** |

| 系統 Agent 設定的值 | 意義 |
|--------------------|------|
| `"integrated"` | 已整合進網站，你可以在網站上看到 |
| `"error"` | 整合時出錯，請確認檔案是否正確 |

---

## 五、MANIFEST.json 範例

```json
{
  "version": "2.0",
  "schema": "ART/MANIFEST-SPEC.md",
  "last_updated": "2026/03/23",
  "updated_by": "Manus Art Agent",
  "sync_status": {
    "last_checked_by_system": null,
    "last_integrated_version": null
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
    }
  }
}
```

---

## 六、素材命名規範

| 類型 | 命名格式 | 範例 |
|------|----------|------|
| 首頁背景 | `landing-{區塊}-bg` | `landing-hero-bg` |
| 功能圖示 | `icon-{功能名}` | `icon-destiny-card` |
| 裝飾元素 | `deco-{描述}` | `deco-rune-circle` |
| 角色/插圖 | `illus-{描述}` | `illus-oracle-figure` |

---

## 七、整合後的確認

當你看到 MANIFEST.json 中素材的 `status` 變成 `"integrated"`，代表系統 Agent 已成功整合。你可以到 [oracleres.com](https://oracleres.com) 確認視覺效果是否符合預期。

如果有問題（例如素材顯示不正確），請：
1. 在 GitHub Issue 回報
2. 或透過 Boss 協調

---

## 八、目前等待的素材需求（TASK-001）

以下是系統建造 Agent 目前需要的素材，請依優先順序製作：

| 優先級 | 素材 ID | 名稱 | 規格 |
|--------|---------|------|------|
| 🔴 高 | `landing-hero-bg` | 首頁 Hero 背景圖 | PNG, 1920×1080, 深色星空+八卦符文 |
| 🔴 高 | `landing-hero-orb` | Hero 區命盤光球 | PNG/SVG, 600×600, 透明背景 |
| 🟡 中 | `icon-destiny-card` | 命格身份證圖示 | SVG, 128×128 |
| 🟡 中 | `icon-war-room` | 今日作戰室圖示 | SVG, 128×128 |
| 🟡 中 | `icon-oracle` | 天命問卜圖示 | SVG, 128×128 |
| 🟡 中 | `icon-wealth` | 財運羅盤圖示 | SVG, 128×128 |
| 🟢 低 | `preview-card-bg` | 命格體驗卡片背景 | PNG, 800×500, 半透明 |

---

*本文件由 Manus System Agent 制定，2026/03/22*
*規格細節請參考 `ART/MANIFEST-SPEC.md`*
