type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class SoundEngine {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;

  private static muted = false;
  private static volume = 1;
  private static initialised = false;

  private static listeners = new Set<() => void>();

  private static activeSources =
    new Set<AudioScheduledSourceNode>();

  private static readonly STORAGE_KEY =
    "geopolitics-effects-settings";

  // --------------------------------------------------
  // Saved preferences
  // --------------------------------------------------

  private static loadSettings() {
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

      const parsed: unknown = JSON.parse(saved);

      if (
        typeof parsed !== "object" ||
        parsed === null
      ) {
        return;
      }

      const settings = parsed as {
        muted?: unknown;
        volume?: unknown;
      };

      if (typeof settings.muted === "boolean") {
        this.muted = settings.muted;
      }

      if (
        typeof settings.volume === "number" &&
        Number.isFinite(settings.volume)
      ) {
        this.volume = Math.max(
          0,
          Math.min(1, settings.volume),
        );
      }
    } catch {
      // Audio can still work without localStorage.
    }
  }

  private static saveSettings() {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          muted: this.muted,
          volume: this.volume,
        }),
      );
    } catch {
      // Do not interrupt gameplay if storage is blocked.
    }
  }

  private static notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  // --------------------------------------------------
  // Audio context and master volume
  // --------------------------------------------------

  private static init(): AudioContext | null {
    if (typeof window === "undefined") return null;

    this.loadSettings();

    if (this.muted) return null;

    if (!this.ctx || this.ctx.state === "closed") {
      const browser = window as WebkitWindow;

      const AudioContextClass =
        window.AudioContext ||
        browser.webkitAudioContext;

      if (!AudioContextClass) return null;

      try {
        this.ctx = new AudioContextClass();

        this.masterGain = this.ctx.createGain();

        this.masterGain.gain.value =
          this.muted ? 0 : this.volume;

        this.masterGain.connect(
          this.ctx.destination,
        );
      } catch {
        this.ctx = null;
        this.masterGain = null;

        return null;
      }
    }

    return this.ctx;
  }

  /**
   * Call following a user interaction to allow effects.
   */
  static async unlock(): Promise<boolean> {
    const context = this.init();

    if (!context) return false;

    try {
      if (context.state === "suspended") {
        await context.resume();
      }

      return context.state === "running";
    } catch {
      return false;
    }
  }

  private static prepare(): AudioContext | null {
    this.loadSettings();

    if (this.muted || this.volume === 0) {
      return null;
    }

    const context = this.init();

    if (!context) return null;

    if (context.state !== "running") {
      // Try to unlock, but do not queue old effects
      // while the browser is blocking playback.
      void context.resume().catch(() => {});

      return null;
    }

    return context;
  }

  private static applyMasterVolume() {
    if (!this.ctx || !this.masterGain) return;

    this.masterGain.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.ctx.currentTime,
      0.015,
    );
  }

  private static stopActiveSounds() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have finished.
      }
    });

    this.activeSources.clear();
  }

  // --------------------------------------------------
  // Public settings
  // --------------------------------------------------

  static setMuted(muted: boolean) {
    this.loadSettings();

    this.muted = muted;

    this.applyMasterVolume();

    if (muted) {
      this.stopActiveSounds();
    }

    this.saveSettings();
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

    this.volume = Math.max(
      0,
      Math.min(1, volume),
    );

    this.applyMasterVolume();

    if (this.volume === 0) {
      this.stopActiveSounds();
    }

    this.saveSettings();
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

  // --------------------------------------------------
  // Shared tone generator
  // --------------------------------------------------

  private static tone(
    frequency: number,
    endFrequency: number,
    duration: number,
    strength: number,
    type: OscillatorType,
    delay = 0,
  ) {
    const context = this.prepare();
    const master = this.masterGain;

    if (!context || !master) return;

    const oscillator =
      context.createOscillator();

    const envelope =
      context.createGain();

    const start =
      context.currentTime + delay;

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
      frequency,
      start,
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      start + duration,
    );

    envelope.gain.setValueAtTime(
      0.001,
      start,
    );

    envelope.gain.linearRampToValueAtTime(
      strength,
      start + Math.min(0.02, duration / 4),
    );

    envelope.gain.exponentialRampToValueAtTime(
      0.001,
      start + duration,
    );

    oscillator.connect(envelope);
    envelope.connect(master);

    this.activeSources.add(oscillator);

    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();

      this.activeSources.delete(oscillator);
    };

    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  // --------------------------------------------------
  // Existing game effects
  // --------------------------------------------------

  static diceRoll() {
    const context = this.prepare();
    const master = this.masterGain;

    if (!context || !master) return;

    const duration = 0.6;

    const size = Math.floor(
      context.sampleRate * duration,
    );

    const buffer = context.createBuffer(
      1,
      size,
      context.sampleRate,
    );

    const samples =
      buffer.getChannelData(0);

    for (let i = 0; i < size; i++) {
      samples[i] =
        (Math.random() * 2 - 1) *
        Math.pow(1 - i / size, 2);
    }

    const source =
      context.createBufferSource();

    const filter =
      context.createBiquadFilter();

    const gain =
      context.createGain();

    source.buffer = buffer;

    filter.type = "highpass";
    filter.frequency.value = 1200;

    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    this.activeSources.add(source);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();

      this.activeSources.delete(source);
    };

    source.start();
  }

  static clash() {
    this.tone(
      180,
      40,
      0.3,
      0.3,
      "square",
    );
  }

  static death() {
    this.tone(
      350,
      60,
      0.4,
      0.15,
      "sawtooth",
    );
  }

  static victory() {
    [
      523.25,
      659.25,
      783.99,
      1046.5,
    ].forEach((frequency, index) => {
      this.tone(
        frequency,
        frequency,
        0.6,
        0.2,
        "triangle",
        index * 0.13,
      );
    });
  }

  static click() {
    this.tone(
      700,
      300,
      0.08,
      0.08,
      "sine",
    );
  }

  static reinforce() {
    [392, 523.25].forEach(
      (frequency, index) => {
        this.tone(
          frequency,
          frequency,
          0.4,
          0.15,
          "triangle",
          index * 0.15,
        );
      },
    );
  }
}