/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const changes = new Map();
const root = process.cwd();

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(
      "Missing " +
        file +
        ". Run this inside the extracted finalupload project.",
    );
  }

  return fs
    .readFileSync(file, "utf8")
    .replace(/\r\n/g, "\n");
}

function exact(
  text,
  oldText,
  newText,
  file,
) {
  if (!text.includes(oldText)) {
    throw new Error(
      "Unexpected contents in " +
        file +
        ". No changes written.",
    );
  }

  return text.replace(
    oldText,
    newText,
  );
}

function edit(file, transform) {
  changes.set(
    file,
    transform(read(file)),
  );
}

function add(file, text) {
  changes.set(file, text);
}

/*
 * Activate and repair the screen already
 * included in your uploaded project.
 */
const component =
  "src/components/CampaignExperience.tsx";

edit(component, (text) => {
  if (
    text.includes(
      "// GeoPolitics completion 2026-11-05",
    )
  ) {
    return text;
  }

  text = exact(
    text,

    'import s from "./CampaignExperience.module.css";',

    'import s from "@/components/game/CampaignExperience.module.css";\n' +
      'import CampaignAnalytics from "@/components/game/CampaignAnalytics";\n' +
      'import { MusicPlayer } from "@/lib/audio/MusicPlayer";\n' +
      'import Image from "next/image";',

    component,
  );

  const start = text.indexOf(
    "  function select(",
  );

  const end = text.indexOf(
    "\n  if (\n    fatal",
    start,
  );

  if (start < 0 || end < 0) {
    throw new Error(
      "Country handler was not found. No changes written.",
    );
  }

  text =
    text.slice(0, start) +
    `  function select(id: string): void {
    if (!live) return;

    const blocked = !owner
      ? "Sign in as this campaign's owner to make moves."
      : history !== null
        ? "Return to live play before selecting an attacker."
        : live.status !== "active"
          ? "This campaign has finished."
          : !humanTurn
            ? "Wait for YOUR TURN. Opponents are still playing."
            : live.pendingReinforcements > 0
              ? "Allocate all reinforcements in the command console first."
              : live.activeAttack
                ? "Your current attack is locked. Let it finish or stop it."
                : live.attackUsed
                  ? "Your one attack is complete. Transfer troops or finish your turn."
                  : busy || inFlight.current
                    ? "Your command is being saved. Please wait."
                    : !caughtUp
                      ? "The previous saved exchange is still being shown. Please wait."
                      : "";

    if (blocked) {
      setNotice(blocked);
      return;
    }

    const country = live.countries.find(
      item => item.id === id
    );

    if (!country) return;

    if (country.ownerId === "human") {
      if (country.soldiers < 2) {
        setError(
          "This country needs at least two soldiers to attack. " +
          "Reinforce or transfer troops first."
        );
        return;
      }

      setFrom(country.id);
      setTo("");
      setError("");

      setNotice(
        "Attacker selected. Click an enemy country " +
        "to launch your one attack this turn."
      );

      return;
    }

    const source = live.countries.find(
      item =>
        item.id === from &&
        item.ownerId === "human"
    );

    if (!source || source.soldiers < 2) {
      setError(
        "First select one of your countries with at least two soldiers."
      );
      return;
    }

    setTo(country.id);
    setError("");
    setNotice("");

    stopIntent.current = false;
    setStop(false);
    setPaused(false);

    void send({
      type: "start-attack",
      fromId: source.id,
      toId: country.id,
    });
  }
` +
    text.slice(end);

  text = exact(
    text,

    "  const inFlight = useRef(false);",

    "  const inFlight = useRef(false);\n" +
      "  const nextRequestAt = useRef(0);",

    component,
  );

  text = exact(
    text,

    "  const live = model.live;",

    `  const live = model.live;

  const battleActive =
    !!live?.activeAttack ||
    !!model.playing;

  useEffect(() => {
    MusicPlayer.setScene(
      battleActive ? "battle" : "silent"
    );

    return () => {
      MusicPlayer.setScene("silent");
    };
  }, [battleActive]);`,

    component,
  );

  /*
   * Respect the server's short action interval.
   * This prevents a quick valid click immediately
   * after allocation/transfer from being rejected.
   */
  text = exact(
    text,

    "      try {\n        const result = action",

    `      try {
        const delay =
          nextRequestAt.current - Date.now();

        if (delay > 0) {
          await new Promise(resolve =>
            setTimeout(resolve, delay)
          );
        }

        if (!mounted.current) return;

        const result = action`,

    component,
  );

  text = exact(
    text,

    "        if (mounted.current) {\n          dispatch({",

    "        nextRequestAt.current = Date.now() + 320;\n" +
      "        if (mounted.current) {\n" +
      "          dispatch({",

    component,
  );

  text = text.replace(
    "SoundEngine.reinforce();",
    "SoundEngine.turnStart();",
  );

  text = text.replace(
    "3. Confirm the route below.",
    "3. The enemy click launches your attack.",
  );

  text = text.replace(
    "Click your country, then an enemy target",
    "Click your country, then click an enemy to attack",
  );

  text = text.replace(
    />\s*Launch attack\s*<\/button>/,
    ">Retry selected attack</button>",
  );

  text = text.replace(
    /<span>\s*\{country\.name\}\s*<\/span>/,

    `<span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Image
                  src={country.flag}
                  alt=""
                  width={24}
                  height={16}
                  unoptimized
                />
                {country.name}
              </span>`,
  );

  text = exact(
    text,

    "          <button\n            aria-pressed={vibration}",

    `          <CampaignAnalytics
            events={model.events.filter(
              event =>
                event.revision <=
                (history ?? model.cursor ?? 0)
            )}
          />

          <button
            aria-pressed={vibration}`,

    component,
  );

  return (
    "// GeoPolitics completion 2026-11-05\n" +
    text
  );
});

/*
 * This is the key routing fix.
 * The old large page is replaced by the wrapper
 * that opens your newer gameplay screen.
 */
add(
  "src/app/game/[gameId]/page.tsx",

  `"use client";

import { useParams } from "next/navigation";

import CampaignExperience from "@/components/CampaignExperience";

export default function GamePage() {
  const params = useParams();

  const id = Array.isArray(params.gameId)
    ? params.gameId[0]
    : params.gameId;

  return id
    ? <CampaignExperience key={id} gameId={id} />
    : <p>Invalid campaign link.</p>;
}
`,
);

/*
 * Fix deletion in the lobby's existing local
 * CampaignDeleteButton.
 */
edit(
  "src/app/lobby/page.tsx",
  (text) => {
    text = text.replace(
      'await deleteDoc(doc(db, "campaigns", id));',
      "await CampaignClient.remove(id);",
    );

    text = text.replace(
      '    } catch {\n' +
        '      window.alert("Could not delete the campaign. Please try again.");',

      "    } catch (failure) {\n" +
        "      window.alert(\n" +
        "        failure instanceof Error\n" +
        "          ? failure.message\n" +
        '          : "Could not delete the campaign. Please try again."\n' +
        "      );",
    );

    text = text.replace(
      'Delete campaign "${name}"?',
      'Permanently delete campaign "${name}" and all its history? This cannot be undone.',
    );

    text = text
      .replace("  deleteDoc,\n", "")
      .replace("  doc,\n", "");

    if (
      !text.includes(
        'href="/how-to-play"',
      )
    ) {
      text = text.replace(
        "<h2>Campaign briefing</h2>",

        "<h2>Campaign briefing</h2>\n" +
          '            <Link href="/how-to-play" className={styles.link}>\n' +
          "              How to play\n" +
          "            </Link>",
      );
    }

    return text;
  },
);

/*
 * Turn-start fanfare follows the existing
 * effects mute and volume settings.
 */
edit(
  "src/lib/audio/SoundEngine.ts",
  (text) => {
    if (
      text.includes(
        "static turnStart()",
      )
    ) {
      return text;
    }

    return text.replace(
      "  static click() {",

      `  static turnStart() {
    [523.25, 659.25, 783.99].forEach(
      (frequency, index) => {
        this.tone(
          "triangle",
          frequency,
          frequency,
          0.32,
          0.14,
          index * 0.14,
        );
      },
    );
  }

  static click() {`,
    );
  },
);

/*
 * Allow the active gameplay screen to control
 * when battle music starts and stops.
 */
edit(
  "src/lib/audio/MusicPlayer.ts",
  (text) => {
    if (
      text.includes(
        "const effectiveScene: MusicScene = scene;",
      )
    ) {
      return text;
    }

    const a = text.indexOf(
      "    this.scene =\n",
    );

    const b = text.indexOf(
      "\n    try {",
      a,
    );

    if (a < 0 || b < 0) {
      throw new Error(
        "Unexpected MusicPlayer settings. No changes written.",
      );
    }

    text =
      text.slice(0, a) +
      '    this.scene = window.location.pathname === "/" ? "login" : "silent";\n' +
      text.slice(b);

    const c = text.indexOf(
      "    /*\n     * Game routes",
    );

    const d = text.indexOf(
      "\n    this.scene = effectiveScene;",
      c,
    );

    if (c < 0 || d < 0) {
      throw new Error(
        "Unexpected MusicPlayer scene control. No changes written.",
      );
    }

    return (
      text.slice(0, c) +
      "    const effectiveScene: MusicScene = scene;\n" +
      text.slice(d)
    );
  },
);

edit(
  "src/components/MusicDirector.tsx",
  (text) => {
    if (
      text.includes(
        'MusicPlayer.setScene(pathname === "/"',
      )
    ) {
      return text;
    }

    const a = text.indexOf(
      "    MusicPlayer.setScene(",
    );

    const b = text.indexOf(
      "\n\n    const unlock",
      a,
    );

    if (a < 0 || b < 0) {
      throw new Error(
        "Unexpected MusicDirector. No changes written.",
      );
    }

    return (
      text.slice(0, a) +
      '    MusicPlayer.setScene(pathname === "/" ? "login" : "silent");' +
      text.slice(b)
    );
  },
);

/*
 * Keep early-game difficulty differences.
 * Later, prevent equal armies waiting forever
 * or repeatedly recycling weak outposts.
 */
edit(
  "src/lib/engine/NpcStrategy.ts",
  (text) =>
    text
      .replace(
        "CONTINUE_RATIO[state.difficulty];",
        "Math.max(0.7, CONTINUE_RATIO[state.difficulty] - Math.max(0, state.round - 8) * 0.08);",
      )
      .replace(
        "START_RATIO[state.difficulty];",
        "Math.max(0.85, START_RATIO[state.difficulty] - Math.max(0, state.round - 8) * 0.08);",
      )
      .replace(
        'if (state.difficulty !== "easy") {',
        'if (state.difficulty !== "easy" || state.round > 8) {',
      )
      .replace(
        "country.soldiers * 2,",
        "country.soldiers * (state.round > 12 ? -0.5 : 2),",
      ),
);

/*
 * The current authenticated campaign API already
 * generates reports from saved exchanges.
 * Retire the unused public legacy endpoint.
 */
add(
  "src/app/api/ai/commentary/route.ts",

  `export async function POST(): Promise<Response> {
  return Response.json(
    {
      error:
        "Commentary is generated through authenticated saved campaign exchanges.",
    },
    { status: 410 },
  );
}
`,
);

add(
  "src/components/game/CampaignAnalytics.tsx",

  `import styles from "@/styles/Campaign.module.css";

type BattleEvent = {
  actorId: string;
  action: string;

  dice?: {
    attackerLosses: number;
    defenderLosses: number;
  } | null;
};

export default function CampaignAnalytics({
  events,
}: {
  events: BattleEvent[];
}) {
  const yours = events.filter(
    event => event.actorId === "human"
  );

  const exchanges = yours.filter(
    event => event.dice
  );

  const attacks = yours.filter(
    event => event.action === "start-attack"
  ).length;

  const losses = exchanges.reduce(
    (sum, event) =>
      sum +
      (event.dice?.attackerLosses ?? 0),
    0,
  );

  const inflicted = exchanges.reduce(
    (sum, event) =>
      sum +
      (event.dice?.defenderLosses ?? 0),
    0,
  );

  return (
    <section
      className={styles.panel}
      aria-label="Your attack analytics"
    >
      <h2>Your battle record</h2>

      <p className={styles.muted}>
        Saved human attacks in the displayed
        history range.
      </p>

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          fontSize: 12,
        }}
      >
        <dt>Attacks launched</dt>
        <dd>{attacks}</dd>

        <dt>Dice exchanges</dt>
        <dd>{exchanges.length}</dd>

        <dt>Defender losses inflicted</dt>
        <dd>{inflicted}</dd>

        <dt>Your attacking losses</dt>
        <dd>{losses}</dd>
      </dl>
    </section>
  );
}
`,
);

add(
  "src/app/how-to-play/page.tsx",

  `import Link from "next/link";

import s from "@/styles/Campaign.module.css";

export default function HowToPlay() {
  return (
    <main className={s.shell}>
      <div className={s.content}>
        <header className={s.header}>
          <div>
            <p className={s.eyebrow}>
              GEOPOLITICS / FIELD MANUAL
            </p>
            <h1 className={s.title}>
              How to play
            </h1>
          </div>

          <Link
            href="/lobby"
            className={s.link}
          >
            War room
          </Link>
        </header>

        <div className={s.split}>
          <section className={s.panel}>
            <h2>1. Create your campaign</h2>

            <p className={s.muted}>
              Choose your starting country and
              difficulty. Nine different opponents
              are randomly selected. Every country
              starts with its full population-based
              army. Turn order is random; each
              surviving participant receives one
              turn per round.
            </p>

            <table className={s.rulesTable}>
              <thead>
                <tr>
                  <th>Population up to</th>
                  <th>Soldiers</th>
                </tr>
              </thead>

              <tbody>
                {[
                  "5 million",
                  "10 million",
                  "25 million",
                  "50 million",
                  "75 million",
                  "100 million",
                  "125 million",
                  "150 million",
                  "Above 150 million",
                ].map((value, index) => (
                  <tr key={value}>
                    <td>{value}</td>
                    <td>{index + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={s.panel}>
            <h2>2. Your turn</h2>

            <ol className={s.instructions}>
              <li>
                From round two, allocate two new
                soldiers per country you own.
              </li>
              <li>
                Click your country with at least
                two soldiers.
              </li>
              <li>
                Click an enemy country to launch
                your one attack. Any distance is
                allowed.
              </li>
              <li>
                Exchanges continue automatically
                against that locked target.
              </li>
              <li>
                Stop to end the attack and turn.
                A resolving exchange finishes
                before stopping.
              </li>
              <li>
                After conquest, transfer troops
                if desired and finish your turn.
                A second target must wait until
                your next turn.
              </li>
            </ol>

            <p className={s.muted}>
              You can skip your attack. Your turn
              waits for your decision.
            </p>
          </section>

          <section className={s.panel}>
            <h2>3. Dice and casualties</h2>

            <p className={s.muted}>
              Both sides roll min(attacker soldiers
              minus one, defender soldiers) dice.
              Pair dice in their original order.
              Higher roll wins; the other side
              loses one soldier. A tie kills
              neither soldier. There is no
              three-dice cap.
            </p>

            <p className={s.muted}>
              Example: 10 attackers against two
              defenders means two dice per side.
              Rolls [1,4] against [2,3] cause one
              loss on each side. Three attackers
              against five defenders also roll
              two per side.
            </p>

            <p className={s.muted}>
              If the attacker reaches one soldier,
              the attack and turn end, with
              ownership retained. An attack also
              ends on conquest or when stopped.
            </p>
          </section>

          <section className={s.panel}>
            <h2>4. Conquest and transfers</h2>

            <p className={s.muted}>
              Conquest gives the captured country
              max(2, floor(original soldier value
              / 2)) soldiers. A value of nine
              gives four; a value of one gives two.
            </p>

            <p className={s.muted}>
              Transfer between any two countries
              you own outside an active attack,
              after placing reinforcements.
              Leave at least one soldier at the
              source. Transfer controls appear
              once you own at least two countries.
            </p>

            <p className={s.muted}>
              A participant is eliminated only
              after losing all countries.
              Eliminated participants are skipped.
              Control all ten countries to win.
            </p>
          </section>

          <section className={s.panel}>
            <h2>
              5. NPCs, history and spectators
            </h2>

            <p className={s.muted}>
              NPCs compare armies and targets,
              allocate soldiers and explain their
              choices. Fast-forward speeds up
              visible play without hiding
              decisions. History shows saved
              states and dice; return to live
              play to resume commands.
            </p>

            <p className={s.muted}>
              Share the link for public viewing.
              Only the signed-in owner can move,
              advance NPCs or delete the campaign.
              NPC simulation pauses when the
              owner closes the live game.
              Refreshing retains saved progress.
            </p>
          </section>

          <section className={s.panel}>
            <h2>6. Sound and commentary</h2>

            <p className={s.muted}>
              The turn chime plays once per human
              turn and follows effects settings.
              Vibration is optional and device
              dependent. Login music belongs to
              the login; battle music runs during
              attacks. Audio may need an initial
              click to unlock.
            </p>

            <p className={s.muted}>
              The AI correspondent describes
              saved battle facts. Groq reports
              are labelled AI; unavailable
              service produces a labelled factual
              fallback. The LLM never decides
              casualties. Miniatures show up to
              six representative figures per side;
              all actual dice are displayed.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
`,
);

edit(
  "src/styles/Campaign.module.css",
  (text) =>
    text.includes(".rulesTable")
      ? text
      : text +
        `
.rulesTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  line-height: 1.6;
}

.rulesTable th,
.rulesTable td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #92a8c12c;
}

.rulesTable th {
  color: #e9c777;
}

.instructions {
  padding-left: 22px;
  color: #bccbdf;
  font-size: 13px;
  line-height: 1.9;
}

.instructions li {
  padding: 5px 0;
}
`,
);

add(
  "firebase.json",

  JSON.stringify(
    {
      firestore: {
        rules:
          "src/lib/api/firestore.rules",

        indexes:
          "firestore.indexes.json",
      },
    },
    null,
    2,
  ) + "\n",
);

add(
  "firestore.indexes.json",
  '{"indexes":[],"fieldOverrides":[]}\n',
);

/*
 * Template only. Existing .env.local is untouched.
 */
add(
  ".env.example",

  `NEXT_PUBLIC_FIREBASE_API_KEY=
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
`,
);

add(
  "README.md",

  `# GeoPolitics

Next.js, React, TypeScript, Firebase Authentication,
Cloud Firestore and Groq.

## Run

1. Install Node.js 22 or newer. Run npm ci in this folder.
2. Preserve your existing .env.local. Fill any missing
   variables shown in .env.example.
3. Enable Firebase Email/Password Authentication and
   Cloud Firestore.
4. Publish src/lib/api/firestore.rules. With Firebase CLI,
   choose your own project using firebase use --add,
   then run:
   firebase deploy --only firestore:rules,firestore:indexes
5. Run npm test, npx tsc --noEmit, npm run lint,
   then npm run dev.
6. Open http://localhost:3000.
7. Configure your own server-side GROQ_API_KEY.
   Restart and verify a NEW battle exchange produces an
   AI-labelled report. A fallback alone does not
   demonstrate live AI.

## Play

Click your country with two or more soldiers, then an
enemy. One attack is allowed each turn, with repeated
automatic exchanges against the same target.

After conquest, transfer and finish your turn.
Transfer controls require two owned countries and no
active attack. Place all reinforcements first.

How to Play explains the PDF rules.

## Five bonus areas

- Graphics and 3D animation.
- Saved history and replay.
- NPC difficulty.
- Player analytics.
- Anti-cheating through server-authoritative dice,
  ownership, revisions and persistent attacks.

## Architecture

CampaignEngine and BattleRules own game rules.
NpcStrategy makes reasoned decisions.
CampaignRepository owns transactions and deletion.
API routes authenticate and validate.
CampaignExperience presents saved results.
BattleCommentary describes confirmed facts.

Browser writes to campaign documents remain denied.

## Deploy and submit

Use a Node-compatible Next.js host, such as your
Vercel project. This application needs server API
routes; a static export is insufficient.

Set the same environment variables on the host,
including public Firebase values before building.
Add the deployed domain to Firebase Authentication
authorized domains. Run npm run build and deploy.

Provide the PDF's source ZIP, hosted URL, application
test credentials, database assessor access and this
README.

Create a dedicated demo account and arrange assessor
database access privately.

Never include .env.local, Admin keys, node_modules,
.next or backups in the submitted source ZIP.

## Final live checks

Verify owner sign-in, new campaign, population armies,
round-two reinforcements, click attack, paired unsorted
dice and no-loss ties, stop, conquest reward, transfers,
elimination/victory, visible NPC reasons/fast-forward,
refresh protection, history, real Groq output, signed-out
spectator, second-account rejection and disposable
campaign deletion including its history.

These source changes do not certify a live deployment,
provider response or assessor permissions. Complete
those checks on the configured deployed application
before submission. No mark or selection is guaranteed.
`,
);

/*
 * Add executable specification tests.
 * Transpilation is limited to the test process.
 */
edit("package.json", (text) => {
  const data = JSON.parse(text);

  data.scripts.test =
    "node --test tests/specification.cjs";

  return (
    JSON.stringify(data, null, 2) +
    "\n"
  );
});

add(
  "tests/specification.cjs",

  `/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const previous = require.extensions[".ts"];

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");

  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  module._compile(output, filename);
};

const {
  CampaignEngine: E,
} = require("../src/lib/engine/CampaignEngine.ts");

const {
  BattleRules: B,
} = require("../src/lib/engine/BattleRules.ts");

const {
  NpcStrategy: N,
} = require("../src/lib/engine/NpcStrategy.ts");

const {
  COUNTRY_CATALOGUE: pool,
} = require("../src/data/country-catalogue.ts");

if (previous) {
  require.extensions[".ts"] = previous;
} else {
  delete require.extensions[".ts"];
}

const random = max => max - 1;

function setup() {
  return E.create(
    {
      id: "test",
      playerId: "owner",
      selectedCountryId: "in",
      countryPool: pool,
      difficulty: "normal",
    },
    random,
    0,
  );
}

function apply(
  state,
  action,
  rng = random,
) {
  return E.apply(
    state,
    E.currentActor(state),
    action,
    rng,
    1,
  ).state;
}

function board() {
  const state = setup();

  state.turnIndex =
    state.turnOrder.indexOf("human");

  state.countries[0].soldiers = 10;
  state.countries[1].soldiers = 2;

  return state;
}

function attack(state) {
  return apply(state, {
    type: "start-attack",
    fromId: state.countries[0].id,
    toId: state.countries[1].id,
  });
}

function rolls(values) {
  let index = 0;
  return () => values[index++];
}

test(
  "all population boundaries and ten-country creation",
  () => {
    [
      5e6, 10e6, 25e6, 50e6,
      75e6, 100e6, 125e6, 150e6,
    ].forEach((value, index) => {
      assert.equal(
        B.soldiersFromPopulation(value),
        index + 1,
      );

      assert.equal(
        B.soldiersFromPopulation(value + 1),
        index + 2,
      );
    });

    const state = setup();

    assert.equal(state.countries.length, 10);

    assert.equal(
      new Set(
        state.countries.map(country => country.id),
      ).size,
      10,
    );

    assert.equal(state.turnOrder.length, 10);

    state.countries.forEach(country => {
      assert.equal(
        country.soldiers,
        B.soldiersFromPopulation(country.population),
      );
    });
  },
);

test(
  "PDF dice counts, original pair order and no-loss ties",
  () => {
    assert.equal(B.diceCount(10, 2), 2);
    assert.equal(B.diceCount(3, 5), 2);
    assert.equal(B.diceCount(2, 5), 1);
    assert.equal(B.diceCount(20, 12), 12);

    const result = B.resolveExchange(
      10, 2, [1, 4], [2, 3],
    );

    assert.equal(result.attackerRemaining, 9);
    assert.equal(result.defenderRemaining, 1);

    const tie = B.resolveExchange(
      3, 2, [5, 5], [5, 5],
    );

    assert.equal(
      tie.attackerLosses + tie.defenderLosses,
      0,
    );
  },
);

test(
  "one locked attack permits repeated exchanges but no new target or transfer",
  () => {
    const state = attack(board());

    const next = apply(
      state,
      { type: "roll" },
      rolls([0, 3, 1, 2]),
    );

    assert.equal(
      next.activeAttack.exchangeNumber,
      1,
    );

    assert(next.attackUsed);
    assert.equal(next.turnIndex, state.turnIndex);

    assert.throws(() => apply(next, {
      type: "start-attack",
      fromId: next.countries[0].id,
      toId: next.countries[2].id,
    }));

    assert.throws(() => apply(next, {
      type: "transfer",
      fromId: next.countries[0].id,
      toId: next.countries[1].id,
      amount: 1,
    }));

    assert.equal(
      state.countries[0].soldiers,
      10,
    );
  },
);

test(
  "conquest rewards use original value and second attack remains blocked",
  () => {
    const next = apply(
      attack(board()),
      { type: "roll" },
      rolls([5, 5, 0, 0]),
    );

    assert.equal(
      next.countries[1].ownerId,
      "human",
    );

    assert.equal(
      next.countries[1].soldiers,

      B.conquestReward(
        next.countries[1].baseSoldiers,
      ),
    );

    assert.equal(next.activeAttack, null);

    assert.throws(() => apply(next, {
      type: "start-attack",
      fromId: next.countries[0].id,
      toId: next.countries[2].id,
    }));
  },
);

test(
  "transfers preserve one soldier and require ownership",
  () => {
    const next = apply(
      attack(board()),
      { type: "roll" },
      rolls([5, 5, 0, 0]),
    );

    const transferred = apply(next, {
      type: "transfer",
      fromId: next.countries[0].id,
      toId: next.countries[1].id,
      amount: 9,
    });

    assert.equal(
      transferred.countries[0].soldiers,
      1,
    );

    assert.throws(() => apply(next, {
      type: "transfer",
      fromId: next.countries[0].id,
      toId: next.countries[1].id,
      amount: 10,
    }));

    assert.throws(() => apply(next, {
      type: "transfer",
      fromId: next.countries[0].id,
      toId: next.countries[2].id,
      amount: 1,
    }));
  },
);

test(
  "stopping and exhaustion end the turn without losing attacking territory",
  () => {
    let state = board();
    state.countries[0].soldiers = 2;
    state = attack(state);

    const next = apply(
      state,
      { type: "roll" },
      rolls([0, 5]),
    );

    assert.equal(
      next.countries[0].soldiers,
      1,
    );

    assert.equal(
      next.countries[0].ownerId,
      "human",
    );

    assert.notEqual(
      E.currentActor(next),
      "human",
    );

    const stopped = apply(state, {
      type: "stop-attack",
    });

    assert.deepEqual(
      stopped.countries,
      state.countries,
    );

    assert.notEqual(
      E.currentActor(stopped),
      "human",
    );
  },
);

test(
  "round-two reinforcement is exact and cannot be granted twice",
  () => {
    let state = setup();

    for (let index = 0; index < 9; index++) {
      state = apply(state, {
        type: "end-turn",
      });

      assert.equal(
        state.pendingReinforcements,
        0,
      );
    }

    state = apply(state, {
      type: "end-turn",
    });

    assert.equal(state.round, 2);

    assert.equal(
      state.pendingReinforcements,
      2,
    );

    const country = state.countries.find(
      item =>
        item.ownerId === E.currentActor(state),
    );

    assert.throws(() => apply(state, {
      type: "allocate",
      allocations: {
        [country.id]: 1,
      },
    }));

    state = apply(state, {
      type: "allocate",
      allocations: {
        [country.id]: 2,
      },
    });

    assert.equal(
      state.pendingReinforcements,
      0,
    );

    assert.throws(() => apply(state, {
      type: "allocate",
      allocations: {
        [country.id]: 2,
      },
    }));
  },
);

test(
  "elimination skips participants and conquest of all ten wins",
  () => {
    let state = setup();

    const eliminated =
      state.turnOrder[1];

    state.countries
      .filter(
        country =>
          country.ownerId === eliminated,
      )
      .forEach(country => {
        country.ownerId =
          state.turnOrder[0];
      });

    state = apply(state, {
      type: "end-turn",
    });

    assert.notEqual(
      E.currentActor(state),
      eliminated,
    );

    state = board();

    state.countries.forEach(
      (country, index) => {
        if (index !== 1) {
          country.ownerId = "human";
        }
      },
    );

    state.countries[1].soldiers = 1;

    state = apply(
      attack(state),
      { type: "roll" },
      rolls([5, 0]),
    );

    assert.equal(
      state.status,
      "completed",
    );

    assert.equal(
      state.winnerId,
      "human",
    );
  },
);

test(
  "strategic simulations reach victory at all three difficulties",
  () => {
    for (const difficulty of [
      "easy",
      "normal",
      "hard",
    ]) {
      let state = setup();
      state.difficulty = difficulty;

      state.participants.forEach(
        participant => {
          participant.kind = "npc";
        },
      );

      let seed = 123456789;

      const rng = maximum => {
        seed = (
          Math.imul(seed, 1664525) +
          1013904223
        ) >>> 0;

        return Math.floor(
          seed / 4294967296 * maximum,
        );
      };

      for (
        let step = 0;
        step < 15000 &&
        state.status === "active";
        step++
      ) {
        const decision = N.choose(state);

        assert(decision.reason);

        state = apply(
          state,
          decision.action,
          rng,
        );

        state.countries.forEach(
          country => {
            assert(
              Number.isSafeInteger(
                country.soldiers,
              ) &&
              country.soldiers >= 1,
            );
          },
        );
      }

      assert.equal(
        state.status,
        "completed",
        difficulty,
      );
    }
  },
);
`,
);

/*
 * All reads and compatibility checks finish
 * before any project file is written.
 */
for (const [file, text] of changes) {
  const full = path.join(
    root,
    file,
  );

  if (
    fs.existsSync(full) &&
    read(file) === text
  ) {
    continue;
  }

  const backup =
    full +
    ".before-completion.backup";

  if (
    fs.existsSync(full) &&
    !fs.existsSync(backup)
  ) {
    fs.copyFileSync(
      full,
      backup,
    );
  }

  fs.mkdirSync(
    path.dirname(full),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    full,
    text,
    "utf8",
  );

  console.log(
    "Updated " + file,
  );
}

console.log(
  "Completion repair applied. " +
    "Run npm test, npx tsc --noEmit, " +
    "npm run lint, then restart npm run dev.",
);