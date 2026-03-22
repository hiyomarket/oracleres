/**
 * 天命問卜結果分享卡（DivinationShareCard）
 *
 * 設計規格：
 * - 橫排版 4:3 比例（800×600px）
 * - 左側 40%：本日流日塔羅牌（依性別切換風格）
 * - 右側 60%：玻璃擬態面板，顯示問卜主題、命運指數、天命符言
 * - 背景：深紫藍漸層，呼應問卜神秘氛圍
 * - 匯出：html2canvas 渲染成 PNG 下載 / Web Share API
 */

import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { getTarotCardUrl } from "@/lib/tarotCards";
import { Download, Share2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DivinationShareCardProps {
  // 用戶資訊
  displayName: string;
  gender: 'male' | 'female' | 'other' | null | undefined;
  // 問卜結果
  topicName: string;
  topicIcon: string;
  question?: string;
  fortuneIndex: number;
  fortuneLabel: string;
  oracle: string;
  coreReading: string;
  // 流日塔羅牌
  tarotCardNumber: number;
  tarotCardName: string;
  tarotKeywords: string[];
  // 命理標籤
  dayPillar: string;
  moonPhase: string;
  // 日期
  dateString: string;
  // 關閉回調
  onClose: () => void;
}

function getFortuneColor(index: number): string {
  if (index >= 80) return "#4ade80";
  if (index >= 65) return "#fbbf24";
  if (index >= 50) return "#facc15";
  if (index >= 35) return "#fb923c";
  return "#f87171";
}

function getLabelStyle(label: string): { color: string; bg: string; border: string } {
  if (label === "大吉") return { color: "#4ade80", bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)" };
  if (label === "吉" || label === "小吉") return { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.4)" };
  if (label === "平") return { color: "#facc15", bg: "rgba(250,204,21,0.15)", border: "rgba(250,204,21,0.4)" };
  if (label === "小凶") return { color: "#fb923c", bg: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.4)" };
  return { color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.4)" };
}

export default function DivinationShareCard({
  displayName,
  gender,
  topicName,
  topicIcon,
  question,
  fortuneIndex,
  fortuneLabel,
  oracle,
  coreReading,
  tarotCardNumber,
  tarotCardName,
  tarotKeywords,
  dayPillar,
  moonPhase,
  dateString,
  onClose,
}: DivinationShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const tarotUrl = getTarotCardUrl(tarotCardNumber, gender === 'other' ? null : gender);
  const fortuneColor = getFortuneColor(fortuneIndex);
  const labelStyle = getLabelStyle(fortuneLabel);

  // 截斷過長文字
  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.slice(0, maxLen) + "…" : text;

  const exportCanvas = useCallback(async () => {
    if (!cardRef.current) return null;
    await new Promise(resolve => setTimeout(resolve, 500));
    return html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      width: 800,
      height: 600,
    });
  }, []);

  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    try {
      const canvas = await exportCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `天命共振-${displayName}-${topicName}問卜.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [displayName, topicName, exportCanvas]);

  const handleShare = useCallback(async () => {
    setIsExporting(true);
    try {
      const canvas = await exportCanvas();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `天命共振-${displayName}-${topicName}問卜.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${displayName} 的天命問卜 · ${topicName}`,
              text: `「${oracle}」— 天命共振 ${topicName}問卜結果`,
              files: [file],
            });
            return;
          }
        }
        const link = document.createElement('a');
        link.download = `天命共振-${displayName}-${topicName}問卜.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [displayName, topicName, oracle, exportCanvas]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-3xl">
        {/* 操作按鈕列 */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">天命問卜分享卡 · 長按或點擊下載分享</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isExporting}
              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span className="ml-1">分享</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="ml-1">{exportDone ? '已下載！' : '下載'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 分享卡主體（800×600，4:3 比例） */}
        <div
          ref={cardRef}
          style={{
            width: '800px',
            height: '600px',
            background: 'linear-gradient(135deg, #0D0A1A 0%, #1A0A3A 40%, #0A1A2E 100%)',
            display: 'flex',
            flexDirection: 'row',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: '"Noto Serif TC", "Noto Sans TC", serif',
            maxWidth: '100%',
          }}
          className="divination-share-card rounded-2xl shadow-2xl"
        >
          {/* 背景裝飾 */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, rgba(201,162,39,0.06) 0%, transparent 50%)',
          }} />

          {/* 左側：流日塔羅牌（40%） */}
          <div style={{
            width: '40%',
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px 24px 24px',
            position: 'relative',
            boxSizing: 'border-box',
          }}>
            {/* 流日標籤 */}
            <div style={{
              color: 'rgba(167,139,250,0.7)',
              fontSize: '10px',
              letterSpacing: '0.25em',
              marginBottom: '12px',
              textAlign: 'center',
            }}>
              ✦ 本日流日塔羅 ✦
            </div>

            {/* 塔羅牌圖片 */}
            <div style={{
              width: '200px',
              height: '300px',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(139,92,246,0.25)',
              border: '1px solid rgba(139,92,246,0.4)',
              flexShrink: 0,
            }}>
              <img
                src={tarotUrl}
                alt={tarotCardName}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>

            {/* 塔羅牌名稱 */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <div style={{
                color: '#a78bfa',
                fontSize: '14px',
                fontWeight: '600',
                letterSpacing: '0.1em',
              }}>
                {tarotCardName}
              </div>
              {tarotKeywords.length > 0 && (
                <div style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '10px',
                  marginTop: '4px',
                  letterSpacing: '0.05em',
                }}>
                  {tarotKeywords.slice(0, 3).join(' · ')}
                </div>
              )}
            </div>

            {/* 日期 */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              color: 'rgba(255,255,255,0.25)',
              fontSize: '10px',
              letterSpacing: '0.1em',
            }}>
              {dateString}
            </div>
          </div>

          {/* 右側：問卜結果面板（60%） */}
          <div style={{
            width: '60%',
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '28px 28px 28px 16px',
            boxSizing: 'border-box',
          }}>
            {/* 玻璃擬態面板 */}
            <div style={{
              background: 'rgba(30, 10, 60, 0.65)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: '16px',
              padding: '22px 24px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}>
              {/* 頂部：品牌 + 用戶 */}
              <div>
                <div style={{
                  color: 'rgba(167,139,250,0.7)',
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  marginBottom: '8px',
                }}>
                  ✦ 天命共振 · 天命問卜 ✦
                </div>
                <div style={{
                  color: '#F0E8F8',
                  fontSize: '22px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  lineHeight: 1.2,
                }}>
                  {displayName}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '6px',
                }}>
                  <span style={{
                    fontSize: '16px',
                  }}>{topicIcon}</span>
                  <span style={{
                    color: '#a78bfa',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}>{topicName}</span>
                  {question && (
                    <span style={{
                      color: 'rgba(255,255,255,0.35)',
                      fontSize: '10px',
                    }}>「{truncate(question, 20)}」</span>
                  )}
                </div>
              </div>

              {/* 分隔線 */}
              <div style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)',
                margin: '10px 0',
              }} />

              {/* 命運指數 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* 圓形指數 */}
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  border: `3px solid ${fortuneColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 0 20px ${fortuneColor}40`,
                }}>
                  <span style={{ color: fortuneColor, fontSize: '22px', fontWeight: '800', lineHeight: 1 }}>
                    {fortuneIndex}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', marginTop: '1px' }}>分</span>
                </div>
                {/* 標籤 + 命理 */}
                <div>
                  <div style={{
                    display: 'inline-block',
                    color: labelStyle.color,
                    background: labelStyle.bg,
                    border: `1px solid ${labelStyle.border}`,
                    borderRadius: '6px',
                    padding: '2px 10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '6px',
                  }}>
                    {fortuneLabel}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      color: 'rgba(167,139,250,0.7)',
                      fontSize: '10px',
                      background: 'rgba(139,92,246,0.12)',
                      border: '1px solid rgba(139,92,246,0.25)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}>
                      {dayPillar}日
                    </span>
                    <span style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}>
                      {moonPhase}
                    </span>
                  </div>
                </div>
              </div>

              {/* 分隔線 */}
              <div style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)',
                margin: '10px 0',
              }} />

              {/* 天命符言 */}
              <div style={{
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                textAlign: 'center',
              }}>
                <div style={{
                  color: 'rgba(167,139,250,0.6)',
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  marginBottom: '5px',
                }}>
                  ✦ 天命符言 ✦
                </div>
                <div style={{
                  color: '#c4b5fd',
                  fontSize: '13px',
                  fontWeight: '500',
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                }}>
                  「{truncate(oracle, 50)}」
                </div>
              </div>

              {/* 分隔線 */}
              <div style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)',
                margin: '10px 0',
              }} />

              {/* 核心解讀（截短） */}
              <div>
                <div style={{
                  color: 'rgba(167,139,250,0.6)',
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  marginBottom: '5px',
                }}>
                  核心解讀
                </div>
                <div style={{
                  color: 'rgba(240,232,248,0.75)',
                  fontSize: '11px',
                  lineHeight: 1.6,
                }}>
                  {truncate(coreReading, 80)}
                </div>
              </div>

              {/* 底部品牌 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', letterSpacing: '0.2em' }}>
                  oracleres.com
                </div>
                <div style={{ color: '#a78bfa', fontSize: '9px', opacity: 0.6 }}>
                  ✦ 天命共振 ✦
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-3 text-xs text-gray-500">
          卡片尺寸 800×600px · 下載後可分享至社群媒體
        </div>
      </div>
    </div>
  );
}
