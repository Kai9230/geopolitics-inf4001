type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export class SoundEngine {
  private static ctx: AudioContext | null = null;

  private static init() {
    if (!this.ctx) {
      const w = window as WebkitWindow;
      const Ctx = window.AudioContext || w.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  static diceRoll() {
    this.init(); if (!this.ctx) return;
    const size = this.ctx.sampleRate * 0.6;
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / size, 2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1200;
    const g = this.ctx.createGain(); g.gain.value = 0.3;
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    src.start();
  }

  static clash() {
    this.init(); if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(180, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + 0.3);
  }

  static death() {
    this.init(); if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(350, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + 0.4);
  }

  static victory() {
    this.init(); if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = this.ctx!.createOscillator(), g = this.ctx!.createGain();
      o.type = "triangle"; o.frequency.value = freq;
      const s = this.ctx!.currentTime + i * 0.13;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.2, s + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, s + 0.6);
      o.connect(g); g.connect(this.ctx!.destination);
      o.start(s); o.stop(s + 0.6);
    });
  }

  static click() {
    this.init(); if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(700, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + 0.08);
  }

  static reinforce() {
    this.init(); if (!this.ctx) return;
    [392, 523.25].forEach((freq, i) => {
      const o = this.ctx!.createOscillator(), g = this.ctx!.createGain();
      o.type = "triangle"; o.frequency.value = freq;
      const s = this.ctx!.currentTime + i * 0.15;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.15, s + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, s + 0.4);
      o.connect(g); g.connect(this.ctx!.destination);
      o.start(s); o.stop(s + 0.4);
    });
  }
}