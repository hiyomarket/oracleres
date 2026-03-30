import type { WuXing } from "./types";

// GD-020 補充四：怪物種族類型
export type MonsterRace =
  | "靈獸系"  // 動物形態的靈體（山豬精、鹿靈等）
  | "亡魂系"  // 幽靈、怨靈、不死類
  | "金屬系"  // 礦石精靈、機械類
  | "人型系"  // 人形妖怪、修煉中的精怪
  | "植物系"  // 樹精、藤蔓類
  | "水生系"  // 海洋、河流類
  | "妖化系"  // 動物修煉成精（狐妖、蛇妖等）
  | "龍種系"  // 龍類、蛴類
  | "蟲類系"  // 昆蟲類（蜂螃精、蜘蛛妖等）
  | "天命系"; // Boss 專屬（五行守護神、地脈龍王等）

export type Monster = {
  id: string;
  name: string;
  element: WuXing;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  expReward: number;
  goldReward: [number, number]; // [min, max]
  dropItems: Array<{ itemId: string; chance: number }>; // chance 0-1
  skills: string[];
  description: string;
  isBoss: boolean;
  race?: MonsterRace; // GD-020 補充四：種族欄位（optional，向後相容）
  imageUrl?: string | null;
};

export const MONSTERS: Monster[] = [
  // ─── 木屬性怪物 ───
  { id: "wood-001", name: "青苔精靈", element: "wood", level: 1, hp: 30, attack: 5, defense: 3, speed: 4, expReward: 8, goldReward: [2, 5], dropItems: [{ itemId: "herb-001", chance: 0.6 }], skills: ["藤蔓纏繞"], description: "棲居於潮濕石縫的小精靈，以青苔為食。", isBoss: false, race: "植物系" },
  { id: "wood-002", name: "竹林幽靈", element: "wood", level: 3, hp: 60, attack: 10, defense: 6, speed: 7, expReward: 18, goldReward: [5, 12], dropItems: [{ itemId: "herb-002", chance: 0.5 }, { itemId: "mat-wood-001", chance: 0.3 }], skills: ["竹刺連擊", "迷霧遁形"], description: "在竹林深處遊蕩的幽靈，身形如竹節般修長。", isBoss: false, race: "亡魂系" },
  { id: "wood-003", name: "山豬精", element: "wood", level: 5, hp: 100, attack: 18, defense: 10, speed: 8, expReward: 35, goldReward: [10, 20], dropItems: [{ itemId: "mat-wood-002", chance: 0.4 }, { itemId: "food-001", chance: 0.5 }, { itemId: "skill-wood-001", chance: 0.01 }], skills: ["野豬衝撞", "大地震踏"], description: "被木靈能量附身的野豬，力大無窮。", isBoss: false, race: "靈獸系" },
  { id: "wood-004", name: "古木守衛", element: "wood", level: 8, hp: 180, attack: 28, defense: 18, speed: 5, expReward: 65, goldReward: [18, 35], dropItems: [{ itemId: "mat-wood-003", chance: 0.35 }, { itemId: "equip-wood-001", chance: 0.05 }, { itemId: "skill-wood-001", chance: 0.02 }], skills: ["樹根束縛", "木甲強化", "枝葉颶風"], description: "千年古木孕育出的守衛，樹皮如鐵甲堅硬。", isBoss: false, race: "植物系" },
  { id: "wood-005", name: "森林蜘蛛王", element: "wood", level: 12, hp: 300, attack: 45, defense: 25, speed: 15, expReward: 120, goldReward: [30, 60], dropItems: [{ itemId: "mat-wood-004", chance: 0.4 }, { itemId: "mat-wood-005", chance: 0.25 }, { itemId: "skill-wood-001", chance: 0.03 }], skills: ["毒絲纏繞", "蛛網陷阱", "毒牙噬咬"], description: "森林深處的蜘蛛女王，毒液能腐蝕金屬。", isBoss: false, race: "蟲類系" },
  { id: "wood-006", name: "藤蔓巨人", element: "wood", level: 15, hp: 450, attack: 60, defense: 35, speed: 6, expReward: 180, goldReward: [45, 90], dropItems: [{ itemId: "mat-wood-006", chance: 0.3 }, { itemId: "equip-wood-002", chance: 0.08 }, { itemId: "skill-wood-001", chance: 0.04 }], skills: ["藤蔓鞭打", "生命汲取", "木靈再生"], description: "由無數藤蔓聚合而成的巨人，能自我修復。", isBoss: false, race: "植物系" },
  { id: "wood-007", name: "翠羽鳳凰", element: "wood", level: 18, hp: 600, attack: 80, defense: 40, speed: 25, expReward: 250, goldReward: [60, 120], dropItems: [{ itemId: "mat-wood-007", chance: 0.25 }, { itemId: "skill-wood-001", chance: 0.05 }], skills: ["翠羽颶風", "木靈祝福", "鳳凰再生"], description: "傳說中的翠色鳳凰，羽毛蘊含強大的木靈能量。", isBoss: false, race: "妖化系" },
  { id: "wood-008", name: "神木守護者", element: "wood", level: 22, hp: 900, attack: 110, defense: 60, speed: 12, expReward: 400, goldReward: [100, 200], dropItems: [{ itemId: "mat-wood-008", chance: 0.2 }, { itemId: "equip-wood-003", chance: 0.1 }], skills: ["神木庇護", "千年根系", "木靈爆發"], description: "守護千年神木的古老精靈，力量足以移山。", isBoss: false, race: "植物系" },
  { id: "wood-009", name: "綠龍幼體", element: "wood", level: 28, hp: 1500, attack: 160, defense: 90, speed: 20, expReward: 700, goldReward: [180, 360], dropItems: [{ itemId: "mat-wood-009", chance: 0.15 }, { itemId: "equip-wood-004", chance: 0.08 }], skills: ["龍息毒霧", "木靈龍爪", "森林召喚"], description: "棲居於原始森林的綠龍幼體，毒息能枯萎植物。", isBoss: false, race: "龍種系" },
  { id: "wood-boss-001", name: "木靈神獸・青龍", element: "wood", level: 35, hp: 5000, attack: 250, defense: 150, speed: 30, expReward: 2000, goldReward: [500, 1000], dropItems: [{ itemId: "equip-wood-005", chance: 0.3 }, { itemId: "skill-wood-002", chance: 0.15 }, { itemId: "mat-wood-010", chance: 0.5 }], skills: ["青龍颶風", "木靈神域", "千年樹海", "龍威震懾"], description: "五行木靈的化身，青龍降臨時百木皆拜。", isBoss: true, race: "天命系" },

  // ─── 火屬性怪物 ───
  { id: "fire-001", name: "火螢精靈", element: "fire", level: 1, hp: 25, attack: 7, defense: 2, speed: 6, expReward: 9, goldReward: [2, 6], dropItems: [{ itemId: "mat-fire-001", chance: 0.5 }], skills: ["火花閃爍"], description: "在夜晚發出橙紅光芒的小精靈，碰觸會灼傷。", isBoss: false, race: "植物系" },
  { id: "fire-002", name: "熔岩蜥蜴", element: "fire", level: 3, hp: 55, attack: 12, defense: 5, speed: 5, expReward: 20, goldReward: [5, 14], dropItems: [{ itemId: "mat-fire-002", chance: 0.45 }, { itemId: "skill-fire-001", chance: 0.01 }], skills: ["火焰噴吐", "熔岩護甲"], description: "皮膚如熔岩般龜裂，體溫極高的蜥蜴。", isBoss: false, race: "靈獸系" },
  { id: "fire-003", name: "硫磺鬼", element: "fire", level: 5, hp: 90, attack: 20, defense: 8, speed: 9, expReward: 38, goldReward: [10, 22], dropItems: [{ itemId: "mat-fire-003", chance: 0.4 }, { itemId: "herb-fire-001", chance: 0.3 }], skills: ["硫磺爆炸", "毒氣瀰漫"], description: "溫泉地熱區孕育的鬼怪，身上散發硫磺臭味。", isBoss: false, race: "亡魂系" },
  { id: "fire-004", name: "火焰狼", element: "fire", level: 8, hp: 160, attack: 32, defense: 15, speed: 18, expReward: 70, goldReward: [20, 40], dropItems: [{ itemId: "mat-fire-004", chance: 0.35 }, { itemId: "equip-fire-001", chance: 0.04 }, { itemId: "skill-fire-001", chance: 0.02 }], skills: ["火焰衝刺", "嚎叫強化", "灼燒噬咬"], description: "全身燃燒著火焰的狼，奔跑時留下火痕。", isBoss: false, race: "靈獸系" },
  { id: "fire-005", name: "爆炎魔人", element: "fire", level: 12, hp: 280, attack: 50, defense: 20, speed: 12, expReward: 130, goldReward: [32, 65], dropItems: [{ itemId: "mat-fire-005", chance: 0.35 }, { itemId: "skill-fire-001", chance: 0.03 }], skills: ["爆炎拳擊", "火焰旋風", "自爆威脅"], description: "由純粹火靈能量凝聚而成的人形怪物。", isBoss: false, race: "人型系" },
  { id: "fire-006", name: "灼熱鳳凰", element: "fire", level: 16, hp: 500, attack: 75, defense: 30, speed: 22, expReward: 200, goldReward: [50, 100], dropItems: [{ itemId: "mat-fire-006", chance: 0.3 }, { itemId: "equip-fire-002", chance: 0.07 }, { itemId: "skill-fire-001", chance: 0.04 }], skills: ["鳳凰烈焰", "涅槃重生", "火雨降臨"], description: "在火山口翱翔的鳳凰，死後能從灰燼中重生。", isBoss: false, race: "妖化系" },
  { id: "fire-007", name: "炎魔將軍", element: "fire", level: 20, hp: 750, attack: 100, defense: 50, speed: 15, expReward: 320, goldReward: [80, 160], dropItems: [{ itemId: "mat-fire-007", chance: 0.25 }, { itemId: "skill-fire-001", chance: 0.04 }], skills: ["炎魔斬擊", "火靈鎧甲", "地獄烈焰"], description: "統領火靈軍團的將軍，手持熔岩長劍。", isBoss: false, race: "人型系" },
  { id: "fire-008", name: "太陽精靈王", element: "fire", level: 25, hp: 1200, attack: 140, defense: 70, speed: 20, expReward: 550, goldReward: [140, 280], dropItems: [{ itemId: "mat-fire-008", chance: 0.2 }, { itemId: "equip-fire-003", chance: 0.09 }], skills: ["太陽神光", "烈焰護盾", "日蝕衝擊"], description: "汲取太陽能量的精靈之王，光芒刺目難以直視。", isBoss: false, race: "靈獸系" },
  { id: "fire-009", name: "火山巨龍", element: "fire", level: 30, hp: 2000, attack: 200, defense: 110, speed: 18, expReward: 900, goldReward: [230, 460], dropItems: [{ itemId: "mat-fire-009", chance: 0.15 }, { itemId: "equip-fire-004", chance: 0.07 }], skills: ["火山爆發", "熔岩洪流", "龍焰衝天"], description: "棲居於火山口的巨龍，噴出的火焰能融化鋼鐵。", isBoss: false, race: "龍種系" },
  { id: "fire-boss-001", name: "火靈神獸・朱雀", element: "fire", level: 38, hp: 6000, attack: 280, defense: 160, speed: 35, expReward: 2500, goldReward: [600, 1200], dropItems: [{ itemId: "equip-fire-005", chance: 0.3 }, { itemId: "skill-fire-002", chance: 0.15 }, { itemId: "mat-fire-010", chance: 0.5 }], skills: ["朱雀烈焰", "火靈神域", "涅槃之火", "天火降臨"], description: "五行火靈的化身，朱雀展翅時天空燃起火雲。", isBoss: true, race: "天命系" },

  // ─── 土屬性怪物 ───
  { id: "earth-001", name: "泥土精靈", element: "earth", level: 1, hp: 40, attack: 4, defense: 6, speed: 2, expReward: 7, goldReward: [2, 4], dropItems: [{ itemId: "mat-earth-001", chance: 0.6 }], skills: ["泥土投擲"], description: "由泥土凝聚而成的小精靈，防禦力驚人。", isBoss: false, race: "靈獸系" },
  { id: "earth-002", name: "石頭蟹", element: "earth", level: 3, hp: 80, attack: 8, defense: 15, speed: 3, expReward: 16, goldReward: [4, 10], dropItems: [{ itemId: "mat-earth-002", chance: 0.5 }, { itemId: "skill-earth-001", chance: 0.01 }], skills: ["石鉗夾擊", "縮殼防禦"], description: "外殼堅硬如石的螃蟹，正面攻擊幾乎無效。", isBoss: false, race: "靈獸系" },
  { id: "earth-003", name: "沙漠蠍", element: "earth", level: 5, hp: 110, attack: 16, defense: 12, speed: 7, expReward: 32, goldReward: [8, 18], dropItems: [{ itemId: "mat-earth-003", chance: 0.4 }, { itemId: "herb-earth-001", chance: 0.3 }], skills: ["毒刺攻擊", "沙塵暴"], description: "棲居於乾燥土地的蠍子，毒液能麻痺獵物。", isBoss: false, race: "蟲類系" },
  { id: "earth-004", name: "岩石巨人", element: "earth", level: 8, hp: 250, attack: 22, defense: 30, speed: 4, expReward: 60, goldReward: [15, 30], dropItems: [{ itemId: "mat-earth-004", chance: 0.35 }, { itemId: "equip-earth-001", chance: 0.04 }, { itemId: "skill-earth-001", chance: 0.02 }], skills: ["岩石投擲", "大地震踏", "岩壁防禦"], description: "由岩石構成的巨人，每一步都讓大地顫抖。", isBoss: false, race: "金屬系" },
  { id: "earth-005", name: "土靈農夫精", element: "earth", level: 10, hp: 200, attack: 30, defense: 25, speed: 8, expReward: 90, goldReward: [22, 45], dropItems: [{ itemId: "mat-earth-005", chance: 0.4 }, { itemId: "food-earth-001", chance: 0.5 }, { itemId: "skill-earth-001", chance: 0.025 }], skills: ["鋤頭重擊", "豐收詛咒", "土靈召喚"], description: "農田中的土靈精靈，守護著農作物不受侵害。", isBoss: false, race: "人型系" },
  { id: "earth-006", name: "黃土魔像", element: "earth", level: 14, hp: 400, attack: 45, defense: 45, speed: 5, expReward: 160, goldReward: [40, 80], dropItems: [{ itemId: "mat-earth-006", chance: 0.3 }, { itemId: "equip-earth-002", chance: 0.07 }, { itemId: "skill-earth-001", chance: 0.035 }], skills: ["魔像重拳", "土靈護甲", "大地束縛"], description: "由古代術士以土靈能量製造的魔像，無情無義。", isBoss: false, race: "金屬系" },
  { id: "earth-007", name: "山嶽巨靈", element: "earth", level: 18, hp: 650, attack: 65, defense: 60, speed: 6, expReward: 260, goldReward: [65, 130], dropItems: [{ itemId: "mat-earth-007", chance: 0.25 }, { itemId: "skill-earth-001", chance: 0.04 }], skills: ["山崩地裂", "土靈強化", "大地之怒"], description: "山嶽化身的巨靈，每次攻擊都如山崩一般。", isBoss: false, race: "靈獸系" },
  { id: "earth-008", name: "地脈守護獸", element: "earth", level: 22, hp: 950, attack: 90, defense: 80, speed: 10, expReward: 420, goldReward: [105, 210], dropItems: [{ itemId: "mat-earth-008", chance: 0.2 }, { itemId: "equip-earth-003", chance: 0.09 }], skills: ["地脈衝擊", "土靈結界", "大地脈動"], description: "守護地脈能量的古老神獸，能感知地下的一切。", isBoss: false, race: "靈獸系" },
  { id: "earth-009", name: "黃龍幼體", element: "earth", level: 28, hp: 1600, attack: 155, defense: 120, speed: 12, expReward: 720, goldReward: [180, 360], dropItems: [{ itemId: "mat-earth-009", chance: 0.15 }, { itemId: "equip-earth-004", chance: 0.08 }], skills: ["龍爪重擊", "土靈龍息", "大地震裂"], description: "棲居於地底的黃龍幼體，能在地下自由穿行。", isBoss: false, race: "龍種系" },
  { id: "earth-boss-001", name: "土靈神獸・黃龍", element: "earth", level: 36, hp: 5500, attack: 240, defense: 200, speed: 15, expReward: 2200, goldReward: [550, 1100], dropItems: [{ itemId: "equip-earth-005", chance: 0.3 }, { itemId: "skill-earth-002", chance: 0.15 }, { itemId: "mat-earth-010", chance: 0.5 }], skills: ["黃龍震地", "土靈神域", "大地之心", "龍威鎮壓"], description: "五行土靈的化身，黃龍出現時大地靜止。", isBoss: true, race: "天命系" },

  // ─── 金屬性怪物 ───
  { id: "metal-001", name: "鐵甲蟲", element: "metal", level: 1, hp: 35, attack: 6, defense: 8, speed: 3, expReward: 8, goldReward: [3, 7], dropItems: [{ itemId: "mat-metal-001", chance: 0.55 }], skills: ["鐵甲衝撞"], description: "外殼如鐵甲的甲蟲，普通武器難以穿透。", isBoss: false, race: "蟲類系" },
  { id: "metal-002", name: "銀色狼人", element: "metal", level: 4, hp: 70, attack: 14, defense: 10, speed: 12, expReward: 22, goldReward: [6, 15], dropItems: [{ itemId: "mat-metal-002", chance: 0.45 }, { itemId: "skill-metal-001", chance: 0.01 }], skills: ["銀爪撕裂", "月光嚎叫"], description: "在月光下變形的狼人，爪子鋒利如銀刃。", isBoss: false, race: "妖化系" },
  { id: "metal-003", name: "機械傀儡", element: "metal", level: 6, hp: 120, attack: 20, defense: 18, speed: 6, expReward: 40, goldReward: [10, 25], dropItems: [{ itemId: "mat-metal-003", chance: 0.4 }, { itemId: "mat-metal-004", chance: 0.25 }], skills: ["機械拳擊", "金屬護盾", "電擊攻擊"], description: "廢棄工廠中自動運作的機械傀儡，程式已損壞。", isBoss: false, race: "金屬系" },
  { id: "metal-004", name: "鋼鐵武士", element: "metal", level: 10, hp: 200, attack: 35, defense: 28, speed: 10, expReward: 80, goldReward: [20, 40], dropItems: [{ itemId: "mat-metal-005", chance: 0.35 }, { itemId: "equip-metal-001", chance: 0.05 }, { itemId: "skill-metal-001", chance: 0.02 }], skills: ["武士斬擊", "鋼鐵防禦", "劍氣波動"], description: "由金屬能量凝聚而成的武士，劍術精湛。", isBoss: false, race: "人型系" },
  { id: "metal-005", name: "金礦守衛", element: "metal", level: 13, hp: 320, attack: 48, defense: 35, speed: 8, expReward: 140, goldReward: [35, 70], dropItems: [{ itemId: "mat-metal-006", chance: 0.35 }, { itemId: "mat-metal-007", chance: 0.2 }, { itemId: "skill-metal-001", chance: 0.03 }], skills: ["礦石投擲", "金屬強化", "礦坑崩塌"], description: "守護金礦的怪物，身上嵌著金色礦石。", isBoss: false, race: "金屬系" },
  { id: "metal-006", name: "白虎幼獸", element: "metal", level: 17, hp: 550, attack: 78, defense: 42, speed: 20, expReward: 220, goldReward: [55, 110], dropItems: [{ itemId: "mat-metal-008", chance: 0.3 }, { itemId: "equip-metal-002", chance: 0.07 }, { itemId: "skill-metal-001", chance: 0.04 }], skills: ["白虎斬擊", "金屬爪擊", "虎嘯震天"], description: "傳說中白虎的幼獸，爪子能切割金屬。", isBoss: false, race: "靈獸系" },
  { id: "metal-007", name: "鎧甲巨龜", element: "metal", level: 20, hp: 800, attack: 70, defense: 90, speed: 4, expReward: 300, goldReward: [75, 150], dropItems: [{ itemId: "mat-metal-009", chance: 0.25 }, { itemId: "skill-metal-001", chance: 0.04 }], skills: ["龜殼防禦", "金屬衝擊", "鎧甲強化"], description: "龜殼如鋼鐵的巨龜，幾乎無法被正面擊破。", isBoss: false, race: "靈獸系" },
  { id: "metal-008", name: "金屬巨人", element: "metal", level: 24, hp: 1100, attack: 130, defense: 100, speed: 7, expReward: 500, goldReward: [125, 250], dropItems: [{ itemId: "mat-metal-010", chance: 0.2 }, { itemId: "equip-metal-003", chance: 0.09 }], skills: ["金屬重拳", "鋼鐵護甲", "金屬爆炸"], description: "由純金屬凝聚而成的巨人，每一拳都能砸碎岩石。", isBoss: false, race: "金屬系" },
  { id: "metal-009", name: "白金龍幼體", element: "metal", level: 30, hp: 1800, attack: 180, defense: 140, speed: 16, expReward: 800, goldReward: [200, 400], dropItems: [{ itemId: "equip-metal-004", chance: 0.08 }], skills: ["白金龍爪", "金屬龍息", "金屬風暴"], description: "傳說中白金龍的幼體，鱗片堅硬無比。", isBoss: false, race: "龍種系" },
  { id: "metal-boss-001", name: "金靈神獸・白虎", element: "metal", level: 37, hp: 5800, attack: 260, defense: 220, speed: 28, expReward: 2300, goldReward: [580, 1160], dropItems: [{ itemId: "equip-metal-005", chance: 0.3 }, { itemId: "skill-metal-002", chance: 0.15 }, { itemId: "mat-metal-011", chance: 0.5 }], skills: ["白虎金爪", "金靈神域", "金屬颶風", "虎威震懾"], description: "五行金靈的化身，白虎出現時金屬皆顫。", isBoss: true, race: "天命系" },

  // ─── 水屬性怪物 ───
  { id: "water-001", name: "水靈精靈", element: "water", level: 1, hp: 28, attack: 6, defense: 3, speed: 7, expReward: 9, goldReward: [2, 6], dropItems: [{ itemId: "mat-water-001", chance: 0.55 }], skills: ["水珠射擊"], description: "在水邊嬉戲的小精靈，能操控水流。", isBoss: false, race: "靈獸系" },
  { id: "water-002", name: "河童", element: "water", level: 3, hp: 65, attack: 11, defense: 7, speed: 8, expReward: 19, goldReward: [5, 13], dropItems: [{ itemId: "mat-water-002", chance: 0.5 }, { itemId: "herb-water-001", chance: 0.35 }, { itemId: "skill-water-001", chance: 0.01 }], skills: ["水流衝擊", "河底拉扯"], description: "棲居於河川的河童，頭頂有一碟水，若水乾則失去力量。", isBoss: false, race: "妖化系" },
  { id: "water-003", name: "冰霜精靈", element: "water", level: 5, hp: 95, attack: 18, defense: 9, speed: 10, expReward: 36, goldReward: [9, 20], dropItems: [{ itemId: "mat-water-003", chance: 0.4 }, { itemId: "mat-water-004", chance: 0.25 }], skills: ["冰晶射擊", "冰霜護盾"], description: "在寒冷地帶出沒的精靈，觸碰會造成凍傷。", isBoss: false, race: "靈獸系" },
  { id: "water-004", name: "深海魚人", element: "water", level: 8, hp: 170, attack: 28, defense: 16, speed: 14, expReward: 68, goldReward: [17, 35], dropItems: [{ itemId: "mat-water-005", chance: 0.35 }, { itemId: "equip-water-001", chance: 0.04 }, { itemId: "skill-water-001", chance: 0.02 }], skills: ["魚叉投擲", "水流加速", "深海壓力"], description: "從深海爬上岸的魚人，能在水中快速移動。", isBoss: false, race: "水生系" },
  { id: "water-005", name: "海浪巨人", element: "water", level: 11, hp: 260, attack: 42, defense: 22, speed: 11, expReward: 110, goldReward: [28, 55], dropItems: [{ itemId: "mat-water-006", chance: 0.35 }, { itemId: "skill-water-001", chance: 0.025 }], skills: ["海浪衝擊", "水靈吸收", "洪水氾濫"], description: "由海浪凝聚而成的巨人，能召喚洪水。", isBoss: false, race: "水生系" },
  { id: "water-006", name: "冰龍幼體", element: "water", level: 15, hp: 480, attack: 68, defense: 38, speed: 16, expReward: 190, goldReward: [48, 95], dropItems: [{ itemId: "mat-water-007", chance: 0.3 }, { itemId: "equip-water-002", chance: 0.07 }, { itemId: "skill-water-001", chance: 0.04 }], skills: ["冰龍爪擊", "冰霜龍息", "冰封大地"], description: "棲居於高山冰川的龍幼體，呼出的氣息能結冰。", isBoss: false, race: "龍種系" },
  { id: "water-007", name: "水靈祭司", element: "water", level: 19, hp: 700, attack: 88, defense: 45, speed: 13, expReward: 280, goldReward: [70, 140], dropItems: [{ itemId: "mat-water-008", chance: 0.25 }, { itemId: "skill-water-001", chance: 0.04 }], skills: ["水靈詛咒", "治癒水流", "海嘯召喚"], description: "掌握水靈秘法的祭司，能治癒同伴也能詛咒敵人。", isBoss: false, race: "人型系" },
  { id: "water-008", name: "深淵章魚王", element: "water", level: 23, hp: 1000, attack: 115, defense: 65, speed: 12, expReward: 460, goldReward: [115, 230], dropItems: [{ itemId: "mat-water-009", chance: 0.2 }, { itemId: "equip-water-003", chance: 0.09 }], skills: ["觸手纏繞", "墨汁噴射", "深淵吸引"], description: "深海中的章魚王，八條觸手能同時攻擊。", isBoss: false, race: "水生系" },
  { id: "water-009", name: "海神使者", element: "water", level: 29, hp: 1700, attack: 170, defense: 100, speed: 22, expReward: 760, goldReward: [190, 380], dropItems: [{ itemId: "equip-water-004", chance: 0.08 }], skills: ["海神三叉戟", "水靈神力", "海嘯衝擊"], description: "海神派遣的使者，手持三叉戟，能掌控海洋。", isBoss: false, race: "人型系" },
  { id: "water-boss-001", name: "水靈神獸・玄武", element: "water", level: 36, hp: 5200, attack: 245, defense: 180, speed: 20, expReward: 2100, goldReward: [525, 1050], dropItems: [{ itemId: "equip-water-005", chance: 0.3 }, { itemId: "skill-water-002", chance: 0.15 }, { itemId: "mat-water-010", chance: 0.5 }], skills: ["玄武水盾", "水靈神域", "深海洪流", "龜蛇合體"], description: "五行水靈的化身，玄武出現時海洋翻騰。", isBoss: true, race: "天命系" },
];

// 依 ID 快速查找
export const MONSTER_MAP: Record<string, Monster> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);

// 依等級範圍篩選怪物
export function getMonstersForLevel(minLevel: number, maxLevel: number, element?: WuXing): Monster[] {
  return MONSTERS.filter(
    (m) =>
      m.level >= minLevel &&
      m.level <= maxLevel &&
      !m.isBoss &&
      (element === undefined || m.element === element)
  );
}

// 取得節點對應的怪物（依五行屬性和等級）
export function getMonstersForNode(nodeElement: WuXing, levelRange: [number, number]): Monster[] {
  const [min, max] = levelRange;
  const primary = getMonstersForLevel(min, max, nodeElement);
  if (primary.length > 0) return primary;
  return getMonstersForLevel(min, max);
}
