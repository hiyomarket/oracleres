import { lazy, Suspense, useState } from "react";
import PurifyMind from "./PurifyMind";

const OracleCast = lazy(() => import("./OracleCast"));

type AppPhase = 'purify' | 'cast';

export default function Home() {
  const [appPhase, setAppPhase] = useState<AppPhase>('purify');

  return (
    <div className="min-h-screen bg-background">
      {appPhase === 'purify' && (
        <PurifyMind onReady={() => setAppPhase('cast')} />
      )}
      {appPhase === 'cast' && (
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <OracleCast />
        </Suspense>
      )}
    </div>
  );
}
