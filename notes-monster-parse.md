# 怪物圖鑑 Markdown 解析筆記

## 資料結構
每隻怪物以 `### M_WXXX 名稱` 開頭，後接一個 4 欄表格：
| 欄位 | 數值 | 欄位 | 數值 |

## 欄位對應
- monster_code → monsterId (如 M_W001)
- 等級 → levelRange (單一數字，轉為 "X-X")
- 稀有度 → rarity (普通→common, 精英→rare, Boss→epic, 世界Boss→legendary)
- HP → baseHp
- 攻擊 → baseAttack
- 防禦 → baseDefense
- 速度 → baseSpeed
- 命中力 → baseAccuracy
- 魔法攻擊 → baseMagicAttack
- 抗木% → resistWood
- 抗火% → resistFire
- 抗土% → resistEarth
- 抗金% → resistMetal
- 抗水% → resistWater
- 被剋制加成% → counterBonus
- skill_id_1/2/3 → skillId1/2/3 (取 SK_MXXX 部分)
- AI 等級 → aiLevel
- 成長率 → growthRate (普通→1.0, 良好→1.2, 優秀→1.5, 天賦→2.0, 傳說→3.0)
- 掉落素材 → dropItem1 (取 I_WXXX 部分)
- 掉落機率% → dropRate1 (取數字)
- 掉落金幣 → dropGold (解析 "min–max" 格式)
- 傳說掉落 → legendaryDrop (取 I_WXXX 部分)
- 傳說掉落機率% → legendaryDropRate

## 五行
- GD-011A → 木
- GD-011B → 火
- GD-011C → 土
- GD-011D → 金
- GD-011E → 水

## 每檔 25 隻 (初階10 + 中階精英10 + Boss4 + 世界Boss1) = 共 125 隻 (但 GD-011A 有 50 隻標題，實際只有 25 隻)
