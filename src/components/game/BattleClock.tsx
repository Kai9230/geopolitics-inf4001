"use client";

import { useEffect, useRef } from "react";
import { SoundEngine } from "@/lib/audio/SoundEngine";

export default function BattleClock({ id, fast, done }: {
  id: number; fast: boolean; done: () => void;
}) {
  const settings = useRef({ fast, done });
  useEffect(() => { settings.current = { fast, done }; }, [fast, done]);
  useEffect(() => {
    let frame = 0, previous = 0, elapsed = 0;
    let impact = false;
    const effects = new Set<Animation>();
    const stage = document.querySelector(`[data-battle-id="${id}"]`);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const collect = () => {
      stage?.getAnimations?.({ subtree: true }).forEach(effect => {
        if (!effects.has(effect)) { effect.pause(); effects.add(effect); }
      });
    };
    collect();
    const observer = new MutationObserver(collect);
    if (stage) observer.observe(stage, { childList: true, subtree: true });
    SoundEngine.diceRoll();
    const tick = (now: number) => {
      const delta = previous ? Math.min(now - previous, 100) : 0;
      previous = now;
      elapsed = Math.min(2650, elapsed + delta * (settings.current.fast ? 2.5 : 1));
      const visual = reduced ? 2650 : elapsed;
      effects.forEach(effect => { effect.currentTime = visual; });
      window.dispatchEvent(new CustomEvent("geopolitics-battle-frame", {
        detail: { id, elapsed: visual },
      }));
      if (!impact && elapsed >= 1780) { impact = true; SoundEngine.explosion(); }
      if (elapsed >= 2650) { settings.current.done(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [id]);
  return null;
}
