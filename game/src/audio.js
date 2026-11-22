// Procedural Web Audio API synthesizer for Velvet & Voltage (zero external audio files).

export function createAudioEngine() {
  let ctx = null;
  let muted = false;
  let lastAlarmBeep = 0;

  function ensureContext() {
    if (muted) return null;
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, duration, type = 'sine', gainVal = 0.08, slideTo = null) {
    const audio = ensureContext();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  function noiseBurst(duration, cutoff = 900, gainVal = 0.06) {
    const audio = ensureContext();
    if (!audio) return;
    const sampleCount = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = audio.createGain();
    gain.gain.value = gainVal;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start();
  }

  return {
    unlock: ensureContext,
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    playEvent(name) {
      if (muted) return;
      if (name === 'step') tone(110, 0.045, 'triangle', 0.025, 65);
      else if (name === 'decoy') {
        tone(1480, 0.14, 'sine', 0.08, 1320);
        setTimeout(() => tone(1860, 0.12, 'sine', 0.05, 1600), 65);
      } else if (name === 'emp') {
        tone(760, 0.34, 'sawtooth', 0.09, 68);
      } else if (name === 'smoke') {
        noiseBurst(0.32, 720, 0.08);
      } else if (name === 'hack') {
        tone(640, 0.08, 'square', 0.05);
        setTimeout(() => tone(960, 0.12, 'square', 0.05), 75);
      } else if (name === 'unlock') {
        tone(340, 0.07, 'triangle', 0.07, 520);
      } else if (name === 'bonus_loot') {
        tone(587, 0.12, 'triangle', 0.07);
        setTimeout(() => tone(880, 0.16, 'triangle', 0.06), 70);
      } else if (name === 'primary_loot') {
        tone(523, 0.14, 'triangle', 0.08);
        setTimeout(() => tone(659, 0.14, 'triangle', 0.08), 80);
        setTimeout(() => tone(1046, 0.25, 'sine', 0.09), 160);
      } else if (name === 'extract') {
        tone(440, 0.16, 'triangle', 0.08);
        setTimeout(() => tone(554, 0.16, 'triangle', 0.08), 100);
        setTimeout(() => tone(659, 0.18, 'triangle', 0.08), 200);
        setTimeout(() => tone(880, 0.35, 'sine', 0.09), 300);
      } else if (name === 'lockdown') {
        tone(290, 0.28, 'sawtooth', 0.11, 180);
        setTimeout(() => tone(240, 0.34, 'sawtooth', 0.11, 140), 220);
      }
    },
    tickAlarm(alarmValue, elapsed) {
      if (muted || alarmValue < 32) return;
      const interval = alarmValue >= 65 ? 0.34 : 0.68;
      if (elapsed - lastAlarmBeep >= interval) {
        lastAlarmBeep = elapsed;
        tone(alarmValue >= 65 ? 880 : 620, 0.06, 'square', 0.032);
      }
    },
  };
}
