export type MusicScene = "login" | "battle" | "silent";
type Status = "idle" | "playing" | "blocked" | "error" | "paused" | "muted";

export class MusicPlayer {
  private static audio: HTMLAudioElement | null = null;
  private static scene: MusicScene = "silent";
  private static muted = false;
  private static volume = 1;
  private static trackVolume = 0.3;
  private static loaded = false;
  private static status: Status = "idle";
  private static listeners = new Set<() => void>();
  private static readonly key = "geopolitics-music-settings";

  private static notify() {
    this.listeners.forEach(listener => listener());
  }

  private static setStatus(status: Status) {
    if (this.status !== status) {
      this.status = status;
      this.notify();
    }
  }

  private static loadSettings() {
    if (typeof window === "undefined" || this.loaded) return;

    this.loaded = true;
    this.scene = window.location.pathname.startsWith("/game/")
      ? "battle"
      : "login";

    try {
      const saved = JSON.parse(
        localStorage.getItem(this.key) || "null"
      );

      if (typeof saved?.muted === "boolean") {
        this.muted = saved.muted;
      }

      if (
        typeof saved?.volume === "number" &&
        Number.isFinite(saved.volume)
      ) {
        this.volume = Math.max(0, Math.min(1, saved.volume));
      }
    } catch {
      // Storage is optional.
    }
  }

  private static save() {
    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({
          muted: this.muted,
          volume: this.volume,
        })
      );
    } catch {
      // Storage is optional.
    }
  }

  private static ensure() {
    if (
      typeof window === "undefined" ||
      this.scene === "silent"
    ) {
      return null;
    }

    // Keep the same element across route and track changes.
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "metadata";
    }

    const src = new URL(
      this.scene === "battle"
        ? "/sounds/battle-theme.mp3"
        : "/sounds/login-theme.mp3",
      window.location.href
    ).href;

    if (this.audio.src !== src) {
      this.audio.pause();
      this.audio.src = src;
    }

    this.audio.loop = true;
    this.audio.muted = this.muted;
    this.audio.volume = this.volume * this.trackVolume;

    return this.audio;
  }

  static resume() {
    if (typeof window === "undefined") return;

    this.loadSettings();

    const audio = this.ensure();
    if (!audio) return;

    if (this.muted || this.volume === 0) {
      audio.pause();
      this.setStatus("muted");
      return;
    }

    if (document.hidden) {
      this.pause();
      return;
    }

    if (!audio.paused) {
      this.setStatus("playing");
      return;
    }

    const requestedSrc = audio.src;

    void audio.play().then(() => {
      if (audio.src === requestedSrc && !audio.paused) {
        this.setStatus("playing");
      }
    }).catch((error: unknown) => {
      if (
        audio.src !== requestedSrc ||
        this.scene === "silent" ||
        this.muted
      ) {
        return;
      }

      const name =
        error &&
        typeof error === "object" &&
        "name" in error
          ? String(error.name)
          : "";

      if (name === "AbortError") return;

      this.setStatus(
        name === "NotAllowedError" ? "blocked" : "error"
      );
    });
  }

  static setScene(scene: MusicScene) {
    if (typeof window === "undefined") return;

    this.loadSettings();
    this.scene = scene;
    this.trackVolume = scene === "battle" ? 0.18 : 0.3;

    if (scene === "silent") {
      this.pause();
      return;
    }

    this.resume();
  }

  static getScene() {
    this.loadSettings();
    return this.scene;
  }

  static getStatus() {
    return this.status;
  }

  static play(
    src: string,
    loop = true,
    volume = 0.3
  ) {
    this.loadSettings();

    const allowed =
      this.scene === "battle"
        ? "/sounds/battle-theme.mp3"
        : this.scene === "login"
          ? "/sounds/login-theme.mp3"
          : null;

    if (src !== allowed) return;

    this.trackVolume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : 0.3;

    const audio = this.ensure();
    if (audio) audio.loop = loop;

    this.resume();
  }

  static pause() {
    this.audio?.pause();
    this.setStatus("paused");
  }

  static stop() {
    // Preserve the unlocked element so resume can recover.
    this.pause();

    if (this.audio) {
      this.audio.currentTime = 0;
    }
  }

  static setMuted(muted: boolean) {
    this.loadSettings();
    this.muted = muted;
    this.save();
    this.resume();
    this.notify();
  }

  static toggleMute() {
    this.setMuted(!this.isMuted());
    return this.muted;
  }

  static isMuted() {
    this.loadSettings();
    return this.muted;
  }

  static setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;

    this.loadSettings();
    this.volume = Math.max(0, Math.min(1, volume));
    this.save();
    this.resume();
    this.notify();
  }

  static getVolume() {
    this.loadSettings();
    return this.volume;
  }

  static subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}