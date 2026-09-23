export const typography = {
  // Onboarding hero headline
  display: "font-serif text-[28px] leading-[1.2] font-medium lg:text-[52px] lg:leading-[1.15]",
  // Page titles ("Journal", "Frameworks", "Chat with your journal")
  pageTitle: "font-serif text-[26px] leading-none font-semibold lg:text-[34px]",
  // App wordmark next to the logo
  wordmark: "font-serif text-[19px] leading-none font-semibold",
  // Entry card titles
  entryTitle: "font-serif text-lg leading-[1.3] font-semibold lg:text-[19px]",
  // Framework card titles
  cardTitle: "font-sans text-[15px] leading-[1.3] font-semibold md:font-serif md:text-[17px]",
  // Long-form intro copy
  lead: "font-sans text-[15px] leading-[1.6] text-neutral-600 lg:text-[17px] lg:leading-[1.65]",
  // Standard body copy
  body: "font-sans text-sm leading-[1.55] text-neutral-600",
  // Card previews & descriptions
  bodySmall: "font-sans text-[13px] leading-[1.55] text-neutral-600",
  // Buttons and nav items
  label: "font-sans text-sm leading-none font-semibold",
  // Chip / pill text
  chip: "font-sans text-[13px] leading-none",
  tag: "font-sans text-[11px] leading-none font-medium",
  // Dates and meta
  caption: "font-sans text-[11px] leading-none font-semibold tracking-[0.05em] uppercase text-neutral-400",
  meta: "font-sans text-xs leading-none font-medium text-neutral-400",
} as const;
