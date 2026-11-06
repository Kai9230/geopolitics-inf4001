import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();

if (!fs.existsSync(path.join(root, "package.json"))) {
  throw new Error(
    "Run this file beside package.json in your geopolitics folder."
  );
}

const hash = text =>
  createHash("sha256")
    .update(text.replaceAll("\r\n", "\n"))
    .digest("hex");

const patches = [
  {
    "file": "package.json",
    "before": "027029a91217217995aba39963f00e46a3f6024bd02f277085d20439a4037a49",
    "after": "9f8863d7ce445cf36567fc975d811393a3cc8a625b192ee750eff29f68863057",
    "edits": [
      {
        "start": 9,
        "end": 10,
        "lines": [
          "    \"test\": \"node --test tests/*.cjs\"\n"
        ]
      }
    ]
  },
  {
    "file": "src/components/CampaignCorrespondent.tsx",
    "before": "a5dcb927162bd8f83e5bf60d6502eb953ae628b5ff0d2698dbf7afb4cbd32a58",
    "after": "b28e43338be95b81e2eae104e558d5faaaac9ce2b26d0f21c4111d7befec23da",
    "edits": [
      {
        "start": 2,
        "end": 21,
        "lines": [
          "import type { PresentedEvent } from \"@/lib/engine/CampaignPresentation\";\n"
        ]
      },
      {
        "start": 23,
        "end": 55,
        "lines": [
          "export default function CampaignCorrespondent({ event, replay }: {\n",
          "  event: PresentedEvent | null;\n",
          "  replay: boolean;\n",
          "}) {\n",
          "  const report = event?.commentary;\n",
          "  const ai = report?.source === \"groq\" && report.status === \"ready\";\n",
          "  const pending = !!event?.dice && (!report || report.status === \"pending\");\n",
          "  const label = ai ? \"AI war correspondent\" : pending ? \"Preparing AI report\" : \"Battle report\";\n"
        ]
      },
      {
        "start": 57,
        "end": 61,
        "lines": [
          "    <aside className={styles.correspondentDock}\n",
          "      aria-label={replay ? \"Recorded war correspondent\" : \"Live war correspondent\"}\n",
          "      data-live-correspondent={!replay}>\n",
          "      <p className={styles.correspondentLabel}>\n",
          "        <span className={styles.correspondentDot} aria-hidden=\"true\" />\n",
          "        {replay ? \"Recorded frequency\" : \"Live frequency\"} · {label}\n",
          "      </p>\n",
          "      <p className={styles.correspondentText} aria-live=\"polite\">\n",
          "        {report?.text || event?.message || \"Command is standing by. Select a target when your turn begins.\"}\n",
          "      </p>\n",
          "      {event?.dice && (\n",
          "        <p className={styles.correspondentMeta}>\n",
          "          Saved event #{event.revision} · Attacker losses {event.dice.attackerLosses}\n",
          "          {\" · \"}Defender losses {event.dice.defenderLosses}\n",
          "        </p>\n",
          "      )}\n",
          "      {report?.status === \"fallback\" && (\n",
          "        <p className={styles.correspondentMeta}>\n",
          "          AI unavailable for this exchange · Factual battle report\n",
          "        </p>\n",
          "      )}\n",
          "    </aside>\n"
        ]
      },
      {
        "start": 63,
        "end": 234,
        "lines": []
      }
    ]
  },
  {
    "file": "src/components/CampaignExperience.tsx",
    "before": "c6b8067e826f601f3dc25d00f60c028f957aa661c265c46350a79ecc2ccf185e",
    "after": "a56979b7d85024851d3c552f11c9a5b5f18d401d707098b65a874a5b4d7ec8f9",
    "edits": [
      {
        "start": 36,
        "end": 36,
        "lines": [
          "import ShareCampaignButton from \"./game/ShareCampaignButton\";\n",
          "import CampaignCorrespondent from \"./CampaignCorrespondent\";\n"
        ]
      },
      {
        "start": 786,
        "end": 786,
        "lines": [
          "  const reportEvent = history !== null\n",
          "    ? recorded ?? null\n",
          "    : shown\n",
          "      ? model.events.find(event => event.revision === shown.revision) ?? shown\n",
          "      : model.events.filter(event => event.dice && event.revision <= (model.cursor ?? -1)).at(-1) ?? null;\n",
          "\n"
        ]
      },
      {
        "start": 845,
        "end": 862,
        "lines": [
          "          <ShareCampaignButton />\n"
        ]
      },
      {
        "start": 1562,
        "end": 1562,
        "lines": [
          "      <CampaignCorrespondent event={reportEvent} replay={history !== null} />\n"
        ]
      },
      {
        "start": 1594,
        "end": 1594,
        "lines": [
          "        if (!enabled || total !== state.pendingReinforcements ||\n",
          "            Object.values(values).some(amount => !Number.isSafeInteger(amount) || amount < 0)) return;\n"
        ]
      },
      {
        "start": 1668,
        "end": 1668,
        "lines": [
          "          if (!enabled || !source || from === to || !own.some(country => country.id === to) ||\n",
          "              !Number.isSafeInteger(amount) || amount < 1 || amount >= source.soldiers) return;\n"
        ]
      }
    ]
  },
  {
    "file": "src/app/layout.tsx",
    "before": "b856e1c71851fcbdc0f854bdb0fa4f7d49be44044f3e09bd237dca23ce11018e",
    "after": "3ac892e89de3c88491ce0b5cb1ca1e38de121a635264bd1585e337a37d63809d",
    "edits": [
      {
        "start": 10,
        "end": 11,
        "lines": []
      },
      {
        "start": 50,
        "end": 51,
        "lines": []
      }
    ]
  },
  {
    "file": "src/components/game/CampaignExperience.module.css",
    "before": "7eb55938b7f63e213b6091270c8885748fd2e9f1966c27acad9474baabdafd92",
    "after": "2d8d233557a0c05c5a5ea6b7706d1ced73fbf328f5377b5d455269bd66fcb411",
    "edits": [
      {
        "start": 613,
        "end": 613,
        "lines": [
          "\n",
          "/* Share confirmation stays beside the control, including on small screens. */\n",
          ".shareControl { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; max-width: 100%; }\n",
          ".shareStatus { color: #b6ebd7; font-size: 12px; }\n",
          ".shareControl input { min-width: 0; width: min(80vw, 320px); padding: 10px; color: #e7eef8;\n",
          "  background: #07111d; border: 1px solid #67809e66; border-radius: 8px; }\n"
        ]
      }
    ]
  },
  {
    "file": "src/app/api/campaigns/route.ts",
    "before": "5e8ee63f097adc0e5ba80e191ca30723095f2bcccfd094c035b7abe09b253a47433",
    "after": "97e8bf49a17992447914672d0d049ebfba833632e95a22029c46ee5b91abcfc4",
    "edits": [
      {
        "start": 454,
        "end": 902,
        "lines": []
      }
    ]
  },
  {
    "file": "src/lib/api/CampaignClient.ts",
    "before": "89ea2aaece86568f48b5d7b4177254f86e6d34ab42a2a8379f408ad4abc96d1e",
    "after": "096a26c166e26d04aaa86b7084148cf933e06a2fbc54cd768f1dcee7dda7f2f5",
    "edits": [
      {
        "start": 25,
        "end": 25,
        "lines": [
          "    public readonly code?: string,\n"
        ]
      },
      {
        "start": 55,
        "end": 55,
        "lines": [
          "    refreshed = false,\n",
          "    expectedUid?: string,\n"
        ]
      },
      {
        "start": 56,
        "end": 56,
        "lines": [
          "    await auth.authStateReady();\n"
        ]
      },
      {
        "start": 65,
        "end": 66,
        "lines": [
          "    if (expectedUid && user.uid !== expectedUid) {\n",
          "      throw new CampaignApiError(\"Your account changed. Sign in again.\", 401);\n",
          "    }\n",
          "    const token = await user.getIdToken(refreshed);\n",
          "    if (auth.currentUser?.uid !== user.uid) {\n",
          "      throw new CampaignApiError(\"Your account changed. Sign in again.\", 401);\n",
          "    }\n"
        ]
      },
      {
        "start": 84,
        "end": 84,
        "lines": [
          "    // Only expiration is rejected before any mutation, so only this is safe to retry.\n",
          "    if (response.status === 401 && data.code === \"SESSION_EXPIRED\" && !refreshed) {\n",
          "      if (auth.currentUser?.uid !== user.uid) {\n",
          "        throw new CampaignApiError(\"Your account changed. Sign in again.\", 401);\n",
          "      }\n",
          "      return this.post<T>(body, true, user.uid);\n",
          "    }\n",
          "\n"
        ]
      },
      {
        "start": 90,
        "end": 90,
        "lines": [
          "        typeof data.code === \"string\" ? data.code : undefined,\n"
        ]
      }
    ]
  },
  {
    "file": "src/lib/ai/BattleCommentary.ts",
    "before": "7b0f0ca0bc3514c8320c5816dbb23cf291c81d4ab996c28782261a56f68d4dcc",
    "after": "d1783fe86aec1577b618f1558baf8636bca968d2994418298615a5585e85e9b4",
    "edits": [
      {
        "start": 374,
        "end": 389,
        "lines": [
          "        // Keep the authoritative outcome separate from the generated narrative.\n",
          "        transaction.update(reference, { commentary: report });\n"
        ]
      }
    ]
  },
  {
    "file": "scripts/check-services.mjs",
    "before": null,
    "after": "c49428e2316f56e5c1dd577605923bb29c6e7038dc1f6a24fb6f2e00608112eb",
    "edits": [
      {
        "start": 0,
        "end": 0,
        "lines": [
          "// Read-only diagnostics. Never prints keys, tokens, email addresses or provider messages.\n",
          "import fs from \"node:fs\";\n",
          "import { createPrivateKey } from \"node:crypto\";\n",
          "import { cert, initializeApp, deleteApp } from \"firebase-admin/app\";\n",
          "import { getAuth } from \"firebase-admin/auth\";\n",
          "import { getFirestore } from \"firebase-admin/firestore\";\n",
          "\n",
          "if (fs.existsSync(\".env.local\")) process.loadEnvFile(\".env.local\");\n",
          "const required = [\"FIREBASE_PROJECT_ID\", \"FIREBASE_CLIENT_EMAIL\", \"FIREBASE_PRIVATE_KEY\"];\n",
          "const missing = required.filter(name => !process.env[name]?.trim());\n",
          "if (missing.length) {\n",
          "  console.error(\"Missing server settings:\", missing.join(\", \"));\n",
          "  process.exitCode = 1;\n",
          "} else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&\n",
          "    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== process.env.FIREBASE_PROJECT_ID) {\n",
          "  console.error(\"FAIL: browser and server Firebase project IDs differ.\");\n",
          "  process.exitCode = 1;\n",
          "} else {\n",
          "  let app;\n",
          "  let stage = \"private-key-format\";\n",
          "  try {\n",
          "    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, \"\\n\");\n",
          "    createPrivateKey(privateKey);\n",
          "    console.log(\"PASS: private key parses locally.\");\n",
          "    app = initializeApp({ credential: cert({\n",
          "      projectId: process.env.FIREBASE_PROJECT_ID,\n",
          "      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,\n",
          "      privateKey,\n",
          "    }) }, \"geopolitics-read-only-check\");\n",
          "    stage = \"server-credential\";\n",
          "    await app.options.credential.getAccessToken();\n",
          "    console.log(\"PASS: Firebase server credential obtains an access token.\");\n",
          "    stage = \"authentication-permission\";\n",
          "    await getAuth(app).listUsers(1);\n",
          "    console.log(\"PASS: Firebase Authentication is reachable with server permissions.\");\n",
          "    stage = \"firestore-connection\";\n",
          "    await getFirestore(app).collection(\"campaigns\").limit(1).get();\n",
          "    console.log(\"PASS: Firestore is reachable. No documents changed.\");\n",
          "  } catch (error) {\n",
          "    const raw = error && typeof error === \"object\" && \"code\" in error ? String(error.code) : \"unknown\";\n",
          "    const code = /^[a-z0-9_/-]{1,90}$/i.test(raw) ? raw : \"unknown\";\n",
          "    console.error(`FAIL: ${stage}; code=${code}`);\n",
          "    console.error(\"Check that the service account belongs to this project and its key is active; also check your connection and computer clock.\");\n",
          "    process.exitCode = 1;\n",
          "  } finally {\n",
          "    if (app) await deleteApp(app);\n",
          "  }\n",
          "}\n",
          "console.log(process.env.GROQ_API_KEY?.trim()\n",
          "  ? \"AI key is present. A real battle showing an AI-labelled report is still required.\"\n",
          "  : \"AI key is missing. Set GROQ_API_KEY on the server for the required LLM commentary.\");\n"
        ]
      }
    ]
  },
  {
    "file": "tests/controls.cjs",
    "before": null,
    "after": "bb5e33fc13f62a77b0e08f422d68c605a2056c94608b63a452fadfc6d1c68e79",
    "edits": [
      {
        "start": 0,
        "end": 0,
        "lines": [
          "/* eslint-disable @typescript-eslint/no-require-imports */\n",
          "const fs = require(\"node:fs\");\n",
          "const path = require(\"node:path\");\n",
          "const Module = require(\"node:module\");\n",
          "const ts = require(\"typescript\");\n",
          "const { test } = require(\"node:test\");\n",
          "const assert = require(\"node:assert/strict\");\n",
          "function load(relative, stubs = {}) {\n",
          "  const filename = path.resolve(__dirname, \"..\", relative);\n",
          "  const loaded = new Module(filename, module), original = Module.createRequire(filename);\n",
          "  loaded.require = name => name.endsWith(\".css\") ? {} : Object.hasOwn(stubs, name) ? stubs[name] : original(name);\n",
          "  loaded._compile(ts.transpileModule(fs.readFileSync(filename, \"utf8\"), {\n",
          "    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,\n",
          "      target: ts.ScriptTarget.ES2022, esModuleInterop: true },\n",
          "  }).outputText, filename);\n",
          "  return loaded.exports.default;\n",
          "}\n",
          "\n",
          "test(\"soldier input removes leading zeros even when the parent number is unchanged\", () => {\n",
          "  const Input = load(\"src/components/game/SoldierInput.tsx\");\n",
          "  const received = [];\n",
          "  const input = Input({ value: 5, min: 1, max: 20, onChange: amount => received.push(amount) });\n",
          "  for (const [raw, displayed, amount] of [[\"005\", \"5\", 5], [\"\", \"\", 0], [\"000\", \"\", 0], [\"0012\", \"12\", 12]]) {\n",
          "    const currentTarget = { value: raw };\n",
          "    input.props.onChange({ currentTarget });\n",
          "    assert.equal(currentTarget.value, displayed);\n",
          "    assert.equal(received.at(-1), amount);\n",
          "  }\n",
          "  const calls = received.length;\n",
          "  for (const raw of [\"-2\", \"1.5\", \"abc\", \"9007199254740992\"]) {\n",
          "    const currentTarget = { value: raw };\n",
          "    input.props.onChange({ currentTarget });\n",
          "    assert.equal(currentTarget.value, \"5\");\n",
          "  }\n",
          "  assert.equal(received.length, calls);\n",
          "});\n",
          "\n",
          "test(\"Share announces successful copying, supports a fallback and offers manual copying on refusal\", async () => {\n",
          "  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, \"navigator\");\n",
          "  const oldWindow = global.window, oldDocument = global.document, oldElement = global.HTMLElement;\n",
          "  try {\n",
          "    for (const mode of [\"clipboard\", \"legacy\", \"denied\"]) {\n",
          "      let cursor = 0, removed = false, copied = \"\";\n",
          "      const slots = [];\n",
          "      const React = {\n",
          "        useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },\n",
          "        useState: initial => {\n",
          "          const i = cursor++; if (!(i in slots)) slots[i] = initial;\n",
          "          return [slots[i], value => { slots[i] = value; }];\n",
          "        },\n",
          "      };\n",
          "      const Share = load(\"src/components/game/ShareCampaignButton.tsx\", { react: React });\n",
          "      const render = () => { cursor = 0; return Share(); };\n",
          "      global.window = { location: { href: \"https://example.test/game/saved-game\" } };\n",
          "      Object.defineProperty(globalThis, \"navigator\", { configurable: true, value: { clipboard: {\n",
          "        writeText: async text => { if (mode !== \"clipboard\") throw new Error(\"Denied\"); copied = text; },\n",
          "      } } });\n",
          "      global.document = {\n",
          "        activeElement: null,\n",
          "        createElement: () => ({ style: {}, select() {}, remove() { removed = true; } }),\n",
          "        body: { appendChild() {} }, execCommand: () => mode === \"legacy\",\n",
          "      };\n",
          "      global.HTMLElement = class {};\n",
          "      render().props.children[0].props.onClick();\n",
          "      await new Promise(setImmediate);\n",
          "      const output = render().props.children;\n",
          "      if (mode === \"denied\") {\n",
          "        assert.equal(output[1].props.children, \"Copy this campaign link:\");\n",
          "        assert.equal(output[2].props.value, global.window.location.href);\n",
          "      } else {\n",
          "        assert.equal(output[0].props.children, \"Link copied ✓\");\n",
          "        assert.equal(output[1].props.children, \"Link copied\");\n",
          "        if (mode === \"clipboard\") assert.equal(copied, global.window.location.href);\n",
          "      }\n",
          "      if (mode !== \"clipboard\") assert(removed);\n",
          "    }\n",
          "  } finally {\n",
          "    if (oldNavigator) Object.defineProperty(globalThis, \"navigator\", oldNavigator);\n",
          "    else delete globalThis.navigator;\n",
          "    for (const [name, value] of [[\"window\", oldWindow], [\"document\", oldDocument], [\"HTMLElement\", oldElement]]) {\n",
          "      if (value === undefined) delete global[name]; else global[name] = value;\n",
          "    }\n",
          "  }\n",
          "});\n",
          "\n",
          "test(\"recorded commentary renders the supplied saved event rather than a live feed\", () => {\n",
          "  const Panel = load(\"src/components/CampaignCorrespondent.tsx\");\n",
          "  const result = Panel({ replay: true, event: { revision: 7, message: \"Saved outcome\", dice: {\n",
          "    attackerLosses: 1, defenderLosses: 2,\n",
          "  }, commentary: { source: \"groq\", status: \"ready\", text: \"Saved AI sentence.\" } } });\n",
          "  assert.equal(result.props[\"aria-label\"], \"Recorded war correspondent\");\n",
          "  assert.equal(result.props[\"data-live-correspondent\"], false);\n",
          "  assert(result.props.children[0].props.children.includes(\"AI war correspondent\"));\n",
          "  assert.equal(result.props.children[1].props.children, \"Saved AI sentence.\");\n",
          "});\n"
        ]
      }
    ]
  },
  {
    "file": "tests/security.cjs",
    "before": null,
    "after": "a5671231af0e65e07b3339bd0ed32216ecb347daef3f5394770f36f593ba35db",
    "edits": [
      {
        "start": 0,
        "end": 0,
        "lines": [
          "/* eslint-disable @typescript-eslint/no-require-imports */\n",
          "const fs = require(\"node:fs\");\n",
          "const path = require(\"node:path\");\n",
          "const Module = require(\"node:module\");\n",
          "const ts = require(\"typescript\");\n",
          "const { test } = require(\"node:test\");\n",
          "const assert = require(\"node:assert/strict\");\n",
          "\n",
          "function load(relative, stubs = {}) {\n",
          "  const filename = path.resolve(__dirname, \"..\", relative);\n",
          "  const loaded = new Module(filename, module);\n",
          "  const originalRequire = Module.createRequire(filename);\n",
          "  loaded.require = name => Object.hasOwn(stubs, name) ? stubs[name] : originalRequire(name);\n",
          "  loaded._compile(ts.transpileModule(fs.readFileSync(filename, \"utf8\"), {\n",
          "    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },\n",
          "  }).outputText, filename);\n",
          "  return loaded.exports;\n",
          "}\n",
          "\n",
          "// Each test file runs in its own process; enable TS loading for the pure engines.\n",
          "require.extensions[\".ts\"] = (module, filename) => module._compile(\n",
          "  ts.transpileModule(fs.readFileSync(filename, \"utf8\"), {\n",
          "    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },\n",
          "  }).outputText, filename\n",
          ");\n",
          "const { CampaignEngine: E } = require(\"../src/lib/engine/CampaignEngine.ts\");\n",
          "const { NpcStrategy: N } = require(\"../src/lib/engine/NpcStrategy.ts\");\n",
          "const catalogue = require(\"../src/data/country-catalogue.ts\");\n",
          "const id = \"123e4567-e89b-42d3-a456-426614174000\";\n",
          "const create = { operation: \"create\", id, selectedCountryId: \"za\", difficulty: \"normal\" };\n",
          "\n",
          "function route(rejectToken = false) {\n",
          "  const calls = [], tokens = [];\n",
          "  class CampaignRequestError extends Error {}\n",
          "  const POST = load(\"src/app/api/campaigns/route.ts\", {\n",
          "    \"next/server\": { after: () => {} },\n",
          "    \"../../../lib/ai/BattleCommentary\": { BattleCommentary: { publish: async () => {} } },\n",
          "    \"../../../lib/firebase/admin\": { getAdminServices: () => ({ adminAuth: {\n",
          "      verifyIdToken: async (...args) => {\n",
          "        tokens.push(args);\n",
          "        if (rejectToken) throw Object.assign(new Error(\"Verification failed\"), {\n",
          "          code: typeof rejectToken === \"string\" ? rejectToken : \"auth/id-token-revoked\",\n",
          "        });\n",
          "        return { uid: \"verified-owner\" };\n",
          "      },\n",
          "    } }) },\n",
          "    \"../../../lib/db/CampaignRepository\": {\n",
          "      CampaignRequestError,\n",
          "      CampaignRepository: {\n",
          "        create: async input => { calls.push(input); return { id: input.id }; },\n",
          "        remove: async (...input) => { calls.push(input); },\n",
          "        execute: async input => { calls.push(input); return { event: { dice: null }, state: {}, cooldownMs: 0 }; },\n",
          "      },\n",
          "    },\n",
          "  }).POST;\n",
          "  const request = (body, authorization = \"Bearer valid-token\", contentType = \"application/json\") => {\n",
          "    const headers = { \"content-type\": contentType };\n",
          "    if (authorization) headers.authorization = authorization;\n",
          "    return POST(new Request(\"https://game.test/api/campaigns\", {\n",
          "      method: \"POST\", headers, body: typeof body === \"string\" ? body : JSON.stringify(body),\n",
          "    }));\n",
          "  };\n",
          "  return { request, calls, tokens };\n",
          "}\n",
          "\n",
          "test(\"API rejects missing and revoked authentication before database mutations\", async () => {\n",
          "  const unsigned = route();\n",
          "  assert.equal((await unsigned.request(create, \"\")).status, 401);\n",
          "  assert.equal(unsigned.calls.length, 0);\n",
          "  const revoked = route(true);\n",
          "  assert.equal((await revoked.request(create)).status, 401);\n",
          "  assert.deepEqual(revoked.tokens, [[\"valid-token\", true]]);\n",
          "  assert.equal(revoked.calls.length, 0);\n",
          "});\n",
          "\n",
          "test(\"API derives ownership from verified identity and rejects supplied ownership\", async () => {\n",
          "  const api = route();\n",
          "  assert.equal((await api.request({ ...create, playerId: \"forged-owner\" })).status, 400);\n",
          "  assert.equal(api.calls.length, 0);\n",
          "  assert.equal((await api.request(create)).status, 200);\n",
          "  assert.equal(api.calls[0].playerId, \"verified-owner\");\n",
          "  assert.deepEqual(api.tokens.at(-1), [\"valid-token\", true]);\n",
          "});\n",
          "\n",
          "test(\"API rejects invalid JSON, content types and oversized bodies\", async () => {\n",
          "  const api = route();\n",
          "  assert.equal((await api.request(\"{broken\")).status, 400);\n",
          "  assert.equal((await api.request(create, \"Bearer valid-token\", \"text/plain\")).status, 415);\n",
          "  assert.equal((await api.request(\" \".repeat(16385))).status, 413);\n",
          "  assert.equal(api.calls.length, 0);\n",
          "});\n",
          "\n",
          "test(\"API rejects invalid troop amounts, client dice and unknown commands\", async () => {\n",
          "  const api = route();\n",
          "  for (const amount of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {\n",
          "    const action = { type: \"transfer\", fromId: \"za\", toId: \"in\", amount };\n",
          "    assert.equal((await api.request({ operation: \"human-action\", id, expectedRevision: 0, action })).status, 400);\n",
          "  }\n",
          "  for (const action of [{ type: \"roll\", dice: [6,6] }, { type: \"set-winner\", winnerId: \"human\" }]) {\n",
          "    assert.equal((await api.request({ operation: \"human-action\", id, expectedRevision: 0, action })).status, 400);\n",
          "  }\n",
          "  assert.equal(api.calls.length, 0);\n",
          "});\n",
          "\n",
          "function repository() {\n",
          "  let state = E.create({ id, playerId: \"owner\", selectedCountryId: \"za\",\n",
          "    countryPool: catalogue.COUNTRY_CATALOGUE, difficulty: \"normal\" }, max => max - 1, 0);\n",
          "  state.turnIndex = state.turnOrder.indexOf(\"human\");\n",
          "  const document = { state, nextActionAt: 0 };\n",
          "  let writes = 0, deleted = false;\n",
          "  const reference = { collection: () => ({ doc: () => ({}) }) };\n",
          "  const db = {\n",
          "    collection: () => ({ doc: () => reference }),\n",
          "    runTransaction: async callback => callback({\n",
          "      get: async () => ({ exists: true, data: () => document }),\n",
          "      update: () => { writes++; }, create: () => { writes++; },\n",
          "    }),\n",
          "    recursiveDelete: async () => { deleted = true; },\n",
          "  };\n",
          "  const { CampaignRepository: R } = load(\"src/lib/db/CampaignRepository.ts\", {\n",
          "    \"server-only\": {}, \"../firebase/admin\": { getAdminServices: () => ({ adminDb: db }) },\n",
          "    \"../engine/CampaignEngine\": { CampaignEngine: E }, \"../engine/NpcStrategy\": { NpcStrategy: N },\n",
          "    \"../../data/country-catalogue\": catalogue,\n",
          "  });\n",
          "  return { R, document, writes: () => writes, deleted: () => deleted };\n",
          "}\n",
          "\n",
          "test(\"repository blocks another account's moves and deletion without writes\", async () => {\n",
          "  const { R, writes, deleted } = repository();\n",
          "  await assert.rejects(() => R.execute({ id, playerId: \"intruder\", expectedRevision: 0,\n",
          "    mode: \"human\", action: { type: \"end-turn\" } }), error => error.status === 403);\n",
          "  await assert.rejects(() => R.remove(id, \"intruder\"), error => error.status === 403);\n",
          "  assert.equal(writes(), 0);\n",
          "  assert.equal(deleted(), false);\n",
          "});\n",
          "\n",
          "test(\"repository blocks stale revisions, cooldown bypass and wrong actor modes\", async () => {\n",
          "  const { R, document, writes } = repository();\n",
          "  const input = { id, playerId: \"owner\", expectedRevision: 0, mode: \"human\", action: { type: \"end-turn\" } };\n",
          "  await assert.rejects(() => R.execute({ ...input, expectedRevision: 1 }), error => error.status === 409);\n",
          "  document.nextActionAt = Date.now() + 60000;\n",
          "  await assert.rejects(() => R.execute(input), error => error.status === 429);\n",
          "  document.nextActionAt = 0;\n",
          "  await assert.rejects(() => R.execute({ ...input, mode: \"npc\" }), error => error.status === 409);\n",
          "  document.deleting = true;\n",
          "  await assert.rejects(() => R.execute(input), error => error.status === 409);\n",
          "  assert.equal(writes(), 0);\n",
          "});\n",
          "\n",
          "test(\"all catalogue choices create ten unique nations with correct armies\", () => {\n",
          "  const pool = catalogue.COUNTRY_CATALOGUE;\n",
          "  const { BattleRules: B } = require(\"../src/lib/engine/BattleRules.ts\");\n",
          "  assert(pool.length >= 10);\n",
          "  assert.equal(new Set(pool.map(c => c.id)).size, pool.length);\n",
          "  assert(pool.some(c => c.id === \"va\"));\n",
          "  for (const selected of pool) {\n",
          "    const state = E.create({ id, playerId: \"owner\", selectedCountryId: selected.id,\n",
          "      countryPool: pool, difficulty: \"normal\" }, max => max - 1, 0);\n",
          "    assert.equal(state.countries.length, 10);\n",
          "    assert.equal(new Set(state.countries.map(c => c.id)).size, 10);\n",
          "    assert(state.countries.some(c => c.id === selected.id && c.ownerId === \"human\"));\n",
          "    for (const c of state.countries) assert.equal(c.soldiers, B.soldiersFromPopulation(c.population));\n",
          "  }\n",
          "});\n",
          "\n",
          "test(\"API separates expired sessions, revoked sessions and unavailable server credentials\", async () => {\n",
          "  for (const code of [\"app/invalid-credential\", \"auth/invalid-credential\", \"auth/insufficient-permission\", \"auth/internal-error\"]) {\n",
          "    const api = route(code);\n",
          "    const response = await api.request(create);\n",
          "    assert.equal(response.status, 503);\n",
          "    assert.equal((await response.json()).code, \"AUTH_SERVICE_UNAVAILABLE\");\n",
          "    assert.equal(api.calls.length, 0);\n",
          "  }\n",
          "  const api = route(\"auth/id-token-expired\");\n",
          "  const response = await api.request(create);\n",
          "  assert.equal(response.status, 401);\n",
          "  assert.equal((await response.json()).code, \"SESSION_EXPIRED\");\n",
          "  assert.equal(api.calls.length, 0);\n",
          "});\n",
          "\n",
          "test(\"client refreshes only expired tokens once, and never retries uncertain mutations\", async () => {\n",
          "  const originalFetch = global.fetch;\n",
          "  try {\n",
          "    for (const code of [\"SESSION_EXPIRED\", \"SIGN_IN_REQUIRED\", \"AUTH_SERVICE_UNAVAILABLE\"]) {\n",
          "      const tokens = [], requests = [];\n",
          "      const auth = { authStateReady: async () => {}, currentUser: {\n",
          "        uid: \"owner\", getIdToken: async force => { tokens.push(force); return force ? \"fresh\" : \"cached\"; },\n",
          "      } };\n",
          "      const { CampaignClient: C } = load(\"src/lib/api/CampaignClient.ts\", {\n",
          "        \"../firebase/config\": { auth },\n",
          "      });\n",
          "      global.fetch = async (_url, options) => {\n",
          "        requests.push(options);\n",
          "        return Response.json({ error: \"Rejected\", code }, {\n",
          "          status: code === \"AUTH_SERVICE_UNAVAILABLE\" ? 503 : 401,\n",
          "        });\n",
          "      };\n",
          "      await assert.rejects(() => C.remove(id));\n",
          "      assert.deepEqual(tokens, code === \"SESSION_EXPIRED\" ? [false, true] : [false]);\n",
          "      assert.equal(requests.length, code === \"SESSION_EXPIRED\" ? 2 : 1);\n",
          "      if (requests.length === 2) {\n",
          "        assert.equal(requests[0].body, requests[1].body);\n",
          "        assert.equal(requests[1].headers.Authorization, \"Bearer fresh\");\n",
          "      }\n",
          "      requests.length = 0;\n",
          "      global.fetch = async () => { requests.push(true); throw new TypeError(\"Network unavailable\"); };\n",
          "      await assert.rejects(() => C.remove(id));\n",
          "      assert.equal(requests.length, 1);\n",
          "    }\n",
          "  } finally { global.fetch = originalFetch; }\n",
          "});\n",
          "\n",
          "test(\"client cannot replay an expired request under a switched account\", async () => {\n",
          "  const originalFetch = global.fetch;\n",
          "  const auth = { authStateReady: async () => {}, currentUser: {\n",
          "    uid: \"owner\", getIdToken: async () => \"token\",\n",
          "  } };\n",
          "  const { CampaignClient: C } = load(\"src/lib/api/CampaignClient.ts\", { \"../firebase/config\": { auth } });\n",
          "  let calls = 0;\n",
          "  try {\n",
          "    global.fetch = async () => {\n",
          "      calls++;\n",
          "      auth.currentUser = { uid: \"another-user\", getIdToken: async () => \"another-token\" };\n",
          "      return Response.json({ code: \"SESSION_EXPIRED\" }, { status: 401 });\n",
          "    };\n",
          "    await assert.rejects(() => C.remove(id), /account changed/);\n",
          "    assert.equal(calls, 1);\n",
          "  } finally { global.fetch = originalFetch; }\n",
          "});\n"
        ]
      }
    ]
  },
  {
    "file": "tests/commentary.cjs",
    "before": null,
    "after": "72ca4acac2d0c2a162d9a7b6354d43703f3ffd0d341ca5a1e1791f5d0ac0ef1f",
    "edits": [
      {
        "start": 0,
        "end": 0,
        "lines": [
          "/* eslint-disable @typescript-eslint/no-require-imports */\n",
          "const fs = require(\"node:fs\");\n",
          "const path = require(\"node:path\");\n",
          "const Module = require(\"node:module\");\n",
          "const ts = require(\"typescript\");\n",
          "const { test } = require(\"node:test\");\n",
          "const assert = require(\"node:assert/strict\");\n",
          "\n",
          "function fixture() {\n",
          "  const originalMessage = \"India lost 1; Japan lost 2.\";\n",
          "  const event = {\n",
          "    message: originalMessage, fromId: \"in\", toId: \"jp\",\n",
          "    dice: { attacker: [6, 1, 6], defender: [1, 6, 1], attackerLosses: 1, defenderLosses: 2 },\n",
          "    afterState: { countries: [{ id: \"in\", name: \"India\" }, { id: \"jp\", name: \"Japan\" }] },\n",
          "  };\n",
          "  let exists = true;\n",
          "  let writes = 0;\n",
          "  const db = {\n",
          "    collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }),\n",
          "    runTransaction: async callback => callback({\n",
          "      get: async () => ({ exists, data: () => exists ? structuredClone(event) : undefined }),\n",
          "      update: (_reference, data) => { assert(exists); Object.assign(event, data); writes++; },\n",
          "    }),\n",
          "  };\n",
          "  const filename = path.resolve(__dirname, \"../src/lib/ai/BattleCommentary.ts\");\n",
          "  const loaded = new Module(filename, module);\n",
          "  loaded.require = name => {\n",
          "    if (name === \"server-only\") return {};\n",
          "    if (name === \"../firebase/admin\") return { getAdminServices: () => ({ adminDb: db }) };\n",
          "    return Module.createRequire(filename)(name);\n",
          "  };\n",
          "  loaded._compile(ts.transpileModule(fs.readFileSync(filename, \"utf8\"), {\n",
          "    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },\n",
          "  }).outputText, filename);\n",
          "  return { publish: () => loaded.exports.BattleCommentary.publish(\"game\", 1), event,\n",
          "    originalMessage, deleted: () => { exists = false; }, writes: () => writes };\n",
          "}\n",
          "\n",
          "test(\"saved exchange generates a labelled AI report, keeps its factual outcome and deduplicates requests\", async () => {\n",
          "  const originalFetch = global.fetch, key = process.env.GROQ_API_KEY;\n",
          "  process.env.GROQ_API_KEY = \"test-only-not-a-real-key\";\n",
          "  const f = fixture();\n",
          "  let calls = 0;\n",
          "  try {\n",
          "    global.fetch = async (_url, options) => {\n",
          "      calls++;\n",
          "      const body = JSON.parse(options.body);\n",
          "      const facts = JSON.parse(body.messages[1].content);\n",
          "      assert.equal(facts.attackerLosses, 1);\n",
          "      assert.equal(facts.defenderLosses, 2);\n",
          "      return Response.json({ choices: [{ message: { content: \"India presses forward as Japan loses two soldiers in the exchange.\" } }] });\n",
          "    };\n",
          "    await f.publish();\n",
          "    assert.equal(f.event.commentary.source, \"groq\");\n",
          "    assert.equal(f.event.commentary.status, \"ready\");\n",
          "    assert(f.event.commentary.text.split(/\\s+/).length < 25);\n",
          "    assert.equal(f.event.message, f.originalMessage);\n",
          "    await f.publish();\n",
          "    assert.equal(calls, 1);\n",
          "  } finally {\n",
          "    global.fetch = originalFetch;\n",
          "    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;\n",
          "  }\n",
          "});\n",
          "\n",
          "test(\"missing keys, provider errors, malformed output and network failures remain labelled fallback\", async () => {\n",
          "  const originalFetch = global.fetch, key = process.env.GROQ_API_KEY;\n",
          "  try {\n",
          "    delete process.env.GROQ_API_KEY;\n",
          "    const missing = fixture();\n",
          "    global.fetch = async () => { throw new Error(\"Should not call provider\"); };\n",
          "    await missing.publish();\n",
          "    assert.equal(missing.event.commentary.reason, \"missing-key\");\n",
          "    assert.equal(missing.event.commentary.source, \"fallback\");\n",
          "    process.env.GROQ_API_KEY = \"test-only-not-a-real-key\";\n",
          "    for (const [fetcher, reason] of [\n",
          "      [async () => Response.json({}, { status: 429 }), \"provider-error\"],\n",
          "      [async () => Response.json({ choices: [{ message: { content: \"too short\" } }] }), \"invalid-response\"],\n",
          "      [async () => { throw new TypeError(\"Offline\"); }, \"network-error\"],\n",
          "    ]) {\n",
          "      const f = fixture(); global.fetch = fetcher;\n",
          "      await f.publish();\n",
          "      assert.equal(f.event.commentary.reason, reason);\n",
          "      assert.equal(f.event.commentary.source, \"fallback\");\n",
          "      assert.equal(f.event.message, f.originalMessage);\n",
          "    }\n",
          "  } finally {\n",
          "    global.fetch = originalFetch;\n",
          "    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;\n",
          "  }\n",
          "});\n",
          "\n",
          "test(\"deleted exchanges do not get recreated by an in-flight AI response\", async () => {\n",
          "  const originalFetch = global.fetch, key = process.env.GROQ_API_KEY;\n",
          "  process.env.GROQ_API_KEY = \"test-only-not-a-real-key\";\n",
          "  const f = fixture();\n",
          "  try {\n",
          "    global.fetch = async () => {\n",
          "      f.deleted();\n",
          "      return Response.json({ choices: [{ message: { content: \"India continues its campaign after the latest exchange.\" } }] });\n",
          "    };\n",
          "    // Real Firestore returns no data for a missing document.\n",
          "    await f.publish();\n",
          "    assert.equal(f.writes(), 1);\n",
          "  } finally {\n",
          "    global.fetch = originalFetch;\n",
          "    if (key === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = key;\n",
          "  }\n",
          "});\n"
        ]
      }
    ]
  },
  {
    "file": "src/components/game/ShareCampaignButton.tsx",
    "before": null,
    "after": "5a842b082a32f51b02d3c2db32da449a6f80f76517f23428f55422e44123607f",
    "edits": [
      {
        "start": 0,
        "end": 0,
        "lines": [
          "\"use client\";\n",
          "\n",
          "import { useRef, useState } from \"react\";\n",
          "import s from \"./CampaignExperience.module.css\";\n",
          "\n",
          "export default function ShareCampaignButton() {\n",
          "  const pending = useRef(false);\n",
          "  const [busy, setBusy] = useState(false);\n",
          "  const [message, setMessage] = useState(\"\");\n",
          "  const [manualLink, setManualLink] = useState(\"\");\n",
          "\n",
          "  async function share() {\n",
          "    if (pending.current) return;\n",
          "    pending.current = true;\n",
          "    setBusy(true);\n",
          "    setMessage(\"\");\n",
          "    setManualLink(\"\");\n",
          "    const link = window.location.href;\n",
          "\n",
          "    try {\n",
          "      await navigator.clipboard.writeText(link);\n",
          "      setMessage(\"Link copied\");\n",
          "    } catch {\n",
          "      // Older browsers may still allow copying from a selected text field.\n",
          "      const field = document.createElement(\"textarea\");\n",
          "      const focused = document.activeElement;\n",
          "      field.value = link;\n",
          "      field.readOnly = true;\n",
          "      field.style.position = \"fixed\";\n",
          "      field.style.opacity = \"0\";\n",
          "      document.body.appendChild(field);\n",
          "      try {\n",
          "        field.select();\n",
          "        if (!document.execCommand(\"copy\")) throw new Error(\"Copy blocked\");\n",
          "        setMessage(\"Link copied\");\n",
          "      } catch {\n",
          "        setManualLink(link);\n",
          "        setMessage(\"Copy this campaign link:\");\n",
          "      } finally {\n",
          "        field.remove();\n",
          "        if (focused instanceof HTMLElement) focused.focus();\n",
          "      }\n",
          "    } finally {\n",
          "      pending.current = false;\n",
          "      setBusy(false);\n",
          "    }\n",
          "  }\n",
          "\n",
          "  return (\n",
          "    <div className={s.shareControl}>\n",
          "      <button type=\"button\" disabled={busy} onClick={() => void share()}>\n",
          "        {busy ? \"Copying…\" : message === \"Link copied\" ? \"Link copied ✓\" : \"Share\"}\n",
          "      </button>\n",
          "      <span className={s.shareStatus} role=\"status\" aria-live=\"polite\" aria-atomic=\"true\">\n",
          "        {message}\n",
          "      </span>\n",
          "      {manualLink && (\n",
          "        <input aria-label=\"Campaign link\" readOnly value={manualLink}\n",
          "          onFocus={event => event.currentTarget.select()} />\n",
          "      )}\n",
          "    </div>\n",
          "  );\n",
          "}\n"
        ]
      }
    ]
  },
  {
    "file": "README.md",
    "before": "dfa70aa4d04ffa11d2152f03cd41102e48212ebb9baf7d067a2db64e11c8bd68",
    "after": "405072a0c80c80709f88fe7610693310e868946b3e06d40220165f40e6aed65c",
    "edits": [
      {
        "start": 82,
        "end": 82,
        "lines": [
          "\n",
          "## Completion pass: 6 November 2026\n",
          "\n",
          "Share gives a visible Link copied confirmation with a manual URL when copying is\n",
          "blocked. Both troop forms use SoldierInput without leading zeros. The commentary\n",
          "dock follows the displayed live/replay event. Outcome text and LLM narrative are\n",
          "stored separately. Expired sessions refresh once; revoked sessions and uncertain\n",
          "mutations do not retry. The test command now runs all test files.\n",
          "\n",
          "If authentication fails, run `node scripts/check-services.mjs` from this folder\n",
          "with Node.js 22+ and your existing .env.local. This checks the private key format,\n",
          "server access token, Authentication permissions and Firestore connection without\n",
          "writing documents. It prints only check results and sanitized error codes.\n",
          "`app/invalid-credential` does not justify deleting collections: check the active\n",
          "service-account key, project alignment, network access and computer clock first.\n",
          "Never share the service-account JSON, token or full environment file.\n",
          "\n",
          "This review passed 35 mocked/pure automated tests, type checking, lint and a\n",
          "production build using placeholder browser settings. It does not certify your\n",
          "live Firebase project, real Groq output, browser appearance or deployment. Follow\n",
          "the full brief/rubric map and live acceptance checklist in REQUIREMENTS-CHECK.md.\n"
        ]
      }
    ]
  },
  {
    "file": "REQUIREMENTS-CHECK.md",
    "before": "b2ec3db38b6b9848e6b0c45c68604b1f747a1e92250b4946dab3c8a8874b7d94",
    "after": "78a53d5cd75173bc934a969ceb1654d08bb5d4fa8d1bcb315063b725dd435141",
    "edits": [
      {
        "start": 0,
        "end": 1,
        "lines": [
          "# GeoPolitics: brief and 56-mark rubric audit\n"
        ]
      },
      {
        "start": 2,
        "end": 4,
        "lines": [
          "Reviewed 6 November 2026 against the supplied UCT INF4001N Geopolitics entrance-exam brief and 2027 marksheet. Baseline: finalise.zip. This is implementation evidence, not an awarded or predicted mark.\n"
        ]
      },
      {
        "start": 5,
        "end": 23,
        "lines": [
          "## Current result\n"
        ]
      },
      {
        "start": 24,
        "end": 25,
        "lines": [
          "- All 35 automated tests pass (rules, simulations, API/repository authorization, guarded token recovery, commentary service, input and clipboard handlers).\n",
          "- TypeScript, ESLint and the production build pass with non-secret placeholder browser configuration.\n",
          "- There are no user Firebase Admin credentials or Groq keys in this review environment. Mocks establish application behaviour, not live provider connectivity.\n",
          "- Browser visual inspection was attempted but the preview could not connect to the workspace server. Desktop/mobile layout and an end-to-end live game are not certified.\n",
          "- No deployment, Firebase rule publication, database deletion, account creation, or assessor invitation was performed.\n"
        ]
      },
      {
        "start": 26,
        "end": 41,
        "lines": [
          "## Required gameplay and access\n"
        ]
      },
      {
        "start": 42,
        "end": 43,
        "lines": [
          "| Requirement | Source evidence and automated coverage | Remaining acceptance evidence |\n",
          "|---|---|---|\n",
          "| Single-player game against nine NPCs; exactly ten distinct countries | CampaignEngine.create; setup and catalogue-choice tests | Create a real campaign |\n",
          "| Player chooses starting country; nine opponents and turn order randomized | Server catalogue and Fisher-Yates shuffle using crypto randomInt | Observe several new campaigns |\n",
          "| Full starting army from the exact nine population brackets | BattleRules.soldiersFromPopulation; every boundary tested; server catalogue | Demonstrate starting values in UI |\n",
          "| Multiple independent saved sessions | Lobby queries by verified UID; atomic creation, persistent campaigns | Create two games, reload and resume each |\n",
          "| One attack per turn or skip; later exchanges stay against one target | CampaignEngine attackUsed/activeAttack guards; repeated-exchange and second-target tests | Demonstrate click flow |\n",
          "| Transfers between owned countries before or after an attack, never during one | Engine ownership/attack guards; conservation and invalid-amount tests | Transfer in UI; verify source retains at least one |\n",
          "| At least two soldiers to attack or continue | BattleRules/CampaignEngine; exhaustion tests | Show failed attack retains its territory |\n",
          "| Each side rolls min(attacker soldiers minus one, defender soldiers) dice | Dice-count tests include 12 pairs; no three-dice cap | Verify all displayed pairs |\n",
          "| Dice paired in original order; high roll wins; ties kill nobody | Exact PDF example and tie tests | Compare visible results with history |\n",
          "| Stop attack ends turn and retains surviving army | stop-attack tests; stop intent waits for an in-flight exchange | Click Stop during an exchange |\n",
          "| Conquest grants max(2, floor(original country soldier value / 2)) | conquestReward uses baseSoldiers; conquest tests | Observe reward and optional subsequent transfer |\n",
          "| Newly owned country can attack on a later turn | attackUsed remains set after conquest | End turn and select it on next turn |\n",
          "| From round two, two reinforcements per owned country; player allocates them | reinforcementTotal and exact-allocation tests; owned-country input form | Allocate across multiple countries |\n",
          "| Eliminated players receive no turns; all ten countries under one owner wins | advanceTurn skips eliminated actors; victory tests; full strategic simulations at easy/normal/hard | Finish a real game; verify victory screen |\n",
          "| All countries and soldier counts visible; no geographical attack restriction | Country cards, RiskMap, engine targets any enemy | Desktop/mobile visual check |\n",
          "| Each battle shows attack, saved dice, casualties and outcome | RollingDice, MiniatureBattle, BattleEffects, authoritative event history | Observe a human battle and an NPC battle |\n",
          "| Real LLM commentary describing unfolding battles | BattleCommentary calls Groq server-side after each saved dice exchange, validates a short sentence, leases to prevent duplicate calls; ready/fallback/error tests | REQUIRED: configure a real key and observe source=groq/status=ready and AI label. Fallback is not evidence of this requirement |\n",
          "| Strategic NPC evaluates allocation, transfer, attack target, continuation and stopping | NpcStrategy scores strength/reward/elimination/treaties; reasons persisted per event; victory simulations | Read reasons at both playback speeds |\n",
          "| Fast-forward speeds NPC moves but still shows gameplay and reasons | Fast controls 1x/2.5x; saved dice animation clock; decisions also in history | Confirm it waits when the human turn begins |\n",
          "| Visitors can view shared links in real time but cannot play for owner | Firestore get/public events, owner-scoped list; all client writes denied; API verifies token including revocation; repository ownership checks tested | REQUIRED: signed-out visitor and separate account against the same live campaign |\n",
          "| Visitors can sign up and start their own game | Firebase email/password login/register and lobby | Register a dedicated demonstration account |\n",
          "| Appropriate web stack and NoSQL database | Next.js/React/TypeScript, Firebase Auth and Firestore | Live online connection |\n",
          "| Deployed application | Node-compatible routes and production build ready | REQUIRED: deployment deferred at user's request |\n"
        ]
      },
      {
        "start": 44,
        "end": 59,
        "lines": [
          "The country catalogue records Worldometer as the population source. The 2026 source page was opened during review; sampled large-country values and South Africa match the catalogue. Stored values are a snapshot so existing games retain stable baseSoldiers.\n"
        ]
      },
      {
        "start": 60,
        "end": 62,
        "lines": [
          "## Exact rubric: fourteen criteria, four marks each\n",
          "\n",
          "These are evidence targets for the assessor. No row is marked 4/4 here because marks depend on the demonstrated system and assessor judgment.\n",
          "\n",
          "| Rubric criterion | Max | Implementation/evidence | Outstanding proof |\n",
          "|---|---:|---|---|\n",
          "| Database layer: separation, configuration, appropriateness, online database | 4 | CampaignRepository; firebase/admin and browser config; Firestore NoSQL; .env.example | Show the correct online Firebase project |\n",
          "| Connection to database | 4 | Server repository, browser realtime snapshots | Real create/reload/resume; resolve any invalid credential error |\n",
          "| Design of database | 4 | campaigns/{uuid} and events/{revision}; state+event atomic transaction; immutable dice, snapshot history, stored population provenance | Show representative saved documents and deployed rules |\n",
          "| Coding structure/framework/best practices | 4 | App Router; typed presentation, client API, engine, repository and provider modules | Explain a command's path from UI to transaction |\n",
          "| Object-oriented concepts: classes and encapsulation | 4 | CampaignEngine, BattleRules, NpcStrategy, CampaignRepository, DiplomacyRules and FlightLedger; private validation/state helpers | Walk through class responsibilities |\n",
          "| Data validation, controls and security | 4 | Strict Zod schemas, body limit, safe integer guards, owner/turn checks, revisions, crypto dice, disabled and guarded forms | Browser invalid-input checks; live rules deny writes |\n",
          "| Functionality | 4 | Core rule tests and three strategic win simulations | Complete a live campaign walkthrough |\n",
          "| Correct operation: lists, searching, filtering, viewing | 4 | Search campaign ID/country/difficulty, filter active/completed, history select/replay, campaign cards | Demonstrate on multiple saved games |\n",
          "| User interface | 4 | Globe login, world board, country cards, dice, miniatures, command controls, source labels, copy confirmation | Desktop/mobile visual review |\n",
          "| Ease of navigation | 4 | Login, war room, field manual, game, replay return-to-live, result links | Keyboard and mobile walkthrough |\n",
          "| Security: authentication and authorization | 4 | Revocation-checked token, derived UID, repository ownership, public read-only spectators; adversarial tests | Owner, other-account and signed-out live checks |\n",
          "| Sophistication/complexity: battle/game engine, AI integration, access control | 4 | Transactional game engine, reasoned NPCs, real-time reconciliation, saved replay, provider leases, diplomacy | Demonstrate these together in running app |\n",
          "| AI application | 4 | Groq generates one short report from saved facts; honest source label and factual fallback | REQUIRED: actual successful provider output |\n",
          "| Overall evidence of effort | 4 | Custom graphics, multiple bonus features, tests, field manual, architecture and audit documents | Working public demo and complete submission |\n",
          "| **Total possible** | **56** | **Implementation evidence is available across all criteria** | **Live and deployment evidence still required** |\n",
          "\n",
          "## Bonus features already implemented\n",
          "\n",
          "The brief asks for one extra feature, without a separate bonus-mark allocation in the supplied marksheet. More features do not automatically add marks.\n",
          "\n",
          "1. Original map/battle animation, miniatures and 3D dice.\n",
          "2. Saved battle and full-game replay.\n",
          "3. Easy/normal/hard NPC strategies.\n",
          "4. Per-campaign battle analytics and per-player multi-campaign totals.\n",
          "5. Server dice, revision checks, persistent attack locks and ownership protection against cheating.\n",
          "6. Temporary alliances, strategic acceptance/rejection, betrayal and reputation.\n",
          "7. Shared real-time spectator view (also explicitly required by the access-control section).\n",
          "\n",
          "NPC decisions use deterministic strategy, not an LLM. That is valid for the required NPC behaviour. The mandatory LLM use is battle commentary; do not claim the optional LLM-controlled NPC bonus.\n",
          "\n",
          "## Changes made in this completion pass\n",
          "\n",
          "- Share now shows `Link copied` beside the button and `Link copied ✓` on it only after a successful clipboard operation. A selected-text fallback supports older browsers; otherwise a manually selectable URL appears.\n",
          "- SoldierInput remains wired into allocation and transfer. Leading zeros are normalized; the same numeric value still updates the displayed text. Submit handlers also reject invalid commands before sending them.\n",
          "- Commentary now follows the displayed live or replay event rather than an independent latest-live listener. Late reports update the event shown; replay remains labelled Recorded frequency.\n",
          "- Generated narrative is stored separately from the authoritative outcome instead of appending duplicate text to message.\n",
          "- Client waits for Firebase auth readiness and refreshes only SESSION_EXPIRED once for the same account. Revoked sessions, provider failures and uncertain network mutations are never retried automatically.\n",
          "- Restored API/repository authorization tests, plus commentary and control tests. npm test runs all four test files.\n",
          "- Removed the unreferenced legacy GameEngine/GameRepository demo files and a commented-out duplicate route implementation. No game rules or existing database documents were migrated.\n",
          "- Added a read-only server credential/Firestore diagnostic script and this detailed rubric map.\n",
          "\n",
          "## Before deployment: execute and record\n",
          "\n",
          "1. Keep your private .env.local and copy it into the completed source folder. Do not paste its contents into chat.\n",
          "2. Run npm ci; npm test; npx tsc --noEmit; npm run lint; npm run build.\n",
          "3. Run node scripts/check-services.mjs. All Firebase checks must PASS. A missing or invalid service account is an environment problem; refreshing user tokens cannot repair it.\n",
          "4. Run npm start. Sign in and create two games. Reload, resume, filter and search. Only the owner should advance NPCs.\n",
          "5. Play through a human attack; compare every saved die pair, loss and conquest reward. Test Stop, skip, transfers, reinforcement and eliminated turns.\n",
          "6. Confirm a real battle displays AI war correspondent; inspect its saved commentary source/status. If only Battle report appears, fix the Groq key/model/network before claiming LLM completion.\n",
          "7. Copy a game URL, open it signed out, and then as a different account. Both can view the board and history; neither can move or delete. Use the UI and denied API/browser-write checks as appropriate.\n",
          "8. Replay a finished battle. Verify historical countries, saved dice and recorded commentary; return to live and confirm no new moves were submitted.\n",
          "9. Check 1x/2.5x NPC speed, readable reasons, mobile layout, keyboard navigation, audio controls and centered delete dialog. Delete only a disposable test campaign when testing deletion.\n",
          "10. Deploy only after the above checks, as a separate step. Then repeat auth, spectator and AI checks on the public URL.\n",
          "\n",
          "## Submission requirements from the brief\n",
          "\n",
          "- Source ZIP without .env.local, keys, node_modules, .next, caches, backups or obsolete updater scripts.\n",
          "- Deployed URL (not created during this pass).\n",
          "- Dedicated application demonstration username/password, supplied privately.\n",
          "- Database access for ammarcanani@gmail.com, mc.tanner@uct.ac.za and ridewaan.hanslo@uct.ac.za, or the permitted database login alternative. Arrange appropriate access in the correct project; do not submit a service-account private key as a password. No invitations have been sent.\n",
          "- README explaining setup and execution.\n",
          "- Upload required files and access details to the INF4001 Amathuba assignment folder.\n",
          "\n",
          "A successful local build is not proof of online authentication, a valid provider key, deployed Firestore rules, browser appearance, or 56/56 marks.\n"
        ]
      }
    ]
  },
  {
    "file": "src/lib/engine/GameEngine.ts",
    "before": "ec89431ba33d93b4153a75d1bdbc262b951a03729d585ec586f2e467fdb5e682",
    "after": null,
    "edits": []
  },
  {
    "file": "src/lib/db/GameRepository.ts",
    "before": "8be92c01ffb37dbbbecf634c30723095f2bcccfd094c035b7abe09b253a47433",
    "after": null,
    "edits": []
  }
];

// Validate every affected file before making any changes.
const changes = [];

for (const patch of patches) {
  const target = path.join(root, patch.file);

  const original = fs.existsSync(target)
    ? fs.readFileSync(target, "utf8")
    : null;

  const currentHash =
    original === null ? null : hash(original);

  if (currentHash === patch.after) {
    continue;
  }

  if (currentHash !== patch.before) {
    throw new Error(
      `${patch.file} differs from finalise.zip. No files changed. ` +
      "Send your current version of that file; do not bypass this check."
    );
  }

  let updated = null;

  if (patch.after !== null) {
    const normal = (original ?? "")
      .replaceAll("\r\n", "\n");

    const lines =
      normal.match(/[^\n]*\n|[^\n]+$/g) ?? [];

    for (const edit of [...patch.edits].reverse()) {
      lines.splice(
        edit.start,
        edit.end - edit.start,
        ...edit.lines
      );
    }

    updated = lines.join("");

    if (hash(updated) !== patch.after) {
      throw new Error(
        `Copied update data failed verification for ${patch.file}. ` +
        "No files changed. Check that you copied the complete code."
      );
    }
  }

  changes.push({
    file: patch.file,
    target,
    original,
    updated,
  });
}

if (changes.length) {
  const backup = fs.mkdtempSync(
    path.join(
      path.dirname(root),
      "geopolitics-completion-backup-"
    )
  );

  // Backups are stored outside the project folder.
  for (const item of changes) {
    if (item.original === null) {
      continue;
    }

    const destination = path.join(
      backup,
      item.file
    );

    fs.mkdirSync(path.dirname(destination), {
      recursive: true,
    });

    fs.writeFileSync(
      destination,
      item.original
    );
  }

  try {
    for (const item of changes) {
      if (item.updated === null) {
        fs.unlinkSync(item.target);
      } else {
        fs.mkdirSync(
          path.dirname(item.target),
          { recursive: true }
        );

        fs.writeFileSync(
          item.target,
          item.updated
        );
      }
    }
  } catch (error) {
    // Restore the original files if writing fails.
    for (const item of changes) {
      if (item.original === null) {
        fs.rmSync(item.target, {
          force: true,
        });
      } else {
        fs.writeFileSync(
          item.target,
          item.original
        );
      }
    }

    throw error;
  }

  console.log(
    `Installed ${changes.length} completion changes. Backup: ${backup}`
  );
} else {
  console.log(
    "Completion changes are already installed."
  );
}

console.log(
  "Next: npm test, npx tsc --noEmit, npm run lint, " +
  "node scripts/check-services.mjs, npm run build, npm start."
);

console.log(
  "No credentials, saved campaigns, Firebase rules or deployments were changed."
);