"use client";
import { useEffect, useState } from "react";

interface Props {
  attackerRolls: number[];
  defenderRolls: number[];
  showing: boolean;
}

export function DiceOverlay({ attackerRolls, defenderRolls, showing }: Props) {
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    if (!showing) return;
    let finishTimer: ReturnType<typeof setTimeout>;
    const startTimer = setTimeout(() => {
      setSpinning(true);
      finishTimer = setTimeout(() => setSpinning(false), 900);
    }, 0);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(finishTimer);
    };
  }, [showing, attackerRolls, defenderRolls]);

  if (!showing) return null;

  const pipsFor = (v: number) => {
    const map: Record<number, number[]> = {
      1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    };
    const active = map[v] || [];
    return Array.from({ length: 9 }, (_, i) => active.includes(i));
  };

  const Die = ({ value, winner, loser }: { value: number; winner: boolean; loser: boolean }) => {
    const pips = pipsFor(value);
    const bg = spinning
      ? "bg-linear-to-br from-gray-100 to-gray-300"
      : winner
      ? "bg-linear-to-br from-green-500 to-green-700"
      : loser
      ? "bg-linear-to-br from-red-600 to-red-800"
      : "bg-linear-to-br from-gray-100 to-gray-300";
    return (
      <div className={`relative w-16 h-16 rounded-xl ${bg} ${spinning ? "animate-spin" : ""} shadow-2xl border-2 border-white/20`}>
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2">
          {pips.map((on, i) => (
            <div key={i} className={`rounded-full ${on ? (spinning || winner || loser ? "bg-white" : "bg-black") : ""}`} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col gap-6 items-center p-10 bg-[#0a1424]/95 rounded-2xl border-2 border-[#f4c430]/40 shadow-[0_0_80px_rgba(244,196,48,0.4)]">
        <h3 className="text-[#f4c430] text-sm font-black tracking-[0.3em] uppercase">
          {spinning ? "🎲 Rolling..." : "⚔ Battle Resolved ⚔"}
        </h3>
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-center gap-3">
            <span className="text-green-400 text-xs font-black tracking-wider uppercase">Attacker</span>
            <div className="flex gap-2">
              {attackerRolls.map((v, i) => (
                <Die key={i} value={v} winner={!spinning && v > (defenderRolls[i] || 0)} loser={!spinning && v < (defenderRolls[i] || 0)} />
              ))}
            </div>
          </div>
          <div className="text-[#f4c430] font-black text-3xl">VS</div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-red-400 text-xs font-black tracking-wider uppercase">Defender</span>
            <div className="flex gap-2">
              {defenderRolls.map((v, i) => (
                <Die key={i} value={v} winner={!spinning && v > (attackerRolls[i] || 0)} loser={!spinning && v < (attackerRolls[i] || 0)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}