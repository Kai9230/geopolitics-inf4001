"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MusicPlayer } from "../lib/audio/MusicPlayer";
import { SoundEngine } from "../lib/audio/SoundEngine";

export default function MusicDirector() {
  const pathname = usePathname();

  useEffect(() => {
    MusicPlayer.setScene(pathname === "/" ? "login" : "silent");

    const unlock = () => {
      MusicPlayer.resume();
      void SoundEngine.unlock();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        MusicPlayer.pause();
      } else {
        MusicPlayer.resume();
      }
    };

    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      MusicPlayer.setScene("silent");
    };
  }, [pathname]);

  return null;
}