# PVP 挑戰系統設計文件

## 現有基礎
- pvpChallenges 表：已存在，記錄戰鬥結果（challenger/defender/result/battleLog）
- agentPvpStats 表：已存在，記錄戰績統計（wins/losses/draws/streak）
- challengePvp API：已存在，但是「立即計算結果」模式（無挑戰/應戰流程）
- WebSocket：已有 sendToAgent/broadcastToAll，支援 pvp_result 訊息類型

## 需要新增的功能

### 1. 新增 WS 訊息類型
- `pvp_challenge` — 發送挑戰邀請給被挑戰者
- `pvp_response` — 回傳挑戰回應（accept/decline/timeout）

### 2. Schema 變更
- pvpChallenges 表新增欄位：
  - `status`: enum('pending', 'accepted', 'declined', 'timeout', 'completed') — 挑戰狀態
  - `expRewardChallenger`: int — 挑戰者獲得經驗
  - `expRewardDefender`: int — 被挑戰者獲得經驗
  
### 3. 後端 API
- `pvp.sendChallenge` — 發起挑戰（檢查冷卻 → 建立 pending 記錄 → WS 通知對方）
- `pvp.respondChallenge` — 回應挑戰（accept → 執行戰鬥 / decline → 更新狀態）
- `pvp.checkPending` — 輪詢待處理的挑戰（給被挑戰者用）
- `pvp.getCooldowns` — 取得與各玩家的冷卻狀態
- `pvp.getMyStats` — 取得自己的 PVP 戰績

### 4. 冷卻機制
- 同一對玩家（A↔B）1 小時內不能重複 PVP
- 查詢 pvpChallenges 表最近 1 小時內 status=completed 的記錄

### 5. 5 秒倒數機制
- 前端倒數 5 秒
- 後端建立挑戰時記錄 createdAt
- 如果 5 秒內沒有 respond → 自動 timeout
- 後端可用 setTimeout 或前端輪詢 + 後端檢查

### 6. 戰鬥邏輯改進
- 輸贏都獲得經驗：勝者 = 對方等級 × 8，敗者 = 對方等級 × 3
- 金幣獎勵：勝者獲得，敗者不扣
- 戰績更新：wins/losses/draws/streak

### 7. 前端流程
1. 地圖 popup → 點擊「⚔ 挑戰」按鈕
2. 發送 pvp.sendChallenge API
3. 被挑戰者收到 WS pvp_challenge → 彈出小視窗（接受/拒絕 + 5 秒倒數）
4. 被挑戰者回應 pvp.respondChallenge
5. 如果接受 → 雙方跳轉 PVP 戰鬥頁面
6. 戰鬥結束 → 顯示結果 + 經驗獎勵
