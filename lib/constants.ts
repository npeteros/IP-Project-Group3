// Mock data

export type IconName =
  | "book"
  | "layers"
  | "chart"
  | "chat"
  | "settings"
  | "globe"
  | "check"
  | "cross"
  | "heart"
  | "cloud"
  | "plus"
  | "search"
  | "send"
  | "flame";

export type Tone = "cloud" | "sage";

export const APP_NAME = "Moodiary";

export const STREAK_DAYS = 12;

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Journal", href: "/journal", icon: "book" },
  { label: "Frameworks", href: "/frameworks", icon: "layers" },
  { label: "Insights", href: "#", icon: "chart" },
  { label: "Chat", href: "/chat", icon: "chat" },
  { label: "Settings", href: "#", icon: "settings" },
];

export const NEW_ENTRY_LABEL = "New entry";

export const SEARCH_PLACEHOLDER = "Search entries";

export const ONBOARDING = {
  headline: "Reflect deeper, every day.",
  description: `${APP_NAME} pairs a calm daily journal with frontier AI — richer reflection, pattern detection, and insight than a simple notes app.`,
  badges: [
    {
      label: "Always disclosed",
      tone: "cloud",
      description: "Every AI request is logged in your Processing Log, and never used to train models.",
    },
    {
      label: "Always exportable",
      tone: "sage",
      description: "One-tap export of every entry and insight, any time.",
    },
  ] satisfies { label: string; tone: Tone; description: string }[],
  totalSteps: 3,
  currentStep: 2,
  primaryCta: "Get started",
  primaryCtaDesktop: "Get started free",
  skipLabel: "Skip intro",
  signInLabel: "Sign in",
  preview: {
    entry: {
      date: "Today, Aug 25",
      title: "A slower morning",
      excerpt: "Woke up before the alarm and just sat with my coffee for a while, no phone, no rush.",
      tag: "Gratitude",
    },
    moodMix: {
      title: "Mood mix, this week",
      moods: [
        { label: "Calm", tone: "sage" },
        { label: "Grateful", tone: "cloud" },
      ] satisfies { label: string; tone: Tone }[],
    },
    insight: "Deadline pressure keeps coming up on Mondays.",
  },
};

export const JOURNAL_FILTERS = ["All", "Gratitude", "Work", "Family"];

export type JournalEntry = {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
};

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "entry-1",
    date: "Today, Aug 25",
    title: "A slower morning",
    excerpt: "Woke up before the alarm and just sat with my coffee for a while, no phone, no rush.",
    tags: ["Gratitude"],
  },
  {
    id: "entry-2",
    date: "Mon, Aug 24",
    title: "Deadline stress",
    excerpt: "The client call moved up a day and I felt that familiar tightness in my chest again.",
    tags: ["Work"],
  },
  {
    id: "entry-3",
    date: "Sun, Aug 23",
    title: "Sunday call with mom",
    excerpt: "She told the story about the garden again and I didn't mind hearing it twice.",
    tags: ["Family"],
  },
  {
    id: "entry-4",
    date: "Fri, Aug 22",
    title: "Small wins",
    excerpt: "Finally fixed the thing that's been bugging me on the project for two weeks.",
    tags: ["Work"],
  },
  {
    id: "entry-5",
    date: "Thu, Aug 21",
    title: "Grateful, tired",
    excerpt: "Long day but the kids' laughter at dinner made all of it worth it.",
    tags: ["Family"],
  },
  {
    id: "entry-6",
    date: "Wed, Aug 20",
    title: "A quiet walk",
    excerpt: "Took the long way home just to be outside a little longer before it got dark.",
    tags: ["Gratitude"],
  },
];

export const FRAMEWORKS_PAGE = {
  title: "Frameworks",
  description: "Structured prompts for deeper reflection, whenever freeform writing needs a nudge.",
  buildYourOwnLabel: "Build your own framework",
};

export type Framework = {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: IconName;
};

export const FRAMEWORKS: Framework[] = [
  {
    id: "first-principles",
    name: "First Principles",
    description: "Break a problem down to its basics",
    duration: "5 min",
    icon: "layers",
  },
  {
    id: "ikigai",
    name: "Ikigai",
    description: "Find where purpose and passion meet",
    duration: "8 min",
    icon: "globe",
  },
  {
    id: "daily-review",
    name: "Daily Review",
    description: "Three quick prompts to close the day",
    duration: "3 min",
    icon: "check",
  },
  {
    id: "regret-minimization",
    name: "Regret Minimization",
    description: "Decide by looking back from age 80",
    duration: "6 min",
    icon: "cross",
  },
  {
    id: "gratitude-map",
    name: "Gratitude Map",
    description: "Trace one good thing to its roots",
    duration: "4 min",
    icon: "heart",
  },
];

export const CHAT_PAGE = {
  title: "Chat with your journal",
  disclaimer:
    "Answers are grounded in your own entries. This conversation is sent to cloud AI — see your Processing Log anytime.",
  inputPlaceholder: "Ask your journal anything…",
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "What themes keep coming up in my entries about work?",
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "Over the last month, deadline pressure and feeling under-appreciated come up most — often on Mondays. You've also mentioned wanting clearer boundaries three times.",
  },
  {
    id: "msg-3",
    role: "user",
    content: "That tracks. Any suggestion?",
  },
  {
    id: "msg-4",
    role: "assistant",
    content: "Sunday evenings seem to set the tone — worth trying a short wind-down ritual before the week starts?",
  },
];
