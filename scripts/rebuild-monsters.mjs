/**
 * Monster Catalog FULL REBUILD Script
 * Strategy: DELETE all existing monsters, INSERT 200 new ones
 * 
 * Rules:
 * - Wuxing allocation: only multiples of 10, sum=100
 * - 40 monsters per element (木/火/土/金/水)
 * - 10 species, each species gets 20 total monsters
 * - Rarity per element: common:12, uncommon:10, rare:10, epic:5, legendary:3
 * - Capture: common/uncommon/rare = capturable, epic/legendary = not capturable
 * - Base stats scale with rarity
 * - Resistance follows wuxing distribution
 */
import { writeFileSync, mkdirSync } from 'fs';

const ELEMENTS = ['木', '火', '土', '金', '水'];
const ELEMENT_KEYS = ['wood', 'fire', 'earth', 'metal', 'water'];
const EI = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
const SPECIES = ['beast','humanoid','plant','undead','dragon','flying','insect','special','metal','demon'];
const PREFIX = { '木': 'M_E', '火': 'M_F', '土': 'M_D', '金': 'M_M', '水': 'M_W' };

// Generating cycle: 木→火→土→金→水→木
const GENERATING = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };

const NAMES = {
  '木': {
    beast:['翠牙鹿','苔背熊','蔓藤狼','林角獸','碧蹄馬','藤蔓蛇','青鬃獅','翡翠豹','古木象','蒼藤虎','靈根獸','萬木麒麟'],
    humanoid:['樹靈','花仙','藤妖','木偶師','森巫','葉隱忍','根脈術士','翠竹劍客','花魁妖姬','古樹守衛'],
    plant:['食人花','毒蘑菇','荊棘藤','古樹精','蓮花妖','竹葉蟲','苔蘚怪','藤蔓魔','花粉蟲','靈芝王'],
    undead:['枯木骷髏','朽根亡靈','腐葉幽魂','苔墓殭屍','枯藤鬼'],
    dragon:['翠鱗龍','蒼木飛龍','森林龍蜥'],
    flying:['翠羽鷹','林中蝠','蔓藤鳥','碧翼蟲','花蝶妖'],
    insect:['樹蟻兵','木甲蟲','藤蔓蜘蛛','翠蠍','竹節蟲'],
    special:['精靈石','靈木核','森之心'],
    metal:['鐵樹衛','銅根獸'],
    demon:['木魔','森羅鬼','枯靈魔王'],
  },
  '火': {
    beast:['烈焰獅','火鬃狼','熔岩牛','赤角獸','焰尾蠍','炎蹄馬','火鴉獸','赤焰虎','熔岩蛇','灼熱豹','烈焰獸','火麒麟'],
    humanoid:['火巫','焰舞者','熔岩巨人','赤焰術士','火山祭司','炎魔劍士','烈焰弓手','火靈巫女','焰心守衛','赤炎武僧'],
    plant:['火蓮花','焰菇','熔岩苔','赤焰藤','火棘花','灼熱草','焰心果','火山花','赤焰蕨','熔岩蘑'],
    undead:['焰骷髏','灼魂亡靈','火墓殭屍','赤焰幽魂','熔岩鬼'],
    dragon:['赤焰龍','熔岩飛龍','火山龍蜥'],
    flying:['火鴉','焰翼鷹','赤翅蝠','火蝶','熔岩蟲'],
    insect:['火蟻兵','焰甲蟲','赤蠍','熔岩蜘蛛','火蜂'],
    special:['火靈石','焰心核','熔岩之心'],
    metal:['鐵焰衛','熔鋼獸'],
    demon:['火魔','焰羅鬼','赤炎魔王'],
  },
  '土': {
    beast:['岩背獸','沙角牛','泥沼蛇','黃土狼','石甲熊','砂蹄馬','岩角獸','土鬃獅','沙漠豹','泥沼虎','黃土獸','土麒麟'],
    humanoid:['土偶','岩巨人','沙漠祭司','泥沼巫','石像兵','砂術士','黃土武僧','岩壁守衛','沙漠弓手','泥沼劍客'],
    plant:['沙漠仙人掌','岩苔','土靈芝','黃土蘑','砂蓮','泥沼花','岩壁藤','土之果','沙棘','黃土蕨'],
    undead:['土骷髏','岩墓亡靈','沙漠殭屍','黃土幽魂','泥沼鬼'],
    dragon:['岩甲龍','沙漠飛龍','土山龍蜥'],
    flying:['沙鷹','岩翅蝠','土蝶','砂翼鳥','黃土蟲'],
    insect:['沙蟻兵','岩甲蟲','土蠍','泥沼蜘蛛','砂蜂'],
    special:['土靈石','岩心核','大地之心'],
    metal:['鐵岩衛','銅土獸'],
    demon:['土魔','岩羅鬼','黃土魔王'],
  },
  '金': {
    beast:['銀鬃狼','鐵角獸','鋼甲熊','白銀豹','金蹄馬','銅牙獅','鉑金蛇','鐵背虎','銀角鹿','金甲牛','白銀獸','金麒麟'],
    humanoid:['鐵衛兵','銀甲武士','金術師','鋼拳僧','白銀弓手','鐵壁守衛','銅面祭司','金刃劍客','鉑金巫女','銀盾騎士'],
    plant:['鐵蓮花','銀葉草','金菇','鋼藤','白銀苔','鐵棘','銅蕨','金之果','鉑金花','銀杏精'],
    undead:['鐵骷髏','銀墓亡靈','金甲殭屍','白銀幽魂','鋼魂鬼'],
    dragon:['白銀龍','鐵甲飛龍','金山龍蜥'],
    flying:['銀翼鷹','鐵翅蝠','金蝶','鋼翼鳥','白銀蟲'],
    insect:['鐵蟻兵','銀甲蟲','金蠍','鋼蜘蛛','鉑金蜂'],
    special:['金靈石','銀心核','金之心'],
    metal:['鐵壁衛','鋼鐵獸'],
    demon:['金魔','銀羅鬼','白銀魔王'],
  },
  '水': {
    beast:['碧波魚龍','深海蛇','冰霜狼','潮汐獸','寒冰熊','水蹄馬','蒼海豹','冰角鹿','深淵虎','潮汐獅','寒冰獸','水麒麟'],
    humanoid:['水巫','潮汐祭司','冰霜術士','深海武僧','寒冰弓手','水靈巫女','潮汐劍客','冰壁守衛','深海忍者','蒼海騎士'],
    plant:['水蓮花','冰苔','深海藻','潮汐蘑','寒冰蕨','水之果','冰晶花','深海藤','潮汐草','蒼海蘑'],
    undead:['水骷髏','深海亡靈','冰墓殭屍','潮汐幽魂','寒冰鬼'],
    dragon:['蒼海龍','冰霜飛龍','深淵龍蜥'],
    flying:['水翼鷹','冰翅蝠','潮汐蝶','深海鳥','寒冰蟲'],
    insect:['水蟻兵','冰甲蟲','潮汐蠍','深海蜘蛛','寒冰蜂'],
    special:['水靈石','冰心核','深海之心'],
    metal:['鐵冰衛','寒鋼獸'],
    demon:['水魔','潮汐鬼','深淵魔王'],
  },
};

const RARITY_COUNTS = [['common',12],['uncommon',10],['rare',10],['epic',5],['legendary',3]];

// Base stats by rarity
const BASE_STATS = {
  common:    { hp:50,  mp:20,  atk:8,   def:5,   spd:8,   acc:75,  matk:6,   mdef:4,   heal:0,  critR:3,   critD:130, bp:30,  act:1, ai:1, growth:1.0, realm:'初界', realmMul:1.0, lvl:'1-10',  gold:{min:3,max:10} },
  uncommon:  { hp:80,  mp:35,  atk:14,  def:9,   spd:12,  acc:80,  matk:11,  mdef:7,   heal:2,  critR:5,   critD:140, bp:50,  act:1, ai:1, growth:1.05, realm:'初界', realmMul:1.0, lvl:'5-20',  gold:{min:8,max:25} },
  rare:      { hp:150, mp:60,  atk:25,  def:16,  spd:18,  acc:85,  matk:20,  mdef:12,  heal:5,  critR:8,   critD:155, bp:80,  act:1, ai:2, growth:1.1, realm:'中界', realmMul:1.5, lvl:'15-40', gold:{min:20,max:60} },
  epic:      { hp:300, mp:120, atk:45,  def:30,  spd:25,  acc:90,  matk:38,  mdef:22,  heal:10, critR:12,  critD:170, bp:120, act:2, ai:3, growth:1.15, realm:'中界', realmMul:1.5, lvl:'30-70', gold:{min:50,max:150} },
  legendary: { hp:600, mp:250, atk:80,  def:55,  spd:35,  acc:95,  matk:70,  mdef:40,  heal:20, critR:18,  critD:200, bp:200, act:3, ai:4, growth:1.2, realm:'高界', realmMul:2.0, lvl:'50-99', gold:{min:100,max:500} },
};

function getSecondary(primary, idx) {
  const others = ELEMENTS.filter(e => e !== primary);
  return others[idx % others.length];
}

function getWuxing(rarity, idx, primary) {
  const pi = EI[primary];
  const sec = getSecondary(primary, idx);
  const si = EI[sec];
  const w = [0,0,0,0,0];
  let pattern;
  switch(rarity) {
    case 'common':    pattern = idx%3===0 ? [50,50] : idx%3===1 ? [60,40] : [50,30,20]; break;
    case 'uncommon':  pattern = idx%3===0 ? [60,40] : idx%3===1 ? [70,30] : [60,20,20]; break;
    case 'rare':      pattern = idx%3===0 ? [70,30] : idx%3===1 ? [80,20] : [70,20,10]; break;
    case 'epic':      pattern = idx%2===0 ? [80,20] : [90,10]; break;
    case 'legendary': pattern = idx%3===0 ? [90,10] : idx%3===1 ? [100] : [80,10,10]; break;
  }
  w[pi] = pattern[0];
  if (pattern.length >= 2 && pattern[1] > 0) {
    w[si] = pattern[1];
  }
  if (pattern.length >= 3 && pattern[2] > 0) {
    // Third element: use the generating element
    const gen = GENERATING[primary];
    const gi = EI[gen];
    if (gi !== pi && gi !== si) {
      w[gi] = pattern[2];
    } else {
      // Fallback: find unused element
      for (let k = 0; k < 5; k++) {
        if (w[k] === 0 && k !== pi && k !== si) {
          w[k] = pattern[2];
          break;
        }
      }
    }
  }
  
  const sum = w.reduce((a,b)=>a+b,0);
  if (sum !== 100) throw new Error(`Sum ${sum} for ${primary} ${rarity} #${idx}: ${w}`);
  for (const v of w) if (v % 10 !== 0) throw new Error(`Non-10 value ${v}`);
  return w;
}

function calcResist(wuxing, rarity) {
  const epic = rarity==='epic'||rarity==='legendary';
  const base = epic ? 45 : 30;
  return wuxing.map(w => {
    if (w === 0) return epic ? -10 : 0;
    return Math.round((w / 100) * base);
  });
}

function capRate(rarity, i) {
  if (rarity==='epic'||rarity==='legendary') return 0;
  if (rarity==='common') return 25 + (i % 6) * 3;
  if (rarity==='uncommon') return 15 + (i % 5) * 3;
  return 8 + (i % 5) * 2; // rare
}

// Counter bonus by rarity
function counterBonus(rarity) {
  switch(rarity) {
    case 'common': return 50;
    case 'uncommon': return 55;
    case 'rare': return 60;
    case 'epic': return 70;
    case 'legendary': return 80;
  }
}

// Description generator
function genDesc(name, element, species, rarity) {
  const elDesc = { '木':'蘊含木之生機', '火':'燃燒著火之烈焰', '土':'承載著土之厚重', '金':'閃耀著金之鋒芒', '水':'流淌著水之靈動' };
  const spDesc = { beast:'野獸', humanoid:'人形', plant:'植物', undead:'不死', dragon:'龍種', flying:'飛行', insect:'昆蟲', special:'特殊', metal:'金屬', demon:'惡魔' };
  const rarDesc = { common:'常見的', uncommon:'不太常見的', rare:'稀有的', epic:'史詩級的', legendary:'傳說中的' };
  return `${rarDesc[rarity]}${spDesc[species]}型魔物「${name}」，${elDesc[element]}。`;
}

const monsters = [];
for (const el of ELEMENTS) {
  let ei = 0;
  for (const [rarity, count] of RARITY_COUNTS) {
    for (let i = 0; i < count; i++) {
      const sp = SPECIES[ei % SPECIES.length];
      const bank = NAMES[el][sp];
      const nm = bank[Math.floor(ei / SPECIES.length) % bank.length];
      const w = getWuxing(rarity, ei, el);
      const r = calcResist(w, rarity);
      const id = `${PREFIX[el]}${String(ei + 1).padStart(3, '0')}`;
      const stats = BASE_STATS[rarity];
      
      // Add some variance to base stats (±10%)
      const variance = () => 0.9 + Math.random() * 0.2;
      
      monsters.push({
        monsterId: id,
        name: nm,
        wuxing: el,
        species: sp,
        rarity,
        levelRange: stats.lvl,
        baseHp: Math.round(stats.hp * variance()),
        baseMp: Math.round(stats.mp * variance()),
        baseAttack: Math.round(stats.atk * variance()),
        baseDefense: Math.round(stats.def * variance()),
        baseSpeed: Math.round(stats.spd * variance()),
        baseAccuracy: stats.acc,
        baseMagicAttack: Math.round(stats.matk * variance()),
        baseMagicDefense: Math.round(stats.mdef * variance()),
        baseHealPower: stats.heal,
        baseCritRate: stats.critR,
        baseCritDamage: stats.critD,
        wuxingWood: w[0],
        wuxingFire: w[1],
        wuxingEarth: w[2],
        wuxingMetal: w[3],
        wuxingWater: w[4],
        resistWood: r[0],
        resistFire: r[1],
        resistEarth: r[2],
        resistMetal: r[3],
        resistWater: r[4],
        counterBonus: counterBonus(rarity),
        isCapturable: rarity !== 'epic' && rarity !== 'legendary' ? 1 : 0,
        baseCaptureRate: capRate(rarity, i),
        baseBp: stats.bp,
        actionsPerTurn: stats.act,
        aiLevel: stats.ai,
        growthRate: stats.growth,
        realm: stats.realm,
        realmMultiplier: stats.realmMul,
        dropGold: JSON.stringify(stats.gold),
        description: genDesc(nm, el, sp, rarity),
      });
      
      ei++;
    }
  }
}

// Validate
let err = 0;
for (const m of monsters) {
  const s = m.wuxingWood + m.wuxingFire + m.wuxingEarth + m.wuxingMetal + m.wuxingWater;
  if (s !== 100) { console.error(`SUM ERR ${m.monsterId}: ${s}`); err++; }
  for (const k of ['wuxingWood','wuxingFire','wuxingEarth','wuxingMetal','wuxingWater']) {
    if (m[k] % 10 !== 0) { console.error(`MOD ERR ${m.monsterId}.${k}: ${m[k]}`); err++; }
  }
}

const elC={}, spC={}, raC={};
for (const m of monsters) {
  elC[m.wuxing]=(elC[m.wuxing]||0)+1;
  spC[m.species]=(spC[m.species]||0)+1;
  raC[m.rarity]=(raC[m.rarity]||0)+1;
}
console.log(`Total: ${monsters.length} | Errors: ${err}`);
console.log('Elements:', elC);
console.log('Species:', spC);
console.log('Rarity:', raC);

// Wuxing pattern analysis
const patterns = {};
for (const m of monsters) {
  const vals = [m.wuxingWood, m.wuxingFire, m.wuxingEarth, m.wuxingMetal, m.wuxingWater]
    .filter(v => v > 0).sort((a,b) => b-a).join(':');
  patterns[vals] = (patterns[vals] || 0) + 1;
}
console.log('Wuxing patterns:', patterns);

// Generate SQL
const dir = '/home/ubuntu/oracle-resonance/scripts/sql-rebuild';
mkdirSync(dir, { recursive: true });

// Step 1: DELETE all existing monsters
const deleteSql = `-- Step 1: Delete all existing monsters\nDELETE FROM game_monster_catalog;\n`;
writeFileSync(`${dir}/00_delete_all.sql`, deleteSql);

// Step 2: INSERT all new monsters in batches
const batchSize = 10;
for (let i = 0; i < monsters.length; i += batchSize) {
  const batch = monsters.slice(i, i + batchSize);
  const batchNum = String(Math.floor(i / batchSize) + 1).padStart(2, '0');
  
  const inserts = batch.map(m => {
    const n = m.name.replace(/'/g, "''");
    const d = m.description.replace(/'/g, "''");
    return `INSERT INTO game_monster_catalog (monster_id, name, wuxing, species, rarity, level_range, base_hp, base_mp, base_attack, base_defense, base_speed, base_accuracy, base_magic_attack, base_magic_defense, base_heal_power, base_crit_rate, base_crit_damage, wuxing_wood, wuxing_fire, wuxing_earth, wuxing_metal, wuxing_water, resist_wood, resist_fire, resist_earth, resist_metal, resist_water, counter_bonus, is_capturable, base_capture_rate, base_bp, actions_per_turn, ai_level, growth_rate, realm, realm_multiplier, drop_gold, description, is_active, created_at) VALUES ('${m.monsterId}', '${n}', '${m.wuxing}', '${m.species}', '${m.rarity}', '${m.levelRange}', ${m.baseHp}, ${m.baseMp}, ${m.baseAttack}, ${m.baseDefense}, ${m.baseSpeed}, ${m.baseAccuracy}, ${m.baseMagicAttack}, ${m.baseMagicDefense}, ${m.baseHealPower}, ${m.baseCritRate}, ${m.baseCritDamage}, ${m.wuxingWood}, ${m.wuxingFire}, ${m.wuxingEarth}, ${m.wuxingMetal}, ${m.wuxingWater}, ${m.resistWood}, ${m.resistFire}, ${m.resistEarth}, ${m.resistMetal}, ${m.resistWater}, ${m.counterBonus}, ${m.isCapturable}, ${m.baseCaptureRate}, ${m.baseBp}, ${m.actionsPerTurn}, ${m.aiLevel}, ${m.growthRate}, '${m.realm}', ${m.realmMultiplier}, '${m.dropGold}', '${d}', 1, ${Date.now()});`;
  });
  
  writeFileSync(`${dir}/batch_${batchNum}.sql`, inserts.join('\n') + '\n');
}

writeFileSync(`${dir}/monsters.json`, JSON.stringify(monsters, null, 2));

console.log(`\nGenerated files in ${dir}:`);
console.log(`  00_delete_all.sql - Delete all existing monsters`);
console.log(`  batch_01.sql to batch_${String(Math.ceil(monsters.length / batchSize)).padStart(2,'0')}.sql - Insert new monsters`);
console.log(`  monsters.json - Full reference data`);

// Print samples
console.log('\n--- Sample Monsters ---');
for (const el of ELEMENTS) {
  const ms = monsters.filter(m => m.wuxing === el);
  console.log(`\n${el} (${ms.length} monsters):`);
  for (const m of ms.slice(0, 4)) {
    const ws = ELEMENT_KEYS.map((k, i) => {
      const v = [m.wuxingWood, m.wuxingFire, m.wuxingEarth, m.wuxingMetal, m.wuxingWater][i];
      return v > 0 ? `${k}:${v}` : '';
    }).filter(Boolean).join(' ');
    console.log(`  ${m.monsterId} ${m.name} [${m.species}/${m.rarity}] ${ws} HP:${m.baseHp} ATK:${m.baseAttack} cap:${m.isCapturable?m.baseCaptureRate+'%':'N/A'}`);
  }
}
