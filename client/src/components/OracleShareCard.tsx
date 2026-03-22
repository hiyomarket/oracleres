/**
 * 擲筊結果分享卡（OracleShareCard）
 *
 * 設計規格：
 * - 橫排版 4:3 比例（800×600px）
 * - 左側 40%：擲筊結果大圖示（聖杯/笑杯/陰杯/立筊）+ 命理能量圓環
 * - 右側 60%：玻璃擬態面板，顯示問題、結果詮釋、能量共鳴
 * - 背景：深色星空漸層，呼應神聖儀式感
 * - 匯出：html2canvas 渲染成 PNG 下載 / Web Share API
 */

import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { Download, Share2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type OracleResultType = 'sheng' | 'xiao' | 'yin' | 'li';

interface OracleShareCardProps {
  // 用戶資訊
  displayName: string;
  // 擲筊結果
  result: OracleResultType;
  query: string;
  interpretation: string;
  energyResonance: string;
  dateString: string;
  isTripleConfirmed?: boolean;
  // 關閉回調
  onClose: () => void;
}

const RESULT_CONFIG: Record<OracleResultType, {
  name: string;
  subtitle: string;
  emoji: string;
  bgGradient: string;
  accentColor: string;
  borderColor: string;
  glowColor: string;
  panelBg: string;
  panelBorder: string;
  labelBg: string;
  labelBorder: string;
}> = {
  sheng: {
    name: '聖杯',
    subtitle: '神明允諾',
    emoji: '🔴',
    bgGradient: 'linear-gradient(135deg, #1A0808 0%, #2A0A0A 40%, #1A0A18 100%)',
    accentColor: '#f87171',
    borderColor: 'rgba(248,113,113,0.5)',
    glowColor: 'rgba(248,113,113,0.3)',
    panelBg: 'rgba(42, 10, 10, 0.65)',
    panelBorder: 'rgba(248,113,113,0.35)',
    labelBg: 'rgba(248,113,113,0.15)',
    labelBorder: 'rgba(248,113,113,0.4)',
  },
  xiao: {
    name: '笑杯',
    subtitle: '神明微笑',
    emoji: '🟤',
    bgGradient: 'linear-gradient(135deg, #1A1000 0%, #2A1A00 40%, #1A1200 100%)',
    accentColor: '#fbbf24',
    borderColor: 'rgba(251,191,36,0.5)',
    glowColor: 'rgba(251,191,36,0.3)',
    panelBg: 'rgba(42, 26, 0, 0.65)',
    panelBorder: 'rgba(251,191,36,0.35)',
    labelBg: 'rgba(251,191,36,0.15)',
    labelBorder: 'rgba(251,191,36,0.4)',
  },
  yin: {
    name: '陰杯',
    subtitle: '神明婉拒',
    emoji: '⚫',
    bgGradient: 'linear-gradient(135deg, #0A0A0A 0%, #141414 40%, #0A0A14 100%)',
    accentColor: '#94a3b8',
    borderColor: 'rgba(148,163,184,0.4)',
    glowColor: 'rgba(148,163,184,0.2)',
    panelBg: 'rgba(20, 20, 20, 0.65)',
    panelBorder: 'rgba(148,163,184,0.3)',
    labelBg: 'rgba(148,163,184,0.1)',
    labelBorder: 'rgba(148,163,184,0.3)',
  },
  li: {
    name: '立筊',
    subtitle: '天命昭昭',
    emoji: '✨',
    bgGradient: 'linear-gradient(135deg, #1A1000 0%, #2A1800 40%, #1A1A00 100%)',
    accentColor: '#fde68a',
    borderColor: 'rgba(253,230,138,0.6)',
    glowColor: 'rgba(253,230,138,0.4)',
    panelBg: 'rgba(42, 24, 0, 0.65)',
    panelBorder: 'rgba(253,230,138,0.4)',
    labelBg: 'rgba(253,230,138,0.15)',
    labelBorder: 'rgba(253,230,138,0.5)',
  },
};

const RESULT_DESCRIPTION: Record<OracleResultType, string> = {
  sheng: '一正一反，神明應允，此事可行',
  xiao: '兩正面朝上，神明以笑回應，需再思量',
  yin: '兩反面朝上，神明婉拒，此事暫緩',
  li: '筊杯直立，天命示現，神明自有定奪',
};

export default function OracleShareCard({
  displayName,
  result,
  query,
  interpretation,
  energyResonance,
  dateString,
  isTripleConfirmed,
  onClose,
}: OracleShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const config = RESULT_CONFIG[result];

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
      link.download = `天命共振-${displayName}-${config.name}擲筊.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [displayName, config.name, exportCanvas]);

  const handleShare = useCallback(async () => {
    setIsExporting(true);
    try {
      const canvas = await exportCanvas();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `天命共振-${displayName}-${config.name}擲筊.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${displayName} 的擲筊結果 · ${config.name}`,
              text: `擲出「${config.name}」— ${config.subtitle}！來天命共振問神明吧！`,
              files: [file],
            });
            return;
          }
        }
        const link = document.createElement('a');
        link.download = `天命共振-${displayName}-${config.name}擲筊.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [displayName, config, exportCanvas]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-3xl">
        {/* 操作按鈕列 */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">擲筊結果分享卡 · 長按或點擊下載分享</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isExporting}
              style={{ borderColor: `${config.accentColor}60`, color: config.accentColor }}
              className="hover:opacity-80"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span className="ml-1">分享</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              style={{ borderColor: `${config.accentColor}60`, color: config.accentColor }}
              className="hover:opacity-80"
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
            background: config.bgGradient,
            display: 'flex',
            flexDirection: 'row',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: '"Noto Serif TC", "Noto Sans TC", serif',
            maxWidth: '100%',
          }}
          className="oracle-share-card rounded-2xl shadow-2xl"
        >
          {/* 背景裝飾 */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at 30% 50%, ${config.glowColor} 0%, transparent 60%)`,
          }} />

          {/* 左側：擲筊結果視覺（40%） */}
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
            {/* 品牌標籤 */}
            <div style={{
              color: `${config.accentColor}90`,
              fontSize: '10px',
              letterSpacing: '0.25em',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              ✦ 天命共振 · 擲筊問卦 ✦
            </div>

            {/* 大圖示圓環 */}
            <div style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: `3px solid ${config.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 50px ${config.glowColor}, 0 0 100px ${config.glowColor}50`,
              background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '72px', lineHeight: 1 }}>
                {config.emoji}
              </span>
            </div>

            {/* 結果名稱 */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{
                color: config.accentColor,
                fontSize: '32px',
                fontWeight: '800',
                letterSpacing: '0.15em',
                lineHeight: 1,
              }}>
                {config.name}
              </div>
              <div style={{
                color: `${config.accentColor}80`,
                fontSize: '14px',
                marginTop: '6px',
                letterSpacing: '0.2em',
              }}>
                {config.subtitle}
              </div>
            </div>

            {/* 三聖杯確認標籤 */}
            {isTripleConfirmed && (
              <div style={{
                marginTop: '14px',
                color: '#fde68a',
                fontSize: '11px',
                background: 'rgba(253,230,138,0.1)',
                border: '1px solid rgba(253,230,138,0.3)',
                borderRadius: '20px',
                padding: '3px 12px',
                letterSpacing: '0.1em',
              }}>
                ✦ 三聖杯確認 ✦
              </div>
            )}

            {/* 日期 */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              color: 'rgba(255,255,255,0.25)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textAlign: 'center',
            }}>
              {dateString}
            </div>
          </div>

          {/* 右側：結果詮釋面板（60%） */}
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
              background: config.panelBg,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${config.panelBorder}`,
              borderRadius: '16px',
              padding: '22px 24px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}>
              {/* 頂部：用戶 + 問題 */}
              <div>
                <div style={{
                  color: `${config.accentColor}80`,
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  marginBottom: '8px',
                }}>
                  ✦ 天命共振 · 神諭問卦 ✦
                </div>
                <div style={{
                  color: '#F0E8F8',
                  fontSize: '20px',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  lineHeight: 1.2,
                }}>
                  {displayName}
                </div>
                {query && (
                  <div style={{
                    marginTop: '8px',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                  }}>
                    「{truncate(query, 40)}」
                  </div>
                )}
              </div>

              {/* 分隔線 */}
              <div style={{
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${config.borderColor}, transparent)`,
                margin: '10px 0',
              }} />

              {/* 結果說明 */}
              <div>
                <div style={{
                  display: 'inline-block',
                  color: config.accentColor,
                  background: config.labelBg,
                  border: `1px solid ${config.labelBorder}`,
                  borderRadius: '6px',
                  padding: '3px 12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  letterSpacing: '0.1em',
                }}>
                  {config.name} · {config.subtitle}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '11px',
                  marginBottom: '10px',
                }}>
                  {RESULT_DESCRIPTION[result]}
                </div>
              </div>

              {/* 分隔線 */}
              <div style={{
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${config.borderColor}, transparent)`,
                margin: '10px 0',
              }} />

              {/* 神諭詮釋 */}
              <div>
                <div style={{
                  color: `${config.accentColor}80`,
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  marginBottom: '6px',
                }}>
                  神諭詮釋
                </div>
                <div style={{
                  color: 'rgba(240,232,248,0.85)',
                  fontSize: '12px',
                  lineHeight: 1.7,
                }}>
                  {truncate(interpretation, 100)}
                </div>
              </div>

              {/* 分隔線 */}
              {energyResonance && (
                <div style={{
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${config.borderColor}, transparent)`,
                  margin: '10px 0',
                }} />
              )}

              {/* 能量共鳴 */}
              {energyResonance && (
                <div style={{
                  background: `${config.labelBg}`,
                  border: `1px solid ${config.labelBorder}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}>
                  <div style={{
                    color: `${config.accentColor}80`,
                    fontSize: '9px',
                    letterSpacing: '0.2em',
                    marginBottom: '4px',
                  }}>
                    ⚡ 能量共鳴
                  </div>
                  <div style={{
                    color: config.accentColor,
                    fontSize: '11px',
                    lineHeight: 1.5,
                  }}>
                    {truncate(energyResonance, 60)}
                  </div>
                </div>
              )}

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
                <div style={{ color: config.accentColor, fontSize: '9px', opacity: 0.6 }}>
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
