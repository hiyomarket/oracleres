/**
 * 命格身份證分享卡（DestinyShareCard v2.1）
 *
 * 設計規格：
 * - 輸出尺寸：1080×1920px（9:16 手機分享比例）
 * - 塔羅牌作為全版背景底圖（帶半透明深色遮罩）
 * - 文字疊加在遮罩上方，確保可讀性
 * - 完全使用 Canvas 2D API，不依賴 html2canvas，繞開 CORS 問題
 *
 * v2.1 修正：
 * - downloadCanvas 改為 async（使用 toBlob 避免手機記憶體崩潰）
 * - 加強所有按鈕的錯誤捕捉，防止頁面當掉
 * - 放大預覽容器（max-w-sm → max-w-md）
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { getTarotCardUrl, getTarotCardInfo } from "@/lib/tarotCards";
import { Download, Share2, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CARD_W, CARD_H,
  loadImage, ensureFonts,
  drawWrappedText, drawRoundRect,
  downloadCanvas, shareCanvas,
} from "@/lib/shareCardCanvas";

interface DestinyShareCardProps {
  displayName: string;
  gender: 'male' | 'female' | 'other' | null | undefined;
  birthDate?: string | null;
  birthLunar?: string | null;
  dayMasterElement?: string | null;
  lifeNums: {
    outer: { num: number; name: string };
    middle: { num: number; name: string };
    primary: { num: number; name: string };
    soul: { num: number; name: string };
  } | null;
  dayPillar?: string | null;
  yearPillar?: string | null;
  favorableElements?: string | null;
  onClose: () => void;
}

const ELEMENT_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

export default function DestinyShareCard({
  displayName,
  gender,
  birthDate,
  birthLunar,
  dayMasterElement,
  lifeNums,
  dayPillar,
  yearPillar,
  favorableElements,
  onClose,
}: DestinyShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const primaryTarotNum = lifeNums?.primary.num ?? 0;
  const tarotInfo = getTarotCardInfo(primaryTarotNum);
  const tarotUrl = getTarotCardUrl(primaryTarotNum, gender === 'other' ? null : gender);
  const accentColor = gender === 'male' ? '#7BA7D4' : '#D4A0C8';

  const dayMasterZh = dayMasterElement ? (ELEMENT_ZH[dayMasterElement] ?? dayMasterElement) : null;
  const favElements = favorableElements
    ? favorableElements.split(',').map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean)
    : [];
  const formattedBirthDate = birthDate ? birthDate.replace(/-/g, ' / ') : null;

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
      if (gender === 'male') {
        bgGrad.addColorStop(0, '#0D1117');
        bgGrad.addColorStop(0.4, '#1A1A2A');
        bgGrad.addColorStop(1, '#0F1A2E');
      } else {
        bgGrad.addColorStop(0, '#1A1A2A');
        bgGrad.addColorStop(0.5, '#2D1B4E');
        bgGrad.addColorStop(1, '#1A0A2E');
      }
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
      maskGrad.addColorStop(0, 'rgba(10,8,20,0.82)');
      maskGrad.addColorStop(0.3, 'rgba(10,8,20,0.55)');
      maskGrad.addColorStop(0.6, 'rgba(10,8,20,0.62)');
      maskGrad.addColorStop(1, 'rgba(10,8,20,0.90)');
      ctx.fillStyle = maskGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      const PAD = 80;

      // 4. 頂部品牌
      ctx.font = '300 36px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'center';
      ctx.fillText('✦  天命共振  ✦', CARD_W / 2, 120);

      ctx.font = '700 56px "Noto Serif TC", serif';
      ctx.fillStyle = '#C9A227';
      ctx.textAlign = 'center';
      ctx.fillText('命格身份證', CARD_W / 2, 205);

      ctx.strokeStyle = 'rgba(201,162,39,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD * 2, 235);
      ctx.lineTo(CARD_W - PAD * 2, 235);
      ctx.stroke();

      // 5. 用戶名稱 & 塔羅原型
      ctx.font = '700 76px "Noto Serif TC", serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(displayName, CARD_W / 2, 340);

      ctx.font = '400 38px "Noto Serif TC", serif';
      ctx.fillStyle = accentColor;
      ctx.textAlign = 'center';
      ctx.fillText(`${tarotInfo.nameZh}  ·  ${tarotInfo.nameEn}`, CARD_W / 2, 408);

      // 6. 資訊面板
      const panelX = PAD;
      const panelY = 460;
      const panelW = CARD_W - PAD * 2;
      const panelH = 940;

      ctx.save();
      drawRoundRect(ctx, panelX, panelY, panelW, panelH, 32);
      ctx.fillStyle = gender === 'male'
        ? 'rgba(13,25,48,0.74)'
        : 'rgba(45,27,78,0.70)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,162,39,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      const innerX = panelX + 64;
      const innerW = panelW - 128;
      let y = panelY + 72;

      // 生命靈數
      if (lifeNums) {
        ctx.font = '400 28px "Noto Serif TC", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.textAlign = 'left';
        ctx.fillText('生命靈數', innerX, y);
        y += 52;

        const numItems = [
          { label: '主要靈魂數', num: lifeNums.primary.num, name: lifeNums.primary.name },
          { label: '外在個性數', num: lifeNums.outer.num, name: lifeNums.outer.name },
          { label: '中間個性數', num: lifeNums.middle.num, name: lifeNums.middle.name },
          { label: '靈魂渴望數', num: lifeNums.soul.num, name: lifeNums.soul.name },
        ];
        const colW = innerW / 2;
        numItems.forEach((item, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const ix = innerX + col * colW;
          const iy = y + row * 112;
          ctx.font = '700 54px "Noto Serif TC", serif';
          ctx.fillStyle = '#C9A227';
          ctx.textAlign = 'left';
          ctx.fillText(String(item.num), ix, iy + 52);
          ctx.font = '400 24px "Noto Serif TC", serif';
          ctx.fillStyle = 'rgba(255,255,255,0.42)';
          ctx.fillText(item.label, ix + 64, iy + 28);
          ctx.font = '500 28px "Noto Serif TC", serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(item.name, ix + 64, iy + 58);
        });
        y += 248;
      }

      // 分隔線
      ctx.strokeStyle = 'rgba(201,162,39,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX, y);
      ctx.lineTo(innerX + innerW, y);
      ctx.stroke();
      y += 52;

      // 八字命盤
      if (dayMasterZh || dayPillar || yearPillar) {
        ctx.font = '400 28px "Noto Serif TC", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.textAlign = 'left';
        ctx.fillText('八字命盤', innerX, y);
        y += 52;
        const pillars: string[] = [];
        if (yearPillar) pillars.push(`年柱：${yearPillar}`);
        if (dayPillar) pillars.push(`日柱：${dayPillar}`);
        if (dayMasterZh) pillars.push(`日主：${dayMasterZh}行`);
        ctx.font = '500 32px "Noto Serif TC", serif';
        ctx.fillStyle = '#E8F0F8';
        ctx.textAlign = 'left';
        ctx.fillText(pillars.join('  ·  '), innerX, y + 36);
        y += 90;
      }

      // 喜用神
      if (favElements.length > 0) {
        ctx.font = '400 28px "Noto Serif TC", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.textAlign = 'left';
        ctx.fillText('喜用神', innerX, y);
        y += 52;
        ctx.font = '500 36px "Noto Serif TC", serif';
        ctx.fillStyle = accentColor;
        ctx.textAlign = 'left';
        ctx.fillText(favElements.join('  ·  '), innerX, y + 36);
        y += 82;
      }

      // 生日
      if (formattedBirthDate) {
        ctx.font = '400 28px "Noto Serif TC", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.textAlign = 'left';
        ctx.fillText('出生日期', innerX, y);
        y += 52;
        ctx.font = '500 32px "Noto Serif TC", serif';
        ctx.fillStyle = '#E8F0F8';
        ctx.textAlign = 'left';
        ctx.fillText(formattedBirthDate, innerX, y + 36);
        if (birthLunar) {
          ctx.font = '400 26px "Noto Serif TC", serif';
          ctx.fillStyle = 'rgba(255,255,255,0.38)';
          ctx.fillText(`農曆 ${birthLunar}`, innerX + 380, y + 36);
        }
      }

      // 7. 塔羅關鍵字
      const kwY = panelY + panelH + 62;
      ctx.font = '400 30px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.textAlign = 'center';
      ctx.fillText(`${tarotInfo.nameZh} · ${tarotInfo.keyword}`, CARD_W / 2, kwY);

      // 8. 底部品牌
      ctx.font = '300 26px "Noto Serif TC", serif';
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.textAlign = 'center';
      ctx.fillText('ORACLE RESONANCE', CARD_W / 2, CARD_H - 80);

      setIsRendering(false);
    } catch (err) {
      console.error('Card render error:', err);
      setRenderError('卡片渲染失敗，請重試');
      setIsRendering(false);
    }
  }, [displayName, gender, tarotUrl, tarotInfo, accentColor, lifeNums, dayMasterZh, dayPillar, yearPillar, favElements, formattedBirthDate, birthLunar]);

  useEffect(() => { renderCard(); }, [renderCard]);

  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRendering || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadCanvas(canvas, `天命共振-${displayName}-命格身份證.png`);
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
        `天命共振-${displayName}-命格身份證.png`,
        `${displayName} 的天命命格身份證`,
        `我的塔羅原型是「${tarotInfo.nameZh}」，快來天命共振探索你的命格！`,
      );
    } catch (err) {
      console.error('Share error:', err);
      setExportError('分享失敗，已改為下載');
      try {
        await downloadCanvas(canvas, `天命共振-${displayName}-命格身份證.png`);
      } catch {
        // ignore
      }
    } finally {
      setIsExporting(false);
    }
  }, [displayName, tarotInfo.nameZh, isRendering, isExporting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-md flex flex-col gap-3">
        {/* 頂部操作列 */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-400 shrink-0">命格身份證</div>
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
          style={{ aspectRatio: '9/16', background: '#0a0814' }}
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
