// Live voice mode: Deepgram Streaming STT + ElevenLabs TTS.
import { useEffect, useRef, useState } from "react";
import { Mic, X, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { streamChat, speak } from "@/lib/assistant-client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Props {
  open: boolean;
  onClose: () => void;
  voiceId?: string;
  language?: string;
  tone?: string;
  memories?: string[];
  onTurn?: (userText: string, aiText: string) => void;
}

type State = "idle" | "connecting" | "listening" | "thinking" | "speaking";

export function VoiceMode({ open, onClose, voiceId, language, tone, memories, onTurn }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("idle");
  const [partial, setPartial] = useState("");
  const [lastUser, setLastUser] = useState("");
  const [lastAi, setLastAi] = useState("");
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const closingRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    if (open) start();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stopTts = () => {
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch {}
      ttsAudioRef.current = null;
    }
  };

  const stop = () => {
    closingRef.current = true;
    stopTts();
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    try { recorderRef.current?.stop(); } catch {}
    recorderRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const start = async () => {
    closingRef.current = false;
    setState("connecting");
    try {
      // 1) Get ephemeral Deepgram key
      const tokRes = await fetch(`${SUPABASE_URL}/functions/v1/deepgram-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!tokRes.ok) throw new Error("Voice key error");
      const { key } = await tokRes.json();

      // 2) Get mic
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

      // 3) Deepgram WS — Hindi+English bilingual via "multi"
      const lang = language === "hi" ? "multi" : language === "en" ? "en" : "multi";
      const url =
        `wss://api.deepgram.com/v1/listen?model=nova-3&language=${lang}` +
        `&interim_results=true&smart_format=true&punctuate=true&endpointing=600&vad_events=true`;
      const ws = new WebSocket(url, ["token", key]);
      wsRef.current = ws;

      ws.onopen = () => {
        setState("listening");
        const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        recorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === 1) ws.send(e.data);
        };
        mr.start(250);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "Results") {
            const alt = data.channel?.alternatives?.[0];
            if (!alt) return;
            const text = alt.transcript;
            if (!text) return;
            if (data.is_final) {
              finalTextRef.current = (finalTextRef.current + " " + text).trim();
              setPartial(finalTextRef.current);
              if (data.speech_final) {
                handleUtterance(finalTextRef.current);
                finalTextRef.current = "";
              }
            } else {
              setPartial((finalTextRef.current + " " + text).trim());
              // user started speaking — interrupt TTS
              if (ttsAudioRef.current) stopTts();
            }
          }
        } catch {}
      };
      ws.onerror = () => {
        if (!closingRef.current) toast.error("Voice connection error");
      };
      ws.onclose = () => {
        if (!closingRef.current) setState("idle");
      };
    } catch (e: any) {
      toast.error(e.message || "Voice mode failed");
      onClose();
    }
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
        const result = await speak(acc, voiceId);
        if (result) {
          ttsAudioRef.current = result.audio;
          result.audio.addEventListener("ended", () => {
            ttsAudioRef.current = null;
            if (!closingRef.current) setState("listening");
          });
        } else {
          setState("listening");
        }
      } else {
        setState("listening");
      }
    } catch (e: any) {
      toast.error(e.message || "Reply failed");
      setState("listening");
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

      {/* Orb */}
      <div className="relative grid h-72 w-72 place-items-center">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent opacity-30 blur-3xl transition-transform duration-150"
          style={{ transform: `scale(${orbScale})` }}
        />
        <div
          className="grid h-44 w-44 place-items-center rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_60px_rgba(34,197,94,0.6)] transition-transform duration-150"
          style={{ transform: `scale(${orbScale})` }}
        >
          {state === "connecting" || state === "thinking" ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
          ) : (
            <Mic className="h-12 w-12 text-primary-foreground" />
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
          {state === "connecting" && "Connecting…"}
          {state === "listening" && t.listening}
          {state === "thinking" && t.thinking}
          {state === "speaking" && t.speaking}
          {state === "idle" && "Idle"}
        </p>
        <p className="mt-3 min-h-[1.5rem] max-w-md px-6 text-base text-foreground/90">{partial || lastUser || t.tapToSpeak}</p>
        {lastAi && (
          <p className="mt-4 max-w-xl px-6 text-sm text-muted-foreground line-clamp-3">{lastAi}</p>
        )}
      </div>
    </div>
  );
}
