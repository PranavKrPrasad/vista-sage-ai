import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Cpu, Mic, Camera, Brain, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JARVIS — Your Advanced AI Assistant" },
      { name: "description", content: "Voice, vision, and emotion-aware AI assistant. Remembers you. Adapts to you." },
      { property: "og:title", content: "JARVIS — Advanced AI Assistant" },
      { property: "og:description", content: "Multi-modal AI with real-time facial emotion detection and persistent memory." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/assistant" });
  }, [user, loading, navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-40"
        style={{ background: "radial-gradient(circle at 30% 20%, oklch(0.55 0.20 220 / 30%), transparent 50%), radial-gradient(circle at 70% 80%, oklch(0.50 0.22 280 / 25%), transparent 50%)" }} />

      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent pulse-glow">
            <Cpu className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-wider">JARVIS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" /> Multi-modal · Emotion-aware · Always learning
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Meet your <span className="text-gradient">intelligent</span><br /> virtual assistant
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          JARVIS speaks, listens, sees, and remembers. It detects your emotions in real-time
          and adapts its responses to be empathetic, useful, and proactive.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 pulse-glow">
              Activate JARVIS <Zap className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: Mic, title: "Voice & Speech", desc: "Talk naturally. JARVIS responds with a calm, lifelike voice via ElevenLabs." },
          { icon: Camera, title: "Vision & Emotion", desc: "Real-time facial emotion detection. Upload images for analysis." },
          { icon: Brain, title: "Persistent Memory", desc: "Remembers your preferences, habits, and important facts across sessions." },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6 transition hover:-translate-y-1">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
