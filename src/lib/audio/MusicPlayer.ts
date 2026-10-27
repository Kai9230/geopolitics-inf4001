export class MusicPlayer {
  private static currentAudio: HTMLAudioElement | null = null;

  private static muted = false;

  // Master volume multiplies the volume supplied to play().
  private static masterVolume = 1;

  private static trackVolume = 0.3;

  private static initialised = false;

  private static listeners = new Set<() => void>();

  private static readonly STORAGE_KEY =
    "geopolitics-music-settings";

  // --------------------------------------------------
  // Load saved preferences once in the browser.
  // --------------------------------------------------

  private static initialise() {
    if (
      typeof window === "undefined" ||
      this.initialised
    ) {
      return;
    }

    this.initialised = true;

    try {
      const saved = localStorage.getItem(
        this.STORAGE_KEY,
      );

      if (!saved) return;

      const settings: unknown = JSON.parse(saved);

      if (
        typeof settings !== "object" ||
        settings === null
      ) {
        return;
      }

      const values = settings as {
        muted?: unknown;
        volume?: unknown;
      };

      if (typeof values.muted === "boolean") {
        this.muted = values.muted;
      }

      if (
        typeof values.volume === "number" &&
        Number.isFinite(values.volume)
      ) {
        this.masterVolume = Math.max(
          0,
          Math.min(1, values.volume),
        );
      }
    } catch {
      // Music still works if browser storage is unavailable.
    }
  }

  // --------------------------------------------------
  // Save preferences and update subscribed controls.
  // --------------------------------------------------

  private static saveSettings() {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          muted: this.muted,
          volume: this.masterVolume,
        }),
      );
    } catch {
      // Storage failure should not interrupt gameplay.
    }
  }

  private static notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  private static applyVolume() {
    if (!this.currentAudio) return;

    this.currentAudio.volume =
      this.trackVolume * this.masterVolume;

    this.currentAudio.muted = this.muted;
  }

  private static startPlayback() {
    if (
      !this.currentAudio ||
      this.muted ||
      this.masterVolume === 0
    ) {
      return;
    }

    // Browsers may require a click before allowing audio.
    void this.currentAudio.play().catch(() => {
      // A later user action can call resume().
    });
  }

  // --------------------------------------------------
  // Play or switch tracks.
  //
  // Existing calls remain compatible:
  // MusicPlayer.play("/sounds/login-theme.mp3", true, 0.3);
  // --------------------------------------------------

  static play(
    src: string,
    loop = true,
    volume = 0.3,
  ) {
    if (typeof window === "undefined") return;

    this.initialise();

    const trackVolume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : 0.3;

    const absoluteSrc = new URL(
      src,
      window.location.href,
    ).href;

    if (
      this.currentAudio?.src === absoluteSrc
    ) {
      this.trackVolume = trackVolume;
      this.currentAudio.loop = loop;

      this.applyVolume();
      this.startPlayback();

      return;
    }

    this.stop();

    const audio = new Audio(absoluteSrc);

    audio.loop = loop;
    audio.preload = "auto";

    this.currentAudio = audio;
    this.trackVolume = trackVolume;

    // Keep the requested track even when music is muted.
    this.applyVolume();
    this.startPlayback();
  }

  // --------------------------------------------------
  // Stop and release the current track.
  // Used when leaving a page.
  // --------------------------------------------------

  static stop() {
    if (!this.currentAudio) return;

    const audio = this.currentAudio;

    this.currentAudio = null;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  // --------------------------------------------------
  // Resume the remembered track.
  // Call from a user interaction when necessary.
  // --------------------------------------------------

  static resume() {
    if (typeof window === "undefined") return;

    this.initialise();
    this.applyVolume();
    this.startPlayback();
  }

  // --------------------------------------------------
  // Music on/off.
  // Muting pauses but does not forget the track.
  // --------------------------------------------------

  static setMuted(muted: boolean) {
    if (typeof window === "undefined") return;

    this.initialise();

    this.muted = muted;

    this.applyVolume();

    if (muted) {
      this.currentAudio?.pause();
    } else {
      this.startPlayback();
    }

    this.saveSettings();
    this.notify();
  }

  static toggleMute() {
    this.initialise();
    this.setMuted(!this.muted);

    return this.muted;
  }

  static isMuted() {
    this.initialise();

    return this.muted;
  }

  // --------------------------------------------------
  // Master volume: 0 = silent, 1 = full track volume.
  // --------------------------------------------------

  static setVolume(volume: number) {
    if (
      typeof window === "undefined" ||
      !Number.isFinite(volume)
    ) {
      return;
    }

    this.initialise();

    this.masterVolume = Math.max(
      0,
      Math.min(1, volume),
    );

    this.applyVolume();

    if (this.masterVolume === 0) {
      this.currentAudio?.pause();
    } else {
      this.startPlayback();
    }

    this.saveSettings();
    this.notify();
  }

  static getVolume() {
    this.initialise();

    return this.masterVolume;
  }

  // --------------------------------------------------
  // Let a React audio-control component follow changes.
  // --------------------------------------------------

  static subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}