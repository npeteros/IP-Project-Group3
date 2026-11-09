// UI copy and app-wide config. Placeholder data lives in src/lib/placeholders/.

export type IconName =
  | 'book'
  | 'layers'
  | 'chart'
  | 'chat'
  | 'settings'
  | 'globe'
  | 'check'
  | 'cross'
  | 'heart'
  | 'cloud'
  | 'plus'
  | 'search'
  | 'send'
  | 'flame'
  | 'quote'
  | 'eye'
  | 'eye-off'
  | 'log-out'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'sun'
  | 'lock'
  | 'bell'
  | 'download'
  | 'trash'
  | 'file-text'
  | 'info'
  | 'grip'
  | 'users'
  | 'frame'

export type Tone = 'cloud' | 'sage'

export const APP_NAME = 'Moodiary'

// Brand panel shown beside the sign-in and sign-up forms.
export const AUTH_PANEL = {
  quote: `Journaling with ${APP_NAME} feels like having a quiet, honest conversation with yourself — one that actually remembers what you said last month.`,
  quoteAuthor: 'A daily user, 8 months in',
}

export type NavItem = {
  label: string
  href: string
  icon: IconName
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Journal', href: '/journal', icon: 'book' },
  { label: 'Frameworks', href: '/frameworks', icon: 'layers' },
  { label: 'Insights', href: '/insights', icon: 'chart' },
  { label: 'Chat', href: '/chat', icon: 'chat' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
]

export const NEW_ENTRY_LABEL = 'New entry'
export const NEW_ENTRY_HREF = '/journal/new'
export const LOG_OUT_LABEL = 'Log out'

export const SEARCH_PLACEHOLDER = 'Search entries'

export const ONBOARDING = {
  headline: 'Reflect deeper, every day.',
  description: `${APP_NAME} pairs a calm daily journal with frontier AI — richer reflection, pattern detection, and insight than a simple notes app.`,
  badges: [
    {
      label: 'Always disclosed',
      tone: 'cloud',
      description:
        'Every AI request is logged in your Processing Log, and never used to train models.',
    },
    {
      label: 'Always exportable',
      tone: 'sage',
      description: 'One-tap export of every entry and insight, any time.',
    },
  ] satisfies { label: string; tone: Tone; description: string }[],
  totalSteps: 3,
  currentStep: 2,
  primaryCta: 'Get started',
  getStartedHref: '/register',
  primaryCtaDesktop: 'Get started free',
  skipLabel: 'Skip intro',
  signInLabel: 'Sign in',
  preview: {
    entry: {
      date: 'Today, Aug 25',
      title: 'A slower morning',
      excerpt:
        'Woke up before the alarm and just sat with my coffee for a while, no phone, no rush.',
      tag: 'Gratitude',
    },
    moodMix: {
      title: 'Mood mix, this week',
      moods: [
        { label: 'Calm', tone: 'sage' },
        { label: 'Grateful', tone: 'cloud' },
      ] satisfies { label: string; tone: Tone }[],
    },
    insight: 'Deadline pressure keeps coming up on Mondays.',
  },
}

export const FRAMEWORKS_PAGE = {
  title: 'Frameworks',
  description: 'Structured prompts for deeper reflection, whenever freeform writing needs a nudge.',
  buildYourOwnLabel: 'Build your own framework',
}

export const CHAT_PAGE = {
  title: 'Chat with your journal',
  disclaimer:
    'Answers are grounded in your own entries. This conversation is sent to cloud AI — see your Processing Log anytime.',
  inputPlaceholder: 'Ask your journal anything…',
}

export const LOGIN_PAGE = {
  title: 'Welcome back',
  description: 'Sign in to keep your journal private and synced.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  forgotPasswordLabel: 'Forgot password?',
  submitLabel: 'Sign in',
  newHereLabel: 'New here?',
  createAccountLabel: 'Get started',
  createAccountHref: '/register',
  postLoginHref: '/journal',
  fallbackError: "We couldn't sign you in. Please try again.",
}

const MIN_PASSWORD_LENGTH = 8
const PASSWORD_REQUIREMENT = `at least ${MIN_PASSWORD_LENGTH} characters, including a number.`

export const REGISTER = {
  title: 'Create your account',
  subtitle: 'Start a private journal that grows with you.',
  minPasswordLength: MIN_PASSWORD_LENGTH,
  passwordHint: PASSWORD_REQUIREMENT,
  passwordError: `Use ${PASSWORD_REQUIREMENT}`,
  strengthLabels: ['Weak', 'Fair', 'Good', 'Strong'],
  submitLabel: 'Create account',
  signInPrompt: 'Already have an account?',
  signInLabel: 'Sign in',
  signInHref: '/login',
  postRegisterHref: '/journal',
  fallbackError: "We couldn't create your account. Please try again.",
}
