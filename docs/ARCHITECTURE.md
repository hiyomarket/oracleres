# 天命共振 — GitHub 多 Agent 協作架構提案

> 建立時間：2026/03/22 06:56
> 建立者：大管家
> 目的：設計 ClawTeam、Manus System Agent、Manus Art Agent 的 GitHub 協作流程

---

## 一、協作模型

```
┌─────────────────────────────────────────────────────────┐
│                      GitHub Repo                         │
│                  (oracleres / hiyomarket)               │
└─────────────────────────────────────────────────────────┘
           ↑                    ↑                    ↑
           │                    │                    │
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  ClawTeam   │    │ Manus 系統  │    │ Manus 美術  │
    │  (我們)      │    │   Agent     │    │   Agent     │
    └─────────────┘    └─────────────┘    └─────────────┘
         策略規劃             執行建造            創意產出
         品質把關             網站/遊戲           素材設計
```

### Agent 角色分工

| Agent | 角色 | 主要任務 |
|-------|------|----------|
| **ClawTeam** | 策略顧問團隊 | 提出需求、寫作指令規格、把關品質 |
| **Manus System Agent** | 系統建造 Agent | 根據規格建立網站、遊戲系統 |
| **Manus Art Agent** | 美術 Agent | 根據規格設計視覺素材、上傳至 repo |

---

## 二、倉庫資料夾結構

```
oracleres/
│
├── README.md                      # 專案總覽 + Agent 入口索引
│
├── MANUS-AGENTS/                 # ⭐⭐⭐ Manus Agent 專用入口（最重要！）
│   │                                （Manus System / Art Agent 只讀這個資料夾）
│   ├── FOR-SYSTEM/                # Manus System Agent 看這個
│   │   ├── CURRENT-TASK.md        # 目前任務（System Agent 每次第一個讀）
│   │   └── INSTRUCTIONS/          # 系統建設詳細指令
│   │       └── 20260322-天命共振mvp開發-第一版-INSTRUCTION.md
│   │
│   ├── FOR-ART/                   # Manus Art Agent 看這個
│   │   ├── CURRENT-TASK.md        # 目前任務（Art Agent 每次第一個讀）
│   │   └── SPECS/                 # 美術設計規格
│   │
│   └── README.md                  # 說明：每個 Agent 該讀哪個資料夾
│
├── ART/                           # 美術素材產出區（Art Agent 上傳）
│   ├── OUTPUTS/                   # 產出素材（System Agent 從這裡抓）
│   │   ├── homepage/
│   │   │   ├── hero-banner.png
│   │   │   └── logo.svg
│   │   └── icons/
│   └── MANIFEST.json              # 素材清單（System Agent 讀這個找素材）
│
├── CLAW-TEAM/                     # ⭐ ClawTeam 內部規劃區（我們自己看）
│   │
│   ├── DECISIONS/                 # 決策記錄（命名、配色、架構）
│   │   └── 20260322-網站命名共識-DECISION.md
│   │
│   ├── REVIEWS/                   # ClawTeam 審查報告
│   │
│   └── INTERNAL/                  # 內部規劃文件（不給 Manus 看）
│
└── STATUS/                        # 任務狀態追蹤（所有 Agent 共同使用）
    ├── TASK-001-首頁MVP/
    │   └── STATUS.md
    └── TASK-002-遊戲系統/
        └── STATUS.md
```

### 📌 核心原則

> **MANUS-AGENTS/ 是 Manus 唯一的閱讀入口。**
> - Manus System Agent → 只讀 `MANUS-AGENTS/FOR-SYSTEM/`
> - Manus Art Agent → 只讀 `MANUS-AGENTS/FOR-ART/`
> - CLAW-TEAM/ 是我們內部規劃區，**不給 Manus 看**

---

## 三、工作流程

### 流程 A：ClawTeam → Manus System Agent

```
1. ClawTeam 寫作指令規格
   → 寫入 MANUS-AGENTS/FOR-SYSTEM/INSTRUCTIONS/對應任務.md
   → 更新 MANUS-AGENTS/FOR-SYSTEM/CURRENT-TASK.md

2. ClawTeam 在 GitHub push + 通知 Manus System Agent

3. Manus System Agent pull 最新
   → 第一個讀 MANUS-AGENTS/FOR-SYSTEM/CURRENT-TASK.md
   → 再讀 INSTRUCTIONS/ 裡的詳細指令

4. Manus System Agent 執行任務（程式碼在本地）

5. Manus System Agent 更新 STATUS/對應任務/STATUS.md

6. ClawTeam pull → 審查 → 通過或不通過
```

### 流程 B：ClawTeam → Manus Art Agent

```
1. ClawTeam 寫作美術設計規格
   → 寫入 MANUS-AGENTS/FOR-ART/SPECS/對應任務.md
   → 更新 MANUS-AGENTS/FOR-ART/CURRENT-TASK.md

2. ClawTeam 在 GitHub push + 通知 Manus Art Agent

3. Manus Art Agent pull 最新
   → 第一個讀 MANUS-AGENTS/FOR-ART/CURRENT-TASK.md
   → 再讀 SPECS/ 裡的詳細規格

4. Manus Art Agent 設計並產出素材
   → 上傳至 ART/OUTPUTS/對應資料夾

5. Manus Art Agent 更新 ART/MANIFEST.json

6. Manus Art Agent push 產出

7. ClawTeam 審查 → 通過或不通過
```

### 流程 C：System Agent 使用 Art Agent 素材

```
1. Art Agent 完成素材，上傳並更新 ART/MANIFEST.json

2. System Agent pull 最新
   → 閱讀 ART/MANIFEST.json

3. System Agent 在本地專案中引用素材
   → 使用路徑：從 ART/OUTPUTS/ 對應位置取得

4. System Agent 更新 STATUS/對應任務/STATUS.md
```

---

## 四、STATUS.md 機制（Agent 間狀態同步）

每個任務資料夾內需要有 `STATUS.md`，格式：

```markdown
# TASK-001 首頁MVP

## 狀態
- ClawTeam 指令：✅ 完成（2026/03/22）
- Manus System Agent：🔄 進行中
- Manus Art Agent：⏳ 等待

## 產出
- [ ] 首頁程式碼
- [ ] 美術素材

## 最後更新
2026/03/22 06:56 by ClawTeam
```

---

## 五、MANIFEST.json 機制

```json
{
  "homepage": {
    "hero-banner": {
      "file": "homepage/hero-banner.png",
      "format": "png",
      "size": "1920x1080",
      "updated": "2026/03/22"
    },
    "logo": {
      "file": "homepage/logo.svg",
      "format": "svg",
      "updated": "2026/03/22"
    }
  }
}
```

---

## 六、GitHub 使用建議

| 建議 | 說明 |
|------|------|
| **分支策略** | 主要使用 `main`，長期任務可用 `dev/` 系列分支 |
| **Commit 規範** | `[CLAW]` ClawTeam、`[SYS]` System Agent、`[ART]` Art Agent |
| **PR 審查** | 所有產出建議透過 PR，ClawTeam 負責審查 |
| **Issue 追蹤** | 用 GitHub Issues 追蹤待辦事項 |

---

## 七、下一步行動

| 行動 | 負責 | 狀態 |
|------|------|------|
| Boss 確認此架構 | Boss | ⏳ |
| 建立完整資料夾結構 | 大管家 | 待確認 |
| 通知 Manus System Agent 讀取此檔 | Boss | 待確認 |
| 通知 Manus Art Agent 讀取此檔 | Boss | 待確認 |

---

*本提案由大管家建立，供天命共振 AI 顧問團隊與 Manus AI 協同使用*
