"use client";

import type { CSSProperties } from "react";
import type { MapDiceResult } from "./MapTypes";

const PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const ROTATIONS: Record<number, [string, string]> = {
  1: ["0deg", "0deg"],
  2: ["0deg", "-90deg"],
  3: ["-90deg", "0deg"],
  4: ["90deg", "0deg"],
  5: ["0deg", "90deg"],
  6: ["0deg", "180deg"],
};

function Die({
  value,
  side,
}: {
  value: number;
  side: "attacker" | "defender";
}) {
  const [rotationX, rotationY] =
    ROTATIONS[value] ?? ROTATIONS[1];

  return (
    <div
      className={`real-die ${side}`}
      role="img"
      aria-label={`${side} rolled ${value}`}
    >
      <div
        className="die-cube"
        style={
          {
            "--die-rx": rotationX,
            "--die-ry": rotationY,
          } as CSSProperties
        }
      >
        {[1, 2, 3, 4, 5, 6].map(
          (face: number) => (
            <div
              key={face}
              className={`die-face face-${face}`}
            >
              {PIPS[face].map(
                (position: number) => (
                  <i
                    key={position}
                    style={{
                      gridRow: Math.ceil(position / 3),
                      gridColumn:
                        ((position - 1) % 3) + 1,
                    }}
                  />
                ),
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function RollingDice({
  dice,
}: {
  dice: MapDiceResult;
}) {
  const pairCount = Math.min(
    dice.attacker.length,
    dice.defender.length,
  );

  return (
    <section
      className="rolling-dice-panel"
      aria-label="Actual battle dice"
    >
      <h3>
        Combat dice
        <span>
          Gold: attacker · Red: defender
        </span>
      </h3>

      <div className="rolling-dice-pairs">
        {Array.from(
          { length: pairCount },
          (_, index: number) => {
            const attacker = dice.attacker[index];
            const defender = dice.defender[index];

            const outcome =
              attacker === defender
                ? "Tie · No loss"
                : attacker > defender
                  ? "Defender −1"
                  : "Attacker −1";

            return (
              <div
                className="rolling-dice-pair"
                key={index}
              >
                <small>Pair {index + 1}</small>

                <div className="dice-table">
                  <Die
                    value={attacker}
                    side="attacker"
                  />

                  <Die
                    value={defender}
                    side="defender"
                  />
                </div>

                <span className="dice-verdict">
                  {outcome}
                </span>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}