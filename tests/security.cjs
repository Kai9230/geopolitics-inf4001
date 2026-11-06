/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function load(relative, stubs = {}) {
  const filename = path.resolve(__dirname, "..", relative);
  const loaded = new Module(filename, module);
  const originalRequire = Module.createRequire(filename);
  loaded.require = name => Object.hasOwn(stubs, name) ? stubs[name] : originalRequire(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports;
}

// Each test file runs in its own process; enable TS loading for the pure engines.
require.extensions[".ts"] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename
);
const { CampaignEngine: E } = require("../src/lib/engine/CampaignEngine.ts");
const { NpcStrategy: N } = require("../src/lib/engine/NpcStrategy.ts");
const catalogue = require("../src/data/country-catalogue.ts");
const id = "123e4567-e89b-42d3-a456-426614174000";
const create = { operation: "create", id, selectedCountryId: "za", difficulty: "normal" };

function route(rejectToken = false) {
  const calls = [], tokens = [];
  class CampaignRequestError extends Error {}
  const POST = load("src/app/api/campaigns/route.ts", {
    "next/server": { after: () => {} },
    "../../../lib/ai/BattleCommentary": { BattleCommentary: { publish: async () => {} } },
    "../../../lib/firebase/admin": { getAdminServices: () => ({ adminAuth: {
      verifyIdToken: async (...args) => {
        tokens.push(args);
        if (rejectToken) throw Object.assign(new Error("Verification failed"), {
          code: typeof rejectToken === "string" ? rejectToken : "auth/id-token-revoked",
        });
        return { uid: "verified-owner" };
      },
    } }) },
    "../../../lib/db/CampaignRepository": {
      CampaignRequestError,
      CampaignRepository: {
        create: async input => { calls.push(input); return { id: input.id }; },
        remove: async (...input) => { calls.push(input); },
        execute: async input => { calls.push(input); return { event: { dice: null }, state: {}, cooldownMs: 0 }; },
      },
    },
  }).POST;
  const request = (body, authorization = "Bearer valid-token", contentType = "application/json") => {
    const headers = { "content-type": contentType };
    if (authorization) headers.authorization = authorization;
    return POST(new Request("https://game.test/api/campaigns", {
      method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body),
    }));
  };
  return { request, calls, tokens };
}

test("API rejects missing and revoked authentication before database mutations", async () => {
  const unsigned = route();
  assert.equal((await unsigned.request(create, "")).status, 401);
  assert.equal(unsigned.calls.length, 0);
  const revoked = route(true);
  assert.equal((await revoked.request(create)).status, 401);
  assert.deepEqual(revoked.tokens, [["valid-token", true]]);
  assert.equal(revoked.calls.length, 0);
});

test("API derives ownership from verified identity and rejects supplied ownership", async () => {
  const api = route();
  assert.equal((await api.request({ ...create, playerId: "forged-owner" })).status, 400);
  assert.equal(api.calls.length, 0);
  assert.equal((await api.request(create)).status, 200);
  assert.equal(api.calls[0].playerId, "verified-owner");
  assert.deepEqual(api.tokens.at(-1), ["valid-token", true]);
});

test("API rejects invalid JSON, content types and oversized bodies", async () => {
  const api = route();
  assert.equal((await api.request("{broken")).status, 400);
  assert.equal((await api.request(create, "Bearer valid-token", "text/plain")).status, 415);
  assert.equal((await api.request(" ".repeat(16385))).status, 413);
  assert.equal(api.calls.length, 0);
});

test("API rejects invalid troop amounts, client dice and unknown commands", async () => {
  const api = route();
  for (const amount of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const action = { type: "transfer", fromId: "za", toId: "in", amount };
    assert.equal((await api.request({ operation: "human-action", id, expectedRevision: 0, action })).status, 400);
  }
  for (const action of [{ type: "roll", dice: [6,6] }, { type: "set-winner", winnerId: "human" }]) {
    assert.equal((await api.request({ operation: "human-action", id, expectedRevision: 0, action })).status, 400);
  }
  assert.equal(api.calls.length, 0);
});

function repository() {
  let state = E.create({ id, playerId: "owner", selectedCountryId: "za",
    countryPool: catalogue.COUNTRY_CATALOGUE, difficulty: "normal" }, max => max - 1, 0);
  state.turnIndex = state.turnOrder.indexOf("human");
  const document = { state, nextActionAt: 0 };
  let writes = 0, deleted = false;
  const reference = { collection: () => ({ doc: () => ({}) }) };
  const db = {
    collection: () => ({ doc: () => reference }),
    runTransaction: async callback => callback({
      get: async () => ({ exists: true, data: () => document }),
      update: () => { writes++; }, create: () => { writes++; },
    }),
    recursiveDelete: async () => { deleted = true; },
  };
  const { CampaignRepository: R } = load("src/lib/db/CampaignRepository.ts", {
    "server-only": {}, "../firebase/admin": { getAdminServices: () => ({ adminDb: db }) },
    "../engine/CampaignEngine": { CampaignEngine: E }, "../engine/NpcStrategy": { NpcStrategy: N },
    "../../data/country-catalogue": catalogue,
  });
  return { R, document, writes: () => writes, deleted: () => deleted };
}

test("repository blocks another account's moves and deletion without writes", async () => {
  const { R, writes, deleted } = repository();
  await assert.rejects(() => R.execute({ id, playerId: "intruder", expectedRevision: 0,
    mode: "human", action: { type: "end-turn" } }), error => error.status === 403);
  await assert.rejects(() => R.remove(id, "intruder"), error => error.status === 403);
  assert.equal(writes(), 0);
  assert.equal(deleted(), false);
});

test("repository blocks stale revisions, cooldown bypass and wrong actor modes", async () => {
  const { R, document, writes } = repository();
  const input = { id, playerId: "owner", expectedRevision: 0, mode: "human", action: { type: "end-turn" } };
  await assert.rejects(() => R.execute({ ...input, expectedRevision: 1 }), error => error.status === 409);
  document.nextActionAt = Date.now() + 60000;
  await assert.rejects(() => R.execute(input), error => error.status === 429);
  document.nextActionAt = 0;
  await assert.rejects(() => R.execute({ ...input, mode: "npc" }), error => error.status === 409);
  document.deleting = true;
  await assert.rejects(() => R.execute(input), error => error.status === 409);
  assert.equal(writes(), 0);
});

test("all catalogue choices create ten unique nations with correct armies", () => {
  const pool = catalogue.COUNTRY_CATALOGUE;
  const { BattleRules: B } = require("../src/lib/engine/BattleRules.ts");
  assert(pool.length >= 10);
  assert.equal(new Set(pool.map(c => c.id)).size, pool.length);
  assert(pool.some(c => c.id === "va"));
  for (const selected of pool) {
    const state = E.create({ id, playerId: "owner", selectedCountryId: selected.id,
      countryPool: pool, difficulty: "normal" }, max => max - 1, 0);
    assert.equal(state.countries.length, 10);
    assert.equal(new Set(state.countries.map(c => c.id)).size, 10);
    assert(state.countries.some(c => c.id === selected.id && c.ownerId === "human"));
    for (const c of state.countries) assert.equal(c.soldiers, B.soldiersFromPopulation(c.population));
  }
});

test("API separates expired sessions, revoked sessions and unavailable server credentials", async () => {
  for (const code of ["app/invalid-credential", "auth/invalid-credential", "auth/insufficient-permission", "auth/internal-error"]) {
    const api = route(code);
    const response = await api.request(create);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "AUTH_SERVICE_UNAVAILABLE");
    assert.equal(api.calls.length, 0);
  }
  const api = route("auth/id-token-expired");
  const response = await api.request(create);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "SESSION_EXPIRED");
  assert.equal(api.calls.length, 0);
});

test("client refreshes only expired tokens once, and never retries uncertain mutations", async () => {
  const originalFetch = global.fetch;
  try {
    for (const code of ["SESSION_EXPIRED", "SIGN_IN_REQUIRED", "AUTH_SERVICE_UNAVAILABLE"]) {
      const tokens = [], requests = [];
      const auth = { authStateReady: async () => {}, currentUser: {
        uid: "owner", getIdToken: async force => { tokens.push(force); return force ? "fresh" : "cached"; },
      } };
      const { CampaignClient: C } = load("src/lib/api/CampaignClient.ts", {
        "../firebase/config": { auth },
      });
      global.fetch = async (_url, options) => {
        requests.push(options);
        return Response.json({ error: "Rejected", code }, {
          status: code === "AUTH_SERVICE_UNAVAILABLE" ? 503 : 401,
        });
      };
      await assert.rejects(() => C.remove(id));
      assert.deepEqual(tokens, code === "SESSION_EXPIRED" ? [false, true] : [false]);
      assert.equal(requests.length, code === "SESSION_EXPIRED" ? 2 : 1);
      if (requests.length === 2) {
        assert.equal(requests[0].body, requests[1].body);
        assert.equal(requests[1].headers.Authorization, "Bearer fresh");
      }
      requests.length = 0;
      global.fetch = async () => { requests.push(true); throw new TypeError("Network unavailable"); };
      await assert.rejects(() => C.remove(id));
      assert.equal(requests.length, 1);
    }
  } finally { global.fetch = originalFetch; }
});

test("client cannot replay an expired request under a switched account", async () => {
  const originalFetch = global.fetch;
  const auth = { authStateReady: async () => {}, currentUser: {
    uid: "owner", getIdToken: async () => "token",
  } };
  const { CampaignClient: C } = load("src/lib/api/CampaignClient.ts", { "../firebase/config": { auth } });
  let calls = 0;
  try {
    global.fetch = async () => {
      calls++;
      auth.currentUser = { uid: "another-user", getIdToken: async () => "another-token" };
      return Response.json({ code: "SESSION_EXPIRED" }, { status: 401 });
    };
    await assert.rejects(() => C.remove(id), /account changed/);
    assert.equal(calls, 1);
  } finally { global.fetch = originalFetch; }
});
