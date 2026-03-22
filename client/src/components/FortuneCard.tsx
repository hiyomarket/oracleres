import { useState, useEffect } from "react";

interface Fortune {
  overall: string;
  overall_score: number;
  summary: string;
  love: string;
  career: string;
  wealth: string;
  health: string;
  lucky_color: string;
  lucky_number: number;
  advice: string;
  element: string;
}

interface FortuneCardProps {
  fortune: Fortune;
  birthdate: string;
  onClose?: () => void;
}

const ELEMENT_COLORS: Record<string, string> = {
  金: "#C9A227", 木: "#4CAF50", 水: "#00CED1", 火: "#FF6B6B", 土: "#D4A574",
};

const ASPECT_ICONS: Record<string, string> = {
  love: "♥", career: "⚡", wealth: "◈", health: "✦",
};

const JINANG_CDN = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663104688923/RyvtZMsLTpyDpRnT.png";

export default function FortuneCard({ fortune, birthdate, onClose }: FortuneCardProps) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"bag" | "opening" | "content">("bag");

  useEffect(() => {
    setVisible(true);
    const t1 = setTimeout(() => setPhase("opening"), 300);
    const t2 = setTimeout(() => setPhase("content"), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const elementColor = ELEMENT_COLORS[fortune.element] || "#C9A227";
  const aspects = [
    { key: "love", label: "感情運", value: fortune.love },
    { key: "career", label: "事業運", value: fortune.career },
    { key: "wealth", label: "財運", value: fortune.wealth },
    { key: "health", label: "健康運", value: fortune.health },
  ];

  return (
    <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {/* 錦囊開啟動畫（bag → opening → content） */}
      {phase !== "content" && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className={`relative ${phase === "opening" ? "jinang-opening" : ""}`} style={{ width: 120, height: 120 }}>
            <img src={JINANG_CDN} alt="數位錦囊" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(201,162,39,0.8)]" />
            {phase === "opening" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-2 border-[#C9A227]/60 animate-ping" />
              </div>
            )}
          </div>
          <p className="text-[#C9A227] font-medium animate-pulse text-sm tracking-widest">
            {phase === "bag" ? "開啟天命錦囊..." : "解讀命盤中..."}
          </p>
        </div>
      )}

      {/* 運勢內容 */}
      {phase === "content" && (
        <div className="space-y-4">
          {/* 標題列 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground tracking-widest mb-1">{birthdate} 的今日天命</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-[#C9A227]">{fortune.overall}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: elementColor + "20", color: elementColor, border: `1px solid ${elementColor}40` }}>
                  {fortune.element}行主導
                </span>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none" aria-label="關閉">✕</button>
            )}
          </div>

          {/* 運勢總結 */}
          <div className="rounded-xl p-4 text-center"
            style={{ background: `linear-gradient(135deg, ${elementColor}15, transparent)`, border: `1px solid ${elementColor}30` }}>
            <p className="text-sm leading-relaxed text-foreground/90 font-medium">{fortune.summary}</p>
          </div>

          {/* 四大運勢 */}
          <div className="grid grid-cols-2 gap-2">
            {aspects.map(({ key, label, value }) => (
              <div key={key} className="glass-card rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[#C9A227] text-xs">{ASPECT_ICONS[key]}</span>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/80">{value}</p>
              </div>
            ))}
          </div>

          {/* 幸運資訊 */}
          <div className="flex gap-3">
            <div className="flex-1 glass-card rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">幸運色</p>
              <p className="text-sm font-medium text-[#C9A227]">{fortune.lucky_color}</p>
            </div>
            <div className="flex-1 glass-card rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">幸運數字</p>
              <p className="text-xl font-bold text-[#C9A227]">{fortune.lucky_number}</p>
            </div>
          </div>

          {/* 天命錦囊建議 */}
          <div className="rounded-xl p-4"
            style={{ background: "linear-gradient(135deg, rgba(201,162,39,0.1), rgba(0,206,209,0.05))", border: "1px solid rgba(201,162,39,0.3)" }}>
            <div className="flex items-center gap-2 mb-2">
              <img src={JINANG_CDN} alt="錦囊" className="w-5 h-5 object-contain" />
              <span className="text-xs font-medium text-[#C9A227] tracking-widest">天命錦囊</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90 italic">{fortune.advice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
