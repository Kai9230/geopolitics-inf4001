// GeoPolitics final update for THEFINALONE(1).zip.
// Save beside package.json, then run: node finish-geopolitics.mjs
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd();
const staged = new Map();
const digest = text => createHash("sha256").update(text).digest("hex");
function stage(file, beforeHash, afterHash, changes) {
  const target = path.join(root,file);
  const exists = fs.existsSync(target);
  const before = exists ? fs.readFileSync(target,"utf8").replace(/\r\n/g,"\n") : "";
  if (exists && digest(before) === afterHash) return;
  if (beforeHash === null ? exists : !exists || digest(before) !== beforeHash) {
    throw new Error(`Unexpected version of ${file}. No files changed. Use THEFINALONE(1).zip.`);
  }
  let after;
  if (typeof changes === "string") after = changes;
  else {
    const lines = before.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    for (const [start,end,text] of [...changes].reverse()) lines.splice(start,end-start,text);
    after = lines.join("");
  }
  if (digest(after) !== afterHash) throw new Error(`Copy/paste error in ${file}; no files changed.`);
  staged.set(file,after);
}
// All files are checked before anything is written. Your .env.local is untouched.

// src/lib/engine/BattleVisuals.ts
stage("src/lib/engine/BattleVisuals.ts", null, "07c8f0d33ca36c51c10793af2b81b664c93d8aec1d69d6f15e07337060a42e3e", `import type { CampaignState } from "../../types/game-state";

export class FlightLedger {
  private readonly seen = new Set<string>();
  claim(exchange: string, session: string): boolean {
    const key = \`\${session}|\${exchange}\`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value!);
    return true;
  }
}

export class FlightPlayback {
  private claimed = false;
  private permitted = false;
  private elapsed = 0;
  constructor(private readonly ledger: FlightLedger,
    private readonly exchange: string, private readonly session: string) {}
  sample(milliseconds: number) {
    if (!this.claimed) {
      this.permitted = this.ledger.claim(this.exchange, this.session);
      this.claimed = true;
    }
    // Rewinding a clock or repeating a saved exchange cannot launch another sortie.
    this.elapsed = Math.max(this.elapsed, Math.max(0, milliseconds));
    const ms = this.elapsed;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    return {
      flight: this.permitted,
      progress: clamp(ms / 1450),
      opacity: this.permitted ? clamp((ms - 30) / 100) * clamp((1800 - ms) / 180) : 0,
      bomb: this.permitted && ms >= 1400 && ms < 1800,
      bombProgress: clamp((ms - 1400) / 400),
      impact: clamp((ms - 1780) / 700),
      impactOpacity: ms >= 1780 ? 1 - clamp((ms - 1780) / 700) : 0,
    };
  }
}

export function attackVisualKey(state: Pick<CampaignState, "id" | "round" | "turnIndex">,
  from: string, to: string): string {
  return \`\${state.id}:\${state.round}:\${state.turnIndex}:\${from}:\${to}\`;
}

export function exchangeVisualKey(state: Pick<CampaignState, "id" | "round" | "turnIndex">,
  from: string, to: string, revision: number): string {
  return \`\${attackVisualKey(state,from,to)}:exchange:\${revision}\`;
}
`);

// src/components/game/BattleEffects.tsx
stage("src/components/game/BattleEffects.tsx", "f7bb78255e45fa5e1734cc225c06da9298bf8c2bd48180c6ffca9de51832345c", "9071959c244663440116da69d2a4bafb0a504f48c2a2e2de6626046b771394b8", [
  [2, 2, `import { useEffect, useRef, type RefObject } from "react";
import { FlightLedger, FlightPlayback } from "@/lib/engine/BattleVisuals";
`],
  [4, 6, ``],
  [7, 14, `  id: number; attackKey: string; playbackKey: string; ledger: RefObject<FlightLedger>;
  from: [number, number]; to: [number, number];
  attackerColor: string; defenderColor: string; dice: MapDiceResult | null;
`],
  [16, 27, `export default function BattleEffects({ id, attackKey, playbackKey, ledger,
  from, to, attackerColor, defenderColor, dice }: Props) {
  const plane = useRef<SVGGElement>(null);
  const bomb = useRef<SVGGElement>(null);
  const sourceImpact = useRef<SVGGElement>(null);
  const targetImpact = useRef<SVGGElement>(null);
  const [fx, fy] = from, [tx, ty] = to;
  const cx = (fx + tx) / 2, cy = Math.min(fy, ty) - 65;
  const path = \`M\${fx} \${fy} Q\${cx} \${cy} \${tx} \${ty - 26}\`;
`],
  [28, 32, `  useEffect(() => {
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
      plane.current?.setAttribute("transform", \`translate(\${x} \${y}) rotate(\${Math.atan2(dy,dx)*180/Math.PI})\`);
      plane.current?.setAttribute("opacity", String(frame.opacity));
      bomb.current?.setAttribute("transform", \`translate(\${tx} \${ty-26+frame.bombProgress*26})\`);
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
`],
  [33, 265, `  return <g className="battle-effects" pointerEvents="none" aria-label="Recorded dice exchange and combat losses">
    <path d={path} fill="none" stroke={attackerColor} strokeWidth="1.5" strokeDasharray="5 5" opacity=".6" />
    <circle cx={tx} cy={ty} r="24" fill="none" stroke={defenderColor} strokeDasharray="3 4" />
    <g ref={plane} className="fighter" opacity="0" data-aircraft="one-sortie-per-exchange">
      <path d="M17 0L4 -3L-4 -15L-8 -15L-4 -3L-12 -3L-16 -7L-19 -7L-16 0L-19 7L-16 7L-12 3L-4 3L-8 15L-4 15L4 3Z"
        fill="#e4edf7" stroke={attackerColor} strokeWidth="1" />
      <path d="M-15 0H-34" stroke={attackerColor} strokeWidth="2" opacity=".5" />
`],
  [266, 268, `    {dice && dice.defenderLoss > 0 && <g ref={bomb} className="bomb" opacity="0">
      <path d="M-2 -5H2L3 3L0 7L-3 3Z" fill="#e8d6a1" stroke="#08111d" />
    </g>}
    {!!dice?.attackerLoss && <g ref={sourceImpact} className="casualty-impact" transform={\`translate(\${fx} \${fy})\`} opacity="0">
      <circle r="3" fill="#ffc17a55" stroke="#ffc17a" />
      <text y="-20" textAnchor="middle" fill="#ffd9b1" fontSize="11">−{dice.attackerLoss}</text>
    </g>}
    {!!dice?.defenderLoss && <g ref={targetImpact} className="casualty-impact" transform={\`translate(\${tx} \${ty})\`} opacity="0">
      <circle r="3" fill="#ffc17a55" stroke="#ffc17a" />
      <text y="-20" textAnchor="middle" fill="#ffd9b1" fontSize="11">−{dice.defenderLoss}</text>
    </g>}
    <g transform={\`translate(\${Math.max(85,Math.min(915,tx))} \${Math.max(18,ty-47)})\`}>
      <rect x="-82" y="-12" width="164" height="24" rx="5" fill="#04101df0" stroke="#ba9b5c66" />
      <text y="4" textAnchor="middle" fill="#ffe2a2" fontSize="8">
        EXCHANGE · LOSSES {dice?.attackerLoss ?? 0} / {dice?.defenderLoss ?? 0}
      </text>
    </g>
  </g>;
}
`]
]);

// src/components/game/MapTypes.ts
stage("src/components/game/MapTypes.ts", "265f9d5885fdfd596472dbf634f4d8a1009f950e2ce932ea680df2a3bd28b3e4", "2be82b39e0aa6a38fa6a62369d8b5af9ccfb640bd8bfbbdb85ecc34f9ddcb6b8", [
  [1, 1, `import type { CampaignState } from "../../types/game-state";
`],
  [16, 16, `  attackKey?: string;
  playbackKey?: string;
`],
  [33, 33, `export function participantColor(state: CampaignState, owner: string): string {
  if (owner === "human") return "#f4c430";
  const index = state.participants.filter(p => p.kind === "npc").findIndex(p => p.id === owner);
  return NPC_COLORS[Math.max(0,index) % NPC_COLORS.length];
}

`],
  [34, 34, `  if (country.factionColor) return country.factionColor;
`]
]);

// src/components/game/RiskMap.tsx
stage("src/components/game/RiskMap.tsx", "96f709710a98676d85d34510d9dfb56214de281ce6b76076b2a07f5a6d7b88f2", "84476c0d80319ebde3d6669a856d836ef138dc862dd795424c7512ea94331ff6", [
  [16, 16, `import { FlightLedger } from "@/lib/engine/BattleVisuals";
`],
  [71, 71, `  const flights = useRef(new FlightLedger());
`],
  [601, 603, `              id={battleAnimation.id}
              attackKey={battleAnimation.attackKey ?? \`\${battleAnimation.fromId}:\${battleAnimation.toId}:\${battleAnimation.id}\`}
              playbackKey={battleAnimation.playbackKey ?? "live"}
              ledger={flights}
`]
]);

// src/components/CampaignExperience.tsx
stage("src/components/CampaignExperience.tsx", "2950930347e03e35e317c6f2222d44bca777a8f1ba42770c4b7a6df3ad768fc4", "c6fc493238b44205713a2f55c4f7d514cf65e3e753d0e29d7e656b37a2b3d830", [
  [58, 58, `  participantColor,
`],
  [66, 66, `import { exchangeVisualKey } from "@/lib/engine/BattleVisuals";
`],
  [82, 82, `      factionColor: participantColor(state,country.ownerId),
`],
  [118, 119, `    attackKey: exchangeVisualKey(state, attacker.id, defender.id, event.revision),
    playbackKey: "live",
`],
  [637, 638, `  if (anim && history !== null) {
    anim.id = -(anim.id + 1 + replayRun * 1000000);
    anim.playbackKey = \`replay:\${replayRun}\`;
  }
`],
  [1069, 1070, `                    ? \`EXCHANGE \${(battleBefore?.activeAttack?.exchangeNumber ?? 0) + 1} · SAME ATTACK\`
`]
]);

// src/components/game/BattleClock.tsx
stage("src/components/game/BattleClock.tsx", "26d25a3f03ae1f0baf43bc10f1c933abeaee0312e506e43ea9c3c360ea11612d", "64210335ce4b388fcd7532c85c31f7c98de8a6a28430bda27b05c50bc41ae813", [
  [13, 14, ``],
  [32, 37, ``]
]);

// src/app/page.tsx
stage("src/app/page.tsx", "94c439017b89960595d3de5c21b576e170f94e33c3d126fd9e594b3ab1006d3f", "3e764ae1d271f7d856e5221fe3600a1f6d383354a19d8085945dfafeea53b446", [
  [0, 122, ``],
  [123, 124, `import { useState, useRef } from "react";
`],
  [128, 129, ``],
  [136, 147, `  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
`],
  [150, 150, `    if (pending.current) return;
    pending.current = true;
    setBusy(true);
`],
  [155, 156, ``],
  [159, 159, `    } finally {
      pending.current = false;
      setBusy(false);
`],
  [203, 204, `            <label htmlFor="auth-email" className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]">Email</label>
`],
  [205, 206, `              id="auth-email" autoComplete="email" type="email" 
`],
  [213, 214, `            <label htmlFor="auth-password" className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]">Password</label>
`],
  [215, 216, `              id="auth-password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={isLogin ? undefined : 6} type="password" 
`],
  [223, 224, `            type="submit" disabled={busy} 
`],
  [226, 227, `            {busy ? "Please wait…" : isLogin ? "Sign In" : "Register"}
`],
  [231, 232, `          <button type="button" disabled={busy}
`],
  [233, 234, `            onClick={() => { if (!busy) setIsLogin(!isLogin); }}
`],
  [236, 237, `          </button>
`]
]);

// src/lib/engine/DiplomacyRules.ts
stage("src/lib/engine/DiplomacyRules.ts", null, "8996235e261915f927453732fdaa4188ad14869d30bf42cdcecbd743f125a503", `import type { CampaignState } from "../../types/game-state";

export class DiplomacyRules {
  static reputation(state: CampaignState, actor: string): number {
    const value = state.reputation?.[actor];
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0,Math.min(100,value)) : 50;
  }
  private static change(state: CampaignState, actor: string, amount: number) {
    state.reputation = { ...state.reputation, [actor]: Math.max(0,Math.min(100,this.reputation(state,actor)+amount)) };
  }
  static expire(state: CampaignState) {
    for (const treaty of state.treaties ?? []) {
      if (treaty.expiresRound < state.round) for (const actor of treaty.members) this.change(state,actor,5);
    }
    state.treaties = (state.treaties ?? []).filter(t => t.expiresRound >= state.round);
  }
  static active(state: CampaignState, a: string, b: string) {
    return (state.treaties ?? []).find(t => t.expiresRound >= state.round && t.members.includes(a) && t.members.includes(b));
  }
  static evaluate(state: CampaignState, actor: string, target: string) {
    const strength = (id: string) => state.countries.filter(c => c.ownerId === id).reduce((n,c) => n+c.soldiers,0);
    const mine = strength(actor), theirs = strength(target);
    const rival = state.participants.filter(p => p.id !== actor && p.id !== target)
      .map(p => ({ id: p.id, name: p.name, strength: strength(p.id) }))
      .sort((a,b) => b.strength-a.strength)[0];
    const trust = this.reputation(state,actor);
    const commonThreat = !!rival && rival.strength > theirs;
    const accepted = trust >= 25 && (trust-50+(mine>=theirs ? 25 : 0)+(commonThreat ? 30 : 0)) >= 20;
    const reason = trust < 25 ? "Recent betrayals make this proposal untrustworthy."
      : accepted ? commonThreat ? \`Cooperation offers deterrence against \${rival.name}.\` : "Your army offers useful deterrence."
      : "The balance of power and current trust do not justify an alliance.";
    return { accepted, reason, trust, sharedRivalId: commonThreat ? rival.id : null };
  }
  static offer(state: CampaignState, actor: string, target: string): string {
    if (this.active(state,actor,target)) throw new Error("A treaty already exists.");
    const proposal = this.evaluate(state,actor,target);
    const name = state.participants.find(p => p.id === target)!.name;
    if (!proposal.accepted) return \`\${name} rejects the offer. \${proposal.reason}\`;
    state.treaties ??= [];
    state.treaties.push({ members:[actor,target], expiresRound:state.round+1,
      formedRound:state.round, sharedRivalId:proposal.sharedRivalId });
    return \`\${name} accepts an alliance through round \${state.round+1}. \${proposal.reason}\`;
  }
  static end(state: CampaignState, actor: string, target: string, betrayal: boolean): boolean {
    const treaty = this.active(state,actor,target);
    if (!treaty) return false;
    state.treaties = (state.treaties ?? []).filter(t => t !== treaty);
    this.change(state,actor,betrayal ? -25 : -5);
    return true;
  }
}
`);

// src/types/game-state.ts
stage("src/types/game-state.ts", "88553b12ea65ad22afe45b27adb2ba51db3f70d6177365890024a7a4e98b45f5", "fea9ace7852ffac862e9a1413bce36b6afd75a9ddd19eed98bdc797742cc5784", [
  [37, 38, `  treaties?: { members: string[]; expiresRound: number; formedRound?: number; sharedRivalId?: string | null }[];
  reputation?: Record<string, number>;
`]
]);

// src/lib/engine/CampaignEngine.ts
stage("src/lib/engine/CampaignEngine.ts", "288c401c8b3547f3b626ff4fb1fbe550ae4e8bd6fab6fbddd4d70cf684c8f46b", "fc5cc68170ceab3f1af6fdbb387237741e7753eea4c60f50e1c751e6941458b1", [
  [1, 1, `import { DiplomacyRules } from "./DiplomacyRules";
`],
  [434, 435, `    DiplomacyRules.expire(state);
`],
  [445, 447, ``],
  [448, 470, `          if (!DiplomacyRules.end(state,actorId,target.id,false)) throw new Error("There is no active treaty to end.");
          message = \`Treaty with \${target.name} ended; diplomatic reputation falls by 5.\`;
        } else message = DiplomacyRules.offer(state,actorId,target.id);
`],
  [645, 649, `        const betrayed = DiplomacyRules.end(state,actorId,defender.ownerId,true);
`],
  [660, 661, `          (betrayed ? " This attack breaks their alliance; diplomatic reputation falls by 25." : "");
`]
]);

// src/lib/engine/NpcStrategy.ts
stage("src/lib/engine/NpcStrategy.ts", "5f4f0f00110ede2b58a9b066490231e2d8b0b90747a7d2e7eb43a0fc3e59ba12", "69e124c15bdb599b3e8257bcc377c427dac69c8fc687159e915c65c642e45458", [
  [7, 7, `
import { DiplomacyRules } from "./DiplomacyRules";
`],
  [182, 183, `        mine + p.strength > rival.strength && DiplomacyRules.evaluate(state,actorId,p.id).accepted && !(state.treaties ?? []).some(t =>
`],
  [313, 313, `        (state.round > 12 ? "; late-game pressure prioritises defeating concentrated enemy armies" : "") +
`]
]);

// src/components/game/CampaignExtras.tsx
stage("src/components/game/CampaignExtras.tsx", "f492e0fb131e42cf9f34b0140aff961344eabace14945c141ffe2eca8b8940f1", "ed00361c7801cdbee96763488ae59f4e9fd58f33329d6b2d4d0eaa1044f8e5f4", [
  [6, 6, `import { DiplomacyRules } from "@/lib/engine/DiplomacyRules";
`],
  [27, 27, `  const proposal = partner ? DiplomacyRules.evaluate(state,"human",partner.id) : null;
  const reputation = DiplomacyRules.reputation(state,"human");
`],
  [49, 50, `        <small>LIVE DIPLOMATIC CHANNEL</small>
`],
  [51, 52, `        <p>Negotiate one temporary alliance per turn. NPCs weigh army strength, a common threat and your record of keeping promises.</p>
        <p className={s.reputation}>Diplomatic reputation <strong>{reputation} / 100</strong></p>
        <p className={s.hint}>A treaty kept until expiry adds 5 reputation. Ending it early costs 5; attacking an ally costs 25.</p>
`],
  [65, 65, `        {proposal && !treaty && <div className={s.proposal}>
          <strong>{proposal.accepted ? "Favourable proposal" : "Unfavourable proposal"}</strong>
          <p>{proposal.reason}</p>
        </div>}
`],
  [77, 77, `          {t.sharedRivalId && \` · Common rival: \${state.participants.find(p => p.id === t.sharedRivalId)?.name}\`}
`]
]);

// src/types/index.ts
stage("src/types/index.ts", "70bf4aa84b470eb4b6aabb5fa3e7ccd775a2cd92a15bff17e99bdc98acdb209c", "1924eed6db59d50ff0e727046cbf615621871568e649144a628f53f74a0e0171", [
  [16, 16, `  factionColor?: string;
`]
]);

// src/lib/audio/MusicPlayer.ts
stage("src/lib/audio/MusicPlayer.ts", "1d53c34b3c9d678dd7e4757fbc8dd3f8e36800b5ba62b96425d50a6eee158af4", "eb06723e19a4cca77564d5393e25d160dda228e39c2222640b42a3025e77155e", [
  [217, 218, `        "metadata";
`]
]);

// src/components/game/CampaignExperience.module.css
stage("src/components/game/CampaignExperience.module.css", "072a3606182e623d5e47491ce1e11ec18467922950b35bc7fdcf7a8fbbcbd027", "7eb55938b7f63e213b6091270c8885748fd2e9f1966c27acad9474baabdafd92", [
  [608, 608, `
.reputation { display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #bda06155;border-radius:10px;background:linear-gradient(110deg,#bda06118,#0c1c2d);color:#d8e1ee;font-size:12px; }
.reputation strong { color:#f6dc99;white-space:nowrap; }
.proposal { padding:12px 14px;border-left:3px solid #69c9ad;border-radius:8px;background:#69c9ad10;color:#d8e1ee;font-size:12px; }
.proposal p { margin:6px 0 0;line-height:1.6;color:#afbdce; }
`]
]);

// tests/specification.cjs
stage("tests/specification.cjs", "86d5ddca7dfbed76befbccf114c164def04fa8497fc2193243da7d86f49e9255", "7db03fce21e614043e6f4a1c4da051ff6c6fb32f6b5281da4705526d3d228e01", [
  [41, 41, `
const { FlightLedger, FlightPlayback, attackVisualKey, exchangeVisualKey } = require("../src/lib/engine/BattleVisuals.ts");
const { DiplomacyRules: D } = require("../src/lib/engine/DiplomacyRules.ts");
`],
  [782, 782, `

test("each new dice exchange flies once; duplicates, rewinds and replay stay isolated", () => {
  const ledger = new FlightLedger();
  let state = attack(board());
  const a = state.countries[0].id, b = state.countries[1].id;
  const attackId = attackVisualKey(state,a,b);
  state = apply(state,{type:"roll"},() => 0);
  const key = exchangeVisualKey(state,a,b,state.revision);
  new FlightPlayback(ledger,key,"live"); // Abandoned effect consumes nothing.
  const first = new FlightPlayback(ledger,key,"live");
  assert(first.sample(700).opacity > 0);
  assert.equal(first.sample(1900).opacity,0);
  assert.equal(first.sample(200).opacity,0);
  assert.equal(new FlightPlayback(ledger,key,"live").sample(700).opacity,0);
  state = apply(state,{type:"roll"},() => 0);
  assert.equal(attackVisualKey(state,a,b),attackId);
  const next = exchangeVisualKey(state,a,b,state.revision);
  assert.notEqual(next,key);
  assert(new FlightPlayback(ledger,next,"live").sample(700).opacity > 0);
  assert(new FlightPlayback(ledger,key,"replay:1").sample(700).opacity > 0);
  assert.equal(new FlightPlayback(ledger,key,"replay:1").sample(700).opacity,0);
  assert(new FlightPlayback(ledger,key,"replay:2").sample(700).opacity > 0);
});


test("diplomatic trust persists, betrayal costs reputation and expiry rewards only once", () => {
  const state = board(), target = state.countries[1].ownerId;
  assert.equal(D.reputation(state,"human"),50);
  D.offer(state,"human",target);
  assert(D.active(state,"human",target));
  assert(D.end(state,"human",target,true));
  assert.equal(D.reputation(state,"human"),25);
  assert.equal(D.end(state,"human",target,true),false);
  assert.equal(D.reputation(state,"human"),25);
  state.reputation.human = 0;
  assert.equal(D.evaluate(state,"human",target).accepted,false);
  state.reputation.human = 50;
  D.offer(state,"human",target);
  assert(D.end(state,"human",target,false));
  assert.equal(D.reputation(state,"human"),45);
  D.offer(state,"human",target);
  state.round += 2;
  D.expire(state);
  assert.equal(D.reputation(state,"human"),50);
  assert.equal(D.reputation(state,target),55);
  D.expire(state);
  assert.equal(D.reputation(state,"human"),50);
});
`]
]);

// src/app/how-to-play/page.tsx
stage("src/app/how-to-play/page.tsx", "0e656271299c7b2f944f2934a2f4b4867fb9ece6f627659daf3e3d744bf9030a", "f29449b125f9b6bb72abe407a86325a46be01c71a2b908ffef6250b1a0e7e655", [
  [128, 129, `              two per side. Each saved dice exchange can show a plane flight. Multiple
              exchanges against the same target remain one attack. Repeated notifications
              for an exchange do not launch extra flights.
`],
  [222, 222, `              Keeping a treaty until expiry adds five reputation. Ending it early costs five;
              attacking an ally costs 25. Reputation affects future acceptance.
`]
]);

// README.md
stage("README.md", "2105a9f7f4fa342ebff916e83308f239584958269d2ff88f7bc40ef9eb5f5dde", "dfa70aa4d04ffa11d2152f03cd41102e48212ebb9baf7d067a2db64e11c8bd68", [
  [2, 4, `Single-player web game using Next.js, React, TypeScript, Firebase Authentication,
Cloud Firestore (NoSQL), and server-side Groq battle commentary.
`],
  [5, 6, `## Run locally
`],
  [7, 23, `1. Install Node.js 22 or newer and run \`npm ci\` in the project folder.
2. Preserve \`.env.local\`. Configure the Firebase browser values and server-only
   Firebase Admin credentials shown in \`.env.example\`. Never put Admin or Groq
   secrets in variables beginning NEXT_PUBLIC_.
3. Enable Firebase Email/Password Authentication and Firestore.
4. Sign in to the Firebase CLI and deploy the project rules and indexes:
   \`npx firebase-tools login\`
   \`npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID\`
   The rules source is \`src/lib/api/firestore.rules\`; firebase.json selects it.
5. Run \`npm test\`, \`npx tsc --noEmit\`, \`npm run lint\` and \`npm run build\`.
6. Run \`npm run dev\` for editing, or \`npm start\` after a successful build to assess
   production performance. Open http://localhost:3000.
7. Configure GROQ_API_KEY on the server. Verify a new battle produces AI-labelled
   commentary. A labelled fallback keeps gameplay available but does not prove
   the required LLM integration works.
`],
  [26, 29, `Choose one country; nine other countries are randomly selected. Exactly ten
countries participate. Allocate reinforcements when prompted, select an owned
country with at least two soldiers, then click an enemy to begin your one attack.
Multiple dice exchanges are phases of that attack, not extra attacks. Each new
saved exchange may show a plane flight; duplicate events do not restart it. Stop ends the turn; conquest permits transfers
before ending the turn. Round two onward grants two soldiers per owned country.
The field manual documents dice, conquest, transfers, spectators and diplomacy.
Default playback is 1x; the owner may accelerate NPC presentation to 2.5x.
Replay uses saved states and dice and never changes the live campaign.
`],
  [30, 33, `## Architecture and security
`],
  [34, 35, `CampaignEngine, BattleRules and DiplomacyRules contain rules. NpcStrategy makes
reasoned choices. CampaignRepository encapsulates Firestore transactions and
owns database mutations; API routes verify identity and validate commands.
The browser renders confirmed results and cannot directly write game documents.
Server crypto generates dice; ownership, revisions, turn and attack locks prevent
unauthorized moves and duplicate application. Public campaign links intentionally
expose the board and battle history for spectators. Do not store secrets there.
Keep environment credentials out of source submissions.
`],
  [36, 37, `## Bonus features
`],
  [38, 44, `1. Animated map, dice and original 3D miniatures.
2. Recorded battle and full-game replay.
3. NPC difficulty levels.
4. Campaign/player analytics.
5. Persistent attacks, server dice and revision checks against cheating.
6. Strategic temporary alliances, diplomacy and reputation.
7. Public realtime spectator links.
`],
  [45, 46, `Diplomacy is optional: treaties influence target selection, can be broken, and
never change base dice rules, troop values, the attack limit or solo victory.
Honouring expiry adds five reputation; ending early costs five; betrayal costs 25.
`],
  [47, 53, `## Performance
`],
  [54, 55, `Campaign creation uses atomic batch creation. Confirmed API results update the
presentation immediately; listeners reconcile saved state. Battle visuals use
one shared clock without resetting the whole SVG timeline. Flights are deduplicated
by exchange and replay session; streaming audio preloads metadata. Authentication,
revocation, ownership checks and transactional game updates remain enabled.
Use production mode and inspect Server-Timing to measure auth/database latency.
Actual database region, network and provider latency still affect response time.
`],
  [58, 61, `Deploy to a Node-compatible Next.js host, configure environment values there,
and authorize its domain in Firebase Authentication. Static export cannot run
these server routes. Provide the hosted URL, a dedicated application demo account,
assessor database access, source ZIP and this README as specified by the brief.
Arrange access privately; never submit a service-account private key as a password.
Exclude node_modules, .next, backups, build caches and .env.local from the source ZIP.
Installed updater scripts are not needed to run the application.
`],
  [62, 91, `See REQUIREMENTS-CHECK.md for evidence and remaining live checks. Tests and a
successful build cannot certify deployed authentication, live AI or assessor access.
`]
]);

// REQUIREMENTS-CHECK.md
stage("REQUIREMENTS-CHECK.md", null, "b2ec3db38b6b9848e6b0c45c68604b1f747a1e92250b4946dab3c8a8874b7d94", `# Requirements evidence and final verification

This is a source audit checklist, not a guarantee of marks. Local tests verify
rules and presentation logic; the deployed system needs the live checks below.

| Brief requirement | Implementation evidence |
|---|---|
| Single player, exactly ten countries, random opponents/order | CampaignEngine.create; population/setup tests |
| Population brackets and full starting armies | BattleRules.soldiersFromPopulation; boundary tests |
| One attack per turn, locked target, repeated exchanges | CampaignEngine; attack-lock and stop/exhaustion tests |
| Both sides min(attacker - 1, defender) dice; original pair order; ties no loss | BattleRules; dice tests; no Risk three-dice cap |
| Original-value conquest reward and next-turn new attack | CampaignEngine; conquest test |
| Owned-country transfers; retain one; none during attack | CampaignEngine; transfer validation tests |
| Round-two reinforcement and elimination | CampaignEngine; reinforcement/elimination tests |
| All ten countries conquered wins | CampaignEngine and CampaignExperience victory overlay; win simulations |
| Visible armies, any-distance attack, country clicks | RiskMap and CampaignExperience; live UI check required |
| Reasoned NPC actions, allocations, transfers, stopping | NpcStrategy; simulations at all difficulties |
| Fast-forward still shows decisions | CampaignExperience and BattleClock; verify live at 1x/2.5x |
| Visible battles/dice/losses/outcomes | BattleEffects, RollingDice, miniatures and history; visual check required |
| Dynamic LLM commentary | BattleCommentary and API; live AI-labelled response required |
| Public spectators, owner-only moves | Firestore rules, verified API tokens, repository owner check; two-account live check |
| Multiple saved campaigns | Lobby and CampaignRepository; live create/resume/delete check |
| NoSQL and deployment | Firestore implementation; deployed URL and online configuration required |

## Rubric evidence

| Area | Evidence to demonstrate |
|---|---|
| Separate database layer/configuration/appropriateness/online | CampaignRepository, firebase/admin, env configuration; show online Firestore |
| Database connection | Create a real campaign, reload it and show its saved document |
| Database design | campaigns/{id} plus immutable events/{revision}; state snapshots and indexes |
| Framework and coding structure | Next.js App Router; typed components, routes, engine and repository separation |
| Classes and encapsulation | CampaignEngine, BattleRules, CampaignRepository private helpers, FlightLedger private state |
| Validation/controls/security | Zod API parsing, engine guards, verified tokens, revisions, server dice and denied browser writes |
| Functionality | Rule regression tests plus full live game walkthrough |
| Lists/search/filter/view | Lobby campaign list, country search/difficulty controls and campaign history; demonstrate actual UI |
| User interface/navigation | Login globe, war room, field manual, interactive map, dialogs; review desktop/mobile |
| Authentication/authorization | Signed-out read-only spectator, owner commands, second-account rejection |
| Sophistication | Battle engine, reasoned NPCs, replay, transactions and realtime presentation |
| AI application | Working Groq-generated commentary labelled AI; fallback alone is insufficient |
| Overall effort | Original UI/miniatures, tests, documentation, architecture and bonus demonstrations |

## Live acceptance checklist before submission

- [ ] Production build deployed and reachable by shared URL.
- [ ] Firebase rules/indexes deployed to the correct project.
- [ ] Sign-up/login/logout work; only owner can move, advance NPCs or delete.
- [ ] A second account cannot mutate somebody else's campaign.
- [ ] Signed-out shared link shows realtime board/history without play controls.
- [ ] New battle produces actual AI-labelled commentary with no client secret exposure.
- [ ] One plane flight per genuine dice exchange, no flight for duplicate notifications, and independent fresh replay flights.
- [ ] Replay displays historical boards, dice, casualties and outcomes; live state is unchanged.
- [ ] Default speed 1x; 2.5x NPC playback remains visible with reasons.
- [ ] Allocation, transfer, stop, defeat, conquest and victory work in the browser.
- [ ] Diplomacy acceptance/rejection, expiry, betrayal and reputation display correctly.
- [ ] Delete confirmation is centred and deletion removes campaign/history.
- [ ] Music follows login/war room/game and persistent mute; keyboard/mobile controls work.
- [ ] Dedicated application demo credentials and required assessor database access arranged privately.
- [ ] Source ZIP, README, deployed URL and submission materials uploaded to Amathuba.

The automated suite does not establish animation appearance, live provider uptime,
Firestore rule deployment or assessor permissions. Record these checks separately.
`);

if (!staged.size) { console.log("All final updates are already installed."); process.exit(0); }
const backup = path.join(path.dirname(root),path.basename(root)+"-final-backup-"+Date.now());
fs.mkdirSync(backup,{recursive:true});
for (const file of staged.keys()) {
  const source=path.join(root,file), saved=path.join(backup,file);
  if(fs.existsSync(source)) { fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(source,saved); }
}
const written=[];
try {
  for(const [file,text] of staged) {
    const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});
    written.push(file);fs.writeFileSync(target,text);console.log("Updated "+file);
  }
} catch(error) {
  for(const file of written.reverse()) {
    const saved=path.join(backup,file), target=path.join(root,file);
    if(fs.existsSync(saved))fs.copyFileSync(saved,target);else fs.rmSync(target,{force:true});
  }
  throw error;
}
console.log("Backup outside project: "+backup);
console.log("Run npm test, npx tsc --noEmit, npm run lint, npm run build, then npm start.");