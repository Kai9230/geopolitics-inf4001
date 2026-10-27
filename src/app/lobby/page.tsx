"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../../lib/firebase/config";
import { GameRepository } from "../../lib/db/GameRepository";
import { GameEngine } from "../../lib/engine/GameEngine";
import { MusicPlayer } from "../../lib/audio/MusicPlayer";

import type { Game } from "../../types";

export default function LobbyPage() {
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingDelete, setPendingDelete] =
    useState<Game | null>(null);

  const [deleted, setDeleted] =
    useState<Game | null>(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.push("/");
          return;
        }

        try {
          const savedGames =
            await GameRepository.getUserGames(user.uid);

          if (active) setGames(savedGames);
        } catch {
          if (active) {
            setError(
              "Could not load your campaigns. Please refresh.",
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  async function startNewGame(): Promise<void> {
    const user = auth.currentUser;

    if (!user) return;

    setError("");
    setLoading(true);

    try {
      const gameId = crypto.randomUUID();

      const initialCountries =
        GameEngine.generateInitialCountries();

      await GameRepository.createGame(
        gameId,
        user.uid,
        initialCountries,
      );

      router.push(`/game/${gameId}`);
    } catch {
      setError(
        "Could not create campaign. Please try again.",
      );
      setLoading(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete || deleting) return;

    const campaign = pendingDelete;

    setDeleting(true);
    setError("");

    try {
      await GameRepository.deleteFromHistory(
        campaign.id,
      );

      setGames((previous) =>
        previous.filter(
          (game) => game.id !== campaign.id,
        ),
      );

      setDeleted(campaign);
      setPendingDelete(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not delete campaign.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function undoDelete(): Promise<void> {
    const user = auth.currentUser;

    if (!deleted || deleting || !user) return;

    setDeleting(true);
    setError("");

    try {
      await GameRepository.restoreToHistory(
        deleted.id,
      );

      const savedGames =
        await GameRepository.getUserGames(user.uid);

      setGames(savedGames);
      setDeleted(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not restore campaign.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function logout(): Promise<void> {
    try {
      MusicPlayer.stop();
      await signOut(auth);
      router.push("/");
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#03050a] text-[#f4c430]">
        Loading command center…
      </main>
    );
  }

  return (
    <main className="war-room-page text-gray-100 p-4 md:p-8">
  <div className="war-room-aurora" aria-hidden="true">
    <div className="war-room-glow war-room-gold" />
    <div className="war-room-glow war-room-blue" />
  </div>

  <div className="war-room-content max-w-5xl mx-auto pt-10">
        <header className="flex justify-between items-center gap-4 mb-10 border-b border-yellow-500/30 pb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-[#f4c430]">
              WAR ROOM
            </h1>

            <p className="mt-3 text-sm text-gray-400">
              Resume a campaign or launch a new invasion.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="px-4 py-3 rounded-lg border border-white/20 hover:border-red-400"
          >
            Logout
          </button>
        </header>

        <button
          type="button"
          onClick={() => void startNewGame()}
          className="w-full mb-8 p-5 rounded-xl bg-[#f4c430] text-black font-black text-lg hover:bg-yellow-300"
        >
          ⚔ Launch New Campaign
        </button>

        {error && (
          <p
            role="alert"
            className="mb-5 p-4 rounded-lg border border-red-400/40 bg-red-950/30 text-red-200"
          >
            {error}
          </p>
        )}

        {deleted && (
          <div
            role="status"
            className="mb-5 p-4 rounded-lg border border-white/20 bg-white/5"
          >
            <p className="break-all">
              Campaign {deleted.id} removed from history.
            </p>

            <button
              type="button"
              disabled={deleting}
              onClick={() => void undoDelete()}
              className="mt-2 text-yellow-300 underline disabled:opacity-40"
            >
              Undo
            </button>
          </div>
        )}

        {pendingDelete && (
          <section
            aria-label="Confirm campaign deletion"
            className="mb-6 p-6 rounded-xl border border-red-400/40 bg-red-950/30"
          >
            <h2 className="font-bold break-all">
              Delete campaign {pendingDelete.id} from history?
            </h2>

            <p className="my-3 text-sm text-gray-300">
              This removes it from your campaign list.
              You can undo this after deleting.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                autoFocus
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="px-4 py-3 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-40"
              >
                {deleting
                  ? "Deleting…"
                  : "Delete campaign"}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                className="px-4 py-3 rounded-lg border border-white/30 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        <h2 className="mb-4 font-bold text-[#f4c430]">
          CAMPAIGN HISTORY
        </h2>

        {games.length === 0 && (
          <p className="p-6 rounded-xl border border-white/10 bg-white/5 text-gray-400">
            No campaigns found. Launch a new one to begin.
          </p>
        )}

        <div className="space-y-4">
          {games.map((game: Game) => (
            <article
              key={game.id}
              className="flex flex-col md:flex-row justify-between md:items-center gap-5 p-6 rounded-xl border border-white/15 bg-[#0b1422]"
            >
              <div className="min-w-0">
                <h3 className="font-bold text-[#f4c430] break-all">
                  CAMPAIGN: {game.id.toUpperCase()}
                </h3>

                <p className="mt-2 text-sm text-gray-400">
                  Turn {game.turnNumber} · Started{" "}
                  {new Date(
                    game.createdAt,
                  ).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/game/${game.id}`)
                  }
                  className="px-5 py-3 rounded-lg border border-yellow-400/40 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                >
                  Resume
                </button>

                <button
                  type="button"
                  aria-label={
                    `Delete campaign ${game.id}`
                  }
                  onClick={() => {
                    setError("");
                    setPendingDelete(game);
                  }}
                  className="px-5 py-3 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}