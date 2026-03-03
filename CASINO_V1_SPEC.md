# 天命娛樂城 V1.0 開發規格（Project Genesis）

## 總體目標
引入「雙軌貨幣生態系統」：
1. 新建獨立娛樂貨幣：遊戲點 (Game Coins)
2. 建立積分 ↔ 遊戲點 兌換中心
3. 打造第一個娛樂應用：WBC 趣味競猜
4. 整合進「天命娛樂城」入口頁 /casino

---

## 第一部分：後端架構升級 - 雙軌貨幣基石

### 1.1 資料庫 Schema 擴展
- users 表新增欄位：`gameCoins: integer('game_coins').default(0).notNull()`
- 遷移腳本：為所有現有用戶的 gameCoins 設初始贈送值 1000

### 1.2 新增資料庫表：currency_exchange_logs（貨幣兌換日誌）
欄位：
- id (PK)
- userId (FK to users.id)
- direction: 'points_to_coins' | 'coins_to_points'
- pointsAmount: Integer
- gameCoinsAmount: Integer
- exchangeRate: Decimal
- createdAt: Timestamp

### 1.3 新增 tRPC 路由：exchange.ts（貨幣兌換中心）

#### exchange.getRates (publicProcedure)
- 返回：{ pointsToCoinsRate: number, coinsToPointsRate: number, dailyLimit: number }
- 預設值：pointsToCoinsRate=20, coinsToPointsRate=50, dailyLimit=100積分

#### exchange.pointsToCoins (protectedProcedure)
- 輸入：{ pointsAmount: number }
- 邏輯：
  1. 驗證正整數
  2. 讀取用戶 points 餘額
  3. 驗證餘額足夠
  4. 讀取 pointsToCoinsRate（預設20）
  5. 計算 gameCoinsToAdd = pointsAmount * pointsToCoinsRate
  6. DB 事務：扣 points + 加 gameCoins + 寫 currency_exchange_logs
  7. 返回成功信息及最新餘額

#### exchange.coinsToPoints (protectedProcedure)
- 輸入：{ gameCoinsAmount: number }
- 邏輯：
  1. 驗證正整數
  2. 讀取 coinsToPointsRate（預設50）和 dailyLimit（預設100積分）
  3. 計算 pointsToAdd = gameCoinsAmount / coinsToPointsRate
  4. 查詢今日已兌換積分總量
  5. 驗證「今日已兌換量 + 本次欲兌換量」不超過 dailyLimit
  6. 驗證 gameCoins 餘額足夠
  7. DB 事務執行兌換和記錄
  8. 返回成功信息及最新餘額

---

## 第二部分：應用層開發 - 天命娛樂城與 WBC 競猜

### 2.1 後台管理頁面：/admin/marketing
- 在後台左側導航欄新增大類「行銷中心」
- 子頁面1：「經濟系統配置」(/admin/marketing/economy) - 管理員設置兌換比例和每日限額
- 子頁面2：「WBC 競猜管理」(/admin/marketing/wbc-game)

### 2.2 WBC 競猜管理後台 (/admin/marketing/wbc-game)

#### 資料庫 Schema：wbc_matches 表
- id, teamA, teamB, matchTime, rateA, rateB, status('pending'|'live'|'finished'), winningTeam(nullable)

#### 資料庫 Schema：wbc_bets 表
- id, userId, matchId, betOnTeam, amount（下注的遊戲點）, status('placed'|'won'|'lost')

#### 後台功能：
- 賽事管理：CRUD 界面管理 wbc_matches，管理員可手動設置固定賠率
- 結算中心：列表展示 status='live' 或 'pending' 的比賽，管理員選擇獲勝方後「一鍵結算」
- 結算後端邏輯：
  - 遍歷該場比賽所有 wbc_bets
  - 猜對的：winnings = bet.amount * match.rate，增加到用戶 gameCoins，更新 bet.status='won'
  - 猜錯的：更新 bet.status='lost'
  - 為所有參與用戶發送系統通知

### 2.3 用戶端 - 天命娛樂城 (/casino)
目標：集遊戲入口、貨幣兌換、任務中心於一體的娛樂門戶

頁面佈局：
1. 頂部：顯示用戶當前「積分餘額」和「遊戲點餘額」
2. 貨幣兌換區：實現 exchange.ts 路由的交互界面（雙向兌換）
3. 遊戲列表區：卡片形式展示所有可玩遊戲（目前只有 WBC 趣味競猜）
4. 每日任務區（可選 V1.0）：顯示可領取遊戲點的每日任務

### 2.4 用戶端 - WBC 趣味競猜遊戲頁面 (/casino/wbc)
- 賽程列表：調用後端 API，獲取 wbc_matches 中所有 status='pending' 的比賽列表
- 天命羅盤（特色功能）：
  - 每場比賽旁有「天命羅盤」按鈕
  - 點擊後，前端調用 warRoom.dailyReport 獲取用戶當日運勢（財運、直覺等），結合隊伍信息，在前端生成趣味性的命理風向建議（此部分邏輯無需後端深度參與，以保持趣味性）
- 下注流程：
  - 點擊比賽 → 彈出下注模態框
  - 輸入下注的遊戲點數量
  - 前端校驗用戶的遊戲點餘額
  - 點擊「確認」→ 調用後端 wbc.placeBet 程序，扣除遊戲點並在 wbc_bets 中創建記錄

---

## 第三部分：前端體驗與引導

### 3.1 個人下拉選單改造
- 在用戶頭像的下拉選單中，新增菜單項「天命娛樂城」，鏈接到 /casino
- 為這個菜單項增加動態提醒標記邏輯：
  - 後端需要一個 API：marketing.getNewGames()，返回是否有新上線的遊戲
  - 如果檢測到有新遊戲，就在「天命娛樂城」菜單項旁邊，顯示一個閃爍的 GIF 動畫或一個 "NEW" 標籤

---

## WBC 補充說明
- WBC 趣味競猜遊戲的隊伍資訊還有比賽相關詳細資料，請上網搜尋
- 開發出三種不同的玩法和下單方式
