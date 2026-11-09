// Runs on the browser's audio-render thread. No microphone samples leave the device.
class CajonOnsetDetector extends AudioWorkletProcessor {
  constructor() {
    super();
    this.prev = 0;
    this.hpPrev = 0;
    this.fast = 0;
    this.slow = 0;
    this.noise = 0.0005;
    this.lastFrame = -sampleRate;
    this.sensitivity = 'normal';
    this.pre = new Float32Array(Math.ceil(sampleRate * 0.012));
    this.preAt = 0;
    this.capture = null;
    this.captureAt = 0;
    this.total = Math.ceil(sampleRate * 0.09);
    this.port.onmessage = e => {
      if (e.data && e.data.sensitivity) this.sensitivity = e.data.sensitivity;
    };
  }

  process(inputs, outputs) {
    // Zero the connected output to keep processing active without speaker feedback.
    for (const output of outputs) for (const channel of output) channel.fill(0);
    const channels = inputs[0];
    if (!channels || !channels.length) return true;
    const length = channels[0].length;
    for (let i = 0; i < length; i++) {
      let x = 0;
      for (let c = 0; c < channels.length; c++) x += channels[c][i] || 0;
      x /= channels.length;
      const hp = x - this.prev + 0.995 * this.hpPrev;
      this.prev = x;
      this.hpPrev = hp;
      const energy = Math.abs(hp);
      this.fast = this.fast * 0.985 + energy * 0.015;
      this.slow = this.slow * 0.9995 + energy * 0.0005;
      const frame = currentFrame + i;

      if (this.capture) {
        this.capture[this.captureAt++] = x;
        if (this.captureAt >= this.capture.length) {
          const samples = this.capture;
          this.capture = null;
          this.port.postMessage({type:'hit', frame:this.lastFrame, rate:sampleRate, samples}, [samples.buffer]);
        }
      }

      const min = {low:0.010, normal:0.005, high:0.0025}[this.sensitivity] || 0.005;
      const ratio = {low:6, normal:4.5, high:3}[this.sensitivity] || 4.5;
      const refractory = Math.ceil(sampleRate * 0.13);
      if (!this.capture && frame - this.lastFrame > refractory &&
          this.fast > Math.max(min, this.noise * ratio) &&
          this.fast > this.slow * 1.7) {
        this.lastFrame = frame;
        this.capture = new Float32Array(this.total + this.pre.length);
        // Preserve a little audio before the attack so the feature window is stable.
        for (let p = 0; p < this.pre.length; p++) {
          this.capture[p] = this.pre[(this.preAt + p) % this.pre.length];
        }
        this.captureAt = this.pre.length;
      }
      this.pre[this.preAt] = x;
      this.preAt = (this.preAt + 1) % this.pre.length;
      if (this.fast < this.noise * 2.5 || this.noise < 0.0003) {
        this.noise = Math.max(0.00015, this.noise * 0.99995 + this.fast * 0.00005);
      }
    }
    return true;
  }
}

registerProcessor('cajon-onset-detector', CajonOnsetDetector);
