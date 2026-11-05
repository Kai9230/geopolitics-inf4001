"use client";

import Link from "next/link";
import { useState } from "react";
import type { CampaignAction, CampaignState } from "@/types/game-state";
import s from "./CampaignExperience.module.css";

export default function CampaignExtras({ state, displayState, enabled, showResult, submit, replay, mode = "overview" }: {
  mode?: "overview" | "diplomacy";
  state: CampaignState;
  displayState: CampaignState;
  enabled: boolean;
  showResult: boolean;
  submit: (action: CampaignAction) => void;
  replay: () => void;
}) {
  const [target, setTarget] = useState("");
  const owned = displayState.countries.filter(c => c.ownerId === "human");
  const strength = (id: string) => state.countries.filter(c => c.ownerId === id)
    .reduce((total, c) => total + c.soldiers, 0);
  const opponents = state.participants.filter(p => p.id !== "human" &&
    state.countries.some(c => c.ownerId === p.id));
  const treaties = (state.treaties ?? []).filter(t =>
    t.expiresRound >= state.round && t.members.includes("human"));
  const treaty = treaties.find(t => t.members.includes(target));
  const partner = opponents.find(p => p.id === target);
  const winner = state.participants.find(p => p.id === state.winnerId);
  const canNegotiate = enabled && !state.diplomacyUsed && !!partner;
  return <div className={mode === "overview" ? s.extras : s.diplomacySlot}>
    {mode === "overview" && <section className={s.overview} aria-label="Campaign overview">
      <div><small>YOUR TERRITORIES</small><strong>{owned.length}<span> / 10</span></strong></div>
      <div><small>YOUR ARMY</small><strong>{owned.reduce((n,c) => n + c.soldiers, 0)}</strong></div>
      <div><small>ROUND</small><strong>{displayState.round}</strong></div>
      <div><small>DIFFICULTY</small><strong className={s.difficulty}>{displayState.difficulty}</strong></div>
      <label className={s.conquestProgress}>World conquest · {owned.length * 10}%
        <progress value={owned.length} max={10} />
      </label>
    </section>}
    {showResult && <section className={s.result} aria-label="Campaign result">
      <small>ALL TEN NATIONS CONQUERED</small>
      <h2>{state.winnerId === "human" ? "WORLD VICTORY" : `${winner?.name ?? "Opponent"} wins`}</h2>
      <p>{state.winnerId === "human" ? "Ten nations. One command. Your campaign is complete." :
        "Study the recorded battles, refine your strategy and begin a new campaign."}</p>
      <p>Round {state.round} · {state.revision} recorded actions</p>
      <div><button onClick={replay}>Watch campaign replay</button>{" "}
        <Link href="/lobby">Return to war room</Link></div>
    </section>}
    {mode === "diplomacy" && state.status === "active" && <section className={`${s.panel} ${s.diplomacy}`} aria-label="Alliances and diplomacy">
      <div>
        <small>DIPLOMATIC CHANNEL</small>
        <h2>Alliances & diplomacy</h2>
        <p>Negotiate a temporary alliance once per turn. NPCs accept when your strength or a common threat makes cooperation worthwhile.</p>
        <p className={s.hint}>Allies prefer other targets. You may attack any enemy, including an ally, but doing so breaks that treaty. Each nation retains control of its troops; victory belongs to one participant.</p>
      </div>
      <div>
        <label>Choose a diplomatic partner
          <select value={target} onChange={e => setTarget(e.target.value)}>
            <option value="">Select a nation</option>
            {opponents.map(p => <option key={p.id} value={p.id}>
              {p.name} · {strength(p.id)} soldiers
            </option>)}
          </select>
        </label>
        {partner && <p>{partner.name} controls {state.countries.filter(c => c.ownerId === partner.id).length} countries.
          {treaty ? ` Treaty active through round ${treaty.expiresRound}.` : " No active treaty."}</p>}
        <button className={s.primary} disabled={!canNegotiate}
          onClick={() => submit({ type: "diplomacy", targetId: target, operation: treaty ? "break" : "offer" })}>
          {treaty ? "End treaty" : "Offer alliance"}
        </button>
        <p className={s.hint}>{state.diplomacyUsed ? "Diplomatic action used this turn; the decision is recorded in history." :
          !enabled ? "Available to the owner on their turn, after reinforcement and outside an attack or replay." :
          "An accepted or rejected offer uses this turn's diplomatic action."}</p>
      </div>
      <div className={s.treaties}>
        {treaties.length ? treaties.map(t => <span key={t.members.join(":")}>
          Ally: {state.participants.find(p => p.id === t.members.find(id => id !== "human"))?.name}
          {" · "}through round {t.expiresRound}
        </span>) : <span>No active alliances</span>}
      </div>
    </section>}
  </div>;
}
