import { useCallback, useRef } from "react";

// Programmatic crisp tick sound using Web Audio API
function playTickSound(pitch: "low" | "mid" | "high" = "mid") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freqs = { low: 880, mid: 1200, high: 1760 };
    osc.frequency.value = freqs[pitch];
    osc.type = "sine";

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);

    // Cleanup
    setTimeout(() => {
      try { ctx.close(); } catch { /* noop */ }
    }, 200);
  } catch {
    // Audio not supported
  }
}

function hapticFeedback(pattern: number | number[] = 15) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export function useFeedback() {
  const enabled = useRef(true);

  const toggle = useCallback(() => {
    enabled.current = !enabled.current;
    return enabled.current;
  }, []);

  const check = useCallback(() => {
    if (!enabled.current) return;
    playTickSound("high");
    hapticFeedback(10);
  }, []);

  const uncheck = useCallback(() => {
    if (!enabled.current) return;
    playTickSound("low");
    hapticFeedback(5);
  }, []);

  const success = useCallback(() => {
    if (!enabled.current) return;
    playTickSound("high");
    setTimeout(() => playTickSound("mid"), 80);
    setTimeout(() => playTickSound("high"), 160);
    hapticFeedback([20, 30, 20]);
  }, []);

  const alert = useCallback(() => {
    if (!enabled.current) return;
    playTickSound("low");
    setTimeout(() => playTickSound("low"), 100);
    hapticFeedback([40, 60, 40]);
  }, []);

  return { check, uncheck, success, alert, toggle, enabled };
}
