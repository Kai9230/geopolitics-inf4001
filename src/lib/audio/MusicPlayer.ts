export class MusicPlayer {
  private static currentAudio: HTMLAudioElement | null = null;
  private static muted = false;

  static play(src: string, loop = true, volume = 0.3) {
    if (typeof window === "undefined" || this.muted) return;
    if (this.currentAudio && this.currentAudio.src.endsWith(src)) return;
    if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    audio.play().catch(() => {});
    this.currentAudio = audio;
  }

  static stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  static toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stop();
    return this.muted;
  }

  static isMuted() { return this.muted; }
}