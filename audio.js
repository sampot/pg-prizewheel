export class WheelAudio {
  constructor() {
    this.enabled = true;
    this.sounds = {
      spin: new Audio("./assets/sfx/chip-lay-1.ogg"),
      tick: new Audio("./assets/sfx/chipsCollide1.ogg"),
      win: new Audio("./assets/sfx/chips-stack-1.ogg"),
    };
  }
  setEnabled(enabled) { this.enabled = enabled; }
  play(name) {
    if (!this.enabled) return;
    const sound = this.sounds[name];
    sound.currentTime = 0;
    void sound.play().catch(() => {});
  }
}
