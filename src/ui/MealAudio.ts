// Opt-in sound, created only by a user gesture. One short voice per grouped meal.
export class MealAudio {
  private audio?: AudioContext;
  private last = 0;
  enabled = false;
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.audio ??= new AudioContext();
      void this.audio.resume();
    }
    return this.enabled;
  }
  play(count: number, bump = false) {
    if (
      !this.enabled ||
      !this.audio ||
      this.audio.currentTime - this.last < 0.12
    )
      return;
    this.last = this.audio.currentTime;
    const oscillator = this.audio.createOscillator(),
      gain = this.audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      bump ? 110 : 330 + Math.min(12, count) * 28,
      this.last,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      bump ? 70 : 520 + Math.min(12, count) * 30,
      this.last + 0.1,
    );
    gain.gain.setValueAtTime(0.0001, this.last);
    gain.gain.exponentialRampToValueAtTime(0.065, this.last + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.last + 0.15);
    oscillator.connect(gain);
    gain.connect(this.audio.destination);
    oscillator.start();
    oscillator.stop(this.last + 0.16);
  }
}
