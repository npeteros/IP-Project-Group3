"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NEW_ENTRY_LABEL } from "@/lib/constants";
import { Icon } from "./Icon";
import { Logo, PrimaryButton, StreakBadge } from "./ui";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => href !== "#" && pathname.startsWith(href);
}

export function Sidebar() {
  const isActive = useIsActive();

  return (
    <aside className="hidden w-[260px] flex-none flex-col gap-7 border-r border-neutral-200 bg-surface px-5 py-7 lg:flex">
      <div className="px-1">
        <Logo />
      </div>

      <PrimaryButton className="h-11">
        <Icon name="plus" size={15} strokeWidth={2.2} />
        {NEW_ENTRY_LABEL}
      </PrimaryButton>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm leading-none ${
                active
                  ? "bg-neutral-100 font-semibold text-neutral-900 hover:text-neutral-900"
                  : "font-medium text-neutral-400 hover:bg-neutral-100/60 hover:text-neutral-600"
              }`}
            >
              <Icon name={item.icon} size={18} strokeWidth={item.icon === "layers" ? 1.75 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <StreakBadge />
    </aside>
  );
}

export function MobileTabBar() {
  const isActive = useIsActive();

  return (
    <nav className="flex h-20 flex-none items-center justify-around border-t border-neutral-200 bg-surface pb-3 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 ${
              active ? "text-neutral-900 hover:text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <Icon name={item.icon} size={20} strokeWidth={item.icon === "layers" ? 1.75 : 2} />
            <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
