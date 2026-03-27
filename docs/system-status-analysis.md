# 系統開發狀態盤點（2026-03-27）

## 一、回合制戰鬥系統（combatEngineV2 + gameBattle）

### 後端引擎（已完成）
- **combatEngineV2.ts**（958行）：完整的回合制戰鬥引擎
  - 先手判定：SPD 降冪 + 角色優先於寵物 + 隨機雜湊
  - 人寵協同：角色 + 寵物 = 2 個行動單位，分開排序
  - 指令系統：攻擊/技能/防禦/道具/逃跑/投降
  - 傷害公式：物理 ATK×2-DEF÷2 / 魔法 MAG×2-MDEF÷2
  - 狀態效果：DoT/眩暈/冰凍/中毒/灼燒/石化/混亂/遺忘/昏睡
  - AI 決策樹：HP 閾值 + MP 判斷 + 技能選擇
  - 戰鬥狀態機：START→SPEED_SORT→TURN→CHECK_END→END
  - BattleMode：idle / player_closed / player_open / pvp / map_mob / boss

### 後端 API（已完成）
- **gameBattle.ts**（1022行）：
  - `startBattle`：建立新戰鬥（支援 player_closed/player_open/map_mob/boss 模式）
  - `submitCommand`：提交玩家指令，執行一回合（回合制核心）
  - `simulateBattle`：快速模擬（掛機用）
  - `getBattleState`：查詢戰鬥狀態
  - `startIdleSession`/`getIdleSession`/`settleIdleSession`：掛機管理
  - 資料庫表：gameBattles, gameBattleParticipants, gameBattleCommands, gameBattleLogs

### 前端（部分完成）
- **CombatRoom.tsx**：目前只是「測試版」
  - 只有角色立繪動畫（idle/attack/hit）
  - 沒有真實戰鬥數值計算
  - 沒有怪物顯示
  - 沒有接入 gameBattle API
  - 沒有指令選擇 UI（攻擊/技能/防禦/道具/逃跑）
  - **結論：前端戰鬥介面需要重寫，接入後端 API**

### PvP 系統（已完成但未使用 combatEngineV2）
- **gameWorld.ts** 中有兩套 PvP：
  - `sendPvpChallenge` + `respondPvpChallenge`：即時挑戰（WS 通知 + 5秒倒數）
  - `challengePvp`：快速 PvP
  - **問題：PvP 使用自己的簡化戰鬥邏輯（5回合 ATK-DEF），沒有使用 combatEngineV2 的回合制引擎**
  - 缺少：技能、寵物、狀態效果、防禦指令
- **PvpChallengeSystem.tsx**：前端 PvP 組件（挑戰按鈕/彈窗/結果）
- **PvpHistoryPage.tsx**：PvP 歷史頁面

## 二、寵物系統

### 後端引擎（已完成）
- **petEngine.ts**（379行）：
  - BP 五維系統（體質/力量/防禦/敏捷/魔力）
  - 檔位系統（S/A/B/C/D/E）
  - 升級 BP 成長（3固定+1隨機）
  - 捕捉率計算（HP因子×等級因子×道具加成）
  - 天命技能 14 種（物理/魔法/控制/輔助）
  - 技能升級（Lv1-10，累積使用次數）
  - 種族 HP 倍率

### 後端 API（已完成）
- **gamePet.ts**：
  - `getMyPets`/`getPetDetail`：查詢寵物
  - `capturePet`：捕捉寵物
  - `learnDestinySkill`：學習天命技能
  - `getActivePet`：取得出戰寵物
  - `getPetBpHistory`：BP 歷史
  - 管理端：`getPetCatalog`/`getAllPlayerPets`/`getTierDistribution`

### 前端（已完成）
- **PetPage.tsx**：寵物列表/詳情/技能管理/出戰切換
- **PetBpRadarChart.tsx**：BP 雷達圖

### 戰鬥整合（已完成）
- combatEngineV2 已支援人寵協同（角色+寵物=2個行動單位）
- gameBattle 的 startBattle 會自動載入出戰寵物
- 寵物天命技能在戰鬥中可使用，戰後累積使用次數

## 三、尚未建立的系統

### 移動式小 Boss
- 目前沒有「移動式小 Boss」的概念
- 怪物圖鑑有 boss/legendary 稀有度，但沒有「在地圖上移動」的機制
- 需要：Boss 生成/移動邏輯、Boss 戰觸發、Boss 專屬獎勵

### 惡魔城
- 完全沒有相關程式碼
- 需要：城堡地圖系統、樓層/房間、Boss 守關、進度保存

## 四、關鍵結論

1. **回合制戰鬥引擎已完成**，但前端 CombatRoom 只是 UI 測試版，沒有接入真實戰鬥 API
2. **PvP 沒有使用回合制引擎**，用的是簡化的 ATK-DEF 公式
3. **寵物系統完整**（引擎+API+前端+戰鬥整合）
4. **Boss 戰和惡魔城尚未建立**
