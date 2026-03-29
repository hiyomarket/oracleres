/**
 * v5.6 世界地圖節點種子腳本
 * 建立完整的世界地圖節點，將遊戲虛構區域映射到真實世界座標
 * 
 * 區域映射：
 * - 初界（新手區）→ 台灣各地
 * - 迷霧城（主城）→ 台北市中心及周邊
 * - 中界（進階區）→ 東亞各地（日本、韓國、中國名山）
 * - 試煉之塔 → 阿爾卑斯山
 * - 碎影深淵 → 喜馬拉雅山脈
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const nodes = [
  // ===== 迷霧城（台北市中心）=====
  { name: '迷霧城・戰士公會大廳', lat: 25.0330, lng: 121.5654, nodeType: 'guild', wuxing: '金', region: '迷霧城', subRegion: '戰士公會大廳', description: '迷霧城最大的戰士訓練機構，各路武者在此切磋武藝', levelMin: 1, levelMax: 30, realWorldName: '台北市信義區・台北101', sortOrder: 1 },
  { name: '迷霧城・武器評議塔', lat: 25.0478, lng: 121.5170, nodeType: 'tower', wuxing: '金', region: '迷霧城', subRegion: '武器評議塔', description: '武器鑑定與評議的權威機構，塔內藏有無數神兵利器', levelMin: 10, levelMax: 40, realWorldName: '台北市中山區・圓山大飯店', sortOrder: 2 },
  { name: '迷霧城・東門箭塔', lat: 25.0340, lng: 121.5228, nodeType: 'tower', wuxing: '木', region: '迷霧城', subRegion: '東門箭塔', description: '守護迷霧城東方的箭塔，弓箭手在此日夜巡邏', levelMin: 5, levelMax: 25, realWorldName: '台北市中正區・中正紀念堂', sortOrder: 3 },
  { name: '迷霧城・地下競技場', lat: 25.0418, lng: 121.5079, nodeType: 'dungeon', wuxing: '火', region: '迷霧城', subRegion: '地下競技場', description: '隱藏在迷霧城地下的非法競技場，賭徒和鬥士的天堂', levelMin: 15, levelMax: 45, realWorldName: '台北市萬華區・龍山寺', sortOrder: 4 },
  { name: '迷霧城・黑市後巷', lat: 25.0460, lng: 121.5085, nodeType: 'market', wuxing: '水', region: '迷霧城', subRegion: '黑市後巷', description: '迷霧城最隱秘的交易場所，暗影刺客在此出沒', levelMin: 20, levelMax: 50, realWorldName: '台北市大同區・迪化街', sortOrder: 5 },
  { name: '迷霧城・荒廢藥房', lat: 25.0375, lng: 121.5645, nodeType: 'lab', wuxing: '木', region: '迷霧城', subRegion: '荒廢藥房', description: '曾經的名藥師工坊，如今只剩毒術師在此研究禁忌之術', levelMin: 20, levelMax: 45, realWorldName: '台北市信義區・松山文創園區', sortOrder: 6 },
  { name: '迷霧城・盜賊公會', lat: 25.0500, lng: 121.5250, nodeType: 'guild', wuxing: '水', region: '迷霧城', subRegion: '盜賊公會', description: '盜賊們的秘密據點，只有得到認可的人才能進入', levelMin: 15, levelMax: 40, realWorldName: '台北市中山區・林森北路', sortOrder: 7 },
  { name: '迷霧城・採集者工會', lat: 25.0280, lng: 121.5430, nodeType: 'guild', wuxing: '木', region: '迷霧城', subRegion: '採集者工會', description: '採集者們交換情報和材料的聚集地', levelMin: 1, levelMax: 20, realWorldName: '台北市大安區・大安森林公園', sortOrder: 8 },
  { name: '迷霧城・工匠街', lat: 25.0530, lng: 121.5140, nodeType: 'market', wuxing: '火', region: '迷霧城', subRegion: '工匠街', description: '迷霧城最繁華的工匠聚集地，各種裝備在此打造', levelMin: 1, levelMax: 30, realWorldName: '台北市大同區・寧夏夜市', sortOrder: 9 },
  { name: '迷霧城・鑑定商店', lat: 25.0420, lng: 121.5440, nodeType: 'market', wuxing: '土', region: '迷霧城', subRegion: '鑑定商店', description: '鑑定師瑪德琳的店鋪，可以鑑定各種未知物品', levelMin: 1, levelMax: 99, realWorldName: '台北市松山區・饒河街夜市', sortOrder: 10 },

  // ===== 初界（台灣各地）=====
  { name: '初界・試煉廣場', lat: 25.0170, lng: 121.5390, nodeType: 'city', wuxing: '火', region: '初界', subRegion: '試煉廣場', description: '新手冒險者的第一個試煉場，火焰導師在此指導基礎魔法', levelMin: 1, levelMax: 15, realWorldName: '台北市大安區・台灣大學', sortOrder: 11 },
  { name: '初界・霜語小屋', lat: 24.7960, lng: 120.9967, nodeType: 'village', wuxing: '水', region: '初界', subRegion: '霜語小屋', description: '隱藏在冰霜之中的小屋，冰霜魔女在此修行', levelMin: 5, levelMax: 20, realWorldName: '新竹市・新竹科學園區', sortOrder: 12 },
  { name: '初界・迷跡驛站', lat: 24.1478, lng: 120.6736, nodeType: 'camp', wuxing: '木', region: '初界', subRegion: '迷跡驛站', description: '旅人們休息的驛站，風之旅者嵐德常在此停留', levelMin: 5, levelMax: 25, realWorldName: '台中市・台中公園', sortOrder: 13 },
  { name: '初界・學術廢墟', lat: 24.9870, lng: 121.5760, nodeType: 'academy', wuxing: '水', region: '初界', subRegion: '學術廢墟', description: '曾經輝煌的學術殿堂，如今只剩催眠學者在此研究', levelMin: 10, levelMax: 30, realWorldName: '新北市新店區・碧潭', sortOrder: 14 },
  { name: '初界・岩骨村', lat: 24.8059, lng: 121.7513, nodeType: 'village', wuxing: '土', region: '初界', subRegion: '岩骨村', description: '建在岩石之上的村落，石化術士格雷在此研究石化之術', levelMin: 10, levelMax: 30, realWorldName: '宜蘭縣・礁溪溫泉', sortOrder: 15 },
  { name: '初界・濕毒沼澤', lat: 23.5565, lng: 120.4390, nodeType: 'water', wuxing: '水', region: '初界', subRegion: '濕毒沼澤', description: '充滿毒霧的沼澤地帶，毒沼女巫米莉亞的領地', levelMin: 15, levelMax: 35, realWorldName: '嘉義縣・鰲鼓濕地', sortOrder: 16 },
  { name: '初界・回憶沙漠', lat: 23.0000, lng: 120.2200, nodeType: 'mountain', wuxing: '火', region: '初界', subRegion: '回憶沙漠', description: '遺忘之魂徘徊的荒漠，時間在此停滯', levelMin: 15, levelMax: 35, realWorldName: '台南市・七股鹽山', sortOrder: 17 },
  { name: '初界・葡萄酒莊', lat: 24.0833, lng: 120.5400, nodeType: 'village', wuxing: '木', region: '初界', subRegion: '葡萄酒莊', description: '醉拳大師卡洛斯隱居的酒莊，以酒入道', levelMin: 10, levelMax: 30, realWorldName: '彰化縣・鹿港老街', sortOrder: 18 },
  { name: '初界・聖光修道院', lat: 23.4800, lng: 120.4500, nodeType: 'temple', wuxing: '金', region: '初界', subRegion: '聖光修道院', description: '聖光修士和高階治癒師修行的神聖之地', levelMin: 10, levelMax: 40, realWorldName: '嘉義市・阿里山國家森林遊樂區', sortOrder: 19 },
  { name: '初界・泉水聖所', lat: 22.6273, lng: 120.3014, nodeType: 'water', wuxing: '水', region: '初界', subRegion: '泉水聖所', description: '淨化聖女索菲亞守護的聖泉，具有淨化一切邪穢的力量', levelMin: 10, levelMax: 35, realWorldName: '高雄市・蓮池潭', sortOrder: 20 },

  // ===== 中界（東亞各地）=====
  { name: '中界・墜星高地', lat: 35.3606, lng: 138.7274, nodeType: 'mountain', wuxing: '火', region: '中界', subRegion: '墜星高地', description: '傳說中隕石墜落之地，隕石召喚師在此感應天外之力', levelMin: 30, levelMax: 60, realWorldName: '日本・富士山', sortOrder: 21 },
  { name: '中界・混沌實驗室', lat: 35.6762, lng: 139.6503, nodeType: 'lab', wuxing: '水', region: '中界', subRegion: '混沌實驗室', description: '混亂實驗家尼克的秘密實驗室，充滿各種危險的實驗品', levelMin: 30, levelMax: 55, realWorldName: '日本・東京秋葉原', sortOrder: 22 },
  { name: '中界・永恆教堂', lat: 37.5665, lng: 126.9780, nodeType: 'temple', wuxing: '金', region: '中界', subRegion: '永恆教堂', description: '復活祭司馬修主持的教堂，擁有起死回生之力', levelMin: 35, levelMax: 65, realWorldName: '韓國・首爾景福宮', sortOrder: 23 },
  { name: '中界・古老森林', lat: 30.2741, lng: 120.1551, nodeType: 'forest', wuxing: '木', region: '中界', subRegion: '古老森林', description: '千年古木環繞的神秘森林，森林治癒者蓮娜在此守護', levelMin: 30, levelMax: 55, realWorldName: '中國・杭州西湖', sortOrder: 24 },
  { name: '中界・影之山谷', lat: 29.5630, lng: 106.5516, nodeType: 'dungeon', wuxing: '水', region: '中界', subRegion: '影之山谷', description: '永遠籠罩在陰影中的山谷，影之吸收者塔洛斯的領地', levelMin: 40, levelMax: 70, realWorldName: '中國・重慶武隆天生三橋', sortOrder: 25 },
  { name: '中界・虛空法塔', lat: 34.6937, lng: 135.5023, nodeType: 'tower', wuxing: '火', region: '中界', subRegion: '虛空法塔', description: '漂浮在虛空中的魔法塔，虛空法師艾莉絲在此研究禁忌魔法', levelMin: 35, levelMax: 65, realWorldName: '日本・大阪城', sortOrder: 26 },
  { name: '中界・鏡之修行場', lat: 36.2048, lng: 138.2529, nodeType: 'temple', wuxing: '水', region: '中界', subRegion: '鏡之修行場', description: '以水面為鏡的修行聖地，鏡之修行者靜源在此悟道', levelMin: 35, levelMax: 60, realWorldName: '日本・長野善光寺', sortOrder: 27 },
  { name: '中界・暗影公會', lat: 35.0116, lng: 135.7681, nodeType: 'guild', wuxing: '水', region: '中界', subRegion: '暗影公會', description: '暗殺者的秘密組織，暗殺大師夜歌統領此處', levelMin: 40, levelMax: 70, realWorldName: '日本・京都伏見稻荷大社', sortOrder: 28 },
  { name: '中界・永恆殿堂', lat: 37.5793, lng: 126.9770, nodeType: 'temple', wuxing: '金', region: '中界', subRegion: '永恆殿堂', description: '聖盾騎士團的總部，聖盾騎士雷納德在此守護正義', levelMin: 45, levelMax: 75, realWorldName: '韓國・首爾昌德宮', sortOrder: 29 },

  // ===== 試煉之塔（阿爾卑斯山）=====
  { name: '試煉之塔・地下訓練場', lat: 46.5197, lng: 7.9597, nodeType: 'dungeon', wuxing: '土', region: '試煉之塔', subRegion: '地下訓練場', description: '位於阿爾卑斯山深處的地下訓練場，崩擊大師赫格莫斯在此修行極限武技', levelMin: 50, levelMax: 80, realWorldName: '瑞士・少女峰', sortOrder: 30 },

  // ===== 碎影深淵（喜馬拉雅山脈）=====
  { name: '碎影深淵・入口營地', lat: 27.9881, lng: 86.9250, nodeType: 'camp', wuxing: '金', region: '碎影深淵', subRegion: '入口營地', description: '碎影深淵的入口營地，反擊女劍士費蓮娜在此守衛，只有最強的戰士才能進入', levelMin: 60, levelMax: 99, realWorldName: '尼泊爾・聖母峰基地營', sortOrder: 31 },
];

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  console.log(`準備插入 ${nodes.length} 個地圖節點...`);
  
  for (const node of nodes) {
    const [result] = await conn.execute(
      `INSERT INTO game_map_nodes (name, lat, lng, node_type, wuxing, region, sub_region, description, level_min, level_max, real_world_name, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [node.name, node.lat, node.lng, node.nodeType, node.wuxing, node.region, node.subRegion, node.description, node.levelMin, node.levelMax, node.realWorldName, node.sortOrder]
    );
    console.log(`  ✅ ${node.name} (${node.realWorldName}) → ID ${result.insertId}`);
  }
  
  console.log(`\n✅ 完成！共插入 ${nodes.length} 個地圖節點`);
  
  // 查詢所有節點以建立 NPC 映射
  const [allNodes] = await conn.execute('SELECT id, name, region, sub_region FROM game_map_nodes ORDER BY id');
  console.log('\n--- 節點 ID 映射 ---');
  for (const n of allNodes) {
    console.log(`  ID ${n.id}: ${n.name} [${n.region}]`);
  }
  
  await conn.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
