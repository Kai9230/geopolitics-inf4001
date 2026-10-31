"use client";

import { useEffect, useRef } from "react";

interface Props {
  battleId: number;
  fast: boolean;
  onImpact: () => void;
  onComplete: () => void;
}

export function BattleTimeline({
  battleId,
  fast,
  onImpact,
  onComplete,
}: Props) {
  const desiredRate = useRef(fast ? 2.5 : 1);

  const callbacks = useRef({
    onImpact,
    onComplete,
  });

  useEffect(() => {
    desiredRate.current = fast ? 2.5 : 1;
  }, [fast]);

  useEffect(() => {
    callbacks.current = {
      onImpact,
      onComplete,
    };
  }, [onImpact, onComplete]);

  useEffect(() => {
    let frame = 0;
    let previousTime: number | null = null;
    let elapsed = 0;
    let rate = desiredRate.current;
    let impactPlayed = false;
    let captured = false;

    let animations: Animation[] = [];
    let map: SVGSVGElement | null = null;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function tick(now: number): void {
      if (!captured) {
        const stage = document.querySelector<HTMLElement>(
          `[data-battle-id="${battleId}"]`,
        );

        if (stage) {
          animations = stage.getAnimations({
            subtree: true,
          });

          for (const animation of animations) {
            animation.pause();
            animation.currentTime = 0;
          }

          captured = true;
        }
      }

      if (!map) {
        map = document.querySelector<SVGSVGElement>(
          ".map-panel > svg",
        );

        if (map) {
          map.pauseAnimations();
        }
      }

      const delta =
        previousTime === null
          ? 0
          : Math.max(0, now - previousTime);

      previousTime = now;

      rate +=
        (desiredRate.current - rate) *
        (1 - Math.exp(-delta / 120));

      elapsed = Math.min(
        2650,
        elapsed + delta * rate,
      );

      const visualTime = reducedMotion ? 2650 : elapsed;

      for (const animation of animations) {
        animation.currentTime = visualTime;
      }

      if (map) {
        map.setCurrentTime(visualTime / 1000);
      }

      if (!impactPlayed && elapsed >= 1780) {
        impactPlayed = true;
        callbacks.current.onImpact();
      }

      if (elapsed >= 2650) {
        callbacks.current.onComplete();
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);

      for (const animation of animations) {
        animation.pause();
      }
    };
  }, [battleId]);

  return null;
}