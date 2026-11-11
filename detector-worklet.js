// All microphone samples stay on this device. Onsets use audio sample timestamps.
class CajonOnsetDetector extends AudioWorkletProcessor {
  constructor() {
    super();
    this.prev = 0; this.hpPrev = 0; this.fast = 0; this.slow = 0;
    this.noise = .0005; this.lastFrame = -sampleRate;
    this.lastStrength = 0; this.sensitivity = 'normal';
    this.pre = new Float32Array(Math.ceil(sampleRate * .012));
    this.preAt = 0; this.capture = null; this.captureAt = 0;
    this.total = Math.ceil(sampleRate * .09);
    this.history = new Float32Array(Math.ceil(sampleRate * .012));
    this.historyAt = 0; this.quietFrames = sampleRate; this.armed = true;
    this.reportFrame = 0; this.minSince = 1;
    this.port.onmessage = e => { if (e.data?.sensitivity) this.sensitivity = e.data.sensitivity; };
  }
  process(inputs, outputs) {
    for (const output of outputs) for (const channel of output) channel.fill(0);
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let x = 0;
      for (let c = 0; c < channels.length; c++) x += channels[c][i] || 0;
      x /= channels.length;
      const hp = x - this.prev + .995 * this.hpPrev;
      this.prev = x; this.hpPrev = hp;
      this.fast = this.fast * .985 + Math.abs(hp) * .015;
      this.slow = this.slow * .9995 + Math.abs(hp) * .0005;
      const frame = currentFrame + i;
      const prior = this.history[this.historyAt];
      this.history[this.historyAt] = this.fast;
      this.historyAt = (this.historyAt + 1) % this.history.length;
      const min = {low:.010,normal:.005,high:.0025}[this.sensitivity] || .005;
      const ratio = {low:6,normal:4.5,high:3}[this.sensitivity] || 4.5;
      const threshold = Math.max(min,this.noise * ratio);
      if (this.capture) {
        this.capture[this.captureAt++] = x;
        if (this.captureAt >= this.capture.length) {
          const samples = this.capture;
          this.capture = null;
          this.port.postMessage({type:'hit',frame:this.lastFrame,rate:sampleRate,samples},[samples.buffer]);
        }
      }
      const quiet = this.fast < Math.max(threshold * .55,this.slow * 1.15);
      this.quietFrames = quiet ? this.quietFrames + 1 : 0;
      if (this.quietFrames > sampleRate * .021) this.armed = true;
      this.minSince = Math.min(this.minSince,this.fast);
      const age = frame - this.lastFrame;
      const rising = this.fast > prior * 1.55 && this.fast > this.minSince * 1.8;
      const rearmed = this.armed;
      const fastRetrigger = age > sampleRate * .09 && rising && this.fast > this.lastStrength * .75;
      const candidate = this.fast > threshold && this.fast > this.slow * 1.9 && rising;
      if (!this.capture && age > sampleRate * .085 && candidate && (rearmed || fastRetrigger || age > sampleRate * .45)) {
        this.lastFrame = frame;
        this.lastStrength = this.fast; this.minSince = this.fast; this.quietFrames = 0; this.armed = false;
        this.capture = new Float32Array(this.total + this.pre.length);
        for (let p = 0; p < this.pre.length; p++) this.capture[p] = this.pre[(this.preAt + p) % this.pre.length];
        this.captureAt = this.pre.length;
        this.port.postMessage({type:'onset',frame,rate:sampleRate,strength:this.fast,noise:this.noise});
      } else if (!this.capture && candidate && age > sampleRate * .075 && age < sampleRate * .42 &&
                 frame - this.reportFrame > sampleRate * .075) {
        this.reportFrame = frame;
        this.port.postMessage({type:'rejected',frame,rate:sampleRate,reason:'resonance',strength:this.fast});
      }
      this.pre[this.preAt] = x;
      this.preAt = (this.preAt + 1) % this.pre.length;
      if (quiet || this.noise < .0003) this.noise = Math.max(.00015,this.noise * .99995 + this.fast * .00005);
      if (frame % 1024 === 0) this.port.postMessage({type:'level',frame,rate:sampleRate,fast:this.fast,noise:this.noise,threshold});
    }
    return true;
  }
}
registerProcessor('cajon-onset-detector', CajonOnsetDetector);
