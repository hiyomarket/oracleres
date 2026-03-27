/**
 * 天命考核技能種子資料 — 32 種技能 + NPC + 任務步驟
 * 
 * 使用方式：在管理後台的 AI 工具 Tab 中呼叫 tRPC API，
 * 或直接 node server/seeds/seedQuestSkills.mjs
 * 
 * 此檔案匯出結構化資料，供 tRPC batchCreate 使用
 */

// ═══════════════════════════════════════════════════════════════════════
// NPC 資料（32 種技能涉及的所有 NPC）
// ═══════════════════════════════════════════════════════════════════════

export const QUEST_NPCS = [
  // 物理戰鬥系
  { code: "NPC_SILA", name: "席拉", title: "連擊導師", location: "迷霧城・戰士公會大廳", region: "迷霧城" },
  { code: "NPC_WOKEN", name: "沃克恩", title: "武器評議官", location: "迷霧城・武器評議塔", region: "迷霧城" },
  { code: "NPC_FELINA", name: "費蓮娜", title: "反擊女劍士", location: "碎影深淵・入口營地", region: "碎影深淵" },
  { code: "NPC_HEGMOS", name: "赫格莫斯", title: "崩擊大師", location: "試煉之塔・地下訓練場", region: "試煉之塔" },
  { code: "NPC_ELLA", name: "艾拉", title: "箭塔守衛", location: "迷霧城・東門箭塔", region: "迷霧城" },
  { code: "NPC_TORIGO", name: "托里戈", title: "賭徒鬥士", location: "迷霧城・地下競技場", region: "迷霧城" },
  { code: "NPC_MU", name: "暮", title: "暗影刺客", location: "迷霧城・黑市後巷", region: "迷霧城" },
  { code: "NPC_VICTOR", name: "維克多・奈斯特", title: "毒術師", location: "迷霧城・荒廢藥房", region: "迷霧城" },
  // 魔法攻擊系
  { code: "NPC_ELVEN_FIRE", name: "艾爾文・赤焰", title: "火焰導師", location: "初界・試煉廣場", region: "初界" },
  { code: "NPC_FILIA", name: "菲莉亞・霜語", title: "冰霜魔女", location: "初界・霜語小屋", region: "初界" },
  { code: "NPC_RAND", name: "嵐德・虛空旅人", title: "風之旅者", location: "初界・迷跡驛站", region: "初界" },
  { code: "NPC_STARFALL", name: "星見・隕晨", title: "隕石召喚師", location: "中界・墜星高地", region: "中界" },
  // 狀態控制系
  { code: "NPC_HARALD", name: "哈拉爾德", title: "催眠學者", location: "初界・學術廢墟", region: "初界" },
  { code: "NPC_GREY", name: "格雷", title: "石化術士", location: "初界・岩骨村", region: "初界" },
  { code: "NPC_NICK", name: "尼克", title: "混亂實驗家", location: "中界・混沌實驗室", region: "中界" },
  { code: "NPC_MILIA", name: "米莉亞", title: "毒沼女巫", location: "初界・濕毒沼澤", region: "初界" },
  { code: "NPC_ELVEN_GHOST", name: "艾爾文（幽靈）", title: "遺忘之魂", location: "初界・回憶沙漠", region: "初界" },
  { code: "NPC_CARLOS", name: "卡洛斯", title: "醉拳大師", location: "初界・葡萄酒莊", region: "初界" },
  // 戰鬥輔助系
  { code: "NPC_EVAN", name: "艾文", title: "聖光修士", location: "初界・聖光修道院", region: "初界" },
  { code: "NPC_LINA", name: "琳娜", title: "高階治癒師", location: "初界・聖光修道院二層", region: "初界" },
  { code: "NPC_MATTHEW", name: "馬修", title: "復活祭司", location: "中界・永恆教堂", region: "中界" },
  { code: "NPC_SOPHIA", name: "索菲亞", title: "淨化聖女", location: "初界・泉水聖所", region: "初界" },
  { code: "NPC_RENA", name: "蓮娜", title: "森林治癒者", location: "中界・古老森林", region: "中界" },
  { code: "NPC_TALOS", name: "塔洛斯", title: "影之吸收者", location: "中界・影之山谷", region: "中界" },
  { code: "NPC_ALICE", name: "艾莉絲", title: "虛空法師", location: "中界・虛空法塔", region: "中界" },
  { code: "NPC_JINGEN", name: "靜源", title: "鏡之修行者", location: "中界・鏡之修行場", region: "中界" },
  // 特殊功能系
  { code: "NPC_NIGHTSONG", name: "夜歌", title: "暗殺大師", location: "中界・暗影公會", region: "中界" },
  { code: "NPC_LOCKS", name: "洛克斯", title: "盜賊首領", location: "初界・迷霧城盜賊公會", region: "初界" },
  { code: "NPC_RENARD", name: "雷納德", title: "聖盾騎士", location: "中界・永恆殿堂", region: "中界" },
  // 生產系
  { code: "NPC_GREEN", name: "格林", title: "採集者公會長", location: "初界・迷霧城採集者工會", region: "初界" },
  { code: "NPC_HANS", name: "漢斯", title: "工匠大師", location: "初界・迷霧城工匠街", region: "初界" },
  { code: "NPC_MADELINE", name: "瑪德琳", title: "鑑定師", location: "初界・迷霧城鑑定商店", region: "初界" },
];

// ═══════════════════════════════════════════════════════════════════════
// 32 種天命考核技能
// ═══════════════════════════════════════════════════════════════════════

export const QUEST_SKILLS = [
  // ─── 物理戰鬥系 P1-P8 ───
  {
    code: "P1", name: "連擊", questTitle: "碎影雙刃・連環之路",
    category: "physical", skillType: "attack", wuxing: "金",
    description: "連續攻擊 2~5 次，每次造成基礎攻擊力 +10% 的物理傷害",
    powerPercent: 110, mpCost: 15, cooldown: 4, maxLevel: 10, levelUpBonus: 5,
    specialMechanic: { hitCount: [2, 5] },
    learnCost: { gold: 1500 },
    rarity: "rare", sortOrder: 1, npcCode: "NPC_SILA",
  },
  {
    code: "P2", name: "諸刃", questTitle: "共鳴之刃・破碎試煉",
    category: "physical", skillType: "attack", wuxing: "金",
    description: "揮出共鳴之刃，造成 180% 物理傷害",
    powerPercent: 180, mpCost: 20, cooldown: 5, maxLevel: 10, levelUpBonus: 10,
    learnCost: { gold: 2000, items: [{ name: "共鳴刃片", count: 5 }] },
    rarity: "rare", sortOrder: 2, npcCode: "NPC_WOKEN",
  },
  {
    code: "P3", name: "反擊", questTitle: "碎影回擊・鏡面之路",
    category: "physical", skillType: "passive", wuxing: "金",
    description: "被攻擊時有機率反彈 100% 傷害（被動技能）",
    powerPercent: 100, mpCost: 0, cooldown: 2, maxLevel: 10, levelUpBonus: 5,
    specialMechanic: { isPassive: true },
    learnCost: { gold: 2500, items: [{ name: "永恆鋼碎片", count: 1 }] },
    rarity: "epic", sortOrder: 3, npcCode: "NPC_FELINA",
  },
  {
    code: "P4", name: "崩擊", questTitle: "鐵壁崩裂・破防之道",
    category: "physical", skillType: "attack", wuxing: "土",
    description: "對高防禦敵人造成 250% 物理傷害，並降低目標防禦 30%",
    powerPercent: 250, mpCost: 18, cooldown: 5, maxLevel: 10, levelUpBonus: 12,
    additionalEffect: { type: "defDown", chance: 100, value: 30, duration: 3 },
    learnCost: { gold: 2200, items: [{ name: "核心共振碎片", count: 3 }] },
    rarity: "rare", sortOrder: 4, npcCode: "NPC_HEGMOS",
  },
  {
    code: "P5", name: "亂射", questTitle: "箭雨風暴・散射之術",
    category: "physical", skillType: "attack", wuxing: "木",
    description: "向 5×5 範圍發射箭雨，造成 120% 物理傷害",
    powerPercent: 120, mpCost: 22, cooldown: 5, maxLevel: 10, levelUpBonus: 8,
    specialMechanic: { aoe: "5x5" },
    learnCost: { gold: 1800, items: [{ name: "弓弦共鳴珠", count: 1 }] },
    rarity: "rare", sortOrder: 5, npcCode: "NPC_ELLA",
  },
  {
    code: "P6", name: "乾坤一擲", questTitle: "命運之擲・賭徒的覺悟",
    category: "physical", skillType: "attack", wuxing: "火",
    description: "350% 物理傷害，無視防禦，但命中率僅 60%",
    powerPercent: 350, mpCost: 25, cooldown: 6, maxLevel: 10, levelUpBonus: 15,
    specialMechanic: { accuracyMod: -40 },
    learnCost: { gold: 3000, items: [{ name: "命運殘片", count: 1 }] },
    rarity: "epic", sortOrder: 6, npcCode: "NPC_TORIGO",
  },
  {
    code: "P7", name: "迅速果斷", questTitle: "暗影疾風・先手之道",
    category: "physical", skillType: "attack", wuxing: "金",
    description: "150% 傷害，先制攻擊，無視護盾",
    powerPercent: 150, mpCost: 12, cooldown: 4, maxLevel: 10, levelUpBonus: 8,
    specialMechanic: { priority: true, ignoreShield: true },
    learnCost: { gold: 2800, items: [{ name: "反射結晶", count: 5 }] },
    rarity: "epic", sortOrder: 7, npcCode: "NPC_MU",
  },
  {
    code: "P8", name: "毒擊", questTitle: "毒霧蔓延・暗影之刺",
    category: "physical", skillType: "attack", wuxing: "木",
    description: "100% 物理傷害 + 中毒效果（-10HP/回合×5，可疊 3 層）",
    powerPercent: 100, mpCost: 12, cooldown: 3, maxLevel: 10, levelUpBonus: 5,
    additionalEffect: { type: "poison", chance: 80, value: 10, duration: 5 },
    learnCost: { gold: 1200, items: [{ name: "解毒草", count: 5 }] },
    rarity: "rare", sortOrder: 8, npcCode: "NPC_VICTOR",
  },

  // ─── 魔法攻擊系 M1-M4 ───
  {
    code: "M1", name: "火焰魔法", questTitle: "赤焰啟蒙・初火之路",
    category: "magic", skillType: "attack", wuxing: "火",
    description: "釋放火焰造成 30 點火屬性傷害，15% 機率灼燒",
    powerPercent: 130, mpCost: 8, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    additionalEffect: { type: "burn", chance: 15, value: 8, duration: 3 },
    learnCost: { soulCrystal: 300 },
    rarity: "rare", sortOrder: 9, npcCode: "NPC_ELVEN_FIRE",
  },
  {
    code: "M2", name: "冰凍魔法", questTitle: "霜語凝結・冰封之道",
    category: "magic", skillType: "attack", wuxing: "水",
    description: "釋放冰霜造成 25 點冰屬性傷害，20% 機率凍傷（速度 -30%）",
    powerPercent: 125, mpCost: 10, cooldown: 4, maxLevel: 10, levelUpBonus: 8,
    additionalEffect: { type: "freeze", chance: 20, value: 30, duration: 3 },
    learnCost: { soulCrystal: 350, items: [{ name: "暖陽石", count: 3 }] },
    rarity: "rare", sortOrder: 10, npcCode: "NPC_FILIA",
  },
  {
    code: "M3", name: "風刃魔法", questTitle: "虛空風刃・穿透之術",
    category: "magic", skillType: "attack", wuxing: "木",
    description: "釋放風刃（直線），造成 20 點風屬性傷害，15% 破甲",
    powerPercent: 120, mpCost: 12, cooldown: 3, maxLevel: 10, levelUpBonus: 7,
    additionalEffect: { type: "defDown", chance: 15, value: 20, duration: 2 },
    learnCost: { soulCrystal: 250 },
    rarity: "rare", sortOrder: 11, npcCode: "NPC_RAND",
  },
  {
    code: "M4", name: "隕石魔法", questTitle: "墜星審判・天降之怒",
    category: "magic", skillType: "attack", wuxing: "土",
    description: "召喚隕石（9 格範圍），造成 50 點地屬性傷害，中心雙倍，10% 眩暈",
    powerPercent: 200, mpCost: 25, cooldown: 6, maxLevel: 10, levelUpBonus: 12,
    additionalEffect: { type: "stun", chance: 10, value: 0, duration: 1 },
    specialMechanic: { aoe: "3x3", centerDouble: true },
    learnCost: { soulCrystal: 500, reputation: { area: "中界", amount: 50 } },
    prerequisites: { level: 10 },
    rarity: "epic", sortOrder: 12, npcCode: "NPC_STARFALL",
  },

  // ─── 狀態控制系 S1-S6 ───
  {
    code: "S1", name: "昏睡魔法", questTitle: "沉眠之語・催眠術",
    category: "status", skillType: "debuff", wuxing: "水",
    description: "使目標昏睡 15 秒，受到攻擊有 30% 機率醒來",
    powerPercent: 0, mpCost: 15, cooldown: 5, maxLevel: 10, levelUpBonus: 5,
    additionalEffect: { type: "sleep", chance: 70, value: 0, duration: 5 },
    learnCost: { soulCrystal: 280, items: [{ name: "清醒草", count: 3 }] },
    rarity: "rare", sortOrder: 13, npcCode: "NPC_HARALD",
  },
  {
    code: "S2", name: "石化魔法", questTitle: "岩骨凝固・石化之眼",
    category: "status", skillType: "debuff", wuxing: "土",
    description: "使目標石化 10 秒，防禦歸零，但傷害 -30%",
    powerPercent: 0, mpCost: 18, cooldown: 6, maxLevel: 10, levelUpBonus: 5,
    additionalEffect: { type: "petrify", chance: 60, value: 0, duration: 3 },
    learnCost: { soulCrystal: 320 },
    rarity: "rare", sortOrder: 14, npcCode: "NPC_GREY",
  },
  {
    code: "S3", name: "混亂魔法", questTitle: "混沌漩渦・心智崩壞",
    category: "status", skillType: "debuff", wuxing: "火",
    description: "使目標混亂 12 秒，40% 機率攻擊自己",
    powerPercent: 0, mpCost: 20, cooldown: 5, maxLevel: 10, levelUpBonus: 5,
    additionalEffect: { type: "confuse", chance: 65, value: 40, duration: 4 },
    learnCost: { soulCrystal: 400, items: [{ name: "秩序護符", count: 1 }] },
    prerequisites: { level: 8 },
    rarity: "epic", sortOrder: 15, npcCode: "NPC_NICK",
  },
  {
    code: "S4", name: "中毒魔法", questTitle: "毒沼侵蝕・腐蝕之術",
    category: "status", skillType: "debuff", wuxing: "木",
    description: "使目標中毒，-15HP/回合×5，可疊 3 層",
    powerPercent: 0, mpCost: 10, cooldown: 3, maxLevel: 10, levelUpBonus: 5,
    additionalEffect: { type: "poison", chance: 75, value: 15, duration: 5 },
    learnCost: { soulCrystal: 260, items: [{ name: "解毒草", count: 5 }] },
    rarity: "rare", sortOrder: 16, npcCode: "NPC_MILIA",
  },
  {
    code: "S5", name: "遺忘魔法", questTitle: "記憶沙漠・遺忘之風",
    category: "status", skillType: "debuff", wuxing: "水",
    description: "使目標遺忘 1~2 個技能 10 秒",
    powerPercent: 0, mpCost: 22, cooldown: 6, maxLevel: 10, levelUpBonus: 5,
    additionalEffect: { type: "forget", chance: 55, value: 2, duration: 3 },
    learnCost: { soulCrystal: 290, items: [{ name: "古老忘卻之證", count: 1 }] },
    rarity: "epic", sortOrder: 17, npcCode: "NPC_ELVEN_GHOST",
  },
  {
    code: "S6", name: "酒醉魔法", questTitle: "醉拳秘傳・葡萄之舞",
    category: "status", skillType: "debuff", wuxing: "水",
    description: "使目標酒醉，命中和迴避 -40%，持續 15 秒",
    powerPercent: 0, mpCost: 18, cooldown: 5, maxLevel: 10, levelUpBonus: 5,
    additionalEffect: { type: "drunk", chance: 70, value: 40, duration: 5 },
    learnCost: { soulCrystal: 300, items: [{ name: "熟透葡萄", count: 10 }] },
    rarity: "rare", sortOrder: 18, npcCode: "NPC_CARLOS",
  },

  // ─── 戰鬥輔助系 A1-A8 ───
  {
    code: "A1", name: "補血魔法", questTitle: "聖光啟蒙・治癒之手",
    category: "support", skillType: "heal", wuxing: "水",
    description: "回復 80 HP",
    powerPercent: 80, mpCost: 12, cooldown: 3, maxLevel: 10, levelUpBonus: 8,
    learnCost: { soulCrystal: 280, gold: 500 },
    rarity: "rare", sortOrder: 19, npcCode: "NPC_EVAN",
  },
  {
    code: "A2", name: "強效補血魔法", questTitle: "聖光昇華・大治癒術",
    category: "support", skillType: "heal", wuxing: "水",
    description: "範圍回復 120 HP",
    powerPercent: 120, mpCost: 20, cooldown: 4, maxLevel: 10, levelUpBonus: 10,
    specialMechanic: { aoe: "party" },
    learnCost: { soulCrystal: 350, gold: 1000, items: [{ name: "湧泉之心", count: 1 }] },
    prerequisites: { skills: ["A1"] },
    rarity: "epic", sortOrder: 20, npcCode: "NPC_LINA",
  },
  {
    code: "A3", name: "氣絕回復", questTitle: "永恆復甦・生死之門",
    category: "support", skillType: "heal", wuxing: "木",
    description: "復活氣絕友方，回復 30% HP",
    powerPercent: 30, mpCost: 30, cooldown: 8, maxLevel: 10, levelUpBonus: 3,
    learnCost: { soulCrystal: 400, items: [{ name: "復活聖徽", count: 1 }] },
    prerequisites: { skills: ["A1"] },
    rarity: "legendary", sortOrder: 21, npcCode: "NPC_MATTHEW",
  },
  {
    code: "A4", name: "潔淨魔法", questTitle: "泉水淨化・驅邪之光",
    category: "support", skillType: "buff", wuxing: "水",
    description: "驅散所有異常狀態",
    powerPercent: 0, mpCost: 15, cooldown: 4, maxLevel: 10, levelUpBonus: 5,
    learnCost: { soulCrystal: 310, items: [{ name: "淨化水晶", count: 3 }] },
    rarity: "rare", sortOrder: 22, npcCode: "NPC_SOPHIA",
  },
  {
    code: "A5", name: "恢復魔法", questTitle: "森林吐息・持續再生",
    category: "support", skillType: "heal", wuxing: "木",
    description: "6 回合持續回復（8%/回合）",
    powerPercent: 8, mpCost: 22, cooldown: 5, maxLevel: 10, levelUpBonus: 2,
    learnCost: { soulCrystal: 340 },
    rarity: "rare", sortOrder: 23, npcCode: "NPC_RENA",
  },
  {
    code: "A6", name: "攻擊吸收", questTitle: "影之吞噬・物理回饋",
    category: "support", skillType: "buff", wuxing: "土",
    description: "將受到的物理傷害轉換為 HP 回覆",
    powerPercent: 0, mpCost: 18, cooldown: 5, maxLevel: 10, levelUpBonus: 5,
    learnCost: { soulCrystal: 360, items: [{ name: "暗影精華", count: 1 }] },
    rarity: "epic", sortOrder: 24, npcCode: "NPC_TALOS",
  },
  {
    code: "A7", name: "魔法吸收", questTitle: "虛空共鳴・魔力回饋",
    category: "support", skillType: "buff", wuxing: "火",
    description: "將受到的魔法傷害轉換為 HP 回覆",
    powerPercent: 0, mpCost: 20, cooldown: 5, maxLevel: 10, levelUpBonus: 5,
    learnCost: { soulCrystal: 380, items: [{ name: "杖碎片", count: 1 }] },
    rarity: "epic", sortOrder: 25, npcCode: "NPC_ALICE",
  },
  {
    code: "A8", name: "明鏡止水", questTitle: "鏡之修行・靜心冥想",
    category: "support", skillType: "heal", wuxing: "水",
    description: "回復 40% HP + 30% MP，但下回合無法行動",
    powerPercent: 40, mpCost: 0, cooldown: 8, maxLevel: 10, levelUpBonus: 3,
    specialMechanic: { skipNextTurn: true, mpRestore: 30 },
    learnCost: { soulCrystal: 420, items: [{ name: "奧義卷軸", count: 1 }] },
    prerequisites: { level: 12 },
    rarity: "legendary", sortOrder: 26, npcCode: "NPC_JINGEN",
  },

  // ─── 特殊功能系 X1-X3 ───
  {
    code: "X1", name: "暗殺", questTitle: "暗影之刃・致命一擊",
    category: "special", skillType: "attack", wuxing: "金",
    description: "500% 物理傷害，無視防禦（需從背後攻擊）",
    powerPercent: 500, mpCost: 25, cooldown: 6, maxLevel: 10, levelUpBonus: 20,
    specialMechanic: { requireBackstab: true },
    learnCost: { soulCrystal: 450, items: [{ name: "暗影龍鱗", count: 1 }] },
    prerequisites: { level: 15, skills: ["P7"] },
    rarity: "legendary", sortOrder: 27, npcCode: "NPC_NIGHTSONG",
  },
  {
    code: "X2", name: "偷竊", questTitle: "盜賊之手・巧取豪奪",
    category: "special", skillType: "utility", wuxing: "木",
    description: "偷取隨機道具或金幣，30% 失敗機率",
    powerPercent: 0, mpCost: 15, cooldown: 5, maxLevel: 10, levelUpBonus: 3,
    specialMechanic: { failRate: 30 },
    learnCost: { soulCrystal: 320, items: [{ name: "黃金之鑰", count: 1 }] },
    rarity: "rare", sortOrder: 28, npcCode: "NPC_LOCKS",
  },
  {
    code: "X3", name: "聖盾", questTitle: "永恆之盾・神聖守護",
    category: "special", skillType: "buff", wuxing: "土",
    description: "3 回合減傷 80%，30% 傷害轉為 HP",
    powerPercent: 0, mpCost: 25, cooldown: 10, maxLevel: 10, levelUpBonus: 5,
    learnCost: { soulCrystal: 500, items: [{ name: "永恆之盾碎片", count: 1 }] },
    prerequisites: { level: 15 },
    rarity: "legendary", sortOrder: 29, npcCode: "NPC_RENARD",
  },

  // ─── 生產系 C1-C3 ───
  {
    code: "C1", name: "採集", questTitle: "大地恩賜・採集入門",
    category: "production", skillType: "production", wuxing: "木",
    description: "在採集點取得素材，Lv5 可進行高級採集",
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    learnCost: { gold: 300 },
    rarity: "common", sortOrder: 30, npcCode: "NPC_GREEN",
  },
  {
    code: "C2", name: "製作", questTitle: "工匠之道・鍛造入門",
    category: "production", skillType: "production", wuxing: "火",
    description: "在工作檯製作道具，Lv5 可製作套裝",
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    learnCost: { gold: 500, items: [{ name: "工匠見習證", count: 1 }] },
    rarity: "common", sortOrder: 31, npcCode: "NPC_HANS",
  },
  {
    code: "C3", name: "鑑定", questTitle: "慧眼識珠・鑑定入門",
    category: "production", skillType: "production", wuxing: "水",
    description: "鑑定未鑑定物品",
    powerPercent: 0, mpCost: 0, cooldown: 0, maxLevel: 10, levelUpBonus: 0,
    learnCost: { gold: 200, items: [{ name: "鑑定見習水晶", count: 5 }] },
    rarity: "common", sortOrder: 32, npcCode: "NPC_MADELINE",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 32 種技能的任務步驟（每個技能 2~4 步 + 最終確認）
// ═══════════════════════════════════════════════════════════════════════

export const QUEST_STEPS = {
  // ─── P1 連擊 ───
  P1: [
    { stepNumber: 1, title: "邂逅連擊導師", dialogue: "你想學連擊？先讓我看看你的基本功。", objective: "前往迷霧城戰士公會大廳找到席拉", location: "迷霧城・戰士公會大廳", objectives: { type: "deliver", conditions: ["與席拉對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "連擊基礎訓練", dialogue: "去訓練場打倒 10 隻木人偶，每次必須連續攻擊。", objective: "在訓練場連續攻擊木人偶 10 次", location: "迷霧城・戰士訓練場", objectives: { type: "kill", targets: [{ name: "木人偶", count: 10 }] }, rewards: { exp: 100, gold: 300 } },
    { stepNumber: 3, title: "連擊實戰測試", dialogue: "最後的考驗——在實戰中展現你的連擊！", objective: "在戰鬥中使用連續攻擊擊敗 3 個敵人", location: "迷霧城・訓練場", objectives: { type: "kill", targets: [{ name: "訓練用魔偶", count: 3 }] }, rewards: { exp: 200, gold: 500 } },
    { stepNumber: 99, title: "習得連擊", dialogue: "不錯，你已經掌握了連擊的精髓。支付 1500 金幣，我就正式傳授給你。", objective: "支付 1500 金幣習得連擊", location: "迷霧城・戰士公會大廳" },
  ],
  // ─── P2 諸刃 ───
  P2: [
    { stepNumber: 1, title: "武器評議塔的邀請", dialogue: "共鳴之刃需要特殊的刃片才能施展。", objective: "前往武器評議塔找到沃克恩", location: "迷霧城・武器評議塔", objectives: { type: "deliver", conditions: ["與沃克恩對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "收集共鳴刃片", dialogue: "去碎影深淵收集 5 片共鳴刃片。", objective: "在碎影深淵收集共鳴刃片 ×5", location: "碎影深淵", objectives: { type: "collect", targets: [{ name: "共鳴刃片", count: 5, dropRate: 0.15 }] }, rewards: { exp: 150, gold: 500 } },
    { stepNumber: 3, title: "諸刃試煉", dialogue: "用這些刃片，展現共鳴之刃的力量！", objective: "使用共鳴刃片擊敗試煉守衛", location: "迷霧城・武器評議塔", objectives: { type: "boss", boss: { name: "試煉守衛", hp: 500, stars: 2 } }, rewards: { exp: 300, gold: 800 } },
    { stepNumber: 99, title: "習得諸刃", dialogue: "你已證明自己配得上共鳴之刃。", objective: "支付 2000 金幣 + 共鳴刃片 ×5 習得諸刃", location: "迷霧城・武器評議塔" },
  ],
  // ─── P3 反擊 ───
  P3: [
    { stepNumber: 1, title: "碎影深淵的女劍士", dialogue: "反擊不是攻擊，而是等待。", objective: "在碎影深淵入口營地找到費蓮娜", location: "碎影深淵・入口營地", objectives: { type: "deliver", conditions: ["與費蓮娜對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "承受攻擊訓練", dialogue: "在不主動攻擊的情況下，承受 20 次攻擊並存活。", objective: "承受 20 次攻擊不死亡", location: "碎影深淵・訓練區", objectives: { type: "survive", conditions: ["承受 20 次攻擊"], timeLimit: 300 }, rewards: { exp: 200, gold: 600 } },
    { stepNumber: 3, title: "反擊之道", dialogue: "現在，用敵人的力量反擊他們！", objective: "在戰鬥中成功反擊 5 次", location: "碎影深淵", objectives: { type: "challenge", conditions: ["成功反擊 5 次"] }, rewards: { exp: 300, items: [{ name: "永恆鋼碎片", count: 1 }] } },
    { stepNumber: 99, title: "習得反擊", dialogue: "你已領悟了反擊的真諦。", objective: "支付 2500 金幣 + 永恆鋼碎片 ×1 習得反擊", location: "碎影深淵・入口營地" },
  ],
  // ─── P4 崩擊 ───
  P4: [
    { stepNumber: 1, title: "地下訓練場的巨人", dialogue: "崩擊是破壞防禦的極致。", objective: "前往試煉之塔地下訓練場找到赫格莫斯", location: "試煉之塔・地下訓練場", objectives: { type: "deliver", conditions: ["與赫格莫斯對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "破甲訓練", dialogue: "擊碎 15 個強化鐵盾。", objective: "破壞強化鐵盾 ×15", location: "試煉之塔・地下訓練場", objectives: { type: "kill", targets: [{ name: "強化鐵盾", count: 15 }] }, rewards: { exp: 200, gold: 500 } },
    { stepNumber: 3, title: "崩擊實戰", dialogue: "面對真正的鐵壁守衛，展現你的崩擊！", objective: "擊敗鐵壁守衛（高防禦 BOSS）", location: "試煉之塔", objectives: { type: "boss", boss: { name: "鐵壁守衛", hp: 800, stars: 3, traits: ["高防禦"] } }, rewards: { exp: 350, items: [{ name: "核心共振碎片", count: 3 }] } },
    { stepNumber: 99, title: "習得崩擊", dialogue: "沒有什麼防禦是不能被打破的。", objective: "支付 2200 金幣 + 核心共振碎片 ×3 習得崩擊", location: "試煉之塔・地下訓練場" },
  ],
  // ─── P5 亂射 ───
  P5: [
    { stepNumber: 1, title: "東門箭塔的守衛", dialogue: "亂射需要精準的控制和廣闊的視野。", objective: "前往迷霧城東門箭塔找到艾拉", location: "迷霧城・東門箭塔", objectives: { type: "deliver", conditions: ["與艾拉對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "散射訓練", dialogue: "在箭塔上射擊 20 個移動靶。", objective: "命中移動靶 ×20", location: "迷霧城・東門箭塔", objectives: { type: "challenge", conditions: ["命中移動靶 20 個"] }, rewards: { exp: 200, gold: 400 } },
    { stepNumber: 3, title: "箭雨風暴", dialogue: "用箭雨覆蓋整個區域！", objective: "使用範圍攻擊同時命中 5 個以上目標", location: "迷霧城外圍", objectives: { type: "challenge", conditions: ["範圍攻擊命中 5+ 目標"] }, rewards: { exp: 300, items: [{ name: "弓弦共鳴珠", count: 1 }] } },
    { stepNumber: 99, title: "習得亂射", dialogue: "你的箭雨已經足以覆蓋戰場。", objective: "支付 1800 金幣 + 弓弦共鳴珠 ×1 習得亂射", location: "迷霧城・東門箭塔" },
  ],
  // ─── P6 乾坤一擲 ───
  P6: [
    { stepNumber: 1, title: "地下競技場的賭徒", dialogue: "乾坤一擲，賭的是命運。", objective: "前往迷霧城地下競技場找到托里戈", location: "迷霧城・地下競技場", objectives: { type: "deliver", conditions: ["與托里戈對話"] }, rewards: { exp: 100 } },
    { stepNumber: 2, title: "賭徒的試煉", dialogue: "在競技場連勝 3 場。", objective: "競技場連勝 3 場", location: "迷霧城・地下競技場", objectives: { type: "challenge", conditions: ["連勝 3 場"] }, rewards: { exp: 250, gold: 800 } },
    { stepNumber: 3, title: "命運之擲", dialogue: "去找工匠漢斯打造命運之刃。", objective: "找漢斯打造命運之刃", location: "迷霧城・工匠街", objectives: { type: "craft", conditions: ["打造命運之刃"] }, rewards: { exp: 200 } },
    { stepNumber: 4, title: "最終賭局", dialogue: "用命運之刃，在最終賭局中證明自己！", objective: "使用命運之刃擊敗競技場冠軍", location: "迷霧城・地下競技場", objectives: { type: "boss", boss: { name: "競技場冠軍", hp: 1000, stars: 4 } }, rewards: { exp: 500, items: [{ name: "命運殘片", count: 1 }] } },
    { stepNumber: 99, title: "習得乾坤一擲", dialogue: "命運眷顧勇者。", objective: "支付 3000 金幣 + 命運殘片 ×1 習得乾坤一擲", location: "迷霧城・地下競技場" },
  ],
  // ─── P7 迅速果斷 ───
  P7: [
    { stepNumber: 1, title: "黑市後巷的暗影", dialogue: "速度就是一切。", objective: "在迷霧城黑市後巷找到暮", location: "迷霧城・黑市後巷", objectives: { type: "deliver", conditions: ["與暮對話"] }, rewards: { exp: 100 } },
    { stepNumber: 2, title: "速度訓練", dialogue: "在 30 秒內擊敗 10 個幻影。", objective: "30 秒內擊敗 10 個幻影", location: "迷霧城・黑市後巷", objectives: { type: "kill", targets: [{ name: "幻影", count: 10 }], timeLimit: 30 }, rewards: { exp: 250, gold: 600 } },
    { stepNumber: 3, title: "先手之道", dialogue: "在每場戰鬥中都搶先攻擊。", objective: "連續 5 場戰鬥都先手攻擊", location: "迷霧城周邊", objectives: { type: "challenge", conditions: ["連續 5 場先手攻擊"] }, rewards: { exp: 350, items: [{ name: "反射結晶", count: 5 }] } },
    { stepNumber: 99, title: "習得迅速果斷", dialogue: "快如閃電，斷如利刃。", objective: "支付 2800 金幣 + 反射結晶 ×5 習得迅速果斷", location: "迷霧城・黑市後巷" },
  ],
  // ─── P8 毒擊 ───
  P8: [
    { stepNumber: 1, title: "荒廢藥房的毒術師", dialogue: "毒，是最溫柔的殺手。", objective: "前往迷霧城荒廢藥房找到維克多", location: "迷霧城・荒廢藥房", objectives: { type: "deliver", conditions: ["與維克多對話"] }, rewards: { exp: 60 } },
    { stepNumber: 2, title: "毒藥調配", dialogue: "收集 5 株解毒草，學習毒的本質。", objective: "收集解毒草 ×5", location: "迷霧城周邊", objectives: { type: "collect", targets: [{ name: "解毒草", count: 5, dropRate: 0.3 }] }, rewards: { exp: 150, gold: 300 } },
    { stepNumber: 3, title: "毒擊實戰", dialogue: "用毒擊擊敗 5 個敵人。", objective: "使用毒擊擊敗 5 個敵人", location: "迷霧城周邊", objectives: { type: "kill", targets: [{ name: "任意敵人", count: 5 }] }, rewards: { exp: 200, gold: 400 } },
    { stepNumber: 99, title: "習得毒擊", dialogue: "毒已入骨，無藥可救。", objective: "支付 1200 金幣 + 解毒草 ×5 習得毒擊", location: "迷霧城・荒廢藥房" },
  ],
  // ─── M1 火焰魔法 ───
  M1: [
    { stepNumber: 1, title: "試煉廣場的火焰導師", dialogue: "火焰是最基礎的魔法，也是最危險的。", objective: "在初界試煉廣場找到艾爾文・赤焰", location: "初界・試煉廣場", objectives: { type: "deliver", conditions: ["與艾爾文・赤焰對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "火焰冥想", dialogue: "感受火焰的溫度，與之共鳴。", objective: "完成火焰冥想訓練", location: "初界・試煉廣場", objectives: { type: "challenge", conditions: ["完成冥想訓練"] }, rewards: { exp: 100 } },
    { stepNumber: 3, title: "點燃 10 根蠟燭", dialogue: "用你的魔力點燃這些蠟燭。", objective: "點燃 10 根蠟燭", location: "初界・試煉廣場", objectives: { type: "challenge", conditions: ["點燃 10 根蠟燭"] }, rewards: { exp: 150, gold: 200 } },
    { stepNumber: 4, title: "火焰實戰", dialogue: "用火焰魔法擊敗冰霜史萊姆。", objective: "擊敗冰霜史萊姆 ×3", location: "初界", objectives: { type: "kill", targets: [{ name: "冰霜史萊姆", count: 3 }] }, rewards: { exp: 200, gold: 300 } },
    { stepNumber: 99, title: "習得火焰魔法", dialogue: "火焰已在你心中燃燒。", objective: "支付 300 魂晶習得火焰魔法", location: "初界・試煉廣場" },
  ],
  // ─── M2 冰凍魔法 ───
  M2: [
    { stepNumber: 1, title: "霜語小屋的冰霜魔女", dialogue: "冰是靜止的水，也是凝固的意志。", objective: "在初界霜語小屋找到菲莉亞", location: "初界・霜語小屋", objectives: { type: "deliver", conditions: ["與菲莉亞對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "收集暖陽石", dialogue: "帶回 3 顆暖陽石，證明你能抵禦寒冷。", objective: "收集暖陽石 ×3", location: "初界・冰原", objectives: { type: "collect", targets: [{ name: "暖陽石", count: 3, dropRate: 0.2 }] }, rewards: { exp: 150 } },
    { stepNumber: 3, title: "冰封訓練", dialogue: "凍結 5 個水元素。", objective: "凍結水元素 ×5", location: "初界・霜語小屋", objectives: { type: "kill", targets: [{ name: "水元素", count: 5 }] }, rewards: { exp: 200, gold: 300 } },
    { stepNumber: 4, title: "冰凍實戰", dialogue: "用冰凍魔法擊敗火焰精靈。", objective: "擊敗火焰精靈 ×3", location: "初界", objectives: { type: "kill", targets: [{ name: "火焰精靈", count: 3 }] }, rewards: { exp: 250, gold: 400 } },
    { stepNumber: 99, title: "習得冰凍魔法", dialogue: "冰霜已聽從你的召喚。", objective: "支付 350 魂晶 + 暖陽石 ×3 習得冰凍魔法", location: "初界・霜語小屋" },
  ],
  // ─── M3 風刃魔法 ───
  M3: [
    { stepNumber: 1, title: "迷跡驛站的旅人", dialogue: "風無形無影，卻能切割一切。", objective: "在初界迷跡驛站找到嵐德", location: "初界・迷跡驛站", objectives: { type: "deliver", conditions: ["與嵐德對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "風之感應", dialogue: "在風中站立 1 分鐘，感受風的流動。", objective: "完成風之感應訓練", location: "初界・迷跡驛站", objectives: { type: "challenge", conditions: ["完成風之感應"] }, rewards: { exp: 100 } },
    { stepNumber: 3, title: "風刃切割", dialogue: "用風刃切斷 10 根繩索。", objective: "切斷繩索 ×10", location: "初界・迷跡驛站", objectives: { type: "challenge", conditions: ["切斷 10 根繩索"] }, rewards: { exp: 150, gold: 200 } },
    { stepNumber: 4, title: "風刃實戰", dialogue: "用風刃魔法擊敗土元素。", objective: "擊敗土元素 ×3", location: "初界", objectives: { type: "kill", targets: [{ name: "土元素", count: 3 }] }, rewards: { exp: 200, gold: 300 } },
    { stepNumber: 99, title: "習得風刃魔法", dialogue: "風已成為你的利刃。", objective: "支付 250 魂晶習得風刃魔法", location: "初界・迷跡驛站" },
  ],
  // ─── M4 隕石魔法 ───
  M4: [
    { stepNumber: 1, title: "墜星高地的召喚師", dialogue: "隕石是天地之怒的具現。", objective: "在中界墜星高地找到星見・隕晨", location: "中界・墜星高地", objectives: { type: "deliver", conditions: ["與星見・隕晨對話"] }, rewards: { exp: 100 } },
    { stepNumber: 2, title: "星辰共鳴", dialogue: "在墜星高地收集 5 顆星辰碎片。", objective: "收集星辰碎片 ×5", location: "中界・墜星高地", objectives: { type: "collect", targets: [{ name: "星辰碎片", count: 5, dropRate: 0.1 }] }, rewards: { exp: 250 } },
    { stepNumber: 3, title: "隕石召喚訓練", dialogue: "召喚小型隕石擊中 3 個目標。", objective: "召喚隕石命中 3 個目標", location: "中界・墜星高地", objectives: { type: "challenge", conditions: ["隕石命中 3 個目標"] }, rewards: { exp: 300, gold: 500 } },
    { stepNumber: 4, title: "天降審判", dialogue: "用隕石魔法擊敗墜星守衛。", objective: "擊敗墜星守衛", location: "中界・墜星高地", objectives: { type: "boss", boss: { name: "墜星守衛", hp: 1200, stars: 4 } }, rewards: { exp: 500, gold: 1000 } },
    { stepNumber: 99, title: "習得隕石魔法", dialogue: "天地之力已聽從你的號令。", objective: "支付 500 魂晶 + 中界聲望 50 習得隕石魔法", location: "中界・墜星高地" },
  ],
  // ─── S1 昏睡魔法 ───
  S1: [
    { stepNumber: 1, title: "學術廢墟的催眠學者", dialogue: "睡眠是最溫柔的控制。", objective: "在初界學術廢墟找到哈拉爾德", location: "初界・學術廢墟", objectives: { type: "deliver", conditions: ["與哈拉爾德對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "催眠訓練", dialogue: "收集 3 株清醒草，了解睡眠的本質。", objective: "收集清醒草 ×3", location: "初界", objectives: { type: "collect", targets: [{ name: "清醒草", count: 3, dropRate: 0.25 }] }, rewards: { exp: 150 } },
    { stepNumber: 3, title: "昏睡實戰", dialogue: "用昏睡魔法催眠 5 個敵人。", objective: "催眠敵人 ×5", location: "初界", objectives: { type: "challenge", conditions: ["催眠 5 個敵人"] }, rewards: { exp: 200, gold: 300 } },
    { stepNumber: 99, title: "習得昏睡魔法", dialogue: "沉睡吧，在夢中忘記一切。", objective: "支付 280 魂晶 + 清醒草 ×3 習得昏睡魔法", location: "初界・學術廢墟" },
  ],
  // ─── S2 石化魔法 ───
  S2: [
    { stepNumber: 1, title: "岩骨村的術士", dialogue: "石化是永恆的靜止。", objective: "在初界岩骨村找到格雷", location: "初界・岩骨村", objectives: { type: "deliver", conditions: ["與格雷對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "岩石共鳴", dialogue: "在岩骨村的石陣中冥想。", objective: "完成石陣冥想", location: "初界・岩骨村", objectives: { type: "challenge", conditions: ["完成石陣冥想"] }, rewards: { exp: 100 } },
    { stepNumber: 3, title: "石化訓練", dialogue: "石化 5 隻石蜥蜴。", objective: "石化石蜥蜴 ×5", location: "初界・岩骨村", objectives: { type: "kill", targets: [{ name: "石蜥蜴", count: 5 }] }, rewards: { exp: 200, gold: 300 } },
    { stepNumber: 4, title: "石化實戰", dialogue: "擊敗岩石巨人。", objective: "擊敗岩石巨人", location: "初界", objectives: { type: "boss", boss: { name: "岩石巨人", hp: 600, stars: 2 } }, rewards: { exp: 300, gold: 500 } },
    { stepNumber: 99, title: "習得石化魔法", dialogue: "萬物皆可化為石。", objective: "支付 320 魂晶習得石化魔法", location: "初界・岩骨村" },
  ],
  // ─── S3 混亂魔法 ───
  S3: [
    { stepNumber: 1, title: "混沌實驗室的瘋狂科學家", dialogue: "混亂是秩序的另一面。", objective: "在中界混沌實驗室找到尼克", location: "中界・混沌實驗室", objectives: { type: "deliver", conditions: ["與尼克對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "混亂試劑", dialogue: "收集秩序護符，了解混亂的對立面。", objective: "收集秩序護符 ×1", location: "中界", objectives: { type: "collect", targets: [{ name: "秩序護符", count: 1, dropRate: 0.05 }] }, rewards: { exp: 200 } },
    { stepNumber: 3, title: "混亂實戰", dialogue: "讓 5 個敵人陷入混亂。", objective: "使 5 個敵人混亂", location: "中界", objectives: { type: "challenge", conditions: ["使 5 個敵人混亂"] }, rewards: { exp: 300, gold: 500 } },
    { stepNumber: 99, title: "習得混亂魔法", dialogue: "在混亂中，你才能看清真相。", objective: "支付 400 魂晶 + 秩序護符 ×1 習得混亂魔法", location: "中界・混沌實驗室" },
  ],
  // ─── S4 中毒魔法 ───
  S4: [
    { stepNumber: 1, title: "濕毒沼澤的女巫", dialogue: "毒是大自然的武器。", objective: "在初界濕毒沼澤找到米莉亞", location: "初界・濕毒沼澤", objectives: { type: "deliver", conditions: ["與米莉亞對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "毒素收集", dialogue: "收集 5 株解毒草。", objective: "收集解毒草 ×5", location: "初界・濕毒沼澤", objectives: { type: "collect", targets: [{ name: "解毒草", count: 5, dropRate: 0.3 }] }, rewards: { exp: 100 } },
    { stepNumber: 3, title: "毒霧調配", dialogue: "學習調配毒霧。", objective: "完成毒霧調配訓練", location: "初界・濕毒沼澤", objectives: { type: "challenge", conditions: ["完成毒霧調配"] }, rewards: { exp: 150 } },
    { stepNumber: 4, title: "中毒實戰", dialogue: "用中毒魔法擊敗沼澤蛇王。", objective: "擊敗沼澤蛇王", location: "初界・濕毒沼澤", objectives: { type: "boss", boss: { name: "沼澤蛇王", hp: 400, stars: 2 } }, rewards: { exp: 250, gold: 400 } },
    { stepNumber: 99, title: "習得中毒魔法", dialogue: "毒已融入你的魔力。", objective: "支付 260 魂晶 + 解毒草 ×5 習得中毒魔法", location: "初界・濕毒沼澤" },
  ],
  // ─── S5 遺忘魔法 ───
  S5: [
    { stepNumber: 1, title: "回憶沙漠的幽靈", dialogue: "遺忘是最殘酷的懲罰。", objective: "在初界回憶沙漠找到艾爾文（幽靈）", location: "初界・回憶沙漠", objectives: { type: "deliver", conditions: ["與艾爾文（幽靈）對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "記憶碎片", dialogue: "收集古老忘卻之證。", objective: "收集古老忘卻之證 ×1", location: "初界・回憶沙漠", objectives: { type: "collect", targets: [{ name: "古老忘卻之證", count: 1, dropRate: 0.03 }] }, rewards: { exp: 200 } },
    { stepNumber: 3, title: "遺忘訓練", dialogue: "讓 3 個敵人忘記自己的技能。", objective: "使 3 個敵人遺忘技能", location: "初界", objectives: { type: "challenge", conditions: ["使 3 個敵人遺忘技能"] }, rewards: { exp: 250, gold: 400 } },
    { stepNumber: 4, title: "遺忘實戰", dialogue: "擊敗記憶守護者。", objective: "擊敗記憶守護者", location: "初界・回憶沙漠", objectives: { type: "boss", boss: { name: "記憶守護者", hp: 700, stars: 3 } }, rewards: { exp: 350, gold: 600 } },
    { stepNumber: 99, title: "習得遺忘魔法", dialogue: "忘記吧，一切都會過去。", objective: "支付 290 魂晶 + 古老忘卻之證 ×1 習得遺忘魔法", location: "初界・回憶沙漠" },
  ],
  // ─── S6 酒醉魔法 ───
  S6: [
    { stepNumber: 1, title: "葡萄酒莊的醉拳大師", dialogue: "醉了，反而看得更清楚。", objective: "在初界葡萄酒莊找到卡洛斯", location: "初界・葡萄酒莊", objectives: { type: "deliver", conditions: ["與卡洛斯對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "葡萄收集", dialogue: "收集 10 顆熟透葡萄。", objective: "收集熟透葡萄 ×10", location: "初界・葡萄酒莊", objectives: { type: "collect", targets: [{ name: "熟透葡萄", count: 10, dropRate: 0.5 }] }, rewards: { exp: 100, gold: 200 } },
    { stepNumber: 99, title: "習得酒醉魔法", dialogue: "乾杯！", objective: "支付 300 魂晶 + 熟透葡萄 ×10 習得酒醉魔法", location: "初界・葡萄酒莊" },
  ],
  // ─── A1 補血魔法 ───
  A1: [
    { stepNumber: 1, title: "聖光修道院的修士", dialogue: "治癒是最崇高的魔法。", objective: "在初界聖光修道院找到艾文", location: "初界・聖光修道院", objectives: { type: "deliver", conditions: ["與艾文對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "聖光冥想", dialogue: "在修道院中冥想，感受聖光。", objective: "完成聖光冥想", location: "初界・聖光修道院", objectives: { type: "challenge", conditions: ["完成聖光冥想"] }, rewards: { exp: 100 } },
    { stepNumber: 3, title: "治癒實踐", dialogue: "治癒 5 個受傷的旅人。", objective: "治癒受傷旅人 ×5", location: "初界", objectives: { type: "challenge", conditions: ["治癒 5 個受傷旅人"] }, rewards: { exp: 200, gold: 300 } },
    { stepNumber: 99, title: "習得補血魔法", dialogue: "聖光與你同在。", objective: "支付 280 魂晶 + 500 金幣習得補血魔法", location: "初界・聖光修道院" },
  ],
  // ─── A2 強效補血魔法 ───
  A2: [
    { stepNumber: 1, title: "修道院二層的高階治癒師", dialogue: "更強的治癒需要更深的理解。", objective: "在聖光修道院二層找到琳娜", location: "初界・聖光修道院二層", objectives: { type: "deliver", conditions: ["與琳娜對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "湧泉之心", dialogue: "在聖泉中找到湧泉之心。", objective: "取得湧泉之心 ×1", location: "初界・聖光修道院", objectives: { type: "collect", targets: [{ name: "湧泉之心", count: 1, dropRate: 0.08 }] }, rewards: { exp: 200 } },
    { stepNumber: 99, title: "習得強效補血魔法", dialogue: "你的治癒之力已昇華。", objective: "支付 350 魂晶 + 1000 金幣 + 湧泉之心 ×1 習得強效補血魔法", location: "初界・聖光修道院二層" },
  ],
  // ─── A3 氣絕回復 ───
  A3: [
    { stepNumber: 1, title: "永恆教堂的復活祭司", dialogue: "生與死的界線，比你想像的更薄。", objective: "在中界永恆教堂找到馬修", location: "中界・永恆教堂", objectives: { type: "deliver", conditions: ["與馬修對話"] }, rewards: { exp: 100 } },
    { stepNumber: 2, title: "復活聖徽", dialogue: "在教堂深處找到復活聖徽。", objective: "取得復活聖徽 ×1", location: "中界・永恆教堂", objectives: { type: "collect", targets: [{ name: "復活聖徽", count: 1, dropRate: 0.05 }] }, rewards: { exp: 300 } },
    { stepNumber: 3, title: "復活試煉", dialogue: "在模擬戰鬥中復活倒下的隊友。", objective: "復活倒下的隊友 ×3", location: "中界・永恆教堂", objectives: { type: "challenge", conditions: ["復活隊友 3 次"] }, rewards: { exp: 400, gold: 800 } },
    { stepNumber: 99, title: "習得氣絕回復", dialogue: "你已掌握了生死之門的鑰匙。", objective: "支付 400 魂晶 + 復活聖徽 ×1 習得氣絕回復", location: "中界・永恆教堂" },
  ],
  // ─── A4 潔淨魔法 ───
  A4: [
    { stepNumber: 1, title: "泉水聖所的淨化聖女", dialogue: "淨化是驅散黑暗的光。", objective: "在初界泉水聖所找到索菲亞", location: "初界・泉水聖所", objectives: { type: "deliver", conditions: ["與索菲亞對話"] }, rewards: { exp: 50 } },
    { stepNumber: 2, title: "淨化水晶", dialogue: "收集 3 顆淨化水晶。", objective: "收集淨化水晶 ×3", location: "初界", objectives: { type: "collect", targets: [{ name: "淨化水晶", count: 3, dropRate: 0.15 }] }, rewards: { exp: 150 } },
    { stepNumber: 3, title: "淨化實踐", dialogue: "驅散 5 個被詛咒的生物身上的異常狀態。", objective: "淨化異常狀態 ×5", location: "初界", objectives: { type: "challenge", conditions: ["淨化 5 個異常狀態"] }, rewards: { exp: 250, gold: 400 } },
    { stepNumber: 99, title: "習得潔淨魔法", dialogue: "光明將驅散一切黑暗。", objective: "支付 310 魂晶 + 淨化水晶 ×3 習得潔淨魔法", location: "初界・泉水聖所" },
  ],
  // ─── A5 恢復魔法 ───
  A5: [
    { stepNumber: 1, title: "古老森林的治癒者", dialogue: "森林的生命力是無窮的。", objective: "在中界古老森林找到蓮娜", location: "中界・古老森林", objectives: { type: "deliver", conditions: ["與蓮娜對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "森林共鳴", dialogue: "在古老森林中冥想，感受生命之力。", objective: "完成森林冥想", location: "中界・古老森林", objectives: { type: "challenge", conditions: ["完成森林冥想"] }, rewards: { exp: 150 } },
    { stepNumber: 3, title: "持續治癒", dialogue: "在戰鬥中維持持續治癒 3 次。", objective: "使用持續治癒 ×3", location: "中界", objectives: { type: "challenge", conditions: ["使用持續治癒 3 次"] }, rewards: { exp: 250, gold: 400 } },
    { stepNumber: 99, title: "習得恢復魔法", dialogue: "生命之力將持續流淌。", objective: "支付 340 魂晶習得恢復魔法", location: "中界・古老森林" },
  ],
  // ─── A6 攻擊吸收 ───
  A6: [
    { stepNumber: 1, title: "影之山谷的吸收者", dialogue: "將敵人的力量化為己用。", objective: "在中界影之山谷找到塔洛斯", location: "中界・影之山谷", objectives: { type: "deliver", conditions: ["與塔洛斯對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "吸收訓練", dialogue: "在戰鬥中吸收 500 點物理傷害。", objective: "吸收 500 點物理傷害", location: "中界", objectives: { type: "challenge", conditions: ["吸收 500 點物理傷害"] }, rewards: { exp: 250, items: [{ name: "暗影精華", count: 1 }] } },
    { stepNumber: 99, title: "習得攻擊吸收", dialogue: "敵人的攻擊就是你的養分。", objective: "支付 360 魂晶 + 暗影精華 ×1 習得攻擊吸收", location: "中界・影之山谷" },
  ],
  // ─── A7 魔法吸收 ───
  A7: [
    { stepNumber: 1, title: "虛空法塔的法師", dialogue: "魔力是可以被吸收的。", objective: "在中界虛空法塔找到艾莉絲", location: "中界・虛空法塔", objectives: { type: "deliver", conditions: ["與艾莉絲對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "魔力吸收訓練", dialogue: "在戰鬥中吸收 300 點魔法傷害。", objective: "吸收 300 點魔法傷害", location: "中界", objectives: { type: "challenge", conditions: ["吸收 300 點魔法傷害"] }, rewards: { exp: 250 } },
    { stepNumber: 3, title: "虛空共鳴", dialogue: "擊敗虛空法塔的守護者。", objective: "擊敗虛空守護者", location: "中界・虛空法塔", objectives: { type: "boss", boss: { name: "虛空守護者", hp: 800, stars: 3 } }, rewards: { exp: 350, items: [{ name: "杖碎片", count: 1 }] } },
    { stepNumber: 99, title: "習得魔法吸收", dialogue: "魔力已成為你的盾牌。", objective: "支付 380 魂晶 + 杖碎片 ×1 習得魔法吸收", location: "中界・虛空法塔" },
  ],
  // ─── A8 明鏡止水 ───
  A8: [
    { stepNumber: 1, title: "鏡之修行場的修行者", dialogue: "靜心，方能見真我。", objective: "在中界鏡之修行場找到靜源", location: "中界・鏡之修行場", objectives: { type: "deliver", conditions: ["與靜源對話"] }, rewards: { exp: 100 } },
    { stepNumber: 2, title: "鏡之冥想", dialogue: "在鏡之修行場冥想 3 天。", objective: "完成 3 天冥想", location: "中界・鏡之修行場", objectives: { type: "challenge", conditions: ["完成 3 天冥想"] }, rewards: { exp: 200 } },
    { stepNumber: 3, title: "止水之道", dialogue: "在戰鬥中不攻擊，只防禦和治癒，存活 10 回合。", objective: "存活 10 回合（僅防禦和治癒）", location: "中界", objectives: { type: "survive", conditions: ["存活 10 回合"], timeLimit: 600 }, rewards: { exp: 350, items: [{ name: "奧義卷軸", count: 1 }] } },
    { stepNumber: 99, title: "習得明鏡止水", dialogue: "心如止水，萬物皆映。", objective: "支付 420 魂晶 + 奧義卷軸 ×1 習得明鏡止水", location: "中界・鏡之修行場" },
  ],
  // ─── X1 暗殺 ───
  X1: [
    { stepNumber: 1, title: "暗影公會的大師", dialogue: "暗殺是藝術，不是暴力。", objective: "在中界暗影公會找到夜歌", location: "中界・暗影公會", objectives: { type: "deliver", conditions: ["與夜歌對話"] }, rewards: { exp: 100 } },
    { stepNumber: 2, title: "暗影潛行", dialogue: "在不被發現的情況下潛入暗影公會深處。", objective: "潛入暗影公會深處", location: "中界・暗影公會", objectives: { type: "challenge", conditions: ["不被發現潛入深處"] }, rewards: { exp: 300 } },
    { stepNumber: 3, title: "致命一擊", dialogue: "從背後一擊擊敗暗影傀儡。", objective: "背後一擊擊敗暗影傀儡 ×5", location: "中界・暗影公會", objectives: { type: "kill", targets: [{ name: "暗影傀儡", count: 5 }] }, rewards: { exp: 400, items: [{ name: "暗影龍鱗", count: 1 }] } },
    { stepNumber: 99, title: "習得暗殺", dialogue: "在黑暗中，你就是死神。", objective: "支付 450 魂晶 + 暗影龍鱗 ×1 習得暗殺", location: "中界・暗影公會" },
  ],
  // ─── X2 偷竊 ───
  X2: [
    { stepNumber: 1, title: "盜賊公會的首領", dialogue: "偷竊是一門技術。", objective: "在迷霧城盜賊公會找到洛克斯", location: "初界・迷霧城盜賊公會", objectives: { type: "deliver", conditions: ["與洛克斯對話"] }, rewards: { exp: 80 } },
    { stepNumber: 2, title: "扒手訓練", dialogue: "在市場中成功扒竊 5 次。", objective: "成功扒竊 ×5", location: "迷霧城・市場", objectives: { type: "challenge", conditions: ["成功扒竊 5 次"] }, rewards: { exp: 200, gold: 500 } },
    { stepNumber: 3, title: "黃金之鑰", dialogue: "從守衛身上偷取黃金之鑰。", objective: "取得黃金之鑰 ×1", location: "迷霧城", objectives: { type: "collect", targets: [{ name: "黃金之鑰", count: 1, dropRate: 0.1 }] }, rewards: { exp: 250 } },
    { stepNumber: 99, title: "習得偷竊", dialogue: "你的手比風還快。", objective: "支付 320 魂晶 + 黃金之鑰 ×1 習得偷竊", location: "初界・迷霧城盜賊公會" },
  ],
  // ─── X3 聖盾 ───
  X3: [
    { stepNumber: 1, title: "永恆殿堂的聖盾騎士", dialogue: "聖盾是信仰的具現。", objective: "在中界永恆殿堂找到雷納德", location: "中界・永恆殿堂", objectives: { type: "deliver", conditions: ["與雷納德對話"] }, rewards: { exp: 100 } },
    { stepNumber: 2, title: "信仰試煉", dialogue: "在永恆殿堂的試煉中存活。", objective: "通過信仰試煉", location: "中界・永恆殿堂", objectives: { type: "survive", conditions: ["通過信仰試煉"], timeLimit: 300 }, rewards: { exp: 300 } },
    { stepNumber: 3, title: "聖盾碎片", dialogue: "在殿堂深處找到永恆之盾碎片。", objective: "取得永恆之盾碎片 ×1", location: "中界・永恆殿堂", objectives: { type: "collect", targets: [{ name: "永恆之盾碎片", count: 1, dropRate: 0.05 }] }, rewards: { exp: 400, gold: 1000 } },
    { stepNumber: 99, title: "習得聖盾", dialogue: "永恆之盾將守護你和你的同伴。", objective: "支付 500 魂晶 + 永恆之盾碎片 ×1 習得聖盾", location: "中界・永恆殿堂" },
  ],
  // ─── C1 採集 ───
  C1: [
    { stepNumber: 1, title: "採集者工會的會長", dialogue: "大地的恩賜，需要用心去感受。", objective: "在迷霧城採集者工會找到格林", location: "初界・迷霧城採集者工會", objectives: { type: "deliver", conditions: ["與格林對話"] }, rewards: { exp: 30 } },
    { stepNumber: 2, title: "基礎採集", dialogue: "在野外採集 10 個素材。", objective: "採集素材 ×10", location: "初界", objectives: { type: "collect", targets: [{ name: "野草", count: 10, dropRate: 0.8 }] }, rewards: { exp: 80, gold: 100 } },
    { stepNumber: 3, title: "採集考核", dialogue: "找到一株稀有草藥。", objective: "採集稀有草藥 ×1", location: "初界", objectives: { type: "collect", targets: [{ name: "稀有草藥", count: 1, dropRate: 0.1 }] }, rewards: { exp: 150, gold: 200 } },
    { stepNumber: 99, title: "習得採集", dialogue: "你已成為合格的採集者。", objective: "支付 300 金幣習得採集", location: "初界・迷霧城採集者工會" },
  ],
  // ─── C2 製作 ───
  C2: [
    { stepNumber: 1, title: "工匠街的大師", dialogue: "工匠之道，始於一錘一鍛。", objective: "在迷霧城工匠街找到漢斯", location: "初界・迷霧城工匠街", objectives: { type: "deliver", conditions: ["與漢斯對話"] }, rewards: { exp: 30 } },
    { stepNumber: 2, title: "工匠見習", dialogue: "製作 5 個基礎道具。", objective: "製作基礎道具 ×5", location: "初界・迷霧城工匠街", objectives: { type: "craft", conditions: ["製作 5 個基礎道具"] }, rewards: { exp: 100, gold: 200 } },
    { stepNumber: 3, title: "工匠考核", dialogue: "製作一把合格的鐵劍。", objective: "製作鐵劍 ×1", location: "初界・迷霧城工匠街", objectives: { type: "craft", conditions: ["製作鐵劍"] }, rewards: { exp: 200, items: [{ name: "工匠見習證", count: 1 }] } },
    { stepNumber: 99, title: "習得製作", dialogue: "你已成為合格的工匠。", objective: "支付 500 金幣 + 工匠見習證 ×1 習得製作", location: "初界・迷霧城工匠街" },
  ],
  // ─── C3 鑑定 ───
  C3: [
    { stepNumber: 1, title: "鑑定商店的鑑定師", dialogue: "慧眼識珠，方能辨別真偽。", objective: "在迷霧城鑑定商店找到瑪德琳", location: "初界・迷霧城鑑定商店", objectives: { type: "deliver", conditions: ["與瑪德琳對話"] }, rewards: { exp: 30 } },
    { stepNumber: 2, title: "鑑定基礎", dialogue: "收集 5 顆鑑定見習水晶。", objective: "收集鑑定見習水晶 ×5", location: "初界", objectives: { type: "collect", targets: [{ name: "鑑定見習水晶", count: 5, dropRate: 0.2 }] }, rewards: { exp: 80 } },
    { stepNumber: 3, title: "鑑定考核", dialogue: "鑑定 3 個未鑑定物品。", objective: "鑑定物品 ×3", location: "初界・迷霧城鑑定商店", objectives: { type: "challenge", conditions: ["鑑定 3 個物品"] }, rewards: { exp: 150, gold: 200 } },
    { stepNumber: 99, title: "習得鑑定", dialogue: "你的眼睛已能看穿一切。", objective: "支付 200 金幣 + 鑑定見習水晶 ×5 習得鑑定", location: "初界・迷霧城鑑定商店" },
  ],
};
