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
├── CLAW-TEAM/                    # ⭐ ClawTeam 規劃區（我們的文件）
│   │
│   ├── INSTRUCTIONS/             # 給 Manus 的指令文件
│   │   ├── 20260322-天命共振mvp開發-第一版-MANUS-INSTRUCTION.md
│   │   └── ...
│   │
│   ├── SPECS/                    # 詳細規格文件
│   │   ├── 網站首頁規格/
│   │   ├── 遊戲系統規格/
│   │   └── UI設計規格/
│   │
│   ├── DECISIONS/                # 決策記錄（命名、配色、架構）
│   │   ├── 20260322-網站命名共識.md
│   │   └── 20260322-配色方案確認.md
│   │
│   └── REVIEWS/                  # ClawTeam 審查報告
│
├── ART/                          # ⭐ 美術素材區（Manus Art Agent 產出）
│   │
│   ├── SPEC/                     # 美術設計規格（ClawTeam 撰寫）
│   │   └── homepage-design-spec.md
│   │
│   ├── SOURCE/                   # 原始檔案（PSD, AI, FIGMA）
│   │   └── homepage/
│   │
│   ├── OUTPUTS/                  # 產出素材（可直接使用）
│   │   ├── homepage/
│   │   │   ├── hero-banner.png
│   │   │   ├── logo.svg
│   │   │   ├── button-ok.png
│   │   │   └── ...
│   │   ├── icons/
│   │   └── backgrounds/
│   │
│   └── MANIFEST.json             # 素材清單（讓其他 Agent 知道有哪些素材）
│
├── SYSTEM/                       # ⭐ 系統 Agent 工作追蹤區
│   │                                （網站程式碼在 Manus System Agent 本地）
│   ├── TASKS/                    # 任務追蹤（System Agent 更新）
│   │   ├── TASK-001-首頁MVP/
│   │   │   └── STATUS.md        # 任務狀態
│   │   │
│   │   └── TASK-002-遊戲系統/
│   │       └── ...
│   │
│   └── README.md                 # System Agent 的任務索引
│
└── ASSETS/                       # 共享素材（System + Art 共用）
    ├── fonts/
    ├── audio/
    └── shared/
```

---

## 三、工作流程

### 流程 A：ClawTeam → Manus System Agent

```
1. ClawTeam 寫作指令規格
   → CLAW-TEAM/INSTRUCTIONS/TASK-XXX.md

2. ClawTeam 在 GitHub push + 通知 Manus System Agent

3. Manus System Agent pull 最新指令
   → 閱讀 CLAW-TEAM/INSTRUCTIONS/

4. Manus System Agent 執行任務
   → 產出放入 SYSTEM/TASKS/TASK-XXX/OUTPUT/

5. Manus System Agent push 產出 + 更新 STATUS.md

6. ClawTeam pull → 審查 → 通過或不通過
```

### 流程 B：ClawTeam → Manus Art Agent

```
1. ClawTeam 寫作美術設計規格
   → ART/SPEC/hw-design-spec.md

2. ClawTeam 在 GitHub push + 通知 Manus Art Agent

3. Manus Art Agent pull 最新規格
   → 閱讀 ART/SPEC/

4. Manus Art Agent 設計並產出素材
   → 上傳至 ART/OUTPUTS/對應資料夾

5. Manus Art Agent 更新 ART/MANIFEST.json

6. Manus Art Agent push 產出

7. ClawTeam 審查 → 通過或不通過
```

### 流程 C：System Agent 使用 Art Agent 素材

```
1. Art Agent 完成素材，上傳並更新 MANIFEST.json

2. System Agent pull 最新素材
   → 閱讀 ART/MANIFEST.json

3. System Agent 在本地專案中引用素材
   → 使用路徑：從 ART/OUTPUTS/ 對應位置取得

4. System Agent 更新 SYSTEM/TASKS/TASK-XXX/STATUS.md
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
