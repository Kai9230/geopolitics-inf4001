/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const changes = new Map();
const root = process.cwd();
function read(file) {
  if (changes.has(file)) return changes.get(file);
  if (!fs.existsSync(file)) throw new Error("Missing " + file + ". Run this inside the extracted finalupload project.");
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}
function exact(text, oldText, newText, file) {
  if (!text.includes(oldText)) throw new Error("Unexpected contents in " + file + ". No changes written.");
  return text.replace(oldText, newText);
}
function edit(file, fn) { changes.set(file, fn(read(file))); }
function add(file, text) { changes.set(file, text); }

const component = "src/components/CampaignExperience.tsx";
edit(component, text => {
  if (text.includes("// GeoPolitics completion 2026-11-05")) return text;
  text = exact(text, 'import s from "./CampaignExperience.module.css";', 'import s from "@/components/game/CampaignExperience.module.css";\nimport CampaignAnalytics from "@/components/game/CampaignAnalytics";\nimport { MusicPlayer } from "@/lib/audio/MusicPlayer";\nimport Image from "next/image";', component);
  const start = text.indexOf("  function select(");
  const end = text.indexOf("\n  if (\n    fatal", start);
  if (start < 0 || end < 0) throw new Error("Country handler was not found. No changes written.");
  text = text.slice(0, start) + `  function select(id: string): void {
    if (!live) return;
    const blocked = !owner ? "Sign in as this campaign's owner to make moves."
      : history !== null ? "Return to live play before selecting an attacker."
      : live.status !== "active" ? "This campaign has finished."
      : !humanTurn ? "Wait for YOUR TURN. Opponents are still playing."
      : live.pendingReinforcements > 0 ? "Allocate all reinforcements in the command console first."
      : live.activeAttack ? "Your current attack is locked. Let it finish or stop it."
      : live.attackUsed ? "Your one attack is complete. Transfer troops or finish your turn."
      : busy || inFlight.current ? "Your command is being saved. Please wait."
      : !caughtUp ? "The previous saved exchange is still being shown. Please wait."
      : "";
    if (blocked) { setNotice(blocked); return; }
    const country = live.countries.find(item => item.id === id);
    if (!country) return;
    if (country.ownerId === "human") {
      if (country.soldiers < 2) {
        setError("This country needs at least two soldiers to attack. Reinforce or transfer troops first.");
        return;
      }
      setFrom(country.id); setTo(""); setError("");
      setNotice("Attacker selected. Click an enemy country to launch your one attack this turn.");
      return;
    }
    const source = live.countries.find(item => item.id === from && item.ownerId === "human");
    if (!source || source.soldiers < 2) {
      setError("First select one of your countries with at least two soldiers.");
      return;
    }
    setTo(country.id); setError(""); setNotice("");
    stopIntent.current = false; setStop(false); setPaused(false);
    void send({ type: "start-attack", fromId: source.id, toId: country.id });
  }
` + text.slice(end);
  text = exact(text, "  const inFlight = useRef(false);", "  const inFlight = useRef(false);\n  const nextRequestAt = useRef(0);", component);
  text = exact(text, "  const live = model.live;", `  const live = model.live;
  const battleActive = !!live?.activeAttack || !!model.playing;
  useEffect(() => {
    MusicPlayer.setScene(battleActive ? "battle" : "silent");
    return () => MusicPlayer.setScene("silent");
  }, [battleActive]);`, component);
  text = exact(text, "      try {\n        const result = action", `      try {
        const delay = nextRequestAt.current - Date.now();
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        if (!mounted.current) return;
        const result = action`, component);
  text = exact(text, "        if (mounted.current) {\n          dispatch({", "        nextRequestAt.current = Date.now() + 320;\n        if (mounted.current) {\n          dispatch({", component);
  text = text.replace("SoundEngine.reinforce();", "SoundEngine.turnStart();");
  text = text.replace("3. Confirm the route below.", "3. The enemy click launches your attack.");
  text = text.replace("Click your country, then an enemy target", "Click your country, then click an enemy to attack");
  text = text.replace(/>\s*Launch attack\s*<\/button>/, ">Retry selected attack</button>");
  text = text.replace(/<span>\s*\{country\.name\}\s*<\/span>/, `<span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Image src={country.flag} alt="" width={24} height={16} unoptimized />
                {country.name}
              </span>`);
  text = exact(text, "          <button\n            aria-pressed={vibration}", `          <CampaignAnalytics events={model.events.filter(event => event.revision <= (history ?? model.cursor ?? 0))} />
          <button
            aria-pressed={vibration}`, component);
  return "// GeoPolitics completion 2026-11-05\n" + text;
});

add("src/app/game/[gameId]/page.tsx", `"use client";
import { useParams } from "next/navigation";
import CampaignExperience from "@/components/CampaignExperience";
export default function GamePage() {
  const params = useParams();
  const id = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
  return id ? <CampaignExperience key={id} gameId={id} /> : <p>Invalid campaign link.</p>;
}
`);

edit("src/app/lobby/page.tsx", text => {
  text = text.replace('await deleteDoc(doc(db, "campaigns", id));', 'await CampaignClient.remove(id);');
  text = text.replace('    } catch {\n      window.alert("Could not delete the campaign. Please try again.");', '    } catch (failure) {\n      window.alert(failure instanceof Error ? failure.message : "Could not delete the campaign. Please try again.");');
  text = text.replace('Delete campaign "${name}"?', 'Permanently delete campaign "${name}" and all its history? This cannot be undone.');
  text = text.replace("  deleteDoc,\n", "").replace("  doc,\n", "");
  if (!text.includes('href="/how-to-play"')) text = text.replace("<h2>Campaign briefing</h2>", '<h2>Campaign briefing</h2>\n            <Link href="/how-to-play" className={styles.link}>How to play</Link>');
  return text;
});
edit("src/lib/audio/SoundEngine.ts", text => text.includes("static turnStart()") ? text : text.replace("  static click() {", `  static turnStart() {
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      this.tone("triangle", frequency, frequency, 0.32, 0.14, index * 0.14);
    });
  }
  static click() {`));
edit("src/lib/audio/MusicPlayer.ts", text => {
  if (text.includes('const effectiveScene: MusicScene = scene;')) return text;
  const a = text.indexOf("    this.scene =\n");
  const b = text.indexOf("\n    try {", a);
  if (a < 0 || b < 0) throw new Error("Unexpected MusicPlayer settings. No changes written.");
  text = text.slice(0, a) + '    this.scene = window.location.pathname === "/" ? "login" : "silent";\n' + text.slice(b);
  const c = text.indexOf("    /*\n     * Game routes");
  const d = text.indexOf("\n    this.scene = effectiveScene;", c);
  if (c < 0 || d < 0) throw new Error("Unexpected MusicPlayer scene control. No changes written.");
  return text.slice(0, c) + '    const effectiveScene: MusicScene = scene;\n' + text.slice(d);
});
edit("src/components/MusicDirector.tsx", text => {
  if (text.includes('MusicPlayer.setScene(pathname === "/"')) return text;
  const a = text.indexOf("    MusicPlayer.setScene(");
  const b = text.indexOf("\n\n    const unlock", a);
  if (a < 0 || b < 0) throw new Error("Unexpected MusicDirector. No changes written.");
  return text.slice(0, a) + '    MusicPlayer.setScene(pathname === "/" ? "login" : "silent");' + text.slice(b);
});
edit("src/lib/engine/NpcStrategy.ts", text => text
  .replace("CONTINUE_RATIO[state.difficulty];", "Math.max(0.7, CONTINUE_RATIO[state.difficulty] - Math.max(0, state.round - 8) * 0.08);")
  .replace("START_RATIO[state.difficulty];", "Math.max(0.85, START_RATIO[state.difficulty] - Math.max(0, state.round - 8) * 0.08);")
  .replace('if (state.difficulty !== "easy") {', 'if (state.difficulty !== "easy" || state.round > 8) {')
  .replace("country.soldiers * 2,", "country.soldiers * (state.round > 12 ? -0.5 : 2),"));
add("src/app/api/ai/commentary/route.ts", `export async function POST(): Promise<Response> {
  return Response.json({ error: "Commentary is generated through authenticated saved campaign exchanges." }, { status: 410 });
}
`);
add("src/components/game/CampaignAnalytics.tsx", `import styles from "@/styles/Campaign.module.css";
type BattleEvent = { actorId: string; action: string; dice?: { attackerLosses: number; defenderLosses: number } | null };
export default function CampaignAnalytics({ events }: { events: BattleEvent[] }) {
  const yours = events.filter(event => event.actorId === "human");
  const exchanges = yours.filter(event => event.dice);
  const attacks = yours.filter(event => event.action === "start-attack").length;
  const losses = exchanges.reduce((sum, event) => sum + (event.dice?.attackerLosses ?? 0), 0);
  const inflicted = exchanges.reduce((sum, event) => sum + (event.dice?.defenderLosses ?? 0), 0);
  return <section className={styles.panel} aria-label="Your attack analytics">
    <h2>Your battle record</h2><p className={styles.muted}>Saved human attacks in the displayed history range.</p>
    <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, fontSize: 12 }}>
      <dt>Attacks launched</dt><dd>{attacks}</dd><dt>Dice exchanges</dt><dd>{exchanges.length}</dd>
      <dt>Defender losses inflicted</dt><dd>{inflicted}</dd><dt>Your attacking losses</dt><dd>{losses}</dd>
    </dl>
  </section>;
}
`);
add("src/app/how-to-play/page.tsx", `import Link from "next/link";
import s from "@/styles/Campaign.module.css";
export default function HowToPlay() {
  return <main className={s.shell}><div className={s.content}>
    <header className={s.header}><div><p className={s.eyebrow}>GEOPOLITICS / FIELD MANUAL</p><h1 className={s.title}>How to play</h1></div><Link href="/lobby" className={s.link}>War room</Link></header>
    <div className={s.split}>
      <section className={s.panel}><h2>1. Create your campaign</h2><p className={s.muted}>Choose your starting country and difficulty. Nine different opponents are randomly selected. Every country starts with its full population-based army. Turn order is random; each surviving participant receives one turn per round.</p>
      <table className={s.rulesTable}><thead><tr><th>Population up to</th><th>Soldiers</th></tr></thead><tbody>{["5 million","10 million","25 million","50 million","75 million","100 million","125 million","150 million","Above 150 million"].map((value,index)=><tr key={value}><td>{value}</td><td>{index+1}</td></tr>)}</tbody></table></section>
      <section className={s.panel}><h2>2. Your turn</h2><ol className={s.instructions}><li>From round two, allocate two new soldiers per country you own.</li><li>Click your country with at least two soldiers.</li><li>Click an enemy country to launch your one attack. Any distance is allowed.</li><li>Exchanges continue automatically against that locked target.</li><li>Stop to end the attack and turn. A resolving exchange finishes before stopping.</li><li>After conquest, transfer troops if desired and finish your turn. A second target must wait until your next turn.</li></ol><p className={s.muted}>You can skip your attack. Your turn waits for your decision.</p></section>
      <section className={s.panel}><h2>3. Dice and casualties</h2><p className={s.muted}>Both sides roll min(attacker soldiers minus one, defender soldiers) dice. Pair dice in their original order. Higher roll wins; the other side loses one soldier. A tie kills neither soldier. There is no three-dice cap.</p><p className={s.muted}>Example: 10 attackers against two defenders means two dice per side. Rolls [1,4] against [2,3] cause one loss on each side. Three attackers against five defenders also roll two per side.</p><p className={s.muted}>If the attacker reaches one soldier, the attack and turn end, with ownership retained. An attack also ends on conquest or when stopped.</p></section>
      <section className={s.panel}><h2>4. Conquest and transfers</h2><p className={s.muted}>Conquest gives the captured country max(2, floor(original soldier value / 2)) soldiers. A value of nine gives four; a value of one gives two.</p><p className={s.muted}>Transfer between any two countries you own outside an active attack, after placing reinforcements. Leave at least one soldier at the source. Transfer controls appear once you own at least two countries.</p><p className={s.muted}>A participant is eliminated only after losing all countries. Eliminated participants are skipped. Control all ten countries to win.</p></section>
      <section className={s.panel}><h2>5. NPCs, history and spectators</h2><p className={s.muted}>NPCs compare armies and targets, allocate soldiers and explain their choices. Fast-forward speeds up visible play without hiding decisions. History shows saved states and dice; return to live play to resume commands.</p><p className={s.muted}>Share the link for public viewing. Only the signed-in owner can move, advance NPCs or delete the campaign. NPC simulation pauses when the owner closes the live game. Refreshing retains saved progress.</p></section>
      <section className={s.panel}><h2>6. Sound and commentary</h2><p className={s.muted}>The turn chime plays once per human turn and follows effects settings. Vibration is optional and device dependent. Login music belongs to the login; battle music runs during attacks. Audio may need an initial click to unlock.</p><p className={s.muted}>The AI correspondent describes saved battle facts. Groq reports are labelled AI; unavailable service produces a labelled factual fallback. The LLM never decides casualties. Miniatures show up to six representative figures per side; all actual dice are displayed.</p></section>
    </div>
  </div></main>;
}
`);
edit("src/styles/Campaign.module.css", text => text.includes(".rulesTable") ? text : text + `
.rulesTable { width:100%; border-collapse:collapse; font-size:13px; line-height:1.6; }
.rulesTable th,.rulesTable td { text-align:left; padding:12px; border-bottom:1px solid #92a8c12c; }
.rulesTable th { color:#e9c777; }
.instructions { padding-left:22px; color:#bccbdf; font-size:13px; line-height:1.9; }
.instructions li { padding:5px 0; }
`);
add("firebase.json", JSON.stringify({firestore:{rules:"src/lib/api/firestore.rules",indexes:"firestore.indexes.json"}},null,2)+"\n");
add("firestore.indexes.json", '{"indexes":[],"fieldOverrides":[]}\n');
add(".env.example", `NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=""
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
`);
add("README.md", `# GeoPolitics

Next.js, React, TypeScript, Firebase Authentication, Cloud Firestore and Groq.

## Run
1. Install Node.js 22 or newer. Run npm ci in this folder.
2. Preserve your existing .env.local. Fill any missing variables shown in .env.example.
3. Enable Firebase Email/Password Authentication and Cloud Firestore.
4. Publish src/lib/api/firestore.rules. With Firebase CLI, choose your own project using firebase use --add, then run firebase deploy --only firestore:rules,firestore:indexes.
5. Run npx tsc --noEmit, npm run lint, then npm run dev. Open http://localhost:3000.
6. Configure your own server-side GROQ_API_KEY. Restart and verify a NEW battle exchange produces an AI-labelled report. A fallback alone does not demonstrate live AI.

## Play
Click your country with two or more soldiers, then an enemy. One attack is allowed each turn, with repeated automatic exchanges against the same target. After conquest, transfer and finish your turn. Transfer controls require two owned countries and no active attack. Place all reinforcements first. How to Play explains all PDF rules.

## Five bonus areas
Graphics/3D animation; saved history/replay; NPC difficulty; player analytics; anti-cheating through server-authoritative dice, ownership, revisions and persistent attacks.

## Architecture
CampaignEngine and BattleRules own game rules. NpcStrategy makes reasoned decisions. CampaignRepository owns database transactions and deletion. API routes authenticate and validate. CampaignExperience presents saved results. BattleCommentary describes confirmed facts. Browser writes to campaign documents remain denied.

## Deploy and submit
Use a Node-compatible Next.js host, such as your Vercel project. This application needs server API routes; a static export is insufficient. Set the same environment variables on the host, including public Firebase values before building. Add the deployed domain to Firebase Authentication authorized domains. Run npm run build and deploy.

Provide the PDF's source ZIP, hosted URL, application test credentials, database assessor access, and this README. Create a dedicated demo account and arrange assessor database access privately. Never include .env.local, Admin keys, node_modules, .next or backups in the submitted source ZIP.

## Final live checks
Verify owner sign-in, new campaign, population armies, round-two reinforcements, click attack, paired unsorted dice/no-loss ties, stop, conquest reward, transfers, elimination/victory, visible NPC reasons/fast-forward, refresh protection, history, real Groq output, a signed-out spectator, second-account rejection, and disposable-campaign deletion including its history.

These source changes do not certify a live deployment, provider response or assessor permissions. Complete those checks on your configured deployed application before submission. No mark or selection is guaranteed.
`);

edit("package.json", text => {
  const data = JSON.parse(text);
  data.scripts.test = "node --test tests/specification.cjs";
  return JSON.stringify(data, null, 2) + "\n";
});
add("tests/specification.cjs", `/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const ts = require('typescript');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const previous = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { CampaignEngine: E } = require('../src/lib/engine/CampaignEngine.ts');
const { BattleRules: B } = require('../src/lib/engine/BattleRules.ts');
const { NpcStrategy: N } = require('../src/lib/engine/NpcStrategy.ts');
const { COUNTRY_CATALOGUE: pool } = require('../src/data/country-catalogue.ts');
if (previous) require.extensions['.ts'] = previous; else delete require.extensions['.ts'];
const random = max => max - 1;
function setup() { return E.create({ id: 'test', playerId: 'owner', selectedCountryId: 'in', countryPool: pool, difficulty: 'normal' }, random, 0); }
function apply(state, action, rng = random) { return E.apply(state, E.currentActor(state), action, rng, 1).state; }
function board() { const s = setup(); s.turnIndex = s.turnOrder.indexOf('human'); s.countries[0].soldiers = 10; s.countries[1].soldiers = 2; return s; }
function attack(s) { return apply(s, { type: 'start-attack', fromId: s.countries[0].id, toId: s.countries[1].id }); }
function rolls(values) { let i = 0; return () => values[i++]; }
test('all population boundaries and ten-country creation', () => {
  [5e6, 10e6, 25e6, 50e6, 75e6, 100e6, 125e6, 150e6].forEach((n, i) => { assert.equal(B.soldiersFromPopulation(n), i + 1); assert.equal(B.soldiersFromPopulation(n + 1), i + 2); });
  const s = setup(); assert.equal(s.countries.length, 10); assert.equal(new Set(s.countries.map(c => c.id)).size, 10); assert.equal(s.turnOrder.length, 10);
  s.countries.forEach(c => assert.equal(c.soldiers, B.soldiersFromPopulation(c.population)));
});
test('PDF dice counts, original pair order and no-loss ties', () => {
  assert.equal(B.diceCount(10, 2), 2); assert.equal(B.diceCount(3, 5), 2); assert.equal(B.diceCount(2, 5), 1); assert.equal(B.diceCount(20, 12), 12);
  const r = B.resolveExchange(10, 2, [1, 4], [2, 3]); assert.equal(r.attackerRemaining, 9); assert.equal(r.defenderRemaining, 1);
  const t = B.resolveExchange(3, 2, [5, 5], [5, 5]); assert.equal(t.attackerLosses + t.defenderLosses, 0);
});
test('one locked attack permits repeated exchanges but no new target or transfer', () => {
  const s = attack(board()); const n = apply(s, { type: 'roll' }, rolls([0, 3, 1, 2])); assert.equal(n.activeAttack.exchangeNumber, 1); assert(n.attackUsed); assert.equal(n.turnIndex, s.turnIndex);
  assert.throws(() => apply(n, { type: 'start-attack', fromId: n.countries[0].id, toId: n.countries[2].id }));
  assert.throws(() => apply(n, { type: 'transfer', fromId: n.countries[0].id, toId: n.countries[1].id, amount: 1 })); assert.equal(s.countries[0].soldiers, 10);
});
test('conquest rewards use original value and second attack remains blocked', () => {
  const n = apply(attack(board()), { type: 'roll' }, rolls([5, 5, 0, 0])); assert.equal(n.countries[1].ownerId, 'human'); assert.equal(n.countries[1].soldiers, B.conquestReward(n.countries[1].baseSoldiers)); assert.equal(n.activeAttack, null);
  assert.throws(() => apply(n, { type: 'start-attack', fromId: n.countries[0].id, toId: n.countries[2].id }));
});
test('transfers preserve one soldier and require ownership', () => {
  const n = apply(attack(board()), { type: 'roll' }, rolls([5, 5, 0, 0])); const t = apply(n, { type: 'transfer', fromId: n.countries[0].id, toId: n.countries[1].id, amount: 9 }); assert.equal(t.countries[0].soldiers, 1);
  assert.throws(() => apply(n, { type: 'transfer', fromId: n.countries[0].id, toId: n.countries[1].id, amount: 10 }));
  assert.throws(() => apply(n, { type: 'transfer', fromId: n.countries[0].id, toId: n.countries[2].id, amount: 1 }));
});
test('stopping and exhaustion end the turn without losing attacking territory', () => {
  let s = board(); s.countries[0].soldiers = 2; s = attack(s); const n = apply(s, { type: 'roll' }, rolls([0, 5])); assert.equal(n.countries[0].soldiers, 1); assert.equal(n.countries[0].ownerId, 'human'); assert.notEqual(E.currentActor(n), 'human');
  const stopped = apply(s, { type: 'stop-attack' }); assert.deepEqual(stopped.countries, s.countries); assert.notEqual(E.currentActor(stopped), 'human');
});
test('round-two reinforcement is exact and cannot be granted twice', () => {
  let s = setup(); for (let i = 0; i < 9; i++) { s = apply(s, { type: 'end-turn' }); assert.equal(s.pendingReinforcements, 0); }
  s = apply(s, { type: 'end-turn' }); assert.equal(s.round, 2); assert.equal(s.pendingReinforcements, 2); const c = s.countries.find(c => c.ownerId === E.currentActor(s));
  assert.throws(() => apply(s, { type: 'allocate', allocations: { [c.id]: 1 } })); s = apply(s, { type: 'allocate', allocations: { [c.id]: 2 } }); assert.equal(s.pendingReinforcements, 0);
  assert.throws(() => apply(s, { type: 'allocate', allocations: { [c.id]: 2 } }));
});
test('elimination skips participants and conquest of all ten wins', () => {
  let s = setup(); const eliminated = s.turnOrder[1]; s.countries.filter(c => c.ownerId === eliminated).forEach(c => c.ownerId = s.turnOrder[0]); s = apply(s, { type: 'end-turn' }); assert.notEqual(E.currentActor(s), eliminated);
  s = board(); s.countries.forEach((c, i) => { if (i !== 1) c.ownerId = 'human'; }); s.countries[1].soldiers = 1; s = apply(attack(s), { type: 'roll' }, rolls([5, 0])); assert.equal(s.status, 'completed'); assert.equal(s.winnerId, 'human');
});
test('strategic simulations reach victory at all three difficulties', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    let s = setup(); s.difficulty = difficulty; s.participants.forEach(p => p.kind = 'npc'); let seed = 123456789;
    const rng = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * max); };
    for (let i = 0; i < 15000 && s.status === 'active'; i++) { const decision = N.choose(s); assert(decision.reason); s = apply(s, decision.action, rng); s.countries.forEach(c => assert(Number.isSafeInteger(c.soldiers) && c.soldiers >= 1)); }
    assert.equal(s.status, 'completed', difficulty);
  }
});
`);

const crypto = require("node:crypto");
const hash = text => crypto.createHash("sha256").update(text).digest("hex");
patchFile("README.md","98ad06310d18c9bac214370fbf662cbbd294bb53ed931d0283f913420ac9dd86","d53f760d6c2cc9e00ac58f54195524e2da9f83a107e82b493faa9c99b3820dd8",[[757,757,"The searchable catalogue contains 195 sovereign countries (193 UN members plus Palestine and Vatican City); each campaign uses exactly 10. 2026 populations are a checked snapshot, not a live API. Old campaigns preserve their original saved armies.\n\n"],[1097,1098,"S"],[1099,1101,"x"],[1285,1285,"; temporary alliances/diplomacy with acceptance, rejection, expiry and betrayal"],[2891,2891,"\n## Finish today\nSee docs/FINISH-TODAY.md for the four-hour verification and submission plan, and docs/RUBRIC-MAP.md for evidence against all 14 marking categories.\n"]]);
addNew("docs/DATA-SOURCES.md","# Country data\n\nThe searchable catalogue covers 193 United Nations members plus Palestine and Vatican City (195 total). This is a defined sovereign-country scope, not a list of all dependencies or disputed territories. Each campaign still contains only 10 countries.\n\n2026 population snapshot: https://www.worldometers.info/world-population/population-by-country/ (checked 5 November 2026). Populations are factual numeric values. Country names/codes and approximate latitude/longitude are adapted from mledoze/countries, distributed by the world-countries npm package: https://github.com/mledoze/countries . The derived src/data/world-countries.json dataset is provided under ODbL 1.0; see https://opendatacommons.org/licenses/odbl/1-0/. Changes: selected 195 entries, joined population values, reduced fields, ISO lowercase identifiers, alphabetical sorting. The remaining application source is not licensed by that data notice.\n\nFlags are loaded using https://flagcdn.com/w80/{iso2}.png as in the existing application. Map boundaries and visual centroids may differ from sovereign-country scope; a marker/card fallback supports countries absent from map geometry.\n",true);
addNew("docs/FINISH-TODAY.md","# Four-hour completion plan\n\nThe source has passed automated engine, type, lint, build and simulated-browser checks. Complete the live checks below using your own configuration. Record results; do not mark a check passed without observing it.\n\n| Time | Work | Evidence to keep |\n|---|---|---|\n| 0:00–0:45 | Start locally with real .env.local, enable Email/Password and Firestore, publish rules, run tests/type/lint/build | Clean terminal checks and a persisted fresh campaign |\n| 0:45–1:45 | Human turn, source click → enemy click, automatic dice, stop, transfer after conquest, round-two allocation; NPC fast-forward and decisions; alliances | Saved battle events and a rules checklist |\n| 1:45–2:30 | New Groq AI report, refresh active attack, signed-out shared viewer, second-account rejection, disposable campaign deletion including events | Live provider report, owner/security checks and database cleanup |\n| 2:30–3:15 | Deploy Node-capable Next host; set environment variables, authorize domain, repeat smoke checks on hosted URL | Working public URL and separate demo login |\n| 3:15–4:00 | Arrange required assessor database access; update README with URL/setup; prepare source ZIP and rehearsal | Submission package, URL, demo credentials and access confirmation |\n\n## Required live acceptance checklist\n- [ ] Login/signup works and existing login design is intact.\n- [ ] Search worldwide catalogue; selected country plus nine unique random countries, correct population bands and random first participant.\n- [ ] Human idle turn stays open; clicking own country then enemy begins one attack.\n- [ ] Saved dice, casualties, outcome and miniature animation agree; no second target this turn.\n- [ ] Stopping ends turn; exhaustion retains territory with one soldier.\n- [ ] Conquest reward is based on original population value; transfers retain at least one source soldier.\n- [ ] From round two, exactly two soldiers per owned country are allocated once at turn start.\n- [ ] NPC allocation, transfer, target, continue/stop decisions show reasons, including fast-forward.\n- [ ] Eliminated actors are skipped; one participant owning all ten wins.\n- [ ] Alliance acceptance/rejection, expiry, ending and attack betrayal work without changing victory requirements.\n- [ ] History, replay, analytics, difficulty, mute/volume and optional vibration work.\n- [ ] A NEW exchange shows an AI correspondent report generated by Groq, not just fallback.\n- [ ] Refresh during an attack preserves the locked target and saved progress.\n- [ ] Signed-out shared visitor can view; another signed-in account cannot mutate or delete.\n- [ ] Delete a disposable campaign from the lobby and confirm its events are removed in Firestore.\n- [ ] Repeat the core flow on the deployed URL and on mobile.\n\n## Submission\nInclude source ZIP (exclude .env.local, service-account keys, node_modules, .next and backups), hosted URL, dedicated app demo credentials, and README. Follow the PDF's database access instructions for ammarcanani@gmail.com, mc.tanner@uct.ac.za and ridewaan.hanslo@uct.ac.za. Keep keys and credentials private; grant database access through your database console as appropriate for assessment.\n\nNo source-only assessment can guarantee 56/56, bonus marks or selection. Unverified live connectivity, hosting and access remain submission blockers.\n",true);
addNew("docs/RUBRIC-MAP.md","# Rubric evidence map\n\nThe marksheet has 14 categories, each scored 0–4 (56 total). This is an evidence map, not an awarded score. Source verification does not prove hosted connectivity or assessor permissions.\n\n| Category | Implemented evidence | Final demonstration |\n|---|---|---|\n| Database layer | CampaignRepository separates Firestore transactions/deletion; admin configuration isolated | Show repository and deployed NoSQL database |\n| Database connection | Authenticated API writes; onSnapshot live reads | Create, refresh and reopen real saved campaign |\n| Database design | campaigns/{id}, immutable revision event documents, afterState snapshots and commentary; owner identity | Explain schema, revisions, atomic writes and history cleanup |\n| Coding structure | Next routes, reusable components, API client, services and pure engine separated | Explain folders and request-to-engine-to-repository flow |\n| OOP concepts | CampaignEngine, BattleRules, NpcStrategy, CampaignRepository, BattleCommentary, Diplomacy classes | Explain encapsulation and responsibilities with an example |\n| Validation/controls/security | Zod strict requests, integer/ownership/turn checks, revisions, server RNG, denied browser writes | Reject invalid transfer, stale action, non-owner action |\n| Functionality | 10 nations, random order, armies, locked attacks, unsorted dice, ties, transfers, reinforcements, elimination, victory | Walk through rules; run 13 specification tests |\n| Lists/search/filter/view | 195-country search, campaign search/status filters, history and public viewing | Search country and campaign; filter completed/active |\n| User interface | Responsive map/cards, dice, 3D miniatures, accessible labelled controls, status/errors and sound | Desktop and mobile human battle |\n| Navigation | Login, lobby, play, instructions, live/replay and share link | Return from manual/replay and resume campaign |\n| Authentication/authorization | Firebase login; verified owner-only API; read-only shared spectators | Owner succeeds, second account rejected, signed-out spectator reads |\n| Sophistication/complexity | Rule engine, strategic NPCs, animation clock, realtime history and temporary diplomacy | Explain one full exchange and alliance expiry |\n| AI application | Server-side Groq commentary reads confirmed exchanges; labelled fallback | Produce a NEW AI correspondent report with real configured key |\n| Overall effort | Complete source, instructions, manual, tests, six bonus areas and evidence | Demonstrate understanding and reliable hosted experience |\n\n## Six bonus demonstrations\n1. Graphics/animation: actual battle shows synchronized 3D representative infantry and dice.\n2. History/replay: inspect earlier saved board states and replay history.\n3. Difficulty: NPC risk thresholds differ; all three modes reach victory in deterministic simulations.\n4. Player analytics: human attacks, dice exchanges and attacking casualties; lobby campaign/win totals.\n5. Anti-cheating: server rolls, atomic revisions, owner checks, persisted active attack; refresh cannot reset it.\n6. Diplomacy/alliances: propose, accept/reject with a reason, expire, revoke and betray; NPC target preference.\n\nThe PDF permits an additional feature; implementing six does not establish six separate bonus mark awards. Prioritize working required functionality over adding more features.\n",true);
addNew("docs/VERIFICATION.md","# Verification — 5 November 2026\n\nPassed: fresh ZIP repair installation; safe second run; TypeScript; ESLint; production build using dummy public Firebase values; 13 engine specification tests.\n\nBrowser checks used the actual game route and UI with simulated authentication/database/API adapters: human turn waits, SVG country selection launches attack, automatic dice/conquest, two-soldier transfer, second attack blocked, spectator controls read-only, deletion through API adapter, mobile without horizontal overflow, alliance proposal/betrayal, and worldwide country search. The fixed 3D scene was visually inspected. These tests do not certify live Firebase or Groq connectivity.\n\nOriginal login was preserved byte for byte. CampaignEngine now supports optional diplomacy while retaining the PDF battle rules. NPC late-game strategy was adjusted and all three difficulty simulations reached victory.\n\nOutstanding live checks: own Firebase credentials and published rules; new Groq report with AI source; owner vs second-account vs signed-out visitor; real parent-and-history deletion; hosted URL, authorized domain, demo credentials, assessor access and assessment submission.\n\nSix source bonus areas: graphics/animation, history/replay, difficulty, player analytics, anti-cheating, diplomacy/alliances. No exact mark or selection is guaranteed.\n",true);
patchFile("src/app/api/campaigns/route.ts","8018d9ab0e982b580a54b435c4a79917f26a794350bc2029f54203fbe56486a9","a3233bda44ef97f1e8bba70aba6baa989f165b010278c184be5e0722eff52972",[[936,936,"\n    z.object({ type: z.literal(\"offer-alliance\"), toId: countryId }).strict(),\n    z.object({ type: z.literal(\"break-alliance\"), toId: countryId }).strict(),"]]);
patchFile("src/app/how-to-play/page.tsx","3223dfedfcd4e0f2a306d99f03967cb88976a8018b9e96835d4bc18f855b367f","f8c81e99311c60d1fe80d64ee94a2a98fecd481a27ecc8f439d4bc5373369cae",[[500,501,"Search the 195-country catalogue, then c"],[4263,4263,"  <section className={s.panel}><h2>7. Optional diplomacy</h2><p className={s.muted}>Before attacking, propose one alliance per turn through the embassy. The NPC accepts if your total army is at least 75% of theirs; otherwise it declines with a reason. An accepted pact lasts until the start of the displayed expiry round. NPCs prefer feasible non-allied targets, but may betray a pact if only an allied target is feasible. End a pact through the embassy or break it by attacking. Alliances never share troops, ownership or victory: one participant must still conquer all ten countries.</p></section>\n    "]]);
patchFile("src/app/lobby/page.tsx","8d77b1226082e1a7fb0b16dfcebec898723f193f21949c2e6623d2a5e6248737","d57b3d9a33e7d8f70d1c11f8bd39338fca7171c91697d9756f1f60b7c2aad972",[[1982,1982,"\n  const [countrySearch, setCountrySearch] = useState(\"\");"],[10956,10956,"earch 195 countries\n                <input type=\"search\" value={countrySearch} disabled={creating}\n                  placeholder=\"Search by country name or code\"\n                  onChange={event => setCountrySearch(event.target.value)} />\n              </label>\n              <p>Your selected country plus nine random opponents. Existing campaigns keep their saved countries.</p>\n              <label>\n                S"],[11237,11237,".filter(country => country.id === countryId || `${country.name} ${country.id}`.toLowerCase().includes(countrySearch.trim().toLowerCase()))"]]);
patchFile("src/components/CampaignExperience.tsx","3d5fdc5ff251449e2355bec560ba01b5df75ace46280ecfad11facd9e89ab6f9","b3810da18d2fcb78f48714443a06c2b9c08a14ac3de02ad0bf5ec8e4741934b9",[[978,978,"\";\nimport DiplomacyPanel from \"@/components/game/DiplomacyPanel"],[36197,36197,"{owner && <DiplomacyPanel state={view} enabled={canAct && !live.activeAttack && live.pendingReinforcements === 0}\n            submit={action => { void send(action); }} />}\n          "]]);
addNew("src/components/game/DiplomacyPanel.tsx","\"use client\";\nimport { useState } from \"react\";\nimport { Diplomacy } from \"@/lib/engine/Diplomacy\";\nimport type { CampaignAction, CampaignState } from \"@/types/game-state\";\nimport s from \"./CampaignExperience.module.css\";\n\nexport default function DiplomacyPanel({ state, enabled, submit }: {\n  state: CampaignState; enabled: boolean; submit: (action: CampaignAction) => void;\n}) {\n  const [target, setTarget] = useState(\"\");\n  const representatives = state.countries.filter((country, index, all) =>\n    country.ownerId !== \"human\" && all.findIndex(item => item.ownerId === country.ownerId) === index);\n  const selected = representatives.find(country => country.id === target);\n  const allied = !!selected && Diplomacy.allied(state, \"human\", selected.ownerId);\n  const pacts = Diplomacy.active(state).filter(pact => pact.a === \"human\" || pact.b === \"human\");\n  return <section className={s.panel}>\n    <small>EMBASSY · OPTIONAL STRATEGY</small>\n    <h2>Diplomacy & alliances</h2>\n    <p>Propose one pact per turn before attacking. NPCs accept when your total army is at least 75% of theirs. Pacts last until the start of the stated round.</p>\n    {pacts.length ? <ul>{pacts.map(pact => {\n      const partner = pact.a === \"human\" ? pact.b : pact.a;\n      return <li key={partner}>{state.participants.find(item => item.id === partner)?.name} · expires round {pact.expiresAtRound}</li>;\n    })}</ul> : <p>No active alliances.</p>}\n    <label>Diplomatic partner<select value={selected ? target : \"\"} disabled={!enabled}\n      onChange={event => setTarget(event.target.value)}>\n      <option value=\"\">Choose a surviving opponent</option>\n      {representatives.map(country => <option key={country.ownerId} value={country.id}>\n        {state.participants.find(item => item.id === country.ownerId)?.name}\n      </option>)}\n    </select></label>\n    <button disabled={!enabled || !selected || allied || !!state.diplomacyUsed || state.attackUsed}\n      onClick={() => submit({ type: \"offer-alliance\", toId: target })}>Propose alliance</button>\n    <button disabled={!enabled || !selected || !allied}\n      onClick={() => submit({ type: \"break-alliance\", toId: target })}>End selected alliance</button>\n    <p className={s.hint}>NPCs prefer feasible non-allied targets. Anyone may betray a pact by attacking; the history records it. There are no shared armies or shared victories: one participant must conquer all 10 countries.</p>\n  </section>;\n}\n",false);
patchFile("src/data/country-catalogue.ts","c94fdec37c4aff6089434f820abfd79238cb20698c1d792bbd508be29473d7db","db8f66ef630a07505375b24a778c7970b642d4a70871af39026a6e8bb3103361",[[0,0,"import worldCountries from \"./world-countries.json\";\n"],[219,219,"1-"],[220,223,"5"],[359,360," = worldCountries as"],[374,1142,""]]);
addNew("src/data/world-countries.json","[[\"af\",\"Afghanistan\",45047068,65,33],[\"al\",\"Albania\",2751025,20,41],[\"dz\",\"Algeria\",48028334,3,28],[\"ad\",\"Andorra\",83753,1.5,42.5],[\"ao\",\"Angola\",40215180,18.5,-12.5],[\"ag\",\"Antigua and Barbuda\",94626,-61.8,17.05],[\"ar\",\"Argentina\",46003734,-64,-34],[\"am\",\"Armenia\",2930915,45,40],[\"au\",\"Australia\",27227096,133,-27],[\"at\",\"Austria\",9107266,13.33333333,47.33333333],[\"az\",\"Azerbaijan\",10454855,47.5,40.5],[\"bs\",\"Bahamas\",404628,-76,24.25],[\"bh\",\"Bahrain\",1675572,50.55,26],[\"bd\",\"Bangladesh\",177818044,90,24],[\"bb\",\"Barbados\",282724,-59.53333333,13.16666666],[\"by\",\"Belarus\",8937018,28,53],[\"be\",\"Belgium\",11774642,4,50.83333333],[\"bz\",\"Belize\",428644,-88.75,17.25],[\"bj\",\"Benin\",15170420,2.25,9.5],[\"bt\",\"Bhutan\",802214,90.5,27.5],[\"bo\",\"Bolivia\",12749291,-65,-17],[\"ba\",\"Bosnia and Herzegovina\",3114242,18,44],[\"bw\",\"Botswana\",2603388,24,-22],[\"br\",\"Brazil\",213562666,-55,-10],[\"bn\",\"Brunei\",469775,114.66666666,4.5],[\"bg\",\"Bulgaria\",6667660,25,43],[\"bf\",\"Burkina Faso\",24601700,-2,13],[\"bi\",\"Burundi\",14729157,30,-3.5],[\"kh\",\"Cambodia\",18051219,105,13],[\"cm\",\"Cameroon\",30640817,12,6],[\"ca\",\"Canada\",40467728,-95,60],[\"cv\",\"Cape Verde\",529630,-24,16],[\"cf\",\"Central African Republic\",5698984,21,7],[\"td\",\"Chad\",21560380,19,15],[\"cl\",\"Chile\",19945850,-71,-30],[\"cn\",\"China\",1412914089,105,35],[\"co\",\"Colombia\",53936226,-72,4],[\"km\",\"Comoros\",899010,44.25,-12.16666666],[\"cr\",\"Costa Rica\",5174789,-84,10],[\"hr\",\"Croatia\",3822345,15.5,45.16666666],[\"cu\",\"Cuba\",10892659,-80,21.5],[\"cy\",\"Cyprus\",1382334,33,35],[\"cz\",\"Czechia\",10527780,15.5,49.75],[\"dk\",\"Denmark\",6023520,10,56],[\"dj\",\"Djibouti\",1199459,43,11.5],[\"dm\",\"Dominica\",65511,-61.33333333,15.41666666],[\"do\",\"Dominican Republic\",11609500,-70.66666666,19],[\"cd\",\"DR Congo\",116452162,25,0],[\"ec\",\"Ecuador\",18444506,-77.5,-2],[\"eg\",\"Egypt\",120101175,30,27],[\"sv\",\"El Salvador\",6391254,-88.91666666,13.83333333],[\"gq\",\"Equatorial Guinea\",1984468,10,2],[\"er\",\"Eritrea\",3682669,39,15],[\"ee\",\"Estonia\",1331062,26,59],[\"sz\",\"Eswatini\",1269859,31.5,-26.5],[\"et\",\"Ethiopia\",138902185,38,8],[\"fj\",\"Fiji\",937282,175,-18],[\"fi\",\"Finland\",5621739,26,64],[\"fr\",\"France\",66746401,2,46],[\"ga\",\"Gabon\",2647400,11.75,-1],[\"gm\",\"Gambia\",2884079,-16.56666666,13.46666666],[\"ge\",\"Georgia\",3804642,43.5,42],[\"de\",\"Germany\",83644258,9,51],[\"gh\",\"Ghana\",35697557,-2,8],[\"gr\",\"Greece\",9897116,22,39],[\"gd\",\"Grenada\",117362,-61.66666666,12.11666666],[\"gt\",\"Guatemala\",18967978,-90.25,15.5],[\"gn\",\"Guinea\",15441992,-10,11],[\"gw\",\"Guinea-Bissau\",2297808,-15,12],[\"gy\",\"Guyana\",840890,-59,5],[\"ht\",\"Haiti\",12037506,-72.41666666,19],[\"hn\",\"Honduras\",11184760,-86.5,15],[\"hu\",\"Hungary\",9585818,20,47],[\"is\",\"Iceland\",402329,-18,65],[\"in\",\"India\",1476625576,77,20],[\"id\",\"Indonesia\",287886782,120,-5],[\"ir\",\"Iran\",93168497,53,32],[\"iq\",\"Iraq\",48007437,44,33],[\"ie\",\"Ireland\",5356950,-8,53],[\"il\",\"Israel\",9647689,35.13,31.47],[\"it\",\"Italy\",58926166,12.83333333,42.83333333],[\"ci\",\"Ivory Coast\",33494346,-5,8],[\"jm\",\"Jamaica\",2833404,-77.5,18.25],[\"jp\",\"Japan\",122427731,138,36],[\"jo\",\"Jordan\",11589532,36,31],[\"kz\",\"Kazakhstan\",21083626,68,48],[\"ke\",\"Kenya\",58636412,38,1],[\"ki\",\"Kiribati\",138445,173,1.41666666],[\"kw\",\"Kuwait\",5102773,45.75,29.5],[\"kg\",\"Kyrgyzstan\",7400464,75,41],[\"la\",\"Laos\",7974018,105,18],[\"lv\",\"Latvia\",1835935,25,57],[\"lb\",\"Lebanon\",5897467,35.83333333,33.83333333],[\"ls\",\"Lesotho\",2389336,28.5,-29.5],[\"lr\",\"Liberia\",5853949,-9.5,6.5],[\"ly\",\"Libya\",7539852,17,25],[\"li\",\"Liechtenstein\",40368,9.53333333,47.26666666],[\"lt\",\"Lithuania\",2797338,24,56],[\"lu\",\"Luxembourg\",687448,6.16666666,49.75],[\"mg\",\"Madagascar\",33522052,47,-20],[\"mw\",\"Malawi\",22785535,34,-13.5],[\"my\",\"Malaysia\",36385115,112.5,2.5],[\"mv\",\"Maldives\",531517,73,3.25],[\"ml\",\"Mali\",25932275,-4,17],[\"mt\",\"Malta\",549011,14.58333333,35.83333333],[\"mh\",\"Marshall Islands\",35075,168,9],[\"mr\",\"Mauritania\",5461319,-12,20],[\"mu\",\"Mauritius\",1265059,57.55,-20.28333333],[\"mx\",\"Mexico\",132997658,-102,23],[\"fm\",\"Micronesia\",114182,158.25,6.91666666],[\"md\",\"Moldova\",2961253,29,47],[\"mc\",\"Monaco\",38087,7.4,43.73333333],[\"mn\",\"Mongolia\",3556798,105,46],[\"me\",\"Montenegro\",626233,19.3,42.5],[\"ma\",\"Morocco\",38762441,-5,32],[\"mz\",\"Mozambique\",36639850,35,-18.25],[\"mm\",\"Myanmar\",55184819,98,22],[\"na\",\"Namibia\",3153246,17,-22],[\"nr\",\"Nauru\",12101,166.91666666,-0.53333333],[\"np\",\"Nepal\",29629410,84,28],[\"nl\",\"Netherlands\",18448775,5.75,52.5],[\"nz\",\"New Zealand\",5287479,174,-41],[\"ni\",\"Nicaragua\",7097329,-85,13],[\"ne\",\"Niger\",28814878,8,16],[\"ng\",\"Nigeria\",242431832,8,10],[\"kp\",\"North Korea\",26633691,127,40],[\"mk\",\"North Macedonia\",1804062,22,41.83333333],[\"no\",\"Norway\",5652989,10,62],[\"om\",\"Oman\",5671458,57,21],[\"pk\",\"Pakistan\",259299792,70,30],[\"pw\",\"Palau\",17614,134.5,7.5],[\"ps\",\"Palestine\",5692790,35.2,31.9],[\"pa\",\"Panama\",4625718,-80,9],[\"pg\",\"Papua New Guinea\",10947848,147,-6],[\"py\",\"Paraguay\",7095279,-58,-23],[\"pe\",\"Peru\",34922148,-76,-10],[\"ph\",\"Philippines\",117724472,122,13],[\"pl\",\"Poland\",37843188,20,52],[\"pt\",\"Portugal\",10395362,-8,39.5],[\"qa\",\"Qatar\",3173559,51.25,25.5],[\"cg\",\"Republic of the Congo\",6637786,15,-1],[\"ro\",\"Romania\",18800605,25,46],[\"ru\",\"Russia\",143394458,100,60],[\"rw\",\"Rwanda\",14889693,30,-2],[\"kn\",\"Saint Kitts and Nevis\",46992,-62.75,17.33333333],[\"lc\",\"Saint Lucia\",180488,-60.96666666,13.88333333],[\"vc\",\"Saint Vincent and the Grenadines\",99244,-61.2,13.25],[\"ws\",\"Samoa\",220528,-172.33333333,-13.58333333],[\"sm\",\"San Marino\",33605,12.41666666,43.76666666],[\"st\",\"São Tomé and Príncipe\",244994,7,1],[\"sa\",\"Saudi Arabia\",35165787,45,25],[\"sn\",\"Senegal\",19366548,-14,14],[\"rs\",\"Serbia\",6641964,21,44],[\"sc\",\"Seychelles\",134959,55.66666666,-4.58333333],[\"sl\",\"Sierra Leone\",8996744,-11.5,8.5],[\"sg\",\"Singapore\",5905748,103.8,1.36666666],[\"sk\",\"Slovakia\",5451342,19.5,48.66666666],[\"si\",\"Slovenia\",2114574,14.81666666,46.11666666],[\"sb\",\"Solomon Islands\",858288,159,-8],[\"so\",\"Somalia\",20305907,49,10],[\"za\",\"South Africa\",65453084,24,-29],[\"kr\",\"South Korea\",51600388,127.5,37],[\"ss\",\"South Sudan\",12436037,30,7],[\"es\",\"Spain\",47850793,-4,40],[\"lk\",\"Sri Lanka\",23348315,81,7],[\"sd\",\"Sudan\",53282719,30,15],[\"sr\",\"Suriname\",645256,-56,4],[\"se\",\"Sweden\",10701046,15,62],[\"ch\",\"Switzerland\",9007798,8,47],[\"sy\",\"Syria\",26472497,38,35],[\"tj\",\"Tajikistan\",10978598,71,39],[\"tz\",\"Tanzania\",72563780,35,-6],[\"th\",\"Thailand\",71559614,100,15],[\"tl\",\"Timor-Leste\",1436923,125.91666666,-8.83333333],[\"tg\",\"Togo\",9930918,1.16666666,8],[\"to\",\"Tonga\",103291,-175,-20],[\"tt\",\"Trinidad and Tobago\",1513268,-61,11],[\"tn\",\"Tunisia\",12415138,9,34],[\"tr\",\"Türkiye\",87926082,35,39],[\"tm\",\"Turkmenistan\",7736632,60,40],[\"tv\",\"Tuvalu\",9362,178,-8],[\"ug\",\"Uganda\",52761470,32,1],[\"ua\",\"Ukraine\",39535848,32,49],[\"ae\",\"United Arab Emirates\",11574682,54,24],[\"gb\",\"United Kingdom\",69931528,-2,54],[\"us\",\"United States\",349035494,-97,38],[\"uy\",\"Uruguay\",3382537,-56,-33],[\"uz\",\"Uzbekistan\",37724223,64,41],[\"vu\",\"Vanuatu\",342564,167,-16],[\"va\",\"Vatican City\",506,12.45,41.9],[\"ve\",\"Venezuela\",28633711,-66,8],[\"vn\",\"Vietnam\",102177431,107.83333333,16.16666666],[\"ye\",\"Yemen\",42961653,48,15],[\"zm\",\"Zambia\",22521915,30,-15],[\"zw\",\"Zimbabwe\",17273580,30,-20]]\n",false);
patchFile("src/lib/engine/CampaignEngine.ts","538c6e8da65599b9838573558389bccf1b2655a0b76406df91fdb3dd0704bc9b","5520170506174775b03207217026025877a946cd8f3da725eade26210d447144",[[0,0,"import { Diplomacy } from \"./Diplomacy\";\n"],[7522,7522,"diplomacyUsed = false;\n    state."],[9128,9128,"\n      case \"offer-alliance\":\n      case \"break-alliance\": {\n        this.requireReady(state);\n        this.requireNoAttack(state);\n        const target = this.getCountry(state, action.toId);\n        if (target.ownerId === actorId) throw new Error(\"Choose another participant.\");\n        if (action.type === \"offer-alliance\") {\n          message = Diplomacy.offer(state, actorId, target.ownerId);\n        } else {\n          if (!Diplomacy.break(state, actorId, target.ownerId)) throw new Error(\"No active alliance exists with this participant.\");\n          message = `The alliance with ${state.participants.find(item => item.id === target.ownerId)?.name ?? target.name} was ended.`;\n        }\n        break;\n      }\n"],[13134,13134,"const betrayed = Diplomacy.break(state, actorId, defender.ownerId);\n        "],[13420,13420," + (betrayed ? \" This attack breaks the alliance.\" : \"\")"],[17365,17365,"alliances = Diplomacy.active(state);\n    state."]]);
addNew("src/lib/engine/Diplomacy.ts","import type { CampaignState } from \"../../types/game-state\";\n\n/** Temporary non-aggression pacts: no shared armies or shared victory. */\nexport class Diplomacy {\n  static active(state: CampaignState) {\n    const alive = new Set(state.countries.map(country => country.ownerId));\n    return (state.alliances ?? []).filter(pact =>\n      pact.expiresAtRound > state.round && alive.has(pact.a) && alive.has(pact.b));\n  }\n\n  static allied(state: CampaignState, a: string, b: string): boolean {\n    return this.active(state).some(pact =>\n      (pact.a === a && pact.b === b) || (pact.a === b && pact.b === a));\n  }\n\n  static break(state: CampaignState, a: string, b: string): boolean {\n    const existed = this.allied(state, a, b);\n    state.alliances = this.active(state).filter(pact =>\n      !((pact.a === a && pact.b === b) || (pact.a === b && pact.b === a)));\n    return existed;\n  }\n\n  static offer(state: CampaignState, actorId: string, targetId: string): string {\n    if (state.diplomacyUsed) throw new Error(\"Only one alliance proposal is allowed per turn.\");\n    if (state.attackUsed) throw new Error(\"Propose an alliance before starting your attack.\");\n    if (actorId === targetId) throw new Error(\"Choose another participant.\");\n    const target = state.participants.find(item => item.id === targetId);\n    if (!target || !state.countries.some(country => country.ownerId === targetId)) {\n      throw new Error(\"Choose a surviving participant.\");\n    }\n    if (target.kind !== \"npc\") throw new Error(\"This single-player campaign supports offers to NPCs.\");\n    if (this.allied(state, actorId, targetId)) throw new Error(\"An active pact already exists.\");\n    const strength = (id: string) => state.countries.filter(country => country.ownerId === id)\n      .reduce((total, country) => total + country.soldiers, 0);\n    state.diplomacyUsed = true;\n    // Stronger proposals offer credible protection; rejection still consumes the proposal.\n    if (strength(actorId) < strength(targetId) * 0.75) {\n      return `${target.name} declined the alliance: the proposed partner offers insufficient military protection.`;\n    }\n    state.alliances = [...this.active(state), { a: actorId, b: targetId, expiresAtRound: state.round + 2 }];\n    return `${target.name} accepted a temporary alliance until the start of round ${state.round + 2}: the partner offers credible military protection. Attacking either partner breaks the pact. Victory still requires all 10 countries.`;\n  }\n}\n",false);
patchFile("src/lib/engine/NpcStrategy.ts","57cc1f3c31424848839adc47ee0bcebcd58168912d7e04046021b2c8c9f63930","0573cf3ba5cc85e80f3f7f91f484b894eaccf3e2d72e3af25ad3a104e992e417",[[0,0,"import { Diplomacy } from \"./Diplomacy\";\n"],[6256,6256,"Number(Diplomacy.allied(state, actorId, a.country.ownerId)) -\n          Number(Diplomacy.allied(state, actorId, b.country.ownerId)) ||\n          "],[7426,7426,"Diplomacy.allied(state, actorId, candidate.country.ownerId)\n          ? \"; no non-allied target meets its strength threshold, so it breaks its pact\"\n          : \", preferring non-allied targets when feasible\") +\n        ("]]);
patchFile("src/types/game-state.ts","02999fe33c40ef76432e607e9607856c55e245d82fcebdda468126d1849fbc45","aaba377c89edf09514d28fa2173a58c821b51a1e4d2669f973218b2aad546f60",[[654,654,"// Optional for compatibility with campaigns saved before diplomacy.\n  alliances?: { a: string; b: string; expiresAtRound: number }[];\n  diplomacyUsed?: boolean;\n\n  "],[1219,1219,"\n  | { type: \"offer-alliance\"; toId: string }\n  | { type: \"break-alliance\"; toId: string }"]]);
patchFile("tests/specification.cjs","d0dd1578ff5e8ff74150f5603e9a984fe0921a27d88c8c5e127ffa4410a1e952","ade24195d2d332b6963466af02bd53bd8597d0816a8f7071396f43d5f2359621",[[393,393," esModuleInterop: true,"],[6398,6398,"\nconst { Diplomacy: D } = (() => {\n  require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);\n  const value = require('../src/lib/engine/Diplomacy.ts');\n  if (previous) require.extensions['.ts'] = previous; else delete require.extensions['.ts'];\n  return value;\n})();\ntest('world catalogue contains 195 unique valid sovereign-country seeds', () => {\n  assert.equal(pool.length, 195); assert.equal(new Set(pool.map(c => c.id)).size, 195);\n  for (const c of pool) { assert.match(c.id, /^[a-z]{2}$/); assert(Number.isSafeInteger(c.population) && c.population > 0); assert(c.x >= 0 && c.x <= 100 && c.y >= 0 && c.y <= 100); }\n  for (const c of pool) { const s = E.create({id:'world', playerId:'owner', selectedCountryId:c.id, countryPool:pool, difficulty:'normal'}, random,0); assert.equal(s.countries.length,10); assert.equal(s.countries[0].id,c.id); }\n});\ntest('alliance acceptance, rejection and proposal limits preserve armies and attack entitlement', () => {\n  const s = board(); const target = s.countries[1];\n  const accepted = E.apply(s, 'human', {type:'offer-alliance',toId:target.id},random,1);\n  assert(D.allied(accepted.state,'human',target.ownerId)); assert.match(accepted.event.message,/accepted/);\n  assert.deepEqual(accepted.state.countries,s.countries); assert.equal(accepted.state.attackUsed,false);\n  assert.throws(() => apply(accepted.state,{type:'offer-alliance',toId:s.countries[2].id}), /one alliance/i);\n  const weak = board(); weak.countries[0].soldiers=1; weak.countries[1].soldiers=10;\n  const rejected=E.apply(weak,'human',{type:'offer-alliance',toId:weak.countries[1].id},random,1);\n  assert.match(rejected.event.message,/declined/); assert(rejected.state.diplomacyUsed); assert.equal(D.active(rejected.state).length,0);\n});\ntest('pacts expire, can be revoked, and do not prevent attacking or grant shared victory', () => {\n  const s=board(); const other=s.countries[1]; const p=apply(s,{type:'offer-alliance',toId:other.id});\n  const expired=structuredClone(p); expired.round+=2; assert.equal(D.active(expired).length,0);\n  const revoked=apply(p,{type:'break-alliance',toId:other.id}); assert.equal(D.active(revoked).length,0);\n  const betrayed=E.apply(p,'human',{type:'start-attack',fromId:s.countries[0].id,toId:other.id},random,1);\n  assert.match(betrayed.event.message,/breaks the alliance/); assert.equal(D.active(betrayed.state).length,0); assert.equal(betrayed.state.status,'active');\n  assert.throws(()=>apply(betrayed.state,{type:'offer-alliance',toId:s.countries[2].id}),/current attack/);\n  const next=apply(p,{type:'end-turn'}); assert.equal(next.diplomacyUsed,false);\n  const eliminated=structuredClone(p); eliminated.countries.filter(c=>c.ownerId===other.ownerId).forEach(c=>c.ownerId='human'); assert.equal(D.active(eliminated).length,0);\n});\ntest('NPCs prefer feasible non-allies and can break a pact when only an allied target is feasible', () => {\n  const s=setup(); s.turnIndex=s.turnOrder.findIndex(id=>id!=='human'); const actor=E.currentActor(s);\n  const own=s.countries.find(c=>c.ownerId===actor); own.soldiers=20;\n  const enemies=s.countries.filter(c=>c.ownerId!==actor); enemies.forEach(c=>c.soldiers=1);\n  s.alliances=[{a:actor,b:enemies[0].ownerId,expiresAtRound:s.round+2}];\n  let decision=N.choose(s); assert.equal(decision.action.type,'start-attack'); assert.notEqual(decision.action.toId,enemies[0].id);\n  enemies.slice(1).forEach(c=>c.soldiers=100); decision=N.choose(s); assert.equal(decision.action.toId,enemies[0].id); assert.match(decision.reason,/breaks its pact/);\n});\n"]]);

function addNew(file, text, generatedDocumentation = false) {
  if (fs.existsSync(file) && read(file) !== text && !generatedDocumentation) {
    throw new Error("Existing custom file: " + file + ". No changes written.");
  }
  add(file, text);
}
function patchFile(file, beforeHash, afterHash, edits) {
  let text = read(file);
  if (hash(text) === afterHash) return;
  if (hash(text) !== beforeHash) throw new Error("Unsupported file version: " + file + ". No changes written. Use the complete source ZIP in a new folder.");
  for (const [start, end, replacement] of [...edits].reverse()) text = text.slice(0,start) + replacement + text.slice(end);
  if (hash(text) !== afterHash) throw new Error("Patch verification failed: " + file);
  add(file,text);
}
// Preflight completes before any source file is written.
for (const [file,text] of changes) {
  const full = path.join(root,file);
  const current = fs.existsSync(full) ? fs.readFileSync(full,"utf8").replace(/\r\n/g,"\n") : null;
  if (current === text) continue;
  const backup = full + ".before-today.backup";
  if (current !== null && !fs.existsSync(backup)) fs.copyFileSync(full,backup);
  fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,text,"utf8");
  console.log("Updated " + file);
}
console.log("GeoPolitics update applied: 195 countries, click attacks, transfers, deletion and six bonus areas. Run npm test, npx tsc --noEmit, npm run lint, npm run build. Then restart npm run dev.");