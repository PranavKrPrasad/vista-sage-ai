import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEmotionDetector, EMOTION_META, type Emotion } from "@/lib/emotion-detector";
import { useSpeechRecognition } from "@/lib/speech-recognition";
import { streamChat, speak, generateImage, isImageGenRequest } from "@/lib/assistant-client";
import { VoiceWaveform as TtsWaveform } from "@/components/VoiceWaveform";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Cpu, MessageSquare, ListTodo, Brain, Settings as SettingsIcon, LogOut,
  Send, Mic, MicOff, Image as ImageIcon, X, Plus, Trash2, Volume2, VolumeX,
  Camera, CameraOff, Loader2, CheckCircle2, Circle, Sparkles, Wand2,
} from "lucide-react";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant — JARVIS" },
      { name: "description", content: "Your intelligent multi-modal assistant." },
    ],
  }),
  component: AssistantPage,
});

type ChatMsg = { id: string; role: "user" | "assistant"; content: string; emotion?: string | null; image_url?: string | null; generated_images?: string[]; created_at: string };
type Reminder = { id: string; title: string; notes: string | null; due_at: string | null; completed: boolean };
type Memory = { id: string; content: string; category: string; importance: number };
type Profile = { id: string; display_name: string | null; preferred_language: string; voice_id: string; assistant_tone: string };

const VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George (calm)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah (warm)" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris (deep)" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice (bright)" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam (steady)" },
];

function AssistantPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"chat" | "tasks" | "memory" | "settings">("chat");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar tab={tab} setTab={setTab} signOut={signOut} />
      <main className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        {tab === "chat" && <ChatPanel userId={user.id} />}
        {tab === "tasks" && <RemindersPanel userId={user.id} />}
        {tab === "memory" && <MemoryPanel userId={user.id} />}
        {tab === "settings" && <SettingsPanel userId={user.id} />}
      </main>
      <MobileNav tab={tab} setTab={setTab} signOut={signOut} />
    </div>
  );
}

function Sidebar({ tab, setTab, signOut }: { tab: string; setTab: (t: any) => void; signOut: () => Promise<void> }) {
  const items = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "tasks", icon: ListTodo, label: "Tasks" },
    { id: "memory", icon: Brain, label: "Memory" },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];
  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
      <Link to="/" className="flex items-center gap-2 border-b border-border px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent pulse-glow">
          <Cpu className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-wider">JARVIS</span>
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              tab === item.id
                ? "bg-primary/15 text-primary glow-ring"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}

function MobileNav({ tab, setTab, signOut }: { tab: string; setTab: (t: any) => void; signOut: () => Promise<void> }) {
  const items = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "tasks", icon: ListTodo, label: "Tasks" },
    { id: "memory", icon: Brain, label: "Memory" },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-background/80 backdrop-blur md:hidden">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setTab(item.id)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition ${
            tab === item.id ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </button>
      ))}
      <button
        onClick={signOut}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground transition hover:text-foreground"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </nav>
  );
}

function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-center gap-1">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-primary to-accent transition-all"
          style={{
            height: active ? `${20 + ((i * 7 + Date.now() / 100) % 60) * 0.4 + Math.random() * 14}px` : "6px",
            animation: active ? `wave 0.8s ease-in-out ${i * 0.1}s infinite alternate` : undefined,
          }}
        />
      ))}
      <style>{`@keyframes wave { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1.3); } }`}</style>
    </div>
  );
}

function ChatPanel({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  // Modes
  const [cameraOn, setCameraOn] = useState(false);
  const [voiceReplyOn, setVoiceReplyOn] = useState(true);
  const [imageData, setImageData] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { videoRef, emotion, confidence, status: camStatus, error: camError } = useEmotionDetector(cameraOn);
  const speechLang = profile?.preferred_language === "en" ? "en-US" : profile?.preferred_language || "en-US";
  const speech = useSpeechRecognition(speechLang);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ttsAnalyser, setTtsAnalyser] = useState<AnalyserNode | null>(null);
  const [ttsActive, setTtsActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load profile, memories, latest conversation
  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (p) setProfile(p as Profile);

      const { data: mems } = await supabase.from("memories").select("*").eq("user_id", userId).order("importance", { ascending: false }).limit(20);
      if (mems) setMemories(mems as Memory[]);

      const { data: convs } = await supabase.from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1);
      if (convs && convs[0]) {
        setConversationId(convs[0].id);
        const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", convs[0].id).order("created_at");
        if (msgs) setMessages(msgs as ChatMsg[]);
      }
    })();
  }, [userId]);

  // Speech transcript → input
  useEffect(() => {
    if (speech.transcript) setInput((prev) => (prev ? prev + " " : "") + speech.transcript);
  }, [speech.transcript]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: "New conversation" })
      .select()
      .single();
    if (error) throw error;
    setConversationId(data.id);
    return data.id;
  };

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setTtsActive(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !imageData) return;
    if (sending) return;

    setSending(true);
    speech.reset();
    if (speech.listening) speech.stop();

    try {
      const convId = await ensureConversation();

      // Insert user msg
      const { data: userMsg, error: uErr } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, user_id: userId, role: "user", content: text || "[image]", emotion, image_url: imageData })
        .select()
        .single();
      if (uErr) throw uErr;
      setMessages((prev) => [...prev, userMsg as ChatMsg]);
      setInput("");
      const sentImage = imageData;
      setImageData(null);

      // Stream assistant response
      const apiMessages = [...messages, userMsg as ChatMsg].map((m) => ({ role: m.role, content: m.content }));
      let assistantText = "";
      const placeholderId = `streaming-${Date.now()}`;
      setMessages((prev) => [...prev, { id: placeholderId, role: "assistant", content: "", created_at: new Date().toISOString() }]);

      await streamChat({
        messages: apiMessages,
        emotion,
        tone: profile?.assistant_tone,
        language: profile?.preferred_language,
        memories: memories.map((m) => m.content),
        imageBase64: sentImage,
        onDelta: (chunk) => {
          assistantText += chunk;
          setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content: assistantText } : m)));
        },
      });

      // Persist assistant msg
      const { data: aMsg, error: aErr } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, user_id: userId, role: "assistant", content: assistantText })
        .select()
        .single();
      if (aErr) throw aErr;
      setMessages((prev) => prev.map((m) => (m.id === placeholderId ? (aMsg as ChatMsg) : m)));

      // Speak if enabled
      if (voiceReplyOn && assistantText.trim()) {
        stopAudio();
        const result = await speak(assistantText, profile?.voice_id);
        if (result) {
          audioRef.current = result.audio;
          setTtsAnalyser(result.analyser);
          setTtsActive(true);
          const onEnd = () => setTtsActive(false);
          result.audio.addEventListener("ended", onEnd);
          result.audio.addEventListener("pause", onEnd);
        }
      }

      // Update conversation title from first message
      if (messages.length === 0 && text) {
        await supabase.from("conversations").update({ title: text.slice(0, 60), updated_at: new Date().toISOString() }).eq("id", convId);
      } else {
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const emotionMeta = emotion ? EMOTION_META[emotion as Emotion] : null;
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Chat column */}
      <section className="flex flex-1 flex-col">
        {/* Header */}
        <header className="glass-strong flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent md:hidden">
              <Cpu className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-muted-foreground">SESSION</h2>
              <p className="text-base font-medium">{greeting}{profile?.display_name ? `, ${profile.display_name}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {voiceReplyOn && (
              <TtsWaveform
                analyser={ttsAnalyser}
                active={ttsActive}
                className="h-8 w-20 opacity-90 md:w-32"
              />
            )}
            <Button
              variant={voiceReplyOn ? "default" : "outline"}
              size="sm"
              onClick={() => { setVoiceReplyOn(!voiceReplyOn); if (voiceReplyOn) stopAudio(); }}
              className={voiceReplyOn ? "bg-primary/20 text-primary hover:bg-primary/30" : ""}
            >
              {voiceReplyOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant={cameraOn ? "default" : "outline"}
              size="sm"
              onClick={() => setCameraOn(!cameraOn)}
              className={cameraOn ? "bg-primary/20 text-primary hover:bg-primary/30" : ""}
            >
              {cameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && (
              <div className="rounded-2xl glass p-8 text-center scanline">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-accent pulse-glow float-slow">
                  <Cpu className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">JARVIS online</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask me anything. Talk, type, share an image, or enable the camera so I can sense your mood.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {sending && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/60 p-4 backdrop-blur md:p-6">
          <div className="mx-auto max-w-3xl">
            {imageData && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg glass px-3 py-2">
                <img src={imageData} alt="Attached" className="h-10 w-10 rounded object-cover" />
                <span className="text-xs text-muted-foreground">Image attached</span>
                <button onClick={() => setImageData(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="glass rounded-2xl p-2 transition focus-within:glow-ring">
              <Textarea
                value={input + (speech.interim ? " " + speech.interim : "")}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={speech.listening ? "Listening…" : "Ask JARVIS anything…"}
                className="min-h-[60px] resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} title="Attach image">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  {speech.supported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => (speech.listening ? speech.stop() : speech.start())}
                      className={speech.listening ? "text-primary" : ""}
                      title={speech.listening ? "Stop" : "Voice input"}
                    >
                      {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  {speech.listening && <VoiceWaveform active />}
                </div>
                <Button
                  onClick={send}
                  disabled={sending || (!input.trim() && !imageData)}
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
                  size="sm"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Send</span></>}
                </Button>
              </div>
            </div>
            <p className="mt-2 hidden text-center text-xs text-muted-foreground sm:block">
              Press Enter to send · Shift+Enter for newline
            </p>
          </div>
        </div>
      </section>

      {/* Right panel: webcam + emotion */}
      <aside className="hidden w-80 flex-col border-l border-border bg-sidebar/40 p-4 lg:flex">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bio-signals</h3>
        <div className="glass relative aspect-[4/3] overflow-hidden rounded-xl scanline">
          {cameraOn ? (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {camStatus === "loading" && (
                <div className="absolute inset-0 grid place-items-center bg-background/60">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground">Loading vision…</p>
                  </div>
                </div>
              )}
              {camStatus === "error" && (
                <div className="absolute inset-0 grid place-items-center bg-background/80 p-4 text-center text-xs text-destructive">
                  {camError}
                </div>
              )}
            </>
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
              <div className="text-center">
                <CameraOff className="mx-auto mb-2 h-6 w-6" />
                Camera off
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 glass rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Detected emotion</div>
          {emotionMeta ? (
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="text-2xl font-semibold" style={{ color: emotionMeta.color }}>
                  {emotionMeta.emoji} {emotionMeta.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  Confidence {Math.round(confidence * 100)}%
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">
              {cameraOn ? "Searching for face…" : "Enable camera to detect"}
            </div>
          )}
        </div>

        <div className="mt-4 glass rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">System status</div>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="flex justify-between"><span>Voice reply</span><span className={voiceReplyOn ? "text-primary" : "text-muted-foreground"}>{voiceReplyOn ? "ON" : "OFF"}</span></li>
            <li className="flex justify-between"><span>Mic input</span><span className={speech.supported ? "text-primary" : "text-muted-foreground"}>{speech.supported ? "READY" : "N/A"}</span></li>
            <li className="flex justify-between"><span>Vision</span><span className={cameraOn ? "text-primary" : "text-muted-foreground"}>{cameraOn ? camStatus.toUpperCase() : "OFF"}</span></li>
            <li className="flex justify-between"><span>Memories</span><span className="text-primary">{memories.length}</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "ml-12" : "mr-12"}`}>
        <div className={`rounded-2xl px-4 py-3 ${isUser ? "bg-primary/15 border border-primary/30" : "glass"}`}>
          {msg.image_url && (
            <img src={msg.image_url} alt="Attached" className="mb-2 max-h-60 rounded-lg object-cover" />
          )}
          {msg.content && (
            <div className={`prose prose-sm prose-invert max-w-none ${isUser ? "text-foreground" : ""}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
          {!msg.content && <span className="text-sm text-muted-foreground">…</span>}
        </div>
        <div className={`mt-1 text-xs text-muted-foreground ${isUser ? "text-right" : "text-left"}`}>
          {isUser ? "You" : "JARVIS"} · {time}
          {msg.emotion && isUser && ` · ${EMOTION_META[msg.emotion as Emotion]?.emoji ?? ""}`}
        </div>
      </div>
    </div>
  );
}

function RemindersPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("reminders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setItems((data as Reminder[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);

  const add = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from("reminders").insert({
      user_id: userId, title: title.trim(),
      due_at: due ? new Date(due).toISOString() : null,
    });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setDue("");
    toast.success("Reminder added");
    load();
  };

  const toggle = async (r: Reminder) => {
    await supabase.from("reminders").update({ completed: !r.completed }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    load();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Tasks & reminders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Things JARVIS will keep track of for you.</p>

        <div className="glass mt-6 rounded-2xl p-4">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <Input placeholder="What needs to happen?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="md:w-56" />
            <Button onClick={add} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No reminders yet.</p>
          ) : items.map((r) => (
            <div key={r.id} className="glass flex items-center gap-3 rounded-xl p-3">
              <button onClick={() => toggle(r)} className="text-primary">
                {r.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </button>
              <div className="flex-1">
                <div className={r.completed ? "line-through text-muted-foreground" : ""}>{r.title}</div>
                {r.due_at && <div className="text-xs text-muted-foreground">{new Date(r.due_at).toLocaleString()}</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Memory[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("preference");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("memories").select("*").eq("user_id", userId).order("importance", { ascending: false });
    setItems((data as Memory[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);

  const add = async () => {
    if (!content.trim()) return;
    const { error } = await supabase.from("memories").insert({ user_id: userId, content: content.trim(), category, importance: 7 });
    if (error) { toast.error(error.message); return; }
    setContent("");
    toast.success("Memory saved");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("memories").delete().eq("id", id);
    load();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Long-term memory</h1>
        <p className="mt-1 text-sm text-muted-foreground">Facts and preferences JARVIS remembers across sessions.</p>

        <div className="glass mt-6 rounded-2xl p-4 space-y-2">
          <Textarea placeholder="e.g. I prefer concise responses. I'm a senior software engineer at Acme." value={content} onChange={(e) => setContent(e.target.value)} maxLength={500} />
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preference">Preference</SelectItem>
                <SelectItem value="fact">Personal fact</SelectItem>
                <SelectItem value="goal">Goal</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={add} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Plus className="mr-1 h-4 w-4" /> Save
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No memories yet.</p>
          ) : items.map((m) => (
            <div key={m.id} className="glass flex items-start gap-3 rounded-xl p-3">
              <span className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">{m.category}</span>
              <p className="flex-1 text-sm">{m.content}</p>
              <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (data) setProfile(data as Profile);
    })();
  }, [userId]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name,
      preferred_language: profile.preferred_language,
      voice_id: profile.voice_id,
      assistant_tone: profile.assistant_tone,
    }).eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Preferences saved");
  };

  if (!profile) return <div className="grid flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalize how JARVIS sounds and responds.</p>

        <div className="glass mt-6 space-y-5 rounded-2xl p-6">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={profile.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} maxLength={60} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Voice</Label>
              <Select value={profile.voice_id} onValueChange={(v) => setProfile({ ...profile, voice_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICES.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assistant tone</Label>
              <Select value={profile.assistant_tone} onValueChange={(v) => setProfile({ ...profile, assistant_tone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="witty">Witty (Jarvis-style)</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={profile.preferred_language} onValueChange={(v) => setProfile({ ...profile, preferred_language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
