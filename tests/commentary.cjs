/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");

function fixture() {
  const originalMessage = "India lost 1; Japan lost 2.";
  const event = {
    message: originalMessage, fromId: "in", toId: "jp",
    dice: { attacker: [6, 1, 6], defender: [1, 6, 1], attackerLosses: 1, defenderLosses: 2 },
    afterState: { countries: [{ id: "in", name: "India" }, { id: "jp", name: "Japan" }] },
  };
  let exists = true;
  let writes = 0;
  const db = {
    collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }),
    runTransaction: async callback => callback({
      get: async () => ({ exists, data: () => exists ? structuredClone(event) : undefined }),
      update: (_reference, data) => { assert(exists); Object.assign(event, data); writes++; },
    }),
  };
  const filename = path.resolve(__dirname, "../src/lib/ai/BattleCommentary.ts");
  const loaded = new Module(filename, module);
  loaded.require = name => {
    if (name === "server-only") return {};
    if (name === "../firebase/admin") return { getAdminServices: () => ({ adminDb: db }) };
    return Module.createRequire(filename)(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return { publish: () => loaded.exports.BattleCommentary.publish("game", 1), event,
    originalMessage, deleted: () => { exists = false; }, writes: () => writes };
}

test("saved exchange generates a labelled AI report, keeps its factual outcome and deduplicates requests", async () => {
  const originalFetch = global.fetch, key = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only-not-a-real-key";
  const f = fixture();
  let calls = 0;
  try {
    global.fetch = async (_url, options) => {
      calls++;
      const body = JSON.parse(options.body);
      const facts = JSON.parse(body.messages[1].content);
      assert.equal(facts.attackerLosses, 1);
      assert.equal(facts.defenderLosses, 2);
      return Response.json({ choices: [{ message: { content: "India presses forward as Japan loses two soldiers in the exchange." } }] });
    };
    await f.publish();
    assert.equal(f.event.commentary.source, "groq");
    assert.equal(f.event.commentary.status, "ready");
    assert(f.event.commentary.text.split(/\s+/).length < 25);
    assert.equal(f.event.message, f.originalMessage);
    await f.publish();
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;
  }
});

test("missing keys, provider errors, malformed output and network failures remain labelled fallback", async () => {
  const originalFetch = global.fetch, key = process.env.GROQ_API_KEY;
  try {
    delete process.env.GROQ_API_KEY;
    const missing = fixture();
    global.fetch = async () => { throw new Error("Should not call provider"); };
    await missing.publish();
    assert.equal(missing.event.commentary.reason, "missing-key");
    assert.equal(missing.event.commentary.source, "fallback");
    process.env.GROQ_API_KEY = "test-only-not-a-real-key";
    for (const [fetcher, reason] of [
      [async () => Response.json({}, { status: 429 }), "provider-error"],
      [async () => Response.json({ choices: [{ message: { content: "too short" } }] }), "invalid-response"],
      [async () => { throw new TypeError("Offline"); }, "network-error"],
    ]) {
      const f = fixture(); global.fetch = fetcher;
      await f.publish();
      assert.equal(f.event.commentary.reason, reason);
      assert.equal(f.event.commentary.source, "fallback");
      assert.equal(f.event.message, f.originalMessage);
    }
  } finally {
    global.fetch = originalFetch;
    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;
  }
});

test("deleted exchanges do not get recreated by an in-flight AI response", async () => {
  const originalFetch = global.fetch, key = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only-not-a-real-key";
  const f = fixture();
  try {
    global.fetch = async () => {
      f.deleted();
      return Response.json({ choices: [{ message: { content: "India continues its campaign after the latest exchange." } }] });
    };
    // Real Firestore returns no data for a missing document.
    await f.publish();
    assert.equal(f.writes(), 1);
  } finally {
    global.fetch = originalFetch;
    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;
  }
});
