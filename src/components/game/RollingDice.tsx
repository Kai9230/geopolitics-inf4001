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

const ROTATIONS: Record<number, [number, number]> = {
  1: [0, 0],
  2: [0, -90],
  3: [-90, 0],
  4: [90, 0],
  5: [0, 90],
  6: [0, 180],
};

const FACE_TRANSFORMS: Record<number, string> = {
  1: "translateZ(28px)",
  2: "rotateY(90deg) translateZ(28px)",
  3: "rotateX(90deg) translateZ(28px)",
  4: "rotateX(-90deg) translateZ(28px)",
  5: "rotateY(-90deg) translateZ(28px)",
  6: "rotateY(180deg) translateZ(28px)",
};

function Die({
  value,
  side,
}: {
  value: number;
  side: "attacker" | "defender";
}) {
  const [rx, ry] = ROTATIONS[value];

  const cubeStyle = {
    position: "relative",
    width: 56,
    height: 56,
    transformStyle: "preserve-3d",
    transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
    "--gp-rx": `${rx}deg`,
    "--gp-ry": `${ry}deg`,
    "--gp-start-x": `${rx + 720}deg`,
    "--gp-start-y": `${ry + 1080}deg`,
  } as CSSProperties;

  const gold = side === "attacker";

  return (
    <div
      role="img"
      aria-label={`${side} rolled ${value}`}
      style={{
        position: "relative",
        width: 56,
        height: 56,
        margin: "20px 12px",
        perspective: 600,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -5,
          right: -5,
          bottom: -16,
          height: 12,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.55)",
          filter: "blur(5px)",
        }}
      />

      <div
        className="gp-dice-bounce"
        style={{
          width: 56,
          height: 56,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="gp-dice-cube"
          style={cubeStyle}
        >
          {[1, 2, 3, 4, 5, 6].map((face) => (
            <div
              key={face}
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
                gap: 3,
                padding: 9,
                boxSizing: "border-box",
                borderRadius: 9,
                border: `1px solid ${
                  gold ? "#ffe6a3" : "#ffb6b6"
                }`,
                background: gold
                  ? "linear-gradient(135deg,#ffe49a,#d59a27)"
                  : "linear-gradient(135deg,#f19494,#b63043)",
                boxShadow:
                  "inset 0 2px 4px rgba(255,255,255,.4)," +
                  "inset 0 -3px 5px rgba(0,0,0,.22)",
                backfaceVisibility: "hidden",
                transform: FACE_TRANSFORMS[face],
              }}
            >
              {PIPS[face].map((position) => (
                <span
                  key={position}
                  style={{
                    gridRow: Math.ceil(position / 3),
                    gridColumn: ((position - 1) % 3) + 1,
                    placeSelf: "center",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: gold ? "#382608" : "#fff5ee",
                    boxShadow:
                      "inset 0 1px 2px rgba(0,0,0,.4)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RollingDice({
  dice,
}: {
  dice: MapDiceResult;
}) {
  const validDie = (value: number) =>
    Number.isInteger(value) && value >= 1 && value <= 6;

  const valid =
    dice.attacker.length > 0 &&
    dice.attacker.length === dice.defender.length &&
    dice.attacker.every(validDie) &&
    dice.defender.every(validDie);

  if (!valid) {
    return (
      <p role="alert" style={{ color: "#ffb5b5" }}>
        Invalid battle dice received.
      </p>
    );
  }

  return (
    <section
      className="gp-dice-panel"
      aria-label="Three-dimensional battle dice"
    >
      <style>{`
        .gp-dice-panel {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          background:
            radial-gradient(
              ellipse at top left,
              rgba(235,186,77,.09),
              transparent 60%
            ),
            #0a1320;
          color: #edf2fa;
          font-family: var(--font-geist-sans), sans-serif;
        }

        .gp-dice-heading {
          margin: 0 0 6px;
          font-size: 22px;
          letter-spacing: -.04em;
        }

        .gp-dice-description {
          margin: 0 0 18px;
          color: #a9b5c8;
          font-size: 13px;
          line-height: 1.6;
        }

        .gp-dice-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(min(100%, 235px), 1fr));
          gap: 14px;
        }

        .gp-dice-pair {
          padding: 16px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          background: rgba(255,255,255,.025);
          text-align: center;
        }

        .gp-dice-pair h4 {
          margin: 0 0 8px;
          color: #bdc9db;
          font-size: 12px;
          font-weight: 600;
        }

        .gp-dice-table {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 125px;
        }

        .gp-dice-side {
          display: grid;
          justify-items: center;
        }

        .gp-dice-side > span {
          color: #9facc0;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .1em;
        }

        .gp-dice-versus {
          color: #687b96;
          font-size: 10px;
          font-weight: 800;
        }

        .gp-dice-verdict {
          display: grid;
          gap: 6px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .gp-dice-verdict strong {
          font-family: var(--font-geist-mono), monospace;
          font-size: 20px;
        }

        .gp-dice-verdict span {
          font-size: 12px;
          line-height: 1.5;
        }

        .is-running .gp-dice-cube {
          animation: gp-dice-tumble 1780ms
            cubic-bezier(.16,.65,.32,1) both;
        }

        .is-running .gp-dice-bounce {
          animation: gp-dice-hop 1780ms ease-out both;
        }

        .is-running .gp-dice-verdict {
          animation: gp-dice-reveal 1780ms linear both;
        }

        @keyframes gp-dice-tumble {
          from {
            transform:
              rotateX(var(--gp-start-x))
              rotateY(var(--gp-start-y));
          }
          to {
            transform:
              rotateX(var(--gp-rx))
              rotateY(var(--gp-ry));
          }
        }

        @keyframes gp-dice-hop {
          0% { transform: translateY(-24px); }
          32% { transform: translateY(0); }
          48% { transform: translateY(-12px); }
          65% { transform: translateY(0); }
          78% { transform: translateY(-5px); }
          100% { transform: translateY(0); }
        }

        @keyframes gp-dice-reveal {
          0%, 99% { opacity: 0; }
          100% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .is-running .gp-dice-cube,
          .is-running .gp-dice-bounce,
          .is-running .gp-dice-verdict {
            animation: none;
          }
        }
      `}</style>

      <h3 className="gp-dice-heading">Combat dice</h3>

      <p className="gp-dice-description">
        Gold attacks. Red defends. Each pair represents
        one soldier against one soldier.
      </p>

      <div className="gp-dice-grid">
        {dice.attacker.map((attacker, index) => {
          const defender = dice.defender[index];

          const verdict =
            attacker === defender
              ? "Tie · Neither soldier is lost"
              : attacker > defender
                ? "Defender loses one soldier"
                : "Attacker loses one soldier";

          const color =
            attacker === defender
              ? "#c0d1e9"
              : attacker > defender
                ? "#f4cf78"
                : "#ffacb4";

          return (
            <article
              key={index}
              className="gp-dice-pair"
            >
              <h4>Soldier pair {index + 1}</h4>

              <div className="gp-dice-table">
                <div className="gp-dice-side">
                  <span>ATTACKER</span>
                  <Die value={attacker} side="attacker" />
                </div>

                <span
                  className="gp-dice-versus"
                  aria-hidden="true"
                >
                  VS
                </span>

                <div className="gp-dice-side">
                  <span>DEFENDER</span>
                  <Die value={defender} side="defender" />
                </div>
              </div>

              <div
                className="gp-dice-verdict"
                style={{ color }}
              >
                <strong>
                  {attacker} : {defender}
                </strong>
                <span>{verdict}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}