import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function client(token: string) {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "complete_reminder",
  title: "Complete reminder",
  description: "Mark one of the signed-in user's reminders as completed.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx.getToken()!)
      .from("reminders")
      .update({ completed: true })
      .eq("id", id)
      .select("id, title, completed")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Reminder not found" }], isError: true };
    return {
      content: [{ type: "text", text: `Completed ${data.id}` }],
      structuredContent: { reminder: data },
    };
  },
});
