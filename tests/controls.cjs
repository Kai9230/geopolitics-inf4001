/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");
function load(relative, stubs = {}) {
  const filename = path.resolve(__dirname, "..", relative);
  const loaded = new Module(filename, module), original = Module.createRequire(filename);
  loaded.require = name => name.endsWith(".css") ? {} : Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports.default;
}

test("soldier input removes leading zeros even when the parent number is unchanged", () => {
  const Input = load("src/components/game/SoldierInput.tsx");
  const received = [];
  const input = Input({ value: 5, min: 1, max: 20, onChange: amount => received.push(amount) });
  for (const [raw, displayed, amount] of [["005", "5", 5], ["", "", 0], ["000", "", 0], ["0012", "12", 12]]) {
    const currentTarget = { value: raw };
    input.props.onChange({ currentTarget });
    assert.equal(currentTarget.value, displayed);
    assert.equal(received.at(-1), amount);
  }
  const calls = received.length;
  for (const raw of ["-2", "1.5", "abc", "9007199254740992"]) {
    const currentTarget = { value: raw };
    input.props.onChange({ currentTarget });
    assert.equal(currentTarget.value, "5");
  }
  assert.equal(received.length, calls);
});

test("Share announces successful copying, supports a fallback and offers manual copying on refusal", async () => {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const oldWindow = global.window, oldDocument = global.document, oldElement = global.HTMLElement;
  try {
    for (const mode of ["clipboard", "legacy", "denied"]) {
      let cursor = 0, removed = false, copied = "";
      const slots = [];
      const React = {
        useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
        useState: initial => {
          const i = cursor++; if (!(i in slots)) slots[i] = initial;
          return [slots[i], value => { slots[i] = value; }];
        },
      };
      const Share = load("src/components/game/ShareCampaignButton.tsx", { react: React });
      const render = () => { cursor = 0; return Share(); };
      global.window = { location: { href: "https://example.test/game/saved-game" } };
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: {
        writeText: async text => { if (mode !== "clipboard") throw new Error("Denied"); copied = text; },
      } } });
      global.document = {
        activeElement: null,
        createElement: () => ({ style: {}, select() {}, remove() { removed = true; } }),
        body: { appendChild() {} }, execCommand: () => mode === "legacy",
      };
      global.HTMLElement = class {};
      render().props.children[0].props.onClick();
      await new Promise(setImmediate);
      const output = render().props.children;
      if (mode === "denied") {
        assert.equal(output[1].props.children, "Copy this campaign link:");
        assert.equal(output[2].props.value, global.window.location.href);
      } else {
        assert.equal(output[0].props.children, "Link copied ✓");
        assert.equal(output[1].props.children, "Link copied");
        if (mode === "clipboard") assert.equal(copied, global.window.location.href);
      }
      if (mode !== "clipboard") assert(removed);
    }
  } finally {
    if (oldNavigator) Object.defineProperty(globalThis, "navigator", oldNavigator);
    else delete globalThis.navigator;
    for (const [name, value] of [["window", oldWindow], ["document", oldDocument], ["HTMLElement", oldElement]]) {
      if (value === undefined) delete global[name]; else global[name] = value;
    }
  }
});

test("recorded commentary renders the supplied saved event rather than a live feed", () => {
  const Panel = load("src/components/CampaignCorrespondent.tsx");
  const result = Panel({ replay: true, event: { revision: 7, message: "Saved outcome", dice: {
    attackerLosses: 1, defenderLosses: 2,
  }, commentary: { source: "groq", status: "ready", text: "Saved AI sentence." } } });
  assert.equal(result.props["aria-label"], "Recorded war correspondent");
  assert.equal(result.props["data-live-correspondent"], false);
  assert(result.props.children[0].props.children.includes("AI war correspondent"));
  assert.equal(result.props.children[1].props.children, "Saved AI sentence.");
});
