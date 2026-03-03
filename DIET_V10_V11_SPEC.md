# 飲食羅盤 V10.0 + V11.0 升級規格

## V10.0 - 動態美食軍師

### 第一部分：移植動態策略判定層
- 在 calculateWeightedElements() 之後，生成飲食建議之前，調用 strategyEngine
- 輸入：WeightedElementResult 和 EngineProfile
- 輸出：DailyStrategyObject (strategyName, primaryTargetElement, secondaryTargetElement)
- 廢除舊邏輯：移除「找出比例 < 20% 的五行」的舊決策邏輯
- 應用新策略：
  - targetElement 直接使用 DailyStrategyObject.primaryTargetElement
  - supplements 圍繞 primaryTargetElement 和 secondaryTargetElement 生成
  - 核心策略文案直接體現當日動態策略

### 第二部分：情境模式 (Contextual Mode)
- 在飲食羅盤前端加入情境模式選擇器（天命、戀愛、工作、休閒、出遊）
- 當用戶選擇不同模式時，後端採用對應的 blendedPriority 指導動態策略判定層
- 工作模式傾向觸發強化「決斷力(金)」或「財富(土)」的飲食策略

### 第三部分：時辰動態調整 (Hourly Dynamics)
- 在前端加入時辰能量時間軸（與神諭穿搭相同）
- 當用戶點擊不同時辰時，後端將該時辰的干支五行疊加到環境五行中，重新計算加權五行比例，並重新運行動態策略判定層
- 午時(11-13)和酉時(17-19)的飲食建議因時辰能量不同而完全不同

### 第四部分：健康觀念與延伸內容
#### 3.1 AI 主廚菜單 (AI-Powered)
- 在生成飲食建議後，將「今日推薦五行」和對應的「推薦食材」作為上下文，調用一次 invokeLLM
- AI Prompt：「你是一位結合了東方五行智慧與現代營養學的頂級健康主廚。今天的命理建議是多攝取『火』系和『土』系的食物，例如辣椒、番茄、紅薯、南瓜。請基於這些食材，為用戶設計一份均衡、美味且健康的『今日開運午餐/晚餐』菜單建議（例如：一道主菜，一道配菜，一道湯品），並附上一句簡短的健康提示。」
- 前端呈現：精美卡片形式，展示在「今日推薦食物」下方，標題為「主廚的健康開運菜單」

#### 3.2 相關知識延伸
- 在飲食建議卡片底部，增加可點擊的連結或按鈕「了解更多關於 X 系食物的秘密」
- 點擊後彈出信息框，內容包括：
  - 該五行食物對應的身體器官（如：火對應心臟、小腸）
  - 從中醫角度的食療功效
  - 適合的烹飪方式（如：火系食物適合燒烤、快炒）

## V11.0 - 貼心私人管家（記憶與感知引擎）

### 第一部分：後端架構升級 - 建立記憶基礎

#### 1.1 dietary_logs 表（已建立）
- id, userId, logDate, mealType, consumedElement, consumedFood, preference, createdAt

#### 1.2 user_diet_preferences 表（已建立）
- id, userId, healthTags (JSON), budgetPreference, dislikedElements (JSON), createdAt, updatedAt

#### 1.3 新增 tRPC 程序
- diet.logConsumption: (logDate, mealType, consumedElement, preference) - 寫入飲食日誌
- account.updateUserPreferences: (healthTags, budgetPreference) - 更新個人偏好設定
- account.getUserPreferences: - 獲取當前用戶的偏好設定

### 第二部分：改造 V10 決策引擎 - 注入記憶與感知

#### 2.1 改造 generateDietaryAdvice
- 在調用動態策略判定層之前，先從資料庫查詢該用戶過去 24 小時內的 dietary_logs 和完整的 user_preferences
- 短期記憶邏輯：如果用戶昨日已大量攝取某五行（例如 'fire'），在今天生成建議時：
  - 降低「重型」火系食物（如麻辣火鍋、燒烤）的推薦順位
  - 優先展示「輕型」火系食物（如番茄、紅棗）
  - 在建議文案中增加一句提示：「系統注意到您昨日已補充大量火能量，今日建議以溫和的方式繼續鞏固，避免過於燥熱。」
- 健康標籤過濾：在生成推薦食物列表和餐廳關鍵字時，必須嚴格過濾掉與用戶 healthTags 衝突的內容
  - vegetarian：所有推薦食物中不能包含肉類，餐廳搜索關鍵字中應增加「素食」、「蔬食」
  - no_seafood：所有推薦食物中不能包含魚、蝦，餐廳搜索關鍵字中應移除「海鮮」、「壽司」

#### 2.2 改造 scoreNearbyStores
- 時間場景感知：函數接收一個 mealType 參數 ('breakfast', 'lunch', 'dinner')
  - breakfast: 優先使用「早午餐」、「咖啡廳」、「麵包」
  - lunch: 優先使用「便當」、「快餐」、「小吃」
  - dinner: 優先使用「餐廳」、「聚餐」
- 預算控制：函數接收一個可選的 budget 參數 ({min, max})
  - 從 Google Places API 獲取餐廳列表後，根據其返回的 price_level 字段進行篩選

### 第三部分：前端界面升級

#### 3.1 飲食日誌交互功能
- 位置：在飲食羅盤頁面的「今日推薦」卡片下方或旁邊
- 設計一個簡潔的「我吃了這個」區域
- 當用戶點擊後，可以快速選擇餐別（午餐/晚餐），並對本次推薦給予「👍 喜歡」或「👎 不喜歡」的評價
- 點擊後調用 diet.logConsumption 程序，將數據寫入後端

#### 3.2 個人偏好設定頁面
- 位置：在用戶的個人中心（/my-profile）增加一個新的 Tab 或頁面，名為「飲食偏好設定」
- 健康標籤管理：提供一組預設的 Checkbox 選項，如「素食主義」、「海鮮過敏」、「無麩質」、「低碳水」等，允許用戶多選
- 預算偏好設定：提供一個價格範圍滑塊 (Range Slider) 或幾個預設的價格區間選項（如 $150 以下, $150-$300, $300 以上），讓用戶設定常用的餐飲預算
- 頁面底部有一個「保存設定」按鈕，點擊後調用 account.updateUserPreferences

#### 3.3 場景感知前端體現
- 頁面加載時，根據當前時間自動判斷應為「早餐」、「午餐」或「晚餐」模式，並在界面上給予一個清晰的標題，例如「為您推薦今天的開運午餐」
- 在「附近餐廳」的篩選器中，正式加入「預算範圍」的篩選條件
