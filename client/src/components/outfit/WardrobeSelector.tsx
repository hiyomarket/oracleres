import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { BodyPart, SelectedItem } from "./InteractiveMannequin";

// 五行顏色選項
const WUXING_COLOR_OPTIONS: Array<{
  wuxing: string;
  colors: Array<{ name: string; hex: string }>;
  label: string;
  emoji: string;
}> = [
  {
    wuxing: "火",
    label: "火系",
    emoji: "🔥",
    colors: [
      { name: "紅色", hex: "#EF4444" },
      { name: "深紅", hex: "#991B1B" },
      { name: "橘色", hex: "#F97316" },
      { name: "粉紅", hex: "#EC4899" },
      { name: "紫色", hex: "#8B5CF6" },
      { name: "酒紅", hex: "#7F1D1D" },
    ],
  },
  {
    wuxing: "木",
    label: "木系",
    emoji: "🌿",
    colors: [
      { name: "綠色", hex: "#22C55E" },
      { name: "深綠", hex: "#14532D" },
      { name: "草綠", hex: "#84CC16" },
      { name: "青色", hex: "#06B6D4" },
      { name: "橄欖綠", hex: "#65A30D" },
    ],
  },
  {
    wuxing: "土",
    label: "土系",
    emoji: "🌍",
    colors: [
      { name: "黃色", hex: "#EAB308" },
      { name: "棕色", hex: "#92400E" },
      { name: "米色", hex: "#FEF3C7" },
      { name: "卡其", hex: "#A16207" },
      { name: "奶油色", hex: "#FFFBEB" },
      { name: "駝色", hex: "#D97706" },
    ],
  },
  {
    wuxing: "金",
    label: "金系",
    emoji: "✨",
    colors: [
      { name: "白色", hex: "#F9FAFB" },
      { name: "銀色", hex: "#D1D5DB" },
      { name: "金色", hex: "#F59E0B" },
      { name: "香檳色", hex: "#FDE68A" },
      { name: "灰色", hex: "#6B7280" },
    ],
  },
  {
    wuxing: "水",
    label: "水系",
    emoji: "💧",
    colors: [
      { name: "黑色", hex: "#111827" },
      { name: "深藍", hex: "#1E3A5F" },
      { name: "藍色", hex: "#3B82F6" },
      { name: "海軍藍", hex: "#1E40AF" },
      { name: "深灰", hex: "#374151" },
    ],
  },
];

const PART_LABELS: Record<BodyPart, string> = {
  upper: "上衣",
  lower: "下身",
  shoes: "鞋子",
  outer: "外套",
  accessory: "配件",
  bracelet: "手串",
};

interface WardrobeItem {
  id: number;
  name: string;
  category: string;
  color: string;
  wuxing: string;
  occasion?: string | null;
}

interface BraceletItem {
  code: string;
  name: string;
  element: string;
  color: string;
  function: string;
}

interface SystemRecommendation {
  color: string;
  wuxing: string;
  reason: string;
}

interface WardrobeSelectorProps {
  open: boolean;
  onClose: () => void;
  part: BodyPart | null;
  onSelect: (part: BodyPart, item: SelectedItem) => void;
  wardrobeItems: WardrobeItem[];
  bracelets: BraceletItem[];
  systemRecommendation?: SystemRecommendation;
  favorableElements?: string[];
}

const WUXING_BG: Record<string, string> = {
  木: "#22C55E",
  火: "#EF4444",
  土: "#EAB308",
  金: "#D1D5DB",
  水: "#3B82F6",
};

export function WardrobeSelector({
  open,
  onClose,
  part,
  onSelect,
  wardrobeItems,
  bracelets,
  systemRecommendation,
  favorableElements = [],
}: WardrobeSelectorProps) {
  const [activeTab, setActiveTab] = useState<"recommend" | "wardrobe" | "explore">("recommend");

  if (!part) return null;

  const partLabel = PART_LABELS[part];
  const partItems = part === "bracelet"
    ? [] // 手串從 bracelets 列表選
    : wardrobeItems.filter(i => i.category === part);

  function handleColorSelect(colorName: string, wuxing: string) {
    if (!part) return;
    onSelect(part, { color: colorName, wuxing, name: colorName });
    onClose();
  }

  function handleWardrobeItemSelect(item: WardrobeItem) {
    if (!part) return;
    onSelect(part, { color: item.color, wuxing: item.wuxing, name: item.name });
    onClose();
  }

  function handleBraceletSelect(bracelet: BraceletItem) {
    if (!part) return;
    onSelect(part, { color: bracelet.color, wuxing: bracelet.element, name: bracelet.name });
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[80vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-white text-lg">
            選擇{partLabel}
          </SheetTitle>
        </SheetHeader>

        {/* Tab 切換 */}
        <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
          {(["recommend", "wardrobe", "explore"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-amber-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "recommend" ? "⭐ 系統推薦" : tab === "wardrobe" ? "👗 我的衣櫥" : "🎨 探索顏色"}
            </button>
          ))}
        </div>

        {/* 系統推薦 Tab */}
        {activeTab === "recommend" && (
          <div className="space-y-3">
            {part === "bracelet" ? (
              // 手串推薦
              <div>
                <p className="text-xs text-gray-400 mb-3">
                  根據您今日的喜用神，以下手串能量最佳：
                </p>
                <div className="space-y-2">
                  {bracelets
                    .filter(b => favorableElements.includes(b.element))
                    .slice(0, 3)
                    .map((bracelet) => (
                      <button
                        key={bracelet.code}
                        onClick={() => handleBraceletSelect(bracelet)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-900/30 border border-amber-500/50 hover:bg-amber-900/50 transition-all text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center text-lg"
                          style={{ backgroundColor: WUXING_BG[bracelet.element] + "30" }}
                        >
                          📿
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{bracelet.name}</span>
                            <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full">⭐推薦</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{bracelet.function}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: WUXING_BG[bracelet.element] }}
                            />
                            <span className="text-[10px]" style={{ color: WUXING_BG[bracelet.element] }}>
                              {bracelet.element}系能量
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  {bracelets
                    .filter(b => favorableElements.includes(b.element))
                    .length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      暫無符合今日喜用神的手串推薦
                    </p>
                  )}
                </div>
              </div>
            ) : systemRecommendation ? (
              // 衣物推薦
              <div>
                <button
                  onClick={() => handleColorSelect(systemRecommendation.color, systemRecommendation.wuxing)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-amber-900/30 border border-amber-500/50 hover:bg-amber-900/50 transition-all text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl border-2 border-amber-400"
                    style={{ backgroundColor: WUXING_BG[systemRecommendation.wuxing] ?? "#6B7280" }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{systemRecommendation.color}</span>
                      <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full">⭐ 最佳推薦</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{systemRecommendation.reason}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: WUXING_BG[systemRecommendation.wuxing] }}
                      />
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: WUXING_BG[systemRecommendation.wuxing] }}
                      >
                        {systemRecommendation.wuxing}系 · 今日補運首選
                      </span>
                    </div>
                  </div>
                </button>

                {/* 次選推薦 */}
                <p className="text-xs text-gray-500 mt-3 mb-2">其他推薦顏色：</p>
                <div className="flex flex-wrap gap-2">
                  {WUXING_COLOR_OPTIONS
                    .filter(g => favorableElements.includes(g.wuxing))
                    .flatMap(g => g.colors.slice(0, 2).map(c => ({ ...c, wuxing: g.wuxing })))
                    .slice(0, 6)
                    .map((c) => (
                      <button
                        key={c.name}
                        onClick={() => handleColorSelect(c.name, c.wuxing)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-600 hover:border-amber-500 transition-all text-xs"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                        <span className="text-gray-300">{c.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">載入推薦中...</p>
            )}
          </div>
        )}

        {/* 我的衣櫥 Tab */}
        {activeTab === "wardrobe" && (
          <div>
            {part === "bracelet" ? (
              <div className="space-y-2">
                {bracelets.map((bracelet) => (
                  <button
                    key={bracelet.code}
                    onClick={() => handleBraceletSelect(bracelet)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 transition-all text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: WUXING_BG[bracelet.element] + "20" }}
                    >
                      📿
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{bracelet.name}</div>
                      <div className="text-xs text-gray-400">{bracelet.function}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: WUXING_BG[bracelet.element] }} />
                        <span className="text-[10px]" style={{ color: WUXING_BG[bracelet.element] }}>
                          {bracelet.element}系
                        </span>
                        {favorableElements.includes(bracelet.element) && (
                          <span className="text-[10px] text-amber-400">★ 喜用神</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : partItems.length > 0 ? (
              <div className="space-y-2">
                {partItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleWardrobeItemSelect(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 transition-all text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-lg border border-gray-600"
                      style={{ backgroundColor: WUXING_BG[item.wuxing] ?? "#6B7280" }}
                    />
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{item.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{item.color}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: WUXING_BG[item.wuxing] }} />
                          <span className="text-[10px]" style={{ color: WUXING_BG[item.wuxing] }}>
                            {item.wuxing}系
                          </span>
                        </div>
                        {favorableElements.includes(item.wuxing) && (
                          <span className="text-[10px] text-amber-400">★ 喜用神</span>
                        )}
                      </div>
                      {item.occasion && (
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.occasion}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">衣櫥中暫無{partLabel}</p>
                <p className="text-gray-600 text-xs mt-1">
                  前往「虛擬衣櫥」頁面新增衣物
                </p>
              </div>
            )}
          </div>
        )}

        {/* 探索顏色 Tab */}
        {activeTab === "explore" && (
          <div className="space-y-4">
            {WUXING_COLOR_OPTIONS.map((group) => (
              <div key={group.wuxing}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{group.emoji}</span>
                  <span className="text-sm font-medium" style={{ color: WUXING_BG[group.wuxing] }}>
                    {group.label}（{group.wuxing}）
                  </span>
                  {favorableElements.includes(group.wuxing) && (
                    <span className="text-[10px] bg-amber-600/30 text-amber-400 px-1.5 py-0.5 rounded-full">
                      ★ 今日喜用神
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleColorSelect(color.name, group.wuxing)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-700 hover:border-gray-500 transition-all text-xs"
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-gray-300">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部間距 */}
        <div className="h-6" />
      </SheetContent>
    </Sheet>
  );
}
