"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase/config";
import { GameEngine } from "../../../lib/engine/GameEngine";
import { MusicPlayer } from "../../../lib/audio/MusicPlayer";
import { SoundEngine } from "../../../lib/audio/SoundEngine";

import { RiskMap } from "../../../components/game/RiskMap";
import { BattleScene } from "../../../components/game/BattleScene";
import { BattleTimeline } from "../../../components/game/BattleTimeline";

import {
  HowToPlayDialog,
  TransferDialog,
} from "../../../components/game/GameDialogs";

import {
  countryFlag,
  getFactionColor,
  type MapBattleAnimation,
} from "../../../components/game/MapTypes";

import type { Country } from "../../../types";

type Phase = "player-turn" | "npc-turn" | "transfer";

type RoundResult = {
  atkRolls: number[];
  defRolls: number[];
  atkLosses: number;
  defLosses: number;
  conquered: boolean;
};

type TransferData = {
  from: Country;
  to: Country;
  max: number;
  reward: number;
};

type CommentaryResponse = {
  commentary?: string;
  source?: string;
  error?: string;
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();

  const routeId = params.gameId;

  const gameId =
    typeof routeId === "string"
      ? routeId
      : Array.isArray(routeId)
        ? routeId[0]
        : undefined;

  const [countries, setCountries] = useState<Country[]>([]);
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [phase, setPhase] = useState<Phase>("player-turn");

  const [selectedAtk, setSelectedAtk] =
    useState<string | null>(null);

  const [targetId, setTargetId] =
    useState<string | null>(null);

  const [presenting, setPresenting] = useState(false);

  const [attackedThisTurn, setAttackedThisTurn] =
    useState(false);

  const [fastForward, setFastForward] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [battleAnimation, setBattleAnimation] =
    useState<MapBattleAnimation | null>(null);

  const [transferData, setTransferData] =
    useState<TransferData | null>(null);

  const [transferAmount, setTransferAmount] = useState(0);

  const [messages, setMessages] = useState<string[]>([
    "Select your country, then click an enemy country to attack.",
  ]);

  const busy = useRef(false);
  const mounted = useRef(true);
  const fast = useRef(false);
  const reinforced = useRef(false);
  const sequence = useRef(0);

  const battleDone = useRef<(() => void) | null>(null);

  const gameOutcome: "victory" | "defeat" | null =
    countries.length === 0
      ? null
      : countries.every((country) => country.isPlayer)
        ? "victory"
        : countries.every((country) => !country.isPlayer)
          ? "defeat"
          : null;

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      battleDone.current?.();
      battleDone.current = null;

      MusicPlayer.setScene("silent");
    };
  }, []);

  useEffect(() => {
    fast.current = fastForward;
  }, [fastForward]);

  useEffect(() => {
    if (!gameId) return;

    const unsubscribeGame = onSnapshot(
      doc(db, "games", gameId),

      (snapshot) => {
        if (!mounted.current) return;

        if (!snapshot.exists()) {
          setPageError("This campaign does not exist.");
          setLoading(false);
          return;
        }

        const savedRound = snapshot.data().turnNumber;

        setRound(
          typeof savedRound === "number" &&
            Number.isFinite(savedRound)
            ? savedRound
            : 1,
        );
      },

      (error) => {
        console.error("Game subscription failed:", error);

        if (mounted.current) {
          setPageError("Could not load the campaign.");
          setLoading(false);
        }
      },
    );

    const unsubscribeCountries = onSnapshot(
      collection(db, "games", gameId, "countries"),

      (snapshot) => {
        if (!mounted.current) return;

        const nextCountries: Country[] =
          snapshot.docs.map(
            (item) =>
              ({
                ...item.data(),
                id: item.id,
              }) as Country,
          );

        setCountries(nextCountries);
        setLoading(false);
      },

      (error) => {
        console.error("Country subscription failed:", error);

        if (mounted.current) {
          setPageError("Could not load the countries.");
          setLoading(false);
        }
      },
    );

    return () => {
      unsubscribeGame();
      unsubscribeCountries();
    };
  }, [gameId]);

  function addLog(message: string): void {
    if (!mounted.current) return;

    setMessages((previous) =>
      [message, ...previous].slice(0, 60),
    );
  }

  function sleep(milliseconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(
        resolve,
        fast.current ? milliseconds * 0.34 : milliseconds,
      );
    });
  }

  /*
   * Existing Day 1 reinforcement behavior.
   * The ref prevents duplicate grants during this mounted
   * session; refresh-safe grants require persisted turn state.
   */
  useEffect(() => {
    if (
      loading ||
      !gameId ||
      gameOutcome ||
      phase !== "player-turn" ||
      reinforced.current ||
      round < 2
    ) {
      return;
    }

    const owned = countries.filter(
      (country) => country.isPlayer,
    );

    if (owned.length === 0) return;

    reinforced.current = true;

    const currentGameId = gameId;

    async function grantReinforcements(): Promise<void> {
      try {
        const total =
          GameEngine.calculateReinforcements(owned.length);

        const perCountry = Math.floor(total / owned.length);

        let remainder =
          total - perCountry * owned.length;

        const batch = writeBatch(db);

        for (const country of owned) {
          const additional =
            perCountry + (remainder > 0 ? 1 : 0);

          if (remainder > 0) {
            remainder -= 1;
          }

          batch.update(
            doc(
              db,
              "games",
              currentGameId,
              "countries",
              country.id,
            ),
            {
              soldiers: country.soldiers + additional,
            },
          );
        }

        await batch.commit();

        if (!mounted.current) return;

        setMessages((previous) =>
          [
            `Reinforcements received: ${total} soldiers.`,
            ...previous,
          ].slice(0, 60),
        );

        SoundEngine.reinforce();
      } catch (error: unknown) {
        console.error("Reinforcement save failed:", error);

        if (!mounted.current) return;

        setMessages((previous) =>
          [
            "Could not save reinforcements. Refresh to inspect the saved board.",
            ...previous,
          ].slice(0, 60),
        );
      }
    }

    void grantReinforcements();
  }, [
    loading,
    gameId,
    gameOutcome,
    phase,
    round,
    countries,
  ]);

  async function requestCommentary(
    attacker: Country,
    defender: Country,
    result: RoundResult,
  ): Promise<void> {
    const requestId = ++sequence.current;

    const placeholder =
      `Reporting ${attacker.name} → ${defender.name}` +
      ` · exchange ${requestId}…`;

    addLog(placeholder);

    let report =
      `${attacker.name} lost ${result.atkLosses}; ` +
      `${defender.name} lost ${result.defLosses}.`;

    try {
      const response = await fetch("/api/ai/commentary", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        signal: AbortSignal.timeout(18000),

        body: JSON.stringify({
          attacker: attacker.name,
          defender: defender.name,

          atkRolls: result.atkRolls,
          defRolls: result.defRolls,

          atkLosses: result.atkLosses,
          defLosses: result.defLosses,

          attackerOwner: attacker.isPlayer
            ? "Your forces"
            : `${attacker.name} command`,

          defenderOwner: defender.isPlayer
            ? "Your forces"
            : `${defender.name} command`,
        }),
      });

      const data: CommentaryResponse = await response.json();

      if (
        typeof data.commentary !== "string" ||
        data.commentary.trim().length === 0
      ) {
        throw new Error(
          data.error || "No commentary returned.",
        );
      }

      const commentary = data.commentary.trim();

      report =
        response.ok && data.source === "groq"
          ? `AI report: ${commentary}`
          : `Battle report: ${commentary}`;
    } catch (error: unknown) {
      console.warn(
        "Commentary unavailable:",
        error instanceof Error ? error.message : error,
      );
    }

    if (!mounted.current) return;

    setMessages((previous) =>
      previous.map((message) =>
        message === placeholder ? report : message,
      ),
    );
  }

  /*
   * BattleTimeline advances the aircraft, soldiers and dice
   * together. Changing speed does not reroll the result.
   */
  async function showExchange(
    attacker: Country,
    defender: Country,
  ): Promise<RoundResult> {
    const result: RoundResult = GameEngine.resolveRound(
      attacker.soldiers,
      defender.soldiers,
    );

    const animationId = ++sequence.current;

    const finished = new Promise<void>((resolve) => {
      battleDone.current = resolve;
    });

    setBattleAnimation({
      id: animationId,
      fromId: attacker.id,
      toId: defender.id,
      active: true,

      // The shared timeline handles speed.
      fast: false,

      attackerColor: getFactionColor(attacker),
      defenderColor: getFactionColor(defender),

      dice: {
        attacker: result.atkRolls,
        defender: result.defRolls,
        attackerLoss: result.atkLosses,
        defenderLoss: result.defLosses,
      },
    });

    MusicPlayer.setScene("battle");
    SoundEngine.aircraft();
    SoundEngine.diceRoll();

    addLog(
      `${attacker.name} [${result.atkRolls.join(", ")}] ` +
        `versus ${defender.name} ` +
        `[${result.defRolls.join(", ")}]. ` +
        `Losses: ${result.atkLosses} / ${result.defLosses}.`,
    );

    try {
      await finished;
    } finally {
      battleDone.current = null;

      MusicPlayer.setScene("silent");

      if (mounted.current) {
        setBattleAnimation((previous) =>
          previous?.id === animationId
            ? {
                ...previous,
                active: false,
              }
            : previous,
        );
      }
    }

    return result;
  }

  function handleCountryClick(id: string): void {
    if (
      busy.current ||
      phase !== "player-turn" ||
      attackedThisTurn ||
      gameOutcome
    ) {
      return;
    }

    const country = countries.find(
      (item) => item.id === id,
    );

    if (!country) return;

    SoundEngine.click();

    if (country.isPlayer) {
      if (country.soldiers < 2) {
        addLog("You need at least two soldiers to attack.");
        return;
      }

      setSelectedAtk(country.id);
      setTargetId(null);

      addLog(
        `${country.name} selected. Click an enemy country to attack.`,
      );

      return;
    }

    if (!selectedAtk) {
      addLog("Select one of your own countries first.");
      return;
    }

    void confirmAttack(selectedAtk, country.id);
  }

  async function readCountries(): Promise<Country[]> {
    if (!gameId) return [];

    const snapshot = await getDocs(
      collection(db, "games", gameId, "countries"),
    );

    return snapshot.docs.map(
      (item) =>
        ({
          ...item.data(),
          id: item.id,
        }) as Country,
    );
  }

  async function runNpcTurns(): Promise<void> {
    if (!gameId || !mounted.current) return;

    setPhase("npc-turn");
    addLog("NPC nations are taking their turns.");

    const initialBoard = await readCountries();

    const owners: string[] = [
      ...new Set<string>(
        initialBoard
          .filter((country) => !country.isPlayer)
          .map((country) => country.ownerId),
      ),
    ];

    for (const ownerId of owners) {
      if (!mounted.current) return;

      const board = await readCountries();

      if (
        board.length === 0 ||
        board.every((country) => country.isPlayer) ||
        board.every((country) => !country.isPlayer)
      ) {
        break;
      }

      const owned = board.filter(
        (country) =>
          !country.isPlayer &&
          country.ownerId === ownerId,
      );

      if (owned.length === 0) continue;

      const move = GameEngine.pickNpcTarget(owned, board);

      if (!move) {
        await sleep(80);
        continue;
      }

      addLog(
        `${move.attacker.name} attacks ${move.defender.name}.`,
      );

      const result = await showExchange(
        move.attacker,
        move.defender,
      );

      if (!mounted.current) return;

      const attackerRemaining =
        move.attacker.soldiers - result.atkLosses;

      const defenderRemaining =
        move.defender.soldiers - result.defLosses;

      const batch = writeBatch(db);

      if (result.conquered) {
        const reward =
          GameEngine.calculateConquestReward(
            move.defender.soldiers,
          );

        batch.update(
          doc(
            db,
            "games",
            gameId,
            "countries",
            move.attacker.id,
          ),
          {
            soldiers: 1,
          },
        );

        batch.update(
          doc(
            db,
            "games",
            gameId,
            "countries",
            move.defender.id,
          ),
          {
            soldiers:
              reward +
              Math.max(0, attackerRemaining - 1),

            isPlayer: false,
            ownerId,
          },
        );
      } else {
        batch.update(
          doc(
            db,
            "games",
            gameId,
            "countries",
            move.attacker.id,
          ),
          {
            soldiers: attackerRemaining,
          },
        );

        batch.update(
          doc(
            db,
            "games",
            gameId,
            "countries",
            move.defender.id,
          ),
          {
            soldiers: defenderRemaining,
          },
        );
      }

      await batch.commit();

      if (!mounted.current) return;

      void requestCommentary(
        move.attacker,
        move.defender,
        result,
      );

      await sleep(120);
    }

    if (!mounted.current) return;

    const finalBoard = await readCountries();

    if (!mounted.current) return;

    const finished =
      finalBoard.length > 0 &&
      (
        finalBoard.every((country) => country.isPlayer) ||
        finalBoard.every((country) => !country.isPlayer)
      );

    if (finished) return;

    const nextRound = round + 1;

    await updateDoc(doc(db, "games", gameId), {
      turnNumber: nextRound,
    });

    if (!mounted.current) return;

    reinforced.current = false;

    setRound(nextRound);
    setPhase("player-turn");

    addLog(`Round ${nextRound}. Your turn.`);
  }

  async function finishTurn(): Promise<void> {
    await runNpcTurns();

    if (mounted.current) {
      setAttackedThisTurn(false);
    }
  }

  async function executeAttack(
    attacker: Country,
    defender: Country,
  ): Promise<void> {
    if (!gameId) return;

    const result = await showExchange(attacker, defender);

    if (!mounted.current) return;

    const attackerRemaining =
      attacker.soldiers - result.atkLosses;

    const defenderRemaining =
      defender.soldiers - result.defLosses;

    const batch = writeBatch(db);

    batch.update(
      doc(db, "games", gameId, "countries", attacker.id),
      {
        soldiers: attackerRemaining,
      },
    );

    if (result.conquered) {
      const reward =
        GameEngine.calculateConquestReward(
          defender.soldiers,
        );

      batch.update(
        doc(db, "games", gameId, "countries", defender.id),
        {
          soldiers: reward,
          isPlayer: true,
          ownerId:
            auth.currentUser?.uid || attacker.ownerId,
        },
      );

      await batch.commit();

      if (!mounted.current) return;

      void requestCommentary(attacker, defender, result);

      setTransferData({
        from: {
          ...attacker,
          soldiers: attackerRemaining,
        },

        to: {
          ...defender,
          soldiers: reward,
        },

        max: Math.max(0, attackerRemaining - 1),
        reward,
      });

      setTransferAmount(0);
      setPhase("transfer");

      addLog(
        `${defender.name} conquered. ` +
          `Reward: ${reward}. Choose additional troops to transfer.`,
      );

      SoundEngine.victory();
    } else {
      batch.update(
        doc(db, "games", gameId, "countries", defender.id),
        {
          soldiers: defenderRemaining,
        },
      );

      await batch.commit();

      if (!mounted.current) return;

      void requestCommentary(attacker, defender, result);

      await finishTurn();
    }
  }

  async function confirmAttack(
    attackerId: string | null = selectedAtk,
    defenderId: string | null = targetId,
  ): Promise<void> {
    if (
      busy.current ||
      phase !== "player-turn" ||
      attackedThisTurn ||
      gameOutcome
    ) {
      return;
    }

    const attacker = countries.find(
      (country) => country.id === attackerId,
    );

    const defender = countries.find(
      (country) => country.id === defenderId,
    );

    if (
      !attacker ||
      !defender ||
      !attacker.isPlayer ||
      defender.isPlayer ||
      attacker.soldiers < 2
    ) {
      return;
    }

    busy.current = true;

    setPresenting(true);
    setAttackedThisTurn(true);
    setSelectedAtk(null);
    setTargetId(null);

    try {
      await executeAttack(attacker, defender);
    } catch (error: unknown) {
      console.error("Attack failed:", error);

      addLog(
        "Could not complete the move. Refresh to inspect the saved board.",
      );
    } finally {
      busy.current = false;

      MusicPlayer.setScene("silent");

      if (mounted.current) {
        setPresenting(false);
      }
    }
  }

  async function confirmTransfer(): Promise<void> {
    if (
      !gameId ||
      !transferData ||
      busy.current ||
      phase !== "transfer"
    ) {
      return;
    }

    if (
      !Number.isInteger(transferAmount) ||
      transferAmount < 0 ||
      transferAmount > transferData.max
    ) {
      addLog(
        "Choose a valid transfer and leave one soldier behind.",
      );
      return;
    }

    busy.current = true;
    setPresenting(true);

    try {
      const { from, to, reward } = transferData;

      const batch = writeBatch(db);

      batch.update(
        doc(db, "games", gameId, "countries", from.id),
        {
          soldiers: from.soldiers - transferAmount,
        },
      );

      batch.update(
        doc(db, "games", gameId, "countries", to.id),
        {
          soldiers: reward + transferAmount,
        },
      );

      await batch.commit();

      if (!mounted.current) return;

      addLog(
        `Transferred ${transferAmount} soldiers to ${to.name}.`,
      );

      setTransferData(null);

      await finishTurn();
    } catch (error: unknown) {
      console.error("Transfer or end-turn failed:", error);

      addLog(
        "Could not complete the transfer or end the turn. Refresh to inspect the saved board.",
      );
    } finally {
      busy.current = false;

      if (mounted.current) {
        setPresenting(false);
      }
    }
  }

  async function skipTurn(): Promise<void> {
    if (
      busy.current ||
      phase !== "player-turn" ||
      attackedThisTurn ||
      gameOutcome
    ) {
      return;
    }

    busy.current = true;

    setPresenting(true);
    setSelectedAtk(null);
    setTargetId(null);

    addLog("You skip your attack.");

    try {
      await finishTurn();
    } catch (error: unknown) {
      console.error("Skip turn failed:", error);
      addLog("Could not finish the turn.");
    } finally {
      busy.current = false;

      MusicPlayer.setScene("silent");

      if (mounted.current) {
        setPresenting(false);
      }
    }
  }

  if (!gameId) {
    return (
      <main className="day1-outcome">
        <h1>Invalid campaign link</h1>

        <button
          type="button"
          onClick={() => router.push("/lobby")}
        >
          Return to War Room
        </button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="day1-loading">
        Loading world…
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="day1-outcome">
        <h1>Could not open campaign</h1>
        <p>{pageError}</p>

        <button
          type="button"
          onClick={() => router.push("/lobby")}
        >
          Return to War Room
        </button>
      </main>
    );
  }

  if (
    gameOutcome &&
    phase !== "transfer" &&
    !presenting &&
    !battleAnimation?.active
  ) {
    return (
      <main className="day1-outcome">
        <h1>
          {gameOutcome === "victory"
            ? "Victory"
            : "Defeat"}
        </h1>

        <button
          type="button"
          onClick={() => router.push("/lobby")}
        >
          Return to War Room
        </button>
      </main>
    );
  }

  const controlsDisabled =
    presenting ||
    phase !== "player-turn" ||
    attackedThisTurn;

  const selectedCountry = countries.find(
    (country) => country.id === selectedAtk,
  );

  const targetCountry = countries.find(
    (country) => country.id === targetId,
  );

  return (
    <main className="day1-game">
      <div className="day1-container">
        <HowToPlayDialog
          open={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        <TransferDialog
          data={
            phase === "transfer"
              ? transferData
              : null
          }
          amount={transferAmount}
          busy={presenting}
          onChange={setTransferAmount}
          onConfirm={() => {
            void confirmTransfer();
          }}
        />

        {battleAnimation?.active && (
          <BattleTimeline
            key={battleAnimation.id}
            battleId={battleAnimation.id}
            fast={fastForward}
            onImpact={() => {
              const result = battleAnimation.dice;

              if (
                result &&
                result.attackerLoss +
                  result.defenderLoss >
                  0
              ) {
                SoundEngine.explosion();
              }
            }}
            onComplete={() => {
              battleDone.current?.();
            }}
          />
        )}

        <header className="day1-header">
          <div>
            <h1>World Command · Round {round}</h1>

            <p className="day1-subtitle">
              {phase === "transfer"
                ? "Choose your conquest transfer"
                : phase === "npc-turn"
                  ? "NPC nations are taking their turns"
                  : presenting
                    ? "Resolving your attack…"
                    : "Select your country, then click an enemy to attack"}
            </p>
          </div>

          <div className="day1-actions">
            <button
              type="button"
              disabled={
                presenting ||
                phase === "transfer"
              }
              onClick={() => setShowHowToPlay(true)}
            >
              How to play
            </button>

            <button
              type="button"
              aria-pressed={fastForward}
              onClick={() =>
                setFastForward((previous) => !previous)
              }
            >
              Speed: {fastForward ? "2.5×" : "1×"}
            </button>

            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => void skipTurn()}
            >
              Skip turn
            </button>

            <button
              type="button"
              onClick={() => router.push("/lobby")}
            >
              Exit
            </button>
          </div>
        </header>

        <nav
          className="game-country-strip"
          aria-label="Countries and soldier counts"
        >
          {countries.map((country: Country) => (
            <button
              key={country.id}
              type="button"
              disabled={controlsDisabled}
              className={
                selectedAtk === country.id
                  ? "selected"
                  : targetId === country.id
                    ? "targeted"
                    : ""
              }
              style={{
                borderBottomColor:
                  getFactionColor(country),
              }}
              onClick={() =>
                handleCountryClick(country.id)
              }
              aria-label={
                `${country.name}: ` +
                `${country.soldiers} soldiers`
              }
            >
              <span
                className="generated-flag"
                aria-hidden="true"
              >
                {countryFlag(country.id)}
              </span>

              <span>{country.name}</span>

              <strong>{country.soldiers}</strong>
            </button>
          ))}
        </nav>

        <section
          className="attack-command"
          aria-label="Attack selection"
        >
          <label>
            Attack from

            <select
              aria-label="Attacking country"
              value={selectedAtk || ""}
              disabled={controlsDisabled}
              onChange={(event) => {
                setSelectedAtk(
                  event.target.value || null,
                );

                setTargetId(null);
              }}
            >
              <option value="">
                Choose your country
              </option>

              {countries
                .filter(
                  (country) =>
                    country.isPlayer &&
                    country.soldiers >= 2,
                )
                .map((country) => (
                  <option
                    key={country.id}
                    value={country.id}
                  >
                    {country.name} · {country.soldiers}
                  </option>
                ))}
            </select>
          </label>

          <label>
            Target

            <select
              aria-label="Defending country"
              value={targetId || ""}
              disabled={
                controlsDisabled || !selectedAtk
              }
              onChange={(event) =>
                setTargetId(
                  event.target.value || null,
                )
              }
            >
              <option value="">
                Choose an enemy
              </option>

              {countries
                .filter(
                  (country) => !country.isPlayer,
                )
                .map((country) => (
                  <option
                    key={country.id}
                    value={country.id}
                  >
                    {country.name} · {country.soldiers}
                  </option>
                ))}
            </select>
          </label>

          <p>
            {selectedCountry
              ? (
                  `${selectedCountry.name} → ` +
                  (
                    targetCountry?.name ||
                    "click an enemy on the map"
                  )
                )
              : "Select your country on the map or use the dropdown."}
          </p>

          <button
            type="button"
            disabled={
              controlsDisabled ||
              !selectedCountry ||
              !targetCountry
            }
            onClick={() => void confirmAttack()}
          >
            Attack selected target
          </button>

          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => {
              setSelectedAtk(null);
              setTargetId(null);
            }}
          >
            Clear selection
          </button>
        </section>

        <div className="day1-battle-layout">
          <div>
            <RiskMap
              countries={countries}
              selectedAtk={selectedAtk}
              targetId={targetId}
              onCountryClick={handleCountryClick}
              battleAnimation={battleAnimation}
            />

            {battleAnimation && (
              <BattleScene
                animation={battleAnimation}
                countries={countries}
              />
            )}
          </div>

          <aside
            className="war-dock"
            aria-label="War correspondent"
          >
            <h2>War correspondent</h2>

            <div
              className="war-dock-feed"
              tabIndex={0}
              aria-label="Battle reports"
            >
              {messages.map(
                (
                  message: string,
                  index: number,
                ) => (
                  <div
                    key={index}
                    className="correspondent-text"
                  >
                    {message}
                  </div>
                ),
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}