# MANUS-AGENTS — Agent 工作入口

> **每次工作前，請先讀完這個檔案，再進入你的專屬資料夾。**
> 最後更新：2026/03/22 by 天命主系統

---

## 四個 Agent 的職責分工

| Agent | 資料夾 | 核心職責 | 可以做什麼 | 不能做什麼 |
|-------|--------|----------|------------|------------|
| **天命主系統** | `FOR-SYSTEM/` | 系統建造、維護、部署 | 修改所有程式碼、安裝素材、整合提案 | — |
| **天命美術** | `FOR-ART/` | 視覺設計、素材製作 | 製作圖片/動效素材、更新 MANIFEST.json | 修改程式碼、自建網站 |
| **天命輔助系統** | `FOR-ASSISTANT/` | 功能規劃、系統分析、開發輔助 | 提交功能提案、分析現有架構 | 修改程式碼、修改 SYSTEM-BACKUP/ |
| **遊戲 Agent** | `FOR-GAME/` | 遊戲功能設計與開發輔助 | 提交遊戲功能提案 | 修改現有頁面、修改 SYSTEM-BACKUP/ |

---

## 每次工作前的標準流程

### 天命主系統
1. 讀 `FOR-SYSTEM/CURRENT-TASK.md`（目前任務）
2. 讀 `FOR-ASSISTANT/PROPOSALS/` 是否有待審核提案
3. 讀 `FOR-GAME/PROPOSALS/` 是否有待審核提案
4. 確認 `ART/MANIFEST.json` 是否有 `status: "ready"` 的素材

### 天命美術
1. 讀 `FOR-ART/CURRENT-TASK.md`（目前任務）
2. 讀 `SYSTEM-BACKUP/index-css.snapshot.css` 了解現有設計 token
3. 製作素材 → 上傳到 `ART/OUTPUTS/` → 更新 `ART/MANIFEST.json`

### 天命輔助系統
1. 讀 `FOR-ASSISTANT/README.md`（工作規範）
2. 讀 `SYSTEM-BACKUP/` 了解現有系統架構
3. 讀 `FOR-ASSISTANT/COLLABORATION-GUIDE.md`（提案格式與限制）
4. 撰寫提案 → 放入 `FOR-ASSISTANT/PROPOSALS/`

### 遊戲 Agent
1. 讀 `FOR-GAME/README.md`（工作規範）
2. 讀 `SYSTEM-BACKUP/` 了解現有系統架構
3. 讀 `FOR-GAME/COLLABORATION-GUIDE.md`（提案格式與限制）
4. 撰寫提案 → 放入 `FOR-GAME/PROPOSALS/`

---

## 素材與提案的狀態流程

```
美術素材：製作中(draft) → 已完成(ready) → 通知Boss → 主系統整合(integrated)
功能提案：草稿(draft) → 待審核(pending) → 通知Boss → 主系統審核 → 可行(approved) / 退回(rejected)
```

---

## 最重要的規則（所有 Agent 都必須遵守）

`SYSTEM-BACKUP/` 資料夾是**唯讀的**。這裡存放的是主系統在最近一次 checkpoint 時的核心檔案快照，讓其他 Agent 能了解系統現況。**任何 Agent 都不能修改或刪除這個資料夾的任何內容。**

---

## 產出上傳位置

| 產出類型 | 上傳到 |
|----------|--------|
| 美術素材 | `ART/OUTPUTS/TASK-XXX/` |
| 素材清單 | `ART/MANIFEST.json` |
| 功能提案 | `MANUS-AGENTS/FOR-ASSISTANT/PROPOSALS/` 或 `FOR-GAME/PROPOSALS/` |
| 任務狀態 | `STATUS/TASK-XXX/STATUS.md` |
