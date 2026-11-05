"use client";

import { useEffect, useRef, type RefObject } from "react";
import { FlightLedger, FlightPlayback } from "@/lib/engine/BattleVisuals";
import type { MapDiceResult } from "./MapTypes";

type Props = {
  id: number; attackKey: string; playbackKey: string; ledger: RefObject<FlightLedger>;
  from: [number, number]; to: [number, number];
  attackerColor: string; defenderColor: string; dice: MapDiceResult | null;
};

export default function BattleEffects({ id, attackKey, playbackKey, ledger,
  from, to, attackerColor, defenderColor, dice }: Props) {
  const plane = useRef<SVGGElement>(null);
  const bomb = useRef<SVGGElement>(null);
  const sourceImpact = useRef<SVGGElement>(null);
  const targetImpact = useRef<SVGGElement>(null);
  const [fx, fy] = from, [tx, ty] = to;
  const cx = (fx + tx) / 2, cy = Math.min(fy, ty) - 65;
  const path = `M${fx} ${fy} Q${cx} ${cy} ${tx} ${ty - 26}`;

  useEffect(() => {
    const playback = new FlightPlayback(ledger.current, attackKey, playbackKey);
    const render = (event: Event) => {
      const detail = (event as CustomEvent<{ id: number; elapsed: number }>).detail;
      if (detail.id !== id) return;
      const frame = playback.sample(detail.elapsed);
      const t = frame.progress, a = 1 - t;
      const x = a*a*fx + 2*a*t*cx + t*t*tx;
      const y = a*a*fy + 2*a*t*cy + t*t*(ty-26);
      const dx = 2*a*(cx-fx) + 2*t*(tx-cx);
      const dy = 2*a*(cy-fy) + 2*t*(ty-26-cy);
      plane.current?.setAttribute("transform", `translate(${x} ${y}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`);
      plane.current?.setAttribute("opacity", String(frame.opacity));
      bomb.current?.setAttribute("transform", `translate(${tx} ${ty-26+frame.bombProgress*26})`);
      bomb.current?.setAttribute("opacity", frame.bomb ? "1" : "0");
      for (const impact of [sourceImpact.current, targetImpact.current]) {
        impact?.setAttribute("opacity", String(frame.impactOpacity));
        const circle = impact?.querySelector("circle");
        circle?.setAttribute("r", String(3+frame.impact*24));
      }
    };
    window.addEventListener("geopolitics-battle-frame", render);
    return () => window.removeEventListener("geopolitics-battle-frame", render);
  }, [id, attackKey, playbackKey, ledger, fx, fy, tx, ty, cx, cy]);

  return <g className="battle-effects" pointerEvents="none" aria-label="Recorded dice exchange and combat losses">
    <path d={path} fill="none" stroke={attackerColor} strokeWidth="1.5" strokeDasharray="5 5" opacity=".6" />
    <circle cx={tx} cy={ty} r="24" fill="none" stroke={defenderColor} strokeDasharray="3 4" />
    <g ref={plane} className="fighter" opacity="0" data-aircraft="one-sortie-per-exchange">
      <path d="M17 0L4 -3L-4 -15L-8 -15L-4 -3L-12 -3L-16 -7L-19 -7L-16 0L-19 7L-16 7L-12 3L-4 3L-8 15L-4 15L4 3Z"
        fill="#e4edf7" stroke={attackerColor} strokeWidth="1" />
      <path d="M-15 0H-34" stroke={attackerColor} strokeWidth="2" opacity=".5" />
    </g>
    {dice && dice.defenderLoss > 0 && <g ref={bomb} className="bomb" opacity="0">
      <path d="M-2 -5H2L3 3L0 7L-3 3Z" fill="#e8d6a1" stroke="#08111d" />
    </g>}
    {!!dice?.attackerLoss && <g ref={sourceImpact} className="casualty-impact" transform={`translate(${fx} ${fy})`} opacity="0">
      <circle r="3" fill="#ffc17a55" stroke="#ffc17a" />
      <text y="-20" textAnchor="middle" fill="#ffd9b1" fontSize="11">−{dice.attackerLoss}</text>
    </g>}
    {!!dice?.defenderLoss && <g ref={targetImpact} className="casualty-impact" transform={`translate(${tx} ${ty})`} opacity="0">
      <circle r="3" fill="#ffc17a55" stroke="#ffc17a" />
      <text y="-20" textAnchor="middle" fill="#ffd9b1" fontSize="11">−{dice.defenderLoss}</text>
    </g>}
    <g transform={`translate(${Math.max(85,Math.min(915,tx))} ${Math.max(18,ty-47)})`}>
      <rect x="-82" y="-12" width="164" height="24" rx="5" fill="#04101df0" stroke="#ba9b5c66" />
      <text y="4" textAnchor="middle" fill="#ffe2a2" fontSize="8">
        EXCHANGE · LOSSES {dice?.attackerLoss ?? 0} / {dice?.defenderLoss ?? 0}
      </text>
    </g>
  </g>;
}
