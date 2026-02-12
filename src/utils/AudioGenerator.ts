export class AudioGenerator {
  private audioContext: AudioContext;

  constructor() {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();
  }

  playShoot() {
    const duration = 0.1;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      200,
      this.audioContext.currentTime + duration
    );

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playHit() {
    const duration = 0.15;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const noiseBuffer = this.createNoiseBuffer(duration);
    const noiseSource = this.audioContext.createBufferSource();

    noiseSource.buffer = noiseBuffer;
    oscillator.type = 'sawtooth';

    oscillator.connect(gainNode);
    noiseSource.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + duration);

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    noiseSource.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    noiseSource.stop(this.audioContext.currentTime + duration);
  }

  playDamage() {
    const duration = 0.3;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      100,
      this.audioContext.currentTime + duration
    );

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playTerminalGrow() {
    const duration = 0.5;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      300,
      this.audioContext.currentTime + duration / 2
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      150,
      this.audioContext.currentTime + duration
    );

    gainNode.gain.setValueAtTime(0.6, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playTerminalShrink() {
    const duration = 0.35;
    const t = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Descending tone — inverse of terminalGrow
    oscillator.frequency.setValueAtTime(300, t);
    oscillator.frequency.exponentialRampToValueAtTime(100, t + duration);

    gainNode.gain.setValueAtTime(0.25, t);
    gainNode.gain.linearRampToValueAtTime(0.01, t + duration);

    oscillator.start(t);
    oscillator.stop(t + duration);
  }

  playGameOver() {
    const duration = 1.0;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(55, this.audioContext.currentTime + duration);

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playLightning() {
    const duration = 0.12;
    const oscillator = this.audioContext.createOscillator();
    const noiseSource = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    noiseSource.buffer = this.createNoiseBuffer(duration);
    oscillator.type = 'sine';

    oscillator.connect(gainNode);
    noiseSource.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      400,
      this.audioContext.currentTime + duration
    );

    gainNode.gain.setValueAtTime(0.26, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    noiseSource.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    noiseSource.stop(this.audioContext.currentTime + duration);
  }

  private laserGain: GainNode | null = null;
  private laserOsc: OscillatorNode | null = null;
  private laserLfo: OscillatorNode | null = null;

  playLaser() {
    this.stopLaser();

    const duration = 3.0;
    const oscillator = this.audioContext.createOscillator();
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(120, this.audioContext.currentTime);

    // LFO for wobble
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(8, this.audioContext.currentTime);
    lfoGain.gain.setValueAtTime(15, this.audioContext.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Fade in, sustain, fade out
    gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime + duration - 0.1);
    gainNode.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    lfo.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
    lfo.stop(this.audioContext.currentTime + duration);

    this.laserOsc = oscillator;
    this.laserLfo = lfo;
    this.laserGain = gainNode;

    oscillator.onended = () => {
      this.laserOsc = null;
      this.laserLfo = null;
      this.laserGain = null;
    };
  }

  stopLaser() {
    if (this.laserGain) {
      this.laserGain.gain.cancelScheduledValues(this.audioContext.currentTime);
      this.laserGain.gain.setValueAtTime(this.laserGain.gain.value, this.audioContext.currentTime);
      this.laserGain.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
    }
    if (this.laserOsc) {
      this.laserOsc.stop(this.audioContext.currentTime + 0.05);
      this.laserOsc = null;
    }
    if (this.laserLfo) {
      this.laserLfo.stop(this.audioContext.currentTime + 0.05);
      this.laserLfo = null;
    }
    this.laserGain = null;
  }

  playShieldHit() {
    const duration = 0.12;
    const t = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + duration);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.start(t);
    osc.stop(t + duration);
  }

  playShieldDestroy() {
    const duration = 0.35;
    const t = this.audioContext.currentTime;

    // Metallic shatter: noise + descending tone
    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = this.createNoiseBuffer(duration);
    const noiseGain = this.audioContext.createGain();
    noiseSource.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);
    noiseGain.gain.setValueAtTime(0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'square';
    osc.connect(oscGain);
    oscGain.connect(this.audioContext.destination);
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + duration);
    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noiseSource.start(t);
    noiseSource.stop(t + duration);
    osc.start(t);
    osc.stop(t + duration);
  }

  playOrbitalPip() {
    const duration = 0.06;
    const t = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + duration);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.start(t);
    osc.stop(t + duration);
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 0.2 - 0.1;
    }

    return buffer;
  }
}
