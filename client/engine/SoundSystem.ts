export class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicInterval: any = null;
  private currentNoteIndex: number = 0;
  private musicIntensity: 'normal' | 'panic' | 'boss' = 'normal';

  constructor() {
    // AudioContext will initialize upon first user gesture
  }

  private initCtx(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Dynamic Procedural Sea Shanty Music ---

  public startSeaShantyMusic(): void {
    if (this.isMusicPlaying || this.isMuted) return;
    this.initCtx();
    this.isMusicPlaying = true;
    this.currentNoteIndex = 0;

    const shantyMelody = [
      // "Drunken Sailor / Fisherman Shanty" (Frequencies in Hz)
      { note: 293.66, dur: 0.25 }, // D4
      { note: 293.66, dur: 0.25 }, // D4
      { note: 293.66, dur: 0.25 }, // D4
      { note: 293.66, dur: 0.25 }, // D4
      { note: 329.63, dur: 0.25 }, // E4
      { note: 349.23, dur: 0.25 }, // F4
      { note: 392.00, dur: 0.50 }, // G4
      { note: 440.00, dur: 0.25 }, // A4
      { note: 392.00, dur: 0.25 }, // G4
      { note: 349.23, dur: 0.25 }, // F4
      { note: 329.63, dur: 0.25 }, // E4
      { note: 293.66, dur: 0.50 }, // D4
      { note: 261.63, dur: 0.25 }, // C4
      { note: 293.66, dur: 0.75 }  // D4
    ];

    const bossMelody = [
      // Boss Kraken Tension Stabs (D Minor / Tritone)
      { note: 146.83, dur: 0.2 }, // D3
      { note: 155.56, dur: 0.2 }, // Eb3
      { note: 220.00, dur: 0.2 }, // A3
      { note: 207.65, dur: 0.3 }, // Ab3
      { note: 146.83, dur: 0.4 }, // D3
      { note: 293.66, dur: 0.2 }, // D4
      { note: 277.18, dur: 0.4 }  // C#4
    ];

    const tickMelody = () => {
      if (!this.isMusicPlaying || !this.ctx || this.isMuted) return;

      const isBoss = this.musicIntensity === 'boss';
      const isPanic = this.musicIntensity === 'panic';
      const melody = isBoss ? bossMelody : shantyMelody;
      const item = melody[this.currentNoteIndex % melody.length];
      this.currentNoteIndex++;

      const tempoMod = isPanic ? 0.68 : isBoss ? 0.82 : 1.0;
      const duration = item.dur * tempoMod;

      this.playShantyNote(item.note, duration, isBoss);

      const nextTimeMs = duration * 1000;
      this.musicInterval = setTimeout(tickMelody, nextTimeMs);
    };

    tickMelody();
  }

  public setMusicIntensity(intensity: 'normal' | 'panic' | 'boss'): void {
    this.musicIntensity = intensity;
  }

  public stopMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  private playShantyNote(freq: number, duration: number, isBoss: boolean): void {
    if (!this.ctx || this.isMuted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isBoss ? 'sawtooth' : 'triangle';
    subOsc.type = 'sine';

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    subOsc.frequency.setValueAtTime(freq / 2, ctx.currentTime);

    // Accordion / Nautical vibrato
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(5.5, ctx.currentTime);
    vibratoGain.gain.setValueAtTime(freq * 0.015, ctx.currentTime);
    vibrato.connect(osc.frequency);
    vibrato.start();

    const vol = isBoss ? 0.09 : 0.07;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration * 0.95);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    subOsc.start();
    osc.stop(ctx.currentTime + duration);
    subOsc.stop(ctx.currentTime + duration);
    vibrato.stop(ctx.currentTime + duration);
  }

  public play(sfxName: string): void {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      switch (sfxName) {
        case 'chop':
          this.playChopSound();
          break;
        case 'sizzle':
          this.playSizzleSound();
          break;
        case 'bubble':
          this.playBubbleSound();
          break;
        case 'slap':
          this.playSlapSound();
          break;
        case 'splash':
          this.playSplashSound();
          break;
        case 'pickup':
          this.playPickupSound();
          break;
        case 'drop':
          this.playDropSound();
          break;
        case 'throw':
          this.playThrowSound();
          break;
        case 'ding':
          this.playDingSound();
          break;
        case 'bell':
          this.playBellSound();
          break;
        case 'explosion':
          this.playExplosionSound();
          break;
        case 'squeegee':
          this.playSqueegeeSound();
          break;
        case 'bounty_ring':
          this.playNokiaBountyChime();
          break;
        case 'geiger':
          this.playGeigerClick();
          break;
        case 'bounty_complete':
          this.playVictoryJingle();
          break;
        case 'victory':
          this.playVictoryJingle();
          break;
      }
    } catch (e) {
      console.warn('AudioContext play error:', e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // --- Kitchen Sound Synthesizers ---

  private playChopSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  private playSizzleSound(): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();
  }

  private playBubbleSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  // --- Classic Action SFX ---

  private playSlapSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  private playSplashSound(): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  private playPickupSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  private playDropSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  private playThrowSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  private playDingSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  private playBellSound(): void {
    const ctx = this.ctx!;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.4);
    });
  }

  private playExplosionSound(): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.2));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  private playPhoneVibrate(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(90, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  private playVictoryJingle(): void {
    const ctx = this.ctx!;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.35);
    });
  }

  public playSqueegeeSound(): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Rubbery frequency sweep "whooo-o-op!"
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.Q.setValueAtTime(4.0, ctx.currentTime);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);

    // Trigger subtle haptic buzz on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  public playNokiaBountyChime(): void {
    const ctx = this.ctx!;
    // Retro monophonic secret mission beep: E5, D5, F#4, G#4
    const notes = [659.25, 587.33, 369.99, 415.30];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.10);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.10);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
  }

  public playGeigerClick(): void {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.005;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.001));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }
}
