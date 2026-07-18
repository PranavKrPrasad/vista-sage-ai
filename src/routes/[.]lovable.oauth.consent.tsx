import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Cpu, ShieldCheck } from "lucide-react";

// Beta auth.oauth namespace — typed locally so TS is happy.
type AuthzDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthzDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthzDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthzDetails | null; error: { message: string } | null }>;
};
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next, mode: "signin" as const } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass-strong max-w-md rounded-2xl p-6 text-sm">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass-strong w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Cpu className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Authorize access</div>
            <h1 className="text-lg font-semibold">Connect {clientName} to VEERU</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          This lets {clientName} call VEERU's tools as you — reading your conversations, reminders, and
          long-term memories, and creating new ones on your behalf.
        </p>

        {details?.scope && (
          <p className="mt-3 text-xs text-muted-foreground">
            Requested scope: <span className="font-mono">{details.scope}</span>
          </p>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>This does not bypass VEERU's permissions — every action still runs as your account.</span>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={!!busy} onClick={() => decide(false)}>
            {busy === "deny" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
          </Button>
          <Button
            disabled={!!busy}
            onClick={() => decide(true)}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          >
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
        </div>
      </div>
    </main>
  );
}
