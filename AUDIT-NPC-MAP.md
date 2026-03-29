# NPC-Map Node Audit

## Current State
- **game_map_nodes**: 0 rows (completely empty!)
- **game_npc_catalog**: 32 NPCs
- NPC table has `location` (text) and `region` (text) fields, but NO `mapNodeId` foreign key

## NPC Regions Distribution
| Region | Count |
|--------|-------|
| 初界 | 15 |
| 中界 | 9 |
| 迷霧城 | 6 |
| 試煉之塔 | 1 |
| 碎影深淵 | 1 |

## All 32 NPCs and Their Locations
| ID | Code | Name | Title | Location | Region |
|----|------|------|-------|----------|--------|
| 36 | NPC_SILA | 席拉 | 連擊導師 | 迷霧城・戰士公會大廳 | 迷霧城 |
| 37 | NPC_WOKEN | 沃克恩 | 武器評議官 | 迷霧城・武器評議塔 | 迷霧城 |
| 38 | NPC_FELINA | 費蓮娜 | 反擊女劍士 | 碎影深淵・入口營地 | 碎影深淵 |
| 39 | NPC_HEGMOS | 赫格莫斯 | 崩擊大師 | 試煉之塔・地下訓練場 | 試煉之塔 |
| 40 | NPC_ELLA | 艾拉 | 箭塔守衛 | 迷霧城・東門箭塔 | 迷霧城 |
| 41 | NPC_TORIGO | 托里戈 | 賭徒鬥士 | 迷霧城・地下競技場 | 迷霧城 |
| 42 | NPC_MU | 暮 | 暗影刺客 | 迷霧城・黑市後巷 | 迷霧城 |
| 43 | NPC_VICTOR | 維克多・奈斯特 | 毒術師 | 迷霧城・荒廢藥房 | 迷霧城 |
| 44 | NPC_ELVEN_FIRE | 艾爾文・赤焰 | 火焰導師 | 初界・試煉廣場 | 初界 |
| 45 | NPC_FILIA | 菲莉亞・霜語 | 冰霜魔女 | 初界・霜語小屋 | 初界 |
| 46 | NPC_RAND | 嵐德・虛空旅人 | 風之旅者 | 初界・迷跡驛站 | 初界 |
| 47 | NPC_STARFALL | 星見・隕晨 | 隕石召喚師 | 中界・墜星高地 | 中界 |
| 48 | NPC_HARALD | 哈拉爾德 | 催眠學者 | 初界・學術廢墟 | 初界 |
| 49 | NPC_GREY | 格雷 | 石化術士 | 初界・岩骨村 | 初界 |
| 50 | NPC_NICK | 尼克 | 混亂實驗家 | 中界・混沌實驗室 | 中界 |
| 51 | NPC_MILIA | 米莉亞 | 毒沼女巫 | 初界・濕毒沼澤 | 初界 |
| 52 | NPC_ELVEN_GHOST | 艾爾文（幽靈） | 遺忘之魂 | 初界・回憶沙漠 | 初界 |
| 53 | NPC_CARLOS | 卡洛斯 | 醉拳大師 | 初界・葡萄酒莊 | 初界 |
| 54 | NPC_EVAN | 艾文 | 聖光修士 | 初界・聖光修道院 | 初界 |
| 55 | NPC_LINA | 琳娜 | 高階治癒師 | 初界・聖光修道院二層 | 初界 |
| 56 | NPC_MATTHEW | 馬修 | 復活祭司 | 中界・永恆教堂 | 中界 |
| 57 | NPC_SOPHIA | 索菲亞 | 淨化聖女 | 初界・泉水聖所 | 初界 |
| 58 | NPC_RENA | 蓮娜 | 森林治癒者 | 中界・古老森林 | 中界 |
| 59 | NPC_TALOS | 塔洛斯 | 影之吸收者 | 中界・影之山谷 | 中界 |
| 60 | NPC_ALICE | 艾莉絲 | 虛空法師 | 中界・虛空法塔 | 中界 |
| 61 | NPC_JINGEN | 靜源 | 鏡之修行者 | 中界・鏡之修行場 | 中界 |
| 62 | NPC_NIGHTSONG | 夜歌 | 暗殺大師 | 中界・暗影公會 | 中界 |
| 63 | NPC_LOCKS | 洛克斯 | 盜賊首領 | 初界・迷霧城盜賊公會 | 初界 |
| 64 | NPC_RENARD | 雷納德 | 聖盾騎士 | 中界・永恆殿堂 | 中界 |
| 65 | NPC_GREEN | 格林 | 採集者公會長 | 初界・迷霧城採集者工會 | 初界 |
| 66 | NPC_HANS | 漢斯 | 工匠大師 | 初界・迷霧城工匠街 | 初界 |
| 67 | NPC_MADELINE | 瑪德琳 | 鑑定師 | 初界・迷霧城鑑定商店 | 初界 |

## Skill Rarity Distribution (Player Skills)
| Rarity | Count | Has NPC |
|--------|-------|---------|
| common | 24 | 24 |
| rare | 27 | 27 |
| epic | 17 | 17 |
| legendary | 6 | 6 |

## Epic/Legendary Skills - All have empty items[]
- All 17 epic and 6 legendary skills have `"items": []` in learn_cost
- Need to create quest items and add them as requirements

## Plan: World Map Design
Since the game uses a real-world map, we need to map the fictional regions to real-world locations:
- **初界** (Beginner Zone) → Taiwan area (home base)
- **迷霧城** (Mist City) → A specific city in Taiwan
- **中界** (Mid Zone) → East Asia / Southeast Asia
- **試煉之塔** (Trial Tower) → Special landmark (e.g., Alps)
- **碎影深淵** (Shadow Abyss) → Special landmark (e.g., Himalayas)

## Schema Changes Needed
1. Add `mapNodeId` to gameNpcCatalog to link NPCs to actual map nodes
2. Enhance gameMapNodes with more fields (description, region, level range, etc.)
3. Create map nodes for all NPC locations
