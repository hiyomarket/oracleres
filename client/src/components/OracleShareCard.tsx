/**
 * 擲筊結果分享卡（OracleShareCard v2.1）
 *
 * 設計規格：
 * - 輸出尺寸：1080×1920px（9:16 手機分享比例）
 * - 以擲筊結果的色彩主題作為背景漸層，中央大圖示作為視覺焦點
 * - 文字疊加在半透明遮罩上方，確保可讀性
 * - 完全使用 Canvas 2D API，不依賴 html2canvas
 *
 * v2.1 修正：
 * - downloadCanvas 改為 async（使用 toBlob 避免手機記憶體崩潰）
 * - 加強所有按鈕的錯誤捕捉，防止頁面當掉
 * - 放大預覽容器（max-w-sm → max-w-md）
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Download, Share2, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CARD_W, CARD_H,
  ensureFonts,
  drawWrappedText, drawRoundRect,
  downloadCanvas, shareCanvas,
} from "@/lib/shareCardCanvas";

type OracleResultType = 'sheng' | 'xiao' | 'yin' | 'li';

interface OracleShareCardProps {
  displayName: string;
  result: OracleResultType;
  query: string;
  interpretation: string;
  energyResonance: string;
  dateString: string;
  isTripleConfirmed?: boolean;
  onClose: () => void;
}

const RESULT_CONFIG: Record<OracleResultType, {
  name: string;
  subtitle: string;
  symbol: string;
  bgColors: [string, string, string];
  accentColor: string;
  glowColor: string;
  panelBg: string;
  panelBorder: string;
}> = {
  sheng: {
    name: '聖杯',
    subtitle: '神明允諾',
    symbol: '🔴',
    bgColors: ['#2A0808', '#1A0A0A', '#120408'],
    accentColor: '#f87171',
    glowColor: 'rgba(248,113,113,0.25)',
    panelBg: 'rgba(42,10,10,0.76)',
    panelBorder: 'rgba(248,113,113,0.35)',
  },
  xiao: {
    name: '笑杯',
    subtitle: '神明微笑',
    symbol: '🟤',
    bgColors: ['#2A1800', '#1A1000', '#120A00'],
    accentColor: '#fbbf24',
    glowColor: 'rgba(251,191,36,0.25)',
    panelBg: 'rgba(42,26,0,0.76)',
    panelBorder: 'rgba(251,191,36,0.35)',
  },
  yin: {
    name: '陰杯',
    subtitle: '神明婉拒',
    symbol: '⚫',
    bgColors: ['#141414', '#0A0A0A', '#080808'],
    accentColor: '#94a3b8',
    glowColor: 'rgba(148,163,184,0.20)',
    panelBg: 'rgba(20,20,20,0.76)',
    panelBorder: 'rgba(148,163,184,0.30)',
  },
  li: {
    name: '立筊',
    subtitle: '神明指引',
    symbol: '🟡',
    bgColors: ['#1A1A08', '#141408', '#0A0A04'],
    accentColor: '#fde047',
    glowColor: 'rgba(253,224,71,0.25)',
    panelBg: 'rgba(26,26,8,0.76)',
    panelBorder: 'rgba(253,224,71,0.35)',
  },
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const cfg = RESULT_CONFIG[result];

  const renderCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsRendering(true);
    setRenderError(null);
    try {
      await ensureFonts();
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      canvas.width = CARD_W;
      canvas.height = CARD_H;

      // 1. 背景漸層
      const bgGrad = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.35, 0, CARD_W / 2, CARD_H * 0.35, CARD_H * 0.7);
      bgGrad.addColorStop(0, cfg.bgColors[0]);
      bgGrad.addColorStop(0.5, cfg.bgColors[1]);
      bgGrad.addColorStop(1, cfg.bgColors[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // 2. 中央光暈
      const glowGrad = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.3, 0, CARD_W / 2, CARD_H * 0.3, 500);
      glowGrad.addColorStop(0, cfg.glowColor);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // 3. 半透明深色遮罩
      const maskGrad = ctx.createLinearGradient(0, 0, 0, CARD_H);
      maskGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
      maskGrad.addColorStop(0.45, 'rgba(0,0,0,0.15)');
      maskGrad.addColorStop(0.7, 'rgba(0,0,0,0.40)');
      maskGrad.addColorStop(1, 'rgba(0,0,0,0.82)');
      ctx.fillStyle = maskGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      const PAD = 80;

      // 4. 頂部品牌
      ctx.font = '300 32px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'center';
      ctx.fillText('✦  天命共振  ✦', CARD_W / 2, 110);

      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.textAlign = 'center';
      ctx.fillText(dateString, CARD_W / 2, 158);

      // 5. 擲筊大圖示
      ctx.font = '220px serif';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.symbol, CARD_W / 2, 480);

      ctx.font = '700 90px "Noto Serif TC", serif';
      ctx.fillStyle = cfg.accentColor;
      ctx.textAlign = 'center';
      ctx.fillText(cfg.name, CARD_W / 2, 590);

      ctx.font = '400 44px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.60)';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.subtitle, CARD_W / 2, 655);

      if (isTripleConfirmed) {
        ctx.font = '500 34px "Noto Serif TC", serif';
        ctx.fillStyle = cfg.accentColor;
        ctx.textAlign = 'center';
        ctx.fillText('✦ 三聖杯確認 ✦', CARD_W / 2, 715);
      }

      // 6. 問題
      ctx.font = '400 32px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.textAlign = 'center';
      const qLines = drawWrappedText(ctx, `「${query}」`, CARD_W / 2, 790, CARD_W - PAD * 3, 44, 3);
      const afterQ = 790 + qLines * 44;

      // 7. 資訊面板
      const panelX = PAD;
      const panelY = afterQ + 30;
      const panelW = CARD_W - PAD * 2;
      const panelH = 780;

      ctx.save();
      drawRoundRect(ctx, panelX, panelY, panelW, panelH, 32);
      ctx.fillStyle = cfg.panelBg;
      ctx.fill();
      ctx.strokeStyle = cfg.panelBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      const innerX = panelX + 64;
      const innerW = panelW - 128;
      let y = panelY + 72;

      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText('天命詮釋', innerX, y);
      y += 52;

      ctx.font = '500 34px "Noto Serif TC", serif';
      ctx.fillStyle = '#E8D5B0';
      ctx.textAlign = 'left';
      const intLines = drawWrappedText(ctx, interpretation, innerX, y, innerW, 48, 6);
      y += intLines * 48 + 44;

      ctx.strokeStyle = `${cfg.accentColor}33`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX, y);
      ctx.lineTo(innerX + innerW, y);
      ctx.stroke();
      y += 52;

      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText('能量共鳴', innerX, y);
      y += 52;

      ctx.font = '400 30px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.textAlign = 'left';
      drawWrappedText(ctx, energyResonance, innerX, y, innerW, 44, 5);

      // 8. 用戶名稱
      ctx.font = '400 30px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(`${displayName} 的擲筊問卜`, CARD_W / 2, panelY + panelH + 60);

      // 9. 底部品牌
      ctx.font = '300 26px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.textAlign = 'center';
      ctx.fillText('ORACLE RESONANCE', CARD_W / 2, CARD_H - 80);

      setIsRendering(false);
    } catch (err) {
      console.error('Card render error:', err);
      setRenderError('卡片渲染失敗，請重試');
      setIsRendering(false);
    }
  }, [displayName, result, query, interpretation, energyResonance, dateString, isTripleConfirmed, cfg]);

  useEffect(() => { renderCard(); }, [renderCard]);

  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRendering || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadCanvas(canvas, `天命共振-${displayName}-擲筊問卜.png`);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      setExportError('下載失敗，請重試');
    } finally {
      setIsExporting(false);
    }
  }, [displayName, isRendering, isExporting]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRendering || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await shareCanvas(
        canvas,
        `天命共振-${displayName}-擲筊問卜.png`,
        `${displayName} 的擲筊問卜結果`,
        `我的擲筊結果是「${cfg.name}」—— ${cfg.subtitle}！快來天命共振體驗神聖擲筊！`,
      );
    } catch (err) {
      console.error('Share error:', err);
      setExportError('分享失敗，已改為下載');
      try {
        await downloadCanvas(canvas, `天命共振-${displayName}-擲筊問卜.png`);
      } catch {
        // ignore
      }
    } finally {
      setIsExporting(false);
    }
  }, [displayName, cfg, isRendering, isExporting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-md flex flex-col gap-3">
        {/* 頂部操作列 */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-400 shrink-0">擲筊結果分享卡</div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {renderError && (
              <Button variant="ghost" size="sm" onClick={renderCard} className="text-amber-400 hover:text-amber-300">
                <RefreshCw className="w-4 h-4 mr-1" />重試
              </Button>
            )}
            <Button
              variant="outline" size="sm"
              onClick={handleShare}
              disabled={isExporting || isRendering}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 min-w-[72px]"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span className="ml-1">分享</span>
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={handleDownload}
              disabled={isExporting || isRendering}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 min-w-[72px]"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="ml-1">{exportDone ? '已下載！' : '下載'}</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 錯誤提示 */}
        {exportError && (
          <div className="text-xs text-center text-red-400 bg-red-900/20 rounded-lg py-2 px-3">
            {exportError}
          </div>
        )}

        {/* Canvas 預覽 */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ aspectRatio: '9/16', background: '#080808' }}
        >
          {isRendering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-sm text-amber-300">正在生成分享卡...</span>
            </div>
          )}
          {renderError && !isRendering && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="text-sm text-red-400">{renderError}</span>
            </div>
          )}
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        <p className="text-xs text-center text-gray-500">
          圖片尺寸 1080×1920px，適合 Instagram / LINE / Facebook 分享
        </p>
      </div>
    </div>
  );
}
