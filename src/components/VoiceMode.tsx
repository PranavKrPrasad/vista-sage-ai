// Free live voice mode: Browser Web Speech API (SpeechRecognition + speechSynthesis).
// No API keys required. Works in Chrome/Edge/Safari.
import { useEffect, useRef, useState } from "react";
import { Mic, X, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/lib/assistant-client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  voiceId?: string; // ignored in free mode
  language?: string;
  tone?: string;
  memories?: string[];
  onTurn?: (userText: string, aiText: string) => void;
}

type State = "idle" | "listening" | "thinking" | "speaking";

export function VoiceMode({ open, onClose, language, tone, memories, onTurn }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("idle");
  const [partial, setPartial] = useState("");
  const [lastUser, setLastUser] = useState("");
  const [lastAi, setLastAi] = useState("");
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [supported, setSupported] = useState(true);

  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const closingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const stateRef = useRef<State>("idle");

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (open) start();
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopTts = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    utterRef.current = null;
  };

  const stop = () => {
    closingRef.current = true;
    stopTts();
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const startRecognition = () => {
    if (closingRef.current) return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = language === "hi" ? "hi-IN" : "en-US";

    let finalBuf = "";
    let lastResultAt = Date.now();
    let endTimer: number | null = null;

    const scheduleEnd = () => {
      if (endTimer) clearTimeout(endTimer);
      endTimer = window.setTimeout(() => {
        const text = finalBuf.trim();
        if (text && stateRef.current === "listening") {
          finalBuf = "";
          handleUtterance(text);
        }
      }, 900);
    };

    r.onresult = (e: any) => {
      lastResultAt = Date.now();
      // user spoke — interrupt TTS
      if (utterRef.current) stopTts();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalBuf += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      setPartial((finalBuf + interim).trim());
      scheduleEnd();
    };
    r.onerror = (e: any) => {
      if (e?.error === "not-allowed") {
        toast.error("Microphone access denied");
        onClose();
        return;
      }
    };
    r.onend = () => {
      if (closingRef.current) return;
      // auto-restart for continuous listening
      restartTimerRef.current = window.setTimeout(() => {
        try { r.start(); } catch {}
      }, 250);
    };

    recRef.current = r;
    try { r.start(); } catch {}
  };

  const start = async () => {
    closingRef.current = false;
    try {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setSupported(false);
        toast.error("Voice mode needs Chrome, Edge or Safari");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaRef.current = stream;

      // visualiser
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (closingRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        setLevel(sum / buf.length / 255);
        requestAnimationFrame(tick);
      };
      tick();

      setState("listening");
      startRecognition();
    } catch (e: any) {
      toast.error(e?.message || "Voice mode failed");
      onClose();
    }
  };

  const speakBrowser = (text: string) => {
    return new Promise<void>((resolve) => {
      try {
        const synth = window.speechSynthesis;
        if (!synth) { resolve(); return; }
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = language === "hi" ? "hi-IN" : "en-US";
        u.rate = 1;
        u.pitch = 1;
        // pick a matching voice if available
        const voices = synth.getVoices();
        const match = voices.find((v) => v.lang?.toLowerCase().startsWith(u.lang.toLowerCase().split("-")[0]));
        if (match) u.voice = match;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        utterRef.current = u;
        synth.speak(u);
      } catch { resolve(); }
    });
  };

  const handleUtterance = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLastUser(trimmed);
    setPartial("");
    setState("thinking");
    historyRef.current.push({ role: "user", content: trimmed });
    let acc = "";
    try {
      await streamChat({
        messages: historyRef.current,
        language,
        tone,
        memories,
        onDelta: (c) => { acc += c; },
      });
      historyRef.current.push({ role: "assistant", content: acc });
      setLastAi(acc);
      onTurn?.(trimmed, acc);

      if (!muted && acc.trim()) {
        setState("speaking");
        // Strip markdown / latex for cleaner speech
        const clean = acc
          .replace(/```[\s\S]*?```/g, "")
          .replace(/\$\$[\s\S]*?\$\$/g, "")
          .replace(/\$[^$]*\$/g, "")
          .replace(/[*_#`>~]/g, "")
          .trim();
        await speakBrowser(clean || acc);
      }
      if (!closingRef.current) setState("listening");
    } catch (e: any) {
      toast.error(e?.message || "Reply failed");
      if (!closingRef.current) setState("listening");
    }
  };

  if (!open) return null;

  const orbScale = 1 + level * 0.6 + (state === "speaking" ? 0.15 : 0) + (state === "listening" ? 0.05 : 0);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl">
      <div className="absolute right-4 top-4 flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => setMuted((m) => { if (!m) stopTts(); return !m; })} title={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} title="Close">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative grid h-72 w-72 place-items-center">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent opacity-30 blur-3xl transition-transform duration-150"
          style={{ transform: `scale(${orbScale})` }}
        />
        <div
          className="grid h-44 w-44 place-items-center rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_60px_rgba(34,197,94,0.6)] transition-transform duration-150"
          style={{ transform: `scale(${orbScale})` }}
        >
          {state === "thinking" ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
          ) : (
            <Mic className="h-12 w-12 text-primary-foreground" />
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
          {state === "listening" && t.listening}
          {state === "thinking" && t.thinking}
          {state === "speaking" && t.speaking}
          {state === "idle" && "Idle"}
        </p>
        <p className="mt-3 min-h-[1.5rem] max-w-md px-6 text-base text-foreground/90">{partial || lastUser || t.tapToSpeak}</p>
        {lastAi && (
          <p className="mt-4 max-w-xl px-6 text-sm text-muted-foreground line-clamp-3">{lastAi}</p>
        )}
        {!supported && (
          <p className="mt-4 max-w-md px-6 text-xs text-destructive">
            Your browser doesn't support free voice. Use Chrome, Edge or Safari.
          </p>
        )}
        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground/60">Free voice · no API key</p>
      </div>
    </div>
  );
}
