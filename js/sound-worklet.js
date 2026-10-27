/* Opcode — the audio thread: plays the samples the page sends (44100 a
   second), from a small buffer that absorbs the jitter between frames. */
class OpcodeSound extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(16384);
    this.read = 0;
    this.write = 0;
    this.count = 0;                       // samples waiting
    this.step = 44100 / sampleRate;       // the context may run at 48000
    this.pos = 0;
    this.playing = false;
    this.last = 0;
    this.underruns = 0;
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d === 'reset') {
        this.read = this.write = this.count = 0;
        this.playing = false;
        return;
      }
      const len = this.buf.length;
      for (let i = 0; i < d.length; i++) {
        this.buf[this.write] = d[i];
        this.write = (this.write + 1) % len;
      }
      this.count = Math.min(len, this.count + d.length);
      if (this.count > 5880) {            // more than 8 frames behind: catch up
        const drop = this.count - 2205;
        this.read = (this.read + drop) % len;
        this.count -= drop;
      }
    };
  }

  process(inputs, outputs) {
    const out = outputs[0][0];
    const len = this.buf.length;
    if (!this.playing && this.count >= 1470) this.playing = true;   // start with 2 frames ready
    // The program's clock and the sound card's never agree exactly: play a
    // little faster when samples pile up and a little slower when they run
    // low (at most 1%, too little to hear), keeping about 3 frames waiting.
    const adjust = Math.max(-0.01, Math.min(0.01, 0.01 * (this.count - 2205) / 2205));
    const step = this.step * (1 + adjust);
    for (let i = 0; i < out.length; i++) {
      if (this.playing && this.count > 1) {
        const a = this.buf[this.read];
        const b = this.buf[(this.read + 1) % len];
        const v = a + (b - a) * this.pos;
        this.pos += step;
        while (this.pos >= 1) {
          this.pos -= 1;
          this.read = (this.read + 1) % len;
          this.count--;
        }
        this.last = v;
        out[i] = v;
      } else {
        if (this.playing) this.port.postMessage({ underrun: ++this.underruns });
        this.playing = false;             // ran dry: fade out instead of clicking, wait to refill
        this.last *= 0.995;
        out[i] = this.last;
      }
    }
    return true;
  }
}

registerProcessor('opcode-sound', OpcodeSound);
