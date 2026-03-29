/**
 * 統一 AI 圖片風格 — 庫洛魔法使封印卡 (Cardcaptor Sakura Clow Card) 風格
 * 華麗可愛巴洛克風，純圖片無文字
 * 
 * 所有圖鑑圖片（寵物/道具/裝備/技能/魔物/Boss）都使用此風格生成器
 */

const BASE_STYLE = `Japanese anime Cardcaptor Sakura Clow Card style illustration. Ornate baroque frame with golden filigree borders and celestial motifs. Elegant, cute, and magical aesthetic. Rich jewel-tone colors with soft pastel highlights. Intricate Art Nouveau decorative elements. Mystical glowing aura. No text, no words, no letters, no numbers on the card. Pure visual illustration only. High detail, professional card game art quality.`;

const WUXING_PALETTE: Record<string, string> = {
  "木": "emerald green and jade tones, vine and leaf ornaments in the frame, wood element energy",
  "火": "ruby red and amber tones, flame and phoenix ornaments in the frame, fire element energy",
  "土": "golden amber and earth brown tones, crystal and mountain ornaments in the frame, earth element energy",
  "金": "platinum silver and white gold tones, metallic filigree and blade ornaments in the frame, metal element energy",
  "水": "sapphire blue and aquamarine tones, wave and moon ornaments in the frame, water element energy",
  wood: "emerald green and jade tones, vine and leaf ornaments in the frame, wood element energy",
  fire: "ruby red and amber tones, flame and phoenix ornaments in the frame, fire element energy",
  earth: "golden amber and earth brown tones, crystal and mountain ornaments in the frame, earth element energy",
  metal: "platinum silver and white gold tones, metallic filigree and blade ornaments in the frame, metal element energy",
  water: "sapphire blue and aquamarine tones, wave and moon ornaments in the frame, water element energy",
};

const RARITY_GLOW: Record<string, string> = {
  common: "subtle silver shimmer around the frame edges",
  rare: "gentle blue-white magical glow emanating from the card",
  epic: "brilliant purple-gold aurora surrounding the card with sparkle particles",
  legendary: "divine golden radiance with rainbow prismatic light rays and celestial halos",
};

/**
 * 寵物圖鑑 prompt
 */
export function petCardPrompt(pet: {
  name: string;
  description?: string | null;
  race: string;
  wuxing: string;
  rarity: string;
}): string {
  const raceVisual: Record<string, string> = {
    dragon: "majestic dragon creature with scales and horns",
    undead: "ethereal spectral creature with ghostly wisps",
    normal: "adorable natural creature with soft fur",
    flying: "graceful winged creature soaring elegantly",
    insect: "mystical insect creature with iridescent carapace",
    plant: "enchanted plant creature with blooming flowers and vines",
  };

  return `${BASE_STYLE}
Subject: A single magical creature centered on the card — ${raceVisual[pet.race] || "mystical fantasy creature"}.
Creature name inspiration: "${pet.name}" (${pet.description || "mysterious magical being"}).
Color palette: ${WUXING_PALETTE[pet.wuxing] || "mystical rainbow tones"}.
Card quality: ${RARITY_GLOW[pet.rarity] || "subtle shimmer"}.
The creature should look cute yet powerful, in a dynamic but elegant pose within the ornate card frame.`;
}

/**
 * 道具圖鑑 prompt
 */
export function itemCardPrompt(item: {
  name: string;
  description?: string | null;
  wuxing: string;
  rarity: string;
  category: string;
}): string {
  const categoryVisual: Record<string, string> = {
    material: "raw magical material — glowing crystal, enchanted herb, or mystical ore",
    consumable: "elegant potion bottle or magical scroll with swirling energy",
    treasure: "precious jeweled artifact radiating magical power",
    quest: "ancient mystical relic inscribed with glowing runes",
    food: "beautifully prepared magical cuisine with ethereal steam",
    gem: "brilliant faceted gemstone with inner magical light",
  };

  return `${BASE_STYLE}
Subject: A single magical item centered on the card — ${categoryVisual[item.category] || "mysterious enchanted object"}.
Item name inspiration: "${item.name}" (${item.description || "magical artifact"}).
Color palette: ${WUXING_PALETTE[item.wuxing] || "mystical rainbow tones"}.
Card quality: ${RARITY_GLOW[item.rarity] || "subtle shimmer"}.
The item should appear precious and magical, floating with a soft glow within the ornate card frame.`;
}

/**
 * 裝備圖鑑 prompt
 */
export function equipCardPrompt(equip: {
  name: string;
  description?: string | null;
  wuxing: string;
  rarity: string;
  slot: string;
  tier?: number | null;
}): string {
  const slotVisual: Record<string, string> = {
    weapon: "ornate fantasy weapon — elegant sword, mystical staff, or enchanted bow",
    head: "regal crown or mystical helmet with magical gems",
    body: "magnificent armor or flowing enchanted robe",
    legs: "elegant magical boots with glowing runes",
    accessory: "precious magical accessory — enchanted ring, mystical pendant, or celestial charm",
    shield: "ornate magical shield with protective runes and emblems",
  };

  return `${BASE_STYLE}
Subject: A single piece of magical equipment centered on the card — ${slotVisual[equip.slot] || "mystical enchanted gear"}.
Equipment name inspiration: "${equip.name}" (${equip.description || "powerful magical equipment"}).
Color palette: ${WUXING_PALETTE[equip.wuxing] || "mystical rainbow tones"}.
Card quality: ${RARITY_GLOW[equip.rarity] || "subtle shimmer"}.
Tier level: ${equip.tier || 1} (higher tier = more elaborate decorations).
The equipment should look powerful and elegant, displayed prominently within the ornate card frame.`;
}

/**
 * 技能書圖鑑 prompt
 */
export function skillCardPrompt(skill: {
  name: string;
  description?: string | null;
  wuxing: string;
  rarity: string;
  skillType: string;
  tier?: number | null;
}): string {
  const typeVisual: Record<string, string> = {
    attack: "explosive magical energy burst with dynamic force lines",
    defense: "shimmering protective barrier with magical shields",
    heal: "gentle healing light with floating petals and sparkles",
    buff: "empowering magical aura with ascending energy spirals",
    debuff: "dark mystical curse energy with swirling shadows",
    special: "unique cosmic magical phenomenon with celestial symbols",
  };

  return `${BASE_STYLE}
Subject: A magical spell card depicting ${typeVisual[skill.skillType] || "mystical magical energy"}.
Skill name inspiration: "${skill.name}" (${skill.description || "powerful magical technique"}).
Color palette: ${WUXING_PALETTE[skill.wuxing] || "mystical rainbow tones"}.
Card quality: ${RARITY_GLOW[skill.rarity] || "subtle shimmer"}.
The magical effect should be visually stunning and dynamic within the ornate card frame, conveying the spell's power.`;
}

/**
 * 魔物圖鑑 prompt（也用於 Boss）
 * 已更新：支援 species 欄位（10 種族）+ 五行百分比色彩混合
 */
export function monsterCardPrompt(monster: {
  name: string;
  description?: string | null;
  wuxing?: string | null;
  race?: string | null;
  species?: string | null;
  rarity?: string | null;
  tier?: number | null;
  wuxingWood?: number | null;
  wuxingFire?: number | null;
  wuxingEarth?: number | null;
  wuxingMetal?: number | null;
  wuxingWater?: number | null;
}): string {
  // 10 種族視覺描述（對應 GD-028 新種族系統）
  const speciesVisual: Record<string, string> = {
    beast: "fearsome magical beast with primal power, muscular body and sharp claws",
    humanoid: "powerful humanoid warrior with magical armor and intelligent eyes",
    plant: "ancient sentient plant creature with thorny vines and blooming flowers",
    undead: "terrifying spectral undead with ghostly flames and skeletal features",
    dragon: "mighty dragon creature with shimmering scales and elemental breath",
    flying: "graceful winged creature soaring with feathered or membranous wings",
    insect: "giant mystical insect with crystalline carapace and compound eyes",
    special: "enigmatic magical entity made of pure crystallized energy",
    metal: "imposing metallic construct with gleaming armor plating and gear joints",
    demon: "menacing dark demon with horns, dark energy aura and glowing eyes",
  };

  // 舊版 race 欄位向下相容
  const raceVisual: Record<string, string> = {
    beast: speciesVisual.beast,
    undead: speciesVisual.undead,
    demon: speciesVisual.demon,
    dragon: speciesVisual.dragon,
    elemental: "pure elemental being made of raw magical energy",
    humanoid: speciesVisual.humanoid,
    insect: speciesVisual.insect,
    plant: speciesVisual.plant,
    spirit: "ethereal spirit being with translucent magical form",
  };

  // 五行色彩混合：根據五行百分比生成混合色彩描述
  const WUXING_COLOR_KEYWORDS: Record<string, string> = {
    wood: "emerald green, jade, forest tones",
    fire: "ruby red, crimson, amber flame tones",
    earth: "golden amber, earth brown, ochre tones",
    metal: "platinum silver, white gold, steel tones",
    water: "sapphire blue, aquamarine, deep ocean tones",
  };

  let colorDesc = "";
  const wuxingValues = [
    { key: "wood", val: monster.wuxingWood ?? 0 },
    { key: "fire", val: monster.wuxingFire ?? 0 },
    { key: "earth", val: monster.wuxingEarth ?? 0 },
    { key: "metal", val: monster.wuxingMetal ?? 0 },
    { key: "water", val: monster.wuxingWater ?? 0 },
  ].filter(w => w.val > 0).sort((a, b) => b.val - a.val);

  if (wuxingValues.length > 0) {
    const parts = wuxingValues.map(w => {
      if (w.val >= 80) return `Dominant ${WUXING_COLOR_KEYWORDS[w.key]} (${w.val}% intensity)`;
      if (w.val >= 50) return `Primary ${WUXING_COLOR_KEYWORDS[w.key]} (${w.val}%)`;
      if (w.val >= 30) return `Secondary ${WUXING_COLOR_KEYWORDS[w.key]} (${w.val}%)`;
      return `Accent ${WUXING_COLOR_KEYWORDS[w.key]} (${w.val}%)`;
    });
    colorDesc = parts.join(". ") + ".";
  } else {
    colorDesc = WUXING_PALETTE[monster.wuxing || "火"] || "dark crimson and shadow tones";
  }

  // 使用 species 優先，fallback 到 race
  const creatureType = monster.species
    ? speciesVisual[monster.species] || "terrifying magical creature"
    : raceVisual[monster.race || "beast"] || "terrifying magical creature";

  const tierDesc = monster.tier && monster.tier >= 3
    ? "Boss-level creature — extra imposing and terrifying, with a dark menacing aura"
    : monster.tier === 2
    ? "Elite creature — powerful and intimidating with visible magical energy"
    : "Regular creature — dangerous but not overwhelming";

  // 稀有度增強描述
  const rarityEnhance: Record<string, string> = {
    common: "Simple design, natural appearance",
    uncommon: "Slightly enhanced features with faint magical markings",
    rare: "Distinct magical markings, glowing eyes, visible elemental energy",
    epic: "Elaborate magical patterns across body, intense elemental aura, larger and more imposing",
    legendary: "Transcendent divine creature, reality-warping presence, celestial markings, overwhelming power",
  };

  return `${BASE_STYLE}
Subject: A single fearsome monster centered on the card — ${creatureType}.
Monster name inspiration: "${monster.name}" (${monster.description || "dangerous magical beast"}).
Color palette: ${colorDesc}
Frame ornaments: ${WUXING_PALETTE[monster.wuxing || "火"] || "mystical ornaments"}.
Card quality: ${RARITY_GLOW[monster.rarity || "rare"] || "ominous glow"}.
Power level: ${tierDesc}.
Visual enhancement: ${rarityEnhance[monster.rarity || "common"] || "natural appearance"}.
The monster should look menacing yet beautifully illustrated in the ornate card frame, conveying danger and power.`;
}

/**
 * 成就徽章圖鑑 prompt
 */
export function achievementCardPrompt(ach: {
  title: string;
  description?: string | null;
  category: string;
  rarity: string;
}): string {
  const categoryVisual: Record<string, string> = {
    avatar: "heroic portrait medallion with a noble character silhouette",
    explore: "ancient compass and map with glowing trail markers",
    combat: "crossed swords and shield with battle energy",
    oracle: "mystical divination orb with swirling cosmic energy",
    social: "intertwined golden rings symbolizing bonds and friendship",
    collection: "treasure chest overflowing with magical artifacts",
  };

  return `${BASE_STYLE}
Subject: A magical achievement badge centered on the card — ${categoryVisual[ach.category] || "radiant magical emblem"}.
Achievement name inspiration: "${ach.title}" (${ach.description || "legendary accomplishment"}).
Card quality: ${RARITY_GLOW[ach.rarity] || "subtle shimmer"}.
The badge should look prestigious and rewarding, with a sense of accomplishment, within the ornate card frame.`;
}

/**
 * Boss 圖鑑 prompt（比一般魔物更霸氣）
 */
export function bossCardPrompt(boss: {
  name: string;
  title?: string | null;
  description?: string | null;
  wuxing: string;
  tier: number;
}): string {
  const tierVisual: Record<number, string> = {
    1: "Elite roaming creature — powerful with visible magical aura, slightly larger than normal",
    2: "Regional guardian boss — massive and intimidating, surrounded by elemental energy storms",
    3: "Legendary calamity beast — colossal and terrifying, reality warping around it, divine-level threat",
  };

  return `${BASE_STYLE}
Subject: A fearsome BOSS monster centered on the card — ${tierVisual[boss.tier] || "powerful magical boss creature"}.
Boss name: "${boss.name}" ${boss.title ? `"${boss.title}"` : ""} (${boss.description || "legendary world boss"}).
Color palette: ${WUXING_PALETTE[boss.wuxing] || "dark crimson and shadow tones"}.
Card quality: ${RARITY_GLOW[boss.tier >= 3 ? "legendary" : boss.tier >= 2 ? "epic" : "rare"] || "ominous glow"}.
The boss should look extremely menacing and powerful, dominating the card frame with an overwhelming presence. Dark dramatic lighting with intense magical energy.`;
}
