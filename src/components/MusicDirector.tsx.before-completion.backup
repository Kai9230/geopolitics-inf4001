"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { MusicPlayer } from "../lib/audio/MusicPlayer";
import { SoundEngine } from "../lib/audio/SoundEngine";

export default function MusicDirector() {
  const pathname = usePathname();

  useEffect(() => {
    MusicPlayer.setScene(
      pathname.startsWith("/game/")
        ? "battle"
        : pathname === "/"
          ? "login"
          : "silent",
    );

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

    const click = (
      event: MouseEvent,
    ) => {
      if (
        !(event.target instanceof Element)
      ) {
        return;
      }

      const control =
        event.target.closest(
          "button,a",
        );

      if (
        !control ||
        control.matches(
          ":disabled",
        )
      ) {
        return;
      }

      SoundEngine.click();
    };

    document.addEventListener(
      "pointerdown",
      unlock,
    );

    document.addEventListener(
      "keydown",
      unlock,
    );

    document.addEventListener(
      "click",
      click,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        unlock,
      );

      document.removeEventListener(
        "keydown",
        unlock,
      );

      document.removeEventListener(
        "click",
        click,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      MusicPlayer.setScene(
        "silent",
      );
    };
  }, [pathname]);

  return null;
}