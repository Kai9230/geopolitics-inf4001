"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase/config";
import { CampaignClient } from "@/lib/api/CampaignClient";
import { SoundEngine } from "@/lib/audio/SoundEngine";

import type {
  CampaignAction,
  CampaignState,
} from "@/types/game-state";

import type { Country } from "@/types";

import SoldierInput from "./game/SoldierInput";
import ShareCampaignButton from "./game/ShareCampaignButton";
import CampaignCorrespondent from "./CampaignCorrespondent";

import { RollingDice } from "@/components/game/RollingDice";

import {
  getFactionColor,
  participantColor,
  type MapBattleAnimation,
} from "@/components/game/MapTypes";

import s from "@/components/game/CampaignExperience.module.css";

import CampaignAnalytics from "@/components/game/CampaignAnalytics";
import CampaignExtras from "@/components/game/CampaignExtras";
import Clock from "@/components/game/BattleClock";

import { ReplayRules } from "@/lib/engine/ReplayRules";
import { exchangeVisualKey } from "@/lib/engine/BattleVisuals";

import {
  campaignReducer as reducer,
  createdCampaignModel,
  type PresentedEvent as Event,
} from "@/lib/engine/CampaignPresentation";

const RiskMap = dynamic(
  () =>
    import("@/components/game/RiskMap").then(
      (module) => module.RiskMap,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status">Loading world map…</p>
    ),
  },
);

const MiniatureBattle = dynamic(
  () =>
    import("@/components/game/MiniatureBattle").then(
      (module) => module.MiniatureBattle,
    ),
  {
    ssr: false,
  },
);

function countries(state: CampaignState): Country[] {
  return state.countries.map((country) => ({
    ...country,
    isPlayer: country.ownerId === "human",
    factionColor: participantColor(
      state,
      country.ownerId,
    ),
  }));
}

function animation(
  event: Event | undefined,
  state: CampaignState | null,
  active: boolean,
): MapBattleAnimation | null {
  if (
    !event?.dice ||
    !event.fromId ||
    !event.toId ||
    !state
  ) {
    return null;
  }

  const all = countries(state);

  const attacker = all.find(
    (country) => country.id === event.fromId,
  );

  const defender = all.find(
    (country) => country.id === event.toId,
  );

  if (!attacker || !defender) {
    return null;
  }

  return {
    id: event.revision,
    attackKey: exchangeVisualKey(
      state,
      attacker.id,
      defender.id,
      event.revision,
    ),
    playbackKey: "live",
    fromId: attacker.id,
    toId: defender.id,
    active,
    attackerColor: getFactionColor(attacker),
    defenderColor: getFactionColor(defender),
    dice: {
      attacker: event.dice.attacker,
      defender: event.dice.defender,
      attackerLoss: event.dice.attackerLosses,
      defenderLoss: event.dice.defenderLosses,
    },
  };
}

export default function CampaignExperience({
  gameId,
}: {
  gameId: string;
}) {
  const [model, dispatch] = useReducer(
    reducer,
    gameId,
    (id) =>
      createdCampaignModel(
        CampaignClient.createdState(id),
      ),
  );

  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [vibration, setVibration] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stop, setStop] = useState(false);

  const [history, setHistory] = useState<number | null>(
    null,
  );

  const [replay, setReplay] = useState(false);

  const [replayDone, setReplayDone] = useState<
    number | null
  >(null);

  const [replayEnd, setReplayEnd] = useState<
    number | null
  >(null);

  const [replayRun, setReplayRun] = useState(0);
  const [notice, setNotice] = useState("");

  const stopIntent = useRef(false);
  const inFlight = useRef(false);
  const nextRequestAt = useRef(0);
  const submittedRevision = useRef(-1);
  const mounted = useRef(true);
  const alertKey = useRef("");

  function startReplay(
    revision: number,
    end: number | null = null,
  ) {
    setHistory(revision);
    setReplayDone(null);
    setReplayEnd(end);
    setReplayRun((run) => run + 1);
    setReplay(true);
  }

  useEffect(() => {
    mounted.current = true;

    const timer = setTimeout(() => {
      try {
        setVibration(
          localStorage.getItem(
            "geopolitics-vibration",
          ) === "true",
        );
      } catch {
        // Storage preferences are optional.
      }
    }, 0);

    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        setUid(user?.uid ?? null);
      },
      () => {
        setError(
          "Could not verify your session. Sign in again.",
        );
      },
    );
  }, []);

  useEffect(() => {
    const stopCampaign = onSnapshot(
      doc(db, "campaigns", gameId),
      (snapshot) => {
        const state = snapshot.data()?.state as
          | CampaignState
          | undefined;

        if (
          !state ||
          state.schemaVersion !== 1 ||
          state.id !== gameId ||
          state.countries.length !== 10
        ) {
          setFatal(
            "Campaign unavailable or deleted. Return to the war room.",
          );

          return;
        }

        if (snapshot.data()?.deleting) {
          setFatal(
            "This campaign is being deleted.",
          );

          return;
        }

        setFatal("");

        dispatch({
          type: "live",
          state,
        });
      },
      () => {
        setFatal(
          "Campaign connection failed. Check your connection and Firestore rules.",
        );
      },
    );

    const historyQuery = query(
      collection(
        db,
        "campaigns",
        gameId,
        "events",
      ),
      orderBy("revision", "asc"),
    );

    const eventCache = new Map<string, Event>();

    const stopHistory = onSnapshot(
      historyQuery,
      (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type === "removed") {
            eventCache.delete(change.doc.id);
          } else {
            const event = change.doc.data() as Event;

            if (
              event.afterState?.schemaVersion === 1
            ) {
              eventCache.set(change.doc.id, event);
            }
          }
        }

        dispatch({
          type: "events",
          events: [...eventCache.values()],
        });
      },
      () => {
        setFatal(
          "History could not load. Check the published Firestore rules.",
        );
      },
    );

    return () => {
      stopCampaign();
      stopHistory();
    };
  }, [gameId]);

  const live = model.live;

  const actor =
    live?.turnOrder[live.turnIndex];

  const participant = live?.participants.find(
    (item) => item.id === actor,
  );

  const owner =
    !!live && uid === live.playerId;

  const caughtUp =
    !!live &&
    model.cursor === live.revision &&
    !model.playing;

  const humanTurn =
    owner &&
    participant?.kind === "human" &&
    live?.status === "active";

  const canAct =
    humanTurn &&
    caughtUp &&
    !busy &&
    history === null;

  const own =
    live?.countries.filter(
      (country) => country.ownerId === "human",
    ) ?? [];

  const enemies =
    live?.countries.filter(
      (country) => country.ownerId !== "human",
    ) ?? [];

  const selectable =
    canAct &&
    live?.pendingReinforcements === 0 &&
    !live.attackUsed &&
    !live.activeAttack;

  const send = useCallback(
    async (action?: CampaignAction) => {
      if (
        !live ||
        auth.currentUser?.uid !== live.playerId ||
        inFlight.current ||
        submittedRevision.current === live.revision
      ) {
        return;
      }

      inFlight.current = true;
      submittedRevision.current = live.revision;

      setBusy(true);
      setError("");

      try {
        const delay =
          nextRequestAt.current - Date.now();

        if (delay > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay),
          );
        }

        if (!mounted.current) {
          return;
        }

        const result = action
          ? await CampaignClient.act(live, action)
          : await CampaignClient.advanceNpc(live);

        nextRequestAt.current =
          Date.now() + (result.cooldownMs ?? 320);

        if (mounted.current) {
          dispatch({
            type: "confirmed",
            state: result.state,
            event: {
              ...result.event,
              afterState: result.state,
            },
          });

          setPaused(false);
        }
      } catch (failure) {
        submittedRevision.current = -1;

        if (mounted.current) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Request failed.",
          );

          setPaused(true);
        }
      } finally {
        inFlight.current = false;

        if (mounted.current) {
          setBusy(false);
        }
      }
    },
    [live],
  );

  /*
   * Advance NPCs automatically.
   * Human turns wait for commands unless an attack is active.
   */
  useEffect(() => {
    if (
      !live ||
      !owner ||
      !caughtUp ||
      busy ||
      paused ||
      history !== null ||
      live.status !== "active"
    ) {
      return;
    }

    const npc = participant?.kind === "npc";

    if (!npc && !live.activeAttack) {
      return;
    }

    const delay = stop
      ? 350
      : npc
        ? fast
          ? 450
          : 1000
        : 400;

    const timer = setTimeout(() => {
      if (npc) {
        void send();
      } else {
        void send({
          type: stopIntent.current
            ? "stop-attack"
            : "roll",
        });
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [
    live,
    owner,
    caughtUp,
    busy,
    paused,
    history,
    participant?.kind,
    fast,
    stop,
    send,
  ]);

  /*
   * Play one alert per human turn.
   */
  useEffect(() => {
    if (
      !live ||
      !humanTurn ||
      !caughtUp ||
      history !== null
    ) {
      return;
    }

    const key =
      `${live.id}:` +
      `${live.round}:` +
      `${live.turnIndex}`;

    if (key === alertKey.current) {
      return;
    }

    alertKey.current = key;

    SoundEngine.turnStart();

    if (vibration && navigator.vibrate) {
      navigator.vibrate([100, 60, 100]);
    }
  }, [
    live,
    humanTurn,
    caughtUp,
    history,
    vibration,
  ]);

  const recorded = model.events.find(
    (event) => event.revision === history,
  );

  const replayFrame =
    history === null
      ? null
      : ReplayRules.frame(
          model.events,
          history,
          replay && replayDone !== history,
        );

  const replayNext = ReplayRules.next(
    model.events,
    history,
    replayEnd,
  );

  const replayHasBattle =
    !!replayFrame?.canAnimate;

  useEffect(() => {
    if (!replay || history === null) {
      return;
    }

    // Wait for the battle animation clock to finish.
    if (
      replayHasBattle &&
      replayDone !== history
    ) {
      return;
    }

    const timer = setTimeout(
      () => {
        if (replayNext === null) {
          setReplay(false);
        } else {
          setReplayDone(null);
          setHistory(replayNext);
        }
      },
      replayHasBattle ? 1000 : 1200,
    );

    return () => clearTimeout(timer);
  }, [
    replay,
    history,
    replayDone,
    replayNext,
    replayHasBattle,
  ]);

  const before = model.playing
    ? [...model.events]
        .reverse()
        .find(
          (event) =>
            event.revision <
            model.playing!.revision,
        )?.afterState
    : null;

  const view =
    replayFrame?.state ??
    before ??
    model.events.find(
      (event) => event.revision === model.cursor,
    )?.afterState ??
    live;

  const shown =
    history !== null
      ? replayFrame?.event
      : model.playing ?? undefined;

  const battleBefore = shown
    ? [...model.events]
        .reverse()
        .find(
          (event) =>
            event.revision < shown.revision,
        )?.afterState ?? shown.afterState
    : null;

  const anim = animation(
    shown,
    battleBefore,
    history !== null
      ? replay && replayDone !== history
      : !!model.playing,
  );

  // Replaying the same saved roll starts a fresh animation.
  if (anim && history !== null) {
    anim.id =
      -(anim.id + 1 + replayRun * 1000000);

    anim.playbackKey = `replay:${replayRun}`;
  }

  function select(id: string): void {
    if (!live) {
      return;
    }

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
      (item) => item.id === id,
    );

    if (!country) {
      return;
    }

    if (country.ownerId === "human") {
      if (country.soldiers < 2) {
        setError(
          "This country needs at least two soldiers to attack. " +
            "Reinforce or transfer troops first.",
        );

        return;
      }

      setFrom(country.id);
      setTo("");
      setError("");

      setNotice(
        "Attacker selected. Click an enemy country " +
          "to launch your one attack this turn.",
      );

      return;
    }

    const source = live.countries.find(
      (item) =>
        item.id === from &&
        item.ownerId === "human",
    );

    if (!source || source.soldiers < 2) {
      setError(
        "First select one of your countries with at least two soldiers.",
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

  if (fatal || !live || !view) {
    return (
      <main className={s.shell}>
        <h1>
          {fatal || "Connecting to campaign…"}
        </h1>

        <Link href="/lobby">
          Return to war room
        </Link>
      </main>
    );
  }

  const status =
    history !== null
      ? "REPLAY"
      : !owner
        ? "SPECTATOR"
        : live.status !== "active"
          ? "CAMPAIGN COMPLETE"
          : humanTurn
            ? "YOUR TURN"
            : `${participant?.name ?? "OPPONENT"}’S TURN`;

  const phase =
    live.pendingReinforcements > 0
      ? "reinforce"
      : live.activeAttack
        ? "battle"
        : live.attackUsed
          ? "finish"
          : "select";

  const attacker = own.find(
    (country) => country.id === from,
  );

  const defender = enemies.find(
    (country) => country.id === to,
  );

  const last =
    history !== null
      ? recorded
      : model.playing ?? model.events.at(-1);

  const latestAttack =
    ReplayRules.latestAttack(model.events);

  const reportEvent = history !== null
    ? recorded ?? null
    : shown
      ? model.events.find(event => event.revision === shown.revision) ?? shown
      : model.events.filter(event => event.dice && event.revision <= (model.cursor ?? -1)).at(-1) ?? null;

  const upcoming = [
    ...live.turnOrder.slice(live.turnIndex + 1),
    ...live.turnOrder.slice(0, live.turnIndex),
  ].filter((id) =>
    live.countries.some(
      (country) => country.ownerId === id,
    ),
  );

  const ahead = upcoming.indexOf("human") + 1;

  const turnExplanation =
    history !== null
      ? "Return to live to continue playing"
      : live.status === "completed"
        ? "All ten nations are under one command"
        : !owner
          ? "Watch live · Only the owner can make moves"
          : own.length === 0
            ? "You have been eliminated · Watch the remaining nations"
            : humanTurn
              ? phase === "reinforce"
                ? `Allocate ${live.pendingReinforcements} soldiers to unlock your commands`
                : phase === "battle"
                  ? "Your target is locked · Exchanges continue automatically"
                  : phase === "finish"
                    ? "Attack complete · Transfer troops or finish your turn"
                    : "Click your country, then an enemy to launch your attack"
              : `${
                  ahead > 0
                    ? `${ahead} opponent turn${
                        ahead === 1 ? "" : "s"
                      } until yours`
                    : "Watching opponents"
                } · Every decision remains visible`;

  return (
    <main
      className={s.shell}
      data-replay={history !== null}
    >
      <header className={s.header}>
        <div>
          <small>
            GEOPOLITICS / ROUND {live.round}
          </small>

          <h1>World command</h1>
        </div>

        <nav>
          <Link href="/lobby">
            War room
          </Link>

          <Link href="/how-to-play">
            How to play
          </Link>

          <ShareCampaignButton />

          <button
            aria-pressed={fast}
            onClick={() => {
              setFast(!fast);
            }}
          >
            NPC speed {fast ? "2.5×" : "1×"}
          </button>
        </nav>
      </header>

      <section
        className={[
          s.turn,
          humanTurn && history === null
            ? s.yours
            : "",
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <strong>{status}</strong>
        <span>{turnExplanation}</span>
      </section>

      <CampaignExtras
        state={live}
        displayState={view}
        enabled={
          canAct &&
          !live.activeAttack &&
          live.pendingReinforcements === 0
        }
        showResult={
          live.status === "completed" &&
          caughtUp &&
          history === null
        }
        submit={(action) => {
          void send(action);
        }}
        replay={() =>
          startReplay(
            model.events[0]?.revision ?? 0,
          )
        }
      />

      {error && (
        <div
          className={s.error}
          role="alert"
        >
          {error}

          {paused && (
            <button
              onClick={() => {
                setError("");
                setPaused(false);
              }}
            >
              Retry / resume
            </button>
          )}
        </div>
      )}

      {notice && (
        <p role="status">{notice}</p>
      )}

      <section
        className={s.nations}
        aria-label="All ten countries and soldier counts"
      >
        {countries(view).map((country) => (
          <button
            key={country.id}
            onClick={() => {
              select(country.id);
            }}
            disabled={!selectable}
            aria-pressed={
              from === country.id ||
              to === country.id
            }
            style={{
              borderBottomColor:
                getFactionColor(country),
            }}
          >
            <span
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
            </span>

            <strong>
              {country.soldiers}
            </strong>

            <small>
              {country.isPlayer
                ? "YOUR CONTROL"
                : (view.treaties ?? []).some(
                    (treaty) =>
                      treaty.expiresRound >=
                        view.round &&
                      treaty.members.includes(
                        "human",
                      ) &&
                      treaty.members.includes(
                        country.ownerId,
                      ),
                  )
                  ? "ALLY · ATTACK BREAKS TREATY"
                  : "OPPONENT"}
            </small>
          </button>
        ))}
      </section>

      <div className={s.layout}>
        <div className={s.board}>
          <RiskMap
            countries={countries(view)}
            selectedAtk={
              selectable ? from || null : null
            }
            targetId={
              selectable ? to || null : null
            }
            onCountryClick={select}
            battleAnimation={
              anim?.active ? anim : null
            }
          />

          <div
            className={s.decision}
            role="status"
          >
            <small>
              {last?.actorId === "human"
                ? "YOUR LATEST ACTION"
                : "LATEST COMMAND"}
            </small>

            <p>
              {last?.message ??
                "Command is standing by."}
            </p>

            {last?.reason && (
              <span>{last.reason}</span>
            )}
          </div>

          {anim ? (
            <section
              key={`${
                history === null
                  ? "live"
                  : "replay"
              }:${anim.id}`}
              className={[
                s.battle,
                anim.active
                  ? "is-running"
                  : "is-resolved",
              ].join(" ")}
              data-battle-id={anim.id}
            >
              <header>
                <strong>
                  {
                    battleBefore?.countries.find(
                      (country) =>
                        country.id === anim.fromId,
                    )?.name
                  }
                  {" → "}
                  {
                    battleBefore?.countries.find(
                      (country) =>
                        country.id === anim.toId,
                    )?.name
                  }
                </strong>

                <small>
                  {anim.active
                    ? `EXCHANGE ${
                        (battleBefore?.activeAttack
                          ?.exchangeNumber ?? 0) + 1
                      } · SAME ATTACK`
                    : "RECORDED RESULT"}
                </small>
              </header>

              <MiniatureBattle animation={anim} />

              <RollingDice dice={anim.dice!} />

              <p className={s.exchangeResult}>
                Attacker losses:{" "}
                {anim.dice!.attackerLoss}
                {" · "}
                Defender losses:{" "}
                {anim.dice!.defenderLoss}
                {" · "}
                {shown?.message}
              </p>
            </section>
          ) : (
            <section className={s.empty}>
              <small>TACTICAL TABLETOP</small>

              <h2>
                Your battle will appear here
              </h2>

              <p>
                Choose an attacker and target.
                Your 3D armies and dice appear
                as the saved exchange begins.
              </p>
            </section>
          )}

          {history !== null &&
            anim?.active &&
            replayHasBattle && (
              <Clock
                key={`replay:${anim.id}`}
                id={anim.id}
                fast={false}
                done={() =>
                  setReplayDone(history)
                }
              />
            )}

          {history === null && model.playing && (
            <Clock
              key={model.playing.revision}
              id={model.playing.revision}
              fast={
                fast &&
                model.playing.actorId !== "human"
              }
              done={() => {
                dispatch({
                  type: "finish",
                  revision:
                    model.playing!.revision,
                });
              }}
            />
          )}
        </div>

        <aside className={s.commands}>
          <section className={s.panel}>
            <small>COMMAND CONSOLE</small>

            <h2>
              {!owner
                ? "Live spectator"
                : !humanTurn
                  ? "Opponent in command"
                  : phase === "reinforce"
                    ? "Place reinforcements"
                    : phase === "battle"
                      ? "Attack in progress"
                      : phase === "finish"
                        ? "Conquest complete"
                        : "Launch your attack"}
            </h2>

            {!owner ? (
              <p>
                This shared campaign is read-only.
                Sign in and start your own from
                the war room.
              </p>
            ) : !humanTurn ? (
              <>
                <p>
                  {own.length
                    ? "Your turn will remain open until you act. NPC simulation stops when your turn begins."
                    : "Your countries were lost. You can still watch the campaign."}
                </p>

                <div className={s.order}>
                  {upcoming.map((id) => (
                    <span
                      key={id}
                      className={
                        id === "human"
                          ? s.nextHuman
                          : ""
                      }
                    >
                      {id === "human"
                        ? "YOU"
                        : live.participants.find(
                            (item) =>
                              item.id === id,
                          )?.name}
                    </span>
                  ))}
                </div>
              </>
            ) : phase === "reinforce" ? (
              <Allocation
                key={`${live.round}:${live.turnIndex}`}
                state={live}
                enabled={canAct}
                submit={(allocations) => {
                  void send({
                    type: "allocate",
                    allocations,
                  });
                }}
              />
            ) : phase === "battle" ? (
              <>
                <p>
                  Exchange{" "}
                  {
                    live.activeAttack!
                      .exchangeNumber
                  }
                  . One attack against one target.
                </p>

                <button
                  className={s.danger}
                  disabled={stop}
                  onClick={() => {
                    stopIntent.current = true;
                    setStop(true);
                    setPaused(false);
                  }}
                >
                  {stop
                    ? "Stopping before the next exchange…"
                    : "Stop attack and end turn"}
                </button>

                <p className={s.hint}>
                  An exchange already resolving
                  finishes first. Its saved result
                  is retained.
                </p>
              </>
            ) : (
              <>
                {phase === "select" ? (
                  <>
                    <p>
                      1. Select your country on
                      the map or above.
                      <br />
                      2. Select an enemy.
                      <br />
                      3. Clicking the enemy launches
                      the attack.
                    </p>

                    <div className={s.route}>
                      <span>
                        {attacker
                          ? `${attacker.name} · ${attacker.soldiers}`
                          : "Your attacking country"}
                      </span>

                      <b>↓</b>

                      <span>
                        {defender
                          ? `${defender.name} · ${defender.soldiers}`
                          : "Enemy target"}
                      </span>
                    </div>

                    <button
                      className={s.primary}
                      disabled={
                        !selectable ||
                        !attacker ||
                        attacker.soldiers < 2 ||
                        !defender
                      }
                      onClick={() => {
                        stopIntent.current = false;
                        setStop(false);
                        setPaused(false);

                        void send({
                          type: "start-attack",
                          fromId: from,
                          toId: to,
                        });
                      }}
                    >
                      Retry selected attack
                    </button>
                  </>
                ) : (
                  <p>
                    Your one attack is complete.
                    You may transfer troops before
                    finishing this turn.
                  </p>
                )}

                <button
                  disabled={!canAct}
                  onClick={() => {
                    void send({
                      type: "end-turn",
                    });
                  }}
                >
                  {phase === "finish"
                    ? "Finish turn"
                    : "Skip attack and end turn"}
                </button>
              </>
            )}

            {history !== null && (
              <button
                className={s.primary}
                onClick={() => {
                  setHistory(null);
                  setReplay(false);
                }}
              >
                Return to live play
              </button>
            )}

            {busy && (
              <p role="status">
                Saving command…
              </p>
            )}

            {!caughtUp &&
              !busy &&
              history === null && (
                <p className={s.hint}>
                  Presenting the latest saved
                  action…
                </p>
              )}
          </section>

          {owner && own.length > 1 && (
            <Transfer
              key={`${live.round}:${live.turnIndex}`}
              state={live}
              enabled={
                canAct &&
                !live.activeAttack &&
                live.pendingReinforcements === 0
              }
              submit={(action) => {
                void send(action);
              }}
            />
          )}

          <CampaignExtras
            mode="diplomacy"
            state={live}
            displayState={view}
            enabled={
              canAct &&
              !live.activeAttack &&
              live.pendingReinforcements === 0
            }
            showResult={false}
            submit={(action) => {
              void send(action);
            }}
            replay={() =>
              startReplay(
                model.events[0]?.revision ?? 0,
              )
            }
          />

          <section className={s.panel}>
            <small>CAMPAIGN RECORD</small>

            <h2>History & replay</h2>

            <label>
              Recorded state

              <select
                disabled={
                  busy || !!model.playing
                }
                value={history ?? ""}
                onChange={(event) => {
                  setReplay(false);

                  setHistory(
                    event.target.value === ""
                      ? null
                      : Number(
                          event.target.value,
                        ),
                  );
                }}
              >
                <option value="">
                  Live campaign
                </option>

                {model.events.map((event) => (
                  <option
                    key={event.revision}
                    value={event.revision}
                  >
                    #{event.revision}
                    {" · "}
                    {event.action}
                  </option>
                ))}
              </select>
            </label>

            <div className={s.replayToolbar}>
              <button
                disabled={
                  busy ||
                  !!model.playing ||
                  !model.events.length
                }
                onClick={() =>
                  replay
                    ? setReplay(false)
                    : startReplay(
                        history ??
                          model.events[0].revision,
                      )
                }
              >
                {replay
                  ? "Pause replay"
                  : history === null
                    ? "Play full history"
                    : "Play from selected event"}
              </button>

              <button
                disabled={
                  busy ||
                  !!model.playing ||
                  !latestAttack
                }
                onClick={() => {
                  if (latestAttack) {
                    startReplay(
                      latestAttack.start,
                      latestAttack.end,
                    );
                  }
                }}
              >
                Replay latest attack
              </button>

              <button
                disabled={history === null}
                onClick={() => {
                  setReplay(false);
                  setHistory(null);
                }}
              >
                Return to live
              </button>
            </div>

            {recorded && (
              <div
                className={s.replaySummary}
                role="status"
              >
                <strong>
                  {replay
                    ? "PLAYING RECORDING"
                    : "SAVED SNAPSHOT"}
                  {" · "}
                  #{recorded.revision}
                </strong>

                <p>{recorded.message}</p>

                {recorded.reason && (
                  <p>{recorded.reason}</p>
                )}

                {recorded.commentary?.text && (
                  <p>
                    {recorded.commentary.source ===
                    "groq"
                      ? "Recorded AI report: "
                      : "Recorded battle report: "}

                    {recorded.commentary.text}
                  </p>
                )}

                <p>
                  No new rolls or moves are
                  submitted during replay.
                </p>
              </div>
            )}

            <div className={s.log}>
              {[...model.events]
                .reverse()
                .slice(0, 12)
                .map((event) => (
                  <article
                    key={event.revision}
                  >
                    <small>
                      #{event.revision}
                      {" · "}

                      {event.actorId === "human"
                        ? "YOU"
                        : event.actorId
                            .replace("npc:", "")
                            .toUpperCase()}
                    </small>

                    <p>{event.message}</p>

                    {event.reason && (
                      <span>
                        {event.reason}
                      </span>
                    )}
                  </article>
                ))}
            </div>
          </section>

          <CampaignAnalytics
            events={model.events.filter(
              (event) =>
                event.revision <=
                (history ?? model.cursor ?? 0),
            )}
          />

          <button
            aria-pressed={vibration}
            onClick={() => {
              setVibration(!vibration);

              try {
                localStorage.setItem(
                  "geopolitics-vibration",
                  String(!vibration),
                );
              } catch {
                // Storage preferences are optional.
              }
            }}
          >
            Turn vibration:{" "}
            {vibration ? "on" : "off"}
          </button>
        </aside>
      </div>
      <CampaignCorrespondent event={reportEvent} replay={history !== null} />
    </main>
  );
}

function Allocation({
  state,
  enabled,
  submit,
}: {
  state: CampaignState;
  enabled: boolean;
  submit: (
    allocations: Record<string, number>,
  ) => void;
}) {
  const [values, setValues] = useState<
    Record<string, number>
  >({});

  const own = state.countries.filter(
    (country) => country.ownerId === "human",
  );

  const total = Object.values(values).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!enabled || total !== state.pendingReinforcements ||
            Object.values(values).some(amount => !Number.isSafeInteger(amount) || amount < 0)) return;
        submit(values);
      }}
    >
      <fieldset disabled={!enabled}>
        <p>
          Allocate exactly{" "}
          {state.pendingReinforcements} soldiers.
        </p>

        {own.map((country) => (
          <label key={country.id}>
            {country.name}

            <SoldierInput
              value={values[country.id] ?? 0}
              min={0}
              max={state.pendingReinforcements}
              onChange={(amount) => {
                setValues((current) => ({
                  ...current,
                  [country.id]: amount,
                }));
              }}
            />
          </label>
        ))}

        <p>
          {total} /{" "}
          {state.pendingReinforcements} placed
        </p>

        <button
          className={s.primary}
          disabled={
            total !==
            state.pendingReinforcements
          }
        >
          Confirm reinforcements
        </button>
      </fieldset>
    </form>
  );
}

function Transfer({
  state,
  enabled,
  submit,
}: {
  state: CampaignState;
  enabled: boolean;
  submit: (action: CampaignAction) => void;
}) {
  const own = state.countries.filter(
    (country) => country.ownerId === "human",
  );

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState(1);

  const source = own.find(
    (country) => country.id === from,
  );

  return (
    <section className={s.panel}>
      <h2>Transfer troops</h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!enabled || !source || from === to || !own.some(country => country.id === to) ||
              !Number.isSafeInteger(amount) || amount < 1 || amount >= source.soldiers) return;

          submit({
            type: "transfer",
            fromId: from,
            toId: to,
            amount,
          });
        }}
      >
        <fieldset disabled={!enabled}>
          <label>
            From

            <select
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setAmount(1);
              }}
            >
              <option value="">
                Choose source
              </option>

              {own.map((country) => (
                <option
                  key={country.id}
                  value={country.id}
                >
                  {country.name}
                  {" · "}
                  {country.soldiers}
                </option>
              ))}
            </select>
          </label>

          <label>
            To

            <select
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
              }}
            >
              <option value="">
                Choose destination
              </option>

              {own
                .filter(
                  (country) =>
                    country.id !== from,
                )
                .map((country) => (
                  <option
                    key={country.id}
                    value={country.id}
                  >
                    {country.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            Soldiers

            <SoldierInput
              value={amount}
              min={1}
              max={
                source
                  ? Math.max(
                      0,
                      source.soldiers - 1,
                    )
                  : 0
              }
              onChange={setAmount}
            />
          </label>

          <button
            disabled={
              !source ||
              !own.some(
                (country) =>
                  country.id === to,
              ) ||
              from === to ||
              !Number.isInteger(amount) ||
              amount < 1 ||
              amount >= source.soldiers
            }
          >
            Transfer soldiers
          </button>

          <p className={s.hint}>
            Transfer between any two countries
            you own, before or after your attack.
            Leave at least one soldier in the
            source. No transfers during an attack.
          </p>

          {source &&
            to &&
            from !== to &&
            amount >= 1 &&
            amount < source.soldiers && (
              <p role="status">
                After transfer: {source.name}{" "}
                {source.soldiers - amount}
                {"; "}
                {
                  own.find(
                    (country) =>
                      country.id === to,
                  )?.name
                }
                {" "}
                {(
                  own.find(
                    (country) =>
                      country.id === to,
                  )?.soldiers ?? 0
                ) + amount}
                {" "}
                soldiers. This does not end
                your turn.
              </p>
            )}
        </fieldset>
      </form>
    </section>
  );
}