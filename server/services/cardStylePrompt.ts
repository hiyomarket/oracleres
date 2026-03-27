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
 */
export function monsterCardPrompt(monster: {
  name: string;
  description?: string | null;
  wuxing?: string | null;
  race?: string | null;
  rarity?: string | null;
  tier?: number | null;
}): string {
  const raceVisual: Record<string, string> = {
    beast: "fearsome magical beast with primal power",
    undead: "terrifying spectral undead with ghostly flames",
    demon: "menacing dark demon with horns and dark energy",
    dragon: "mighty dragon creature with scales and elemental breath",
    elemental: "pure elemental being made of raw magical energy",
    humanoid: "powerful humanoid warrior with magical armor",
    insect: "giant mystical insect with crystalline carapace",
    plant: "ancient sentient plant creature with thorny vines",
    spirit: "ethereal spirit being with translucent magical form",
  };

  const tierDesc = monster.tier && monster.tier >= 3
    ? "Boss-level creature — extra imposing and terrifying, with a dark menacing aura"
    : monster.tier === 2
    ? "Elite creature — powerful and intimidating with visible magical energy"
    : "Regular creature — dangerous but not overwhelming";

  return `${BASE_STYLE}
Subject: A single fearsome monster centered on the card — ${raceVisual[monster.race || "beast"] || "terrifying magical creature"}.
Monster name inspiration: "${monster.name}" (${monster.description || "dangerous magical beast"}).
Color palette: ${WUXING_PALETTE[monster.wuxing || "火"] || "dark crimson and shadow tones"}.
Card quality: ${RARITY_GLOW[monster.rarity || "rare"] || "ominous glow"}.
Power level: ${tierDesc}.
The monster should look menacing yet beautifully illustrated in the ornate card frame, conveying danger and power.`;
}
