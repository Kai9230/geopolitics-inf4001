export type MusicScene = "login" | "battle" | "silent";

export class MusicPlayer {
  private static audio: HTMLAudioElement | null = null;
  private static muted = false;
  private static masterVolume = 1;
  private static trackVolume = 0.3;
  private static scene: MusicScene = "silent";
  private static loaded = false;
  private static listeners = new Set<() => void>();

  private static readonly key = "geopolitics-music-settings";

  private static loadSettings() {
    if (typeof window === "undefined" || this.loaded) return;

    this.loaded = true;
    this.scene = window.location.pathname === "/" ? "login" : "silent";

    try {
      const data = JSON.parse(localStorage.getItem(this.key) || "null");

      if (data) {
        if (typeof data.muted === "boolean") {
          this.muted = data.muted;
        }

        if (
          typeof data.volume === "number" &&
          Number.isFinite(data.volume)
        ) {
          this.masterVolume = Math.max(0, Math.min(1, data.volume));
        }
      }
    } catch {
      // Storage may be unavailable in restricted browser modes.
    }
  }

  private static save() {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({
          muted: this.muted,
          volume: this.masterVolume,
        }),
      );
    } catch {
      // Audio remains usable even if preferences cannot be saved.
    }
  }

  private static notify() {
    this.listeners.forEach((listener) => listener());
  }

  private static apply() {
    if (!this.audio) return;

    this.audio.muted = this.muted;
    this.audio.volume = this.trackVolume * this.masterVolume;
  }

  private static start() {
    if (
      typeof window === "undefined" ||
      document.hidden ||
      this.muted ||
      this.masterVolume === 0 ||
      !this.audio ||
      this.scene === "silent"
    ) {
      return;
    }

    void this.audio.play().catch(() => {
      // A later user interaction can unlock browser audio.
    });
  }

  static setScene(scene: MusicScene) {
    if (typeof window === "undefined") return;

    this.loadSettings();
    this.scene = scene;

    if (scene === "silent") {
      this.stop();
      this.notify();
      return;
    }

    this.play(
      scene === "login"
        ? "/sounds/login-theme.mp3"
        : "/sounds/battle-theme.mp3",
      true,
      scene === "login" ? 0.3 : 0.4,
    );

    this.notify();
  }

  static getScene() {
    this.loadSettings();
    return this.scene;
  }

  static play(src: string, loop = true, volume = 0.3) {
    if (typeof window === "undefined") return;

    this.loadSettings();

    const allowed =
      this.scene === "login"
        ? "/sounds/login-theme.mp3"
        : this.scene === "battle"
          ? "/sounds/battle-theme.mp3"
          : null;

    // Ignore old ambient/victory calls that violate the scene policy.
    if (src !== allowed) return;

    this.trackVolume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : 0.3;

    const url = new URL(src, window.location.href).href;

    if (this.audio?.src !== url) {
      this.stop();
      this.audio = new Audio(url);
      this.audio.preload = "auto";
    }

    this.audio.loop = loop;
    this.apply();
    this.start();
  }

  static pause() {
    this.audio?.pause();
  }

  static stop() {
    if (!this.audio) return;

    const audio = this.audio;
    this.audio = null;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  static resume() {
    if (typeof window === "undefined") return;

    this.loadSettings();
    this.apply();
    this.start();
  }

  static setMuted(muted: boolean) {
    this.loadSettings();
    this.muted = muted;
    this.apply();

    if (muted) {
      this.pause();
    } else {
      this.start();
    }

    this.save();
    this.notify();
  }

  static toggleMute() {
    this.loadSettings();
    this.setMuted(!this.muted);
    return this.muted;
  }

  static isMuted() {
    this.loadSettings();
    return this.muted;
  }

  static setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;

    this.loadSettings();
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.apply();

    if (this.masterVolume === 0) {
      this.pause();
    } else {
      this.start();
    }

    this.save();
    this.notify();
  }

  static getVolume() {
    this.loadSettings();
    return this.masterVolume;
  }

  static subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}