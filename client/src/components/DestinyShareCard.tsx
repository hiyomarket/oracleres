/**
 * 命格身份證分享卡
 * 
 * 設計規格（美術 Agent TASK-002 INTEGRATION-SPEC.md）：
 * - 橫排版 4:3 比例（800×600px）
 * - 左側 40%：塔羅牌插畫（2:3 比例，自帶金色卡框）
 * - 右側 60%：玻璃擬態面板，動態填入用戶命格資訊
 * - 背景：深藍紫漸層 #1A1A2A → #2D1B4E
 * - 主色：天命金 #C9A227
 * - 匯出：html2canvas 渲染成 PNG 下載
 * 
 * 性別差異化：
 * - 女生版：賽博少女風 + 日系輕奢風（暖色系）
 * - 男生版：暗黑武士風 + 國風仙俠風（冷色系）
 */

import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { getTarotCardUrl, getTarotCardInfo } from "@/lib/tarotCards";
import { Download, Share2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DestinyShareCardProps {
  // 用戶基本資訊
  displayName: string;
  gender: 'male' | 'female' | 'other' | null | undefined;
  birthDate?: string | null;
  birthLunar?: string | null;
  dayMasterElement?: string | null;
  // 生命靈數
  lifeNums: {
    outer: { num: number; name: string };
    middle: { num: number; name: string };
    primary: { num: number; name: string };
    soul: { num: number; name: string };
  } | null;
  // 四柱
  dayPillar?: string | null;
  yearPillar?: string | null;
  // 喜用神
  favorableElements?: string | null;
  // 關閉回調
  onClose: () => void;
}

const ELEMENT_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

const ELEMENT_ICON: Record<string, string> = {
  木: "🌳", 火: "🔥", 土: "🌍", 金: "⚪", 水: "💧",
};

// 根據性別決定視覺主題
function getTheme(gender: 'male' | 'female' | 'other' | null | undefined) {
  if (gender === 'male') {
    return {
      bgGradient: "linear-gradient(135deg, #0D1117 0%, #1A1A2A 40%, #0F1A2E 100%)",
      accentColor: "#C9A227",
      subColor: "#7BA7D4",
      textColor: "#E8F0F8",
      panelBg: "rgba(13, 25, 48, 0.7)",
      panelBorder: "rgba(201, 162, 39, 0.4)",
      dividerColor: "rgba(201, 162, 39, 0.3)",
      labelColor: "#7BA7D4",
      tagBg: "rgba(123, 167, 212, 0.15)",
      tagBorder: "rgba(123, 167, 212, 0.3)",
      brandText: "天命共振",
      styleLabel: "暗黑武士",
    };
  }
  // female / other / null → 女生版（預設）
  return {
    bgGradient: "linear-gradient(135deg, #1A1A2A 0%, #2D1B4E 50%, #1A0A2E 100%)",
    accentColor: "#C9A227",
    subColor: "#D4A0C8",
    textColor: "#F0E8F8",
    panelBg: "rgba(45, 27, 78, 0.6)",
    panelBorder: "rgba(201, 162, 39, 0.4)",
    dividerColor: "rgba(201, 162, 39, 0.25)",
    labelColor: "#D4A0C8",
    tagBg: "rgba(212, 160, 200, 0.15)",
    tagBorder: "rgba(212, 160, 200, 0.3)",
    brandText: "天命共振",
    styleLabel: "賽博少女",
  };
}

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // 主要塔羅牌：使用「中層靈數」作為主要原型（天賦使命）
  const primaryTarotNum = lifeNums?.middle.num ?? 0;
  const tarotInfo = getTarotCardInfo(primaryTarotNum);
  const tarotUrl = getTarotCardUrl(primaryTarotNum, gender === 'other' ? null : gender);
  const theme = getTheme(gender);

  // 日主五行
  const dayMasterZh = dayMasterElement ? (ELEMENT_ZH[dayMasterElement] ?? dayMasterElement) : null;
  const dayMasterIcon = dayMasterZh ? (ELEMENT_ICON[dayMasterZh] ?? "") : "";

  // 喜用神
  const favElements = favorableElements
    ? favorableElements.split(',').map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean)
    : [];

  // 格式化生日
  const formattedBirthDate = birthDate
    ? birthDate.replace(/-/g, ' / ')
    : null;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      // 等待圖片載入
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        width: 800,
        height: 600,
      });
      const link = document.createElement('a');
      link.download = `天命共振-${displayName}-命格身份證.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [displayName]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        width: 800,
        height: 600,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `天命共振-${displayName}-命格身份證.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${displayName} 的天命命格身份證`,
              text: `我的塔羅原型是「${tarotInfo.nameZh}」，快來天命共振探索你的命格！`,
              files: [file],
            });
            return;
          }
        }
        // fallback: 下載
        const link = document.createElement('a');
        link.download = `天命共振-${displayName}-命格身份證.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [displayName, tarotInfo.nameZh]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-3xl">
        {/* 操作按鈕列 */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">命格身份證 · 長按或點擊下載分享</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isExporting}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span className="ml-1">分享</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
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
            background: theme.bgGradient,
            display: 'flex',
            flexDirection: 'row',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: '"Noto Serif TC", "Noto Sans TC", serif',
            maxWidth: '100%',
            transform: 'scale(1)',
            transformOrigin: 'top left',
          }}
          className="destiny-share-card rounded-2xl shadow-2xl"
        >
          {/* 背景裝飾：星點 */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 80% 20%, rgba(201,162,39,0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(201,162,39,0.05) 0%, transparent 50%)',
          }} />

          {/* 左側：塔羅牌區（40%） */}
          <div style={{
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px 24px 24px',
            position: 'relative',
          }}>
            {/* 塔羅牌圖片 */}
            <div style={{
              width: '200px',
              height: '300px',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(201,162,39,0.2)',
              border: `1px solid rgba(201,162,39,0.3)`,
              flexShrink: 0,
            }}>
              <img
                src={tarotUrl}
                alt={tarotInfo.nameZh}
                crossOrigin="anonymous"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
            {/* 塔羅牌名稱 */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <div style={{
                color: theme.accentColor,
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.1em',
              }}>
                {tarotInfo.nameZh}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '10px',
                marginTop: '2px',
                letterSpacing: '0.05em',
              }}>
                {tarotInfo.nameEn}
              </div>
            </div>
          </div>

          {/* 右側：資訊面板（60%） */}
          <div style={{
            width: '60%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '28px 28px 28px 16px',
          }}>
            {/* 玻璃擬態面板 */}
            <div style={{
              background: theme.panelBg,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.panelBorder}`,
              borderRadius: '16px',
              padding: '24px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              {/* 頂部：品牌 + 姓名 */}
              <div>
                <div style={{
                  color: theme.accentColor,
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  marginBottom: '8px',
                  opacity: 0.8,
                }}>
                  ✦ {theme.brandText} · 命格身份證 ✦
                </div>
                <div style={{
                  color: theme.textColor,
                  fontSize: '26px',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  lineHeight: 1.2,
                }}>
                  {displayName}
                </div>
                {formattedBirthDate && (
                  <div style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: '11px',
                    marginTop: '4px',
                    letterSpacing: '0.05em',
                  }}>
                    {formattedBirthDate}
                    {birthLunar && ` · ${birthLunar}`}
                  </div>
                )}
              </div>

              {/* 分隔線 */}
              <div style={{
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${theme.dividerColor}, transparent)`,
                margin: '12px 0',
              }} />

              {/* 中部：塔羅原型 */}
              <div>
                <div style={{
                  color: theme.labelColor,
                  fontSize: '10px',
                  letterSpacing: '0.2em',
                  marginBottom: '6px',
                }}>
                  命格塔羅原型
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                }}>
                  <span style={{
                    color: theme.accentColor,
                    fontSize: '22px',
                    fontWeight: '700',
                  }}>
                    {tarotInfo.nameZh}
                  </span>
                  <span style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '11px',
                  }}>
                    No.{primaryTarotNum === 22 ? '0' : primaryTarotNum}
                  </span>
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '11px',
                  marginTop: '3px',
                }}>
                  {tarotInfo.keyword}
                </div>
              </div>

              {/* 分隔線 */}
              <div style={{
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${theme.dividerColor}, transparent)`,
                margin: '10px 0',
              }} />

              {/* 生命靈數 */}
              {lifeNums && (
                <div>
                  <div style={{
                    color: theme.labelColor,
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    marginBottom: '8px',
                  }}>
                    生命靈數
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                  }}>
                    {[
                      { label: '外層', num: lifeNums.outer.num, name: lifeNums.outer.name },
                      { label: '中層', num: lifeNums.middle.num, name: lifeNums.middle.name },
                      { label: '主要', num: lifeNums.primary.num, name: lifeNums.primary.name },
                      { label: '靈魂', num: lifeNums.soul.num, name: lifeNums.soul.name },
                    ].map(item => (
                      <div key={item.label} style={{
                        background: theme.tagBg,
                        border: `1px solid ${theme.tagBorder}`,
                        borderRadius: '8px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span style={{
                          color: theme.accentColor,
                          fontSize: '16px',
                          fontWeight: '700',
                          minWidth: '22px',
                        }}>
                          {item.num === 22 ? '0' : item.num}
                        </span>
                        <div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>{item.label}</div>
                          <div style={{ color: theme.textColor, fontSize: '11px', fontWeight: '500' }}>{item.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 分隔線 */}
              {(dayMasterZh || favElements.length > 0) && (
                <div style={{
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${theme.dividerColor}, transparent)`,
                  margin: '10px 0',
                }} />
              )}

              {/* 底部：日主 + 喜用神 */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {dayMasterZh && (
                  <div>
                    <div style={{ color: theme.labelColor, fontSize: '9px', letterSpacing: '0.15em', marginBottom: '3px' }}>日主五行</div>
                    <div style={{
                      color: theme.textColor,
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {dayMasterIcon} {dayMasterZh}
                    </div>
                  </div>
                )}
                {favElements.length > 0 && (
                  <div>
                    <div style={{ color: theme.labelColor, fontSize: '9px', letterSpacing: '0.15em', marginBottom: '3px' }}>喜用神</div>
                    <div style={{
                      color: theme.textColor,
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {favElements.map(el => `${ELEMENT_ICON[el] ?? ''}${el}`).join(' · ')}
                    </div>
                  </div>
                )}
              </div>

              {/* 底部品牌標識 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
              }}>
                <div style={{
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                }}>
                  oracleres.com
                </div>
                <div style={{
                  color: theme.accentColor,
                  fontSize: '9px',
                  opacity: 0.6,
                }}>
                  ✦ 天命共振 ✦
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 縮放提示（卡片超出螢幕時） */}
        <div className="text-center mt-3 text-xs text-gray-500">
          卡片尺寸 800×600px · 下載後可分享至社群媒體
        </div>
      </div>
    </div>
  );
}
