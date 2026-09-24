// Web Audio API emergency alarm generator

let audioCtx: AudioContext | null = null;
let isAlarmPlaying = false;
let alarmIntervalId: number | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a single urgent emergency alarm burst (3 rapid high-pitched dual-tone beeps)
 */
export function playAlarmBurst(volume: number = 0.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Create 3 rapid urgent emergency beeps: [beep, beep, beep]
    const beeps = [
      { start: 0.0, end: 0.18, freq1: 960, freq2: 1440 },
      { start: 0.24, end: 0.42, freq1: 960, freq2: 1440 },
      { start: 0.48, end: 0.66, freq1: 1100, freq2: 1650 },
    ];

    beeps.forEach(({ start, end, freq1, freq2 }) => {
      const startTime = now + start;
      const endTime = now + end;

      // Primary oscillator
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq1, startTime);
      osc1.frequency.exponentialRampToValueAtTime(freq2, endTime);

      // Sub-harmonic oscillator for rich attention-grabbing alarm tone
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq1 * 0.5, startTime);

      // Gain Envelope
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.03);
      gainNode.gain.setValueAtTime(volume, endTime - 0.03);
      gainNode.gain.linearRampToValueAtTime(0.001, endTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(endTime);
      osc2.stop(endTime);
    });
  } catch (err) {
    console.warn('Web Audio alarm playback warning:', err);
  }
}

/**
 * Starts continuous emergency alarm sequence (plays burst every 2.5s)
 */
export function startEmergencyAlarm() {
  if (isAlarmPlaying) return;
  isAlarmPlaying = true;

  // Immediate first burst
  playAlarmBurst(0.6);

  // Setup one-time gesture listeners to resume AudioContext if browser blocked autoplay
  const resumeAndPlay = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playAlarmBurst(0.6);
      });
    }
    window.removeEventListener('click', resumeAndPlay);
    window.removeEventListener('keydown', resumeAndPlay);
    window.removeEventListener('touchstart', resumeAndPlay);
  };
  window.addEventListener('click', resumeAndPlay, { once: true });
  window.addEventListener('keydown', resumeAndPlay, { once: true });
  window.addEventListener('touchstart', resumeAndPlay, { once: true });

  // Repeat alarm bursts every 2.5 seconds while emergency screen is visible
  alarmIntervalId = window.setInterval(() => {
    if (isAlarmPlaying) {
      playAlarmBurst(0.6);
    }
  }, 2500);
}

/**
 * Immediately stops the emergency alarm
 */
export function stopEmergencyAlarm() {
  isAlarmPlaying = false;
  if (alarmIntervalId !== null) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}
