/**
 * GameGuide.tsx
 * 遊戲規則指南頁面 — 新手指引
 * 從後台 CMS 讀取章節內容，以卡片式手風琴呈現
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import GameTabLayout from "@/components/GameTabLayout";
import { Streamdown } from "streamdown";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  basic:    { label: "基礎入門", color: "#22c55e" },
  combat:   { label: "戰鬥系統", color: "#ef4444" },
  growth:   { label: "成長養成", color: "#f59e0b" },
  social:   { label: "社交交易", color: "#3b82f6" },
  advanced: { label: "進階技巧", color: "#a855f7" },
  general:  { label: "一般",     color: "#64748b" },
};

export default function GameGuide() {
  const { data, isLoading } = trpc.gameGuide.getPublicGuide.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const config = data?.config ?? {};
  const pageTitle = config.pageTitle || "冒險者指南";
  const pageSubtitle = config.pageSubtitle || "歡迎來到天命共振的世界！這份指南將帶你了解所有遊戲機制。";

  // 取得所有分類
  const categories = useMemo(() => {
    if (!data?.sections) return [];
    const cats = new Set(data.sections.map(s => s.category || "general"));
    return Array.from(cats);
  }, [data?.sections]);

  // 過濾章節
  const filteredSections = useMemo(() => {
    if (!data?.sections) return [];
    if (!filterCategory) return data.sections;
    return data.sections.filter(s => (s.category || "general") === filterCategory);
  }, [data?.sections, filterCategory]);

  return (
    <GameTabLayout activeTab="guide">
      <div
        style={{
          height: "100%",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* 頂部標題區 */}
        <div
          style={{
            padding: "24px 16px 16px",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%)",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              margin: 0,
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.05em",
            }}
          >
            {pageTitle}
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "rgba(148,163,184,0.8)",
              margin: "8px 0 0",
              maxWidth: "360px",
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            {pageSubtitle}
          </p>
        </div>

        {/* 分類篩選 */}
        {categories.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              padding: "0 16px 12px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            <button
              onClick={() => setFilterCategory(null)}
              style={{
                flex: "0 0 auto",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,
                border: "1px solid",
                borderColor: !filterCategory ? "#f59e0b" : "rgba(255,255,255,0.1)",
                background: !filterCategory ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.03)",
                color: !filterCategory ? "#f59e0b" : "rgba(148,163,184,0.7)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              全部
            </button>
            {categories.map(cat => {
              const info = CATEGORY_LABELS[cat] || CATEGORY_LABELS.general;
              const isActive = filterCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(isActive ? null : cat)}
                  style={{
                    flex: "0 0 auto",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "1px solid",
                    borderColor: isActive ? info.color : "rgba(255,255,255,0.1)",
                    background: isActive ? `${info.color}20` : "rgba(255,255,255,0.03)",
                    color: isActive ? info.color : "rgba(148,163,184,0.7)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 載入中 */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px", animation: "pulse 1.5s infinite" }}>📖</div>
            <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "13px" }}>載入指南中...</p>
          </div>
        )}

        {/* 無內容 */}
        {!isLoading && filteredSections.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
            <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "13px" }}>
              {filterCategory ? "此分類尚無內容" : "指南尚未建立，請稍後再來！"}
            </p>
          </div>
        )}

        {/* 章節列表 */}
        <div style={{ padding: "0 12px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredSections.map((section, idx) => {
            const isExpanded = expandedId === section.id;
            const catInfo = CATEGORY_LABELS[section.category || "general"] || CATEGORY_LABELS.general;

            return (
              <div
                key={section.id}
                style={{
                  borderRadius: "14px",
                  border: `1px solid ${isExpanded ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"}`,
                  background: isExpanded
                    ? "rgba(245,158,11,0.04)"
                    : "rgba(255,255,255,0.02)",
                  overflow: "hidden",
                  transition: "all 0.2s",
                }}
              >
                {/* 章節標題（可點擊展開/收合） */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : section.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* 序號 */}
                  <span
                    style={{
                      flex: "0 0 auto",
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: `${catInfo.color}18`,
                      color: catInfo.color,
                      border: `1px solid ${catInfo.color}30`,
                    }}
                  >
                    {section.icon}
                  </span>

                  {/* 標題 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: isExpanded ? "#f59e0b" : "rgba(226,232,240,0.9)",
                        transition: "color 0.15s",
                      }}
                    >
                      {section.title}
                    </span>
                    {/* 分類標籤 */}
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: catInfo.color,
                        opacity: 0.7,
                      }}
                    >
                      {catInfo.label}
                    </span>
                  </div>

                  {/* 展開/收合箭頭 */}
                  <span
                    style={{
                      flex: "0 0 auto",
                      fontSize: "14px",
                      color: "rgba(148,163,184,0.5)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {/* 展開內容 */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 16px 16px",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div
                      className="prose prose-invert prose-sm max-w-none"
                      style={{
                        fontSize: "13px",
                        lineHeight: 1.8,
                        color: "rgba(203,213,225,0.85)",
                      }}
                    >
                      <Streamdown>{section.content}</Streamdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部留白 */}
        <div style={{ height: "24px" }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .prose h1, .prose h2, .prose h3, .prose h4 {
          color: rgba(245,158,11,0.9) !important;
          margin-top: 16px !important;
          margin-bottom: 8px !important;
        }
        .prose strong {
          color: rgba(245,158,11,0.85) !important;
        }
        .prose ul, .prose ol {
          padding-left: 20px !important;
        }
        .prose li {
          margin: 4px 0 !important;
        }
        .prose code {
          background: rgba(245,158,11,0.1) !important;
          color: #f59e0b !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-size: 12px !important;
        }
        .prose table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 12px 0 !important;
        }
        .prose th, .prose td {
          padding: 6px 10px !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          font-size: 12px !important;
        }
        .prose th {
          background: rgba(245,158,11,0.1) !important;
          color: #f59e0b !important;
          font-weight: 600 !important;
        }
      `}</style>
    </GameTabLayout>
  );
}
