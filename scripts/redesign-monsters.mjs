/**
 * 魔物圖鑑全面重設計腳本
 * 
 * 規則：
 * 1. 五行分佈改為整十分配（5:5/6:4/7:3/8:2/9:1/10:0），總和 100
 * 2. 主屬性佔最高比例，副屬性按種族/稀有度分配
 * 3. 抗性跟隨五行屬性（史詩以下）
 * 4. 五行比例平衡（每屬性約 40 隻）
 * 5. 種族多樣化（10 種種族均勻分配）
 * 6. 捕捉率按稀有度設定
 */

// ─── 五行分配模板 ───
// 格式：[主屬性%, 副屬性%, 其他3個屬性各佔%]
// 總和必須 = 100，且只用 10 的倍數
const WUXING_TEMPLATES = {
  // 純屬性型（10:0）- 用於 legendary/boss
  pure: (main) => makeWuxing(main, 100, 0, 0, 0, 0),
  
  // 極端型（9:1）- 用於 epic
  extreme: (main, sub) => makeWuxing2(main, 90, sub, 10),
  
  // 強勢型（8:2）- 用於 elite/epic
  strong: (main, sub) => makeWuxing2(main, 80, sub, 20),
  
  // 偏重型（7:3）- 用於 rare/elite
  heavy: (main, sub) => makeWuxing2(main, 70, sub, 30),
  
  // 傾斜型（6:4）- 用於 common/rare
  lean: (main, sub) => makeWuxing2(main, 60, sub, 40),
  
  // 均衡型（5:5）- 用於 common
  balanced: (main, sub) => makeWuxing2(main, 50, sub, 50),
  
  // 三分型（6:2:2）- 用於 rare
  triple: (main, sub1, sub2) => makeWuxing3(main, 60, sub1, 20, sub2, 20),
  
  // 三分型（7:2:1）- 用於 elite
  tripleHeavy: (main, sub1, sub2) => makeWuxing3(main, 70, sub1, 20, sub2, 10),
  
  // 四分型（5:2:2:1）- 用於 common
  quad: (main, sub1, sub2, sub3) => makeWuxing4(main, 50, sub1, 20, sub2, 20, sub3, 10),
};

// 五行名稱
const ELEMENTS = ['木', '火', '土', '金', '水'];

// 五行相生關係：木→火→土→金→水→木
const WUXING_GENERATE = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
// 五行相剋關係：木→土→水→火→金→木
const WUXING_OVERCOME = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

// 10 種種族
const SPECIES_LIST = [
  'humanoid', 'beast', 'plant', 'undead', 'dragon',
  'flying', 'insect', 'special', 'metal', 'demon'
];

// 種族中文名
const SPECIES_NAMES = {
  humanoid: '人型系', beast: '靈獸系', plant: '植物系', undead: '亡魂系', dragon: '龍種系',
  flying: '飛行系', insect: '蟲類系', special: '天命系', metal: '金屬系', demon: '妖化系'
};

// 種族與五行的自然親和
const SPECIES_WUXING_AFFINITY = {
  humanoid: ['金', '火'],
  beast: ['木', '土'],
  plant: ['木', '水'],
  undead: ['水', '金'],
  dragon: ['火', '土'],
  flying: ['金', '木'],
  insect: ['木', '土'],
  special: ['水', '火'],
  metal: ['金', '土'],
  demon: ['火', '水'],
};

// 稀有度對應的捕捉設定
const CAPTURE_BY_RARITY = {
  common:    { capturable: 1, rateRange: [30, 45] },
  rare:      { capturable: 1, rateRange: [20, 30] },
  elite:     { capturable: 1, rateRange: [12, 20] },
  epic:      { capturable: 1, rateRange: [5, 12] },
  legendary: { capturable: 0, rateRange: [0, 3] },  // Boss 預設不可捕捉
};

// 稀有度對應的五行分配模式
const RARITY_WUXING_PATTERNS = {
  common:    ['balanced', 'lean', 'quad'],
  rare:      ['lean', 'heavy', 'triple'],
  elite:     ['heavy', 'strong', 'tripleHeavy'],
  epic:      ['strong', 'extreme'],
  legendary: ['extreme', 'pure'],
};

function makeWuxing(main, mainVal, ...rest) {
  const result = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  result[main] = mainVal;
  const others = ELEMENTS.filter(e => e !== main);
  others.forEach((e, i) => { result[e] = rest[i] || 0; });
  return result;
}

function makeWuxing2(main, mainVal, sub, subVal) {
  const result = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  result[main] = mainVal;
  result[sub] = subVal;
  return result;
}

function makeWuxing3(main, mainVal, sub1, sub1Val, sub2, sub2Val) {
  const result = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  result[main] = mainVal;
  result[sub1] = sub1Val;
  result[sub2] = sub2Val;
  return result;
}

function makeWuxing4(main, mainVal, sub1, sub1Val, sub2, sub2Val, sub3, sub3Val) {
  const result = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  result[main] = mainVal;
  result[sub1] = sub1Val;
  result[sub2] = sub2Val;
  result[sub3] = sub3Val;
  return result;
}

// 根據五行分佈計算抗性（史詩以下）
function calcResistFromWuxing(wuxingDist, rarity) {
  // 史詩以上保留原始抗性設計
  if (rarity === 'epic' || rarity === 'legendary') {
    // 史詩/傳說：主屬性高抗，被剋屬性低抗
    const mainElement = Object.entries(wuxingDist).sort((a, b) => b[1] - a[1])[0][0];
    const overcomeBy = Object.entries(WUXING_OVERCOME).find(([k, v]) => v === mainElement)?.[0] || '木';
    const resist = {};
    for (const el of ELEMENTS) {
      if (el === mainElement) resist[el] = rarity === 'legendary' ? 50 : 40;
      else if (el === overcomeBy) resist[el] = rarity === 'legendary' ? -20 : -10;
      else resist[el] = Math.round(wuxingDist[el] * 0.3);
    }
    return resist;
  }
  
  // 一般/稀有/精英：抗性 = 五行百分比 × 係數
  const multiplier = { common: 0.35, rare: 0.4, elite: 0.45 };
  const m = multiplier[rarity] || 0.35;
  const resist = {};
  for (const el of ELEMENTS) {
    resist[el] = Math.round(wuxingDist[el] * m);
  }
  return resist;
}

// 選擇副屬性（基於種族親和和五行相生）
function pickSubElement(mainElement, species) {
  const affinity = SPECIES_WUXING_AFFINITY[species] || ['木', '火'];
  // 優先選種族親和中非主屬性的
  const affinitySubs = affinity.filter(e => e !== mainElement);
  if (affinitySubs.length > 0) return affinitySubs[0];
  // 否則選相生屬性
  return WUXING_GENERATE[mainElement];
}

function pickSubElements(mainElement, species) {
  const affinity = SPECIES_WUXING_AFFINITY[species] || ['木', '火'];
  const candidates = ELEMENTS.filter(e => e !== mainElement);
  // 排序：種族親和 > 相生 > 其他
  candidates.sort((a, b) => {
    const aScore = affinity.includes(a) ? 2 : (WUXING_GENERATE[mainElement] === a ? 1 : 0);
    const bScore = affinity.includes(b) ? 2 : (WUXING_GENERATE[mainElement] === b ? 1 : 0);
    return bScore - aScore;
  });
  return candidates;
}

// 為單個魔物生成五行分佈
function generateWuxingForMonster(mainElement, rarity, species, index) {
  const patterns = RARITY_WUXING_PATTERNS[rarity] || ['balanced'];
  const patternName = patterns[index % patterns.length];
  const subs = pickSubElements(mainElement, species);
  
  let wuxing;
  switch (patternName) {
    case 'pure':
      wuxing = WUXING_TEMPLATES.pure(mainElement);
      break;
    case 'extreme':
      wuxing = WUXING_TEMPLATES.extreme(mainElement, subs[0]);
      break;
    case 'strong':
      wuxing = WUXING_TEMPLATES.strong(mainElement, subs[0]);
      break;
    case 'heavy':
      wuxing = WUXING_TEMPLATES.heavy(mainElement, subs[0]);
      break;
    case 'lean':
      wuxing = WUXING_TEMPLATES.lean(mainElement, subs[0]);
      break;
    case 'balanced':
      wuxing = WUXING_TEMPLATES.balanced(mainElement, subs[0]);
      break;
    case 'triple':
      wuxing = WUXING_TEMPLATES.triple(mainElement, subs[0], subs[1]);
      break;
    case 'tripleHeavy':
      wuxing = WUXING_TEMPLATES.tripleHeavy(mainElement, subs[0], subs[1]);
      break;
    case 'quad':
      wuxing = WUXING_TEMPLATES.quad(mainElement, subs[0], subs[1], subs[2]);
      break;
    default:
      wuxing = WUXING_TEMPLATES.balanced(mainElement, subs[0]);
  }
  
  // 驗證總和 = 100
  const total = Object.values(wuxing).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    console.error(`ERROR: ${mainElement} ${patternName} total=${total}`, wuxing);
  }
  
  return { wuxing, patternName };
}

// ─── 主邏輯：生成 200 隻魔物的更新 SQL ───
function generateUpdateSQL() {
  // 目標：每屬性 40 隻（200 / 5 = 40）
  const TARGET_PER_ELEMENT = 40;
  
  // 現有分佈：水89/火30/土28/金28/木25
  // 需要重新分配：將水的多餘魔物分配到其他屬性
  
  // 策略：
  // 1. 先按 monster_id 排序取得所有魔物
  // 2. 按稀有度分組
  // 3. 每個稀有度內均勻分配五行
  // 4. 種族也均勻分配
  
  const rarityTargets = {
    // 每屬性的稀有度分佈（總 40 隻/屬性）
    common:    8,   // 40 total
    rare:      12,  // 60 total
    elite:     8,   // 40 total
    epic:      8,   // 40 total
    legendary: 4,   // 20 total = 200 total
  };
  
  const sqls = [];
  let monsterIndex = 0;
  
  // 為每個屬性+稀有度組合生成分配
  for (const element of ELEMENTS) {
    for (const [rarity, count] of Object.entries(rarityTargets)) {
      for (let i = 0; i < count; i++) {
        // 種族輪替
        const speciesIdx = (monsterIndex) % SPECIES_LIST.length;
        const species = SPECIES_LIST[speciesIdx];
        
        // 生成五行分佈
        const { wuxing } = generateWuxingForMonster(element, rarity, species, i);
        
        // 計算抗性
        const resist = calcResistFromWuxing(wuxing, rarity);
        
        // 捕捉設定
        const capSetting = CAPTURE_BY_RARITY[rarity];
        const captureRate = capSetting.rateRange[0] + 
          Math.round((capSetting.rateRange[1] - capSetting.rateRange[0]) * (i / Math.max(count - 1, 1)));
        
        sqls.push({
          element,
          rarity,
          species,
          wuxing,
          resist,
          capturable: capSetting.capturable,
          captureRate,
          index: monsterIndex,
        });
        
        monsterIndex++;
      }
    }
  }
  
  return sqls;
}

// 生成並輸出結果摘要
const updates = generateUpdateSQL();

// 統計
const elementCounts = {};
const rarityCounts = {};
const speciesCounts = {};
const patternUsage = {};

for (const u of updates) {
  elementCounts[u.element] = (elementCounts[u.element] || 0) + 1;
  rarityCounts[u.rarity] = (rarityCounts[u.rarity] || 0) + 1;
  speciesCounts[u.species] = (speciesCounts[u.species] || 0) + 1;
}

console.log("=== 五行分佈 ===");
console.log(elementCounts);
console.log("\n=== 稀有度分佈 ===");
console.log(rarityCounts);
console.log("\n=== 種族分佈 ===");
console.log(speciesCounts);

// 驗證所有五行總和 = 100
const invalidWuxing = updates.filter(u => {
  const total = Object.values(u.wuxing).reduce((a, b) => a + b, 0);
  return total !== 100;
});
console.log(`\n=== 五行總和驗證 ===`);
console.log(`無效: ${invalidWuxing.length} / ${updates.length}`);

// 顯示前 10 個範例
console.log("\n=== 前 10 個範例 ===");
for (let i = 0; i < 10; i++) {
  const u = updates[i];
  console.log(`${u.element} ${u.rarity} ${u.species}: 木${u.wuxing['木']} 火${u.wuxing['火']} 土${u.wuxing['土']} 金${u.wuxing['金']} 水${u.wuxing['水']} | 抗:木${u.resist['木']} 火${u.resist['火']} 土${u.resist['土']} 金${u.resist['金']} 水${u.resist['水']} | 捕:${u.capturable} ${u.captureRate}%`);
}

// 輸出 JSON 供後續使用
import { writeFileSync } from 'fs';
writeFileSync('/home/ubuntu/oracle-resonance/scripts/monster-updates.json', JSON.stringify(updates, null, 2));
console.log("\n已輸出 monster-updates.json");
