"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { MusicPlayer } from "../lib/audio/MusicPlayer";
import { SoundEngine } from "../lib/audio/SoundEngine";

// Stable subscriptions for React.
const subscribeMusic = (
  listener: () => void,
) => MusicPlayer.subscribe(listener);

const subscribeEffects = (
  listener: () => void,
) => SoundEngine.subscribe(listener);

// Strings give React a stable snapshot value.
const getMusicSnapshot = () =>
  `${MusicPlayer.isMuted()}|${MusicPlayer.getVolume()}`;

const getEffectsSnapshot = () =>
  `${SoundEngine.isMuted()}|${SoundEngine.getVolume()}`;

const getServerSnapshot = () => "false|1";

export default function AudioControls() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const containerRef =
    useRef<HTMLDivElement>(null);

  const panelId = useId();

  const musicSnapshot =
    useSyncExternalStore(
      subscribeMusic,
      getMusicSnapshot,
      getServerSnapshot,
    );

  const effectsSnapshot =
    useSyncExternalStore(
      subscribeEffects,
      getEffectsSnapshot,
      getServerSnapshot,
    );

  const [
    musicMutedValue,
    musicVolumeValue,
  ] = musicSnapshot.split("|");

  const [
    effectsMutedValue,
    effectsVolumeValue,
  ] = effectsSnapshot.split("|");

  const musicMuted =
    musicMutedValue === "true";

  const effectsMuted =
    effectsMutedValue === "true";

  const musicVolume =
    Number(musicVolumeValue);

  const effectsVolume =
    Number(effectsVolumeValue);

  const allMuted =
    musicMuted && effectsMuted;

  // Unlock browser audio following the first interaction.
  useEffect(() => {
    const unlockAudio = () => {
      document.removeEventListener(
        "pointerdown",
        unlockAudio,
      );

      document.removeEventListener(
        "keydown",
        unlockAudio,
      );

      MusicPlayer.resume();

      void SoundEngine.unlock();
    };

    document.addEventListener(
      "pointerdown",
      unlockAudio,
    );

    document.addEventListener(
      "keydown",
      unlockAudio,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        unlockAudio,
      );

      document.removeEventListener(
        "keydown",
        unlockAudio,
      );
    };
  }, []);

  // Close the panel with Escape or a click outside it.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(
          event.target,
        )
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  function toggleMusic() {
    setMessage("");

    MusicPlayer.setMuted(
      !musicMuted,
    );
  }

  async function toggleEffects() {
    setMessage("");

    const nextMuted =
      !effectsMuted;

    SoundEngine.setMuted(
      nextMuted,
    );

    if (!nextMuted) {
      const unlocked =
        await SoundEngine.unlock();

      if (!unlocked) {
        setMessage(
          "Sound effects could not start. Try switching them off and on again.",
        );

        return;
      }

      SoundEngine.click();
    }
  }

  function muteEverything() {
    MusicPlayer.setMuted(true);
    SoundEngine.setMuted(true);

    setMessage("");
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-100"
    >
      {open && (
        <section
          id={panelId}
          aria-label="Audio settings"
          className="mb-3 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#f4c430]/30 bg-[#09111f]/95 p-5 text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#f4c430]">
                Audio settings
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                Your preferences are saved.
              </p>
            </div>

            <button
              type="button"
              aria-label="Close audio settings"
              onClick={() =>
                setOpen(false)
              }
              className="rounded-lg border border-white/10 px-2 py-1 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Music
                </span>

                <button
                  type="button"
                  aria-label={
                    musicMuted
                      ? "Turn music on"
                      : "Turn music off"
                  }
                  aria-pressed={
                    !musicMuted
                  }
                  onClick={toggleMusic}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                    musicMuted
                      ? "border-white/15 bg-black/30 text-gray-400"
                      : "border-[#f4c430]/50 bg-[#f4c430]/15 text-[#f4c430]"
                  }`}
                >
                  {musicMuted
                    ? "OFF"
                    : "ON"}
                </button>
              </div>

              <label className="block text-xs text-gray-400">
                Music volume:{" "}
                {Math.round(
                  musicVolume * 100,
                )}
                %

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(event) => {
                    MusicPlayer.setVolume(
                      Number(
                        event.target.value,
                      ),
                    );
                  }}
                  className="mt-2 block w-full cursor-pointer accent-[#f4c430]"
                />
              </label>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Sound effects
                </span>

                <button
                  type="button"
                  aria-label={
                    effectsMuted
                      ? "Turn sound effects on"
                      : "Turn sound effects off"
                  }
                  aria-pressed={
                    !effectsMuted
                  }
                  onClick={() => {
                    void toggleEffects();
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                    effectsMuted
                      ? "border-white/15 bg-black/30 text-gray-400"
                      : "border-[#f4c430]/50 bg-[#f4c430]/15 text-[#f4c430]"
                  }`}
                >
                  {effectsMuted
                    ? "OFF"
                    : "ON"}
                </button>
              </div>

              <label className="block text-xs text-gray-400">
                Effects volume:{" "}
                {Math.round(
                  effectsVolume * 100,
                )}
                %

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={effectsVolume}
                  onChange={(event) => {
                    SoundEngine.setVolume(
                      Number(
                        event.target.value,
                      ),
                    );
                  }}
                  className="mt-2 block w-full cursor-pointer accent-[#f4c430]"
                />
              </label>

              <p className="mt-2 text-[11px] text-gray-500">
                Dice, battles, clicks,
                reinforcements and victory.
              </p>
            </div>

            <button
              type="button"
              onClick={muteEverything}
              disabled={allMuted}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs font-bold text-gray-300 hover:border-[#f4c430]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mute everything
            </button>
          </div>

          {message && (
            <p
              role="status"
              className="mt-4 text-xs text-amber-300"
            >
              {message}
            </p>
          )}
        </section>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() =>
            setOpen(!open)
          }
          className="flex items-center gap-2 rounded-xl border border-[#f4c430]/40 bg-[#09111f]/95 px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#f4c430] shadow-xl backdrop-blur-xl hover:bg-[#152139]"
        >
          <span aria-hidden="true">
            {allMuted ? "🔇" : "♫"}
          </span>

          Audio
        </button>
      </div>
    </div>
  );
}