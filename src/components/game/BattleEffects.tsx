"use client";

import type { MapDiceResult } from "./MapTypes";

type Point = [number, number];

type Props = {
  from: Point;
  to: Point;
  attackerColor: string;
  defenderColor: string;
  dice: MapDiceResult | null;
  fast?: boolean;
  showAircraft?: boolean;
};

export default function BattleEffects({
  from,
  to,
  attackerColor,
  defenderColor,
  dice,
  fast = false,
  showAircraft = true,
}: Props) {
  const speed = fast ? 0.34 : 1;
  const time = (seconds: number) => `${seconds * speed}s`;

  const landing = {
    x: to[0],
    y: to[1] - 3,
  };

  const control = {
    x: (from[0] + to[0]) / 2,
    y: Math.min(from[1], to[1]) - 65,
  };

  const route =
    `M${from[0]} ${from[1]} ` +
    `Q${control.x} ${control.y} ` +
    `${landing.x} ${landing.y - 23}`;

  const impacts = [
    {
      x: landing.x,
      y: landing.y,
      losses: dice?.defenderLoss ?? 0,
    },
    {
      x: to[0] - 16,
      y: to[1] + 8,
      losses: dice?.attackerLoss ?? 0,
    },
  ];

  return (
    <g
      className="battle-effects"
      pointerEvents="none"
      aria-label={
        dice
          ? `Attacker loses ${dice.attackerLoss}, defender loses ${dice.defenderLoss}`
          : "Aircraft approaching target"
      }
    >
      <path
        d={route}
        fill="none"
        stroke={attackerColor}
        strokeWidth="6"
        strokeOpacity=".1"
      />

      <path
        d={route}
        fill="none"
        stroke={attackerColor}
        strokeWidth="1.5"
        strokeDasharray="5 5"
      />

      <circle
        cx={to[0]}
        cy={to[1]}
        r="24"
        fill="none"
        stroke={defenderColor}
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      {showAircraft && [0, 1].map((index: number) => (
        <g
          key={`plane-${index}`}
          className="fighter"
          fill="#e4edf7"
          stroke={attackerColor}
          strokeWidth=".8"
          opacity="0"
        >
          <g
            transform={`translate(0 ${index * 12 - 6}) scale(1.25)`}
          >
            <path
              d="
                M14 0
                L3 -2
                L-4 -11
                L-7 -11
                L-4 -2
                L-10 -2
                L-13 -5
                L-15 -5
                L-13 0
                L-15 5
                L-13 5
                L-10 2
                L-4 2
                L-7 11
                L-4 11
                L3 2
                Z
              "
            />

            <path
              d="M-14 0H-27"
              stroke={attackerColor}
              strokeWidth="1"
              strokeOpacity=".5"
            />
          </g>

          <animateMotion
            path={route}
            dur={time(1.45)}
            begin={time(index * 0.12)}
            rotate="auto"
            fill="freeze"
          />

          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;.08;.84;1"
            begin={time(index * 0.12)}
            dur={time(1.85)}
            fill="freeze"
          />
        </g>
      ))}

      {showAircraft && dice && dice.defenderLoss > 0 && (
        <g
          className="bomb"
          fill="#e5edf7"
          stroke="#09101b"
          strokeWidth=".8"
          opacity="0"
        >
          <path d="M-2 -5H2L3 3L0 7L-3 3Z" />

          <animateMotion
            path={
              `M${landing.x} ${landing.y - 23} ` +
              `Q${landing.x + 3} ${landing.y - 9} ` +
              `${landing.x} ${landing.y}`
            }
            begin={time(1.4)}
            dur={time(0.4)}
            fill="freeze"
          />

          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;.02;.92;1"
            begin={time(1.4)}
            dur={time(0.42)}
            fill="freeze"
          />
        </g>
      )}

      {impacts
        .filter((impact) => impact.losses > 0)
        .map((impact, index: number) => (
          <g
            key={`impact-${index}`}
            className="casualty-impact"
            transform={`translate(${impact.x} ${impact.y})`}
          >
            <circle r="2" fill="#fff3c2" opacity="0">
              <animate
                attributeName="r"
                values="2;9;14"
                begin={time(1.78)}
                dur={time(0.6)}
                fill="freeze"
              />

              <animate
                attributeName="opacity"
                values="1;.8;0"
                begin={time(1.78)}
                dur={time(0.6)}
                fill="freeze"
              />
            </circle>

            <circle
              r="3"
              fill="none"
              stroke="#ffc17a"
              strokeWidth="1.5"
              opacity="0"
            >
              <animate
                attributeName="r"
                values="3;24"
                begin={time(1.78)}
                dur={time(0.7)}
                fill="freeze"
              />

              <animate
                attributeName="opacity"
                values="1;0"
                begin={time(1.78)}
                dur={time(0.7)}
                fill="freeze"
              />
            </circle>
          </g>
        ))}

      <g
        transform={
          `translate(${Math.max(72, Math.min(928, to[0]))} ` +
          `${Math.max(18, to[1] - 47)})`
        }
      >
        <rect
          x="-68"
          y="-10"
          width="136"
          height="22"
          rx="4"
          fill="#04101df0"
          stroke="#b2924955"
        />

        <text
          y="4"
          textAnchor="middle"
          fill="#ffe2a2"
          fontSize="8"
          fontWeight="800"
        >
          {dice
            ? `LOSSES −${dice.attackerLoss} / −${dice.defenderLoss}`
            : "AIRCRAFT APPROACHING"}
        </text>
      </g>
    </g>
  );
}