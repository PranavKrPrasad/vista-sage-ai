import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listConversations from "./tools/list-conversations";
import getConversationMessages from "./tools/get-conversation-messages";
import listReminders from "./tools/list-reminders";
import createReminder from "./tools/create-reminder";
import completeReminder from "./tools/complete-reminder";
import listMemories from "./tools/list-memories";
import addMemory from "./tools/add-memory";

// The OAuth issuer must be the direct Supabase host (never the .lovable.cloud proxy).
// Read the project ref from the Vite-inlined env; the fallback keeps discovery well-formed
// during the throwaway manifest-extract eval — a token never verifies against it.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "veeru-mcp",
  title: "VEERU",
  version: "0.1.0",
  instructions:
    "Tools to read and manage the signed-in VEERU user's conversations, reminders, and long-term memories. " +
    "Use list_conversations + get_conversation_messages to inspect chat history, " +
    "list/create/complete_reminder for tasks, and list_memories/add_memory for facts VEERU should remember.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listConversations,
    getConversationMessages,
    listReminders,
    createReminder,
    completeReminder,
    listMemories,
    addMemory,
  ],
});
