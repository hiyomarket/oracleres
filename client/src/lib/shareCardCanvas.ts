/**
 * shareCardCanvas.ts
 * 共用的 Canvas 分享卡繪製工具
 *
 * 設計規格：
 * - 輸出尺寸：1080×1920px（9:16 手機分享比例）
 * - 塔羅牌/圖示作為全版背景底圖，帶半透明深色遮罩
 * - 文字疊加在遮罩上方，確保可讀性
 * - 完全使用 Canvas 2D API，不依賴 html2canvas，繞開 CORS 問題
 */

export const CARD_W = 1080;
export const CARD_H = 1920;

/**
 * 從 URL 載入圖片，回傳 HTMLImageElement
 * 先嘗試直接載入（帶 crossOrigin），失敗時改用 fetch + blob URL 繞開 CORS
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  // 方法一：直接帶 crossOrigin 載入
  const tryDirect = (): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  // 方法二：fetch 轉 blob URL（繞開 CORS header 問題）
  const tryFetch = async (): Promise<HTMLImageElement> => {
    const resp = await fetch(url, { mode: 'cors' });
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        resolve(img);
      };
      img.onerror = reject;
      img.src = blobUrl;
    });
  };

  try {
    return await tryDirect();
  } catch {
    return await tryFetch();
  }
}

/**
 * 載入字型（確保 Canvas 能渲染中文）
 */
export async function ensureFonts(): Promise<void> {
  if (document.fonts) {
    await document.fonts.ready;
  }
}

/**
 * 在 Canvas 上繪製多行文字（自動換行）
 * @returns 實際渲染的行數（不含第一行，即額外換行次數 + 1）
 */
export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 6,
): number {
  if (!text) return 1;
  const chars = text.split('');
  let line = '';
  let lineCount = 1; // 至少一行
  let currentY = y;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, x, currentY);
      line = chars[i];
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines) {
        // 超過最大行數，加省略號
        let truncated = line;
        while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + '…', x, currentY);
        return lineCount;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
  }
  return lineCount;
}

/**
 * 繪製圓角矩形
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * 將 Canvas 轉為 Blob（非同步，避免大圖 toDataURL 記憶體崩潰）
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob 失敗'));
      },
      'image/png',
      quality,
    );
  });
}

/**
 * 下載 Canvas 為 PNG（使用 toBlob 避免手機記憶體崩潰）
 */
export async function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  // 延遲清理，確保下載觸發
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * 分享 Canvas（Web Share API，失敗時 fallback 下載）
 */
export async function shareCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  title: string,
  text: string,
): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
  } else {
    // fallback：下載
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  }
}
