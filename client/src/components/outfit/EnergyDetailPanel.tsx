/**
 * EnergyDetailPanel - 五行能量說明 Panel
 * 點擊已選衣物/手串時，彈出詳細的五行能量說明卡片
 */
import { motion, AnimatePresence } from "framer-motion";
import type { BodyPart, SelectedItem } from "./InteractiveMannequin";

// 五行顏色
const WUXING_BG: Record<string, string> = {
  木: "#22C55E", 火: "#EF4444", 土: "#EAB308", 金: "#D1D5DB", 水: "#3B82F6",
};
const WUXING_GLOW: Record<string, string> = {
  木: "#22C55E30", 火: "#EF444430", 土: "#EAB30830", 金: "#D1D5DB30", 水: "#3B82F630",
};

// 部位中文名稱
const PART_LABELS: Record<BodyPart, string> = {
  upper: "上衣", lower: "下身", shoes: "鞋子", outer: "外套",
  accessory: "配件", bracelet: "手串",
  leftBracelet: "左手串", leftAccessory: "左配件",
  rightBracelet: "右手串", rightAccessory: "右配件",
};

// 五行對命格的說明（甲木日主：用神火>土>金，忌神水>木）
const WUXING_EFFECT: Record<string, {
  role: string;
  effect: string;
  bodyEffect: Record<"left" | "right" | "general", string>;
  tip: string;
  badge: string;
  badgeColor: string;
}> = {
  火: {
    role: "用神・才華之火",
    effect: "火為甲木日主的食傷星，代表才華、表達力與行動力。配戴火系能量可強化創造力、提升人際魅力，是最喜用的補運元素。",
    bodyEffect: {
      left: "左手吸納火能量，強化內在創造力與靈感，有助於思維活躍、直覺敏銳。",
      right: "右手釋放火能量，對外展現才華與魅力，提升社交影響力與表達能量。",
      general: "火系穿搭強化整體氣場，提升自信與行動力，是今日最推薦的補運色系。",
    },
    tip: "今日穿搭加入火系元素，能量加成最高，強烈推薦！",
    badge: "★ 喜用神",
    badgeColor: "#F59E0B",
  },
  土: {
    role: "喜神・財富之土",
    effect: "土為甲木日主的財星，代表財富、現實落地與穩定性。配戴土系能量有助於財運亨通、腳踏實地，是第二優先的補運元素。",
    bodyEffect: {
      left: "左手吸納土能量，強化財富吸引力，有助於積累物質資源與穩定感。",
      right: "右手釋放土能量，對外展現踏實可靠的形象，增強他人對你的信任感。",
      general: "土系穿搭強化財運氣場，有助於今日財務決策與商業洽談。",
    },
    tip: "土系元素有助財運，今日穿搭加入大地色系效果顯著。",
    badge: "◎ 喜神",
    badgeColor: "#EAB308",
  },
  金: {
    role: "喜神・規則之金",
    effect: "金為甲木日主的官殺星，代表規則、決斷力與防護能量。配戴金系能量有助於提升自律性、增強防護氣場，是第三優先的補運元素。",
    bodyEffect: {
      left: "左手吸納金能量，強化內在紀律與自我保護意識，有助於冷靜決策。",
      right: "右手釋放金能量，對外展現專業與威嚴，增強在職場上的影響力。",
      general: "金系穿搭強化防護氣場，適合需要展現專業形象的重要場合。",
    },
    tip: "金系元素強化防護，適合今日重要會議或需要展現專業的場合。",
    badge: "△ 喜神",
    badgeColor: "#9CA3AF",
  },
  水: {
    role: "忌神・過旺之水",
    effect: "水為甲木日主的印星，本命已含大量水木能量（水35%、木42%）。過多水能量會導致思慮過重、行動力下降，今日應避免水系元素。",
    bodyEffect: {
      left: "左手吸納水能量，可能加重過旺的印星，導致思慮過多、猶豫不決。",
      right: "右手釋放水能量，對外散發過多陰柔氣息，可能影響決斷力與行動力。",
      general: "水系穿搭會加重忌神能量，今日建議避免深藍、黑色等水系色彩。",
    },
    tip: "⚠️ 水系為忌神，今日穿搭建議避免，以免削弱行動力。",
    badge: "✕ 忌神",
    badgeColor: "#3B82F6",
  },
  木: {
    role: "忌神・過旺之木",
    effect: "木為甲木日主的比劫星，本命已含大量木能量（木42%）。過多木能量會導致競爭心過強、消耗自身資源，今日應避免木系元素。",
    bodyEffect: {
      left: "左手吸納木能量，可能加重過旺的比劫，增加競爭消耗與內耗。",
      right: "右手釋放木能量，對外散發過強的競爭氣息，可能引起不必要的摩擦。",
      general: "木系穿搭會加重忌神能量，今日建議避免綠色等木系色彩。",
    },
    tip: "⚠️ 木系為忌神，今日穿搭建議避免，以免加重比劫消耗。",
    badge: "✕ 忌神",
    badgeColor: "#22C55E",
  },
};

interface EnergyDetailPanelProps {
  open: boolean;
  onClose: () => void;
  part: BodyPart | null;
  item: SelectedItem | null;
  boostPoints?: number; // 來自 boostBreakdown
  boostReason?: string; // 來自 boostBreakdown
}

export function EnergyDetailPanel({
  open,
  onClose,
  part,
  item,
  boostPoints,
  boostReason,
}: EnergyDetailPanelProps) {
  if (!part || !item) return null;

  const wuxing = item.wuxing;
  const info = WUXING_EFFECT[wuxing];
  const partLabel = PART_LABELS[part];
  const isLeftHand = part === "leftBracelet" || part === "leftAccessory";
  const isRightHand = part === "rightBracelet" || part === "rightAccessory";
  const isBracelet = part.includes("Bracelet") || part === "bracelet";

  const handEffect = isLeftHand
    ? info?.bodyEffect.left
    : isRightHand
    ? info?.bodyEffect.right
    : info?.bodyEffect.general;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
          >
            <div
              className="rounded-t-3xl border-t border-x border-white/10 p-5 pb-8"
              style={{
                background: `linear-gradient(135deg, ${WUXING_GLOW[wuxing] ?? "#1F2937"} 0%, #0a0a0f 60%)`,
              }}
            >
              {/* 拖曳指示條 */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              {/* 標題列 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* 五行色點 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2"
                    style={{
                      backgroundColor: WUXING_BG[wuxing] + "20",
                      borderColor: WUXING_BG[wuxing] + "60",
                    }}
                  >
                    {isBracelet ? "📿" : partLabel === "上衣" ? "👕" : partLabel === "下身" ? "👖" : partLabel === "鞋子" ? "👟" : partLabel === "外套" ? "🧥" : "💍"}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-base">
                      {item.name ?? item.color} · {partLabel}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: WUXING_BG[wuxing] }}
                      />
                      <span className="text-xs" style={{ color: WUXING_BG[wuxing] }}>
                        {wuxing}行
                      </span>
                      {info && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full border"
                          style={{
                            color: info.badgeColor,
                            borderColor: info.badgeColor + "40",
                            backgroundColor: info.badgeColor + "15",
                          }}
                        >
                          {info.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* 五行角色說明 */}
              {info && (
                <div className="space-y-3">
                  {/* 角色定位 */}
                  <div
                    className="rounded-xl p-3 border"
                    style={{
                      backgroundColor: WUXING_BG[wuxing] + "10",
                      borderColor: WUXING_BG[wuxing] + "30",
                    }}
                  >
                    <div className="text-xs font-semibold mb-1" style={{ color: WUXING_BG[wuxing] }}>
                      {info.role}
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{info.effect}</p>
                  </div>

                  {/* 左右手 / 穿搭效果 */}
                  {(isLeftHand || isRightHand) && (
                    <div
                      className="rounded-xl p-3 border"
                      style={{
                        backgroundColor: isLeftHand ? "#10B98110" : "#F59E0B10",
                        borderColor: isLeftHand ? "#10B98130" : "#F59E0B30",
                      }}
                    >
                      <div
                        className="text-xs font-semibold mb-1"
                        style={{ color: isLeftHand ? "#10B981" : "#F59E0B" }}
                      >
                        {isLeftHand ? "🌿 左手吸納效果" : "☀️ 右手釋放效果"}
                      </div>
                      <p className="text-white/70 text-xs leading-relaxed">{handEffect}</p>
                    </div>
                  )}
                  {!isLeftHand && !isRightHand && (
                    <div className="rounded-xl p-3 border border-white/10 bg-white/5">
                      <div className="text-xs font-semibold text-white/50 mb-1">✨ 穿搭能量效果</div>
                      <p className="text-white/70 text-xs leading-relaxed">{handEffect}</p>
                    </div>
                  )}

                  {/* Aura 加成點數 */}
                  {boostPoints !== undefined && boostPoints > 0 && (
                    <div className="rounded-xl p-3 border border-amber-500/30 bg-amber-900/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-400">⚡ Aura 加成</span>
                        <span className="text-amber-300 font-bold text-sm">+{boostPoints} pts</span>
                      </div>
                      {boostReason && (
                        <p className="text-amber-200/60 text-xs mt-1 leading-relaxed">{boostReason}</p>
                      )}
                    </div>
                  )}

                  {/* 神諭提示 */}
                  <div className="rounded-xl p-3 border border-white/5 bg-white/3">
                    <p className="text-white/40 text-xs leading-relaxed">
                      <span className="text-amber-400/80">💡 神諭提示：</span>
                      {info.tip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
