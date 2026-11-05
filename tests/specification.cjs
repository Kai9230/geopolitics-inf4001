/* eslint-disable @typescript-eslint/no-require-imports */

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

const { ReplayRules: R } = require("../src/lib/engine/ReplayRules.ts");

const { campaignReducer: P, initialCampaignModel: I, createdCampaignModel: seedModel } = require("../src/lib/engine/CampaignPresentation.ts");

const { FlightLedger, FlightPlayback, attackVisualKey, exchangeVisualKey } = require("../src/lib/engine/BattleVisuals.ts");
const { DiplomacyRules: D } = require("../src/lib/engine/DiplomacyRules.ts");

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
      doc: id => ref(`${path}/${name}/${id}`),
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
    collection: name => ({ doc: id => ref(`${name}/${id}`) }),
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
