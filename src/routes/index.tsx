import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Cpu, Mic, Camera, Brain, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VEERU — Your AI Assistant" },
      { name: "description", content: "Smart, emotion-aware AI assistant that speaks, sees, and remembers." },
      { property: "og:title", content: "VEERU — AI Assistant" },
      { property: "og:description", content: "Multi-modal AI assistant with voice, vision, and memory." },
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
      <div className="absolute inset-0 -z-10 opacity-30"
        style={{ background: "radial-gradient(circle at 40% 30%, oklch(0.50 0.20 155 / 35%), transparent 50%), radial-gradient(circle at 60% 75%, oklch(0.45 0.18 130 / 20%), transparent 50%)" }} />

      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent pulse-glow">
            <Cpu className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-widest">VEERU</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-20 pb-28 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary/80">🙏 Namaste</p>
        <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Your <span className="text-gradient">smart</span> saathi
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground">
          Speaks. Listens. Sees. Remembers.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 pulse-glow">
              Start now <Zap className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto grid gap-5 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: Mic, title: "Awaaz", desc: "Baat karo naturally — VEERU sunne aur bole, apni awaaz mein." },
          { icon: Camera, title: "Nazar", desc: "Tumhara mood samjhe, photo analyse kare — sab real-time." },
          { icon: Brain, title: "Yaadein", desc: "Tumhari pasand, aadat aur zaroori baatein yaad rakhe — hamesha." },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6 transition hover:-translate-y-1">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-1.5 text-base font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
