import type { ReactNode } from "react";
import type { IconName } from "@/lib/constants";

const PATHS: Record<IconName, ReactNode> = {
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h9v18H6a2 2 0 0 1-2-2z" />
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
    </>
  ),
  layers: (
    <>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  cross: (
    <>
      <path d="M3 12h18M12 3v18" />
      <path d="M7 7l10 10M17 7L7 17" />
    </>
  ),
  heart: <path d="M12 21c-4-3-8-6.5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4.5-4 8-10 11z" />,
  cloud: <path d="M7 18a4 4 0 0 1-.6-7.96A5 5 0 0 1 16.9 8.05 4.5 4.5 0 0 1 17.5 17H7z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  send: <path d="M5 12h14M13 6l6 6-6 6" />,
  flame: (
    <path d="M12 2c.7 2.7-2.6 4.4-2.6 7.8a2.6 2.6 0 0 0 5.2 0c0-.9-.5-1.6-.5-1.6 1.4.8 2.4 2.6 2.4 4.4A4.5 4.5 0 0 1 12 17.1a4.5 4.5 0 0 1-4.5-4.5C7.5 8 9.5 5.5 12 2z" />
  ),
};

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

// Icons inherit colour from `currentColor`, so tint them with text-* classes.
export function Icon({ name, size = 18, strokeWidth = 2, className }: IconProps) {
  const filled = name === "flame";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
