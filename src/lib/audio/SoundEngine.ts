type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class SoundEngine {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static muted = false;
  private static volume = 1;
  private static loaded = false;
  private static listeners = new Set<() => void>();

  private static load() {
    if (typeof window === "undefined" || this.loaded) return;

    this.loaded = true;

    try {
      const settings = JSON.parse(
        localStorage.getItem("geopolitics-effects-settings") || "null",
      );

      if (settings) {
        if (typeof settings.muted === "boolean") {
          this.muted = settings.muted;
        }

        if (
          typeof settings.volume === "number" &&
          Number.isFinite(settings.volume)
        ) {
          this.volume = Math.max(0, Math.min(1, settings.volume));
        }
      }
    } catch {
      // Sound can still work without saved preferences.
    }
  }

  private static save() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "geopolitics-effects-settings",
          JSON.stringify({
            muted: this.muted,
            volume: this.volume,
          }),
        );
      } catch {
        // Ignore unavailable storage.
      }
    }

    this.listeners.forEach((listener) => listener());
  }

  private static apply() {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.015,
      );
    }
  }

  private static init() {
    if (typeof window === "undefined") return;

    this.load();

    if (this.muted || document.hidden) return;

    if (!this.ctx || this.ctx.state === "closed") {
      const Context =
        window.AudioContext ||
        (window as WebkitWindow).webkitAudioContext;

      if (!Context) return;

      try {
        this.ctx = new Context();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.apply();
      } catch {
        return;
      }
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
  }

  static async unlock(): Promise<boolean> {
    this.init();

    if (!this.ctx || this.muted) return false;

    try {
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }

      return this.ctx.state === "running";
    } catch {
      return false;
    }
  }

  static setMuted(muted: boolean) {
    this.load();
    this.muted = muted;
    this.apply();
    this.save();
  }

  static toggleMute() {
    this.load();
    this.setMuted(!this.muted);
    return this.muted;
  }

  static isMuted() {
    this.load();
    return this.muted;
  }

  static setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;

    this.load();
    this.volume = Math.max(0, Math.min(1, volume));
    this.apply();
    this.save();
  }

  static getVolume() {
    this.load();
    return this.volume;
  }

  static subscribe(listener: () => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private static tone(
    type: OscillatorType,
    frequency: number,
    endFrequency: number,
    duration: number,
    strength: number,
    delay = 0,
  ) {
    this.init();

    const context = this.ctx;
    const master = this.masterGain;

    if (
      !context ||
      !master ||
      this.muted ||
      document.hidden ||
      context.state !== "running"
    ) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      start + duration,
    );

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(strength, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      start + duration,
    );

    oscillator.connect(gain);
    gain.connect(master);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };

    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  private static noise(
    duration: number,
    frequency: number,
    strength: number,
    filterType: BiquadFilterType = "lowpass",
  ) {
    this.init();

    const context = this.ctx;
    const master = this.masterGain;

    if (
      !context ||
      !master ||
      this.muted ||
      document.hidden ||
      context.state !== "running"
    ) {
      return;
    }

    const size = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, size, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < size; index += 1) {
      data[index] =
        (Math.random() * 2 - 1) *
        Math.pow(1 - index / size, 2);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    gain.gain.value = strength;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    source.start();
  }

  static diceRoll() {
    this.noise(0.6, 1200, 0.3, "highpass");
  }

  static aircraft() {
    this.noise(1.1, 1600, 0.25);
  }

  static explosion() {
    this.noise(0.65, 800, 0.3);
  }

  static clash() {
    this.tone("square", 180, 40, 0.3, 0.2);
  }

  static death() {
    this.tone("sawtooth", 350, 60, 0.4, 0.12);
  }

  static turnStart() {
    [523.25, 659.25, 783.99].forEach(
      (frequency, index) => {
        this.tone(
          "triangle",
          frequency,
          frequency,
          0.32,
          0.14,
          index * 0.14,
        );
      },
    );
  }

  static click() {
    this.tone("sine", 700, 300, 0.08, 0.08);
  }

  static reinforce() {
    [392, 523.25].forEach((frequency, index) => {
      this.tone(
        "triangle",
        frequency,
        frequency,
        0.4,
        0.15,
        index * 0.15,
      );
    });
  }

  static victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach(
      (frequency, index) => {
        this.tone(
          "triangle",
          frequency,
          frequency,
          0.6,
          0.16,
          index * 0.13,
        );
      },
    );
  }
}