/* eslint-disable @typescript-eslint/no-require-imports */

/* GeoPolitics update for the attached finalfinal.zip. Run once from your project root. */
const fs = require("node:fs");
const path = require("node:path");
const root = process.cwd();
const marker = path.join(root, ".geopolitics-update-v2.json");
if (fs.existsSync(marker)) {
  console.log("This update is already installed. Run npm test and npm run build.");
  process.exit(0);
}
if (!fs.existsSync(path.join(root, "src/lib/engine/CampaignEngine.ts"))) {
  throw new Error("Run this from the project folder containing package.json and src.");
}
const staged = new Map();
function read(file) {
  return staged.has(file) ? staged.get(file) : fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
}
function replace(file, before, after) {
  const source = read(file);
  if (source.split(before).length !== 2) {
    throw new Error("Version mismatch in " + file + ". No project files were changed. Use the attached finalfinal.zip as the starting point.");
  }
  staged.set(file, source.replace(before, () => after));
}
function write(file, content) { staged.set(file, content); }
function append(file, content) { staged.set(file, read(file) + content); }

replace(`src/types/game-state.ts`, `  schemaVersion: 1;`, `  schemaVersion: 1;
  treaties?: { members: string[]; expiresRound: number }[];
  diplomacyUsed?: boolean;`);

replace(`src/types/game-state.ts`, `export type CampaignAction =`, `export type CampaignAction =
  | { type: "diplomacy"; targetId: string; operation: "offer" | "break" }`);

replace(`src/lib/engine/CampaignEngine.ts`, `    state.attackUsed = false;`, `    state.attackUsed = false;
    state.diplomacyUsed = false;`);

replace(`src/lib/engine/CampaignEngine.ts`, `    switch (action.type) {`, `    // Expired treaties never affect a new decision.
    state.treaties = (state.treaties ?? []).filter(t => t.expiresRound >= state.round);
    switch (action.type) {
      case "diplomacy": {
        this.requireReady(state);
        this.requireNoAttack(state);
        if (state.diplomacyUsed) throw new Error("One diplomatic action per turn.");
        const target = state.participants.find(p => p.id === action.targetId);
        if (!target || target.id === actorId ||
            !state.countries.some(c => c.ownerId === target.id)) {
          throw new Error("Choose another participant still in the game.");
        }
        const existing = state.treaties.find(t =>
          t.members.includes(actorId) && t.members.includes(target.id));
        if (action.operation === "break") {
          if (!existing) throw new Error("There is no active treaty to break.");
          state.treaties = state.treaties.filter(t => t !== existing);
          message = \`Treaty with \${target.name} ended. Both sides may attack freely.\`;
        } else {
          if (existing) throw new Error("A treaty already exists.");
          const strength = (id: string) => state.countries
            .filter(c => c.ownerId === id).reduce((n,c) => n + c.soldiers, 0);
          const mine = strength(actorId);
          const theirs = strength(target.id);
          const threat = Math.max(0, ...state.participants
            .filter(p => p.id !== actorId && p.id !== target.id)
            .map(p => strength(p.id)));
          // NPCs accept only if deterrence or a shared threat benefits them.
          const accepted = mine >= theirs || threat > theirs;
          if (accepted) {
            state.treaties.push({ members: [actorId, target.id], expiresRound: state.round + 1 });
            message = \`\${target.name} accepts a temporary alliance through round \${state.round + 1}: \` +
              (mine >= theirs ? "your army provides useful deterrence." : "a stronger common rival threatens it.");
          } else {
            message = \`\${target.name} rejects the offer: it sees no strategic benefit.\`;
          }
        }
        state.diplomacyUsed = true;
        break;
      }`);

replace(`src/lib/engine/CampaignEngine.ts`, `        state.attackUsed = true;`, `        // Betrayal is permitted, so every country remains a legal target.
        const betrayed = state.treaties.some(t =>
          t.members.includes(actorId) && t.members.includes(defender.ownerId));
        state.treaties = state.treaties.filter(t =>
          !(t.members.includes(actorId) && t.members.includes(defender.ownerId)));
        state.attackUsed = true;`);

replace(`src/lib/engine/CampaignEngine.ts`, `          \`against \${defender.name}.\`;`, `          \`against \${defender.name}.\` +
          (betrayed ? " This attack breaks their alliance." : "");`);

replace(`src/app/api/campaigns/route.ts`, `  z.discriminatedUnion("type", [`, `  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("diplomacy"),
      targetId: z.string().regex(/^(human|npc:[a-z]{2})$/),
      operation: z.enum(["offer", "break"]),
    }).strict(),`);

replace(`src/lib/engine/NpcStrategy.ts`, `              country.soldiers * (state.round > 12 ? -0.5 : 2),`, `              country.soldiers * (state.round > 12 ? -0.5 : 2) -
              ((state.treaties ?? []).some(t =>
                t.expiresRound >= state.round &&
                t.members.includes(actorId) &&
                t.members.includes(country.ownerId)) ? 1000 : 0),`);

replace(`src/lib/engine/NpcStrategy.ts`, `        "defensive strength and conquest rewards" +`, `        "defensive strength, conquest rewards and active alliances" +`);

replace(`src/lib/db/CampaignRepository.ts`, `action.type === "start-attack"
                ? action.fromId`, `(action.type === "start-attack" || action.type === "transfer")
                ? action.fromId`);

replace(`src/lib/db/CampaignRepository.ts`, `action.type === "start-attack"
                ? action.toId`, `(action.type === "start-attack" || action.type === "transfer")
                ? action.toId`);

replace(`src/components/MusicDirector.tsx`, `MusicPlayer.setScene(pathname === "/" ? "login" : "silent");`, `MusicPlayer.setScene(pathname.startsWith("/game/") ? "battle" : "login");`);

replace(`src/lib/audio/MusicPlayer.ts`, `this.scene = window.location.pathname === "/" ? "login" : "silent";`, `this.scene = window.location.pathname.startsWith("/game/") ? "battle" : "login";`);

replace(`src/components/CampaignExperience.tsx`, `import { MusicPlayer } from "@/lib/audio/MusicPlayer";`, `import CampaignExtras from "@/components/game/CampaignExtras";`);

replace(`src/components/CampaignExperience.tsx`, `  const battleActive =
    !!live?.activeAttack ||
    !!model.playing;

  useEffect(() => {
    MusicPlayer.setScene(
      battleActive ? "battle" : "silent"
    );

    return () => {
      MusicPlayer.setScene("silent");
    };
  }, [battleActive]);
`, ``);

replace(`src/components/CampaignExperience.tsx`, `    }, 1600);`, `    }, recordedReplayDuration(model.events, history));`);

replace(`src/components/CampaignExperience.tsx`, `export default function CampaignExperience({`, `function recordedReplayDuration(events: Event[], revision: number) {
  return events.find(e => e.revision === revision)?.dice ? 3100 : 1700;
}

export default function CampaignExperience({`);

replace(`src/components/CampaignExperience.tsx`, `    history === null &&
      !!model.playing,
  );`, `    history !== null ? replay : !!model.playing,
  );`);

replace(`src/components/CampaignExperience.tsx`, `      : model.playing ??
        [...model.events]
          .reverse()
          .find(
            (event) =>
              event.dice &&
              event.revision <=
                (
                  model.cursor ??
                  -1
                ),
          );`, `      : model.playing ?? undefined;`);

replace(`src/components/CampaignExperience.tsx`, `  const view =
    recorded?.afterState ??`, `  const replayBefore = replay && recorded?.dice
    ? model.events.find(e => e.revision === recorded.revision - 1)?.afterState
    : null;

  const view =
    replayBefore ?? recorded?.afterState ??`);

replace(`src/components/CampaignExperience.tsx`, `            <section
              className={[
                s.battle,`, `            <section
              key={\`\${history === null ? "live" : "replay"}:\${anim.id}:\${replay}\`}
              className={[
                s.battle,`);

replace(`src/components/CampaignExperience.tsx`, `          {model.playing && (
            <Clock`, `          {history !== null && replay && recorded?.dice && (
            <Clock key={\`replay:\${history}\`} id={history} fast={false} done={() => {}} />
          )}

          {history === null && model.playing && (
            <Clock`);

replace(`src/components/CampaignExperience.tsx`, `    stopIntent.current = false;
    setStop(false);
    setPaused(false);

    void send({
      type: "start-attack",
      fromId: source.id,
      toId: country.id,
    });`, `    setNotice("Target selected. Confirm Launch attack in the command console.");`);

replace(`src/components/CampaignExperience.tsx`, `                    >Retry selected attack</button>`, `                    >Launch attack</button>`);

replace(`src/components/CampaignExperience.tsx`, `3. The enemy click launches your attack.`, `3. Confirm Launch attack.`);

replace(`src/components/CampaignExperience.tsx`, `to launch your one attack this turn.`, `then confirm Launch attack.`);

replace(`src/components/CampaignExperience.tsx`, `"Click your country, then click an enemy to attack"`, `"Select your country and an enemy, then confirm Launch attack"`);

replace(`src/components/CampaignExperience.tsx`, `      {error && (
        <div`, `      <CampaignExtras
        state={live}
        enabled={canAct && !live.activeAttack && live.pendingReinforcements === 0}
        showResult={live.status === "completed" && caughtUp && history === null}
        submit={action => { void send(action); }}
        replay={() => { setHistory(model.events[0]?.revision ?? 0); setReplay(true); }}
      />

      {error && (
        <div`);

replace(`src/components/CampaignExperience.tsx`, `              <Transfer
                state={live}`, `              <Transfer
                key={\`\${live.round}:\${live.turnIndex}\`}
                state={live}`);

replace(`src/components/CampaignExperience.tsx`, `          <p className={s.hint}>
            Keep one soldier behind.
            Transfers pause during an attack.
          </p>`, `          <p className={s.hint}>
            Transfer between any two countries you own, before or after your attack.
            Leave at least one soldier in the source. No transfers during an attack.
          </p>
          {source && to && from !== to && amount >= 1 && amount < source.soldiers && (
            <p role="status">
              After transfer: {source.name} {source.soldiers - amount}; {own.find(c => c.id === to)?.name}{" "}
              {(own.find(c => c.id === to)?.soldiers ?? 0) + amount} soldiers.
              This does not end your turn.
            </p>
          )}`);

replace(`src/components/CampaignExperience.tsx`, `  const nextRequestAt = useRef(0);`, `  const nextRequestAt = useRef(0);
  const submittedRevision = useRef(-1);`);

replace(`src/components/CampaignExperience.tsx`, `        inFlight.current
      )`, `        inFlight.current || submittedRevision.current === live.revision
      )`);

replace(`src/components/CampaignExperience.tsx`, `      inFlight.current = true;

      setBusy(true);`, `      inFlight.current = true;
      submittedRevision.current = live.revision;

      setBusy(true);`);

replace(`src/components/CampaignExperience.tsx`, `      } catch (failure) {
        if (mounted.current) {`, `      } catch (failure) {
        submittedRevision.current = -1;
        if (mounted.current) {`);

replace(`src/components/CampaignExperience.tsx`, `        const events = snapshot.docs
          .map(
            (item) =>
              item.data() as Event,
          )
          .filter(
            (event) =>
              event.afterState
                ?.schemaVersion === 1,
          );

        dispatch({
          type: "events",
          events,
        });`, `        for (const change of snapshot.docChanges()) {
          if (change.type === "removed") eventCache.delete(change.doc.id);
          else {
            const event = change.doc.data() as Event;
            if (event.afterState?.schemaVersion === 1) eventCache.set(change.doc.id, event);
          }
        }
        dispatch({ type: "events", events: [...eventCache.values()] });`);

replace(`src/components/CampaignExperience.tsx`, `    const stopHistory = onSnapshot(`, `    const eventCache = new Map<string, Event>();
    const stopHistory = onSnapshot(`);

write(`src/components/game/CampaignExtras.tsx`, `"use client";

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
      <h2>{won ? "WORLD VICTORY" : \`\${winner?.name ?? "Opponent"} wins\`}</h2>
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
`);

write(`src/components/game/CampaignDeleteButton.tsx`, `"use client";

import { useRef, useState } from "react";
import { CampaignClient } from "@/lib/api/CampaignClient";
import s from "./CampaignExperience.module.css";

export default function CampaignDeleteButton({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  async function remove() {
    if (pending.current || confirmation !== "DELETE") return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await CampaignClient.remove(id);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Deletion failed. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <>
    <button type="button" onClick={() => {
      setConfirmation(""); setError(""); dialog.current?.showModal();
    }}>Delete campaign</button>
    <dialog ref={dialog} className={s.deleteDialog} aria-labelledby={\`delete-\${id}\`}
      onCancel={event => { if (pending.current) event.preventDefault(); }}>
      <h2 id={\`delete-\${id}\`}>Delete {name}?</h2>
      <p>This permanently removes this campaign, its battles and its replay history.</p>
      <label>Type DELETE to confirm
        <input autoComplete="off" value={confirmation} disabled={busy}
          onChange={e => setConfirmation(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div><button type="button" autoFocus disabled={busy} onClick={() => dialog.current?.close()}>Keep campaign</button>{" "}
        <button type="button" disabled={busy || confirmation !== "DELETE"} onClick={() => void remove()}>
          {busy ? "Deleting campaign and history…" : "Permanently delete"}
        </button></div>
    </dialog>
  </>;
}
`);

append(`src/components/game/CampaignExperience.module.css`, `
.result { margin: 22px 0; padding: clamp(24px, 5vw, 64px); border: 1px solid #e2bd69;
  border-radius: 22px; text-align: center; color: #f7ebcf;
  background: radial-gradient(ellipse at top, #65501e66, transparent 65%), #0d1925;
  box-shadow: 0 15px 60px #0005; }
.result h2 { font-size: clamp(28px, 5vw, 56px); letter-spacing: .08em; margin: 16px 0; }
.result p { line-height: 1.7; }
.result button, .deleteDialog button { min-height: 44px; padding: 10px 18px; cursor: pointer; }
.deleteDialog { width: min(90vw, 500px); border: 1px solid #866c74; border-radius: 18px;
  padding: 28px; background: #101d2b; color: #f6eeee; box-shadow: 0 30px 100px #0009; }
.deleteDialog::backdrop { background: #030912cc; backdrop-filter: blur(5px); }
.deleteDialog label { display: grid; gap: 10px; margin: 24px 0; }
.deleteDialog input { padding: 12px; background: #07101c; color: white; border: 1px solid #718298; border-radius: 8px; }
.deleteDialog button:disabled { opacity: .45; cursor: not-allowed; }
`);

replace(`next.config.ts`, `const nextConfig: NextConfig = {`, `const nextConfig: NextConfig = {
  async headers() {
    return ["/maps/:path*", "/sounds/:path*", "/textures/:path*"].map(source => ({
      source, headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
    }));
  },`);

replace(`src/app/lobby/page.tsx`, `function CampaignDeleteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (deleting || !window.confirm(\`Permanently delete campaign "\${name}" and all its history? This cannot be undone.\`)) {
      return;
    }

    setDeleting(true);
    try {
      await CampaignClient.remove(id);
    } catch (failure) {
      window.alert(
        failure instanceof Error
          ? failure.message
          : "Could not delete the campaign. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button type="button" disabled={deleting} onClick={() => void handleDelete()}>
      {deleting ? "Deleting…" : "Delete campaign"}
    </button>
  );
}

`, ``);

replace(`src/app/lobby/page.tsx`, `import styles from "@/styles/Campaign.module.css";`, `import styles from "@/styles/Campaign.module.css";
import CampaignDeleteButton from "@/components/game/CampaignDeleteButton";`);

append(`tests/specification.cjs`, `

test("temporary diplomacy is strategic, limited, expires and permits betrayal", () => {
  let state = board();
  const enemy = state.countries[1];
  const action = { type: "diplomacy", targetId: enemy.ownerId, operation: "offer" };
  state = apply(state, action);
  assert.equal(state.treaties.length, 1);
  assert.equal(state.treaties[0].expiresRound, state.round + 1);
  assert.throws(() => apply(state, action), /One diplomatic/);
  const attacked = attack(state);
  assert.equal(attacked.treaties.length, 0);
  assert(attacked.attackUsed);
  assert.throws(() => apply(attacked, action), /Finish or stop/);
  state.round += 2;
  state.diplomacyUsed = false;
  state = apply(state, { type: "end-turn" });
  assert.equal(state.treaties.length, 0);
  assert.equal(state.diplomacyUsed, false);
});

test("transfers conserve soldiers and reject fractions, negatives, self and enemy", () => {
  const state = board();
  state.countries[1].ownerId = "human";
  const a = state.countries[0], b = state.countries[1];
  const transfer = { type: "transfer", fromId: a.id, toId: b.id, amount: 3 };
  const next = apply(state, transfer);
  assert.equal(next.countries[0].soldiers + next.countries[1].soldiers, a.soldiers + b.soldiers);
  assert.equal(next.turnIndex, state.turnIndex);
  assert.equal(next.attackUsed, false);
  for (const amount of [0, -1, 0.5, NaN, Infinity, a.soldiers]) {
    assert.throws(() => apply(state, { ...transfer, amount }));
  }
  assert.throws(() => apply(state, { ...transfer, toId: a.id }));
  assert.throws(() => apply(state, { ...transfer, toId: state.countries[2].id }));
});
`);

replace(`src/components/CampaignExperience.tsx`, `import { RiskMap } from "@/components/game/RiskMap";`, `import dynamic from "next/dynamic";
const RiskMap = dynamic(() => import("@/components/game/RiskMap").then(m => m.RiskMap), {
  ssr: false, loading: () => <p role="status">Loading world map…</p>,
});`);

replace(`src/components/CampaignExperience.tsx`, `import { MiniatureBattle } from "@/components/game/MiniatureBattle";`, `const MiniatureBattle = dynamic(() => import("@/components/game/MiniatureBattle").then(m => m.MiniatureBattle), {
  ssr: false,
});`);

replace(`src/components/MusicDirector.tsx`, `      MusicPlayer.setScene(
        "silent",
      );`, `      // The next route selects its track; preserve playback across lobby/login.`);

// Validate every edit above before touching any project file.
const backup = path.join(root, "geopolitics-backup-" + Date.now());
for (const [file] of staged) {
  const original = path.join(root, file);
  if (fs.existsSync(original)) {
    const destination = path.join(backup, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(original, destination);
  }
}
for (const [file, content] of staged) {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  console.log("Updated " + file);
}
fs.writeFileSync(marker, JSON.stringify({ backup, files: [...staged.keys()] }, null, 2));
console.log("Update complete. Backup: " + backup);
console.log("Next: npm test, npx tsc --noEmit, npm run lint, npm run build");