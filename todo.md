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

## Bug 修正 - 管理員儀表板 KPI 全部顯示 0

- [x] 診斷 dashboard router 查詢錯誤原因
- [x] 修復 KPI 查詢（總用戶、已啟用、本週新增、今日活躍）
- [x] 修復活躍時段分析查詢
- [x] 修復方案分佈查詢
- [x] 修復用戶篩選列表查詢

## Bug 修正 - /account-manager 和 /permissions 頁面錯誤

- [ ] 診斷 /account-manager 頁面錯誤
- [ ] 診斷 /permissions 頁面錯誤
- [ ] 修復兩個頁面的所有錯誤

## 管理後台架構重整

- [x] 建立 AdminLayout 側邊欄組件（儀表板/用戶管理/權限管理）
- [x] 建立 /admin/users 用戶管理頁面（篩選器+分頁+積分/方案顯示）
- [x] AdminDashboard 套用 AdminLayout 側邊欄
- [x] 更新 App.tsx 路由（加入 /admin/users）
- [x] 修正 AdminDashboard 快速操作卡片連結

## 大型升級 - 邀請碼移除 + 靈數邏輯 + 用戶管理 + 權限管理升級

- [ ] 移除邀請碼保護鎖（AccessGate、後端驗證、相關 UI）
- [ ] 修正生命靈數計算邏輯（塔羅牌 0-22 體系，超過22才相加）
- [ ] 「內層靈數」改名「主要靈數」，改為中層靈數+年度靈數
- [ ] 更新 /profile 頁面靈數顯示與計算
- [ ] /admin/users 靈數篩選改為 0-22 共23個數字
- [ ] 用戶管理預設排序：最後上線降序
- [ ] 用戶管理列表直接顯示最後上線時間（不需展開）
- [ ] PermissionManager 全局即時搜尋（前端驅動）
- [ ] PermissionManager 統一截止日期選擇器
- [ ] PermissionManager 快速續約按鈕（+1個月/+3個月/+1年）
- [ ] PermissionManager 緊湊網格佈局（2-3欄）
- [ ] PermissionManager 分類篩選按鈕 + 全選此分類
- [ ] PermissionManager 功能開關自動套用統一截止日期

## 大型升級 v2.53 - 邀請碼移除 + 靈數邏輯 + 用戶管理 + 權限管理升級

- [x] 移除邀請碼保護鎖（AccessGate 改為純登入閘）
- [x] 後端 getStatus 修正為所有登入用戶 isActivated=true
- [x] 生命靈數計算改為塔羅牌 0-22 體系（超過22才相加）
- [x] 「內層靈數」改名「主要靈數」
- [x] /admin/users 生命靈數篩選擴展為 0-22（含靈數 0 小愚者標籤）
- [x] 後端 listUsersFiltered lifePathNumber 範圍改為 min(0) max(22)
- [x] 用戶管理預設排序為最後上線降序（後端已有 ORDER BY lastSignedIn DESC）
- [x] PermissionManager 全面升級：即時搜尋、統一截止日期控制器、快速續約、緊湊網格佈局、分類篩選+批量勾選
- [x] PermissionManager 套用 AdminLayout 側邊欄

## 鳳凰計畫 - SaaS 商業邏輯重構

### 資料庫 Schema
- [ ] 新增 modules 表（功能模塊：id/name/description/icon/category/sort_order/contained_features）
- [ ] 改造 plans 表（新增 level/is_active 欄位）
- [ ] 新增 plan_modules 表（方案-模塊多對多關聯）
- [ ] 新增 campaigns 表（行銷活動：rule_type/rule_target/rule_value）
- [ ] 新增 user_subscriptions 表（用戶訂閱：plan_id/plan_expires_at/custom_modules）

### 後端 API
- [ ] 建立 server/routers/businessHub.ts（admin 保護路由）
- [ ] businessHub.modules.list / updateOrder
- [ ] businessHub.plans.list / create / update
- [ ] businessHub.campaigns.list / create / update
- [ ] 建立 server/PermissionService.ts（hasAccess 統一權限檢查）

### 前端「商業中心」
- [ ] 安裝 dnd-kit 拖拽庫
- [ ] 建立 /admin/business-hub 頁面（Tabs 佈局）
- [ ] 頁籤一：模塊管理器（拖拽排序）
- [ ] 頁籤二：方案與定價（卡片+模塊複選框）
- [ ] 頁籤三：行銷活動（折扣/贈送規則編輯器）
- [ ] AdminLayout 側邊欄加入「商業中心」入口
- [ ] App.tsx 加入 /admin/business-hub 路由

## 鳳凰計畫 Phase 2 - SaaS 訂閱系統完整實作

### 資料庫（已於 Phase 1 完成）
- [x] 新增 subscription_logs 表（審計日誌：operatorId/targetUserId/action/details）
- [x] 新增 redemption_codes 表（兌換碼：campaignId/code/isUsed/isVoided/usedBy/usedAt）
- [x] users 表新增 availableDiscounts 欄位（JSON 折扣券儲存）

### 後端 API
- [x] businessHub.assignSubscription（完整指派訂閱：主方案+自訂模塊+審計日誌+同步users表）
- [x] businessHub.listSubscriptionLogs（查看訂閱審計日誌）
- [x] businessHub.generateRedemptionCodes（批量產生兌換碼，支援前置碼）
- [x] businessHub.listRedemptionCodes（列出活動兌換碼）
- [x] businessHub.voidRedemptionCode（作廢兌換碼）
- [x] businessHub.redeemCode（用戶兌換碼，支援 giveaway/discount 兩種規則）

### 前端
- [x] AdminUsers：展開詳情加入「管理訂閱」按鈕
- [x] AdminUsers：訂閱管理 Modal（方案選擇/到期日/自訂模塊/備注）
- [x] SharedNav：用戶下拉選單加入「輸入兌換碼」入口（展開式輸入框）
- [x] AdminBusinessHub：行銷活動卡片下方加入兌換碼管理面板
- [x] 兌換碼面板：產生碼（前置碼+數量）、即時顯示新碼（可點擊複製）、碼列表（可作廢）

### 品質保證
- [x] TypeScript 零錯誤
- [x] 91 項測試全部通過
- [x] 儲存 Phase 2 checkpoint

## 鳳凰計畫 Phase 3 - 模塊化接管全系統

### 後端
- [ ] 新增 modules.getVisibleNav API（依 sort_order 返回模塊列表 + hasAccess 布爾值）
- [ ] 重構 auth.me：加入 planName 欄位（從 user_subscriptions + plans 查詢）
- [ ] 強制替換所有後端路由的舊權限邏輯為 PermissionService.checkAccess
- [ ] 移除 /permission-manager 相關後端 API

### 前端
- [ ] SharedNav 動態導航重構（從 modules.getVisibleNav 取列表，hasAccess=false 顯示鎖定）
- [ ] UserMenu 顯示 planName 會員身份（取代寫死「一般會員」）
- [ ] 退役 /permission-manager：移除 AdminLayout 側邊欄入口、刪除頁面組件
- [ ] 訂閱日誌分頁（AdminUsers 展開詳情加入「訂閱記錄」Tab）
- [ ] 兌換碼 CSV 匯出按鈕（AdminBusinessHub 兌換碼面板）
- [ ] 每日到期提醒排程（後端定時任務，7天內到期 notifyOwner）

## 鳳凰計畫 Phase 3 - 模塊化接管全系統

- [x] modules 表加入 navPath 欄位（DB 遷移完成）
- [x] 後端 modules.getVisibleNav API（依 PermissionService 判斷 hasAccess）
- [x] auth.me 加入 planName 欄位（從 user_subscriptions + plans 查詢）
- [x] permissions.myFeatures 改用 PermissionService（廢棄舊 user_permissions 表查詢）
- [x] SharedNav 動態導航重構（從 getVisibleNav API 取模塊列表，依 hasAccess 顯示鎖定/正常狀態）
- [x] UserMenu 顯示 planName 會員身份（取代寫死的「一般會員」）
- [x] 退役 /permission-manager（移除路由、刪除頁面檔案、移除 AdminLayout 側邊欄入口、AdminDashboard 快捷卡片改為商業中心）
- [x] 訂閱日誌展開面板（AdminUsers 展開詳情加入 SubscriptionLogsPanel）
- [x] 兌換碼 CSV 匯出（RedemptionCodesPanel 加入匯出按鈕，含 BOM 支援中文）
- [x] 每日 09:00 到期提醒排程（server/lib/expiryReminder.ts + server/_core/index.ts 整合）
- [x] TypeScript 零錯誤，91 項測試全部通過

## 鳳凰計畫 Phase 4 - 體驗革命與架構深化

- [ ] DB：modules 表加入 navPath / is_central / parent_id 欄位
- [ ] BusinessHub 模塊編輯彈窗加入 navPath 輸入框與 is_central 開關
- [ ] 新建 /outfit 補運穿搭獨立頁面（遷移作戰室手串矩陣+穿搭建議+五行總覽）
- [ ] 新建 /diet 飲食羅盤獨立頁面（遷移作戰室飲食建議+五行總覽）
- [ ] 新建 /divination 天命問卜獨立頁面（遷移作戰室天命問卜組件）
- [ ] 新建 /luck-cycle 大限流年獨立頁面（遷移命格頁流年分析）
- [ ] 清除作戰室/命格頁中已遷移的舊組件代碼
- [ ] 首頁輪播導航革命（Embla Carousel + Cover Flow 效果）
- [ ] is_central 眾星拱月佈局（中央固定模塊 + 左右輪播）
- [ ] AdminUsers 批量訂閱 checkbox + 批量 assignSubscription API
- [ ] AdminUsers lastSignedIn 精確到分鐘顯示
- [ ] 靈數篩選器加入塔羅牌名（靈數1魔術師...靈數9隱者）
- [ ] BusinessHub 模塊父子層級樹狀視圖 + 拖拽排序
- [ ] parent_id 後端 API（updateModuleParent）
- [ ] TypeScript 零錯誤，測試全部通過
- [ ] 儲存 Phase 4 checkpoint

## 鳳凰計畫 Phase 4 - 體驗革命與架構深化

- [x] DB 升級：modules 表加入 is_central / parent_id
- [x] BusinessHub 模塊編輯彈窗加入 navPath 輸入框、isCentral 開關、parentId 選單
- [x] 新建 /outfit 獨立頁面（補運穿搭 + 手串推薦）
- [x] 新建 /divination 獨立頁面（天命問卜）
- [x] 新建 /luck-cycle 獨立頁面（大限流年）
- [x] 首頁 Cover Flow 輪播導航（Embla Carousel + ModuleCarousel 組件）
- [x] 批量訂閱 checkbox + batchAssignSubscription API
- [x] lastSignedIn 精確到分鐘顯示
- [x] 靈數篩選器加入塔羅牌名
- [x] 模塊管理器升級為 @dnd-kit 樹狀視圖拖拽排序
- [x] 91 項測試全部通過，TypeScript 零錯誤

## 鳳凰計畫 Phase 4 修正 - 2026-02-26（沙盒重置後重新套用）
- [x] WarRoom.tsx 清理：移除 outfit/wealth Tab 及底部快捷按鈕，修復 JSX 結構，移除 ModuleCarousel 重複引用
- [x] WarRoom.tsx Tab 精簡為 3 個：英雄劇本、塔羅流日、時辰能量
- [x] OutfitPage.tsx 重構：五行加權總覽移至頂部常駐顯示，移除飲食 Tab，Tab 精簡為穿搭建議+手串矩陣
- [x] 新建 DietPage.tsx（/diet 獨立飲食羅盤頁面）
- [x] App.tsx 加入 /diet 路由
- [x] 資料庫新增 module_diet 模塊（navPath=/diet, icon=🍽️, sortOrder=45）
- [x] SharedNav FALLBACK_NAV 更新：加入 outfit 和 diet 模塊，warroom 設為 isCentral
- [x] TypeScript 零錯誤驗證通過

## 鳳凰計畫 Phase 5 - 自動化迎新與體驗升華（2026-02-26 完成）

- [x] campaigns 表新增 isDefaultOnboarding 欄位（boolean，唯一性約束）
- [x] db.ts 新增 applyDefaultOnboardingCampaign 函數（支援 giveaway/discount 兩種活動類型）
- [x] oauth.ts 在新用戶首次登入後自動觸發迎新活動套用
- [x] businessHub router 新增 setDefaultOnboarding / clearDefaultOnboarding 程序
- [x] AdminBusinessHub CampaignsTab 新增「設為迎新活動」按鈕與橘色標籤
- [x] 安裝 lunar-typescript 套件（支援 1900-2100 年精確農曆換算）
- [x] routers.ts 新增 utils.toLunar 程序（使用 lunar-typescript 精確換算）
- [x] MyProfile 出生日期輸入框下方新增農曆即時換算顯示
- [x] OnboardingModal 出生日期輸入框下方新增農曆即時換算顯示

## 鳳凰計畫 Phase 6 - 補運餐食・生活融合

- [ ] 修正 NearbyRestaurants 硬編碼命格：ELEMENT_MATCH_SCORE 改為依用戶 favorableElements 動態計算
- [ ] 新建 weatherEngine.ts：天氣 API 接入 + 天氣五行映射規則
- [ ] 升級 wuxingEngine.ts：新公式（本命30%+環境50%+天氣20%）+ calculateResonanceScore 函數
- [ ] 改造 generateDietaryAdvice：新增 planB 陣列（五行補運指數）
- [ ] 全面重塑 DietPage 為「補運餐食」：品牌化、補運指數儀表盤、高級篩選面板、價格顯示
- [ ] 改造 NearbyRestaurants：高級搜尋表單（分類/距離/價格篩選）、補運指數標籤、價格標籤

## 鳳凰計畫 Phase 6 - 飲食羅盤命格個人化修正

- [x] 修正 NearbyRestaurants 硬編碼問題：ELEMENT_MATCH_SCORE 改為依用戶喜用神動態計算
- [x] 新增 buildElementMatchScore 函數：第1喜神=100, 第2喜神=80, 第3喜神=60, 中性=40, 第1忌神=20, 第2忌神=10
- [x] dailyReport API 新增 favorableElements 和 unfavorableElements 欄位回傳
- [x] DietPage 傳入 favorableElements/unfavorableElements 至 NearbyRestaurants
- [x] calcFengShui 函數改為接受 elementMatchScore 參數，不再依賴全域常數

## 鳳凰計畫 Phase 6 - 補運餐食・生活融合（2026-02-26）
- [x] 建立 weatherEngine.ts（Open-Meteo 免費 API，天氣→五行映射）
- [x] 升級 wuxingEngine.ts（三維加權公式：本命30%+環境50%+天氣20%，calculateResonanceScore，planB 陣列）
- [x] 更新 dailyReport 整合 weatherEngine，回傳 planB + favorableElements + weatherInfo
- [x] 全面重塑 DietPage（補運指數儀表盤、planB 切換、天氣資訊列、呼吸感版面）
- [x] 升級 NearbyRestaurants（進階篩選 Sheet、距離/分數/五行/吉方篩選、補運指數圓形進度條、大型視覺卡片、framer-motion 動畫）
- [x] 修正 NearbyRestaurants ELEMENT_MATCH_SCORE 硬編碼→依用戶喜用神動態計算

## 鳳凰計畫 Phase 6 - 補運餐食・生活融合（2026-02-26）
- [x] 建立 weatherEngine.ts（Open-Meteo 免費 API，天氣→五行映射）
- [x] 升級 wuxingEngine.ts（三維加權公式：本命30%+環境50%+天氣20%，calculateResonanceScore，planB 陣列）
- [x] 更新 dailyReport 整合 weatherEngine，回傳 planB + favorableElements + weatherInfo
- [x] 全面重塑 DietPage（補運指數儀表盤、planB 切換、天氣資訊列、呼吸感版面）
- [x] 升級 NearbyRestaurants（進階篩選 Sheet、距離/分數/五行/吉方篩選、補運指數圓形進度條、大型視覺卡片、framer-motion 動畫）
- [x] 修正 NearbyRestaurants ELEMENT_MATCH_SCORE 硬編碼→依用戶喜用神動態計算

## 鳳凰計畫 Phase 6+ - 餐廳篩選系統完整化（2026-02-26）
- [ ] 後端 map.ts 改造：接收 types/priceLevel 篩選條件傳入 Google Places API
- [ ] 前端 NearbyRestaurants：完整分類標籤多選（15+類型）和價格標籤多選
- [ ] 定位授權引導優雅降級（拒絕定位時顯示提示）
- [ ] planB 故事性文案（今日備選方案敘事）
- [ ] 餐廳分享功能（生成補運指數圖片卡片）

## 鳳凰計畫 Phase 6+ - 餐廳篩選系統完整化（2026-02-26）
- [x] NearbyRestaurants 分類標籤多選（19種類型，對應 Google Places API includedTypes）
- [x] NearbyRestaurants 價格標籤多選（$/$$/$$$/$$$$，對應 priceLevel 1-4）
- [x] 搜尋時動態傳入 includedType 和 priceLevel 篩選條件至 Places API
- [x] 進階篩選 Sheet 整合分類+價格+距離+補運分數+五行+吉方篩選
- [x] 分享功能（navigator.share / clipboard）含補運指數和 hashtag

## 鳳凰計畫 Phase 6+ - 餐廳篩選系統完整化（2026-02-26）
- [x] NearbyRestaurants 分類標籤多選（19種類型，對應 Google Places API includedTypes）
- [x] NearbyRestaurants 價格標籤多選（$/$$/$$$/$$$$，對應 priceLevel 1-4）
- [x] 搜尋時動態傳入 includedType 和 priceLevel 篩選條件至 Places API
- [x] 進階篩選 Sheet 整合分類+價格+距離+補運分數+五行+吉方篩選
- [x] 分享功能（navigator.share / clipboard）含補運指數和 hashtag

## 飲食羅盤 Bug 修復（2026-02-26）

- [x] 修復 wuxingEngine.ts SUPPLEMENT_PRIORITY 硬資料：generateDietaryAdvice / generateOutfitAdviceV9 / recommendBraceletsV9 三函數改為接受動態 supplementPriority 參數
- [x] 修復 routers.ts dailyReport：呼叫三函數時傳入 engineProfile.favorableElements，不再使用蘇先生的硬常數
- [x] 修復 db.ts getUserProfileForEngine：當 dayMasterElement 為空但 dayPillar 有資料時，嘗試從 dayPillar 推算，不直接退回 DEFAULT
- [x] 修復 NearbyRestaurants 篩選器：分類改為單選模式，點選後立即觸發重新搜尋（使用 filterCategoryRef 避免 stale closure）
- [x] 修復 handleMapReady：使用 filterCategoryRef.current 讀取最新分類，不再依賴 filterCategories state
- [x] 移除 toggleCategory 多選函數，改為 handleCategorySelect 單選函數（點選即搜尋）
- [x] 價格篩選保持前端過濾（不需重新搜尋 API）
- [x] TypeScript 零錯誤，91 項測試全部通過

## 全系統硬資料修復 v2.25（2026-02-26）

- [x] 診斷根本原因：wuxingEngine.ts SUPPLEMENT_PRIORITY 常數為蘇先生硬資料
- [x] wuxingEngine.generateDietaryAdvice 接受動態 supplementPriority 參數
- [x] wuxingEngine.generateOutfitAdviceV9 接受動態 supplementPriority 參數
- [x] wuxingEngine.recommendBraceletsV9 接受動態 supplementPriority 參數
- [x] routers.ts 所有呼叫傳入 engineProfile.favorableElements
- [x] lunarCalendar.ts 新增 getDayPillarDynamic（接受用戶喜忌神）
- [x] 命理日曆月曆改用 getDayPillarDynamic（/calendar）
- [x] 命理日曆購彩指數改用 getTenGodDynamic（/calendar）
- [x] yearlyAnalysis.calcTarotYear 接受動態 middleNumber（從出生日期計算）
- [x] yearlyAnalysis.calcMonthScore 接受動態喜忌神評分
- [x] yearlyAnalysis.getYearlyAnalysis 接受用戶命格參數
- [x] profile.yearlyAnalysis 改為 protectedProcedure + 動態命格（/luck-cycle）
- [x] ScratchAnalysis.tsx 地址分析說明文字改為動態日主顯示（/lottery）
- [x] 確認 oracleAlgorithm.ts / warRoomEngine.ts 的 FAVORABLE_ELEMENTS import 未實際使用（安全）
- [x] 91 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V2.25 checkpoint

## 飲食羅盤篩選器修復 + 彩券行地圖功能（2026-02-26）

- [ ] 修復分類搜尋卡住問題（點選分類後搜尋無結果）
- [ ] 修復價格區間篩選（改為前端過濾，無價格資料的餐廳不受影響）
- [ ] 修復五行屬性篩選（連接過濾邏輯，可切換五行）
- [ ] 實作補運樂透附近彩券行地圖大功能（風水位置+命格+環境+天氣比對）

## 飲食羅盤地圖升級 + NearbyStores 修復（2026-02-26）

- [x] 飲食羅盤加入互動地圖（餐廳標記，顏色依補運等級/吉凶區分，點擊顯示資訊視窗）
- [x] 飲食羅盤加入天氣五行加成顯示（weatherEnabled prop 傳入，標題列顯示「天氣加成」標籤）
- [x] 飲食羅盤餐廳卡片加入方位五行、地址五行、店名五行三維分析（點擊「三維分析」展開）
- [x] 修復 NearbyStores 硬編碼「命格用神：火土」→ 改為動態用神（scoreStores API 回傳 favorableElements）
- [x] 飲食羅盤地圖/列表切換按鈕（地圖可顯示/隱藏）
- [x] 飲食羅盤補運指數三維加權說明橫幅（方位40%+地名20%+料理40%）
- [x] 飲食羅盤依命格動態計算五行匹配分數（不再硬編碼）

## 飲食羅盤地圖 Bug 修復（2026-02-26）

- [x] 修復雙重 MapView 導致 Google Maps API 重複載入（移除隱藏的第二個 MapView）
- [x] 修復 setMap: not an instance of Map 錯誤（提取 doSearch 共用邏輯，防止 handleMapReady 被呼叫多次）
- [x] 修復 LatLngBounds 格式錯誤（改用 new google.maps.LatLng() 封裝）
- [x] 修復 drawMarkers 用戶位置標記（改為接收 userLoc 參數，不再依賴 state closure）

## 全站安全性 + 飲食羅盤修復 + 彩券行升級（2026-02-26）

- [x] 全站掃描並隱藏所有對用戶端可見的加權百分比公式（NearbyRestaurants 橫幅、卡片標籤、LotteryOracle 偶財公式全部移除）
- [x] 隱藏飲食羅盤「三維加權說明橫幅」中的百分比
- [x] 隱藏飲食羅盤三維分析卡片中的百分比標籤
- [x] 掃描 NearbyStores 加權公式外露（無百分比）
- [x] 掃描其他頁面加權公式外露（LotteryOracle.tsx 偶財公式移除）
- [x] 修復飲食羅盤分類關鍵字（素食改用 textSuffix、速食改用「連鎖快餐」、西式改用「西式餐廳」）
- [x] 移除飲食羅盤價格區間篩選（移除 PRICE_TAGS、filterPriceLevels state、篩選面板 UI）
- [x] 修復飲食羅盤五行屬性篩選（改為匹配方位/地名/類型三維任一）
- [x] 升級彩券行地圖（360px 放大、彩色標記依共振指數、點擊顯示資訊視窗、地圖/列表切換）
- [x] 彩券行加入「最佳購彩時段」推薦（結合時辰能量，顯示時辰名、時間、吉凶等級）
- [x] 天氣五行實際納入補運指數計算（天氣主導五行與命格匹配則加分，最多 +10）
- [x] 彩券行加入三維分析展開卡片（方位五行、門牌對應五行、店名匹配五行）
- [x] 彩券行加入「今日最強彩券行」排行榜（Top 3，點擊對應地圖標記）

## 用戶系統大優化（2026-02-26）

### 導航清理
- [ ] 用戶下拉選單移除「刷刷樂驗證」和「擲筊分析」（已模塊化）
- [ ] 財運羅盤導航 Bug 修復（點選無法進入功能）

### 首登流程
- [ ] 新用戶首登完成三步驟後自動分配預設方案（後台可設定預設方案）
- [ ] 首登三步驟完成後自動將農曆/八字資料填入 /my-profile
- [ ] /business-hub 加入「新登入用戶預設方案」行銷活動設定（可指定方案、到期後退回基礎方案）

### /admin/users 優化
- [ ] 未展開卡片顯示最後上線時間（一目了然）
- [ ] 展開卡片移除「已啟用」欄位（舊邀請碼功能）
- [ ] 展開卡片角色顯示與方案一致
- [ ] 展開卡片生命靈數從 /profile 主要靈數欄位抓取（修復未計算問題）
- [ ] 分頁功能（可選 10/20/50/100 人/頁，顯示總用戶數）
- [ ] 管理訂閱方案選單與 /business-hub 方案串接（顯示最新方案）
- [ ] 建立客戶分群功能（建立/編輯群組、批量調整方案/積分/到期日）

### /profile 修復
- [ ] 命格備注區塊 Bug 修復（比對主帳號 vs 一般用戶資料來源差異）
- [ ] 移除已模塊化功能（大限流年提示區塊等）

### 每日運勢（原作戰室）
- [ ] 移除天命問卜區塊（已模塊化）

## 用戶系統大優化完成（2026-02-26）
### 導航清理
- [x] 用戶下拉選單移除「刷刷樂驗證」和「擲筊分析」（已模塊化）
- [x] 財運羅盤導航 Bug 修復（navPath 從 /?tab=wealth 改為 /lottery）
- [x] 每日運勢頁面移除「天命問卜」區塊（已模塊化）
### 首登流程
- [x] OnboardingModal 完成後自動傳入農曆字串（birthLunar）到 calculateAndSaveBazi
- [x] calculateAndSaveBazi 後端自動計算並儲存 birthLunar（農曆字串）
- [x] calculateAndSaveBazi 後端計算並儲存 lifePathNumber（生命靈數）
- [x] /business-hub 加入「指派方案」行銷活動類型（plan_assign），可設定新用戶迎新方案
- [x] applyDefaultOnboardingCampaign 支援 plan_assign 規則（新用戶自動分配方案）
### /admin/users 優化
- [x] 未展開卡片顯示最後上線時間（formatRelative，一目了然）
- [x] 展開卡片移除「已啟用」欄位（舊邀請碼功能）
- [x] 展開卡片角色顯示與方案一致（admin 顯示管理員，其他顯示方案名稱）
- [x] 展開卡片生命靈數從 profile.lifePathNumber 抓取
- [x] 分頁功能（可選 10/20/50/100 人/頁，顯示總用戶數）
- [x] pageSize max 從 50 升至 100
- [x] 管理訂閱方案選單動態從 businessHub.listPlans API 讀取
- [x] 建立客戶分群功能（DB schema: user_groups + user_group_members，完整 CRUD + 批量操作）
- [x] 客群分組頁面 /admin/user-groups（建立/編輯群組、批量調整方案/積分/到期日）
### /profile 修復
- [x] 移除大限流年「提示」區塊（圖9，已模塊化）
- [x] 命格備注區塊邏輯確認正確（根據 favorableElements/unfavorableElements 自動生成）

## 積分系統擴充（2026-02-26 第二輪）
- [x] 頂部導覽列顯示積分徽章
- [x] 每日登入簽到彈窗（修復 invalidate 邏輯）
- [x] AdminUsers 積分調整功能（PointsAdjustModal）
- [x] UserGroups 一鍵贈送積分（batchAdjustPoints API）
- [x] /divination 問卜扣除 10 積分
- [x] BusinessHub 方案新增/編輯加入「訂閱贈送積分」欄位
- [x] 指派方案時自動贈送 bonusPoints

## Bug 修復（2026-02-26 第二輪）
- [x] 建立分群 icon 欄位超長錯誤（varchar 10 → 50）
- [x] 生命靈數批量重算功能（AdminUsers 右上角按鈕）
- [x] 折疊卡片最後上線時間顏色修正（text-slate-200）
- [x] 新用戶首登自動分配基礎方案（OAuth callback 設定 planId=basic）
- [x] 後台 plan_assign 活動類型支援（BusinessHub campaigns）

## Bug 修復（2026-02-26 第三輪）
- [x] formatRelative() 時區問題修復：AdminUsers 已加入 Math.abs()，AdminUserGroups 同步修復（防止顯示負數天數）
- [x] AdminUsers「全選此頁」checkbox 功能確認已存在（全選/取消全選/半選三態）
- [x] UserGroups 新增成員 Modal 改為預設顯示所有用戶列表（不再需要先輸入搜尋才顯示）
- [x] UserGroups 新增成員 Modal 用戶列表加入邊框容器，視覺更清晰

## 功能升級 v3.0 - 累積簽到分級獎勵系統

- [x] 檢查每日簽到積分邏輯（後端固定 10 點，無 streak 追蹤）
- [x] 資料庫 schema 新增 signinStreak 欄位（users 表）並 db:push
- [x] 後端升級：calcSigninPoints() 分級（1-5天10點、6-19天15點、20天以上20點）
- [x] 後端升級：getTaiwanTodayStr / getTaiwanYesterdayStr 工具函數
- [x] 後端升級：getNextMilestone() 回傳下一里程碑資訊
- [x] 後端升級：claimDailyPoints 計算 newStreak、更新 lastDailyCheckIn、isStreakMilestone
- [x] 後端升級：getSigninStatus 回傳 streak / todayPoints / nextMilestone
- [x] 前端升級：DailySigninModal 三等級視覺化（青銅/白銀/黃金橫幅）
- [x] 前端升級：連續天數進度條 + 里程碑節點（第1/6/20/30天）
- [x] 前端升級：里程碑達成特殊慶祝動畫
- [x] 前端升級：簽到成功後顯示下一里程碑鼓勵提示
- [x] 測試更新：34 個 points 測試涵蓋分級積分、streak、里程碑計算（112 項全部通過）

## Bug 修復 v3.1 - 每日簽到彈窗不自動跳出

- [x] 診斷根本原因：hasTriggered 是 useState，重整後確實歸零，但 getSigninStatus 的 staleTime 預設讓 React Query 使用快取，不重新 fetch
- [x] 修復：getSigninStatus 加入 staleTime: 0 + refetchOnMount: true + retry: 2，確保每次頁面載入都重新查詢
- [x] 修復：加入 prevUserIdRef 追蹤 user.id 變化，當 user 從 null 變成有值時重置 hasTriggered，確保時序正確
- [x] 112 項測試全部通過，TypeScript 零錯誤

## Bug 修復 v3.2（2026-02-26）

- [x] 新用戶完成三階段資料後未自動分配基礎方案
- [x] 每日簽到彈窗仍未正常跳出（需瀏覽器實測確認）
- [x] 個人頁面加入本月簽到日曆視圖
- [x] 導覽列功能超出版面（桌機與手機均有，需改為可水平捲動並加漸層提示）

## UI 改善 v3.3（2026-02-26）

- [ ] 所有輸入框右側加入清除（×）按鈕（擲筊問題輸入、天命問卜輸入）
- [ ] 每日運勢桌機版頂部空間優化（標題區放大/重新設計）
- [ ] 英雄劇本改名為「本日天命格言」並白話化內容
- [ ] Tab 區塊（英雄劇本/塔羅流日/時辰能量）改為垂直排列，不再用 Tab 收納
- [ ] 擲筊動畫改善：成功/失敗視覺更清晰，結果就地顯示不需下滑
- [ ] 移除擲筊頁底部多餘區塊（圖2 所示的六格功能入口）

## UI 改善 v3.4（2026-02-26）

- [ ] WarRoom Tab 改垂直排列（本日天命格言、塔羅流日、時辰能量）
- [ ] WarRoom 桌機版頂部空間優化（英雄式大標題）
- [ ] 英雄劇本改名「本日天命格言」並白話化
- [ ] 擲筊動畫改善：成功/失敗更清晰，結果就地顯示
- [ ] 擲筊頁底部多餘區塊移除
- [ ] /diet 餐廳分類關鍵字說明與優化
- [ ] /diet 每次搜尋最多 20 筆
- [ ] /diet 五行屬性篩選修復

## 功能增強 v4.1 - 虛擬衣櫥 + AI 穿搭點評（2026-02-26）

- [ ] 資料庫：新增 wardrobe_items 表（名稱/顏色/五行/類型/圖片URL）
- [ ] 後端：wardrobe CRUD API（新增/列表/刪除衣物）
- [ ] 後端：wardrobe.aiReview API（上傳照片 → AI 分析五行匹配度）
- [ ] 前端：虛擬衣櫥管理頁面（/wardrobe）
- [ ] 前端：OutfitPage 加入 AI 穿搭點評（上傳照片 + AI 分析結果）
- [ ] 前端：OutfitPage 穿搭建議整合衣櫥單品（從用戶衣物中挑選最匹配的）

## 功能增強 v4.2 - 神諭穿搭 V4.0 完整版（2026-02-27）

### 後端：auraEngine.ts 雙層計分模型
- [x] 建立 server/lib/auraEngine.ts（Innate Aura + Outfit Boost 雙層計分）
- [x] calculateInnateAura：命格 × 流日 × 天氣 → 30~90 分天命底盤
- [x] calculateOutfitBoost：穿搭五行 × 喜用神匹配 → 0~20 分穿搭加成
- [x] calculateAuraScore：整合兩層計分，輸出完整 boostBreakdown
- [x] getAuraLevel：分數映射等級（天命共振/能量充沛/運勢平穩/能量偏弱/需補強）
- [x] ELEMENT_COLORS：五行顏色對應表（供前端 WardrobeSelector 使用）
- [x] 後端：warRoom.getOutfitSimulatorData API（初始化模擬器資料）
- [x] 後端：warRoom.simulateOutfit API（即時計算穿搭 Aura Score）

### 前端：核心元件
- [x] 建立 AuraScoreGauge.tsx（SVG 弧形儀表盤 + 動畫計數 + 雙層分數說明）
- [x] 建立 InteractiveMannequin.tsx（交互式虛擬人台 + 各部位熱區點擊）
- [x] 建立 WardrobeSelector.tsx（底部 Sheet + 系統推薦/衣櫥/探索顏色三 Tab）

### 前端：OutfitPage V4.0 全面升級
- [x] 新增「能量模擬器」Tab（AuraScoreGauge + InteractiveMannequin + WardrobeSelector）
- [x] 保留原有「穿搭建議」Tab（V3.0 功能完整保留）
- [x] 保留原有「手串矩陣」Tab（V3.0 功能完整保留）
- [x] 穿搭選擇防抖自動觸發模擬（500ms debounce）
- [x] AI 點評顯示（規則生成，不調用 LLM）
- [x] 加成明細展示（boostBreakdown 列表）
- [x] 今日補運目標展示（weakestElements + favorableElements）
- [x] 前往虛擬衣櫥快捷連結

### 路由 & 測試
- [x] App.tsx 加入 /wardrobe 路由（WardrobePage）
- [x] 撰寫 auraEngine.test.ts（13 項測試全部通過）
- [x] 全部 125 項測試通過，TypeScript 零錯誤

## 功能增強 v4.3 - 後台管理邏輯計算權限（2026-02-27）

### 資料庫
- [x] 新增 aura_engine_config 表（計算規則 key/value/description/category）
- [x] 新增 restaurant_categories 表（分類 id/label/emoji/types/textSuffix/sortOrder/enabled）
- [x] 新增 custom_bracelets 表（管理員自訂手串/配飾 DB）
- [x] pnpm db:push 推送遷移

### 後端 adminConfig router
- [x] adminConfig.getAuraRules - 取得所有 aura 計算規則
- [x] adminConfig.updateAuraRule - 更新單一規則值
- [x] adminConfig.resetAuraRules - 重置為預設值
- [x] adminConfig.getRestaurantCategories - 取得所有餐廳分類
- [x] adminConfig.upsertRestaurantCategory - 新增/更新餐廳分類
- [x] adminConfig.deleteRestaurantCategory - 刪除餐廳分類
- [x] adminConfig.reorderRestaurantCategories - 調整排序
- [x] adminConfig.getCustomBracelets - 取得自訂手串列表
- [x] adminConfig.upsertCustomBracelet - 新增/更新手串
- [x] adminConfig.deleteCustomBracelet - 刪除手串

### 前端 AdminLogicConfig 頁面 (/admin/logic-config)
- [x] AdminLayout 側邊欄新增「管理邏輯計算」入口
- [x] 建立 AdminLogicConfig.tsx 頁面（三個 Tab：能量模擬器規則 / 手串配飾 / 餐廳分類）
- [x] Tab 1：能量模擬器規則 - 各部位權重滑桿、加成比例設定、分數上下限
- [x] Tab 2：手串配飾管理 - 新增/編輯/刪除手串，含五行/顏色/功能欄位
- [x] Tab 3：餐廳分類管理 - 新增/編輯/刪除分類，拖曳排序，啟用/停用開關
- [x] App.tsx 加入 /admin/logic-config 路由

### 前台整合
- [x] NearbyRestaurants 改為從 API 動態讀取分類（fallback 到硬編碼預設值）
- [x] auraEngine simulateOutfit 改為從 DB 讀取 CATEGORY_WEIGHTS（fallback 已實作）（fallback 到預設值）
- [x] getOutfitSimulatorData 手串列表合併 custom_bracelets（透過 syncBuiltinBracelets）

## 功能增強 v4.4 - 後台管理邏輯計算三項擴充（2026-02-27）

### 資料庫
- [ ] custom_bracelets 新增 pairingItems 欄位（JSON 陣列，存建議搭配的手串/配飾 code 清單）
- [ ] 新增 aura_rule_history 表（儲存每次規則快照：snapshot_label / snapshot_data / created_at）
- [ ] restaurant_categories 新增 scheduleEnabled / scheduleStartHour / scheduleEndHour 欄位

### 後端 adminConfig router 擴充
- [ ] adminConfig.updateBraceletPairing - 更新手串建議搭配清單
- [ ] adminConfig.snapshotAuraRules - 手動建立規則快照
- [ ] adminConfig.getAuraRuleHistory - 取得歷史快照列表
- [ ] adminConfig.restoreAuraRuleSnapshot - 還原指定快照
- [ ] adminConfig.deleteAuraRuleSnapshot - 刪除快照
- [ ] adminConfig.updateCategorySchedule - 更新分類時段設定

### 前端 AdminLogicConfig 頁面更新
- [ ] Tab 2 手串管理：新增「建議搭配」多選欄位（從現有手串清單選擇）
- [ ] Tab 1 能量規則：新增「歷史版本」側邊抽屜，顯示快照列表 + 還原按鈕
- [ ] Tab 3 餐廳分類：每個分類新增時段設定（啟用開關 + 起始/結束小時選擇器）

### 前台整合
- [ ] NearbyRestaurants 根據當前時段過濾分類（scheduleEnabled=true 且當前時間不在範圍內則隱藏）

## 功能增強 v4.4 - 後台管理邏輯計算三項擴充（完成）

- [x] DB schema 新增 custom_bracelets.pairingItems 欄位
- [x] DB schema 新增 restaurant_categories 三個時段欄位（scheduleEnabled/StartHour/EndHour）
- [x] DB schema 新增 aura_rule_history 歷史快照表
- [x] adminConfig.updateBraceletPairing API（更新手串建議搭配）
- [x] adminConfig.snapshotAuraRules API（建立規則快照）
- [x] adminConfig.getAuraRuleHistory API（取得歷史列表）
- [x] adminConfig.restoreAuraRuleSnapshot API（一鍵還原）
- [x] adminConfig.deleteAuraRuleSnapshot API（刪除快照）
- [x] adminConfig.updateCategorySchedule API（更新時段設定）
- [x] adminConfig.getScheduledActiveCategories API（時段過濾後的分類）
- [x] BraceletsTab 新增「建議搭配」欄位（列表顯示 + 表單輸入）
- [x] AuraRulesTab 新增「歷史版本」側邊抽屜（建立/還原/刪除快照）
- [x] RestaurantCategoriesTab 新增時段控制 UI（列表顯示 + 表單設定）
- [x] NearbyRestaurants 改用 getScheduledActiveCategories（每分鐘自動刷新）
- [x] 153 項測試全部通過，TypeScript 零錯誤

## 功能增強 v4.5 - 拍照 AI 分析五行 → 虛擬衣櫃

- [ ] 評估技術可行性（LLM 視覺模型 + S3 暫存 + 即時刪除）
- [ ] DB schema 新增 wardrobe_items 資料表（user_id/category/name/element/colors/wuxingScore/auraBoost/aiAnalysis）
- [ ] 後端 wardrobe.analyzePhoto API（multipart 上傳 → S3 暫存 → LLM 視覺分析 → 儲存 → 刪除 S3 圖片）
- [ ] 後端 wardrobe.addItem / listItems / deleteItem API
- [ ] 前端 PhotoUploadAnalyzer 元件（相機/相簿選擇 → 預覽 → AI 分析動畫 → 結果確認 → 加入衣樻）
- [ ] 前端 WardrobePage 整合 PhotoUploadAnalyzer（「拍照新增」按鈕）
- [ ] 後台 AdminLogicConfig 手串/配飾管理 Tab 整合拍照新增流程
- [ ] 153+ 項測試全部通過，TypeScript 零錯誤
- [ ] 儲存 V4.5 checkpoint

## 功能增強 v4.5 完成狀態

- [x] DB schema 新增 wardrobe_items.aiAnalysis / auraBoost / fromPhoto 欄位
- [x] server/storage.ts 新增 storageDelete() 函數
- [x] wardrobe.analyzeAndAdd API（base64 → S3 暫存 → LLM 視覺分析 → 儲存 → 刪除圖片）
- [x] wardrobe.remove API（刪除衣物）
- [x] PhotoUploadAnalyzer 元件（拍照/上傳 → 壓縮 → AI 分析動畫 → 結果確認 → 加入衣樻）
- [x] WardrobePage 整合「拍照分析」按鈕 + Sheet 面板
- [x] AdminLogicConfig BraceletsTab 整合「拍照分析」按鈕 + 分析後自動帶入表單
- [x] 163 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 V4.5 checkpoint

## Bug 修復 v4.6 - admin/logic-config 規則設定未串接前台

- [ ] 診斷 simulateOutfit 是否從 DB 讀取 aura_engine_config 規則
- [ ] 診斷 getOutfitSimulatorData 天命底盤計算是否套用 DB 規則
- [ ] 修復串接：確保後台規則變更即時影響前台 Aura Score
- [ ] 撰寫端對端測試驗證修復
- [ ] 儲存 v4.6 checkpoint

## Bug 修復 v4.6 - admin/logic-config 能量模擬器規則串接修復（2026-02-27）

- [x] 診斷根本原因：auraEngine.ts 使用硬編碼常數，simulateOutfit 未從 DB 讀取規則
- [x] auraEngine.ts 新增 AuraEngineRules 介面（categoryWeights/boostCap/innateMin/innateMax 等）
- [x] auraEngine.ts 新增 DEFAULT_ENGINE_RULES 預設常數物件（向後相容）
- [x] calculateInnateAura 新增可選 rules 參數
- [x] calculateOutfitBoost 新增可選 rules 參數
- [x] calculateAuraScore 新增可選 rules 參數並傳遞給子函數
- [x] getOutfitSimulatorData 執行前從 aura_engine_config DB 讀取規則並建構 engineRules
- [x] simulateOutfit 執行前從 aura_engine_config DB 讀取規則並建構 simEngineRules
- [x] 修復 db 變數重複宣告的 TypeScript 錯誤（改用 dbSim 命名）
- [x] 新增 5 個 DB 規則串接測試（innateMax/innateMin/boostCap/categoryWeights/calculateAuraScore）
- [x] 168 項測試全部通過，TypeScript 零錯誤

## 功能增強 v4.7 - 能量模擬器同步每日運勢 + 左右手四位置 + 左進右出說明（2026-02-27）

- [ ] 分析每日運勢分數計算邏輯（warRoom 的 dailyScore）與 auraEngine 天命底盤的差異
- [ ] 確認同步方案：天命底盤 = 每日運勢分數 × 10（0-10 → 0-100）或直接使用相同計算邏輯
- [ ] 後端：auraEngine 新增 leftHand/rightHand 分開計分欄位
- [ ] 後端：新增 getBraceletHandExplanation API（左進右出五行說明）
- [ ] 前端：InteractiveMannequin 改為四個手部位置（左手手串、左手配件、右手手串、右手配件）
- [ ] 前端：WardrobeSelector 新增左右手分類選擇
- [ ] 前端：點擊衣物/配件時顯示能量說明 Panel
- [ ] 前端：左右手手串顯示「左進右出」詳細說明（五行 × 左/右手 = 不同效果）
- [ ] 前端：OutfitPage 能量模擬器天命底盤改為以每日運勢分數為基礎計算
- [ ] 後台：AdminLogicConfig 手串管理新增左右手能量說明欄位

## Bug 修復 v4.7 - OutfitPage 左右手 + WardrobePage 六大修復

- [ ] OutfitPage: 點擊衣物/配件時顯示能量說明 Panel
- [ ] OutfitPage: 左右手手串顯示「左進右出」說明
- [ ] OutfitPage: 天命底盤分數同步每日運勢分數
- [x] WardrobePage: 新增「手串」分類篩選 Tab
- [x] WardrobePage: 新增衣物表單分類下拉加入「手串」選項
- [x] WardrobePage: 修復「回到手串」連結（改為返回神諭穿搭連結）
- [x] WardrobePage: 手機版 UI 修復（標題收縮、按鈕小型化、分類篩選可滞動）
- [x] WardrobePage: 手機版新增編輯/刪除按鈕（手機常顯，桌面 hover 顯示）
- [x] WardrobePage: 修復拍照分析後歸檔分類（wardrobe router 支援 bracelet 分類）
- [x] WardrobePage: 改善手串與虛擬衣櫥整體 UI 串接（分類圖示、五行分佈統計）
- [x] WardrobeSelector: 手串選擇器同時顯示虛擬衣櫥手串 + 神諭手串庫
- [x] WardrobeSelector: 左右手選擇器顯示「左手吸納/右手釋放」說明標籤和提示

### 功能增強 v4.8 - 巢狀 <a> 修復 + 三項新功能（2026-02-27）
- [x] 修復 /outfit 頁面巢狀 <a> 錯誤（Link 內不能再包 <a>）
- [x] 修復 /wardrobe 頁面巢狀 <a> 錯誤（Link 內不能再包 <a>）
- [x] 能量說明 Panel：點擊已選衣物/手串時彈出五行詳情卡片
- [x] 能量說明 Panel：顯示五行屬性、對命格加成原因、左/右手效果差異
- [x] 天命底盤同步：讀取 warRoom dailyScore × 10 作為天命底盤基礎
- [x] WardrobePage 手串佩戴記錄：手串卡片加入「今日已佩戴」快速記錄按鈕
- [x] WardrobePage 手串佩戴記錄：與作戰室佩戴記錄同步（braceletWear API）

## Bug 修復 v4.9 - 天命底盤折扣評語 + 我的衣櫥手串來源（2026-02-27）
- [x] OutfitPage: 天命底盤 = overallScore×10 × (maxInnate/100)，評語依實際分數動態計算
- [x] OutfitPage: 評語等級分段（90+極佳/70+良好/50+平穩/30+偏弱/30以下低迷）
- [x] OutfitPage: 說明文字（底部小字）也要反映實際折扣後分數，不再寫死「極佳（80分）」
- [x] WardrobeSelector: 「我的衣櫥」 Tab 手串部位只顯示用戶自己 wardrobe bracelet 分類（不包含系統手串庫）
- [x] WardrobeSelector: 移除「我的衣櫥」 Tab 中的系統手串庫資料（系統手串庫只在「系統推薦」 Tab 顯示）
## UI 調整 v4.10 - /diet 地圖放大（2026-02-27）
- [x] /diet 附近命理推薦餐廣 Google Map 高度放大兩倍（從 240px 改為 480px）

## 新功能 v4.11 - 財運羅盤獨立頁面（2026-02-27）
- [ ] 建立 /wealth 獨立頁面（WealthPage.tsx）
- [ ] 財運羅盤頁面包含：偏財指數、彩券能量、財神方位、財運分析、今日財運建議
- [ ] 在 App.tsx 註冊 /wealth 路由
- [ ] 修正資料庫 module_wealth navPath 從 /lottery 改為 /wealth
- [ ] SharedNav 加入 /wealth 的漸層色設定

## 新功能 v4.11 - 財運羅盤獨立頁面（2026-02-27）
- [x] 建立 WealthPage.tsx 獨立頁面（財運羅盤完整功能）
- [x] 在 App.tsx 註冊 /wealth 路由
- [x] 修正資料庫 module_wealth 的 navPath 從 /lottery 改為 /wealth
- [x] 在 ModuleCarousel 加入 /wealth 漸層色彩

## 功能升級 v4.12 - 天命問卜全面強化（2026-02-27）
- [ ] 後端：強化 topicAdvice LLM 提示詞（加入完整八字、十神、流日天干、塔羅、月相、具體問題深度分析）
- [ ] 後端：回答結構化（吉凶判斷/核心分析/具體建議/時機建議/注意事項 五段式）
- [ ] 後端：加入問題歷史記錄儲存（divination_sessions 資料表）
- [ ] 前端：DivinationPage 全面重設計（主題選擇卡片、命理上下文標籤列、結構化回答展示）
- [ ] 前端：加入問卜歷史記錄區塊（可查看過去問題與回答）
- [ ] 前端：加入「今日命理狀態」摘要橫幅（十神/塔羅/月相/五行能量）
- [ ] 前端：回答顯示分段卡片（吉凶指數大字 + 各段落展開）

## 功能升級 v4.12 - 天命問卜全面強化（已完成）

- [x] 後端：topicAdvice 改為結構化 JSON 輸出（吉凶指數/核心解讀/行動指引/警示/吉時/天命符言）
- [x] 後端：加入完整八字四柱（含時柱）、本命五行比例、動態十神分析
- [x] 後端：儲存問卜結果至 divination_sessions 資料表
- [x] 後端：新增 warRoom.divinationHistory 查詢 API
- [x] 前端：TopicAdvicePanel 全面重設計（命運指數儀表盤、分段卡片展示）
- [x] 前端：DivinationPage 升級（積分餘額顯示、日期選擇器優化、說明文字更新）
- [x] 前端：加入問卜歷史記錄區塊（可查看過去問題與回答）
- [x] 測試：168 項測試全部通過，TypeScript 零錯誤，儲存 v4.12 checkpoint

## Bug 修復 v4.13 - SharedNav 功能列水平滑動修復（2026-03-02）
- [x] 修復 SharedNav 功能列無法左右滑動（touch-action: manipulation 覆蓋了 pan-x 手勢，加入 nav-scroll-container 類別修復）

## Bug 修復 v4.14 - SharedNav 功能列滑動回彈根本修復（2026-03-03）
- [x] 徹底修復 SharedNav 功能列水平滑動回彈問題（移除 active:scale-95/transition-transform/scale-105、CSS 加入 overscroll-behavior-x:contain、useEffect 改為只執行一次且使用 instant）

## 功能升級 v4.15 - 神諭穿搭 V10.0 動態策略引擎（2026-03-03）
- [x] 後端：建立 server/lib/strategyEngine.ts（五大動態策略判定層：強勢補弱/順勢生旺/借力打力/食神生財/均衡守成）
- [x] 後端：升級 generateOutfitAdviceV9 接受 DailyStrategyObject，穿搭說明加入策略原因
- [x] 後端：升級 recommendBraceletsV9 接受 DailyStrategyObject，手串解說加入策略語境
- [x] 後端：getOutfitByShichen 整合 determineDailyStrategy，回傳 strategy 物件
- [x] 後端：能量邏輯審查 - 全系統統一使用 calculateWeightedElements（storeResonance 已透過 buildDestinyWeightsFromProfile 間接使用）
- [x] 前端：OutfitPage V10.0 全面重寫 - 七日時間軸日期選擇器
- [x] 前端：懸浮能量儀表盤（sticky top bar，含 Aura 分數/五行柱狀/策略徽章）
- [x] 前端：策略橫幅（V10.0 策略名稱/核心策略文字/主攻輔助五行）
- [x] 前端：五行加權柱狀圖（常駐顯示，取代舊版表格）
- [x] 前端：穿搭建議展開顯示（移除 Tab 結構，直接展示所有區塊）
- [x] 前端：互動穿搭模擬器改為可折疊面板
- [x] 測試：168 項測試全部通過，TypeScript 零錯誤

## 功能升級 v4.16 - 神諭穿搭 UI 修復與後續功能（2026-03-03）
- [ ] UI：管理虛擬衣櫥按鈕移至五行柱狀圖上方（圖2上方）
- [ ] UI：手串矩陣顏色改為對應五行顏色（土=黃棕、金=白灰、木=綠、火=紅、水=藍）
- [ ] UI：今日五行加權總覽重新設計（移除膠囊柱狀，改為更直觀的水平進度條設計）
- [ ] 後台：/admin/logic-config 重構為主從佈局算法核心控制中心
- [ ] 前端：神諭穿搭頁加入本週策略分布圖表
- [ ] 後端：storeResonance 整合 calculateWeightedElements 動態加權
## 功能升級 v4.16 - 算法核心控制中心重構（已完成）
- [x] 後台：/admin/logic-config 重構為主從佈局（左側策略選單 + 右側詳細參數）
- [x] 後台：新增「策略引擎」面板（五大策略觸發邏輯說明）
- [x] 後台：新增「五行顏色對應」面板（穿搭顏色選擇規則）
- [x] 後台：保留並整合原有三個 Tab（能量模擬器規則/手串資料庫/餐廳分類）
- [x] 測試：168 項測試全部通過，TypeScript 零錯誤
## 功能升級 v4.17 - 三項功能升級（2026-03-03）

### 本週策略分布圖表
- [x] 後端：新增 outfit.weeklyStrategyDistribution API（回傳過去 7 日每日策略名稱）
- [x] 前端：OutfitPage 加入本週策略分布橫條圖（策略名稱 × 觸發天數）
- [x] 前端：每個策略顯示對應顏色與天數標籤

### storeResonance 動態加權整合
- [x] 後端：storeResonance.ts 升級 buildDestinyWeightsFromProfile 為 calculateWeightedElements 動態加權
- [x] 後端：scoreStores API 傳入當日日期，讓評分反映流日能量變化
- [x] 後端：lottery.scoreStores 與 diet.nearbyRestaurants 同步更新

### 策略觸發閾值可調整
- [x] DB：新增 strategy_thresholds 資料表（strategy_id, threshold_key, threshold_value, label, description）
- [x] 後端：adminConfig.getStrategyThresholds / upsertStrategyThreshold API
- [x] 後端：strategyEngine.ts 從 DB 讀取閾值（有快取機制）
- [x] 前端：AdminLogicConfig 策略引擎面板改為可編輯閾值介面
- [x] 測試：更新/新增相關測試，168 項全部通過

## 功能升級 v4.18 - 六項功能調整（2026-03-03）

### 生命靈數計算邏輯修正（最重要）
- [x] 全站審查：找出所有生命靈數計算相關檔案
- [x] 修正外層靈數邏輯：日期 ≤22 時不再相加（16=塔，非1+6=7）
- [x] 修正月份邏輯：月份 >10 才相加（11月=1+1=2，2月保持2）
- [x] 修正高階靈數顯示：記錄十位數與個位數作為高階能量
- [x] 驗證 ex1（1984/11/26）：外層8、中層10、靈魂22、主要5
- [x] 驗證 ex2（1999/2/16）：外層16（塔），不是7（戰車）

### 策略分布白話說明 + 今日vs昨日策略對比
- [x] 本週策略分布：每個策略加入白話說明與直覺建議
- [x] 神諭穿搭頁：策略標題旁加入昨日策略名稱與能量轉換說明

### 策略閾值整合 strategyEngine.ts DB 快取
- [x] strategyEngine.ts 加入 DB 閾值讀取（5分鐘快取）
- [x] 策略判定邏輯改用 DB 閾值取代硬編碼常數

### 簽到日曆移至個人下拉選單 + Profile 白話化
- [x] 簽到日曆從 /profile 移至 Header 個人下拉選單
- [x] Profile 頁文字白話化：專業術語改為一般用戶看得懂的說法

## 功能升級 v4.20 - 飲食羅盤 V10.0+V11.0 升級（2026-03-03）

### DB Schema 升級
- [x] DB: 新增 dietary_logs 表
- [x] DB: 新增 user_preferences 表

### 後端 V10.0 - 動態美食軍師
- [x] 後端: generateDietaryAdvice 移植策略層
- [x] 後端: getDietaryAdvice 支援情境模式
- [x] 後端: getDietaryAdvice 支援時辰動態調整
- [x] 後端: 短期記憶過濾
- [x] 後端: AI 主廚菜單（invokeLLM）
- [x] 後端: 五行知識延伸資料

### 後端 V11.0 - 記憶與感知引擎
- [x] 後端: scoreNearbyStores 場景感知（早/午/晚）
- [x] 後端: scoreNearbyStores 預算篩選
- [x] 後端: 健康標籤過濾
- [x] 後端: diet.logConsumption tRPC 程序
- [x] 後端: account.updateUserPreferences / getUserPreferences tRPC 程序

### 前端 V10.0
- [x] 前端: DietPage 情境模式選擇器
- [x] 前端: DietPage 時辰能量時間軸
- [x] 前端: DietPage AI 主廚菜單卡片
- [x] 前端: DietPage 五行知識延伸彈窗
- [x] 前端: DietPage 場景感知標題

### 前端 V11.0
- [x] 前端: DietPage 飲食日誌互動功能
- [x] 前端: DietPage 附近餐廳預算篩選
- [x] 前端: 飲食偏好設定（健康標籤 + 預算篩選）

## 功能升級 v4.21 - 三項後續建議實作（2026-03-03）

### 飲食偏好設定 UI
- [x] 前端: MyProfile 加入飲食偏好設定區塊（健康標籤 + 預算偏好）
- [x] 前端: 健康標籤多選（低糖/低鱈/素食/高蛋白/無麴質/低卡）
- [x] 前端: 預算偏好三選一（小資/中資/高檔）
- [x] 前端: 儲存後即時更新 DietPage 建議

### AI 主廚菜單今日快取
- [x] 前端: localStorage 快取 AI 主廚菜單（key = date+mode+mealScene）
- [x] 前端: 快取有效期 24 小時，過期自動重新生成
- [x] 前端: 顯示「快取來源」標記（今日已生成 / 重新生成按鈕）

### 週報五行飲食分布圓餅圖
- [x] 後端: diet.getWeeklyDietStats API（過去7天五行飲食分布）
- [x] 前端: WeeklyReport 頁加入五行飲食分布圓餅圖（Recharts PieChart）
- [x] 前端: 顯示各五行攝取次數與每日堆疊長條圖

## 功能升級 v4.22 - 財運羅盤修復與延伸（2026-03-03）

### Bug 修復
- [x] 後端: 修正 dailyReport 中硬編碼五行分數（ELEMENT_ZH_SCORE 改為動態計算）
- [x] 後端: 修正 WEATHER_SCORE 硬編碼（改為依用戶喜忌神動態計算）
- [x] 後端: 修正 oneLinerMap 食神條目中的「甲木化火」硬編碼
- [x] 後端: dailyReport 回傳 profileIsDefault 標記
- [x] 前端: WealthPage 加入 ProfileIncompleteBanner

### 功能延伸
- [x] 前端: WealthPage 加入個人命格摘要卡（日主五行 + 喜用神）
- [x] 前端: WealthPage 加入今日最佳出手時辰提示
- [x] 後端: 新增 wealth.getMonthlyTrend API（本月每日財運走勢）
- [x] 前端: WealthPage 加入本月財運走勢横向長條圖
- [x] 後端: 新增 wealth.logEntry API（財運日記記錄）
- [x] 前端: WealthPage 加入財運日記（記錄今日心得 + 歷史查閱）
- [x] 前端: WealthPage 加入吉時倒數計時器

## 功能升級 v5.0 - 天命娛樂城 V1.0（2026-03-03）

### 第一部分：後端架構 - 雙軌貨幣基石
- [x] DB: users 表新增 gameCoins 欄位（integer, default 0）
- [x] DB: 新增 currency_exchange_logs 表（對換日誌）
- [x] DB: 新增 wbc_matches 表（WBC 賽事）
- [x] DB: 新增 wbc_bets 表（用戶下注記錄）
- [x] DB: 遷移腳本 - 為現有用戶設初始 gameCoins 1000
- [x] 後端: exchange.getRates（公開，返回對換比例）
- [x] 後端: exchange.pointsToCoins（積分→遠戲點，含事務）
- [x] 後端: exchange.coinsToPoints（遠戲點→積分，含每日限額）
- [x] 後端: wbc.getMatches（獲取賽事列表）
- [x] 後端: wbc.placeBet（下注，三種玩法）
- [x] 後端: wbc.getMyBets（查詢我的下注記錄）
- [x] 後端: wbc.settleMatch（管理員結算，含通知）
- [x] 後端: marketing.getEconomyConfig（讀取對換配置）
- [x] 後端: marketing.updateEconomyConfig（管理員更新配置）
- [x] 後端: marketing.getNewGames（是否有新遠戲，用於 NEW 標籤）
- [x] 後端: marketing.createMatch（管理員新增賽事）
- [x] 後端: marketing.updateMatch（管理員更新賽事）
- [x] 後端: marketing.deleteMatch（管理員刪除賽事）

### 第二部分：後台頁面
- [x] 前端: /admin/marketing 行銷中心（側邊欄新增大類）
- [x] 前端: /admin/marketing 經濟系統配置（對換比例 + 每日限額）
- [x] 前端: /admin/marketing WBC 競猜管理（CRUD + 一鍵結算）

### 第三部分：用戶端頁面
- [x] 前端: /casino 天命娛樂城門戶頁（積分/遠戲點顯示 + 對換 + 遠戲列表）
- [x] 前端: /casino/wbc WBC 競猜頁面（賽程列表 + 天命羅盤 + 下注）
- [x] 前端: WBC 三種玩法（單場勝負 / 積分差競猜 / 天命組合投注）
- [x] 前端: 天命羅盤按鈕（調用 dailyReport 生成命理風向建議）
- [x] 前端: 下注模態框（輸入遠戲點 + 餘額校驗 + 確認）
- [x] 前端: 我的下注記錄（狀態 placed/won/lost）

### 第四部分：導航改造
- [x] 前端: modules 資料庫新增天命娛樂城項目（sortOrder 13）
- [x] 前端: App.tsx 新增 /casino 與 /casino/wbc 路由
- [x] 測試: casino.test.ts（21 項，總計 193 項全部通過）

## 功能升級 v5.1 - 娛樂城後續三項建議（2026-03-03）

### WBC 賽事一鍵匯入與賞率設定
- [x] 後端: importWbcSchedule 加入預設賞率欄位（winlose/spread/combo 各別設定）
- [x] 後端: 匯入時包含 WBC 2026 完整 40 場小組賽資料（含日期/隊伍/場地）
- [x] 前端: AdminMarketing 賽事新增/編輯表單加入賞率輸入欄位
- [x] 前端: AdminMarketing 一鍵匯入按鈕（含確認對話框）

### 結算後推播贏家通知
- [x] 後端: settleMatch 結算時查詢所有該場次贏家下注記錄
- [x] 後端: 對每位贏家呼叫 notifyOwner 推播（標題：WBC 競猜結果、內容：贏得遠戲點）
- [x] 後端: 結算回傳 winnersCount 與 totalPayout 統計

### 娛樂城首頁本週競猜王排行榜
- [x] 後端: wbc.getLeaderboard API（本週贏得遠戲點最多的前 10 名）
- [x] 前端: /casino 首頁底部加入「本週競猜王」排行榜卡片
- [x] 前端: 排行榜顯示名次/用戶名/本週獲利遠戲點/勝率

## 功能升級 v5.2 - 娛樂城導航修復 + WBC 篩選器 + 通知中心（2026-03-03）

### 導航修復
- [x] 檢查 CasinoPage 返回按鈕、麵包屑、SharedNav 高亮
- [x] 檢查 WbcPage 返回按鈕、麵包屑、SharedNav 高亮
- [x] 確保所有娛樂城頁面有明確逃生路線

### WBC 賽事篩選器
- [x] 前端: WbcPage 加入分組篩選（A/B/C/D 組 + 複賽）
- [x] 前端: WbcPage 加入日期篩選（依比賽日期）
- [x] 前端: 篩選器 UI（標籤按鈕組）

### 用戶個人通知中心
- [x] DB: 新增 user_notifications 表
- [x] 後端: notifications.getMyNotifications API
- [x] 後端: notifications.markAsRead API
- [x] 後端: notifications.markAllRead API
- [x] 後端: wbc.settleMatch 改為寫入 user_notifications
- [x] 前端: /notifications 通知列表頁
- [x] 前端: SharedNav 加入通知鈴鐺圖示 + 未讀紅點
- [x] 前端: 通知列表顯示已讀/未讀狀態

## 功能升級 v5.3 - 通知中心擴展 + 排行榜月度視圖 + 行銷中心版面重構（2026-03-03）

### 通知中心擴展（全站事件觸發）
- [x] 後端: 刮刮樂購買日誌達標通知（連續3次命中 → 通知）
- [x] 後端: 每日晨報通知（早上7點推送今日運勢摘要寫入通知中心）
- [x] 後端: notifyUser 通用工具函數（集中寫入 user_notifications）
- [x] 前端: 通知中心新增每日晨報/命格提醒/刮刮樂里程碑分類標籤
- [ ] 後端: 命格補運提醒通知（每日早晨推送五行補運建議）

### 排行榜月度視圖
- [x] 後端: wbc.getLeaderboard 支援 period 參數（week/month）
- [x] 後端: 月度排行榜計算（當月1日起累積獲利）
- [x] 前端: CasinoPage 排行榜加入「本週/本月」切換 Tab

### 行銷中心版面重構
- [x] 前端: AdminMarketing 改為活動卡片化架構（頂部活動總覽 + 各活動可展開）
- [x] 前端: WBC 賽事管理改為緊湊列表（可按狀態篩選）
- [x] 前端: 手機版 RWD 修正（Dialog mx-4、按鈕 flex-col sm:flex-row、列表自適應）
- [x] 前端: 行銷中心加入活動狀態標籤（進行中/即將開始/已結束）

## 功能升級 v5.4 - WBC熱身賽 + 模塊位置選項 + 財運羅盤修正（2026-03-03）

### WBC 賽事
- [ ] 確認WBC下注截止時間邏輯（比賽開始前多久截止）
- [ ] 搜尋並匯入WBC 2026熱身賽/體驗賽賽程

### 財運羅盤修正
- [ ] 「財神幫我問」改為個人化（依用戶命格生成，非全站相同）
- [ ] 商業羅盤改為僅Owner可見（一般用戶不顯示）

### 模塊出現位置選項
- [ ] 後台模塊管理新增「出現位置」欄位（核心功能列 / 個人選單）
- [ ] 前端個人下拉選單動態顯示被設定為「個人選單」的模塊
- [ ] 前端主功能列只顯示被設定為「核心功能列」的模塊

## 功能升級 v5.4 - WBC截止排程 + 商業羅盤 + 模塊位置 + 活動推廣（2026-03-03）

### WBC 賽事
- [x] 後端: 比賽開始前30分鐘自動鎖定下注（wbcMatchLock.ts 排程）
- [x] 前端: WBC競猜頁顯示截止倒數計時（距截止時間 < 1小時時顯示紅色警示）
- [x] 後端: 匯入WBC 2026熱身賽 + C組正式賽共 12 場

### 財運羅盤修正
- [x] 商業羅盤改為僅Owner可見（isOwner 判斷）

### 模塊出現位置選項
- [x] schema: modules表新增displayLocation欄位（main/profile/both）
- [x] 後台: AdminBusinessHub 模塊編輯新增顯示位置下拉選項
- [x] 前端: SharedNav 個人選單動態顯示 profile 模塊
- [x] 前端: 主功能導航列只顯示 main/both 模塊

### WBC活動推廣
- [x] 前端: 今日運勢頁面加入 WBC 活動推廣橫幅（有待開賽時顯示）
- [x] 前端: 橫幅顯示下一場賽事資訊，點擊可直接跳轉到競猜頁面

## 功能升級 v5.5 - WBC正確賽程 + AI自動比分 + 活動曝光（2026-03-03）

### WBC 正確賽程更新
- [x] 清除舊賽程資料（舊的 12 場錯誤資料）
- [x] 匯入 A/B/C/D 四組完整賽程（40 場，正確時區轉換）
- [x] 加入旗幟 emoji 對照表（20 支隊伍）

### AI 自動比分更新
- [x] 後端: 建立 wbcScoreFetcher.ts（賽後3小時呼叫 LLM 查詢比分）
- [x] 後端: LLM 查詢比分後自動更新 wbc_matches 狀態+比分
- [x] 後端: 比分確認後通知 Owner 進行手動結算

### WBC 活動曝光強化
- [x] 前端: 今日運勢頁面加入 WBC 活動彈窗（每天首次進入顯示一次）
- [x] 前端: 彈窗顯示下一場賽事資訊，點擊可直接跳轉競猜頁面

## 功能升級 v5.6 - 功能模塊兌換中心（2026-03-03）

### Schema 設計
- [x] 新增 feature_plans 表（功能方案設定：名稱/說明/積分價格×4/商城連結/啟用狀態）
- [x] 新增 feature_redemptions 表（用戶兌換紀錄：功能ID/用戶ID/天數/到期時間/來源）
- [x] 新增 purchase_orders 表（付費訂單：用戶ID/功能ID/天數/商城訂單號/審核狀態）
- [x] SQL 直接建表（db:push 無法處理 enum 變更）

### 後端 API
- [x] featureStore.list - 取得所有啟用的功能方案
- [x] featureStore.redeem - 積分兌換（扣積分+延長到期）
- [x] featureStore.createOrder - 建立付費訂單（填入商城訂單號）
- [x] featureStore.myHistory - 用戶兌換/訂單紀錄
- [x] featureStore.adminUpsertPlan / adminDeletePlan / adminListPlans
- [x] featureStore.adminListOrders / adminReviewOrder / adminGrantDays

### 前端頁面（/feature-store）
- [x] 功能卡片列表（名稱/說明/積分價格/商城連結）
- [x] 積分兌換流程（選時長→衝突檢查→確認扣點→成功提示）
- [x] 付費購買流程（選時長→衝突提示→跳轉商城→回來填訂單號）
- [x] 衝突提醒彈窗（三種情況：已包含/更高方案/已購買中）
- [x] 兌換紀錄 Tab（功能名稱/時長/到期日/來源/狀態）
- [x] 訂單填寫 Dialog（輸入商城訂單號+說明）
- [x] SharedNav 後台管理區加入「功能兌換中心管理」入口

### 後台管理
- [x] 功能方案設定頁（新增/編輯：名稱/說明/各時長積分/商城連結/啟用）
- [x] 訂單審核列表（待審核/已核發/已拒絕）
- [x] 手動核發天數（審核通過後自動延長用戶功能到期時間）
- [x] 拒絕訂單功能（附拒絕原因，通知用戶）

## 補運樂透頁面全面重構 v3.0

### 後端擴充
- [x] 新增大樂透選號引擎（1-49選6+特別號，天命加權）
- [x] 新增威力彩選號引擎（第一區1-38選6+第二區1-8）
- [x] 新增三星彩選號引擎（000-999，直選/組選）
- [x] 新增四星彩選號引擎（0000-9999，直選/組選）
- [x] 擴充 purchaseAdvice API 支援店家風水分數納入綜合指數
- [x] 新增 lotteryResult.save 支援大樂透/威力彩/三星/四星彩類型
- [x] 22 項新測試全部通過（lottery.generators.test.ts）

### 前端重構
- [x] 頁面決策鏈架構：天氣→財運時辰→彩券行地圖→綜合指數→折疊玩法
- [x] 綜合購彩指數橫幅（天氣+財運+店家風水三合一即時顯示）
- [x] NearbyStores 新增 onSelectStore 回調，選定後影響選號
- [x] 折疊標籤一：刮刮樂（面額選號+開獎對照+購買日誌）
- [x] 折疊標籤二：大樂透+威力彩（選號+開獎對照）
- [x] 折疊標籤三：三星彩+四星彩（選號+開獎對照）
- [x] 每個折疊標籤內含「開獎對照」讓用戶自行輸入記錄
- [x] 選定店家後自動重算號碼並顯示「已納入店家風水加持」標記

## 全系統設計原則（永久生效）
- [x] 所有面向用戶的說明/解讀/回饋文字，一律使用高情緒價值、正向鼓勵語言，讓用戶感受宇宙眷顧與特殊感

## 功能修復 & 增強 v6.0 - 後台管理全面升級

### 修復 /feature-store 前台無法顯示方案
- [ ] 診斷 featureStore.list API 為何前台無法顯示已新增方案
- [ ] 修復前台 FeatureStore.tsx 的資料載入邏輯

### 遊戲幣顯示
- [ ] 首頁/個人下拉選單新增遊戲幣餘額顯示（SharedNav 或 Header）
- [ ] 遊戲幣顯示即時更新（登入後自動刷新）

### 後台管理增強
- [ ] /admin/users 新增「增加遊戲幣」按鈕（可輸入數量+備注）
- [ ] /admin/user-groups 新增「批量增加遊戲幣」功能（對群組內所有用戶）
- [ ] 後端：admin.addCoins API（單一用戶增加遊戲幣）
- [ ] 後端：admin.addCoinsToGroup API（群組批量增加遊戲幣）

### /admin/dashboard 重新設計
- [ ] 後端：admin.dashboardStats API（各功能使用頻率統計）
- [ ] 統計項目：擲筊次數/刮刮樂選號次數/作戰室查看次數/各彩種選號次數/天命問卜次數
- [ ] 重新設計 dashboard UI（使用頻率排行榜 + 趨勢圖 + 用戶活躍度）
- [ ] 加入用戶增長曲線（每日新增用戶）
- [ ] 加入遊戲幣流通統計（總發放/總消耗/流通中）

## 功能修復 & 增強 v6.0 - 後台管理全面升級（已完成）

- [x] 確認 /feature-store 前台正常顯示方案（isActive=1 的方案正確顯示）
- [x] SharedNav 頂部導航新增遊戲幣顯示（積分旁顯示遊戲幣數量）
- [x] UserMenu 下拉選單新增遊戲幣顯示（積分區塊旁並列）
- [x] /admin/users 新增「增加遊戲幣」按鈕和 Modal（支援增加/扣除模式）
- [x] /admin/user-groups 新增「批量增加遊戲幣」按鈕和 Modal
- [x] 後端 adminAdjustCoins API（dashboard router）
- [x] 後端 batchAdjustCoins API（userGroups router）
- [x] 後端 getFeatureUsage API（dashboard router，各功能使用頻率統計）
- [x] getKpis API 新增 totalCoinsGranted 和 avgCoinsPerUser 欄位
- [x] /admin/dashboard 全面重新設計：KPI 卡片、功能使用頻率橫條圖、24h 活躍時段、方案分佈
- [x] 10 項新測試全部通過（admin.coins.test.ts）
- [x] 全部 233 項測試通過

## 補運樂透頁面修復 v7.0

- [x] 「為誰選號」改為可搜尋下拉選單（Combobox 樣式）
- [x] 隱藏所有計算百分比顯示（六維指數明細的 40%/30% 等）
- [x] 彩券行列表改為緊湊收合設計（預設收合，點擊展開詳情）
- [x] 刮刮樂移除重複 GPS 按鈕，整合地址五行分析到上方流程
- [x] 重構刮刮樂選號引擎：店家風水地氣（最大權重）→ 命主五行 → 流日流時 → 面額影響
- [x] 修復大樂透/威力彩/三星/四星彩重複號碼問題，加入隨機性邏輯
- [x] 大樂透/威力彩/三星/四星彩每次生成 5 組號碼

## 功能修復 v7.1 - 後台導航 + 用戶端兌換入口

- [x] 修復 /admin/feature-store 反回導航（包裝進 AdminLayout，側邊欄加入「功能兌換中心」項目）
- [x] 用戶端下拉選單（UserMenu）加入「方案兌換中心」入口，點擊跳轉至 /feature-store

## 錯誤修復 v7.2 - 首頁 tRPC API 查詢錯誤

- [x] 找出並修復首頁 tRPC 查詢回傳 HTML 而非 JSON 的錯誤（確認為舊日誌錯誤，目前無此問題）

## 功能修復 v7.2 - 多項修復與新功能

- [x] 修復首頁 tRPC API 查詢錯誤（確認為舊日誌錯誤，目前無此問題）
- [x] 修復 /feature-store 反回導航（加入 SharedNav 和返回按鈕）
- [x] 建立全站懸浮廣告系統：資料庫表 site_banners
- [x] 後台新增「廣告/公告管理」區域（/admin/banners），支援新增/編輯/刪除/啟用停用
- [x] 前台全站懸浮廣告元件 FloatingBanner（可收納成小圓球）
- [x] 每日運勢（WarRoom）白話文改寫：十神能量分析→今日能量指引、地支藏干→隱藏的能量、今日塔羅流日→今日塔羅牌指引、全天時辰能量時間軸→今日各時段運勢
- [x] /luck-cycle 白話文改寫：大限流年→未來五年運勢、四化→財運加持/掌控力提升/貴人相助/需要留意
- [x] /divination AI 回覆邏輯改寫：白話文、情緒價值、鼓勵文字、直接回答具體問題
- [x] 修正每日運勢「今日時辰能量」顏色固定問題（DietPage 0-10 改為 0-100 閱值）

## Project Nexus v8.0 - 天命聯盟・專家平台

### feature-store 修復
- [x] feature-store 顯示用戶目前方案名稱、到期時間、已訂閱功能清單

### Phase 0：地基與權限
- [x] users 表確認 role 欄位（'user'/'expert'/'admin'）
- [x] 建立 experts 表（userId, publicName, title, bio, profileImageUrl, coverImageUrl, tags, status）
- [x] 建立 /expert/* 路由守衛（role=expert 或 admin 才能進入）
- [x] 後台管理員可管理專家帳號（審核/啟用/停用/指派 role）

### Phase 1：專家後台
- [x] 建立 expert_services 表
- [x] 建立 expert tRPC router（getMyProfile/updateMyProfile/listMyServices/createService/updateService/deleteService）
- [x] /expert/dashboard 儀表盤頁面
- [x] /expert/profile-editor 個人品牌編輯器（含 Markdown bio 編輯）
- [x] /expert/services 服務項目管理頁面

### Phase 2：智能行事曆
- [x] 建立 expert_availability 表
- [x] 建立 bookings 表
- [x] expert.setAvailability / getCalendarData API
- [x] user.createBooking API
- [x] /expert/calendar 日曆頁面（FullCalendar/React Big Calendar）

### Phase 3：用戶前台
- [x] public.listExperts / getExpertDetails API
- [x] user.uploadPaymentProof / expert.confirmPayment API
- [x] /experts 專家市集頁面（卡片佈局+標籤篩選）
- [x] /experts/[expertId] 專家個人主頁（介紹+服務+預約日曆）
- [x] /booking/[bookingId]/pay 支付頁面（QR Code + 上傳付款截圖）

### Phase 4：溝通與完善
- [x] 建立 private_messages 表
- [x] 建立 reviews 表
- [x] chat.getMessages / sendMessage API
- [x] review.submitReview / public.getExpertReviews API
- [x] /my-bookings/[bookingId]/chat 私訊室頁面
- [x] 專家個人主頁新增「用戶評價」標籤頁
- [x] 後台管理員完整控管專家（審核/停用/查看訂單/查看評論）

## 功能修復 v8.1 - feature-store 方案顯示 + 專家系統後台控管（2026-03-04）
- [x] /feature-store 修正：始終顯示用戶目前方案名稱、方案效期、已訂閱功能清單（含各功能到期時間）
- [x] AdminExperts 頁面：後台管理員完整控管專家（審核/啟用/停用/查看預約）
- [x] AdminLayout 側邊欄加入「專家管理」入口
- [x] SharedNav 加入「天命聯盟」（/experts）和「我的預約」（/my-bookings）導航入口
- [x] MyBookings 頁面：用戶查看自己的預約記錄（含狀態/時間/專家資訊）
- [x] App.tsx 加入所有專家系統相關路由

## 功能修復 v8.2 - SharedNav 邏輯修正 + 三項建議實作（2026-03-04）
- [x] SharedNav 修正：天命聯盟後台入口只對 expert/admin 顯示，一般用戶不顯示
- [ ] 修復 OracleCalendar TypeScript 錯誤（calendar router 尚未實作）
- [ ] 修復 OracleCast TypeScript 錯誤（insight router 尚未實作）
- [ ] 財運羅盤個人化：依用戶命格（八字/生肖/五行）生成個人化財運建議
- [x] WBC 截止時間後台設定：管理員可設定每場比賽的下注截止時間（分鐘數）

## 天命聯盟完善 v8.3（2026-03-04）
- [x] 審查命理師後台現有頁面（/expert/dashboard, /expert/profile, /expert/services, /expert/calendar, /expert/bookings）
- [x] 確認 admin 可直接使用命理師後台（ExpertLayout 允許 admin 進入）
- [x] expert.ts 修正：admin 無 expert 記錄時回傳空陣列而非報錯
- [x] updateMyProfile 修正：admin 建立專家記錄時直接設為 active
- [x] ExpertDashboard 修正：admin 首次進入時顯示建立引導画面
- [x] SharedNav 修正：命理師後台入口只對 expert/admin 顯示
- [x] 確認用戶前台流程完整（/experts 市集、/experts/:id 個人頁、預約、支付）

## WBC 截止時間後台設定 v8.4（2026-03-04）
- [x] 分析現有 WBC 資料庫結構和後端 API
- [x] 後端：wbc_matches 表新增 bettingDeadlineMinutes 欄位（預設 30）
- [x] 後端：管理員 API 新增設定個別比賽截止時間的 mutation
- [x] 後台管理頁面：比賽列表新增截止時間設定欄位（分鐘數輸入）
- [x] 前台競猜頁面：顯示截止倒數計時（距截止時間 X 小時 Y 分）
- [x] 前台：截止後禁止下注並顯示「投注已截止」狀態

## UI 優化 v8.5（2026-03-04）
- [x] 移除 SharedNav 導覽列中重複的積分/遊戲幣按鈕（已在下拉選單中顯示）
- [x] 優化 /expert/dashboard 手機版（側欄改為底部導覽列，主內容全寬顯示）

## 專家後台優化 v8.6（2026-03-04）
- [x] 審查並優化手機版子頁面排版（profile/services/calendar/bookings 表單/卡片間距）
- [x] ExpertLayout 底部導覽列訂單管理加入未讀訂單紅點徽章
- [x] 各子頁面頂部標題列右側加入快捷操作按鈕（新增服務、新增時段等）

## 管理後台提升命理師功能 v8.7（2026-03-04）
- [x] AdminUsers.tsx：用戶操作列加入「提升為命理師」按鈕（role=user 才顯示）與確認 Dialog（輸入公開名稱）
- [x] AdminUsers.tsx：已是命理師的用戶顯示「⭐ 命理師」標籤
- [x] AdminExperts.tsx：專家列表加入「撤銷命理師資格」按鈕

## 專家後台與命理師申請 v8.8（2026-03-04）
- [x] ExpertProfile 專業領域：新增更多標籤（陽宅開運、塔羅占卜、生命靈數等）+ 自訂手填輸入區塊
- [x] 提升命理師後自動發送站內通知給用戶（含後台連結）
- [x] 用戶個人設定頁加入「申請成為命理師」入口，管理員在 AdminExperts 審核
- [x] AdminUsers 加入角色篩選下拉選單（全部/一般用戶/命理師/管理員）

## Bug 修復 v8.9（2026-03-05）
- [x] 修復 /calendar 頁面 calendar.monthly tRPC 路由遺失（No procedure found on path "calendar.monthly"）

## WBC 隱藏與 Divination 積分控制 v8.10（2026-03-07）
- [x] 隱藏今日運勢頁 WBC 橫幅通知（isActive=false 時不顯示）
- [x] 後台 /admin/marketing WBC 活動加入啟用/停用開關並關閉
- [x] /divination 積分改為 30 點（後端 + 前端）
- [x] 後台加入 /divination 頁面積分控制（可設定每次消耗積分數）

## 鳳凰計畫 - 天命幣經濟系統 v9.0
### 模塊一：後端核心改造（天命幣系統）
- [x] drizzle/schema.ts：features 表新增 coinCostPerUse 欄位
- [x] drizzle/schema.ts：plans 表新增 firstSubscriptionBonusCoins / monthlyRenewalBonusCoins 欄位
- [x] drizzle/schema.ts：points_transactions 表新增 featureId 欄位
- [x] pnpm db:push 執行遷移
- [x] server/routers/coins.ts：新建天命幣核心路由（spendCoins / getBalance / getTransactions）
- [x] server/routers.ts：topicAdvice 改用 spendCoins 核心函數
- [x] server/routers/wardrobe.ts：scan/analyze 改用 spendCoins 核心函數
- [x] server/routers/diet.ts：aiChef 改用 spendCoins 核心函數
- [x] server/routers.ts：deepRead 改用 spendCoins 核心函數
- [x] 初始化 features 表的 coinCostPerUse 預設値值

### 模塊二：管理後台升級
- [x] AdminFeatures 頁面：新增「單次消耗天命幣」欄位編輯
- [x] AdminPlans 頁面：新增「首次訂閱贈幣」「每月續訂贈幣」欄位
- [x] 訂閱邏輯：購買方案時自動發放首次贈幣### 模塊三：天命小舖頁面改造
- [x] /feature-store 改名為「天命小舖」
- [x] 新增「天命幣餘額」顯示區（醒目樣式）
- [x] 新增「天命幣充値」 Tab（充値商品卡片 UI）
- [x] 充値商品：100/550/1200/5000 天命幣四種規格
- [x] 預留金流串接口（/api/payment/topup + /api/payment/webhook）
- [x] 「訂閱方案」 Tab 顯示各方案贈幣資訊

### 模塊四：前台 UI 全面適配
- [x] 天命問卜按鈕顯示消耗天命幣數量（動態從後端讀取）
- [x] 擲筊深度解讀按鈕顯示消耗天命幣數量
- [x] 穿搞揃描按鈕顯示消耗天命幣數量
- [x] 天命菜單按鈕顯示消耗天命幣數量
- [x] 餘額不足時彈出「前往天命小舖充値」 Modal
- [x] SharedNav 顯示「天命幣」而非「積分」

### 測試
- [x] vitest：天命幣 spendCoins 核心邏輯測試
- [x] vitest：餘額不足時 AI 不被呼叫
- [x] vitest：方案購買發放贈幣測試
- [x] 整合測試：完整問卜流程（扣幣 + 記錄）

## 鳳凰計畫 v9.1 - 後台大改版

### 天命小舖後台管理
- [x] 建立 /admin/destiny-shop 頁面（天命小舖管理）
- [x] 整合 AI 功能天命幣費用設定（從 AdminFeatureStore 提取 coinCostPerUse 相關功能）
- [x] 移除 /admin/marketing 的「🔮 問卜費用設定」區塊（統一到天命小舖管理）
- [x] 左側導覽新增「天命小舖管理」入口

### /admin/dashboard 大改版
- [x] 移除圖1「已啟用用戶」卡片（邀請碼舊功能）
- [x] 移除圖2「今日活躍」卡片（無意義）
- [x] 移除圖3「累積發放遂戲幣/用戶平均遂戲幣」卡片（天命娛樂城暫停）
- [x] 圖4 功能使用頻率區塊：加入 AI 功能天命幣消耗估算欄位
- [x] 圖5 方案分佈：修正查詢邏輯，對齊後台實際方案資料
- [x] 圖6 快速操作：改為更有意義的數據分析（天命幣流通統計）
- [x] 圖7 24小時活躍時段：改為天命幣收支趨勢圖（近7天/30天）

### /expert/dashboard 修正
- [x] 讀取並了解 expert dashboard 現有結構與問題
- [x] 修正重複 key 錯誤（靈歌治療出現兩次）
- [x] 預留金流串接相關顯示（線上金流付款即將開放提示區塊）

### 功能修正 v9.2 - Loading 快取 + 性別欄位
- [x] 修正作戰室每次重整都重新呼叫 LLM 的 Loading 問題（加入當日快取）
- [x] /my-profile 新增性別必填欄位（資料庫 + 後端 + 前端）
- [x] /admin/user-groups 新增成員 Modal 加入「全選」功能（全選/取消全選當前頁面用戶）

## 天命聯盟大改版 v10.0

### Schema 擴充
- [ ] experts 表新增 slug（專屬網址）、bioHtml（HTML介紹）、profileImageUrl 確認
- [ ] expert_availability 重構：改為時段制（startTime/endTime 代表可接受預約的時間範圍）
- [ ] expert_calendar_events 新增（線下活動/課程公告，老師可在行事歷標記）
- [ ] bookings 表新增 endTime（結束時間）、paymentMethod、paymentNote 欄位
- [ ] 確認 private_messages 表已存在並可用

### 後端 API 重建
- [ ] expert.updateMyProfile 新增 slug、bioHtml 欄位
- [ ] expert.getExpertBySlug 新增（用 slug 查詢，供前台 /experts/:slug 使用）
- [ ] expert.listExperts 改為用 specialties 欄位篩選（非 tags）
- [ ] expert.setAvailabilityRange 重建：老師設定可接受預約的時間範圍
- [ ] expert.getAvailableTimeSlots：根據服務時長自動計算可選起始時間
- [ ] expert.createBooking 重建：傳入 startTime + serviceId，自動計算 endTime
- [ ] expert.createCalendarEvent / listCalendarEvents（線下活動管理）
- [ ] expert.sendMessage / getMessages（訊息系統，限下單後）
- [ ] expert.getBookingDetail（取得單一訂單詳情）

### 師資後台升級
- [ ] ExpertProfile：照片上傳（S3）
- [ ] ExpertProfile：HTML 富文本編輯器（bioHtml 欄位，鎖定危險 CSS）
- [ ] ExpertProfile：個人介紹文字排版（whitespace-pre-wrap）
- [ ] ExpertProfile：slug 專屬網址設定欄位
- [ ] ExpertServices：服務項目卡片化重設計
- [ ] ExpertCalendar：行事歷月曆視圖重建（可視化時段 + 線下活動）
- [ ] ExpertCalendar：時段範圍設定（設定 from-to 整段時間可預約）

### 前台升級
- [ ] /experts：篩選連動修正（用 specialties 欄位而非 tags）
- [ ] /experts/:slug 路由新增（同時保留 /experts/:id 相容）
- [ ] ExpertDetail：行事歷展示（月曆視圖，顯示可預約時段與活動）
- [ ] ExpertDetail：預約流程重建（選服務→選日期→選起始時間→確認）
- [ ] 下單後導向 /booking/:id 確認頁（非回到師資頁）

### 訂單流程優化
- [ ] /booking/:id 新訂單確認頁（訂單詳情 + 付款說明 + 上傳憑證）
- [ ] /my-bookings 大改版（更豐富的訂單卡片，含付款狀態、聯絡按鈕）
- [ ] 付款憑證上傳改為 15 天保留說明

### 訊息互動功能
- [ ] /messages/:bookingId 聊天室頁面（師生下單後可互動）
- [ ] ExpertOrders 加入「回覆訊息」入口
- [ ] /my-bookings 加入「聯絡老師」入口（限已確認訂單）

## 天命聯盟大改版 v10.0

- [x] 資料庫 Schema 擴充：experts 表加入 slug（專屬網址）、bioHtml（HTML 介紹）欄位
- [x] 資料庫 Schema 擴充：expertCalendarEvents 表（行事歷活動：線下/線上/公告）
- [x] 資料庫 Schema 擴充：expertAvailability 加入 endTime 欄位（時段制）
- [x] 資料庫 Schema 擴充：bookings 加入 endTime、paymentMethod 欄位
- [x] 後端 API：getExpertBySlug（透過 slug 查詢師資）
- [x] 後端 API：listExpertCalendarEvents（公開行事歷活動查詢）
- [x] 後端 API：行事歷活動 CRUD（createCalendarEvent、deleteCalendarEvent）
- [x] 後端 API：getSystemSetting / adminUpdateSystemSetting（天命聯盟名稱可改）
- [x] 後端 API：updateMyProfile 支援 slug、bioHtml、profileImageUrl 欄位
- [x] 師資後台 /expert/profile：照片上傳功能（S3 儲存）
- [x] 師資後台 /expert/profile：HTML 富文本編輯器（@uiw/react-codemirror）
- [x] 師資後台 /expert/profile：slug 專屬網址設定
- [x] 師資後台 /expert/services：服務項目卡片化設計
- [x] 師資後台 /expert/calendar：全月曆格子視圖（可批次新增時段）
- [x] 師資後台 /expert/calendar：行事歷活動管理（線下活動/線上活動/公告）
- [x] 師資後台 /expert/calendar：時段制預約邏輯（老師設定時段，用戶選取後付款才佔位）
- [x] 前台 /experts：篩選連動修正（specialties 欄位與 SPECIALTY_OPTIONS 同步）
- [x] 前台 /experts：師資卡片升級（照片顯示、評分、標籤）
- [x] 前台 /experts/:id：Tab 化設計（個人介紹/服務項目/行事曆/評價）
- [x] 前台 /experts/:id：支援 slug 路由（/experts/my-slug）
- [x] 前台 /experts/:id：bioHtml 渲染（prose 排版）
- [x] 前台 /experts/:id：行事曆 Tab 顯示可預約時段與活動
- [x] 前台 /experts/:id：服務選取後展開時段選擇，付款說明提示
- [x] 前台 /my-bookings：全面美化（狀態色條、訂單詳情、操作按鈕）
- [x] 前台 /my-bookings：付款說明 Dialog（ATM 轉帳說明、付款憑證上傳、15天保留提示）
- [x] 前台 /messages：訂單專屬聊天室（師生下單後溝通，5秒輪詢）
- [x] 257 項測試全部通過，TypeScript 零錯誤
- [x] 儲存 v10.0 checkpoint

## 天命聯盟 + AI 扣點顯示 v10.1

### 天命聯盟訂單/互動系統
- [x] 用戶 /my-bookings：訂單詳情展開（Dialog 顯示完整資訊）
- [x] 用戶 /my-bookings：取消訂單功能（pending_payment 狀態可取消）
- [x] 用戶 /my-bookings：進入訂單聊天室按鈕
- [x] 師資後台訂單管理：可點擊查看訂單詳情
- [x] 師資後台訂單管理：確認/取消訂單功能
- [x] 行事歷重建：老師設定「可用時段區間」（startTime-endTime 區間，非單一時段）
- [x] 行事歷重建：用戶在師資頁自由選取時間段（在老師區間內）
- [x] 行事歷重建：下單後老師透過訊息確認，確認後才進入付款流程

### AI 功能天命幣扣點前台顯示
- [x] 撲筊問卦：加入天命幣餘額顯示 + 每次扣點提示（修正 feature ID: oracle_deepread → oracle）
- [x] AI 飲食羅盤：加入天命幣餘額顯示 + 每次扣點提示（feature ID: warroom_dietary）
- [x] 檢查神諭穿搞/財運羅盤等其他 AI 模塊扣點邏輯一致性

## 聊天室修復 + 行事歷升級 + 通知推播 v10.2

- [x] 修復聊天室無法傳訊息問題（wouter useSearch 修正 query string 解析）
- [x] 聊天室加入15天訊息保留提示
- [x] 行事歷顏色升級：可用區間綠色、已預約橙色、活動藍色、預約比例小標記
- [x] 訂單確認雙向通知：老師確認/取消訂單時自動推播給用戶（booking_update 型別通知）

## 全站主題色系 + 主帳號個人資料修正 v10.3

### 全站主題色系切換
- [x] 研究女性偏好色系，設計 6 套配色方案（櫻花粉/薰衣草/玫瑰金/海霧藍/森林翠/神秘紫）
- [x] 利用現有 system_settings 表儲存當前主題方案（active_theme key）
- [x] 建立 themes.ts 定義檔，全站 CSS 變數化（applyTheme 動態注入 CSS 變數）
- [x] 後台新增「主題配色管理」頁面 /admin/theme（配色方案選擇器 + 即時預覽 + 儲存）
- [x] 前端啟動時從後台讀取主題設定並動態套用（ThemeInitializer 組件）

### 主帳號個人資料修正
- [x] SharedNav 移除主帳號的 !isOwner 限制，所有用戶包含主帳號都可存取 /my-profile
- [x] ProfilePage 主帳號改為優先使用 DB 資料，無 DB 資料時才用靜態 fallback
- [x] ProfilePage 主帳號加入「編輯命格資料」按鈕（之前只有一般用戶才有）
- [x] 測試驗證：新增 theme.profile.test.ts，267 項測試全部通過

## 命理引擎動態化 v10.4

- [x] 審查現有架構：確認 hourlyEnergy/lottery/warRoom 已支援 dynamicProfile 參數
- [x] DB 新增 natalWood/Fire/Earth/Metal/Water 欄位（直接 SQL 新增，drizzle schema 同步）
- [x] getUserProfileForEngine 更新：優先用 DB natal 欄位，其次用 calculateBazi 動態計算，最後才估算
- [x] ProfilePage 更新：優先用 DB natal 欄位顯示圓餅圖，其次四柱估算，最後用靜態 fallback
- [x] 撰寫 dynamic-engine.test.ts，12 項測試全部通過（共 279 項全部通過）

## 全站主題色系修復 v10.5

- [x] 診斷根本原因：全站 20+ 個檔案硬編碼背景色（bg-[#050d14]等），導覽列/頁面背景/彈出視窗完全繞過主題系統
- [x] 重新設計 themes.ts：每套主題新增 pageBg/navBg/tooltipBg/tooltipBorder 等專用 CSS 變數，各主題背景色差異明顯
- [x] 更新 index.css：新增 .oracle-page 類別，全站 20+ 個檔案的硬編碼色全改為 CSS 變數
- [x] 更新 AdminTheme 頁面：每張主題卡片加入縮圖 UI 預覽（導覽列+卡片+按鈕實際色彩），279 項測試全部通過

## 淺色主題版本 v10.6

- [x] 為 6 套主題各新增淺色版本（共 12 套主題）
- [x] 更新 themes.ts：淺色主題的 pageBg/navBg/card/foreground 使用淺色値（白底深色文字）
- [x] 更新 AdminTheme 頁面：深色/淺色分組顯示，各套主題卡片都有縮圖 UI 預覽
- [x] index.css 新增淺色主題文字色修正規則（.oracle-page 下 text-white/60 等自動轉換）
- [x] 測試驗證，279 項測試全部通過

## 後台底部導覽列修復 v10.7

- [x] 後台底部導覽列改為水平可滑動（overflow-x: auto），每個項目固定 4.5rem 寬度不壓縮
- [x] 加入左右漸層遷罩提示可滑動，選中項目加上 amber 頂部境界線標示
- [x] 切換頁面時 useEffect 自動滾動選中項目到畫面中央，279 項測試全部通過

## 淺色主題文字修復 + 後台導覽列重構 v10.8

- [x] 修復淺色主題文字：在 themes.ts applyTheme 加入 data-theme-mode="light" 屬性，index.css 加入全局覆蓋規則（text-white/slate-100~700 全部映射到 foreground）
- [x] 後台行動版導覽列移到頂部（Header 下方水平滑動 Tab，左右漸層遷罩，切頁自動置中）
- [x] 桌面側邊欄改為三大折疊分組：用戶管理/行銷工具/系統設定，包含展開/收起動畫、当前頁面自動展開群組
- [x] 279 項測試全部通過

## 淺色主題全面修復 v10.9

- [ ] 修復農曆月份 undefined bug（ProfilePage / 命格方舟）
- [ ] Recharts 圖表軸線、格線、tooltip 改用 CSS 變數（WeeklyReport、AdminDashboard）
- [ ] 管理後台統計卡片深色背景改用 CSS 變數
- [ ] 飲食羅盤補運指數圓圈、卡片深色背景改用 CSS 變數
- [ ] 財運羅盤偏財儀表板深色區塊改用 CSS 變數
- [ ] 用戶下拉選單背景色改用 CSS 變數
- [ ] 彈出視窗（Dialog/Sheet）背景色確保跟著主題走

## v10.9 任務清單

- [ ] 淺色主題螢光色全面改為深色系（themes.ts 定義深色變數 + index.css 覆蓋規則）
- [ ] 修復 Recharts 圖表在淺色主題下使用深色系顏色
- [ ] 修復農曆月份 undefined bug
- [ ] 天命聯盟前台：修復大頭貼被封面圖踩到的定位問題
- [ ] 天命聯盟前台：修復封面圖上傳後未更新顯示的連接問題
- [ ] 後台架構：天命聯盟管理（含名字更換功能）移至專家後台統一管理
- [ ] 更新用戶下拉選單對應後台架構變更

## v10.9 完成紀錄
- [x] 淺色主題螢光色全面改為深色系（index.css 全局覆蓋規則）
- [x] 天命聯盟前台：修復大頭貼被封面圖踩到的定位問題（ExpertMarket 卡片）
- [x] 天命聯盟前台：修復封面圖上傳後未更新顯示的連接問題（ExpertDetail + listExperts 加入 coverImageUrl）
- [x] 後台架構：在專家管理頁面新增「編輯資料」按鈕（管理員可直接修改專家公開名稱與頭銜）
- [x] 新增 adminUpdateExpertProfile 後端 API
- [x] 更新用戶下拉選單：「命理師後台」改為「天命聯盟專家後台」並更新描述文字
- [x] 284 項測試全部通過

## v11.0 完成紀錄
- [x] 後台 AdminExperts 新增「天命聯盟名稱設定」區塊，管理員可修改前台顯示名稱
- [x] 新增 getAllianceName / adminUpdateAllianceName 後端 API（使用 systemSettings 表）
- [x] DB schema 新增 team_messages 表（用戶傳訊給天命管理團隊，保存三天）
- [x] DB schema 新增 private_messages.isRead / readAt 欄位
- [x] 新增 sendTeamMessage / getTeamConversation / markTeamMessagesRead 用戶端 API
- [x] 新增 adminListTeamMessages / adminReplyTeamMessage / adminMarkTeamMessageRead 管理員 API
- [x] 用戶下拉選單新增「傳訊給團隊」按鈕，開啟 TeamMessageDialog 對話框
- [x] TeamMessageDialog：對外顯示「天命管理團隊」、訊息保存 3 天、三天無回應自動清除
- [x] 後台 AdminExperts 新增「用戶訊息」分頁，管理員可查看並回覆用戶傳來的訊息
- [x] Messages.tsx 改為 LINE 式左右呈現（自己在右、對方在左）
- [x] Messages.tsx 加入已讀功能：自己發送的訊息顯示「✓」或「已讀」
- [x] getMessages 後端 API 自動標記對方訊息為已讀，並回傳 isRead 欄位

## 淺色主題修復 v11.1

- [x] 擴充 index.css：補充 bg-gray-950/slate-950 極深色頁面底色覆蓋
- [x] 擴充 index.css：補充 bg-gray-800/900 帶透明度（/10~/80）覆蓋
- [x] 擴充 index.css：補充 bg-slate-800/900 帶透明度覆蓋
- [x] 擴充 index.css：補充 bg-purple-900/950 及帶透明度覆蓋（DivinationPage）
- [x] 擴充 index.css：補充 bg-indigo-900/950 覆蓋
- [x] 擴充 index.css：補充 bg-white/5~25 半透明白色背景覆蓋（WealthPage/DietPage）
- [x] 擴充 index.css：補充 border-white/5~15 半透明白色邊框覆蓋
- [x] 擴充 index.css：補充 text-teal-500、text-gray-100 等缺漏文字色覆蓋
- [x] WealthPage.tsx：將 bg-[#0a0f1a] 替換為 oracle-page（主題感知）
- [x] DietPage.tsx：將 bg-[#0a0a0f] 替換為 oracle-page（主題感知）
- [x] ProfilePage.tsx：將 min-h-screen bg-gray-950 替換為 oracle-page，修復輸入框
- [x] CasinoPage.tsx：將 bg-[#0a0e1a] 替換為 oracle-page
- [x] WbcPage.tsx：將 bg-[#0a0e1a] 替換為 oracle-page
- [x] NotificationsPage.tsx：將 bg-[#0a0e1a] 替換為 oracle-page
- [x] WardrobePage.tsx：將 Dialog/SheetContent 的 bg-[#1a1a2e] 替換為 bg-popover
- [x] 295 項測試全部通過，TypeScript 零錯誤

## 農曆顯示修復 v11.2

- [x] 修復後端 calculateAndSaveBazi 使用 lunar-typescript 正確換算農曆（支援 1900-2100 年）
- [x] ProfilePage 農曆欄位：若 DB 值含 undefined 則即時呼叫 toLunar 重新換算
- [x] MyProfile 載入時清除含 undefined 的舊農曆字串
- [x] MyProfile LunarDateHint 加入 onLunarResolved 回調，birthLunar 空時自動填入
- [x] ProfilePage 底部「編輯命格資料」按鈕：僅在自己的命格頁面才顯示
- [x] 按鈕文字依狀態切換：有資料顯示「編輯命格資料」，無資料顯示「建立命格檔案」
- [x] 295 項測試全部通過，TypeScript 零錯誤

## ProfilePage 命格備注與 IncompleteProfilePrompt 修復 v11.3

- [x] effectiveProfile 改為智慧合併：DB 有四柱用 DB，無四柱時合併靜態四柱與 DB 基本資料
- [x] IncompleteProfilePrompt 三處加入 `user ?` 條件，訪客不顯示「請填寫」提示
- [x] 295 項測試全部通過，TypeScript 零錯誤

## 唯讀管理員角色 (viewer) v11.4

- [x] 擴充 users 資料表 role enum 加入 viewer 角色
- [x] 後端加入 viewerProcedure（可讀取所有管理資料，但寫入操作拒絕）
- [x] 後台所有 Admin 頁面套用唯讀限制（按鈕 disabled + tooltip + useAdminRole hook）
- [x] 設定 williamtsengring@gmail.com 帳號為 viewer 角色
- [x] 修復 AdminExperts Card disabled 屬性錯誤
- [x] 修復 AdminFeatureStore 重複 disabled 屬性錯誤
- [x] 修復 AdminMarketing 重複 title 屬性錯誤
- [x] 295 項測試全部通過，TypeScript 零錯誤

## 首頁 SEO 修復 v11.4.1

- [x] 縮減 meta keywords 由 9 個改為 6 個（八字命理,紫微斗數,擲筊問卦,每日運勢,命格分析,天命共振）
- [x] 延長 index.html title 至 37 字元（80-60 範圍）
- [x] WarRoom.tsx 加入 document.title 動態設定（33-36 字元）
- [x] WarRoom.tsx 加入 sr-only H2 標題（視覺隱藏但機器可讀）
- [x] 295 項測試全部通過，TypeScript 零錯誤

## 特殊存取 Token 系統 (AI 渠道) v11.5

- [x] DB schema 新增 access_tokens 資料表（直接 SQL 建表）
- [x] 後端： server/routers/accessTokens.ts（list/create/setActive/delete/verify）
- [x] 後端： Token 驗證為 publicProcedure，不需登入
- [x] 前台： /admin/access-tokens 管理頁面（生成/廢止/刪除/複製連結）
- [x] 前台： /ai-view?token=xxx 特殊進入路由（今日運勢全景展示）
- [x] AdminLayout 導覽加入 AI 渠道 Token 項目
- [x] 撰寫 accessTokens.test.ts（13 項測試）
- [x] 308 項測試全部通過，TypeScript 零錯誤

## 用戶角色管理 UI v11.6

- [x] 後端：account router 加入 setUserRole adminProcedure
- [x] 前台：AdminUsers 頁面每個用戶列加入角色切換下拉選單
- [x] 防護：主帳號（owner）不可被降級，自己不可改自己角色
- [x] 撰寫測試，325 項全部通過，TypeScript 零錯誤

## Token 管理強化 + 角色 UI v11.7

- [x] AdminUsers：每個用戶列加入角色切換下拉選單（admin/viewer/user）
- [x] AdminUsers：角色切換即時生效，樂觀更新 + toast 提示
- [x] AdminAccessTokens：生成 Token 時可勾選開放模組（運勢/塔羅/偶財/時辰）
- [x] AdminAccessTokens：Token 列表顯示已開放模組標籤
- [x] AiView：依 Token 設定的模組動態顯示/隱藏對應區塊
- [x] AdminAccessTokens：Token 到期前 7 天顯示橙色警示標籤
- [x] AdminDashboard：加入 Token 到期警示區塊（列出 7 天內到期的 Token）
- [x] 撰寫測試，325 項全部通過，TypeScript 零錯誤

## AI Token 後台唯讀模式 + 全站唯讀 v11.8

- [x] DB：access_tokens 新增 accessMode 欄位（daily_view / admin_view）
- [x] 後端：accessTokens router 的 create/list/verify 支援 accessMode
- [x] AiEntry.tsx：Token 驗證 → sessionStorage 寫入 AI session → 跳轉後台
- [x] useAdminRole hook：讀取 AI session，讓後台認為是 viewer 模式
- [x] AdminLayout：支援 AI session（跳過 OAuth 登入檢查，直接以 viewer 身份進入）
- [x] AccessGate：支援 AI session（跳過 OAuth 登入檢查）
- [x] AiReadOnlyBanner 全站横幅提示條（前台+後台共用，顯示 Token 名稱與到期時間、退出按鈕）
- [x] AdminAccessTokens：生成對話框加入存取模式選擇（今日運勢 / 全站唯讀）
- [x] AdminAccessTokens Token 列表顯示存取模式標籤，複製連結自動切換路徑
- [x] App.tsx 註冊 /ai-entry 路由
- [x] 撰寫 8 項 accessMode 測試，333 項全部通過，TypeScript 零錯誤

## AI JSON API + Token 使用紀錄 v11.9

- [x] 後端：/api/ai-data?token=xxx 純 JSON 端點（Token 驗證 + 結構化資料輸出）
- [x] 後端：JSON 輸出包含四柱、十神、塔羅、偶財指數、時辰摘要等欄位
- [x] DB：建立 token_access_logs 資料表（token_id/ip/path/accessed_at）
- [x] 後端：每次 Token 驗證時自動寫入存取紀錄
- [x] 後端：accessTokens.getLogs adminProcedure（查詢指定 Token 最近 10 次紀錄）
- [x] 前端：AdminAccessTokens 每個 Token 卡片加入「使用紀錄」展開面板
- [x] 撰寫測試，333 項全部通過，TypeScript 零錯誤

## Token 連結修復 + /ai-entry 導覽頁 v11.10

- [x] 修復：AdminAccessTokens 生成對話框的存取連結依 accessMode 自動切換（admin_view → /ai-entry）
- [x] 修復：Token 列表「複製連結」按鈕依 accessMode 自動切換路徑
- [x] 重建 /ai-entry 導覽頁（列出所有前台+後台區域與快速連結）
- [x] 333 項測試全部通過，TypeScript 零錯誤

## JSON API 說明文件 v11.11

- [x] /ai-entry 導覽頁底部加入 /api/ai-data JSON API 說明文件區塊
- [x] 說明文件包含：端點格式、欄位說明表格、範例回應 JSON、錯誤碼說明、複製 API 端點按鈕
- [x] 333 項測試全部通過，TypeScript 零錯誤

## API 即時測試工具 v11.12

- [x] /ai-entry 說明文件區塊加入「立即測試」按鈕
- [x] 點擊後呼叫 /api/ai-data?token=xxx 並展示格式化 JSON 回應
- [x] 顯示請求狀態（載入中、成功、失敗）、HTTP 狀態碼、耗時、重新測試按鈕
- [x] 333 項測試全部通過，TypeScript 零錯誤

## 修復 AI Token 仍要求登入問題 v11.13

- [x] 診斷：/ai-entry 被 AccessGate 殔止，導致 Token 驗證邏輯無法執行
- [x] 修復：將 /ai-entry 與 /ai-view 路由移至 AccessGate 之外，不需登入即可存取
- [x] 333 項測試全部通過，TypeScript 零錯誤

### v12.0 Token 虛擬身分系統
- [x] DB schema：access_tokens 加入 identityType（ai_readonly/trial/basic）欄位
- [x] DB schema：access_tokens 加入虛擬命盤欄位（guestName, guestGender, guestBirthYear, guestBirthMonth, guestBirthDay, guestBirthHour）
- [x] DB migration：SQL ALTER TABLE 直接新增欄位
- [x] 後端 context.ts：讀取 X-AI-Token header，驗證後注入虛擬 viewer 用戶
- [x] 後端 trpc.ts：viewerProcedure 支援虛擬用戶（ctx.user 為虛擬 viewer）
- [x] 後端 accessTokens router：create 時依 identityType 隨機生成虛擬命盤
- [x] 後端 account router：getProfile 支援虛擬命盤（AI session 模式回傳虛擬資料）
- [x] 前端 main.tsx：tRPC httpBatchLink 加入 X-AI-Token header（從 sessionStorage 讀取）
- [x] 前端 AiReadOnlyBanner：體驗/基礎方案顯示琥珀色體驗模式提示條，顯示虛擬命盤姓名與出生日期
- [x] 前端 AdminAccessTokens：生成 Token 時加入 identityType 選擇（AI 全站唯讀 / 體驗方案 / 基礎方案）
- [x] 前端 AiEntry：AiSession 介面加入 identityType 和 guestProfile 欄位
- [x] 測試：accesTokens.guestProfile.test.ts 新增 21 項測試，348 項全部通過

## v12.1 Token 虛擬身分系統修正

- [x] 後端 schema：identityType 改為 varchar（支援動態方案 ID），移除硬編碼 enum
- [x] 後端 accessTokens router：AI Token（ai_full）也附帶虛擬命盤；新增 listPlans 查詢供前端動態讀取
- [x] 後端 accessTokens router：needsGuestProfile() 函數取代硬編碼 enum 判斷
- [x] 前端 AdminAccessTokens：身分類型改為動態讀取後台 plans 清單的下拉選單，加入「AI 全功能（含虛擬命盤）」固定選項
- [x] 前端 AiEntry.tsx：AiSession.identityType 改為 string（支援動態方案 ID）
- [x] 測試更新：353 項全部通過，新增 ai_full 和動態方案 ID 邏輯測試

## v12.2 Dialog 滾動修正

- [x] AdminAccessTokens 新增 Token Dialog：加入 overflow-y-auto + max-height，確保手機上可滾動
- [x] DialogContent 改為 flex flex-col max-h-[90vh]，Footer 固定在底部（shrink-0），內容區塊加 overflow-y-auto flex-1
## v12.3 體驗流程修正

- [x] 後端 context.ts：Token 有虛擬命盤時，非同步自動寫入 userProfiles（八字推算 + 生命靈數 + 農曆），已存在則跳過
- [x] 前端 AiReadOnlyBanner：身分類型改為動態判斷（非 ai_readonly 就顯示虛擬命盤提示），加入「非真實命盤」說明
- [x] 前端 AiReadOnlyBanner：所有身分類型都加入「導覽頁」按鈕，點擊後返回 /ai-entry 導覽頁

## v12.4 ai_full 體驗 Token 根本問題修正

- [x] 修正虛擬用戶 userId 設計：ensureVirtualUserInDb() 在 users 表建立真實記錄（以 openId=ai-token-{id} 為唯一鍵），回傳正整數 userId
- [x] 修正 businessHub.ts getVisibleNav：ai_full 身分繞過方案權限，全部模塊開放
- [x] 修正 permissions.ts myFeatures：ai_full 身分回傳全部功能清單
- [x] TypeScript 無錯誤，353 項測試全部通過

## TASK-001 首頁 MVP 建置（天命共振 Destiny Oracle）

### 後端
- [x] 新建公開 API 端點 `GET /api/preview?birth=YYYY-MM-DD`（不需 Token）
- [x] 回傳精簡版命格資料：每日運勢摘要、命格類型名稱、天命問卜示範

### 路由調整
- [x] 現有首頁（登入頁）移至 `/login`
- [x] 新首頁 `/` 成為主要入口（公開可見）
- [x] 已登入用戶進入 `/` 自動跳轉至功能頁

### 新首頁設計
- [x] Hero 區：品牌標語（天命共振 Destiny Oracle - 數位錦囊）、視覺動效、CTA 按鈕
- [x] 錦囊體驗區：輸入生日 → 換算命格 → 顯示體驗版演示（每日運勢 + 命格解析 + 天命問卜）
- [x] 功能卡片區：六大功能預覽（命格身份證、今日作戰室、神諭問卜、財運羅盤、命理日曆、數位錦囊）
- [x] 社會認證區：用戶見證文字
- [x] 頁腳（Footer）：品牌資訊、登入連結

### 品牌與 SEO
- [x] 全站品牌名稱更新：天命共振 Destiny Oracle - 數位錦囊
- [x] `<title>` 和 `<meta description>` 更新
- [x] Open Graph 標籤（og:title, og:description）
- [ ] 結構化資料（Schema.org WebSite）

### 測試與部署
- [x] vitest 測試更新（15 項全部通過）
- [x] checkpoint 儲存（version 7884f9ab）
- [x] GitHub CURRENT-TASK.md 狀態更新

## Multi-Agent 自動化協作機制

### MANIFEST.json 規格設計
- [x] 設計 MANIFEST.json 標準格式（含 status 欄位：pending/ready/integrated）
- [x] 更新 GitHub 倉庫 ART/MANIFEST.json 為新格式（v2.0）
- [x] 在 GitHub 建立 MANIFEST 規格說明文件（ART/MANIFEST-SPEC.md）

### 後端素材同步邏輯
- [x] 建立 server/lib/artSync.ts（GitHub API 拉取 + 版本比對邏輯）
- [x] 建立 tRPC procedure：system.patrolArtAssets（巡邏素材同步）
- [x] 巡邏結果格式化輸出（formatPatrolSummary）

### 排程巡邏任務
- [x] 設定每 2 小時排程任務（Manus Schedule）
- [x] 排程任務觸發 system.patrolArtAssets

### 協作文件
- [x] 草擬給美術 Agent 的 MANIFEST 規格文件（ART/MANIFEST-SPEC.md）
- [x] 草擬給美術 Agent 的協作說明（FOR-ART/COLLABORATION-GUIDE.md）
- [x] 更新 GitHub 倉庫（commit 1f957f9）

## 淺色主題修正 + UI 截圖素材

### 淺色主題文字可見性修正
- [ ] 診斷 /admin/theme 切換淺色後各頁面的文字問題
- [ ] 修正 index.css：light mode CSS 變數（前景色、卡片色、靜音文字色等）
- [ ] 修正各功能頁硬編碼的深色文字 class（如 text-gray-400 在淺色背景下過淺）
- [ ] 驗證：WarRoom、命格解析、問卜、財運、日曆等頁面淺色模式效果

### UI 截圖素材（虛擬帳號）
- [ ] 建立虛擬展示帳號（填入示範生日和命格資料）
- [ ] 截取 WarRoom 截圖（加仿視窗框）
- [ ] 截取命格解析截圖
- [ ] 截取天命問卜截圖
- [ ] 上傳截圖至 CDN，取得公開 URL
- [ ] 整合截圖至首頁三步驟流程區

## 深度淺色主題修正（第二輪）

- [x] 深度檢查 WarRoom 所有區塊的不合理顏色（WUXING_COLORS 深色背景、塔羅牌卡片、時辰格子）
- [x] 檢查命格解析、財運羅盤、問卜頁面的顏色問題（全部正常）
- [x] 全面修正 index.css 淺色主題覆蓋規則（新增 WUXING_COLORS、塔羅牌、時辰、月相等覆蓋）
- [x] 逐頁驗證修正完整性（WarRoom、命格解析、天命問卜、財運羅盤全部正常）
- [x] 存儲 checkpoint（version c93816d0）

## 首頁美術整合（美術 Agent 素材）
- [x] 上傳 8 張美術素材到 CDN
- [x] 重建 LandingPage.tsx：Hero 背景圖 + 命盤光球 + 流光動態效果
- [x] 功能卡片換用美術圖示（取代 emoji）
- [x] Logo 換用錦囊圖示
- [x] 整體視覺對齊沙盒網站設計風格（深藍星空背景、金色文字、漸層按鈕）

## TASK-002 命格身份證分享卡（美術 Agent 塔羅牌素材整合）
- [x] 讀取 GitHub ART/OUTPUTS/TASK-002 的 44 張塔羅牌素材與 INTEGRATION-SPEC.md
- [x] 上傳 44 張塔羅牌圖片到 CDN（女生版 22 張 + 男生版 22 張）
- [x] 建立 client/src/lib/tarotCards.ts 映射表（含 getTarotCardUrl / getTarotCardInfo）
- [x] 安裝 html2canvas 套件
- [x] 開發 DestinyShareCard.tsx 組件（玻璃擬態面板、性別差異化主題、html2canvas 匯出 + Web Share API）
- [x] 整合分享卡至 ProfilePage.tsx（生成命格身份證分享卡按鈕）
- [x] 撰寫 vitest 測試（tarotCards.test.ts，379 個全部通過）

## 性別設定 + WarRoom 塔羅圖片 + 協同流程
- [ ] 後端：確認 gender 欄位支援，updateProfile 可儲存性別
- [ ] 前端：命格設定頁加入性別選擇欄位（男/女/不指定）
- [ ] 前端：WarRoom 塔羅牌卡片換用美術素材圖片（依用戶性別動態切換）
- [ ] 建立 GitHub Multi-Agent 協同流程文件（COLLABORATION-GUIDE 更新）

## 指令文 v1.1 整合（StarField + FortuneCard + fortune.getToday）
- [x] 建立 StarField.tsx 星光粒子背景元件
- [x] 建立 CountUpNumber.tsx 數字滾動動畫元件
- [x] 建立 FortuneCard.tsx 運勢卡片元件（含三階段開啟動畫）
- [x] 後端新增 fortune.getToday 路由（輸入生日 → AI 生成今日運勢）
- [x] 後端新增 artAssets.getCdnUrls 路由（回傳 CDN URL 清單）
- [x] LandingPage HeroSection 改用 trpc.fortune.getToday + FortuneCard + StarField
- [x] WarRoom 塔羅牌卡片換用美術素材圖片（依用戶性別動態切換）
- [x] GitHub 協同流程文件更新（COLLABORATION-GUIDE.md）
- [x] 撰寫 fortune.test.ts（384 個測試全部通過）

## 分享卡修正與擴充（v1.2）
- [x] 修正 DestinyShareCard.tsx 左右對稱布局
- [x] 修正 DestinyShareCard.tsx 塔羅牌改用主要靈魂數（核心個性數）
- [x] 建立 DivinationShareCard.tsx（天命問卜結果 + 流日塔羅牌）
- [x] 整合 DivinationShareCard 至 TopicAdvicePanel（問卜結果底部分享按鈕）
- [x] 建立 OracleShareCard.tsx（擲筊結果分享卡）
- [x] 整合 OracleShareCard 至 OracleCast 頁面（結果底部分享按鈕）
- [x] 撰寫 shareCards.test.ts（30 項測試全部通過，總計 414 項）
- [x] 上傳更新日誌到 GitHub

## 首頁設計整合（v1.3）
- [x] 研究排程 Agent 首頁設計（https://destinyweb-svfigzte.manus.space/）
- [x] 新增 CSS 動畫類別：text-holographic, text-gold-gradient, gold-pulse, orb-float, animate-slide-up, animate-fade-in, ripple-expand
- [x] 整合 glass-card hover 金光效果（translateY(-4px) + gold glow）
- [x] Hero 布局改為居中（flex-col lg:flex-row，命盤光球在右側）
- [x] 主標題「解讀天命」加入 text-holographic 全息動效
- [x] 導覽列改為 fixed + backdrop-blur-xl + 背景模糊
- [x] 命盤光球加入 ripple-expand 波紋 + orb-float 漂浮動效
- [x] CTA 按鈕加入 gold-pulse 動效
- [x] Stats 數值更新（4,019+ / 78% / 293 / 9）
- [x] Logo 文字改為 text-gold-gradient
- [x] 加入日夜切換按鈕（Sun/Moon icon）
- [x] 星星粒子改為原生 Canvas（不依賴外部元件）
- [x] 修正 glass-card 重複定義問題

## 首頁數據調整與性別設定功能（v1.4）
- [x] 調整 LandingPage STATS 數據：改用系統特色型數據（22塔羅牌 / 120命格組合 / 5行共振 / 24節氣）
- [x] 調整 LandingPage TESTIMONIALS：去除誇大說法，改成真實日常感受
- [x] 確認性別設定功能早已完整實作（DB gender 欄位 + MyProfile.tsx 性別選擇 UI + saveProfile API）
- [x] WarRoom 塔羅牌圖片依 gender 動態切換（v1.1 已完成）

## LandingPage 視覺修正（v1.5）
- [x] 日夜切換按鈕加入說明文字（白天/夜晚 標示），讓用戶知道這個按鈕的用途
- [x] 修正深色模式文字配色：避免黑色文字在深色背景上消失（所有文字改用 slate/white 系列）
- [x] 修正淺色模式文字配色：避免亮色文字在淺色背景上消失（所有文字改用深色系列）
- [x] 替換「原神」名詞為更親和的說法（命主、本命特質、天命之人等）

## 分享卡修正與重新設計（v1.6）
- [ ] 調查 DestinyShareCard / DivinationShareCard / OracleShareCard 下載/分享功能失效原因
- [ ] 修正 html2canvas 或 canvas 渲染問題（CDN 圖片跨域、字型載入等）
- [ ] 重新設計分享卡版面：塔羅牌圖片作為透明背景底圖，文字疊加其上（全版式）
- [ ] 確認 Web Share API 在手機上正常呼叫系統分享選單
- [ ] 確認下載功能正常產出 PNG 圖片

## 功能修改 v1.6 - 首頁按鈕名詞優化 + 分享卡 Canvas 重寫

- [x] 首頁主按鈕「開啟元神」→「⭐ 探索今日運勢」
- [x] 首頁次按鈕「開啟天命」→「🔮 揭開專屬指引」
- [x] DivinationShareCard 改用 Canvas 2D API 直接繪製（修正 drawWrappedText 參數錯誤）
- [x] OracleShareCard 改用 Canvas 2D API 直接繪製（全新重寫）
- [x] TypeScript 零錯誤，414 項測試全部通過
- [x] 儲存 v1.6 checkpoint

## Bug 修正 v1.7 - 分享卡按鈕當機修正 + 預覽放大

- [x] 修正 DestinyShareCard 下載/分享按鈕點擊後頁面當機的問題
- [x] 修正 DivinationShareCard 下載/分享按鈕點擊後頁面當機的問題
- [x] 修正 OracleShareCard 下載/分享按鈕點擊後頁面當機的問題
- [x] 修正關閉按鈕無效的問題
- [x] 放大三個分享卡的預覽尺寸（手機上顯示更大）
- [x] TypeScript 零錯誤，414 項測試全部通過
- [x] 儲存 v1.7 checkpoint

## Bug 修正 v1.8 - 多項問題修正

- [x] 修正生命靈數計算邏輯（18 不應再相加為 9，Master Numbers 11/22/33 保留原値）
- [x] 修正擲籤分享卡內容空白（問題文字、詮釋、能量共鳴沒有渲染）
- [x] 修正問卜分享卡用了今日塔羅牌而非問卜結果的塔羅牌
- [x] 分享文字加入網址（oracleres.com）和引導介紹
- [x] 修正首頁亮色背景卡片上文字顏色看不見的問題
- [x] TypeScript 零錯誤，414 項測試全部通過
- [x] 儲存 v1.8 checkpoint

## 首頁 MVP 大改版 v1.9 - UI 截圖整合 + 行銷語法

- [x] 讀取現有 LandingPage 結構，規劃新版面
- [x] Hero 區塊：加入動態標語、生活化副標題、輸入框 CTA
- [x] 功能展示區：五大功能卡片（擲籤/天命問卜/樂透/流年/預約命理）含 CSS 手機框架模擬 UI
- [x] 擲籤功能卡：手機框架模擬 UI + 「今天該不該做這件事？讓神明給你一個答案」
- [x] 天命問卜功能卡：手機框架模擬 UI + 「工作、感情、財運，一次問清橚」
- [x] 樂透功能卡：手機框架模擬 UI + 「用命理選號，讓五行幫你挑好運數字」
- [x] 流年功能卡（今日作戰室）：手機框架模擬 UI + 「每天早上知道今天的能量，把握最佳時機」
- [x] 預約命理功能卡（原天命聯盟）：手機框架模擬 UI + 「想深聊命格？預約一對一命理諮詢」
- [x] 社群證言區：3-4 則生活化用戶評語
- [x] 統計數據區：有說服力的數字
- [x] 底部 CTA 區塊：加入網址引導
- [x] TypeScript 零錯誤，414 項測試全部通過
- [x] 儲存 v1.9 checkpoint

## v2.0 新任務

- [ ] 修正首頁手機框架模擬 UI 中的真實姓名「蘇祐震」→ 改為虛擬角色（如「陳小明」）
- [ ] 建立 GitHub 倉庫 hiyomarket/oracleres-advisor-agent（Private）
- [ ] 初始化倉庫目錄結構（/config, /sessions, /docs, README.md）
- [ ] 撰寫 README.md 說明書
- [ ] 撰寫 /config/numerology.json 初始配置
- [ ] 撰寫 /config/tarot_archetypes.json 初始配置
- [ ] 撰寫 /config/resonance_rules.json 初始配置
- [ ] 撰寫 /docs/agent-persona.md Agent 人格與規則文件
- [ ] 提供給用戶可複製的指令文字

## V11.0 全鏈路動態共振系統升級（依命理顧問 Agent 規格）

### Part 1：大運計算層整合
- [x] 新建 server/lib/daYunEngine.ts（大運計算引擎，含 DaYunResult 接口與 calculateDaYun 函數）
- [x] 在 userProfile.ts 新增 daYunTable 大運排列靜態數據
- [x] 修改 wuxingEngine.ts calculateWeightedElements 整合大運 weightAdjustment（Δt）

### Part 2：神喻穿搭引擎 V3.0 升級
- [x] 重構 outfitStrategy.ts：新增 generateOutfitAdviceV11 函數（情境共振決策樹）
- [x] 新增 generateReasoningText 函數（動態生成穿搭推理文案）
- [ ] 修改 strategyEngine.ts 支援 userContext（event/mood）情境參數（已整合進 outfitStrategy.ts）
- [ ] 前端 WarRoom 作戰室加入「今日特殊事件」輸入欄位（待前端整合）

### Part 3：核心計算引擎升級
- [x] 在 wuxingEngine.ts 整合 getMoonPhase 月相微調邏輯（新月/滿月各五行加成）
- [x] 動態加權比例：envWeight = 0.70 + Δt，selfWeight = 0.30 - Δt

### Part 4：新功能模塊開發
- [x] 新建 server/lib/energyTracker.ts（logDailyEnergy + getEnergyTrend）
- [x] 新建 server/lib/decisionSupportEngine.ts（三層結構：快速洞察→深度解讀→可操作建議）
- [x] 在 drizzle/schema.ts 新增 daily_energy_logs 資料表
- [x] 資料庫 daily_energy_logs 表建立完成
- [x] tRPC v11 router 整合（getDaYun / getOutfitV3 / getEnergyTrend / getDailyDecision）
- [ ] 前端新增能量趨勢圖表頁面（/energy-trend）（待前端開發）
- [ ] 所有新模組新增 Vitest 單元測試（待撰寫）

## V11.1 作戰室前端升級（依命理顧問 Agent 補充建議）

### 建議一：大運共振指數卡片
- [ ] 後端新增 getDaYunResonance tRPC 端點（計算大運 vs 今日流日共振指數）
- [ ] 前端作戰室加入大運共振指數卡片（干支/主題/剩餘年數/吉凶評估）
- [ ] 卡片加入「大運 vs 今日共振指數」視覺化指標（順風/逆風判斷）
- [ ] 順風日顯示「大運順風日，今日行動力加倍」；逆風日顯示「大運逆風日，今日宜守不宜攻」

### 建議二：六角雷達圖決策支持報告
- [ ] 前端作戰室加入六角雷達圖（事業/財務/人際/健康/創意/出行）
- [ ] 雷達圖下方加入今日 12 時辰能量條
- [ ] 評分最高維度對應的最佳時辰做高亮標記
- [ ] 高亮時辰顯示說明文字（例：「今日財務評分最高，最佳行動時辰為辰時（07:00–09:00）」）

### 建議三：今日特殊事件輸入欄
- [ ] 前端作戰室加入「今日特殊事件」選擇欄
- [ ] 預設六個情境選項：重要會議/面試/約會/談判/創意發表提案/靜養充電日
- [ ] 後端 getOutfitV3 端點支援六個情境（補充 creative_presentation / rest_day）
- [ ] 靜養充電日觸發「均衡守成」模式，建議中性舒適色系
- [ ] 創意發表/提案強化食傷（火）能量，建議暖色系
- [ ] 選擇事件後穿搭推薦即時更新並顯示情境推理文案

## V11.2 作戰室修正（2026-03-23）

- [x] 修正今日特殊事件點擊無觸發問題（新增 outfitV3 query，selectedEvent 改變時重新查詢後端）
- [x] 穿搭 V3.0 接入後端：將 selectedEvent 傳入 trpc.v11.getOutfitV3，顯示 contextNote + reasoning
- [x] 決策指南最佳時辰高亮連動時辰能量條（紫色高亮 + 頂部提示橫幅）
- [x] 修正淺色背景上文字顏色對比度不足問題（index.css V11.2 規則）
- [x] 在 dailyReport moon 物件加入 phaseType 英文欄位供 getOutfitV3 使用
- [x] 435 項測試全部通過，TypeScript 零錯誤

## V11.3 UI 調整與塔羅流年修正（2026-03-23）

- [x] 調整 WarRoom.tsx 八個區塊順序（今日運勢→天命一句話→特殊事件→決策指南→塔羅牌指引→大運背景共振→天命格言→能量指引/月相）
- [x] 修正 luck-cycle 塔羅流年計算邏輯：中間靈魂數（月+日縮減，月≥ 10 才縮減、日 > 22 才縮減）+ 當年數字，以生日為流年切換點（生日前走上一年）
- [x] 438 項測試全部通過，TypeScript 零錯誤

## V11.4 導覽列置中 + 擲筊 UI 重設計（2026-03-23）

- [x] 修正頂端導覽列在寬螢幕偏左問題（max-w-screen-xl mx-auto 容器置中）
- [x] 擲筊頁面：天命幣餘額橫幅移至頁面頂部，大字體 + 紅色警示（不足時）
- [x] 擲筊頁面：擲筊結果直接以 CastResultOverlay 浮層覆蓋在筊杯圖片上（含放射粒子特效）
- [x] 擲筊頁面：結果後操作列（查看詳細/分享/再問）改為底部按鈕列，不遮擋筊杯
- [x] 擲筊頁面：AI 深度解讀費用說明整合至按鈕文字（消耗 N 天命幣）
- [x] 438 項測試全部通過，TypeScript 零錯誤

## V11.5 靈相換裝系統（PROPOSAL-20260323-GAME）（2026-03-23）

- [x] 資料庫：建立 game_wardrobe 資料表（9 欄位：userId/itemId/layer/imageUrl/wuxing/rarity/isEquipped/acquiredAt）
- [x] 資料庫：建立 game_daily_aura 資料表（8 欄位：userId/recordDate/score/blessingLevel/equippedWuxing/recommendedWuxing/createdAt）
- [x] 後端：server/routers/gameAvatar.ts 建立（6 個 tRPC Procedures）
- [x] 後端：getEquipped — 取得當前裝備（無道具時返回預設示範服裝）
- [x] 後端：getInventory — 取得全部虛擬服裝（依圖層分組）
- [x] 後端：saveOutfit — 儲存換裝設定（切換 isEquipped 旗標）
- [x] 後端：submitDailyAura — 提交每日穿搭並計算 Aura Score（直接 import wuxingEngine.ts）
- [x] 後端：getTodayAura — 查詢今日 Aura Score 狀態
- [x] 後端：getDailyAdvice — 取得今日五行建議（供頁面頂部橫幅顯示）
- [x] 前端：client/src/components/game/AvatarRenderer.tsx（7 層 PNG 絕對定位疊加渲染組件）
- [x] 前端：client/src/pages/game/AvatarRoom.tsx（靈相空間主頁面，含衣櫃面板 + Aura 結算）
- [x] 路由：App.tsx 新增 /game/avatar 路由
- [x] 測試：server/gameAvatar.test.ts（11 項測試全部通過）
- [x] 449 項測試全部通過，TypeScript 零錯誤

## V11.6 TASK-004 美術素材匯入（2026-03-23）

- [x] 建立 game_items 資料表（Drizzle Schema + webdev_execute_sql 直接建立，含 isInitial/view/gender/wuxingColor 欄位）
- [x] 執行 Seed Script 將 120 筆服裝部件資料寫入 game_items（4 圖層 × 5 五行 × 3 視角 × 2 性別）
- [x] 更新 AvatarRenderer.tsx 支援多視角動態切換（front/left45/right45）含視角切換按鈕
- [x] 五行顏色更新為 TASK-004 指定重點配色（木#2E8B57/火#DC143C/土#CD853F/金#C9A227/水#00CED1）
- [x] 新增 gameAvatar.getItemsByView — 依視角篩選 game_items 服裝道具
- [x] 新增 gameAvatar.getAllInitialItems — 取得所有初始道具並對映三視角 viewImages
- [x] 撰寫 server/gameItems.test.ts（22 項測試：Seed JSON 格式/五行配色/視角切換/Schema 欄位）
- [x] 471 項測試全部通過，TypeScript 零錯誤

## V11.7 命盤連動初始外觀（PROPOSAL-20260323-GAME-命盤連動初始外觀）（2026-03-23）

- [x] 修改 getEquipped Procedure：首次進入時呼叫 getUserProfileForEngine 取得日主五行
- [x] 中文五行 → 英文 key 轉換（木→wood/火→fire/土→earth/金→metal/水→water）
- [x] 查詢 game_items 中對應五行的初始部件（isInitial=1, view=front）
- [x] 自動寫入 game_wardrobe 並設定 isEquipped=1（4 件：top/bottom/shoes/bracelet）
- [x] 回傳 isFirstTime/dayMasterElement/dayMasterElementEn 標記
- [x] AvatarRoom.tsx 修正 equipped 型別（從 equipped.map 改為 equippedData.items.map）
- [x] AvatarRoom.tsx 新增 AwakeningOverlay 組件（全螢幕五行光芒匯聚 + 提示彈窗）
- [x] 覺醒動畫三階段：gather（光芒匯聚）→ reveal（文字卡片）→ done（可關閉）
- [x] 五行覺醒配色使用 TASK-004 指定重點配色（木#2E8B57/火#DC143C/土#CD853F/金#C9A227/水#00CED1）
- [x] 撰寫 server/gameAvatarAwakening.test.ts（23 項測試）
- [x] 494 項測試全部通過，TypeScript 零錯誤

## V11.8 三份遊戲提案（2026-03-23）

- [x] 提案一：虛擬服裝商城 - users.gameStones 欄位、gameShop Router（getItems/purchaseItem DB Transaction）、Shop.tsx + ShopItemCard.tsx、路由 /game/shop
- [x] 提案三：虛相戰鬥介面 - TASK-008 六張立繪上傳 S3 CDN、CombatPlayer.tsx（absolute bottom-0 對齊）、CombatRoom.tsx（左右橫式佈局）、路由 /game/combat
- [x] 提案二：每日穿搭任務 - questEngine.ts（generateDailyQuest/checkQuestCompletion）、getDailyQuest procedure、submitDailyAura 整合任務判定與靈石發放
- [x] 506 項測試全部通過，TypeScript 零錯誤

## V11.9 遊戲大廳入口整合 + 每日任務前端 UI（2026-03-23）

- [x] SharedNav 加入天命共振遊戲大廳入口按鈕（/game 路徑高亮）
- [x] 建立 GameLobby.tsx（/game 路由）：角色縮圖、貨幣餘額、三入口卡片、今日任務橫幅
- [x] App.tsx 新增 /game 路由（GameLobby）
- [x] 建立 DailyQuestCard.tsx：即時進度條、五行配色、提交按鈕（達標才啟用）
- [x] 建立 QuestCompleteModal.tsx：三階段動畫（burst→reveal→done）、靈石/Aura 獎勵展示
- [x] AvatarRoom.tsx 整合 DailyQuestCard + QuestCompleteModal + getDailyQuest procedure
- [x] 522 項測試全部通過，TypeScript 零錯誤

## V11.10 三份遊戲提案（2026-03-23）

- [ ] 提案一：GameLobby.tsx 載入 TASK-008 真實立繪（依性別 male/female + idle）
- [ ] 提案一：保留五行光暈特效，立繪使用 absolute bottom-0 對齊
- [ ] 提案二：建立 7 張 CMS 資料表（game_monsters/game_skills/game_collectibles/game_random_quests/game_merchant_items/game_announcements/game_configs）
- [ ] 提案二：建立 /admin/game 後台管理頁面（GameCMS.tsx）
- [ ] 提案二：建立 gameAdmin tRPC Router（CRUD 操作，adminProcedure 保護）
- [ ] 提案三：建立 game_achievements + user_achievements 資料表
- [ ] 提案三：成就觸發邏輯（購買商品/完成每日任務/首次進入靈相空間）
- [ ] 提案三：GameLobby.tsx 新增成就徽章牆
- [ ] 撰寫測試並儲存 V11.10 Checkpoint

## TASK-009 商城圖片整合（待執行，排在 V11.10 之後）

- [ ] 讀取 ART/OUTPUTS/TASK-009/ 的 20 張商品展示圖
- [ ] 上傳 20 張圖片至 S3 CDN
- [ ] 執行 Seed Script 更新 game_items.imageUrl 欄位
- [ ] 確認 /game/shop 商城頁面顯示真實圖片

## V11.10 三份遊戲提案（2026-03-23）

- [x] 提案一：GameLobby.tsx 整合 TASK-008 真實立繪（依性別選擇 male/female idle）
- [x] 提案一：五行光暈特效保留，立繪 absolute bottom-0 對齊
- [x] 提案二：建立 8 張 CMS 資料表（monsters/skills/map_nodes/collectibles/random_quests/merchant_pool/achievements/user_achievements）
- [x] 提案二：gameAdmin Router 實作 CRUD procedures（adminProcedure 保護）
- [x] 提案二：GameCMS.tsx 後台頁面（/admin/game）含 Tab 切換 7 個管理分類
- [x] 提案二：AdminLayout.tsx 加入靈相世界 CMS 入口
- [x] 提案三：gameAchievement Router 實作 getAll/getUnlocked/checkProgress
- [x] 提案三：checkAndUnlockAchievements 工具函數（自動發放靈石/天命幣獎勵）
- [x] 提案三：GameLobby.tsx 加入 AchievementWall 成就牆（分類格 + 進度條）
- [x] 537 項測試全部通過，TypeScript 零錯誤

## V11.11 主角色檔案頁（2026-03-23）
- [x] 上傳 TASK-003 素體基底（body-base-female/male）至 S3 CDN
- [x] 上傳 TASK-004 五行服裝（40 張 female-front + male-front）至 S3 CDN
- [x] 建立 gameAssets.ts CDN URL 常數映射（BODY_BASE_URLS / WUXING_THEMES / getClothingUrls）
- [x] 建立 CharacterProfile.tsx（/game/profile）Pikmin Bloom 全螢幕風格
- [x] 五行主題動態背景（漸層 + 光暈 + 粒子系統）
- [x] 角色渲染（素體 + 五行服裝 PNG 疊加）
- [x] 底部滑動資訊卡（等級 / 天命幣 / 靈石 / Aura Score 圓形指示 / 成就進度條）
- [x] 浮動 UI 按鈕（返回 / 設定 / 換裝 / 商城 / 戰鬥）
- [x] 五行切換指示點（手動切換主題）
- [x] App.tsx 新增 /game/profile 路由
- [x] GameLobby.tsx 新增「靈相世界」入口卡片 + 角色縮圖點擊跳轉
- [x] TypeScript 零錯誤，537 項測試全部通過

## V11.12 三階段藍圖執行（2026-03-23）
### P0 性別與命格串接
- [x] EngineProfile 介面加入 gender 欄位
- [x] getUserProfileForEngine 回傳 userProfiles.gender
- [x] getEquipped 初始服裝查詢加入 gender 篩選條件
- [x] getEquipped 回傳值加入 userGender + natalStats（五行能力值：HP/攻擊/防禦/速度/MP）
- [x] CharacterProfile 使用真實性別素體（male/female 自動對應）
- [x] CharacterProfile 底部資訊卡加入五行能力值顯示（木=HP、火=攻、土=防、金=速、水=MP）
### P1 TASK-009 商城圖片整合
- [x] 從 GitHub 下載 20 張商城圖片（5 五行 × 4 部位）
- [x] 上傳至 S3 CDN（全部成功，20/20）
- [x] 插入 20 筆商城道具記錄至 game_items（isInitial=0, isOnSale=1）
- [x] 每筆記錄帶有真實 S3 CDN imageUrl
### P2 五行場景背景圖
- [x] gameAssets.ts WUXING_THEMES 加入 sceneName + sceneSvgElements
- [x] 木=竹林幽境（竹干+樹葉）、火=燙紅熔岩（熔岩池）、土=大地原野（山丘輪廓）
- [x] 金=星空銀河（星點+銀河帶）、水=深海汪境（波浪+水泡）
- [x] CharacterProfile 加入 SVG 場景層渲染（preserveAspectRatio="none"）
- [x] 頂部標題顯示場景名稱（如：竹林幽境 · Lv.5）
### GD-017 Tick 引擎架構規劃
- [x] 完整閱讀 GD-017 虛相世界轉型設計提案
- [x] 建立 GD-017-TICK-ENGINE-ARCHITECTURE.md（Schema/引擎邏輯/SSE推送/Sprint排程）
- [x] 537 項測試全部通過，TypeScript 零錯誤

## V11.13 大廳改版 + 底部 Tab 導航（2026-03-23）
- [x] 建立 GameTabLayout.tsx 底部 Tab 導航包裝器（虛界/靈相/商城 三個 Tab）
- [x] 建立 VirtualWorldPage.tsx 靈相虛界主畫面（三欄靜態骨架：旅人狀態/冒險日誌/策略台）
- [x] /game 路由改指向 VirtualWorldPage（原 GameLobby 保留但不再是主入口）
- [x] AvatarRoom、Shop、CharacterProfile 全部整合 GameTabLayout 底部 Tab
- [x] VirtualWorldPage 整合 trpc.oracle.dailyEnergy 顯示今日天干地支

## GD-018 等級扁平化整合（V11.14）

### 資料庫重建
- [x] 重建 game_agents 表（添加 status、dominant_element、雙軌體力值欄位）
- [x] 重建 agent_events 表（對齊新 schema：event_type、node_id、detail）
- [x] 重建 agent_inventory 表（對齊新 schema：item_type、item_data）
- [x] 重建 game_world 表（world_key、world_data JSON 格式）

### 後端架構
- [x] 建立 gameWorld Router（server/routers/gameWorld.ts）
- [x] 首次命名 API（nameAgent mutation）
- [x] 角色狀態查詢（getAgentStatus，含體力值再生計算）
- [x] 事件日誌查詢（getEventLog，支援 eventType 篩選）
- [x] 策略切換（setStrategy mutation）
- [x] 神蹟治癒（divineHeal，消耗靈力值）
- [x] 神蹟傳送（divineTransport，消耗靈力值）
- [x] 地圖節點列表（getMapNodes）
- [x] 世界狀態查詢（getWorldStatus）
- [x] 手動 Tick 觸發（triggerTick，測試用）
- [x] 背包查詢（getInventory）
- [x] 怪物圖鑑（getMonsterBestiary）
- [x] 在 routers.ts 掛載 gameWorldRouter 並啟動 Tick 引擎

### 前端 UI
- [x] 首次命名對話框（NamingDialog，P0）
- [x] 台灣地圖 SVG 視覺化（TaiwanMap，顯示當前位置）
- [x] 戰鬥詳情展開（CombatDetail，顯示回合日誌）
- [x] VirtualWorldPage 串接真實 Tick 引擎資料
- [x] 事件日誌 Tab 篩選（全部/戰鬥/奇遇）
- [x] 雙軌體力值顯示（活躍值 + 靈力值）
- [x] 裝備欄位 UI 骨架（8 格，待裝備系統完成）
- [x] GD-018 成長哲學說明區塊

### 測試
- [x] 建立 gameWorld.test.ts（553 項全部通過）
- [x] calcExpToNext 等級曲線測試
- [x] resolveCombat 戰鬥解算測試
- [x] 命名驗證規則測試

### 待完成（P2）
- [ ] 裝備系統完整實作（品質/詞條/套裝效果）
- [ ] 技能欄位 UI（4 主動 + 2 被動）
- [ ] Roguelike 事件通知（前端彈窗）
- [ ] 寵物個體值系統
- [ ] 圖鑑收集系統（怪物/地點/道具）

## 台灣完整縣市地圖系統（V11.15）

- [ ] 重新設計 mapNodes.ts：300+ 節點，大縣市 12-16 個、中型 8-10 個、小型 5-6 個（含五行屬性、怪物、座標、描述、真實景點/地標名稱）
- [ ] 建立互動式台灣 SVG 地圖元件（縣市區塊 + 節點標記 + 縮放/平移）
- [ ] 更新 VirtualWorldPage 整合新地圖
- [ ] 更新 tickEngine 使用新節點資料
- [ ] 撰寫 mapNodes 測試

## /game 頁面 UI 大改版（V11.16）

- [ ] 補充嘉義市（+4）、嘉義縣（+4）、新竹市（+5）、新竹縣（+3）節點，總數達 250+
- [ ] 建立互動式台灣 SVG 地圖元件（縣市輪廓 + 節點標記 + 縮放/平移）
- [ ] 全面重構 VirtualWorldPage：手機優先 RWD
  - [ ] 地圖佔主要畫面（手機上方 60%）
  - [ ] 左下角浮動按鈕：方塊（節點清單）、訊息（事件日誌）
  - [ ] 右側/底部折疊式角色狀態面板（5 個子面板）
    - [ ] 戰鬥面板：HP/MP/活躍值 + 命格能力值進度條
    - [ ] 生活面板：金幣、等級、當前位置、移動目標
    - [ ] 裝備面板：4 個裝備欄（武器/頭盔/護甲/鞋子）
    - [ ] 技能面板：已習得技能清單
    - [ ] 命格面板：五行屬性來源說明 + 加成明細
  - [ ] Tick 開關大按鈕（明顯可見）
  - [ ] 桌機版：地圖左側 + 右側角色面板
- [ ] 裝備系統 UI：背包道具格、裝備/卸下功能
- [ ] 重要按鈕加大（手機觸控友善，min 44px）

## /game 頁面 UI 大改版（V11.16）

- [x] 手機優先佈局：地圖佔主要畫面
- [x] 折疊式角色面板（戰鬥/生活/裝備/技能/命格五個子面板）
- [x] 浮動事件日誌（左下角按鈕，可展開/收合）
- [x] Tick 按鈕加大，手機觸控友善
- [x] 裝備欄 UI（武器/頭盔/護甲/鞋子四欄）
- [x] 節點清單浮動面板（右上角 ⊞ 按鈕展開）
- [x] 桌機左右分欄（地圖左、角色面板右）
- [x] 台灣 SVG 地圖：212 個節點，縮放/平移，hover 提示
- [x] 命格面板：五行能力值 + 加成來源說明
- [x] 快速入口：靈相空間 / 天命商城
- [x] TypeScript 零錯誤，553 項測試全部通過

## 真實台灣 GeoJSON 地圖重建（V11.17）

- [ ] 取得台灣 22 縣市精確邊界 GeoJSON 資料
- [ ] 建立基於 GeoJSON 的台灣 SVG 地圖元件（縣市邊界清晰可辨）
- [ ] 節點座標改用真實經緯度對齊地圖
- [ ] 縮放/平移互動功能
- [x] TypeScript 零錯誤，測試全通過

## Leaflet.js 真實地圖整合（V11.17）

- [x] 安裝 leaflet + react-leaflet，設定 CartoDB Dark Matter 暗色底圖
- [x] 節點經緯度標記到真實地圖（Marker + Popup）
- [x] 點擊節點自動縮放到該地理位置（flyTo 動畫）
- [x] 玩家當前位置高亮顯示（脈動光圈）
- [x] 手機優先佈局，地圖占主要畫面
- [x] TypeScript 零錯誤，測試全通過

## /game 頁面 100% 完整改版（V11.18）

- [x] 固定視窗佈局（overflow:hidden，不可滾動）
- [x] 置頂區：本命霓虹標籤（丙申火旺+五行命）
- [x] 置頂區：在線人數 + 已註冊人數 + 即時狀態
- [x] 置頂區：Tick 大按鈕（啟動/暫停狀態明確，帶動畫）
- [x] 置頂區：跟隨冒險者按鈕（特殊光效）
- [x] 方格面板預設展開，收合時地圖自動延展
- [x] 方格面板：當前節點怪物資料（名稱/HP/威脅等級）
- [x] 方格面板：元素屬性、可收集資源
- [x] 方格面板：隱藏任務機率提示
- [x] 方格面板：在場冒險者列表（HP/等級/狀態）
- [x] 右側角色面板：戰鬥面板完整內容
- [x] 右側角色面板：生活面板完整內容
- [x] 右側角色面板：裝備面板（4欄位+背包）
- [x] 右側角色面板：技能面板
- [x] 右側角色面板：命格面板（五行來源說明）
- [x] 全站字體加大，按鈕加大，觸控友善
- [ ] TypeScript 零錯誤，測試全通過

## V11.19 手機版 RWD 全面重構

- [ ] 手機版地圖佔滿上半螢幕（至少 50vh）
- [ ] 底部抽屜角色面板（可上滑展開/下滑收合）
- [ ] 事件日誌浮動按鈕位置明確（右下角大按鈕+未讀數徽章）
- [ ] 方格面板在手機版改為地圖底部浮動卡片
- [ ] 置頂區手機版精簡（不換行，所有元素一行顯示）
- [ ] 跟隨冒險者：地圖自動 flyTo 旅人當前節點並高亮閃爍
- [ ] 節點怪物資料豐富化（getNodeInfo 返回完整怪物/資源/在場冒險者）
- [ ] 桌機版維持原有三欄佈局不變

## V11.20 底部按鈕重構

- [x] 移除底部重複的「靈相空間」+「天命商城」兩個大按鈕
- [x] 加入緊湊小型「旅人日誌」按鈕（查看今日冒險摘要/事件統計）
- [x] 加入緊湊小型「地圖傳送」按鈕（快速選擇目標節點，消耗靈力）
- [x] 天命商城按鈕改為「隱藏商店感應」：平常暗灰色，遇到隱藏商店時金色脈衝發光

## V12 全面重構（GD-002/001/006 規格）
- [x] 手機版 RWD 精確佈局：頂端10%+地圖50%+角色面板30%+底端10%
- [x] 地圖觸控固定（touch-action:none，防止滑動影響外層）
- [x] 角色面板底部抽屜：收合只露把手（56px），展開顯示30vh
- [x] 底部導覽列與角色面板保持 8px 間距
- [x] GD-002 戰鬥系五行屬性（攻擊力/防禦力/命中力/治癒力/魔法攻擊）
- [x] GD-002 生活系五行屬性（採集力/鍛冶力/承重力/精煉力/尋寶力）
- [x] GD-001 技能面板（4主動槽+2被動槽+隱藏天賦提示）
- [x] GD-006 裝備面板（10格：武器/副手/頭盔/護甲/手套/鞋子/戒指x2/項鍊/護符）
- [x] 尋寶力/洞察力系統（資料庫欄位+UI顯示+感知門檻60）
- [x] 商店分一般商店+隱藏商店（密店，尋寶力60才能感知）
- [x] 置頂區有意義資訊（流日+本命+尋寶力等級+在線統計+旅人狀態）
- [x] 事件日誌分類標籤（全部/戰鬥/奇遇）
- [x] 方格面板手機版浮動卡片（左上角）
- [x] 跟隨冒險者按鈕實作（mapRef.highlightNode）

## V13 全面修復
- [ ] 修復地圖佈局鎖定：GameTabLayout overflow:hidden 根部鎖定
- [ ] 修復地圖節點資訊浮層 z-index（要在地圖之上）
- [ ] 修復右下角日誌按鈕 z-index
- [ ] 收合角色面板時地圖自動填滿空間
- [ ] 生活系屬性依八字命格五行強弱計算（非預設 20）
- [ ] 初階技能依屬性門檻自動解鎖（木屬性>=30 解鎖初階技能）
- [ ] 命格面板加入五行百分比圓餅/條形圖表
- [ ] 背包/道具格系統開放（DB schema + API + UI）
- [ ] 打怪/採集後能獲得道具並存入背包
- [ ] 地圖觸控完全鎖定（手機版整個頁面不能上下滑）

## V13 全面修復（已完成）

- [x] 修復地圖佈局鎖定：GameTabLayout overflow:hidden 根部鎖定
- [x] 修復地圖節點資訊浮層 z-index（要在地圖之上）
- [x] 修復右下角日誌按鈕 z-index
- [x] 收合角色面板時地圖自動填滿空間（charPanelOpen 控制地圖高度）
- [x] 生活系屬性依八字命格五行強弱計算（公式：10 + round(wuxing × 1.5)）
- [x] 初階技能依屬性門檻自動解鎖（getInitialSkills 函數，木>=30 解鎖木系技能等）
- [x] 命格面板加入五行百分比圓餅/條形圖表（SVG 圓餅圖 + 命格%圓形指示器）
- [x] 背包/道具格系統開放（agentInventory DB schema + getInventory API + 裝備面板 UI）
- [x] 打怪/採集後能獲得道具並存入背包（tickEngine 寫入 agentInventory 表）
- [x] 地圖觸控完全鎖定（手機版整個頁面不能上下滑）
- [x] 角色面板縮小後地圖自動填滿（charPanelOpen 控制地圖高度動態計算）
- [x] 修復個人面板不能被移動（固定定位 + touch-action:none）
- [x] 技能面板改用 skillSlot1-4/passiveSlot1-2 欄位顯示真實技能
- [x] 命格面板加入命格%數值（圓形進度指示器）

## V14 超大型改版

### 貨幣系統重整
- [ ] 確認三幣定義：天命幣(pointsBalance=全站積分)、遊戲幣(gold=虛相世界打怪/採集)、靈石(gameStones=靈相空間/全站消費)
- [ ] gameAgents.gold 改名為 worldGold（遊戲幣，虛相世界專用）
- [ ] 底部 Tab「天命商城」→ 靈相空間的靈石商城（紙娃娃）
- [ ] 虛相世界底部功能列顯示遊戲幣+靈石餘額
- [ ] 生活面板移除金幣/靈石顯示（移至頂端或底部功能列）

### 地圖傳送系統
- [x] 傳送彈窗：顯示所有節點清單（含五行/威脅等級/距離）
- [x] 傳送消耗：每次傳送消耗 1 靈力值（actionPoints）
- [x] 傳送動畫：flyTo 目標節點 + 設定 targetNodeId
- [x] 傳送限制：靈力值不足時提示，死亡狀態不可傳送
- [x] 後端 API：setTeleportTarget mutation（消耗靈力+設定 targetNodeId）

### 隨機事件引擎（密店/隱藏NPC/隱藏任務）
- [x] 建立 hiddenEventEngine.ts：每 N 個 Tick 在隨機節點生成隱藏事件
- [x] 隱藏事件類型：密店(hidden_shop) / 隱藏NPC(hidden_npc) / 隱藏任務(hidden_quest)
- [x] 洞察力機率系統：treasureHunting 1-100 對應 1%-100% 感知機率（所有人都有機率，尋寶力只影響高低）
- [x] 密店：隨機節點出現，有效期 5 個 Tick，消失後重新隨機
- [x] 隱藏NPC：提供特殊對話/道具/技能，洞察力 30+ 有機會遇到
- [x] 隱藏任務：隨機節點觸發，完成後給予特殊獎勵
- [x] DB schema：game_hidden_events 表（nodeId/type/data/expiresAt/discoveredBy）
- [x] 前端：感知到隱藏事件時顯示特殊提示（地圖節點閃爍+事件日誌通知）

### UI 全面重構（手機+桌機）
- [x] 底部四按鈕與底端間距修正（GameTabLayout safe-area-inset-bottom 修正）
- [ ] 浮動 HP/MP/活躍值：地圖左下角小型狀態條（固定顯示）
- [ ] 行動策略改為地圖浮動下拉選單（右上角或頂端）
- [ ] 靈相干預改名為「靈相干預」，改為地圖左上角收納式按鈕
- [ ] 靈相干預新增：神眼加持（洞察力+15%，10行動內）、靈癒疲勞（活躍值回50）
- [ ] 等級+經驗條+角色名稱移至頂端區塊
- [ ] 桌機版三欄佈局重新設計（左側地圖+右側個人面板）

### 個人面板重構
- [ ] 道具面板：展開全視窗（半透明），分類顯示（鍛造素材/消耗道具/裝備）
- [ ] 技能面板：展開全視窗（半透明），分類篩選，顯示已習得技能，可安裝到技能槽
- [ ] 裝備面板：10 格（武器/副手/頭盔/護甲/手套/鞋子/戒指x2/項鍊/護符），從道具欄篩選裝備類道具
- [x] 命格面板：加入稱號系統（初始稱號依命格，可擴充）
- [x] 命格面板：命格基礎值總合100，五行上限1000，移除 HP/攻/防/速/MP 標註
- [ ] 生活面板：移除金幣/靈石（移至底部功能列右下角）

### 後台 CMS 完整化（/admin/game）
- [x] 新增「遊戲道具管理」Tab（虛相世界道具：鍛造素材/消耗道具/裝備）
- [x] 新增「虛界商店」Tab（一般商店道具池管理，遊戲幣購買）
- [x] 新增「靈相商店」Tab（靈相空間道具，靈石購買）
- [x] 新增「密店商品池」Tab（密店專屬道具池管理）
- [x] 新增「紙娃娃商城」Tab（原 items Tab 重命名）
- [ ] 技能管理 Tab 擴充：加入技能分類/消耗MP/冷卻/加成屬性欄位
- [ ] 怪物管理 Tab 擴充：加入掉落道具池設定
- [x] 所有新 CMS Tab 支援 CRUD（新增/編輯/刪除）

### 日誌功能修復
- [x] 只保留最新 20 條訊息（前端截斷）
- [x] 日誌按鈕移至左下角（固定浮動）
- [x] 展開時日誌面板壓在個人面板上方（z-index 調整）
- [x] 修復日誌破圖問題（文字溢出/換行）
- [x] 地圖縮放按鈕不與日誌按鈕重疊

## V14.1 布局修復

- [ ] 修復個人區塊底部大片空白（手機版布局跑版）
- [ ] 修復左下角事件日誌被地圖壓住（z-index 問題）
- [ ] 修復個人介面被地圖覆蓋（z-index 問題）
- [ ] 在節點資訊卡加入「傳送到此」直接傳送按鈕
- [ ] 確保桌機版和手機版布局同步修復

## 功能增強 V15 - 靈相干預強化 + iOS 修復 + 返回前台

- [x] iOS safe-area 修復（viewport-fit=cover + GameTabLayout paddingTop）
- [x] 後端新增 divineEye（神眼加持）和 divineStamina（靈癒疲勞）API
- [x] 戰鬥Tab靈相干預 UI 重構（3格網格：神蹟治癒/神眼加持/靈癒疲勞）
- [x] 頂端列新增返回前台按鈕（⌂）
- [x] 靈相干預冷卻時間（每日每種干預限用一次）
- [x] 手機版底部抽屜高度提升至 50vh
- [x] 靈相干預加持效果持續顯示（加持後面板顯示「已用」標籤，明日再來）

## V17 - 全面 UI 修復

- [x] 修復手機版個人區塊被地圖壓住（fixed 定位高度計算問題）
- [x] 地圖左側浮動 HP/MP/活躍值狀態條
- [x] 行動策略移出 CharacterPanel → 地圖右下角浮動下拉面板
- [x] 靈相干預移出 CharacterPanel → 地圖右上角浮動收納面板
- [x] 生活Tab移除金幣/靈石/遇戲幣/等級顯示
- [x] 頂端區塊加入角色名稱/等級/經驗條
- [x] 底端功能列右下角加入金幣/靈石幣値顯示
- [x] 新增道具Tab（展開視窗，分類：鍛造素材/消耗道具/裝備列表）
- [x] 技能Tab改為全視窗半透明選擇 UI
- [x] 命格面板移除五行素質後的 HP/攻/防/速/MP 標籤
- [x] 生活系屬性按五行比例分配（尋寶力直接開啟）

## V18 - 遊戲圖鑑安裝 + 行動策略 Toast

- [x] 從 GitHub GD-011A~E 讀取怪物圖鑑（100 隻）
- [x] 從 GitHub GD-014 讀取道具資料（83 種）
- [x] 從 GitHub GD-015 讀取裝備資料（39 種）
- [x] 從 GitHub GD-016 讀取技能資料（109 種）
- [x] 建立四個圖鑑資料庫表格（game_monster_catalog / game_item_catalog / game_equipment_catalog / game_skill_catalog）
- [x] 種子資料寫入資料庫（100 怪物 + 83 道具 + 39 裝備 + 109 技能）
- [x] 後台 CMS 新增四個圖鑑管理 Tab（含五行篩選、分類篩選、搜尋）
- [x] 後端新增 getSkillCatalogForPlayer + installSkill API
- [x] 前端技能全視窗連動真實圖鑑資料，支援安裝到技能槽
- [x] 行動策略切換後顯示 Toast 提示

## V19 - 全面補完系統缺口

- [ ] 後端新增 useItem API（消耗道具補 HP/MP/體力）
- [ ] 道具 Tab 加入「使用」按鈕，連動 useItem API
- [ ] 後端新增 purchaseEquipment API（從圖鑑購買裝備）
- [ ] 裝備 Tab 加入「裝備商店」入口，可從 39 種圖鑑購買
- [ ] getNodeInfo 改為從 game_monster_catalog 讀取怪物（連動真實圖鑑）
- [ ] 技能全視窗安裝按鈕真正呼叫 installSkill mutation
- [ ] 命格面板顯示稱號系統（getTitles API 已存在）
- [ ] 確認底端功能列幣值正確顯示
