import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  analyser: AnalyserNode | null;
  active: boolean;
  bars?: number;
  className?: string;
}

/**
 * Renders a real-time bar-style waveform driven by an AnalyserNode.
 * When inactive it renders idle bars that gently pulse.
 */
export function VoiceWaveform({ analyser, active, bars = 28, className }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sync canvas resolution to its display size for crisp bars.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const buffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let phase = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Sample either from the analyser, or generate idle values.
      const values: number[] = new Array(bars);
      if (active && analyser && buffer) {
        analyser.getByteFrequencyData(buffer);
        // Down-sample frequency bins to `bars` buckets.
        const step = Math.floor(buffer.length / bars) || 1;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += buffer[i * step + j] || 0;
          values[i] = sum / step / 255; // normalised 0..1
        }
      } else {
        phase += 0.06;
        for (let i = 0; i < bars; i++) {
          values[i] = 0.08 + 0.04 * Math.sin(phase + i * 0.4);
        }
      }

      // Read theme colors from CSS vars so we stay on-brand.
      const styles = getComputedStyle(canvas);
      const primary = styles.getPropertyValue("--primary").trim() || "200 100% 60%";
      const accent = styles.getPropertyValue("--accent").trim() || primary;

      const gap = 2;
      const barWidth = (w - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        const v = Math.max(0.04, values[i]);
        const barH = v * h;
        const x = i * (barWidth + gap);
        const y = (h - barH) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, `oklch(${primary})`);
        grad.addColorStop(1, `oklch(${accent})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        const r = Math.min(barWidth / 2, 3);
        // Rounded rect (with fallback for older browsers).
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(x, y, barWidth, barH, r);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barH);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [analyser, active, bars]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
