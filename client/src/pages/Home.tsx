import { useState } from "react";
import PurifyMind from "./PurifyMind";
import OracleCast from "./OracleCast";

type AppPhase = 'purify' | 'cast';

export default function Home() {
  const [appPhase, setAppPhase] = useState<AppPhase>('purify');

  return (
    <div className="min-h-screen bg-background">
      {appPhase === 'purify' && (
        <PurifyMind onReady={() => setAppPhase('cast')} />
      )}
      {appPhase === 'cast' && (
        <OracleCast />
      )}
    </div>
  );
}
