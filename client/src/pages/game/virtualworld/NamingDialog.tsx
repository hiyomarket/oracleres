/**
 * NamingDialog — 命名對話框
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function NamingDialog({ onNamed }: { onNamed: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const mut = trpc.gameWorld.nameAgent.useMutation({
    onSuccess: () => onNamed(),
    onError: (e) => setError(e.message),
  });
  const submit = () => {
    const t = name.trim();
    if (t.length < 1 || t.length > 12) { setError("名稱需 1-12 字"); return; }
    mut.mutate({ name: t });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{
          background: "linear-gradient(135deg, #0f1a2e 0%, #1a2a3a 100%)",
          border: "1px solid rgba(245,158,11,0.3)",
          boxShadow: "0 0 60px rgba(245,158,11,0.2)",
        }}>
        <div className="text-center">
          <div className="text-5xl mb-3">✨</div>
          <h2 className="text-2xl font-bold tracking-widest mb-1"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            命格旅人誕生
          </h2>
          <p className="text-slate-500 text-sm">為你的旅人命名，踏上命格之旅</p>
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="輸入旅人名稱（1-12字）"
          maxLength={12}
          className="w-full px-4 py-3 rounded-xl text-slate-200 text-center text-lg font-bold tracking-widest outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,158,11,0.3)" }}
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button onClick={submit} disabled={mut.isPending}
          className="w-full py-3.5 rounded-xl font-bold text-black text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
          {mut.isPending ? "⏳ 命格生成中…" : "✨ 確認命名"}
        </button>
      </div>
    </div>
  );
}
