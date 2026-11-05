/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const root = process.cwd();
const marker = path.join(root, ".geopolitics-performance-installed.json");

if (fs.existsSync(marker)) {
  console.log("Performance update already installed.");
  process.exit(0);
}

if (!fs.existsSync(path.join(root,"src/lib/engine/ReplayRules.ts"))) {
  throw new Error("Install V3 first, then run this from your geopolitics folder.");
}

const staged = new Map();

function read(file) {
  return staged.has(file)
    ? staged.get(file)
    : fs.readFileSync(path.join(root,file),"utf8").replace(/\r\n/g,"\n");
}

function change(file,before,after) {
  const source = read(file);
  if (source.split(before).length !== 2) {
    throw new Error("Version mismatch in " + file + ". No files changed.");
  }
  staged.set(file,source.replace(before,()=>after));
}

function between(file,start,end,content) {
  const source=read(file), a=source.indexOf(start), b=source.indexOf(end,a);
  if(a<0 || b<a) {
    throw new Error("Version mismatch in " + file + ". No files changed.");
  }
  staged.set(file,source.slice(0,a)+content+source.slice(b));
}

function replaceAfter(file,start,before,after) {
  const source=read(file), index=source.indexOf(start);
  if(index<0 || !source.slice(index).includes(before)) {
    throw new Error("Version mismatch in " + file + ". No files changed.");
  }
  staged.set(
    file,
    source.slice(0,index)+source.slice(index).split(before).join(after)
  );
}

function write(file,content) { staged.set(file,content); }
function append(file,content) { staged.set(file,read(file)+content); }

write(`src/lib/engine/CampaignPresentation.ts`, `import type { CampaignState } from "../../types/game-state";
import type { RecordedEvent } from "./ReplayRules";

export type PresentedEvent = RecordedEvent;
export type CampaignModel = {
  live: CampaignState | null;
  events: PresentedEvent[];
  cursor: number | null;
  playing: PresentedEvent | null;
};

export type CampaignUpdate =
  | { type: "live"; state: CampaignState }
  | { type: "events"; events: PresentedEvent[] }
  | { type: "confirmed"; state: CampaignState; event: PresentedEvent }
  | { type: "finish"; revision: number };

export const initialCampaignModel: CampaignModel = {
  live: null, events: [], cursor: null, playing: null,
};

function merge(current: PresentedEvent[], incoming: PresentedEvent[]) {
  const events = new Map(current.map(event => [event.revision, event]));
  for (const event of incoming) {
    const previous = events.get(event.revision);
    events.set(event.revision, {
      ...previous,
      ...event,
      commentary: event.commentary ?? previous?.commentary,
    });
  }
  return [...events.values()].sort((a,b) => a.revision - b.revision);
}

function queue(model: CampaignModel): CampaignModel {
  if (model.cursor === null || model.playing) return model;
  let cursor = model.cursor;

  for (const event of model.events) {
    if (event.revision <= cursor) continue;
    if (event.dice && event.fromId && event.toId) {
      return { ...model, cursor, playing: event };
    }
    cursor = event.revision;
  }

  return { ...model, cursor };
}

export function campaignReducer(
  model: CampaignModel,
  action: CampaignUpdate
): CampaignModel {
  if (action.type === "confirmed") {
    const live = model.live && model.live.revision > action.state.revision
      ? model.live
      : action.state;

    return queue({
      ...model,
      live,
      events: merge(model.events, [action.event]),
    });
  }

  if (action.type === "live") {
    if (model.live && action.state.revision < model.live.revision) return model;
    return queue({ ...model, live: action.state });
  }

  if (action.type === "events") {
    const events = merge(model.events, action.events);
    return queue({
      ...model,
      events,
      cursor: model.cursor ?? events.at(-1)?.revision ?? null,
    });
  }

  if (model.playing?.revision !== action.revision) return model;
  return queue({ ...model, playing: null, cursor: action.revision });
}

export function createdCampaignModel(
  state: CampaignState | null
): CampaignModel {
  if (!state || state.revision !== 0) return initialCampaignModel;

  return {
    live: state,
    cursor: 0,
    playing: null,
    events: [{
      revision: 0,
      actorId: "system",
      action: "setup",
      message: "Campaign created.",
      createdAt: state.createdAt,
      dice: null,
      afterState: state,
    }],
  };
}
`);

between(
  `src/components/CampaignExperience.tsx`,
  `type Event = Omit<`,
  `function countries(`,
  `import {
  campaignReducer as reducer,
  initialCampaignModel as initial,
  type PresentedEvent as Event,
} from "@/lib/engine/CampaignPresentation";

`
);

change(`src/components/CampaignExperience.tsx`, `  CampaignEvent,
`, ``);

change(
  `src/components/CampaignExperience.tsx`,
  `nextRequestAt.current = Date.now() + 320;`,
  `nextRequestAt.current = Date.now() + (result.cooldownMs ?? 320);`
);

change(
  `src/components/CampaignExperience.tsx`,
  `            type: "live",
            state: result.state,`,
  `            type: "confirmed",
            state: result.state,
            event: { ...result.event, afterState: result.state },`
);

change(
  `src/lib/api/CampaignClient.ts`,
  `export class CampaignApiError extends Error {`,
  `export type CampaignResponse = {
  state: CampaignState;
  event: CampaignEvent & {
    reason?: string | null;
    fromId?: string | null;
    toId?: string | null;
  };
  cooldownMs?: number;
};

export class CampaignApiError extends Error {`
);

change(
  `src/lib/api/CampaignClient.ts`,
  `    action: CampaignAction,
  ): Promise<{
    state: CampaignState;
    event: CampaignEvent;
  }>`,
  `    action: CampaignAction,
  ): Promise<CampaignResponse>`
);

change(
  `src/lib/api/CampaignClient.ts`,
  `  static advanceNpc(
    state: CampaignState,
  ): Promise<{
    state: CampaignState;
    event: CampaignEvent;
  }>`,
  `  static advanceNpc(
    state: CampaignState,
  ): Promise<CampaignResponse>`
);

between(
  `src/lib/db/CampaignRepository.ts`,
  `  static async create(input:`,
  `  static async execute(input:`,
  `  static async create(input: {
    id: string;
    playerId: string;
    selectedCountryId: string;
    difficulty: Difficulty;
  }): Promise<CampaignState> {
    const { adminDb } = getAdminServices();
    const reference = adminDb.collection("campaigns").doc(input.id);

    const state = CampaignEngine.create({
      ...input,
      countryPool: COUNTRY_CATALOGUE,
    }, this.randomInteger, Date.now());

    const batch = adminDb.batch();

    batch.create(reference, {
      state,
      lastEvent: null,
      nextActionAt: 0,
      populationSource: POPULATION_SOURCE,
    });

    batch.create(reference.collection("events").doc("0"), {
      revision: 0,
      actorId: "system",
      action: "setup",
      message: "Campaign created.",
      createdAt: state.createdAt,
      dice: null,
      reason: null,
      fromId: null,
      toId: null,
      afterState: state,
    });

    try {
      // Preconditions protect both documents; either both are created or neither is.
      await batch.commit();
      return state;
    } catch (failure) {
      const code =
        typeof failure === "object" &&
        failure !== null &&
        "code" in failure
          ? failure.code
          : undefined;

      if (
        code !== 6 &&
        code !== "already-exists" &&
        code !== "ALREADY_EXISTS"
      ) {
        throw failure;
      }

      // Duplicate/retried requests return only the same owner's existing game.
      const snapshot = await reference.get();
      const existing = snapshot.data();

      if (
        !snapshot.exists ||
        existing?.deleting ||
        existing?.state?.playerId !== input.playerId
      ) {
        throw new CampaignRequestError(
          "This campaign ID is unavailable or being deleted.",
          409,
        );
      }

      return existing.state as CampaignState;
    }
  }

`
);

change(
  `src/lib/db/CampaignRepository.ts`,
  `    event: SavedCampaignEvent;
  }>`,
  `    event: SavedCampaignEvent;
    cooldownMs: number;
  }>`
);

change(
  `src/lib/db/CampaignRepository.ts`,
  `    return adminDb.runTransaction(
      async (transaction) => {
        const snapshot =`,
  `    const committed = await adminDb.runTransaction(
      async (transaction) => {
        const snapshot =`
);

change(
  `src/lib/db/CampaignRepository.ts`,
  `      },
    );
  }
}`,
  `      },
    );

    return {
      ...committed,
      cooldownMs: Math.max(0, committed.state.updatedAt + 300 - Date.now()),
    };
  }
}`
);

change(
  `src/app/lobby/page.tsx`,
  `    try {
      await CampaignClient.create({`,
  `    try {
      router.prefetch(\`/game/\${attempt.id}\`);
      await CampaignClient.create({`
);

change(
  `src/app/api/campaigns/route.ts`,
  `  status = 200,
): Response {`,
  `  status = 200,
  timing?: string,
): Response {`
);

change(
  `src/app/api/campaigns/route.ts`,
  `      "Cache-Control": "no-store",`,
  `      "Cache-Control": "no-store",
      ...(timing ? { "Server-Timing": timing } : {}),`
);

change(
  `src/app/api/campaigns/route.ts`,
  `): Promise<Response> {
  try {`,
  `): Promise<Response> {
  const started = performance.now();
  let authMs = 0, databaseMs = 0;

  const respond = (body: unknown, status = 200) => json(
    body,
    status,
    \`auth;dur=\${authMs.toFixed(1)}, database;dur=\${databaseMs.toFixed(1)}, total;dur=\${(performance.now()-started).toFixed(1)}\`
  );

  async function database<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const begin = performance.now();
    try {
      return await operation();
    } finally {
      databaseMs += performance.now() - begin;
    }
  }

  try {`
);

change(
  `src/app/api/campaigns/route.ts`,
  `    let playerId: string;

    try {`,
  `    let playerId: string;
    const authStarted = performance.now();

    try {`
);

change(
  `src/app/api/campaigns/route.ts`,
  `      playerId = decoded.uid;`,
  `      playerId = decoded.uid;
      authMs = performance.now() - authStarted;`
);

replaceAfter(
  `src/app/api/campaigns/route.ts`,
  `export async function POST`,
  `return json(`,
  `return respond(`
);

change(
  `src/app/api/campaigns/route.ts`,
  `      await CampaignRepository.remove(
        input.id,
        playerId,
      );`,
  `      await database(() => CampaignRepository.remove(input.id, playerId));`
);

change(
  `src/app/api/campaigns/route.ts`,
  `await CampaignRepository.create({
          id: input.id,
          playerId,

          selectedCountryId:
            input.selectedCountryId,

          difficulty:
            input.difficulty,
        })`,
  `await database(() => CampaignRepository.create({
          id: input.id,
          playerId,

          selectedCountryId:
            input.selectedCountryId,

          difficulty:
            input.difficulty,
        }))`
);

change(
  `src/app/api/campaigns/route.ts`,
  `await CampaignRepository.execute({
          id: input.id,
          playerId,

          expectedRevision:
            input.expectedRevision,

          mode: "npc",
        })`,
  `await database(() => CampaignRepository.execute({
          id: input.id,
          playerId,

          expectedRevision:
            input.expectedRevision,

          mode: "npc",
        }))`
);

change(
  `src/app/api/campaigns/route.ts`,
  `await CampaignRepository.execute({
        id: input.id,
        playerId,

        expectedRevision:
          input.expectedRevision,

        mode: "human",
        action: input.action,
      })`,
  `await database(() => CampaignRepository.execute({
        id: input.id,
        playerId,

        expectedRevision:
          input.expectedRevision,

        mode: "human",
        action: input.action,
      }))`
);

change(
  `tests/specification.cjs`,
  `if (previous) {`,
  `const { campaignReducer: P, initialCampaignModel: I } = require("../src/lib/engine/CampaignPresentation.ts");

if (previous) {`
);

append(`tests/specification.cjs`, `

test("confirmed allocations update immediately and survive older realtime snapshots", () => {
  const state = board();
  const setupEvent = {
    revision: 0, actorId: "system", action: "setup", message: "Setup",
    createdAt: 0, dice: null, afterState: state,
  };

  let model = P(I, { type: "live", state });
  model = P(model, { type: "events", events: [setupEvent] });

  const updated = structuredClone(state);
  updated.revision = 1;
  updated.countries[0].soldiers += 2;

  const event = {
    ...setupEvent, revision: 1, action: "allocate", afterState: updated,
  };

  model = P(model, { type: "confirmed", state: updated, event });
  assert.equal(model.cursor, 1);
  assert.equal(model.live.countries[0].soldiers, 12);

  model = P(model, { type: "events", events: [setupEvent] });
  model = P(model, { type: "live", state });

  assert.equal(model.live.revision, 1);
  assert.equal(model.cursor, 1);
  assert.equal(model.events.length, 2);
});

test("a confirmed battle is animated once even when realtime repeats its event", () => {
  const state = board();

  const start = E.apply(state, "human", {
    type: "start-attack",
    fromId: state.countries[0].id,
    toId: state.countries[1].id,
  }, random, 1);

  let model = P(I, { type: "live", state: start.state });
  model = P(model, {
    type: "events",
    events: [{ ...start.event, afterState: start.state }],
  });

  const roll = E.apply(
    start.state, "human", { type: "roll" }, rolls([5,5,0,0]), 2
  );

  const event = {
    ...roll.event,
    afterState: roll.state,
    fromId: state.countries[0].id,
    toId: state.countries[1].id,
  };

  model = P(model, { type: "confirmed", state: roll.state, event });
  assert.equal(model.playing.revision, 2);
  assert.equal(model.cursor, 1);

  model = P(model, { type: "events", events: [event] });
  assert.equal(model.playing.revision, 2);

  model = P(model, { type: "finish", revision: 2 });
  model = P(model, { type: "events", events: [event] });

  assert.equal(model.playing, null);
  assert.equal(model.cursor, 2);
});

test("atomic campaign creation avoids a read and protects retries and ownership", async () => {
  const Module = require("node:module");
  const filename = require("node:path").resolve(
    __dirname, "../src/lib/db/CampaignRepository.ts"
  );

  const documents = new Map();
  let reads = 0;

  const ref = path => ({
    path,
    collection: name => ({
      doc: id => ref(\`\${path}/\${name}/\${id}\`),
    }),
    get: async () => {
      reads++;
      return {
        exists: documents.has(path),
        data: () => documents.get(path),
      };
    },
  });

  const db = {
    collection: name => ({ doc: id => ref(\`\${name}/\${id}\`) }),
    batch: () => {
      const writes = [];

      return {
        create: (reference, data) => {
          writes.push([reference.path, data]);
        },
        commit: async () => {
          if (writes.some(([path]) => documents.has(path))) {
            throw Object.assign(new Error("Exists"), { code: 6 });
          }

          for (const [path, data] of writes) {
            documents.set(path, structuredClone(data));
          }
        },
      };
    },
  };

  const loaded = new Module(filename, module);

  loaded.require = name => {
    if (name === "server-only") return {};
    if (name === "../firebase/admin") {
      return { getAdminServices: () => ({ adminDb: db }) };
    }
    if (name === "../engine/CampaignEngine") return { CampaignEngine: E };
    if (name === "../engine/NpcStrategy") return { NpcStrategy: N };
    if (name === "../../data/country-catalogue") {
      return { COUNTRY_CATALOGUE: pool, POPULATION_SOURCE: {} };
    }
    return require(name);
  };

  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename
  );

  const Repository = loaded.exports.CampaignRepository;

  const input = {
    id: "batch-test",
    playerId: "owner",
    selectedCountryId: "in",
    difficulty: "normal",
  };

  const created = await Repository.create(input);

  assert.equal(reads, 0);
  assert.equal(documents.size, 2);
  assert(documents.has("campaigns/batch-test/events/0"));

  assert.deepEqual(await Repository.create(input), created);

  await assert.rejects(
    () => Repository.create({ ...input, playerId: "intruder" }),
    /unavailable/
  );

  assert.equal(
    documents.get("campaigns/batch-test").state.playerId,
    "owner"
  );

  documents.get("campaigns/batch-test").deleting = true;

  await assert.rejects(
    () => Repository.create(input),
    /unavailable/
  );

  documents.set("campaigns/event-conflict/events/0", {});

  await assert.rejects(
    () => Repository.create({ ...input, id: "event-conflict" }),
    /unavailable/
  );

  assert.equal(documents.has("campaigns/event-conflict"), false);
});
`);

change(
  `src/lib/api/CampaignClient.ts`,
  `export class CampaignClient {`,
  `export class CampaignClient {
  private static createdCampaign: CampaignState | null = null;

  static createdState(id: string): CampaignState | null {
    const state = this.createdCampaign;

    return (
      state?.id === id &&
      state.revision === 0 &&
      auth.currentUser?.uid === state.playerId
    ) ? structuredClone(state) : null;
  }
`
);

change(
  `src/lib/api/CampaignClient.ts`,
  `  static create(input: {`,
  `  static async create(input: {`
);

change(
  `src/lib/api/CampaignClient.ts`,
  `  }): Promise<{ state: CampaignState }> {
    return this.post({
      operation: "create",
      ...input,
    });
  }`,
  `  }): Promise<{ state: CampaignState }> {
    const result = await this.post<{ state: CampaignState }>({
      operation: "create",
      ...input,
    });

    this.createdCampaign = result.state;
    return result;
  }`
);

change(
  `src/components/CampaignExperience.tsx`,
  `  initialCampaignModel as initial,`,
  `  createdCampaignModel,`
);

change(
  `src/components/CampaignExperience.tsx`,
  `    useReducer(reducer, initial);`,
  `    useReducer(
      reducer,
      gameId,
      id => createdCampaignModel(CampaignClient.createdState(id))
    );`
);

change(
  `tests/specification.cjs`,
  `initialCampaignModel: I } = require`,
  `initialCampaignModel: I, createdCampaignModel: seedModel } = require`
);

append(`tests/specification.cjs`, `

test("new campaign presentation starts from its confirmed setup without seeding old games", () => {
  const state = setup();
  const model = seedModel(state);

  assert.equal(model.cursor, 0);
  assert.equal(model.live, state);
  assert.equal(model.events[0].action, "setup");
  assert.equal(model.events[0].afterState, state);

  assert.equal(seedModel(null), I);
  assert.equal(seedModel({ ...state, revision: 9 }), I);
});
`);

// Avoid indexing large snapshots and animation data that the app never queries.
const indexFile = "firestore.indexes.json";
const indexes = JSON.parse(read(indexFile));

indexes.fieldOverrides ??= [];

for (const [collectionGroup, fieldPath] of [
  ["events","afterState"],
  ["events","dice"],
  ["events","commentary"],
  ["campaigns","lastEvent"],
  ["campaigns","state.countries"],
  ["campaigns","state.participants"],
  ["campaigns","state.turnOrder"],
  ["campaigns","state.treaties"],
  ["campaigns","state.activeAttack"],
]) {
  if (!indexes.fieldOverrides.some(entry =>
    entry.collectionGroup === collectionGroup &&
    entry.fieldPath === fieldPath
  )) {
    indexes.fieldOverrides.push({
      collectionGroup,
      fieldPath,
      indexes: [],
    });
  }
}

write(indexFile, JSON.stringify(indexes,null,2) + "\n");

// All replacements were validated before writing.
// Back up outside the project.
const backup=path.join(
  path.dirname(root),
  path.basename(root)+"-performance-backup-"+Date.now()
);

for(const [file] of staged) {
  const source=path.join(root,file);

  if(fs.existsSync(source)) {
    const destination=path.join(backup,file);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.copyFileSync(source,destination);
  }
}

for(const [file,content] of staged) {
  const destination=path.join(root,file);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,content);
  console.log("Updated "+file);
}

fs.writeFileSync(
  marker,
  JSON.stringify({backup,files:[...staged.keys()]},null,2)
);

console.log("Performance update installed. Backup: "+backup);
console.log(
  "Run npm test, npx tsc --noEmit, npm run lint, npm run build, then npm start."
);