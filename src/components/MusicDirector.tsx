

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { MusicPlayer } from "../lib/audio/MusicPlayer";
import { SoundEngine } from "../lib/audio/SoundEngine";

const subscribe = (listener: () => void) =>
  MusicPlayer.subscribe(listener);

const snapshot = () => MusicPlayer.getStatus();
const serverSnapshot = () => "idle" as const;

export default function MusicDirector() {
  const pathname = usePathname();

  const status = useSyncExternalStore(
    subscribe,
    snapshot,
    serverSnapshot
  );

  useEffect(() => {
    const scene = pathname.startsWith("/game/")
      ? "battle"
      : "login";

    MusicPlayer.setScene(scene);

    // Recover after any old page-local cleanup stops music.
    const frame = requestAnimationFrame(() => {
      MusicPlayer.setScene(scene);
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const unlock = () => {
      MusicPlayer.resume();
      void SoundEngine.unlock();
    };

    const visible = () => {
      if (document.hidden) {
        MusicPlayer.pause();
      } else {
        MusicPlayer.resume();
      }
    };

    const click = (event: MouseEvent) => {
      const control =
        event.target instanceof Element
          ? event.target.closest("button,a")
          : null;

      if (control && !control.matches(":disabled")) {
        SoundEngine.click();
      }
    };

    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", click);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pageshow", unlock);

    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pageshow", unlock);
    };
  }, []);

  if (status !== "blocked" && status !== "error") {
    return null;
  }

  return (
    <button
      type="button"
      className="fixed bottom-20 right-4 z-100 rounded-xl border border-[#f4c430]/40 bg-[#09111f] px-4 py-3 text-xs font-bold text-[#f4c430]"
      onClick={() => MusicPlayer.resume()}
    >
      {status === "blocked"
        ? "♫ Enable music"
        : "♫ Retry music"}
    </button>
  );
}
// "use client";

// import { useEffect } from "react";
// import { usePathname } from "next/navigation";

// import { MusicPlayer } from "../lib/audio/MusicPlayer";
// import { SoundEngine } from "../lib/audio/SoundEngine";

// export default function MusicDirector() {
//   const pathname = usePathname();

//   useEffect(() => {
//     MusicPlayer.setScene(pathname.startsWith("/game/") ? "battle" : "login");

//     const unlock = () => {
//       MusicPlayer.resume();
//       void SoundEngine.unlock();
//     };

//     const handleVisibility = () => {
//       if (document.hidden) {
//         MusicPlayer.pause();
//       } else {
//         MusicPlayer.resume();
//       }
//     };

//     const click = (
//       event: MouseEvent,
//     ) => {
//       if (
//         !(event.target instanceof Element)
//       ) {
//         return;
//       }

//       const control =
//         event.target.closest(
//           "button,a",
//         );

//       if (
//         !control ||
//         control.matches(
//           ":disabled",
//         )
//       ) {
//         return;
//       }

//       SoundEngine.click();
//     };

//     document.addEventListener(
//       "pointerdown",
//       unlock,
//     );

//     document.addEventListener(
//       "keydown",
//       unlock,
//     );

//     document.addEventListener(
//       "click",
//       click,
//     );

//     document.addEventListener(
//       "visibilitychange",
//       handleVisibility,
//     );

//     return () => {
//       document.removeEventListener(
//         "pointerdown",
//         unlock,
//       );

//       document.removeEventListener(
//         "keydown",
//         unlock,
//       );

//       document.removeEventListener(
//         "click",
//         click,
//       );

//       document.removeEventListener(
//         "visibilitychange",
//         handleVisibility,
//       );

//       // The next route selects its track; preserve playback across lobby/login.
//     };
//   }, [pathname]);

//   return null;
// }