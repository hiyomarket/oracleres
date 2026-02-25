# 天命共振 - 線上擲筊系統 TODO

## 資料庫 & 後端基礎
- [x] 建立 oracle_sessions 資料表（儲存每次擲筊記錄）
- [x] 建立農曆天干地支轉換算法（server/lib/lunarCalendar.ts）
- [x] 建立天命共振算法核心邏輯（server/lib/oracleAlgorithm.ts）
- [x] 建立問題類型關鍵詞分析邏輯
- [x] 建立每日能量計算邏輯（五行與蘇先生命格比對）
- [x] 建立特殊彩蛋判斷邏輯（丑月/丑時立筊）

## 後端 API (tRPC)
- [x] oracle.cast - 執行擲筊（含天命共振算法）
- [x] oracle.history - 取得歷史擲筊記錄
- [x] oracle.dailyEnergy - 取得當日能量狀態
- [x] oracle.notifyDailyEnergy - 推送每日能量通知

## 前端頁面
- [x] 全域視覺設計（深邃水藍/墨綠背景、火焰橙按鈕、字型）
- [x] 淨心頁面（竹林背景、引導文字、火焰按鈕）
- [x] 擲筊主頁（問題輸入框、木質筊杯、火焰按鈕）
- [x] 擲筊動畫（拋擲物理動畫）
- [x] 結果呈現（聖杯紅/笑杯木色/陰杯黑、解讀文字）
- [x] 神諭資料庫回顧（擲筊主頁內嵌歷史記錄）
- [x] 每日能量面板（當日天干地支、五行能量、宜忌）

## 特殊功能
- [x] 語音輸入問題（Web Speech API）
- [x] 木頭撟擊音效系統（Web Audio API 合成）
- [x] 特殊立筊彩蛋動畫與文字
- [x] 每日能量通知推送
- [x] 響應式設計（手機/桌機）

## 測試 & 部署
- [x] 撰寫 vitest 測試（31 項全部通過）
- [x] 資料庫遷移（pnpm db:push）
- [x] 儲存最終檢查點

## 功能增強 v1.1

### 三聖杯連擲模式
- [x] 後端：連擲模式整合進擲筊主頁（利用現有 oracle.cast）
- [x] 前端：連擲模式切換按鈕（單次 / 三聖杯連擲）
- [x] 前端：三次擲筊進度顯示（煷1/2/3次）
- [x] 前端：最終確認結果頁面（三聖杯成功 / 未達三聖杯）
- [x] 前端：連擲動畫（依序播放三次拋擲）

### 月相視覺元素
- [x] 後端：月相計算算法（新月/上弦/滿月/下弦/殘月）
- [x] 後端：滿月時聖杯機率加成（+10%）
- [x] 前端：月相專屬展示組件（MoonPhaseDisplay）
- [x] 前端：月相信息顯示在擲筊主頁
- [x] 前端：月相動態視覺與擲筊影響說明

### 年度神諭統計頁面
- [x] 後端：oracle.stats API（各結果比例、問題類型分布、能量最佳日期）
- [x] 前端：統計頁面路由 /stats
- [x] 前端：結果比例圓餅圖（Recharts PieChart）
- [x] 前端：每月擲筊次數折線圖
- [x] 前端：問題類型分布橫向長條圖
- [x] 前端：能量等級分布圖
- [x] 導航欄加入統計頁面入口

### 時辰能量系統（精細化）
- [x] 後端：12時辰天干計算算法（時干由日干推算）
- [x] 後端：每個時辰對蘇先生命格的五行影響分析
- [x] 後端：時辰宜忌建議（行動/決策/休息/社交等分類）
- [x] 後端：時辰能量整合進擲筊算法（日柱+時柱雙重加權）
- [x] 後端：oracle.hourlyEnergy API（返回當前時辰+全天導時辰預覽）
- [x] 前端：每日能量面板加入時辰能量區塊（當前時辰高亮）
- [x] 前端：全天導時辰能量時間軸（可視化橫向滑動）
- [x] 前端：時辰宜忌具體建議顯示（適合做什麼/不適合做什麼）

## 功能增強 v1.2

### 刷刷樂天命選號系統
- [x] 後端：五行數字對應表（木1/3/8、火2/7、土5/0、金4/9、汱6/1）
- [x] 後端：命格加權選號算法（用神火/土優先，忌神金/水降權）
- [x] 後端：根據當日干支、時辰、月相動態調整號碼池
- [x] 後端：lottery.generate API（生成個人化幸運號碼組合）
- [x] 後端：lottery.history API（儲存與查詢選號記錄）
- [x] 資料庫：建立 lottery_sessions 資料表
- [x] 前端：刷刷樂選號主頁面（/lottery）
- [x] 前端：號碼生成動畫（逐一揭曉效果）
- [x] 前端：五行能量解析說明（為何選這些號碼）
- [x] 前端：幸運號碼歷史記錄
- [x] 前端：導航欄加入刷刷樂入口

### 問卜指引功能
- [x] 後端：根據時辰+月相計算最適合問題類型
- [x] 前端：擲筊主頁輸入框下方顯示即時問卜指引提示

### 年度命理日曆
- [x] 後端：calendar.monthly API（返回指定月份每日干支與能量等級）
- [x] 前端：日曆頁面（/calendar）月曆視圖
- [x] 前端：每日格子顯示天干地支與吉凶色彩
- [x] 前端：點擊日期查看詳細宜忌與能量說明

### LLM 神諭深度解讀
- [x] 後端：insight.deepRead API（呼叫 LLM 生成個人化詮釋）
- [x] 前端：結果頁面加入「深度解讀」按鈕
- [x] 前端：Streamdown 串流顯示 AI 解讀內容

## 功能增強 v1.3

### 統一導航列（所有分頁返回首頁）
- [x] 建立 SharedNav 共用導航組件（含返回首頁、各分頁連結）
- [x] OracleCast 主頁整合 SharedNav
- [x] LotteryOracle 刮刮樂頁整合 SharedNav
- [x] OracleCalendar 日曆頁整合 SharedNav
- [x] OracleStats 統計頁整合 SharedNav
- [x] WeeklyReport 週報頁整合 SharedNav（新頁面）

### 今日最佳購買時機（刮刮樂）
- [x] 後端：lottery.bestTime API（計算今日最旺時辰列表）
- [x] 前端：刮刮樂頁加入「今日最佳時機」區塊
- [x] 前端：倒數計時器（距下一個最佳時辰的倒數）
- [x] 前端：已過/當前/未來時辰的視覺狀態區分

### 命理週報功能
- [x] 後端：weeklyReport.sevenDays API（未來7日能量走勢）
- [x] 前端：週報頁面（/weekly）
- [x] 前端：七日能量折線圖（Recharts LineChart）
- [x] 前端：每日能量摘要卡片（適合決策/靜養/社交）
- [x] 導航欄加入週報入口

### 開獎對照功能（刮刮樂）
- [x] 資料庫：lottery_results 資料表（儲存開獎對照記錄）
- [x] 後端：lottery.recordResult API（記錄實際開獎號碼）
- [x] 後端：lottery.resonanceStats API（五行共振命中率統計）
- [x] 前端：LotteryResultChecker 組件（輸入開獎號碼）
- [x] 前端：五行共振分析顯示（哪些五行命中）
- [x] 前端：長期命中率統計

### 附近彩券行天命共振推薦
- [x] 前端：GPS 定位取得使用者當前座標
- [x] 前端：Google Maps Places API 搜尋附近彩券行（關鍵詞：彩券、樂透、公益彩券）
- [x] 後端：lottery.scoreStores API（計算每家的天命共振指數）
- [x] 後端：方位五行計算（從使用者位置到店家的方向 → 東木/南火/西金/北水/中土）
- [x] 後端：門牌號碼五行分析（號碼數字對應五行，與命格比對）
- [x] 後端：店名字義五行分析（店名關鍵字對應五行能量）
- [x] 後端：流日流時加權（當日天干地支 × 當前時辰 × 命格用神 → 最終共振分數）
- [x] 前端：NearbyStores 組件（彩券行列表含天命共振指數、方位、距離、推薦理由）
- [x] 前端：共振指數視覺化（火焰圖示 1-5 顆，金色高亮最高分店家）
- [x] 前端：點擊店家開啟 Google Maps 導航
- [x] 前端：「為何推薦此店」展開說明（方位五行、門牌五行、流時加成）

## 功能增強 v2.0 - 今日作戰室

### 後端核心引擎
- [x] 八字十神計算（甲木日主 × 流日天干 → 食神/傷官/正財/偏財/正官/七殺/正印/偏印/比肩/劫財）
- [x] 流日五行能量計算（環堷70% + 本命30% 加權）
- [x] 塔羅流日計算（中間個性 10 + 當月 + 當日 → 歸約至 1-22）
- [x] 穿搭建議引擎（上半身/下半身/鞋子 × 五行顏色對應）
- [x] 手串推薦引擎（左手補能/右手防護 × HS-01~HS-11 資料庫）
- [x] 財運羅盤計算（偏財指數、商業羅盤建議）
- [x] 英雄劇本生成（整合八字+塔羅分析）
- [x] warRoom.dailyReport tRPC API（輸出完整 JSON）

### 前端頁面（/war-room）
- [x] 模塊A：頂部核心數據看板（日期/農曆/節氣/干支/一句話/核心矛盾）
- [x] 模塊B：塔羅流日卡片展示（卡片翻轉動畫、關鍵詞、行動建議）
- [x] 模塊C：穿搭與手串矩陣（上衣/下身/鞋子分類卡片，左右手手串推薦）
- [x] 模塊D：英雄劇本與財運羅盤（分頁切換卡片）
- [x] 模塊E：全天時辰能量時間軸（12時辰完整展示）
- [x] 頁面聯動按鈕（前往擲筊 + 刷刷樂選號快捷鈕）
- [x] SharedNav 整合（加入作戰室入口）
- [x] 響應式設計（手機/桌機完整同步）

## 測試 v2.0
- [x] warRoom.test.ts （35 項測試全部通過）
- [x] 總計 66 項測試全部通過

## 功能增強 v2.1 - 命格常數統一化

### 建立命格常數聲明檔案
- [x] 建立 server/lib/userProfile.ts（集中宣告甲木日主所有命格參數）
- [x] lunarCalendar.ts 引用 userProfile 命格常數
- [x] hourlyEnergy.ts 引用 userProfile 命格常數
- [x] lotteryAlgorithm.ts 引用 userProfile 命格常數
- [x] warRoomEngine.ts 引用 userProfile 命格常數
- [x] storeResonance.ts 引用 userProfile 命格常數
- [x] tenGods.ts 引用 userProfile 命格常數
- [x] oracleAlgorithm.ts 引用 userProfile 命格常數
- [x] TypeScript 編譯零錯誤，66 項測試全部通過
- [x] 儲存 V2.1 checkpoint

## 功能修復 v2.2 - 刷刷樂頁面問題修復

- [x] 修復天命工程時程倒數計時器（scoreMap 中英文標籤不匹配，導致分數全部為 5）
- [x] 修復附近彩券行地點資訊（stemElement 中文未轉換為英文 WuXing，導致 resonanceScore = NaN）
- [x] 儲存 V2.2 checkpoint

## 功能增強 v2.3

- [x] 開獎共振加入刮刮樂比對（schema + db.ts + routers.ts + LotteryResultChecker.tsx 全新 Tab 切換）
- [x] 附近彩券行搜尋範圍滑桿（500m/1km/2km/5km 切換按鈕）
- [x] 天命工程時程視覺優化（當前時辰脈動光暈 + 已過時辰淡出 + 能量進度条）
- [x] 彩券行收藏功能（FavoriteStores.tsx + favorite_stores DB + 3 個 API + 收藏按鈕）
- [x] 66 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.3 checkpoint

## 功能修復 & 增強 v2.4

- [x] 修正作戰室（/war-room）頁面版面問題（Tab 滚動、時辰格子、分頁標籤優化）
- [x] 刮刮樂選號加入地址五行分析（輸入彩券行地址 → 門牌數字五行屬性 + 共振分數 + 幸運數字）
- [x] 刮刮樂選號加入多面額選號策略（50/100/200/500元，各對應保守/穩健/積極/天命四種風險等級）
- [x] ScratchAnalysis.tsx 新組件（地址分析 + 面額選號卡片展開）
- [x] 66 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.4 checkpoint

## 功能修復 v2.5 - 時辰能量全面檢查

- [x] 診斷作戰室時辰能量時間軸版面跑掉的根本原因（ENERGY_LEVEL_COLOR 中英文標籤不匹配）
- [x] 修正作戰室時辰能量時間軸版面（用 label 讀取顏色，進度条改為 score/100）
- [x] 診斷刷刷樂時辰能量全部顯示「大吉」（bestSlots 只顯示最佳 3 個時辰，屬於正常行為）
- [x] 刷刷樂面額改為 100/200/300/500/1000/2000 元（後端 + 前端同步更新）
- [x] 面額選號加入最旺時辰聯動（ScratchAnalysis.tsx 倒數展示）
- [x] 建立刷刷樂購買日誌（ScratchJournal.tsx + scratch_logs DB + 3 個 API）
- [x] 購買日誌統計分析（各面額 ROI + 各時辰命中率）
- [x] 66 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.5 checkpoint

## 功能增強 v2.6 - 七日作戰室 + 晨報推播

- [x] 後端 warRoom.dailyReport 支援傳入指定日期參數
- [x] 前端 WarRoom.tsx 加入本週七日日期選擇器（今日高亮，可切換任意日期）
- [x] 七日切換時顯示對應日期的完整流日報告（十神/塔羅/穿搭/財運/時辰）
- [x] 實作每日早上7點晨報推播（notifyOwner 推送英雄劇本摘要）
- [x] 儲存 V2.6 checkpoint

## 功能增強 v2.7 - 真實手串資料庫 + 穿搭差異化

- [x] 將 HS-A~HS-J 真實手串資料取代舊 BRACELET_DB（HS-01~HS-11）
- [x] 手串推薦引擎：依天干（10種）× 十神（10種）× 陰陽干三維度差異化，每日推薦組合不同
- [x] 穿搭建議引擎：依天干地支、十神、月相三維度差異化，不只依五行大類
- [x] 加入十神維度的穿搭策略（食神/傷官/正財/偉財/七殺/正官/偉印/正印/比肩/剤財）
- [x] 月相影響穿搭（滿月/新月/上弦/下弦各有不同建議）
- [x] 78 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.7 checkpoint

## 功能增強 v2.8 - 命格身份證 + 週報強化 + 手串佩戴記錄

### 命格身份證頁面 /profile
- [x] 建立 ProfilePage.tsx（靜態頁面，無需 API）
- [x] 八字四柱展示（年柱/月柱/日柱/時柱，含天干地支五行屬性）
- [x] 紫微十二宮展示（命宮/財帛/官禄等12宮位星曜）
- [x] 生命靈數與塔羅原型展示（外在/中間/內在/靈魂輔助）
- [x] 五行比例圓餅圖（Recharts PieChart）
- [x] 補運策略優先級展示（火>土>金）
- [x] 導航欄加入命格身份證入口
- [x] 響應式設計（手機/桌機）

### 週報統計儀表板強化
- [x] 移除與作戰室重複的七日能量走勢區塊
- [x] 加入本月刷刷樂 ROI 走勢圖（每日累積 ROI 折線圖）
- [x] 加入各時辰命中率熱力圖（12時辰 × 命中/未命中，顏色深淺表示命中率）
- [x] 加入刷刷樂總覽統計（總投入/總回收/ROI%/最佳時辰）

### 手串佩戴記錄功能
- [x] 資料庫：建立 bracelet_wear_logs 資料表（日期/手串ID/左右手/刷刷樂結果關聯）
- [x] 後端：braceletWear.toggle API（記錄/取消佩戴）
- [x] 後端：braceletWear.getByDate API（查詢指定日佩戴記錄）
- [x] 後端：braceletWear.getStats API（統計各手串 × 刷刷樂命中率）
- [x] 前端：作戰室手串卡片加入「今日已佩戴」勾選按鈕
- [x] 儲存 V2.8 checkpoint

## 功能修正 v2.9 - 命格資料 V9.0 歸正 + 五行生活方式指南整合

- [x] 修正 userProfile.ts：日主改為甲木，五行比例改為 木42%/水35%/火11%/土9%/金4%
- [x] 修正 userProfile.ts：財星定義改為「土」（甲木日主，我尅者為財）
- [x] 修正 userProfile.ts：用神優先級改為 火>土>金
- [x] 建立 wuxingEngine.ts：加權五行計算引擎（本命30%+環境70%）
- [x] 修正 ProfilePage.tsx：五行圓餅圖數據改為 木42%/水35%/火11%/土9%/金4%
- [x] 修正 ProfilePage.tsx：日主顯示「甲木」、補運策略正確說明
- [x] 重寫穿搭引擎：依甲木日主用神（火土金）策略，加入天干×十神×月相三維差異化
- [x] 穿搭引擎：補火日（食神/傷官）→ 紅橙暖色系；補土日（正財/偉財）→ 大地黃棕色系；補金日（正官/七殺）→ 白灰金屬色系
- [x] 作戰室加入五行加權總覽表（本命/環境/加權三欄）
- [x] 作戰室加入飲食建議區塊（補火/補土/補金食物清單）
- [x] 78 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.9 checkpoint

## 功能修正 v2.10 - 月柱節氣切月 + 塔羅流日規則 + 時區修正

- [x] 修正月柱計算：加入節氣切月邏輯（2026/2/21 = 庚寅月）
- [x] 修正塔羅流日計算規則：月<10不相加，日<23不相加（2/21 = 2+21=23 → 2+3=5 → 10+5=15 惡魔）
- [x] 加入 0 號小愚者和 22 號大愚者的卡巴拉之樹詳細詮釋
- [x] 修正時辰計算：建立 getTaiwanHour 工具函數，全面替換伺服器端 UTC+0 時間
- [x] 78 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.10 checkpoint

## 功能增強 v2.11 - 全站時區修正 + 導覽列置頂 + 日曆強化 + 首頁優化

- [x] 全站時區審查：找出 lottery 和其他頁面的時間錯誤
- [x] 驗證 2026/3/6 月柱（驚蟄後應為辛卯月）
- [x] 修正 lottery 頁面時區問題（前端 new Date() 改用台灣時間）
- [x] 導覽列固定置頂（sticky nav），下滑時仍可見
- [x] 日曆頁功能評估與增強（節氣標記、吉凶日、農曆顯示等）
- [x] 首頁（/）補充與優化（擲筊頁加入快速功能入口標籤列）
- [x] 78 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.11 checkpoint

## 功能增強 v2.12 - 日曆頁全面重設計 + 作戰室天命問卜

### 後端
- [x] 後端：warRoom.topicAdvice API（天命問卜：工作/愛情/健康/財運/決策，LLM 命理分析）
- [x] 後端：topicAdvice 整合日柱/月柱/十神/塔羅/月相/五行等多維命理上下文

### 前端：日曆頁全面重設計
- [x] 日曆頁改為雙欄佈局（左月曆 + 右詳情面板）
- [x] 日曆格子加入農曆日期顯示（初幾/節日）
- [x] 日曆格子：週日紅色、週六藍色
- [x] 詳情面板：國曆/農曆/節氣/神明生日完整顯示
- [x] 詳情面板：Tab 切換「日課資訊」與「時辰吉凶」
- [x] 日課資訊：宜忌標籤化顯示、沖煞方位、吉神凶煞、彭祖百忌
- [x] 時辰吉凶：12 時辰吉凶卡片（宜忌/沖煞）
- [x] 節氣範圍顯示（當前節氣名稱 + 起止日期）

### 前端：作戰室天命問卜
- [x] 建立 TopicAdvicePanel.tsx 獨立組件
- [x] 作戰室加入天命問卜模塊（工作/愛情/健康/財運/決策五大主題）
- [x] 支援自訂問題輸入（可選填）
- [x] LLM 回應顯示（含命理上下文標籤）

### 測試
- [x] 78 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.12 checkpoint

## 功能增強 v2.13 - 擲筊主頁全面重設計 + 天命問卜優化

### 擲筊主頁重設計
- [x] 動畫區塊移至最上方（筊杯動畫/結果動畫置頂顯示）
- [x] 問題輸入欄位固定在頁面中段，不因動畫狀態消失
- [x] 保留最近 3 筆歷史問題，可一鍵快速重選填入輸入框（localStorage 持久化）
- [x] 連擲三次模式共用同一個問題輸入，不需重複輸入
- [x] 整體版面重新排版（動畫 → 問題欄 → 歷史問題 → 功能按鈕）
- [x] 結果後「再問一次」按鈕保留問題內容，不清空欄位
- [x] 歷史記錄加入「重用此問題」按鈕

### 作戰室天命問卜優化
- [x] 改善 TopicAdvicePanel 結果呈現設計（分數大字顯示、命理標籤列、建議主體排版、快速切換其他主題）
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.13 checkpoint

## 功能增強 v2.14 - 常用模板 + 全站手機 UI 優化

### 問題欄常用模板
- [x] 加入分類模板按鈕（彩券/事業/財運/感情/健康，共 15 筆模板）
- [x] 模板可展開/收合，點擊即填入輸入框並自動收合

### 全站手機 UI 優化
- [x] SharedNav 手機底部導覽列優化（更大觸控區域 56px、當前頁高亮背景、icon 放大）
- [x] 全站 7 個頁面加入 oracle-page-content class，手機底部自動避開導覽列
- [x] iOS 輸入框防自動縮放（font-size: 16px）、觸控回饋優化、安全區域支援

### 功能擴充提案
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.14 checkpoint

## 功能增強 v2.15 - 選號頁大改造

### 可選日期制 + 天氣納入選號
- [x] 日期選擇器（預設今日，可選未來 7 天/過去任意日期，顯示今日/昨日/明日標籤）
- [x] 選定日期後重新計算命理資料（日柱/十神/能量）
- [x] 天氣 API 整合（Open-Meteo 免費 API，依 GPS 位置取得天氣，天氣五行屬性顯示，可選擇納入選號計算）
- [x] 不同面額（100/200/300/500/1000/2000）依日期+天氣給出不同號碼

### 今日彩券能量指數整合
- [x] 能量分數（1-10分）卡片（分數大字、適合/不適合/觀望、影響因素橫條）
- [x] 適合/不適合/觀望 三種建議（含詳細說明）
- [x] 日柱/月相/十神/五行影響因素橫條顯示

### GPS 地圖搜尋彩券行
- [x] GPS 定位後顯示 Google Maps（自動嘗試取得位置）
- [x] 搜尋「台灣彩券」附近門市（Google Places textSearch）
- [x] 點選門市標記後帶入地址做五行分析
- [x] 移除失效的「附近彩券行天命共振」功能（改為 GPS 地圖選店方式）

### 其他
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.15 checkpoint

## 功能增強 v2.16 - 動態選號引擎重設計

### 核心問題
- [x] 現有算法問題：號碼池固定，五維因素（日期/時辰/天氣/地點/命格）沒有真正影響號碼

### 新引擎設計
- [x] 建立命格五行分數化系統（用神/忁神/喜神各有加權係數）
- [x] 建立流日十神 × 命格互動矩陣（食神日/傷官日/正財日等各有不同策略）
- [x] 建立時辰加權系統（當前時辰五行 × 命格用神 → 時辰加成係數）
- [x] 建立天氣五行加權（晴火/雨水/陰土/風木/霧金 × 命格用神衝突/加成）
- [x] 建立地點方位加權（地址數字五行 + 方位五行 → 地點加成係數）
- [x] 建立月相加成系統（滿月/新月/上弦/下弦各有不同加成策略）
- [x] 最終號碼池：0-9 每個數字有動態分數，依分數排序後抽取
- [x] 面額差異化：100元保守（高分前3）/ 1000元天命（三組融合最高頻）/ 2000元至尊天命（五維全開最優6個）
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.16 checkpoint

## 功能增強 v2.17 - 統一購彩指數 + 購買時機修正

### 核心問題
- [x] 財運羅盤（偶財指料6）與彩券能量指數（8.0）算法不同、互不相通
- [x] 購買時機永遠顯示申/酉/戌時大吉，未依命格動態計算

### 後端修正
- [x] 建立統一購彩指數引擎（lottery.purchaseAdvice API：偶財指數×0.4 + 日柱×0.3 + 月相×0.1 + 天氣×0.1 + 時辰×0.05 + 塔羅×0.05）
- [x] 修正 lottery.bestTime API：依真實 energyScore 排序（不再用粗略大吉=10分），不同日期時辰分數不同
- [x] purchaseAdvice 包含六維分數明細、面額建議、十神資訊、彩券類型建議

### 前端修正
- [x] 選號頁頂部加入「本日購彩綜合建議卡片」（PurchaseAdviceCard：綜合分大字、面額建議、展開六維明細）
- [x] 購買時機卡片依命格顯示真正的吉凶差異（依 energyScore 排序，不同日期時辰不同）
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.17 checkpoint

## 功能增強 v2.18 - 購彩指數歷史走勢圖 + 財運羅盤同步

- [x] 後端：lottery.indexHistory API（計算過去 14 天每日購彩指數，並標記有購買記錄的日期）
- [x] 後端：作戰室財運羅盤改用 purchaseAdvice 引擎（偶財指數改為六維加權綜合分）
- [x] 前端：選號頁 PurchaseAdviceCard 下方加入 14 天走勢折線圖（Recharts，購買日用特殊標記）
- [x] 前端：作戰室財運羅盤改為「本日購彩綜合指數」，顯示與選號頁一致的分數，底部快捷鍵同步更新
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.18 checkpoint

## 功能增強 v2.19 - 走勢圖中獎標記 + 明日預測 + 本週最佳購彩日

- [x] 後端：scratch_logs 已有 isWon 欄位，直接利用現有欄位
- [x] 後端：lottery.indexHistory 回傳 hasWin 欄位（查詢 scratch_logs isWon）
- [x] 後端：lottery.indexHistory 回傳 tomorrow（明日預測分數、日期、等級）
- [x] 後端：warRoom.dailyReport 加入 weeklyLotteryScores（本週七日購彩指數陣列，標記最高分日 isBest）
- [x] 前端：走勢圖加入中獎金星標記（金色菱形+★，區別於購買灰色圓）
- [x] 前端：走勢圖右側加入明日預測虛線（青色虛線延伸 + 標題顯示明日分數）
- [x] 前端：作戰室七日切換列標記本週最佳購彩日（金色光暈 + 「最旺」標籤 + 分數小字）
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.19 checkpoint

## 功能增強 v2.20 - 本週最旺時辰橫幅 + 通知 Mail

- [x] 後端：weeklyLotteryScores 最佳日加入 bestHour（時辰名、displayTime、energyScore、weekdayName）
- [x] 前端：七日切換列下方加入本週最旺時辰橫幅（週X + 時辰 + 時間 + 日綜指數）
- [x] 前端：橫幅右側加入「通知 Mail」按鈕，點擊後呼叫 notifyOwner，發送後變成綠色「已發送」狀態
- [x] 後端：新增 warRoom.notifyBestHour procedure，組裝通知內容並呼叫 notifyOwner
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.20 checkpoint

## Bug 修正 v2.21 - 農曆換算偏差（差一天）

- [x] 調查根本原因：LUNAR_MONTH_DATA 2026年資料全部错誤（春節寫成 1/19，實際為 2/17）
- [x] 修正 2026、2027、2028 年農曆月份初一日期（香港天文台+dijizhoum雙重驗證）
- [x] 修正 moonPhase.ts：lunarDay 改用 solarToLunar 取得，不再用天文月齡估算
- [x] 新增 solarToLunarByYMD 純數字版，使用 Julian Day Number 計算，從根本解決 UTC 伺服器時區偷差
- [x] 修正 estimateLunarDate 基準日（2026/1/19 改為 2026/2/17）
- [x] 日曆月份查詢改用 solarToLunarByYMD，月相計算改用 Date.UTC
- [x] 驗算確認：2026/2/22 = 正月初六✔，78 項測試全部通過
- [x] 儲存 V2.21 checkpoint

## 功能增強 v2.22 - 農曆節日通知 + 最佳購彩日標記 + 命格生日倒數

- [ ] 後端：建立農曆節日清單（元宵/清明/端午/七夕/中秋/重陽/冬至/除夕/春節）
- [ ] 後端：每日 23:00 排程檢查明天是否為農曆節日，是則發送 Mail 通知
- [ ] 後端：calendar.monthly API 加入每日購彩指數，標記本月最高分 3 天（isBestLotteryDay）
- [ ] 前端：日曆月曆格子加入金色邊框標記本月最佳購彩日（含分數小字）
- [ ] 前端：命格身份證加入「本年農曆生日」倒數（距今幾天）
- [ ] 前端：命格身份證加入虛歲/實歲對照（含說明）
- [ ] TypeScript 零錯誤，78 項測試全部通過
- [ ] 儲存 V2.22 checkpoint

## 功能增強 v2.22 - 作戰室 GPS 命理推薦餐廳

- [x] 前端：命格身份證加入農曆生日倒數（距今幾天）+ 虛歲/實歲對照橫幅
- [x] 前端：作戰室「今日飲食建議」區塊下方加入「附近命理推薦餐廳」子區塊
- [x] 前端：使用者點擊「尋找附近餐廳」按鈕後取得 GPS 定位
- [x] 前端：依今日需補五行（土/金/火等）轉換為 Google Maps 搜尋關鍵字
- [x] 前端：呼叫 Google Maps Places API 搜尋附近餐廳（半徑 1km）
- [x] 前端：依命理分數排序並顯示推薦清單（餐廳名稱、距離、評分、命理匹配度）
- [x] 前端：每家餐廳顯示「命理匹配標籤」（補土★★★、補金★★等）+ Google Maps 連結
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.22 checkpoint

## 功能增強 v2.23 - 吉方篩選 + 五年流年流月分析

- [ ] 後端：建立 annualForecast.ts 流年流月分析引擎（2026-2030 五年逐年逐月）
- [ ] 後端：warRoom.dailyReport 加入今日財位方向（吉方）資訊
- [ ] 前端：NearbyRestaurants 加入「優先吉方」開關，依方位篩選餐廳
- [ ] 前端：ProfilePage 加入五年流年時間軸卡片（2026-2030）
- [ ] 前端：每年可展開顯示 12 個月流月分析
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.23 checkpoint

## Bug 修正 v2.23b - 餐廳清單修正
- [ ] 餐廳清單改為依距離從近到遠排序（而非命理分數）
- [ ] 搜尋結果至少顯示 8 筆餐廳
- [ ] 修正「地圖 →」連結：改用正確的 Google Maps URL 格式（place_id 或座標搜尋）

## 功能增強 v2.24 - 深度風水五行地塊分析引擎
- [ ] 研究風水五行地塊分析方法論（座標方位、地形、地名、建築屬性）
- [ ] 後端：建立 fengShuiAnalysis.ts 風水地塊分析引擎
  - [ ] 以使用者為中心計算餐廳/彩券行相對方位（八方位 + 二十四山）
  - [ ] 結合今日財位/喜神方位計算方位匹配分數
  - [ ] 地名五行屬性分析（地名含水/火/木/金/土字根）
  - [ ] 建築類型五行屬性（甜點=土、燒烤=火、日式=金等）
  - [ ] 綜合風水分數計算（方位 40% + 地名 20% + 建築類型 40%）
- [ ] 前端：NearbyRestaurants 加入風水分數卡片（方位標示 + 五行能量條 + 購彩建議）
- [ ] 前端：彩券行地圖也整合風水地塊分析
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.24 checkpoint

## 功能增強 v2.24b - 深度風水地塊分析（前端版）
- [x] 前端 NearbyRestaurants 加入風水三維度分析引擎（純前端計算，不需後端 API）
  - [x] 二十四山方位五行（方位角 → 壬/子/癸/丑/艮/寅/甲/卯/乙/辰/巽/巳/丙/午/丁/未/坤/申/庚/酉/辛/戌/乾/亥）
  - [x] 地名字根五行（NAME_ELEMENT_CHARS 字典，涵蓋木/火/土/金/水五行字根）
  - [x] 料理類型五行（BUSINESS_KEYWORDS_FS，燒烤=火/甜點=土/日式=金/海鮮=水/蔬食=木）
  - [x] 加權分數計算（方位 40% + 地名 20% + 料理類型 40%）
  - [x] 五行匹配分數（火=100/土=85/金=70/木=30/水=20，依蘇先生命格）
  - [x] 風水等級（大吉≥85/吉≥70/平≥50/凶≥35/大凶<35）
- [x] UI 更新：每間餐廳顯示風水等級標籤（可點擊展開）
- [x] UI 更新：展開面板顯示三維度詳情（方位山名+角度/地名字根/料理類型）
- [x] UI 更新：顯示主導五行和總分/100
- [x] TypeScript 零錯誤
- [ ] 儲存 V2.24b checkpoint

## 功能增強 v2.25 - 風水分析三項延伸功能
- [ ] 彩券行 GPS 地圖整合三維度風水分析（ScratchAnalysisWithMap 標記氣泡顯示風水等級）
- [ ] 餐廳清單加入「距離優先 / 風水優先」排序切換按鈕（NearbyRestaurants）
- [ ] schema 加入 fengShuiGrade + fengShuiScore 欄位（scratch_logs 資料表）
- [ ] routers.ts addScratchLog 接受 fengShuiGrade + fengShuiScore 參數
- [ ] getScratchStats 加入各風水等級中獎率統計（大吉/吉/平/凶/大凶）
- [ ] ScratchJournal 新增記錄時可輸入風水等級，統計面板加入風水等級中獎率圖表
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.25 checkpoint

## 功能增強 v2.30 - 帳號系統（主帳號 + 子帳號 + 命格資料 + 強制登入保護）
- [ ] schema：users 擴充 role（owner/member）+ userProfiles 資料表（姓名/出生地/出生時間/八字/五行命格）
- [ ] schema：inviteCodes 資料表（邀請碼/使用狀態/建立者/過期時間）
- [ ] db.ts：getUserProfile / upsertUserProfile / createInviteCode / useInviteCode / listMembers / revokeMember
- [ ] routers.ts：account.getProfile / account.saveProfile / account.createInvite / account.listMembers / account.revokeMember
- [ ] 前端：App.tsx 加入全域強制登入保護（未登入一律跳轉登入頁）
- [ ] 前端：AccountPage.tsx（主帳號管理頁：成員清單、邀請碼產生、撤銷權限）
- [ ] 前端：ProfilePage.tsx（個人命格資料填寫：姓名/出生地/出生時間/五行命格）
- [ ] 前端：系統各功能讀取當前使用者命格資料（取代硬編碼的蘇先生命格）
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.30 checkpoint

## 功能增強 v2.30 - 帳號系統（主帳號 + 子帳號 + 命格資料 + 強制登入）
- [x] schema：新增 user_profiles 資料表（姓名/出生地/出生日期/出生時間/四柱/五行命格/備註）
- [x] schema：新增 invite_codes 資料表（邀請碼/標籤/有效期/使用狀態/使用者）
- [x] db:push 推送兩個新資料表
- [x] 後端：account.getStatus（登入狀態/主帳號/啟用狀態/命格資料）
- [x] 後端：account.useInviteCode（受邀者啟用帳號）
- [x] 後端：account.createInviteCode（主帳號產生邀請碼）
- [x] 後端：account.listInviteCodes（主帳號查看邀請碼列表）
- [x] 後端：account.revokeInviteCode（主帳號撤銷邀請碼）
- [x] 後端：account.listUsers（主帳號查看使用者列表）
- [x] 後端：account.getProfile（取得個人命格資料）
- [x] 後端：account.saveProfile（儲存/更新個人命格資料）
- [x] 後端：account.getProfileByUserId（主帳號查看指定使用者命格資料）
- [x] 前端：AccessGate 全站守衛（未登入→登入頁、未啟用→邀請碼輸入頁、已啟用→正常內容）
- [x] 前端：AccountManager 頁面（/account-manager，主帳號專屬）
- [x] 前端：MyProfile 頁面（/my-profile，個人命格資料填寫）
- [x] 前端：SharedNav 使用者下拉選單（我的命格資料、帳號管理、登出）
- [x] App.tsx 加入新路由並套用 AccessGate
- [x] TypeScript 零錯誤

## 重要待辦 v3.0 - 動態命格去個人化（商業化必要條件）
- [ ] 全站搜尋「蘇祐震」「蘇先生」「1984」等寫死字串，逐一替換為動態讀取登入者 userProfiles
- [ ] server/lib/userProfile.ts：將寫死的甲木日主命格常數改為從登入者 userProfiles 動態讀取
- [ ] server/lib/lotteryAlgorithm.ts：確保所有命格參數都從 DynamicLotteryInput 傳入，不依賴 userProfile.ts 常數
- [ ] server/routers/warRoom.ts：dailyReport 等 API 改為依登入者命格動態計算（讀取 ctx.user 的 userProfiles）
- [ ] ProfilePage.tsx：PROFILE 常數（名字/生日/職業）改為讀取登入者 userProfiles 資料
- [ ] ProfilePage.tsx：FOUR_PILLARS、FIVE_ELEMENTS_DATA、LUCKY_STRATEGY 等改為依 userProfiles.dayMasterElement/favorableElements 動態計算
- [ ] ProfilePage.tsx：ZIWEI_PALACES、TAROT_PROFILE 等改為依使用者命格動態生成（LLM 輔助）
- [ ] 新使用者首次登入時，若 userProfiles 為空，引導填寫命格資料後才能使用完整功能
- [ ] 主帳號（管理員）可查看/編輯所有使用者的命格資料

## 功能增強 v2.32 - 帳號系統深化（邀請碼綁定命格 + 子帳號命格同步 + 使用統計）
- [x] schema：inviteCodes 加入命格預填欄位（presetDisplayName/presetDayMaster/presetFavorable/presetUnfavorable）
- [x] schema：userProfiles 完整命格欄位（dayMasterElement/favorableElements/unfavorableElements/birthDate/birthPlace/birthHour/fourPillars）
- [x] account.ts：createInviteCode 加入命格預填欄位
- [x] account.ts：useInviteCode 啟用時自動建立 userProfiles 記錄（若邀請碼有命格預填）
- [x] account.ts：listUsers 回傳 profile 資料（含命格摘要）
- [x] account.ts：getUserStats API（各使用者擲筊/選號/購彩日誌統計）
- [x] lotteryAlgorithm.ts：DynamicLotteryInput 加入 customLuckyWeights/customElementBoost/customSpecialHourBonus
- [x] lotteryAlgorithm.ts：generateLotteryNumbers 支援動態命格覆寫
- [x] routers.ts lottery.generate：加入 profileUserId 參數，查詢 userProfiles 動態計算命格權重
- [x] LotteryOracle.tsx：加入命格切換 UI（主帳號可選擇為哪位成員選號）
- [x] AccountManager.tsx：完善邀請碼管理（含命格預填表單）+ 使用者統計卡片
- [x] MyProfile.tsx：命格資料填寫頁面完善（喜用神五行按鈕選擇器 + 已填資料摘要卡片）

## 功能增強 v2.35 - 商業化功能權限管控系統
- [x] schema：user_permissions 資料表（userId/featureId/enabled/expiresAt/note）
- [x] db:push：user_permissions 資料表建立
- [x] permissions.ts：後端 API（getMyPermissions/setPermission/setPermissionsBatch/listAllPermissions）
- [x] routers.ts：掛載 permissionsRouter
- [x] usePermissions.ts：前端 hook（hasFeature/isAdmin/isLoading）
- [x] FeatureLockedCard.tsx：無權限時顯示的升級提示卡片
- [x] SharedNav.tsx：依權限隱藏無法使用的導覽項目 + 加入「權限管理」入口
- [x] PermissionManager.tsx：主帳號功能權限管理頁面（各使用者功能開關 + 使用天數設定）
- [x] App.tsx：加入 /permission-manager 路由
- [x] LotteryOracle.tsx：加入 usePermissions 權限檢查（lottery 功能）
- [x] OracleCalendar.tsx：加入 usePermissions 權限檢查（calendar 功能）
- [x] WeeklyReport.tsx：加入 usePermissions 權限檢查（weekly 功能）
- [x] OracleStats.tsx：加入 usePermissions 權限檢查（stats 功能）
- [x] WarRoom.tsx：加入 usePermissions 權限檢查（warroom 功能）
- [x] ProfilePage.tsx：加入 usePermissions 權限檢查（profile 功能）
- [ ] OracleCast.tsx：加入 usePermissions 權限檢查（oracle 功能）
- [ ] 作戰室子功能（天命問卜/穿搭手串/財運羅盤/飲食建議）加入子功能級權限檢查
- [x] OracleCast.tsx：加入 usePermissions 權限檢查（oracle 功能）
- [x] 作戰室子功能（天命問卜/穿搭手串/財運羅盤/飲食建議）加入子功能級權限檢查

## 功能增強 v2.36 - 商業化去個人化（前端動態名稱）
- [x] SharedNav.tsx：UserMenu 改為優先顯示 profile.displayName（而非 OAuth user.name）
- [x] OracleStats.tsx：移除硬編碼「蘇祐震」，改為讀取 trpc.account.getProfile
- [x] OracleCast.tsx：移除硬編碼八字資訊，改為讀取 trpc.account.getProfile
- [x] PurifyMind.tsx：移除硬編碼名稱和八字，改為讀取 trpc.account.getProfile
- [x] ProfilePage.tsx：移除 PROFILE 常數，改為讀取 trpc.account.getProfile
- [x] MyProfile.tsx：新增農曆生日（birthLunar）和職業（occupation）欄位
- [x] schema：user_profiles 新增 occupation 和 birthLunar 欄位
- [x] account.ts：saveProfile 加入 occupation 和 birthLunar 欄位
- [ ] server/lib/userProfile.ts：後端算法常數改為從登入者 userProfiles 動態讀取（warRoom.dailyReport 等）
- [ ] 新使用者首次登入時，若 userProfiles 為空，引導填寫命格資料後才能使用完整功能

## 功能增強 v2.37 - 後端算法去個人化 + Onboarding + 命格提示橫幅

### 後端算法去個人化
- [ ] warRoom.dailyReport 改為 protectedProcedure，從 ctx.user 動態讀取 userProfiles
- [ ] 建立 getUserProfileForEngine() 輔助函式（讀取 DB 命格，若無則退回 userProfile.ts 預設值）
- [ ] warRoom 相關 API（dailyReport/topicAdvice/notifyBestHour）全部改用動態命格
- [ ] lottery.generate 確認已支援動態命格（profileUserId 參數）

### 首次登入 Onboarding 引導流程
- [ ] 建立 OnboardingModal.tsx（命格資料未填寫時的精簡填寫彈窗）
- [ ] App.tsx 加入全域 Onboarding 觸發邏輯（登入後檢查 userProfiles 是否為空）
- [ ] Onboarding 填寫完成後自動關閉並刷新頁面

### 命格資料完整性提示橫幅
- [ ] 建立 ProfileIncompleteBar.tsx（命格未填寫時顯示的頂部提示橫幅）
- [ ] OracleCast、WarRoom、LotteryOracle 三個核心功能頁面加入提示橫幅
- [ ] 點擊橫幅連結至 /my-profile 頁面

## 功能增強 v2.38 - 商業化三項建議完成

- [x] 後端算法去個人化：warRoom.dailyReport 改為 protectedProcedure，動態讀取 ctx.user 的命格（dayMasterElement、favorableElements、natalRatio）
- [x] 新增 getUserProfileForEngine() 輔助函式（db.ts），從 userProfiles 讀取命格，未填寫時退回甲木預設值
- [x] 新增 getDailyTenGodAnalysisDynamic() 和 getTenGodDynamic()（tenGods.ts），支援任意日主的動態計算
- [x] 修改 calculateWeightedElements() 接受可選的動態 natalRatio 參數（wuxingEngine.ts）
- [x] Onboarding Modal：新增 OnboardingModal.tsx 組件，登入且啟用但 displayName 未填寫時自動彈出引導填寫命格資料
- [x] 整合 OnboardingModal 到 AccessGate.tsx，全站生效
- [x] 新增 ProfileIncompleteBanner.tsx 組件（命格資料完整性提示橫幅）
- [x] 在 WarRoom、OracleCast、LotteryOracle、OracleCalendar、WeeklyReport 五個主要功能頁面加入 ProfileIncompleteBanner

## 功能增強 v2.39 - 進階商業化三項功能

- [ ] 後端算法全面去個人化：lotteryAlgorithm.ts 接受動態命格參數
- [ ] 後端算法全面去個人化：storeResonance.ts 接受動態命格參數
- [ ] 後端算法全面去個人化：hourlyEnergy.ts 接受動態命格參數
- [ ] 對應路由（oracle.cast、warRoom.hourlyEnergy 等）改為 protectedProcedure 並傳入動態命格
- [ ] Onboarding 完成後觸發歡迎通知給管理員（notifyOwner）
- [ ] ProfilePage.tsx 動態化：從 userProfiles 讀取命格資料，動態顯示五行圓餅圖和八字四柱

## 緊急修正 v2.40 - 多用戶商業化問題

- [ ] 清空 MyProfile 表單預填值（不應顯示任何人的資料）
- [ ] Onboarding 改為只填姓名/生日時辰/出生地，系統自動推算四柱八字與五行命格
- [ ] 後端新增八字推算 API（根據出生年月日時辰推算四柱、五行比例、喜忌神）
- [ ] 作戰室：命格未填寫時顯示「請先完成命格設定」提示，不使用他人命格計算

## 緊急修正 v2.40 - 多用戶商業化 + 隱私保護

- [ ] 清除資料庫中蘇先生的個人命格資料（避免其他用戶看到他人資料）
- [ ] 全站掃描並移除「主帳號可查看」等隱私疑慮文字
- [ ] 後端建立 account.calculateBazi API（生日時辰 → 四柱八字、五行比例、喜忌神自動推算）
- [ ] 重設計 Onboarding：只填姓名/生日時辰/出生地，系統自動推算命格，移除手動填寫八字欄位
- [ ] 重設計 MyProfile：移除手動填寫四柱/日主/喜忌神欄位，改為顯示系統推算結果
- [ ] 作戰室：命格未填寫時顯示「請先完成命格設定」提示，不使用預設命格計算

## 緊急修正 v2.41 - 用戶體驗重設計

- [ ] 改寫 OnboardingModal：只填姓名/生日/出生地，系統自動推算命格（移除手動選五行）
- [ ] 改寫 MyProfile 表單：移除手動填寫八字欄位，改為填生日後自動推算
- [ ] 修正作戰室：非主帳號且命格未填寫時顯示「請先完成命格設定」提示
- [ ] 重設計首頁：其他用戶進入後首頁顯示命格功能（命格身份證）
- [ ] 底部導覽列：顯示所有功能並標示鎖定狀態（🔒），提示「請聯繫客服開通」

## 功能修正 v2.41 完成項目

- [x] 後端 account.previewBazi 改為接受 hourIndex（0-11 時辰索引）而非 HH:MM 字串
- [x] 後端 account.calculateAndSaveBazi 改為接受 hourIndex（0-11 時辰索引）
- [x] 修正 OnboardingModal.tsx TypeScript 錯誤（dayMasterElementChinese 不存在 → 改用 dayMasterStem + ELEMENT_ZH_MAP）
- [x] 改寫 MyProfile.tsx：移除手動填寫四柱/日主/喜忌神欄位，改為填生日後自動推算
- [x] MyProfile.tsx：出生時辰改為 12 時辰選擇器（子/丑/寅...亥）
- [x] MyProfile.tsx：顯示系統推算的四柱八字、日主五行、喜忌神（唯讀）
- [x] SharedNav.tsx UserMenu：主帳號隱藏「我的命格資料」選單項目
- [x] ProfileIncompleteBanner.tsx：主帳號不顯示命格未完整提示橫幅
- [x] 78 項測試全部通過，TypeScript 零錯誤

## 功能修正 v2.42 - 動態命格全面整合 + 主帳號 Onboarding 豁免

- [ ] AccessGate.tsx / OnboardingModal：主帳號（isOwner）不觸發 Onboarding 彈窗
- [ ] 確認 warRoom.dailyReport 已使用 ctx.user 動態命格（getUserProfileForEngine）
- [ ] 確認 warRoom.topicAdvice 已使用 ctx.user 動態命格
- [ ] 確認 warRoom.hourlyEnergy 已使用 ctx.user 動態命格
- [ ] 確認 lottery.generate 已使用 ctx.user 動態命格
- [ ] 確認 oracle.cast 已使用 ctx.user 動態命格
- [ ] 確認 oracle.dailyEnergy 已使用 ctx.user 動態命格
- [ ] 確認 oracle.hourlyEnergy 已使用 ctx.user 動態命格

## 功能修正 v2.42（更新）

- [ ] 首頁（/）改為預設顯示命格功能頁（/profile），擲筊改為 /oracle 路由
- [ ] AccessGate.tsx：主帳號（isOwner）不觸發 Onboarding 彈窗
- [ ] warRoom.purchaseAdvice 和 lottery.indexHistory 改為 protectedProcedure，使用動態命格取代靜態 FAVORABLE_ELEMENTS
- [ ] 確認 oracle.cast 和 oracle.dailyEnergy 也使用動態命格

## 功能修正 v2.42 - 動態命格全面整合 + 主帳號 Onboarding 豁免

- [x] 首頁（/）改為顯示命格身份證（ProfilePage），擲筊移至 /oracle
- [x] SharedNav 更新路由（命格 → /，擲筊 → /oracle）
- [x] AccessGate：主帳號（isOwner）不觸發 Onboarding 彈窗
- [x] 後端 lottery.purchaseAdvice 改為 protectedProcedure，使用登入者動態命格計算喜忌分數
- [x] 後端 lottery.indexHistory 改為 protectedProcedure，使用登入者動態命格計算分數
- [x] 後端 warRoom.topicAdvice 改為 protectedProcedure，LLM prompt 改用動態命格（移除硬編碼「蘇祐震甲木日主」）
- [x] wuxingEngine.ts 移除硬編碼「甲木日主」文字
- [x] TypeScript 零錯誤，78 項測試全部通過

## 功能修正 v2.43 - 命格頁完善 + 動態化 + 提示 + 通知

- [x] 主帳號（isOwner）命格頁：直接顯示靜態命格資料（甲木日主、四柱、五行比例等），不顯示「尚未建立命格檔案」提示
- [x] ProfilePage 動態化：其他用戶從 DB 讀取自己的四柱和五行比例顯示（有資料則顯示，無資料則顯示引導設定）
- [x] 作戰室加入「命格未設定，分析結果僅供參考」提示卡片（非主帳號且 dayMasterElement 為空時）
- [x] 選號頁加入「命格未設定，分析結果僅供參」提示卡片（ProfileIncompleteBanner 已存在）
- [x] Onboarding 完成後呼叫 notifyOwner 發送 Mail 通知（首次建立時通知）
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.43 checkpoint

## 功能改造 v2.44 - 通知功能改為發給每位登入用戶自己的 Mail

- [ ] 研究 Manus 通知 API 是否支援發給指定用戶（非只有 Owner）
- [ ] 晨報推播（warRoom.notifyBestHour）改為發給當前登入用戶的 Mail
- [ ] Onboarding 完成通知：發給主帳號（Owner）知道有新用戶完成設定（保留 notifyOwner）
- [ ] 評估每日晨報是否可讓每位用戶自行訂閱（設定頁面加入「訂閱晨報」開關）
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.44 checkpoint

## 功能審查 v2.45 - 全系統命格來源全面審查與修正

- [ ] 審查 calendar.monthly / calendar.dayDetail API（日曆頁）是否使用登入者動態命格
- [ ] 審查 oracle.cast / oracle.dailyEnergy / oracle.hourlyEnergy 是否使用登入者動態命格
- [ ] 審查 weeklyReport.sevenDays 是否使用登入者動態命格
- [ ] 審查 warRoom.hourlyEnergy 是否使用登入者動態命格
- [ ] 審查 lottery.generate / lottery.bestTime 是否使用登入者動態命格
- [ ] 修正所有仍使用硬編碼或 userProfile.ts 預設命格的 API
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.45 checkpoint

## 功能修正 v2.46 - 全系統命格動態化 + 通知發給用戶自己

- [ ] 研究 Manus 通知 API 是否支援發給指定用戶（非僅 Owner）
- [ ] 修正 weeklyReport.sevenDays：改為 protectedProcedure，使用登入者動態命格計算七天能量分數
- [ ] 修正 calendar.monthly：購彩指數 ELEMENT_ZH_SCORE 改為根據登入者喜忌神動態計算
- [ ] 修正 insight.deepRead：LLM prompt 改為動態讀取登入者命格（移除硬編碼「蘇发震先生」）
- [ ] 通知功能改為發給每位用戶自己的 Manus Mail（晨報、最佳時辰通知等）
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.46 checkpoint

## 功能新增 v2.47 - 主帳號刪除用戶帳號權限

- [ ] 後端新增 admin.deleteUser API（adminProcedure，刪除用戶及其所有關聯資料）
- [ ] 前端帳號管理頁面（AccountManager.tsx）新增刪除按鈕和確認對話框
- [ ] 刪除時同步刪除 userProfiles、oracleSessions、lotterySessions 等關聯資料
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 V2.47 checkpoint

- [x] 後端新增 account.deleteSelf API（用戶自行刪除自己的帳號及所有資料）
- [x] 前端 MyProfile 頁底部新增「刪除帳號」入口（紅色危險區塊，需二次確認）
- [x] 刪除後清除 session cookie 並重導向至登入頁

## 功能修正 v2.48 - 作戰室動態化 + 通知Mail隱藏 + MyProfile修正

- [ ] 作戰室塔羅流日牌：移除計算方式顯示文字（僅主帳號可見），確認生日來源是登入者自己的
- [ ] 作戰室全天時辰能量時間軸：確認跟著登入者自己的生辰八字走
- [ ] 作戰室「通知 Mail」按鈕：非主帳號用戶隱藏此按鈕
- [ ] 作戰室生命靈數與塔羅原型：根據登入者出生日期動態計算（非靜態主帳號資料）
- [ ] MyProfile 頁標題：顯示用戶自填的 displayName，而非 Manus 帳號名
- [ ] MyProfile 農曆生日 placeholder：改為通用說明文字，移除「甲子年 閏十月 初四日」
- [ ] 帳號管理頁顯示用戶最後登入時間

## 功能修正 v2.49 - AccountManager 最後登入時間 + 確認動態化狀態
- [x] AccountManager 用戶卡片顯示最後登入時間（lastSignedIn 欄位）
- [x] 確認 ProfilePage 生命靈數已動態化（所有用戶基於自己的 birthDate 計算）
- [x] 確認 War Room 時辰能量已動態化（登入用戶使用個人喜用神計算）
- [x] TypeScript 零錯誤，78 項測試全部通過
- [x] 儲存 V2.49 checkpoint

## 功能修改 v2.51
- [ ] 導覽列移除「週報」和「統計」，移入個人下拉選單並改名（刮刮樂驗證/擲筊分析）
- [ ] 個人下拉選單加入「加入主畫面教學」頁面
- [ ] 導覽列圖示放大 20%，支援左右滑動
- [ ] 更新網站 meta 描述（面向大眾）

## 功能修正 v2.51 - 導覽列與個人選單優化
- [x] 週報/統計從主導覽列移至個人下拉選單
- [x] 週報改名為「刮刮樂驗證」，統計改名為「擲筊分析」
- [x] 新增「加入手機主畫面」教學頁面（/add-to-home）
- [x] 導覽列圖示放大 20%，支援左右滑動
- [x] 更新 meta 描述為面向大眾的文案，加入 OG 標籤和 PWA 支援

## 功能修正 v2.52 - 手機導覽列大改版
- [ ] 手機底部列左右滑動修正（確認觸發條件）
- [ ] 手機底部列改為居中對齊
- [ ] 功能列圖示再放大 1 倍（桌機+手機）
- [ ] 手機功能列移至頂部 Header 下方
- [ ] 作戰室改名為「每日運勢」並設為首頁
- [x] 修正分頁標題（<title>）為「天命共振 - 命理能量系統」
- [x] 修正 OG/網站預覽描述為面向大眾的文案

## 商業化第一階段 v2.53 - 儀表板、用戶洞察與積分激勵基礎建設

### 資料庫 Schema 擴充
- [ ] 新增 plans 資料表（會員方案：basic/advanced/professional）
- [ ] 新增 features 資料表（功能模組管理，含所需方案等級）
- [ ] 新增 pointsTransactions 資料表（積分流水帳）
- [ ] 擴充 users 表：加入 planId、planExpiresAt、pointsBalance 欄位
- [ ] 擴充 userProfiles 表：加入 lifePathNumber 欄位（生命靈數，用於篩選）
- [ ] 執行 pnpm db:push 遷移

### 後端 API
- [ ] 新增 dashboard.getKpis（管理員：總用戶數、活躍用戶、方案分佈）
- [ ] 新增 dashboard.getHourlyActivity（管理員：24小時活躍時段分析）
- [ ] 新增 account.listUsersFiltered（管理員：進階篩選+分頁用戶列表）
- [ ] 新增 points.getSigninStatus（用戶：查詢今日是否已簽到）
- [ ] 新增 points.claimDailyPoints（用戶：每日簽到領取10積分）

### 前端頁面
- [ ] 新增管理員儀表板頁面 /admin/dashboard（KPI 卡片 + 活躍時段圖表）
- [ ] 升級帳號管理頁面：加入篩選器（生命靈數/方案/最後上線）
- [ ] 升級帳號管理頁面：用戶卡片顯示方案和積分餘額
- [ ] 升級帳號管理頁面：加入分頁功能
- [ ] 新增每日簽到組件（放在每日運勢頁面顯眼處）
- [ ] 簽到組件邏輯：未簽到顯示可點擊按鈕，已簽到顯示灰色已完成狀態

## 商業化第一階段 v2.53 - 儀表板、用戶洞察與積分系統

### 資料庫擴充
- [x] 新增 plans（會員方案）資料表（basic/advanced/professional）
- [x] 新增 features（功能模組）資料表
- [x] 新增 pointsTransactions（積分流水帳）資料表
- [x] 擴充 users 表：planId、planExpiresAt、pointsBalance 欄位
- [x] 擴充 userProfiles 表：lifePathNumber 欄位
- [x] 植入預設 plans 資料（3 個方案）

### 後端 API
- [x] 管理員儀表板 KPI API（總用戶、活躍、方案分佈、積分統計）
- [x] 24 小時活躍時段分析 API（台灣時間，近 30 天）
- [x] 進階用戶篩選 API（生命靈數/方案/最後上線/名稱搜尋 + 分頁）
- [x] 每日簽到 API（每日限一次，+10 積分）
- [x] 積分餘額查詢 API + 最近交易記錄

### 前端頁面
- [x] 管理員儀表板頁面（/admin/dashboard）
- [x] 帳號管理頁面升級：方案/積分顯示、篩選器、分頁
- [x] DailySignin 每日簽到組件（嵌入每日運勢頁面）

### 測試
- [x] 積分系統 vitest 測試（13 個測試案例）
- [x] 91 項測試全部通過，TypeScript 零錯誤

## 每日簽到彈窗改版

- [x] 建立 DailySigninModal 彈窗組件（自動彈出、動畫、積分領取）
- [x] App.tsx 層級整合：登入後偵測未簽到自動彈出
- [x] 移除 WarRoom 頁面的嵌入式 DailySignin 橫幅

## Bug 修正 - AccountManager 巢狀 button 錯誤

- [x] 修復 AccountManager.tsx 中 button 內含 button 的 DOM 巢狀錯誤

## 主帳號選單重新設計 + 舊帳號管理移除

- [x] 找出並讀取主帳號下拉選單組件
- [x] 重新設計主帳號選單（視覺升級、加入管理員儀表板入口）
- [x] 移除選單中舊的「帳號管理」連結
- [x] 移除 App.tsx 中舊 AccountManager 路由
- [x] 修復 AccountManager 巢狀 button 錯誤（外層 button 改為 div）
