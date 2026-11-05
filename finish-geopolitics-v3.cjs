/* eslint-disable @typescript-eslint/no-require-imports */
/* Apply AFTER update-geopolitics-v2.cjs. Run npm install after applying this update. */
const fs = require("node:fs");
const path = require("node:path");
const root = process.cwd();
const marker = path.join(root, ".geopolitics-v3-installed.json");
if (fs.existsSync(marker)) {
  console.log("V3 already installed. Run npm test and npm run build.");
  process.exit(0);
}
if (!fs.existsSync(path.join(root, "src/components/game/CampaignExtras.tsx"))) {
  throw new Error("Run from your geopolitics folder after installing V2.");
}
const staged = new Map();
function read(file) {
  return staged.has(file) ? staged.get(file) : fs.readFileSync(path.join(root,file),"utf8").replace(/\r\n/g,"\n");
}
function replace(file, before, after) {
  const source = read(file);
  if (source.split(before).length !== 2) throw new Error("Version mismatch: " + file + ". No files changed.");
  staged.set(file, source.replace(before, () => after));
}
function between(file, start, end, content) {
  const source = read(file), a = source.indexOf(start), b = source.indexOf(end,a);
  if (a < 0 || b < a) throw new Error("Version mismatch: " + file + ". No files changed.");
  staged.set(file, source.slice(0,a) + content + source.slice(b));
}
function write(file, content) { staged.set(file,content); }
function append(file, content) { staged.set(file,read(file)+content); }

write(`src/lib/engine/ReplayRules.ts`, `import type { CampaignEvent, CampaignState } from "../../types/game-state";

export type RecordedEvent = Omit<CampaignEvent, "action"> & {
  action: string;
  fromId?: string | null;
  toId?: string | null;
  reason?: string | null;
  afterState: CampaignState;
  commentary?: { text?: string; source?: string; status?: string };
};

export class ReplayRules {
  static frame(events: readonly RecordedEvent[], revision: number, running: boolean) {
    const current = events.find(e => e.revision === revision);
    if (!current) return null;
    const before = events.filter(e => e.revision < revision).at(-1)?.afterState;
    const event = {
      ...current,
      fromId: current.fromId ?? before?.activeAttack?.attackerCountryId,
      toId: current.toId ?? before?.activeAttack?.defenderCountryId,
    };
    const canAnimate = !!(event.dice && event.fromId && event.toId);
    return {
      event, canAnimate,
      state: running && canAnimate ? before ?? current.afterState : current.afterState,
    };
  }

  static next(events: readonly RecordedEvent[], revision: number | null, end: number | null) {
    if (revision === null) return null;
    return events.find(e => e.revision > revision && (end === null || e.revision <= end))?.revision ?? null;
  }

  static latestAttack(events: readonly RecordedEvent[]) {
    const launches = events.filter(e => e.action === "start-attack");
    for (const launch of launches.slice().reverse()) {
      const following = events.filter(e => e.revision > launch.revision);
      const nextLaunch = following.find(e => e.action === "start-attack")?.revision ?? Infinity;
      const attack = following.filter(e => e.revision < nextLaunch);
      if (!attack.some(e => e.dice)) continue;
      const finish = attack.find(e => e.action === "stop-attack" ||
        e.action === "end-turn" || (!!e.dice && !e.afterState.activeAttack));
      return { start: launch.revision, end: finish?.revision ?? attack.at(-1)!.revision };
    }
    const lastRoll = events.filter(e => e.dice).at(-1);
    return lastRoll ? { start: lastRoll.revision, end: lastRoll.revision } : null;
  }
}
`);

write(`src/components/game/BattleClock.tsx`, `"use client";

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
    let map: SVGSVGElement | null = null;
    const effects = new Set<Animation>();
    const stage = document.querySelector(\`[data-battle-id="\${id}"]\`);
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
      if (!map) {
        map = document.querySelector<SVGSVGElement>(".map-panel svg");
        map?.pauseAnimations?.();
      }
      map?.setCurrentTime?.(visual / 1000);
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
`);

between(`src/components/CampaignExperience.tsx`, `/*
 * One clock coordinates:`, `export default function CampaignExperience({`, ``);

replace(`src/components/CampaignExperience.tsx`, `import Image from "next/image";`, `import Image from "next/image";
import Clock from "@/components/game/BattleClock";
import { ReplayRules } from "@/lib/engine/ReplayRules";`);

replace(`src/components/CampaignExperience.tsx`, `  afterState: CampaignState;`, `  afterState: CampaignState;
  commentary?: { text?: string; source?: string; status?: string };`);

replace(`src/components/CampaignExperience.tsx`, `  const [replay, setReplay] =
    useState(false);`, `  const [replay, setReplay] = useState(false);
  const [replayDone, setReplayDone] = useState<number | null>(null);
  const [replayEnd, setReplayEnd] = useState<number | null>(null);
  const [replayRun, setReplayRun] = useState(0);

  function startReplay(revision: number, end: number | null = null) {
    setHistory(revision);
    setReplayDone(null);
    setReplayEnd(end);
    setReplayRun(run => run + 1);
    setReplay(true);
  }`);

between(`src/components/CampaignExperience.tsx`, `  useEffect(() => {
    if (
      !replay ||`, `  const before = model.playing`, `  const recorded = model.events.find(event => event.revision === history);
  const replayFrame = history === null ? null : ReplayRules.frame(
    model.events, history, replay && replayDone !== history,
  );
  const replayNext = ReplayRules.next(model.events, history, replayEnd);
  const replayHasBattle = !!replayFrame?.canAnimate;

  useEffect(() => {
    if (!replay || history === null) return;
    // A battle advances only when its actual animation clock finishes.
    if (replayHasBattle && replayDone !== history) return;
    const timer = setTimeout(() => {
      if (replayNext === null) setReplay(false);
      else { setReplayDone(null); setHistory(replayNext); }
    }, replayHasBattle ? 1000 : 1200);
    return () => clearTimeout(timer);
  }, [replay, history, replayDone, replayNext, replayHasBattle]);

`);

replace(`src/components/CampaignExperience.tsx`, `  const replayBefore = replay && recorded?.dice
    ? model.events.find(e => e.revision === recorded.revision - 1)?.afterState
    : null;

  const view =
    replayBefore ?? recorded?.afterState ??`, `  const view =
    replayFrame?.state ??`);

replace(`src/components/CampaignExperience.tsx`, `      ? recorded
      : model.playing ?? undefined;`, `      ? replayFrame?.event
      : model.playing ?? undefined;`);

replace(`src/components/CampaignExperience.tsx`, `    history !== null ? replay : !!model.playing,
  );`, `    history !== null ? replay && replayDone !== history : !!model.playing,
  );
  // Each replay run has its own animation identity, even for the same saved roll.
  if (anim && history !== null) anim.id = -(anim.id + 1 + replayRun * 1000000);`);

replace(`src/components/CampaignExperience.tsx`, `    setNotice("Target selected. Confirm Launch attack in the command console.");`, `    stopIntent.current = false;
    setStop(false);
    setPaused(false);
    void send({ type: "start-attack", fromId: source.id, toId: country.id });`);

replace(`src/components/CampaignExperience.tsx`, `"then confirm Launch attack."`, `"to launch your one attack this turn."`);

replace(`src/components/CampaignExperience.tsx`, `3. Confirm Launch attack.`, `3. Clicking the enemy launches the attack.`);

replace(`src/components/CampaignExperience.tsx`, `"Select your country and an enemy, then confirm Launch attack"`, `"Click your country, then an enemy to launch your attack"`);

replace(`src/components/CampaignExperience.tsx`, `>Launch attack</button>`, `>Retry selected attack</button>`);

replace(`src/components/CampaignExperience.tsx`, `            battleAnimation={
              model.playing &&
              history === null
                ? anim
                : null
            }`, `            battleAnimation={anim?.active ? anim : null}`);

replace(`src/components/CampaignExperience.tsx`, `          {history !== null && replay && recorded?.dice && (
            <Clock key={\`replay:\${history}\`} id={history} fast={false} done={() => {}} />
          )}`, `          {history !== null && anim?.active && replayHasBattle && (
            <Clock key={\`replay:\${anim.id}\`} id={anim.id} fast={false}
              done={() => setReplayDone(history)} />
          )}`);

replace(`src/components/CampaignExperience.tsx`, `  const last =
    model.events.at(-1);`, `  const last = history !== null ? recorded : model.playing ?? model.events.at(-1);
  const latestAttack = ReplayRules.latestAttack(model.events);`);

replace(`src/components/CampaignExperience.tsx`, `        state={live}
        enabled={canAct`, `        state={live}
        displayState={view}
        enabled={canAct`);

replace(`src/components/CampaignExperience.tsx`, `        replay={() => { setHistory(model.events[0]?.revision ?? 0); setReplay(true); }}`, `        replay={() => startReplay(model.events[0]?.revision ?? 0)}`);

between(`src/components/CampaignExperience.tsx`, `            <button
              disabled={
                busy ||
                !!model.playing ||
                !model.events.length`, `            <div className={s.log}>`, `            <div className={s.replayToolbar}>
              <button disabled={busy || !!model.playing || !model.events.length}
                onClick={() => replay ? setReplay(false) : startReplay(history ?? model.events[0].revision)}>
                {replay ? "Pause replay" : "Play full history"}
              </button>
              <button disabled={busy || !!model.playing || !latestAttack}
                onClick={() => { if (latestAttack) startReplay(latestAttack.start, latestAttack.end); }}>
                Replay latest attack
              </button>
              <button disabled={history === null}
                onClick={() => { setReplay(false); setHistory(null); }}>
                Return to live
              </button>
            </div>
            {recorded && <div className={s.replaySummary} role="status">
              <strong>{replay ? "PLAYING RECORDING" : "SAVED SNAPSHOT"} · #{recorded.revision}</strong>
              <p>{recorded.message}</p>
              {recorded.reason && <p>{recorded.reason}</p>}
              {recorded.commentary?.text && <p>
                {recorded.commentary.source === "groq" ? "Recorded AI report: " : "Recorded battle report: "}
                {recorded.commentary.text}
              </p>}
              <p>No new rolls or moves are submitted during replay.</p>
            </div>}

`);

replace(`src/components/CampaignExperience.tsx`, `              key={\`\${history === null ? "live" : "replay"}:\${anim.id}:\${replay}\`}`, `              key={\`\${history === null ? "live" : "replay"}:\${anim.id}\`}`);

replace(`src/components/CampaignExperience.tsx`, `                  : "SAVED EXCHANGE"}`, `                  : "RECORDED RESULT"}`);

replace(`src/components/CampaignExperience.tsx`, `    <main className={s.shell}>
      <header`, `    <main className={s.shell} data-replay={history !== null}>
      <header`);

replace(`src/components/CampaignExperience.tsx`, `                  : "OPPONENT"}`, `                  : (view.treaties ?? []).some(t => t.expiresRound >= view.round &&
                      t.members.includes("human") && t.members.includes(country.ownerId))
                    ? "ALLY · ATTACK BREAKS TREATY" : "OPPONENT"}`);

replace(`src/components/CampaignExperience.tsx`, `              <RollingDice
                dice={anim.dice!}
              />`, `              <RollingDice dice={anim.dice!} />
              <p className={s.exchangeResult}>
                Attacker losses: {anim.dice!.attackerLoss} · Defender losses: {anim.dice!.defenderLoss}
                {" · "}{shown?.message}
              </p>`);

write(`src/components/game/CampaignExtras.tsx`, `"use client";

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
      <h2>{state.winnerId === "human" ? "WORLD VICTORY" : \`\${winner?.name ?? "Opponent"} wins\`}</h2>
      <p>{state.winnerId === "human" ? "Ten nations. One command. Your campaign is complete." :
        "Study the recorded battles, refine your strategy and begin a new campaign."}</p>
      <p>Round {state.round} · {state.revision} recorded actions</p>
      <div><button onClick={replay}>Watch campaign replay</button>{" "}
        <Link href="/lobby">Return to war room</Link></div>
    </section>}
    {mode === "diplomacy" && state.status === "active" && <section className={\`\${s.panel} \${s.diplomacy}\`} aria-label="Alliances and diplomacy">
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
          {treaty ? \` Treaty active through round \${treaty.expiresRound}.\` : " No active treaty."}</p>}
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
`);

append(`src/components/game/CampaignExperience.module.css`, `
/* GeoPolitics v3: clearer hierarchy, accessible controls and centred dialogs. */
.extras { max-width: 1600px; margin: 0 auto 20px; display: grid; gap: 16px; }
.overview { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 18px;
  padding: 20px 24px; border: 1px solid #c6a76640; border-radius: 16px;
  background: linear-gradient(120deg, #21344a, #0e1929 75%); }
.overview small { display: block; color: #aebfd4; font-size: 10px; letter-spacing: .12em; }
.overview strong { display: block; margin-top: 5px; color: #f1d493; font-size: 28px; }
.overview strong span { color: #9bacc2; font-size: 14px; }
.overview strong.difficulty { font-size: 18px; text-transform: capitalize; margin-top: 12px; }
.conquestProgress { grid-column: 1 / -1; color: #b9cbe0; font-size: 11px; }
.conquestProgress progress { display: block; width: 100%; height: 7px; margin-top: 8px;
  appearance: none; border: 0; border-radius: 10px; overflow: hidden; background: #07111d; }
.conquestProgress progress::-webkit-progress-bar { background: #07111d; }
.conquestProgress progress::-webkit-progress-value { background: linear-gradient(90deg, #b98b39, #ffe0a0); }
.conquestProgress progress::-moz-progress-bar { background: #e4bc6b; }
.diplomacy { display: grid; grid-template-columns: 1.25fr 1fr; gap: 12px 28px; }
.diplomacy h2 { color: #edd39c; }
.treaties { display: flex; flex-wrap: wrap; gap: 8px; grid-column: 1 / -1; }
.treaties span { padding: 7px 12px; border: 1px solid #69bfaf55; border-radius: 20px;
  background: #153b3b70; color: #b8e5d9; font-size: 11px; }
.replayToolbar { display: grid; gap: 5px; }
.replaySummary { margin: 16px 0; padding: 14px; border: 1px solid #85a4d055;
  border-radius: 10px; background: #102b43; }
.replaySummary strong { color: #b9d7ff; font-size: 10px; letter-spacing: .08em; }
.exchangeResult { padding: 12px; margin: 12px 0 0; border-radius: 8px;
  background: #07111d; color: #e7c88d; font-size: 12px; line-height: 1.8; }
.deleteDialog { position: fixed; inset: 0; margin: auto; max-height: calc(100dvh - 32px);
  overflow: auto; width: min(92vw, 500px); }
.deleteDialog button { border: 1px solid #8095ae66; border-radius: 8px;
  color: #edf1fa; background: #23354b; }
.deleteDialog button:last-child { background: #6a283a; border-color: #cb718a; }
.deleteDialog input:focus-visible { outline: 3px solid #eac77e; outline-offset: 3px; }
.nations button:not(:disabled):hover { border-color: #e6c480; background: #29374b; transform: translateY(-2px); }
.nations button { transition: transform .15s, background .15s; }
.nations button small { line-height: 1.5; }
@media (max-width: 700px) {
  .overview { grid-template-columns: repeat(2,minmax(0,1fr)); padding: 18px; }
  .diplomacy { grid-template-columns: minmax(0,1fr); padding: 18px; }
}
@media (prefers-reduced-motion: reduce) {
  .nations button { transition: none; }
  .nations button:not(:disabled):hover { transform: none; }
}
`);

replace(`src/components/CampaignCorrespondent.tsx`, `      aria-label="Live war correspondent"`, `      aria-label="Live war correspondent"
      data-live-correspondent="true"`);

append(`src/app/globals.css`, `
/* Recorded commentary is displayed with its saved event during replay. */
body:has([data-replay="true"]) [data-live-correspondent="true"] { display: none; }
`);

replace(`src/lib/engine/NpcStrategy.ts`, `    /*
     * Action 4: consolidate spare soldiers.`, `    const strengths = state.participants.map(p => ({
      id: p.id, kind: p.kind,
      strength: state.countries.filter(c => c.ownerId === p.id).reduce((n,c) => n + c.soldiers, 0),
    }));
    const mine = strengths.find(p => p.id === actorId)!.strength;
    const rival = strengths.filter(p => p.id !== actorId).sort((a,b) => b.strength - a.strength)[0];
    if (!state.diplomacyUsed && rival && rival.strength > mine * 1.4) {
      const partner = strengths.find(p => p.kind === "npc" && p.id !== "human" &&
        p.id !== actorId && p.id !== rival.id && p.strength > 0 &&
        mine + p.strength > rival.strength && !(state.treaties ?? []).some(t =>
          t.expiresRound >= state.round && t.members.includes(actorId) && t.members.includes(p.id)));
      if (partner) return {
        action: { type: "diplomacy", targetId: partner.id, operation: "offer" },
        reason: "A stronger rival threatens this army; a temporary alliance offers useful deterrence.",
      };
    }

    /*
     * Action 4: consolidate spare soldiers.`);

replace(`tests/specification.cjs`, `if (previous) {`, `const { ReplayRules: R } = require("../src/lib/engine/ReplayRules.ts");

if (previous) {`);

append(`tests/specification.cjs`, `

test("replay recovers the attack route, shows before and after boards, and uses saved dice", () => {
  const original = board();
  const started = E.apply(original, "human", {
    type: "start-attack", fromId: original.countries[0].id, toId: original.countries[1].id,
  }, random, 1);
  const rolled = E.apply(started.state, "human", { type: "roll" }, rolls([5,5,0,0]), 2);
  const events = [
    { ...started.event, afterState: started.state },
    { ...rolled.event, afterState: rolled.state },
  ];
  const snapshot = JSON.stringify(events);
  const running = R.frame(events, rolled.state.revision, true);
  assert(running.canAnimate);
  assert.equal(running.event.fromId, original.countries[0].id);
  assert.equal(running.event.toId, original.countries[1].id);
  assert.equal(running.state.countries[1].ownerId, original.countries[1].ownerId);
  assert.deepEqual(running.event.dice.attacker, [6,6]);
  const finished = R.frame(events, rolled.state.revision, false);
  assert.equal(finished.state.countries[1].ownerId, "human");
  assert.equal(JSON.stringify(events), snapshot);
  assert.deepEqual(R.latestAttack(events), { start: 1, end: 2 });
  assert.equal(R.next(events, 1, 2), 2);
  assert.equal(R.next(events, 2, 2), null);
});

test("NPC diplomacy evaluates a common threat and records an accepted offer", () => {
  const state = setup();
  state.turnIndex = 1;
  const actor = E.currentActor(state);
  const others = state.participants.filter(p => p.id !== actor && p.id !== "human");
  state.countries.forEach(c => { c.soldiers = c.ownerId === actor ? 10 : 2; });
  state.countries.find(c => c.ownerId === others[0].id).soldiers = 15;
  state.countries.find(c => c.ownerId === others[1].id).soldiers = 10;
  const decision = N.choose(state);
  assert.equal(decision.action.type, "diplomacy");
  assert(decision.reason.includes("rival"));
  const result = E.apply(state, actor, decision.action, random, 1);
  assert.equal(result.state.treaties.length, 1);
  assert(result.event.message.includes("accepts"));
  assert.equal(result.state.diplomacyUsed, true);
});
`);

replace(`src/components/CampaignExperience.tsx`, `          <section
            className={s.panel}
          >
            <small>
              CAMPAIGN RECORD`, `          <CampaignExtras mode="diplomacy" state={live} displayState={view}
            enabled={canAct && !live.activeAttack && live.pendingReinforcements === 0}
            showResult={false} submit={action => { void send(action); }}
            replay={() => startReplay(model.events[0]?.revision ?? 0)} />

          <section
            className={s.panel}
          >
            <small>
              CAMPAIGN RECORD`);

replace(`src/components/CampaignExperience.tsx`, `{replay ? "Pause replay" : "Play full history"}`, `{replay ? "Pause replay" : history === null ? "Play full history" : "Play from selected event"}`);

append(`src/components/game/CampaignExperience.module.css`, `
.diplomacySlot { min-width: 0; }
.diplomacySlot .diplomacy { grid-template-columns: minmax(0,1fr); }
.commands { position: static; }
`);

replace(`src/app/how-to-play/page.tsx`, `              decisions. History shows saved
              states and dice; return to live
              play to resume commands.`, `              decisions. Play full history to watch recorded boards, dice and battles.
              Replay latest attack plays the most recent recorded attack.
              Pausing shows its saved result. Return to live to resume commands.`);

replace(`src/app/how-to-play/page.tsx`, `              dependent. Login music belongs to
              the login; battle music runs during
              attacks. Audio may need an initial
              click to unlock.`, `              dependent. Login music plays on the login and in the war room.
              Battle music plays throughout the game. Audio may need an initial
              click to unlock.`);

replace(`src/app/how-to-play/page.tsx`, `        </div>
      </div>
    </main>`, `          <section className={s.panel}>
            <h2>7. Alliances and diplomacy</h2>
            <p className={s.muted}>
              On your turn, after reinforcements and outside an attack, offer one alliance
              or end one treaty in the diplomacy panel. Offers can be rejected and still
              use your diplomatic action. Accepted treaties last through the next round.
              NPCs value useful deterrence against a stronger rival and prefer other targets
              while allied. Attacking an ally breaks the treaty immediately.
              Alliances never share soldiers or victory: one participant must control all ten nations.
            </p>
          </section>
        </div>
      </div>
    </main>`);

// Use a patched gRPC release without downgrading Firebase.
const manifest = JSON.parse(read("package.json"));
manifest.overrides = { ...manifest.overrides, "@grpc/grpc-js": "1.14.7" };
write("package.json", JSON.stringify(manifest,null,2) + "\n");
if (fs.existsSync(path.join(root,"package-lock.json"))) {
  write("package-lock.json", read("package-lock.json"));
}
// All edits have now been checked in memory. Keep backups OUTSIDE the project.
const backup = path.join(path.dirname(root), path.basename(root) + "-backup-v3-" + Date.now());
for (const [file] of staged) {
  const source = path.join(root,file);
  if (fs.existsSync(source)) {
    const destination = path.join(backup,file);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.copyFileSync(source,destination);
  }
}
for (const [file,content] of staged) {
  const destination = path.join(root,file);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,content);
  console.log("Updated " + file);
}
fs.writeFileSync(marker,JSON.stringify({backup,files:[...staged.keys()]},null,2));
console.log("V3 installed. Backup: " + backup);
console.log("Run: npm test, npx tsc --noEmit, npm run lint, npm run build");