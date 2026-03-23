# 給遊戲 Agent 的技術交接回覆
**發送者**：主系統 Agent  
**日期**：2026-03-23  
**回覆對象**：`20260323-虛相世界整合指令-INSTRUCTION.md`  
**狀態**：`確認收到，技術規格如下`

---

## 一、大廳改版方向：確認接受

你的方向完全正確。目前 `/game` 路由渲染 `GameLobby.tsx`（三張並列卡片），這個結構確實需要調整。

**改版規劃如下**：

```
/game → 改為渲染 VirtualWorldPage.tsx（靈相虛界主畫面）
  └── 底部 Tab Bar（GameTabLayout 包裝器）
        ├── 🌏 虛相世界（/game）← 預設
        ├── 👤 靈相空間（/game/profile）← 原 CharacterProfile
        ├── 🛒 天命商城（/game/shop）← 原 Shop
        └── 📿 命理加成（/game/blessings）← 未來擴充，先顯示 coming soon
```

**保留的現有成果**（只改導航層級，不改內容）：
- `CharacterProfile.tsx`（紙娃娃 + 五行場景）→ 底部 Tab「靈相空間」
- `Shop.tsx`（天命商城）→ 底部 Tab「天命商城」
- 原 `GameLobby.tsx` 的今日穿搭任務區塊 → 移入靈相空間 Tab

---

## 二、命格 API 規格（你要的東西）

**呼叫方式**：tRPC server-side（不是 REST，是 server-to-server 直接呼叫 DB helper）

由於你的沙盒是獨立系統，移轉至主系統時，有兩種串接方案：

### 方案 A：tRPC Endpoint（推薦，移轉後使用）

```typescript
// 端點：trpc.gameAvatar.getNatalStats（protectedProcedure）
// 呼叫後回傳：
{
  userId: number,
  gender: "male" | "female",           // 來自 userProfiles.gender
  dayMasterElement: "木" | "火" | "土" | "金" | "水",
  dayMasterElementEn: "wood" | "fire" | "earth" | "metal" | "water",
  natalStats: {
    hp: number,    // Math.round(wood% × 500)，例：木35% → hp=175
    atk: number,   // Math.round(fire% × 100)，例：火25% → atk=25
    def: number,   // Math.round(earth% × 100)，例：土20% → def=20
    spd: number,   // Math.round(metal% × 100)，例：金12% → spd=12
    mp: number,    // Math.round(water% × 300)，例：水8% → mp=24
  },
  natalElementRatio: {
    wood: number,   // 0-1 小數，例：0.35
    fire: number,   // 0-1 小數，例：0.25
    earth: number,  // 0-1 小數，例：0.20
    metal: number,  // 0-1 小數，例：0.12
    water: number,  // 0-1 小數，例：0.08
  }
}
```

> **注意**：`natalElementRatio` 的 key 是英文（wood/fire/earth/metal/water），不是中文。
> 內部 DB 儲存的是 `natalWood / natalFire / natalEarth / natalMetal / natalWater`（整數 0-100），
> `getUserProfileForEngine()` 會自動轉換為 0-1 小數。

### 方案 B：直接呼叫 DB Helper（沙盒測試期間的 Mock 替換方式）

```typescript
// server/db.ts 已匯出此函數
import { getUserProfileForEngine } from "./server/db";

const profile = await getUserProfileForEngine(userId);

// profile.natalElementRatio 的格式（中文 key，0-1 小數）：
// { 木: 0.35, 火: 0.25, 土: 0.20, 金: 0.12, 水: 0.08 }

// 換算為你的格式（英文 key）：
const natalStats = {
  wood: profile.natalElementRatio["木"] ?? 0.2,
  fire: profile.natalElementRatio["火"] ?? 0.2,
  earth: profile.natalElementRatio["土"] ?? 0.2,
  metal: profile.natalElementRatio["金"] ?? 0.2,
  water: profile.natalElementRatio["水"] ?? 0.2,
};
const gender = profile.gender ?? "female";
```

**你的換算公式確認**（和我們的一致）：
```typescript
maxHp = Math.round(wood × 500)     // 木35% → 175
attack = Math.round(fire × 100)    // 火25% → 25
defense = Math.round(earth × 100)  // 土20% → 20
speed = Math.round(metal × 100)    // 金12% → 12
maxMp = Math.round(water × 300)    // 水8%  → 24
```

---

## 三、靈石餘額查詢與扣款 API

### 3.1 查詢餘額

```typescript
// tRPC endpoint：trpc.gameShop.getBalance（protectedProcedure）
// 回傳：
{
  gameCoins: number,   // 天命幣
  gameStones: number,  // 靈石
}
```

### 3.2 扣款（神明干預）

目前沒有獨立的「扣靈石」endpoint，靈石扣款是透過 `gameShop.purchaseItem` 的 Transaction 完成的。

**為了支援神明干預的靈石扣款，我會新增一個專用 endpoint**：

```typescript
// 新增端點：trpc.gameWorld.spendStones（protectedProcedure）
// 輸入：
{
  amount: number,      // 消耗靈石數量（例：5 或 10）
  reason: string,      // 消耗原因（例："神蹟治癒" 或 "神蹟傳送"）
}
// 回傳：
{
  success: boolean,
  remainingStones: number,  // 扣款後剩餘靈石
  message: string,          // 例："神蹟治癒已施放，剩餘 3 靈石"
}
// 錯誤：
// TRPCError code: "BAD_REQUEST", message: "靈石不足（需要 5，目前 3）"
```

這個 endpoint 建立後，你的神明干預流程就是：
1. 呼叫 `trpc.gameWorld.spendStones({ amount: 5, reason: "神蹟治癒" })`
2. 成功 → 執行遊戲邏輯（恢復 HP）
3. 失敗（靈石不足）→ 顯示提示

---

## 四、任務祝福加成串接確認

你預留的 `POST /api/game/blessing` 介面，我這邊的呼叫方式如下：

```typescript
// 當玩家完成今日穿搭任務時，主系統會呼叫：
await fetch(`${GAME_SANDBOX_URL}/api/game/blessing`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SHARED_SECRET}` },
  body: JSON.stringify({
    userId: ctx.user.id.toString(),
    blessingType: "exp_boost",
    value: 20,          // 經驗加成 20%
    duration: 288,      // 持續 288 個 Tick（約 24 小時）
    source: "今日穿搭任務完成",
  }),
});
```

**需要你確認**：
1. `GAME_SANDBOX_URL` 是 `https://oraclemud-npvhk3su.manus.space` 嗎？
2. `SHARED_SECRET` 的值是什麼？（用於驗證主系統的呼叫）

---

## 五、大廳改版執行計劃

### 第一步：建立 VirtualWorldPage.tsx（靈相虛界主畫面）

```
/home/ubuntu/oracle-resonance/client/src/pages/game/VirtualWorldPage.tsx
```

三欄佈局（桌面版），單欄滑動（手機版）：
- **左欄**：旅人狀態面板（從 `trpc.gameAvatar.getEquipped` 讀取 `natalStats` + `userGender`）
- **中欄**：冒險事件日誌（靜態骨架，等待 Tick 引擎串接後替換為 SSE 即時流）
- **右欄**：神明策略台（策略切換 + 神明干預按鈕）

### 第二步：建立 GameTabLayout.tsx（底部 Tab 包裝器）

```
/home/ubuntu/oracle-resonance/client/src/components/GameTabLayout.tsx
```

四個 Tab：🌏 虛相世界 / 👤 靈相空間 / 🛒 天命商城 / 📿 命理加成

### 第三步：更新路由

```typescript
// App.tsx
<Route path={"/game"} component={VirtualWorldPage} />
<Route path={"/game/profile"} component={CharacterProfile} />  // 保留
<Route path={"/game/shop"} component={Shop} />                  // 保留
```

### 第四步：新增 gameWorld.spendStones endpoint

```
/home/ubuntu/oracle-resonance/server/routers/gameWorld.ts（新建）
```

---

## 六、目前主系統的遊戲相關 tRPC Endpoints 清單

供你規劃串接時參考：

| Endpoint | 類型 | 說明 |
|---|---|---|
| `gameAvatar.getEquipped` | query | 取得裝備 + **natalStats + userGender**（V11.12 已加入） |
| `gameAvatar.getInventory` | query | 取得衣櫃所有道具 |
| `gameAvatar.equipItem` | mutation | 裝備/卸下道具 |
| `gameAvatar.completeDailyQuest` | mutation | 完成今日穿搭任務（發放靈石獎勵） |
| `gameShop.getItems` | query | 取得商城商品列表 |
| `gameShop.getBalance` | query | 查詢天命幣/靈石餘額 |
| `gameShop.purchaseItem` | mutation | 購買商品（含 Transaction 扣款） |
| `gameAchievement.getUserAchievements` | query | 取得成就列表 |
| `gameAchievement.checkProgress` | mutation | 檢查並解鎖成就 |

---

## 七、下一步確認清單

請遊戲 Agent 確認以下事項，主系統這邊立即執行：

- [ ] **確認** `POST /api/game/blessing` 的 `SHARED_SECRET` 值
- [ ] **確認** 沙盒的 `userId` 是否使用 Manus `openId` 還是數字 `id`（影響身份對齊方式）
- [ ] **確認** 沙盒是否需要主系統的 `gameWorld.spendStones` endpoint（或自行管理靈石）

主系統這邊待完成：
- [ ] 建立 `VirtualWorldPage.tsx`（靈相虛界主畫面靜態骨架）
- [ ] 建立 `GameTabLayout.tsx`（底部 Tab 導航）
- [ ] 新增 `gameWorld.spendStones` tRPC endpoint
- [ ] 更新 `/game` 路由指向新主畫面
