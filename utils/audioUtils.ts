
export class SoundManager {
  private ctx: AudioContext | null = null;
  private spinOsc: OscillatorNode | null = null;
  private spinGain: GainNode | null = null;
  private spinFilter: BiquadFilterNode | null = null;
  private lastCollisionTime = 0;

  // Initialize context on user interaction
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSpin() {
    this.init();
    if (!this.ctx || this.spinOsc) return;

    // Create Motor Hum
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Sawtooth wave filtered down creates a mechanical rumble
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, t);
    
    // LFO for modulation (uneven spinning sound)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 5; // 5Hz variation
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    // Lowpass filter to muffle the harsh sawtooth
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, t);
    
    // Fade in
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 1); 

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    this.spinOsc = osc;
    this.spinGain = gain;
    this.spinFilter = filter;
  }

  stopSpin() {
    if (this.ctx && this.spinGain && this.spinOsc) {
      const t = this.ctx.currentTime;
      // Fade out
      this.spinGain.gain.setValueAtTime(this.spinGain.gain.value, t);
      this.spinGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      
      const oldOsc = this.spinOsc;
      setTimeout(() => {
        try { oldOsc.stop(); } catch(e){}
      }, 600);
      
      this.spinOsc = null;
      this.spinGain = null;
    }
  }

  playLand() {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Wooden Thud / Hollow Impact
    // Sine wave sweeping down quickly
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

    // Short envelope
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.01); 
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(t + 0.25);
  }

  playCollision(impactVelocity: number) {
    if (!this.ctx) return;
    
    // Throttle collisions to avoid noise (max 1 sound every 60ms)
    const now = Date.now();
    if (now - this.lastCollisionTime < 60) return;
    this.lastCollisionTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Hard plastic click
    osc.type = 'triangle';
    // Randomize pitch slightly for realism
    osc.frequency.setValueAtTime(800 + Math.random() * 400, t); 

    // Volume depends on impact
    const vol = Math.min(Math.max(impactVelocity * 0.01, 0.01), 0.1);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(t + 0.06);
  }
}

export const soundManager = new SoundManager();
