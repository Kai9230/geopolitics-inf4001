"use client";

import Link from "next/link";
import { useState } from "react";
import type { CampaignAction, CampaignState } from "@/types/game-state";
import s from "./CampaignExperience.module.css";

export default function CampaignExtras({ state, enabled, showResult, submit, replay }: {
  state: CampaignState;
  enabled: boolean;
  showResult: boolean;
  submit: (action: CampaignAction) => void;
  replay: () => void;
}) {
  const [target, setTarget] = useState("");
  const opponents = state.participants.filter(p => p.id !== "human" &&
    state.countries.some(c => c.ownerId === p.id));
  const treaties = (state.treaties ?? []).filter(t =>
    t.expiresRound >= state.round && t.members.includes("human"));
  const treaty = treaties.find(t => t.members.includes(target));
  const winner = state.participants.find(p => p.id === state.winnerId);
  const won = state.winnerId === "human";
  return <>
    {showResult && <section className={s.result} aria-label="Campaign result">
      <small>ALL TEN NATIONS CONQUERED</small>
      <h2>{won ? "WORLD VICTORY" : `${winner?.name ?? "Opponent"} wins`}</h2>
      <p>{won ? "Your strategy united the board under one command." :
        "The campaign has ended. Review its battles and return with a new strategy."}</p>
      <p>Round {state.round} · {state.revision} recorded actions · 10 / 10 countries</p>
      <div><button onClick={replay}>Watch campaign replay</button>{" "}
      <Link href="/lobby">Return to war room</Link></div>
    </section>}
    {state.status === "active" && <details className={s.panel}>
      <summary>Alliances & diplomacy</summary>
      <p>Offer one treaty per turn. NPCs accept when deterrence or a shared threat benefits them.
      Allies prefer other targets. Attacking an ally breaks the treaty immediately.
      Treaties expire after the next round; only one participant can win.</p>
      <label>Diplomatic partner
        <select value={target} onChange={e => setTarget(e.target.value)}>
          <option value="">Choose a nation</option>
          {opponents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <button disabled={!enabled || !!state.diplomacyUsed || !opponents.some(p => p.id === target)}
        onClick={() => submit({ type: "diplomacy", targetId: target, operation: treaty ? "break" : "offer" })}>
        {treaty ? "End treaty" : "Offer temporary alliance"}
      </button>
      {treaties.map(t => <p key={t.members.join(":")}>Treaty with {state.participants.find(p =>
        p.id === t.members.find(id => id !== "human"))?.name} · expires after round {t.expiresRound}</p>)}
      {state.diplomacyUsed && <p>Your diplomatic action has been used this turn.</p>}
    </details>}
  </>;
}
