"use client";

import type { CSSProperties } from "react";
import type { Country } from "../../types";
import type { MapBattleAnimation } from "./MapTypes";

import { Soldier } from "./Soldier";
import { RollingDice } from "./RollingDice";

function Flag({ country }: { country: Country }) {
  const source =
    country.flag ||
    `https://flagcdn.com/w80/${country.id.toLowerCase()}.png`;

  return (
    <span
      className="battle-flag"
      role="img"
      aria-label={`${country.name} flag`}
      style={{
        backgroundImage: `url("${source}")`,
      }}
    />
  );
}

export function BattleScene({
  animation,
  countries,
}: {
  animation: MapBattleAnimation;
  countries: Country[];
}) {
  const attacker = countries.find(
    (country) => country.id === animation.fromId,
  );

  const defender = countries.find(
    (country) => country.id === animation.toId,
  );

  if (!attacker || !defender || !animation.dice) {
    return null;
  }

  const dice = animation.dice;

  return (
    <section
      key={animation.id}
      data-battle-id={animation.id}
      className={
        "battle-stage classic-stage " +
        (animation.active
          ? "is-running"
          : "is-resolved")
      }
      style={
        {
          "--battle-speed": "1",
        } as CSSProperties
      }
      aria-label={
        `${attacker.name} versus ${defender.name}`
      }
    >
      <header>
        <div className="battle-country">
          <Flag country={attacker} />

          <span>
            {attacker.name}
            <small>Attacking</small>
          </span>
        </div>

        <b>
          {animation.active
            ? "Live battle"
            : "Exchange complete"}
        </b>

        <div className="battle-country">
          <span>
            {defender.name}
            <small>Defending</small>
          </span>

          <Flag country={defender} />
        </div>
      </header>

      <div
        className="battle-ground"
        aria-hidden="true"
      >
        <div className="battle-army army-attacker">
          {Array.from(
            {
              length: Math.min(
                5,
                dice.attacker.length,
              ),
            },
            (_, index: number) => (
              <div
                key={index}
                className={
                  "battle-soldier " +
                  (index < dice.attackerLoss
                    ? "casualty"
                    : "survivor")
                }
              >
                <Soldier color="green" size={36} />
              </div>
            ),
          )}
        </div>

        <div className="battle-flash">⚔</div>

        <div className="battle-army army-defender">
          {Array.from(
            {
              length: Math.min(
                5,
                dice.defender.length,
              ),
            },
            (_, index: number) => (
              <div
                key={index}
                className={
                  "battle-soldier " +
                  (index < dice.defenderLoss
                    ? "casualty"
                    : "survivor")
                }
              >
                <span className="classic-facing-left">
                  <Soldier color="red" size={36} />
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <footer aria-live="polite">
        {animation.active
          ? "Armies advancing…"
          : (
              `${attacker.name} −${dice.attackerLoss} · ` +
              `${defender.name} −${dice.defenderLoss}`
            )}
      </footer>

      <RollingDice dice={dice} />
    </section>
  );
}