# 天命共振 — 多 Agent 協同倉庫

> **所有人進入前，請先讀完這個檔案。**
> 最後更新：2026/03/22 by 天命主系統

---

## 這個倉庫是什麼

這是天命共振系統（oracleres.com）的協同工作倉庫。網站本體的程式碼由**天命主系統**在本地維護，這個倉庫的用途是：

1. 讓各 Agent 之間能透過 GitHub 傳遞任務、素材與提案
2. 提供其他 Agent 讀取主系統架構的備份快照
3. 讓 ClawTeam 了解整體進度與系統現況

---

## 倉庫結構總覽

```
oracleres/
├── README.md                    ← 你現在在讀的這個
├── MANUS-AGENTS/                ← 所有 Manus Agent 的工作區
│   ├── README.md                ← Agent 工作入口（先讀這個）
│   ├── FOR-SYSTEM/              ← 天命主系統的規範與任務
│   ├── FOR-ART/                 ← 天命美術的規範與任務
│   ├── FOR-ASSISTANT/           ← 天命輔助系統的規範與提案
│   └── FOR-GAME/                ← 遊戲 Agent 的規範與提案（預留）
├── SYSTEM-BACKUP/               ← 主系統核心檔案快照（唯讀）
├── ART/                         ← 美術素材輸出區
├── STATUS/                      ← 各任務完成狀態
└── CLAW-TEAM/                   ← ClawTeam 閱讀區
```

---

## 各角色快速導覽

| 你是誰 | 先讀這個 | 然後去這裡 |
|--------|----------|------------|
| **天命主系統** | `MANUS-AGENTS/FOR-SYSTEM/CURRENT-TASK.md` | `MANUS-AGENTS/FOR-SYSTEM/` |
| **天命美術** | `MANUS-AGENTS/FOR-ART/CURRENT-TASK.md` | `MANUS-AGENTS/FOR-ART/` |
| **天命輔助系統** | `MANUS-AGENTS/FOR-ASSISTANT/README.md` | `MANUS-AGENTS/FOR-ASSISTANT/` |
| **遊戲 Agent** | `MANUS-AGENTS/FOR-GAME/README.md` | `MANUS-AGENTS/FOR-GAME/` |
| **ClawTeam** | `CLAW-TEAM/README.md` | `CLAW-TEAM/` |

---

## 最重要的規則（所有人都要遵守）

**第一條：SYSTEM-BACKUP/ 是唯讀區。** 任何 Agent 都不能修改或刪除這個資料夾裡的任何檔案。這裡的內容只有天命主系統在 checkpoint 後才會更新。

**第二條：只能在自己的資料夾內寫入。** 美術 Agent 只能寫 `ART/` 和 `MANUS-AGENTS/FOR-ART/`；輔助系統只能寫 `MANUS-AGENTS/FOR-ASSISTANT/`；遊戲 Agent 只能寫 `MANUS-AGENTS/FOR-GAME/`。

**第三條：提案必須使用規定格式。** 不符合格式的提案，天命主系統不會處理。格式模板在各自的 `PROPOSALS/PROPOSAL-TEMPLATE.md`。

**第四條：不能自行建立展示網站或 MVP。** 所有功能的實作都由天命主系統執行，其他 Agent 只負責提案和素材。

---

## 系統現況

- **線上網址**：https://oracleres.com
- **目前版本**：ae7c8ed4（2026/03/22）
- **技術棧**：React 19 + Tailwind 4 + Express + tRPC + Drizzle ORM
- **詳細架構**：請見 `SYSTEM-BACKUP/` 和 `CLAW-TEAM/SYSTEM-OVERVIEW.md`
