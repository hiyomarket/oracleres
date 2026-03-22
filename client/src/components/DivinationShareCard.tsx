/**
 * 天命問卜結果分享卡（DivinationShareCard v2.0）
 *
 * 設計規格：
 * - 輸出尺寸：1080×1920px（9:16 手機分享比例）
 * - 本日流日塔羅牌作為全版背景底圖（帶半透明深色遮罩）
 * - 文字疊加在遮罩上方，確保可讀性
 * - 完全使用 Canvas 2D API，不依賴 html2canvas
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { getTarotCardUrl } from "@/lib/tarotCards";
import { Download, Share2, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CARD_W, CARD_H,
  loadImage, ensureFonts,
  drawWrappedText, drawRoundRect,
  downloadCanvas, shareCanvas,
} from "@/lib/shareCardCanvas";

interface DivinationShareCardProps {
  displayName: string;
  gender: 'male' | 'female' | 'other' | null | undefined;
  topicName: string;
  topicIcon: string;
  question?: string;
  fortuneIndex: number;
  fortuneLabel: string;
  oracle: string;
  coreReading: string;
  tarotCardNumber: number;
  tarotCardName: string;
  tarotKeywords: string[];
  dayPillar: string;
  moonPhase: string;
  dateString: string;
  onClose: () => void;
}

function getFortuneColor(index: number): string {
  if (index >= 80) return "#4ade80";
  if (index >= 65) return "#fbbf24";
  if (index >= 50) return "#facc15";
  if (index >= 35) return "#fb923c";
  return "#f87171";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const tarotUrl = getTarotCardUrl(tarotCardNumber, gender === 'other' ? null : gender);
  const fortuneColor = getFortuneColor(fortuneIndex);

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

      // 1. 深色背景
      const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      bgGrad.addColorStop(0, '#0D0A1E');
      bgGrad.addColorStop(0.5, '#1A1040');
      bgGrad.addColorStop(1, '#0A0D1E');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // 2. 塔羅牌全版背景底圖
      try {
        const tarotImg = await loadImage(tarotUrl);
        const imgRatio = tarotImg.width / tarotImg.height;
        const canvasRatio = CARD_W / CARD_H;
        let drawW: number, drawH: number, drawX: number, drawY: number;
        if (imgRatio > canvasRatio) {
          drawH = CARD_H;
          drawW = CARD_H * imgRatio;
          drawX = (CARD_W - drawW) / 2;
          drawY = 0;
        } else {
          drawW = CARD_W;
          drawH = CARD_W / imgRatio;
          drawX = 0;
          drawY = (CARD_H - drawH) / 2;
        }
        ctx.drawImage(tarotImg, drawX, drawY, drawW, drawH);
      } catch {
        // 圖片載入失敗，繼續用純色背景
      }

      // 3. 半透明深色遮罩
      const maskGrad = ctx.createLinearGradient(0, 0, 0, CARD_H);
      maskGrad.addColorStop(0, 'rgba(8,6,18,0.85)');
      maskGrad.addColorStop(0.28, 'rgba(8,6,18,0.52)');
      maskGrad.addColorStop(0.62, 'rgba(8,6,18,0.60)');
      maskGrad.addColorStop(1, 'rgba(8,6,18,0.92)');
      ctx.fillStyle = maskGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      const PAD = 80;

      // 4. 頂部品牌 & 日期
      ctx.font = '300 32px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.40)';
      ctx.textAlign = 'center';
      ctx.fillText('✦  天命共振  ✦', CARD_W / 2, 110);

      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(dateString, CARD_W / 2, 160);

      // 5. 主題標題
      ctx.font = '700 62px "Noto Serif TC", serif';
      ctx.fillStyle = '#C9A227';
      ctx.textAlign = 'center';
      ctx.fillText(`${topicIcon} ${topicName} 問卜`, CARD_W / 2, 250);

      ctx.strokeStyle = 'rgba(201,162,39,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD * 2, 278);
      ctx.lineTo(CARD_W - PAD * 2, 278);
      ctx.stroke();

      // 6. 用戶名稱
      ctx.font = '500 44px "Noto Serif TC", serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${displayName} 的天命問卜`, CARD_W / 2, 348);

      // 7. 問題（如有）
      let nextY = 420;
      if (question) {
        ctx.font = '400 32px "Noto Serif TC", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.textAlign = 'center';
        const lines = drawWrappedText(ctx, `「${question}」`, CARD_W / 2, nextY, CARD_W - PAD * 3, 40, 4);
        nextY += lines * 40 + 20;
      }

      // 8. 命運指數面板
      const panelX = PAD;
      const panelY = nextY;
      const panelW = CARD_W - PAD * 2;
      const panelH = 980;

      ctx.save();
      drawRoundRect(ctx, panelX, panelY, panelW, panelH, 32);
      ctx.fillStyle = 'rgba(20,12,50,0.74)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,39,0.32)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      const innerX = panelX + 64;
      const innerW = panelW - 128;
      let y = panelY + 72;

      // 命運指數
      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText('今日命運指數', innerX, y);

      ctx.font = '700 80px "Noto Serif TC", serif';
      ctx.fillStyle = fortuneColor;
      ctx.textAlign = 'right';
      ctx.fillText(`${fortuneIndex}`, innerX + innerW - 120, y + 70);

      ctx.font = '600 44px "Noto Serif TC", serif';
      ctx.fillStyle = fortuneColor;
      ctx.textAlign = 'right';
      ctx.fillText(fortuneLabel, innerX + innerW, y + 70);
      y += 110;

      // 分隔線
      ctx.strokeStyle = 'rgba(201,162,39,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX, y);
      ctx.lineTo(innerX + innerW, y);
      ctx.stroke();
      y += 52;

      // 流日塔羅牌
      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText('本日流日能量', innerX, y);
      y += 48;

      ctx.font = '600 40px "Noto Serif TC", serif';
      ctx.fillStyle = '#C9A227';
      ctx.textAlign = 'left';
      ctx.fillText(tarotCardName, innerX, y + 36);

      if (tarotKeywords.length > 0) {
        ctx.font = '400 28px "Noto Serif TC", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.textAlign = 'right';
        ctx.fillText(tarotKeywords.slice(0, 3).join(' · '), innerX + innerW, y + 36);
      }
      y += 80;

      // 分隔線
      ctx.strokeStyle = 'rgba(201,162,39,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX, y);
      ctx.lineTo(innerX + innerW, y);
      ctx.stroke();
      y += 52;

      // 天命符言
      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText('天命符言', innerX, y);
      y += 52;

      ctx.font = '500 34px "Noto Serif TC", serif';
      ctx.fillStyle = '#E8D5B0';
      ctx.textAlign = 'left';
      const oracleLines = drawWrappedText(ctx, oracle, innerX, y, innerW, 48, 5);
      y += oracleLines * 48 + 40;

      // 分隔線
      ctx.strokeStyle = 'rgba(201,162,39,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX, y);
      ctx.lineTo(innerX + innerW, y);
      ctx.stroke();
      y += 52;

      // 核心解讀
      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText('核心解讀', innerX, y);
      y += 52;

      ctx.font = '400 30px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.textAlign = 'left';
      drawWrappedText(ctx, coreReading, innerX, y, innerW, 44, 6);

      // 9. 命理標籤
      const tagY = panelY + panelH + 60;
      ctx.font = '400 28px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'center';
      ctx.fillText(`${dayPillar}  ·  ${moonPhase}`, CARD_W / 2, tagY);

      // 10. 底部品牌
      ctx.font = '300 26px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.textAlign = 'center';
      ctx.fillText('ORACLE RESONANCE', CARD_W / 2, CARD_H - 80);

      setIsRendering(false);
    } catch (err) {
      console.error('Card render error:', err);
      setRenderError('卡片渲染失敗，請重試');
      setIsRendering(false);
    }
  }, [displayName, gender, topicName, topicIcon, question, fortuneIndex, fortuneLabel, oracle, coreReading, tarotUrl, tarotCardName, tarotKeywords, dayPillar, moonPhase, dateString, fortuneColor]);

  useEffect(() => { renderCard(); }, [renderCard]);

  const [exportError, setExportError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRendering || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadCanvas(canvas, `天命共振-${displayName}-${topicName}問卜.png`);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      setExportError('下載失敗，請重試');
    } finally {
      setIsExporting(false);
    }
  }, [displayName, topicName, isRendering, isExporting]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRendering || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await shareCanvas(
        canvas,
        `天命共振-${displayName}-${topicName}問卜.png`,
        `${displayName} 的天命問卜結果`,
        `本日流日能量「${tarotCardName}」，命運指數 ${fortuneIndex}！

🔮 天命共振 — 融合塔羅、八字、擲籤的命理系統
快來探索你的天命： https://oracleres-mlf7blvz.manus.space`,
      );
    } catch (err) {
      console.error('Share error:', err);
      setExportError('分享失敗，已改為下載');
      try {
        await downloadCanvas(canvas, `天命共振-${displayName}-${topicName}問卜.png`);
      } catch {
        // ignore
      }
    } finally {
      setIsExporting(false);
    }
  }, [displayName, topicName, tarotCardName, fortuneIndex, isRendering, isExporting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-400 shrink-0">問卜結果分享卡</div>
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

        {exportError && (
          <div className="text-xs text-center text-red-400 bg-red-900/20 rounded-lg py-2 px-3">
            {exportError}
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '9/16', background: '#08060f' }}>
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
