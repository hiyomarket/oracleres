# 天命主系統 — 掃描安裝流程規範

> 這份文件說明天命主系統如何掃描 GitHub 倉庫、評估提案、整合素材。
> 最後更新：2026/03/22

---

## 觸發時機

以下情況下，天命主系統需要執行掃描：

1. **Boss 轉告**：Boss 通知「天命美術完成了 TASK-XXX 素材」或「天命輔助系統提交了新提案」
2. **任務開始前**：每次開始新任務時，先掃描是否有待處理的素材或提案

---

## 掃描流程

### 步驟一：掃描美術素材

```
讀取 ART/MANIFEST.json
→ 找出所有 status: "ready" 的素材
→ 確認素材檔案存在於 ART/OUTPUTS/對應路徑
→ 讀取該任務的 INTEGRATION-SPEC.md（整合說明）
→ 評估整合可行性
```

**整合評估標準**：
- 素材尺寸是否符合系統需求
- 命名規則是否符合現有慣例
- 是否有特殊的整合邏輯說明

### 步驟二：掃描功能提案

```
讀取 MANUS-AGENTS/FOR-ASSISTANT/PROPOSALS/ 目錄
讀取 MANUS-AGENTS/FOR-GAME/PROPOSALS/ 目錄
→ 找出所有 status: "pending" 的提案文件
→ 按照提案合格標準評估
→ 回寫評估結果到提案文件
```

---

## 提案合格標準（必須全部符合才能通過）

| 檢查項目 | 說明 |
|----------|------|
| **格式正確** | 使用 PROPOSAL-TEMPLATE.md 格式，所有必填欄位都已填寫 |
| **影響範圍清楚** | 明確列出「會修改哪些現有檔案」 |
| **新增檔案清楚** | 明確列出「需要新建哪些檔案」 |
| **資料庫說明清楚** | 說明是否需要新增資料表或欄位，如有則提供 schema 草稿 |
| **技術棧合規** | 不引入現有技術棧以外的框架或套件 |
| **設計語言合規** | 使用現有的 CSS 類別和設計 token，不自創新的設計系統 |
| **無衝突** | 不與現有功能或其他待審提案衝突 |

---

## 整合後的必要動作

完成任何整合（素材或提案）後，天命主系統必須：

1. 更新 `ART/MANIFEST.json` 中對應素材的 `status` 為 `"integrated"`
2. 或在提案文件中回寫 `status: "integrated"` + 完成說明
3. 更新 `STATUS/TASK-XXX/STATUS.md`
4. 執行 `pnpm test` 確認所有測試通過
5. 儲存 Manus checkpoint
6. 執行 SYSTEM-BACKUP 備份（見下方）

---

## SYSTEM-BACKUP 備份指令

每次 checkpoint 後執行：

```bash
cd /home/ubuntu/oracle-resonance

# 複製核心檔案
cp server/routers.ts SYSTEM-BACKUP-TEMP/routers.snapshot.ts
cp drizzle/schema.ts SYSTEM-BACKUP-TEMP/schema.snapshot.ts
cp server/lib/userProfile.ts SYSTEM-BACKUP-TEMP/userProfile.snapshot.ts
cp client/src/App.tsx SYSTEM-BACKUP-TEMP/App.snapshot.tsx
cp client/src/index.css SYSTEM-BACKUP-TEMP/index-css.snapshot.css

# 複製到 GitHub 倉庫
cp SYSTEM-BACKUP-TEMP/* /home/ubuntu/oracleres/SYSTEM-BACKUP/

# 更新 LAST-UPDATED.md
# 推送到 GitHub
cd /home/ubuntu/oracleres && git add SYSTEM-BACKUP/ && git commit -m "backup: checkpoint [版本號]" && git push
```

---

## 退回提案的處理

當提案不合格時，在提案文件中加入以下內容：

```markdown
## 審核結果

**狀態**：❌ 退回
**審核時間**：YYYY/MM/DD
**退回原因**：
- [具體原因]

**修改建議**：
- [如何修改才能通過]
```

然後通知 Boss，由 Boss 轉告對應的 Agent 修改後重新提交。
