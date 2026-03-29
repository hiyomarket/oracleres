/**
 * v5.6 NPC ↔ 地圖節點關聯腳本
 * 將 32 個 NPC 的 mapNodeId 設定為對應的地圖節點 ID
 * 同時更新 NPC 的 location 欄位以匹配節點名稱
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// NPC ID → 地圖節點名稱的映射
// 基於 NPC 的 location 欄位和節點的 name 欄位進行匹配
const npcToNodeMapping = [
  // 迷霧城 NPCs
  { npcId: 36, npcName: '席拉', nodeName: '迷霧城・戰士公會大廳' },      // 連擊導師
  { npcId: 37, npcName: '沃克恩', nodeName: '迷霧城・武器評議塔' },      // 武器評議官
  { npcId: 40, npcName: '艾拉', nodeName: '迷霧城・東門箭塔' },          // 箭塔守衛
  { npcId: 41, npcName: '托里戈', nodeName: '迷霧城・地下競技場' },      // 賭徒鬥士
  { npcId: 42, npcName: '暮', nodeName: '迷霧城・黑市後巷' },            // 暗影刺客
  { npcId: 43, npcName: '維克多・奈斯特', nodeName: '迷霧城・荒廢藥房' }, // 毒術師
  
  // 初界 NPCs
  { npcId: 44, npcName: '艾爾文・赤焰', nodeName: '初界・試煉廣場' },    // 火焰導師
  { npcId: 45, npcName: '菲莉亞・霜語', nodeName: '初界・霜語小屋' },    // 冰霜魔女
  { npcId: 46, npcName: '嵐德・虛空旅人', nodeName: '初界・迷跡驛站' },  // 風之旅者
  { npcId: 48, npcName: '哈拉爾德', nodeName: '初界・學術廢墟' },        // 催眠學者
  { npcId: 49, npcName: '格雷', nodeName: '初界・岩骨村' },              // 石化術士
  { npcId: 51, npcName: '米莉亞', nodeName: '初界・濕毒沼澤' },          // 毒沼女巫
  { npcId: 52, npcName: '艾爾文（幽靈）', nodeName: '初界・回憶沙漠' },  // 遺忘之魂
  { npcId: 53, npcName: '卡洛斯', nodeName: '初界・葡萄酒莊' },          // 醉拳大師
  { npcId: 54, npcName: '艾文', nodeName: '初界・聖光修道院' },          // 聖光修士
  { npcId: 55, npcName: '琳娜', nodeName: '初界・聖光修道院' },          // 高階治癒師（同一節點）
  { npcId: 57, npcName: '索菲亞', nodeName: '初界・泉水聖所' },          // 淨化聖女
  { npcId: 63, npcName: '洛克斯', nodeName: '迷霧城・盜賊公會' },        // 盜賊首領
  { npcId: 65, npcName: '格林', nodeName: '迷霧城・採集者工會' },        // 採集者公會長
  { npcId: 66, npcName: '漢斯', nodeName: '迷霧城・工匠街' },            // 工匠大師
  { npcId: 67, npcName: '瑪德琳', nodeName: '迷霧城・鑑定商店' },        // 鑑定師
  
  // 中界 NPCs
  { npcId: 47, npcName: '星見・隕晨', nodeName: '中界・墜星高地' },      // 隕石召喚師
  { npcId: 50, npcName: '尼克', nodeName: '中界・混沌實驗室' },          // 混亂實驗家
  { npcId: 56, npcName: '馬修', nodeName: '中界・永恆教堂' },            // 復活祭司
  { npcId: 58, npcName: '蓮娜', nodeName: '中界・古老森林' },            // 森林治癒者
  { npcId: 59, npcName: '塔洛斯', nodeName: '中界・影之山谷' },          // 影之吸收者
  { npcId: 60, npcName: '艾莉絲', nodeName: '中界・虛空法塔' },          // 虛空法師
  { npcId: 61, npcName: '靜源', nodeName: '中界・鏡之修行場' },          // 鏡之修行者
  { npcId: 62, npcName: '夜歌', nodeName: '中界・暗影公會' },            // 暗殺大師
  { npcId: 64, npcName: '雷納德', nodeName: '中界・永恆殿堂' },          // 聖盾騎士
  
  // 特殊區域 NPCs
  { npcId: 39, npcName: '赫格莫斯', nodeName: '試煉之塔・地下訓練場' }, // 崩擊大師
  { npcId: 38, npcName: '費蓮娜', nodeName: '碎影深淵・入口營地' },     // 反擊女劍士
];

async function linkNpcs() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // 先取得所有節點的 ID 映射
  const [allNodes] = await conn.execute('SELECT id, name FROM game_map_nodes');
  const nodeMap = {};
  for (const n of allNodes) {
    nodeMap[n.name] = n.id;
  }
  
  console.log(`已載入 ${allNodes.length} 個地圖節點`);
  console.log(`準備關聯 ${npcToNodeMapping.length} 個 NPC...`);
  
  let success = 0;
  let failed = 0;
  
  for (const mapping of npcToNodeMapping) {
    const nodeId = nodeMap[mapping.nodeName];
    if (!nodeId) {
      console.error(`  ❌ NPC ${mapping.npcName} (ID ${mapping.npcId}): 找不到節點「${mapping.nodeName}」`);
      failed++;
      continue;
    }
    
    await conn.execute(
      'UPDATE game_npc_catalog SET map_node_id = ?, location = ?, updated_at = ? WHERE id = ?',
      [nodeId, mapping.nodeName, Date.now(), mapping.npcId]
    );
    console.log(`  ✅ ${mapping.npcName} (NPC #${mapping.npcId}) → 節點 #${nodeId} (${mapping.nodeName})`);
    success++;
  }
  
  console.log(`\n✅ 完成！成功 ${success} / 失敗 ${failed} / 總計 ${npcToNodeMapping.length}`);
  
  // 驗證結果
  const [result] = await conn.execute(
    'SELECT n.id, n.name, n.location, n.region, n.map_node_id, m.real_world_name FROM game_npc_catalog n LEFT JOIN game_map_nodes m ON n.map_node_id = m.id ORDER BY n.id'
  );
  
  console.log('\n--- NPC ↔ 節點 關聯驗證 ---');
  for (const r of result) {
    const status = r.map_node_id ? '✅' : '⚠️';
    console.log(`  ${status} NPC #${r.id} ${r.name} [${r.region}] → 節點 #${r.map_node_id || 'NULL'} (${r.real_world_name || 'N/A'})`);
  }
  
  await conn.end();
}

linkNpcs().catch(err => { console.error(err); process.exit(1); });
