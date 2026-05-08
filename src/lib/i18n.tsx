import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";

const STRINGS = {
  en: {
    namaste: "Welcome",
    heroTitle: "Your smart",
    heroAccent: "AI saathi",
    heroDesc: "Speaks. Listens. Sees. Remembers.",
    startNow: "Start now",
    signIn: "Sign in",
    getStarted: "Get started",
    fAwaazTitle: "Voice",
    fAwaazDesc: "Talk naturally — VEERU listens and replies in its own voice.",
    fNazarTitle: "Vision",
    fNazarDesc: "Reads your mood, analyses photos — all in real time.",
    fYaadeinTitle: "Memory",
    fYaadeinDesc: "Remembers your preferences, habits and important facts.",
    chats: "Chats",
    newChat: "New chat",
    searchChats: "Search chats…",
    pinned: "Pinned",
    recent: "Recent",
    rename: "Rename",
    delete: "Delete",
    pin: "Pin",
    unpin: "Unpin",
    voiceMode: "Voice mode",
    listening: "Listening…",
    speaking: "Speaking…",
    tapToSpeak: "Tap to speak",
    thinking: "Thinking…",
    askAnything: "Ask VEERU anything…",
    bioSignals: "Bio-signals",
    detectedEmotion: "Detected emotion",
    noFace: "No face detected",
    searchingFace: "Searching for face…",
    cameraOff: "Camera off",
    enableCamera: "Enable camera to detect",
    sessionGreeting: "Session",
    chat: "Chat",
    tasks: "Tasks",
    memory: "Memory",
    settings: "Settings",
    signOut: "Sign out",
    language: "Language",
    voice: "Voice",
    tone: "Assistant tone",
    displayName: "Display name",
    save: "Save preferences",
    confirmDelete: "Delete this chat?",
  },
  hi: {
    namaste: "Namaste",
    heroTitle: "Aapka smart",
    heroAccent: "AI saathi",
    heroDesc: "Bole. Sune. Dekhe. Yaad rakhe.",
    startNow: "Shuru karein",
    signIn: "Sign in",
    getStarted: "Shuru karein",
    fAwaazTitle: "Awaaz",
    fAwaazDesc: "Naturally baat karo — VEERU sune aur apni awaaz mein jawab de.",
    fNazarTitle: "Nazar",
    fNazarDesc: "Aapka mood samjhe, photo analyse kare — sab real-time mein.",
    fYaadeinTitle: "Yaadein",
    fYaadeinDesc: "Aapki pasand, aadat aur zaroori baatein yaad rakhe.",
    chats: "Baatcheet",
    newChat: "Nayi chat",
    searchChats: "Chats dhundo…",
    pinned: "Pinned",
    recent: "Haal hi mein",
    rename: "Rename",
    delete: "Delete",
    pin: "Pin",
    unpin: "Unpin",
    voiceMode: "Voice mode",
    listening: "Sun raha hoon…",
    speaking: "Bol raha hoon…",
    tapToSpeak: "Bolne ke liye tap karein",
    thinking: "Soch raha hoon…",
    askAnything: "VEERU se kuch bhi poochho…",
    bioSignals: "Bio-signals",
    detectedEmotion: "Mood detect hua",
    noFace: "Chehra nahi mila",
    searchingFace: "Chehra dhund raha hoon…",
    cameraOff: "Camera band hai",
    enableCamera: "Camera on karein",
    sessionGreeting: "Session",
    chat: "Chat",
    tasks: "Tasks",
    memory: "Yaadein",
    settings: "Settings",
    signOut: "Sign out",
    language: "Bhasha",
    voice: "Awaaz",
    tone: "Tone",
    displayName: "Naam",
    save: "Save karein",
    confirmDelete: "Yeh chat delete karein?",
  },
};

type Dict = typeof STRINGS["en"];

interface I18nCtx { lang: Lang; setLang: (l: Lang) => void; t: Dict }
const Ctx = createContext<I18nCtx>({ lang: "en", setLang: () => {}, t: STRINGS.en });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem("veeru.lang") as Lang) || "en";
    setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("veeru.lang", l);
  };
  return <Ctx.Provider value={{ lang, setLang, t: STRINGS[lang] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
