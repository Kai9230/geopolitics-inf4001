"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Soldier } from "./Soldier";

interface Props {
  attackerName: string;
  defenderName: string;
  attackerFlag: string;
  defenderFlag: string;
  attackerSoldiers: number;
  defenderSoldiers: number;
  onComplete: () => void;
}

export function BattleScene({
  attackerName, defenderName,
  attackerFlag, defenderFlag,
  attackerSoldiers, defenderSoldiers,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<"charge" | "clash" | "resolve">("charge");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("clash"), 1200);
    const t2 = setTimeout(() => setPhase("resolve"), 2100);
    const t3 = setTimeout(() => onComplete(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const atkCount = Math.min(attackerSoldiers - 1, 5);
  const defCount = Math.min(defenderSoldiers, 5);
  const translate = phase === "charge" ? 0 : phase === "clash" ? 200 : 200;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="absolute inset-0 bg-linear-to-b from-[#0a0d1a] via-[#241810] to-black" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-[#f4c430]/10 blur-[120px]" />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center w-full max-w-4xl px-8 mb-10">
        <div className="text-center">
          <Image src={attackerFlag} alt={attackerName} width={80} height={48} className="w-20 h-12 mx-auto rounded border-2 border-green-400 shadow-lg" />
          <div className="text-green-400 text-sm font-bold uppercase tracking-widest mt-2">{attackerName}</div>
          <div className="text-[#f4c430] font-mono font-black text-3xl">⚔ {attackerSoldiers}</div>
        </div>
        <div className="text-[#f4c430] font-black text-5xl tracking-widest opacity-40">VS</div>
        <div className="text-center">
          <Image src={defenderFlag} alt={defenderName} width={80} height={48} className="w-20 h-12 mx-auto rounded border-2 border-red-400 shadow-lg" />
          <div className="text-red-400 text-sm font-bold uppercase tracking-widest mt-2">{defenderName}</div>
          <div className="text-[#f4c430] font-mono font-black text-3xl">🛡 {defenderSoldiers}</div>
        </div>
      </div>

      {/* Battlefield */}
      <div className="relative z-10 w-full max-w-5xl h-65 flex items-end justify-between px-12">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-[#1a1005] to-transparent" />
        <div className="absolute bottom-14 left-8 right-8 h-0.5 bg-linear-to-r from-transparent via-[#f4c430]/40 to-transparent" />

        {/* Attacker army */}
        <div className="relative flex gap-1 items-end">
          {Array.from({ length: atkCount }).map((_, i) => (
            <div
              key={`a-${i}`}
              style={{
                transform: `translateX(${translate}px)`,
                transition: "transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDelay: `${i * 80}ms`,
                opacity: phase === "resolve" ? 0.3 : 1,
              }}
            >
              <Soldier color="green" size={36} />
            </div>
          ))}
        </div>

        {/* Clash FX */}
        {phase === "clash" && (
          <>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl animate-ping z-20">⚔️</div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-[#f4c430]/50 blur-3xl animate-pulse" />
          </>
        )}

        {/* Defender army */}
        <div className="relative flex gap-1 items-end">
          {Array.from({ length: defCount }).map((_, i) => (
            <div
              key={`d-${i}`}
              style={{
                transform: `translateX(-${translate}px)`,
                transition: "transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDelay: `${i * 80}ms`,
                opacity: phase === "resolve" ? 0.3 : 1,
              }}
            >
              <Soldier color="red" size={36} />
            </div>
          ))}
        </div>
      </div>

      {/* Phase label */}
      <div className="relative z-10 mt-10 px-8 py-3 bg-black/70 rounded-full border border-[#f4c430]/50">
        <div className="text-[#f4c430] font-black text-sm tracking-[0.4em] uppercase">
          {phase === "charge" && "⚔ Armies Charge ⚔"}
          {phase === "clash" && "💥 Steel Meets Steel 💥"}
          {phase === "resolve" && "Fallen Counted..."}
        </div>
      </div>
    </div>
  );
}