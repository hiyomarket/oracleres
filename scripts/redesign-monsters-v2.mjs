/**
 * Monster Catalog V2 Redesign - Strict 10-unit wuxing allocation
 * Rules: only multiples of 10, sum=100, patterns: 50:50/60:40/70:30/80:20/90:10/100:0
 */
import { writeFileSync, mkdirSync } from 'fs';

const ELEMENTS = ['木', '火', '土', '金', '水'];
const ELEMENT_KEYS = ['wood', 'fire', 'earth', 'metal', 'water'];
const EI = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
const SPECIES = ['beast','humanoid','plant','undead','dragon','flying','insect','special','metal','demon'];
const PREFIX = { '木': 'M_E', '火': 'M_F', '土': 'M_D', '金': 'M_M', '水': 'M_W' };

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

// Rarity distribution per element (40 each): common:12, uncommon:10, rare:10, epic:5, legendary:3
const RARITY_COUNTS = [['common',12],['uncommon',10],['rare',10],['epic',5],['legendary',3]];

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
    case 'common':    pattern = idx%2===0 ? [50,50] : [60,40]; break;
    case 'uncommon':  pattern = idx%2===0 ? [60,40] : [70,30]; break;
    case 'rare':      pattern = idx%2===0 ? [70,30] : [80,20]; break;
    case 'epic':      pattern = idx%2===0 ? [80,20] : [90,10]; break;
    case 'legendary': pattern = idx%2===0 ? [90,10] : [100]; break;
  }
  w[pi] = pattern[0];
  if (pattern.length > 1) w[si] = pattern[1];
  return w;
}

function calcResist(wuxing, rarity) {
  const epic = rarity==='epic'||rarity==='legendary';
  const base = epic ? 45 : 35;
  return wuxing.map(w => w===0 ? (epic?-10:0) : Math.round((w/100)*base));
}

function capRate(rarity, i) {
  if (rarity==='epic'||rarity==='legendary') return 0;
  if (rarity==='common') return 25+(i%6)*3;
  if (rarity==='uncommon') return 15+(i%5)*3;
  return 8+(i%5)*2; // rare
}

const monsters = [];
for (const el of ELEMENTS) {
  let ei = 0;
  for (const [rarity, count] of RARITY_COUNTS) {
    for (let i = 0; i < count; i++) {
      const sp = SPECIES[ei % SPECIES.length];
      const bank = NAMES[el][sp];
      const nm = bank[Math.floor(ei/SPECIES.length) % bank.length];
      const w = getWuxing(rarity, ei, el);
      const r = calcResist(w, rarity);
      const id = `${PREFIX[el]}${String(ei+1).padStart(3,'0')}`;
      monsters.push({ id, name:nm, el, sp, rarity, w, r, cap: rarity!=='epic'&&rarity!=='legendary', cr: capRate(rarity,i) });
      ei++;
    }
  }
}

// Validate
let err = 0;
for (const m of monsters) {
  const s = m.w.reduce((a,b)=>a+b,0);
  if (s!==100) { console.error(`SUM ERR ${m.id}: ${s}`); err++; }
  for (const v of m.w) if (v%10!==0) { console.error(`MOD ERR ${m.id}: ${v}`); err++; }
}

const elC={}, spC={}, raC={};
for (const m of monsters) {
  elC[m.el]=(elC[m.el]||0)+1;
  spC[m.sp]=(spC[m.sp]||0)+1;
  raC[m.rarity]=(raC[m.rarity]||0)+1;
}
console.log(`Total: ${monsters.length} | Errors: ${err}`);
console.log('Elements:', elC);
console.log('Species:', spC);
console.log('Rarity:', raC);

// Sample
for (const el of ELEMENTS) {
  const ms = monsters.filter(m=>m.el===el);
  console.log(`\n${el} (${ms.length}):`);
  for (const m of ms.slice(0,3)) {
    const ws = ELEMENT_KEYS.map((k,i)=>m.w[i]>0?`${k}:${m.w[i]}`:'').filter(Boolean).join(' ');
    console.log(`  ${m.id} ${m.name} [${m.sp}/${m.rarity}] ${ws} cap:${m.cap?m.cr:'N/A'}`);
  }
}

// Generate SQL
const dir = '/home/ubuntu/oracle-resonance/scripts/sql-batches-v2';
mkdirSync(dir, { recursive: true });
const sqls = monsters.map(m => {
  const n = m.name.replace(/'/g, "''");
  return `UPDATE game_monster_catalog SET name='${n}', wuxing='${m.el}', species='${m.sp}', rarity='${m.rarity}', wuxing_wood=${m.w[0]}, wuxing_fire=${m.w[1]}, wuxing_earth=${m.w[2]}, wuxing_metal=${m.w[3]}, wuxing_water=${m.w[4]}, resist_wood=${m.r[0]}, resist_fire=${m.r[1]}, resist_earth=${m.r[2]}, resist_metal=${m.r[3]}, resist_water=${m.r[4]}, is_capturable=${m.cap?1:0}, base_capture_rate=${m.cr} WHERE monster_id='${m.id}';`;
});

for (let i=0; i<sqls.length; i+=10) {
  const bn = String(Math.floor(i/10)).padStart(2,'0');
  writeFileSync(`${dir}/batch_${bn}.sql`, sqls.slice(i,i+10).join('\n')+'\n');
}
writeFileSync(`${dir}/monsters.json`, JSON.stringify(monsters,null,2));
console.log(`\nGenerated ${Math.ceil(sqls.length/10)} batches in ${dir}`);
