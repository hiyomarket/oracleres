import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading } = useAuth();

  const { data: worldStatus } = trpc.game.getWorldStatus.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const WUXING_COLORS = {
    wood: "text-emerald-400",
    fire: "text-orange-400",
    earth: "text-yellow-400",
    metal: "text-slate-300",
    water: "text-blue-400",
  };

  const WUXING_NAMES = {
    wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center relative overflow-hidden">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-400 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-400 blur-3xl" />
      </div>

      {/* 掃描線 */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)"
      }} />

      <div className="relative z-10 text-center space-y-8 px-4 max-w-2xl">
        {/* 標題 */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-sm tracking-widest">
            ── 天命共振 ──
          </div>
          <h1 className="text-5xl font-bold text-primary" style={{ textShadow: "0 0 20px currentColor" }}>
            靈相虛界
          </h1>
          <div className="text-muted-foreground text-sm tracking-wider">
            ORACLE MUD · 命格驅動放置型文字冒險
          </div>
        </div>

        {/* 五行裝飾 */}
        <div className="flex justify-center gap-6 text-2xl">
          {(["wood", "fire", "earth", "metal", "water"] as const).map((el) => (
            <div key={el} className={`${WUXING_COLORS[el]} opacity-80`}>
              {WUXING_NAMES[el]}
            </div>
          ))}
        </div>

        {/* 世界狀態 */}
        {worldStatus && (
          <div className="text-xs text-muted-foreground border border-border/50 rounded px-4 py-2 inline-block">
            <span>世界 Tick #{worldStatus.currentTick} · </span>
            <span>今日流日：</span>
            <span className={WUXING_COLORS[worldStatus.dailyElement as keyof typeof WUXING_COLORS]}>
              {worldStatus.dailyStem}{worldStatus.dailyBranch}（{WUXING_NAMES[worldStatus.dailyElement as keyof typeof WUXING_NAMES]}）
            </span>
          </div>
        )}

        {/* 說明文字 */}
        <div className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          <p>你是俯瞰台灣大地的神明。</p>
          <p>你的旅人將依照你的命格五行，自動探索台灣 22 縣市的 53 個神秘節點。</p>
          <p className="mt-2">戰鬥、採集、升級——一切皆由天命決定。</p>
        </div>

        {/* CTA 按鈕 */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-muted-foreground text-sm animate-pulse">連接命格系統中...</div>
          ) : user ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                已登入：<span className="text-primary">{user.name}</span>
              </div>
              <Link href="/world">
                <button className="px-8 py-3 bg-primary text-primary-foreground rounded text-sm font-mono hover:opacity-90 transition-opacity" style={{ boxShadow: "0 0 20px rgba(74, 222, 128, 0.3)" }}>
                  ▶ 進入虛相世界
                </button>
              </Link>
            </div>
          ) : (
            <a
              href={getLoginUrl()}
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded text-sm font-mono hover:opacity-90 transition-opacity"
              style={{ boxShadow: "0 0 20px rgba(74, 222, 128, 0.3)" }}
            >
              ▶ 以命格登入
            </a>
          )}
        </div>

        {/* 功能說明 */}
        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground pt-4 border-t border-border/30">
          <div className="text-center space-y-1">
            <div className="text-primary">🗺 台灣地圖</div>
            <div>22 縣市 53 節點</div>
            <div>五行屬性地形</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-primary">⚔ 放置戰鬥</div>
            <div>250 種怪物</div>
            <div>五行相剋計算</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-primary">⚡ 神明干預</div>
            <div>神蹟治癒傳送</div>
            <div>策略指引系統</div>
          </div>
        </div>
      </div>
    </div>
  );
}
