export declare const QUEST_NPCS: Array<{
  code: string;
  name: string;
  title?: string;
  location?: string;
  region?: string;
}>;

export declare const QUEST_SKILLS: Array<{
  code: string;
  name: string;
  questTitle?: string;
  category: string;
  skillType?: string;
  description?: string;
  wuxing?: string;
  powerPercent?: number;
  mpCost?: number;
  cooldown?: number;
  maxLevel?: number;
  levelUpBonus?: number;
  additionalEffect?: any;
  specialMechanic?: any;
  learnCost?: any;
  prerequisites?: any;
  rarity?: string;
  sortOrder?: number;
  npcCode?: string;
}>;

export declare const QUEST_STEPS: Record<string, Array<{
  stepNumber: number;
  title: string;
  dialogue?: string;
  objective?: string;
  location?: string;
  objectives?: any;
  rewards?: any;
}>>;
