import { SharedNav } from "@/components/SharedNav";
import { Smartphone, Share2, Plus, MoreHorizontal, CheckCircle } from "lucide-react";

export default function AddToHome() {
  return (
    <div className="oracle-page text-foreground">
      <SharedNav currentPage="profile" />

      <div className="max-w-2xl mx-auto px-4 py-10 pb-28 md:pb-10">
        {/* 標題區 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-900/30 border border-amber-600/40 mb-4">
            <Smartphone className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">將「天命共振」加入主畫面</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            一鍵快速啟動，讓命理能量隨時陪伴你。<br />
            加入主畫面後，天命共振就像 App 一樣，直接從桌面開啟，無需每次搜尋網址。
          </p>
        </div>

        {/* iPhone / iPad */}
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-lg">🍎</div>
            <div>
              <p className="text-sm font-semibold text-white">iPhone / iPad 使用者</p>
              <p className="text-xs text-slate-500">Safari 瀏覽器</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            {[
              {
                icon: <Share2 className="w-4 h-4 text-sky-400" />,
                step: "1",
                title: "點擊「分享」按鈕",
                desc: "在 Safari 底部工具列（或頂部網址列旁），找到向上箭頭的「分享」按鈕並點擊。",
              },
              {
                icon: <Plus className="w-4 h-4 text-emerald-400" />,
                step: "2",
                title: "選擇「加入主畫面」",
                desc: "在分享選單中向下滑動，找到並點選「加入主畫面」（Add to Home Screen）。",
              },
              {
                icon: <CheckCircle className="w-4 h-4 text-amber-400" />,
                step: "3",
                title: "確認名稱並新增",
                desc: "可以編輯顯示在主畫面的名稱（建議保留預設「天命共振」），然後點擊右上角的「新增」（Add）。",
              },
              {
                icon: <Smartphone className="w-4 h-4 text-violet-400" />,
                step: "4",
                title: "完成！",
                desc: "回到手機主畫面，就能看到天命共振的專屬圖示。點擊它，立即開始使用！",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                    {item.step}
                  </div>
                  {item.step !== "4" && <div className="w-px flex-1 bg-slate-800 min-h-[16px]" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.icon}
                    <p className="text-sm font-medium text-white">{item.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Android */}
        <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-lg">🤖</div>
            <div>
              <p className="text-sm font-semibold text-white">Android 手機使用者</p>
              <p className="text-xs text-slate-500">Chrome 瀏覽器</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            {[
              {
                icon: <Share2 className="w-4 h-4 text-sky-400" />,
                step: "1",
                title: "點擊分享按鈕",
                desc: "在 Chrome 瀏覽器網址列右方，找到向上的「分享」按鈕並點擊。",
              },
              {
                icon: <MoreHorizontal className="w-4 h-4 text-emerald-400" />,
                step: "2",
                title: "點選「更多」功能",
                desc: "在分享選單中找到並點選「更多」，展開完整功能列表。",
              },
              {
                icon: <Plus className="w-4 h-4 text-amber-400" />,
                step: "3",
                title: "選擇「加入主畫面」",
                desc: "在功能列表中找到「加入主畫面」選項並點選。",
              },
              {
                icon: <CheckCircle className="w-4 h-4 text-violet-400" />,
                step: "4",
                title: "自訂名稱並加入",
                desc: "可以自訂顯示在主畫面的名稱，確認後點擊「加入」即完成。",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                    {item.step}
                  </div>
                  {item.step !== "4" && <div className="w-px flex-1 bg-slate-800 min-h-[16px]" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.icon}
                    <p className="text-sm font-medium text-white">{item.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="rounded-2xl border border-amber-600/20 bg-amber-900/10 px-5 py-4 text-center">
          <p className="text-xs text-amber-400/80 leading-relaxed">
            ✦ 加入主畫面後，天命共振將以全螢幕模式開啟，提供更沉浸的命理體驗。<br />
            若您的瀏覽器版本較舊，部分步驟名稱可能略有不同，請依畫面提示操作。
          </p>
        </div>
      </div>
    </div>
  );
}
