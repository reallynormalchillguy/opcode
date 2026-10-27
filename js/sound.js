/* Opcode — sound from programs that call screen_audio. Browsers only allow
   sound after a click, so start() is called from the Run button. */
(function () {
  'use strict';

  let ctx = null;
  let gain = null;
  let node = null;
  let muted = false;
  const waiting = [];
  const stats = { underruns: 0 };   // times the sound ran dry (for testing)

  function start() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !window.AudioWorkletNode) return;     // no sound in this browser
    try {
      ctx = new AC({ sampleRate: 44100, latencyHint: 'interactive' });
    } catch (e) {
      try { ctx = new AC(); } catch (e2) { ctx = null; return; }
    }
    gain = ctx.createGain();
    gain.gain.value = muted ? 0 : 1;
    gain.connect(ctx.destination);
    ctx.audioWorklet.addModule('js/sound-worklet.js').then(() => {
      node = new AudioWorkletNode(ctx, 'opcode-sound', { numberOfInputs: 0, outputChannelCount: [1] });
      node.connect(gain);
      node.port.onmessage = (e) => { stats.underruns = e.data.underrun; };
      for (const s of waiting.splice(0)) node.port.postMessage(s, [s.buffer]);
    }).catch(() => { node = null; });
  }

  function push(samples) {
    if (!ctx) return;
    if (node) node.port.postMessage(samples, [samples.buffer]);
    else if (waiting.length < 8) waiting.push(samples);
  }

  // A run ended: forget what is waiting.
  function reset() {
    waiting.length = 0;
    if (node) node.port.postMessage('reset');
  }

  function setMuted(m) {
    muted = !!m;
    if (gain) gain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }

  window.Sound = { start, push, reset, setMuted, stats, get muted() { return muted; } };
})();
