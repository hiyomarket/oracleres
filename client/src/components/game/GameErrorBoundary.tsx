import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * GameErrorBoundary — 遊戲頁面專用的錯誤邊界
 * 捕捉子組件的渲染錯誤，顯示友善的錯誤提示而非白屏
 */
export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[GameErrorBoundary] 捕捉到渲染錯誤:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null });
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6"
          style={{
            background: "linear-gradient(135deg, #0a0a0f 0%, #1a0a0a 50%, #0a0a0f 100%)",
          }}>
          <div className="max-w-md w-full text-center space-y-6">
            {/* 錯誤圖示 */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(220,38,38,0.2) 0%, transparent 70%)",
                  animation: "pulse 2s ease-in-out infinite",
                }} />
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                style={{
                  background: "rgba(220,38,38,0.1)",
                  border: "2px solid rgba(220,38,38,0.3)",
                  boxShadow: "0 0 20px rgba(220,38,38,0.2)",
                }}>
                ⚠️
              </div>
            </div>

            {/* 標題 */}
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">
                {this.props.fallbackTitle ?? "遊戲載入異常"}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                遊戲畫面遇到了預期外的問題。這不會影響你的遊戲進度，請嘗試重新載入頁面。
              </p>
            </div>

            {/* 錯誤詳情（可摺疊） */}
            {this.state.error && (
              <details className="text-left">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                  查看錯誤詳情
                </summary>
                <pre className="mt-2 p-3 rounded-lg text-[10px] text-red-300/70 overflow-auto max-h-32"
                  style={{
                    background: "rgba(220,38,38,0.05)",
                    border: "1px solid rgba(220,38,38,0.15)",
                  }}>
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack?.split("\n").slice(0, 5).join("\n")}
                </pre>
              </details>
            )}

            {/* 操作按鈕 */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleGoBack}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(100,100,120,0.15)",
                  color: "#94a3b8",
                  border: "1px solid rgba(100,100,120,0.3)",
                }}>
                返回上一頁
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, rgba(220,38,38,0.25), rgba(245,158,11,0.25))",
                  color: "#fbbf24",
                  border: "1px solid rgba(245,158,11,0.4)",
                  boxShadow: "0 0 12px rgba(245,158,11,0.15)",
                }}>
                重新載入
              </button>
            </div>

            {/* 底部提示 */}
            <p className="text-[10px] text-slate-600">
              若問題持續發生，請聯繫管理員
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GameErrorBoundary;
