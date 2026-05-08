import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Cpu, Mic, Camera, Brain, Zap, Globe } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VEERU — Your AI Saathi" },
      { name: "description", content: "Smart, emotion-aware AI assistant that speaks Hindi & English, sees and remembers." },
      { property: "og:title", content: "VEERU — Your AI Saathi" },
      { property: "og:description", content: "Multi-modal AI assistant — voice, vision, memory." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/assistant" });
  }, [user, loading, navigate]);

  const features = [
    { icon: Mic, title: t.fAwaazTitle, desc: t.fAwaazDesc },
    { icon: Camera, title: t.fNazarTitle, desc: t.fNazarDesc },
    { icon: Brain, title: t.fYaadeinTitle, desc: t.fYaadeinDesc },
  ];

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
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-border/50 bg-background/40 p-1 sm:flex">
            <Globe className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            {(["en", "hi"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-0.5 text-xs transition ${lang === l ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {l === "en" ? "EN" : "HI"}
              </button>
            ))}
          </div>
          <Link to="/auth"><Button variant="ghost" size="sm">{t.signIn}</Button></Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
              {t.getStarted}
            </Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center md:pt-20">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary/80">🙏 {t.namaste}</p>
        <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          {t.heroTitle} <span className="text-gradient">{t.heroAccent}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground">{t.heroDesc}</p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 pulse-glow hover-scale">
              {t.startNow} <Zap className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto grid gap-5 px-6 pb-24 md:grid-cols-3">
        {features.map((f) => (
          <Link key={f.title} to="/auth" search={{ mode: "signup" }}
            className="glass group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:glow-ring">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition group-hover:scale-110">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-1.5 text-base font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
