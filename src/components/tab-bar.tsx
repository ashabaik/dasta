"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, LayoutGrid, MessageSquare, User } from "lucide-react";

type Labels = { home: string; categories: string; messages: string; orders: string; account: string; main: string };

/**
 * Phone navigation: five places, always under the thumb. Hidden from the desktop layout.
 * `dashboard` is the signed-in account's own page; visitors are sent to sign in.
 */
export function TabBar({ locale, labels, dashboard }: { locale: "en" | "ar"; labels: Labels; dashboard: string | null }) {
  const pathname = usePathname() ?? "";
  const home = `/${locale}`;
  const account = dashboard ?? `${home}/signin`;
  const items = [
    { key: "home", label: labels.home, Icon: Home, href: home, active: pathname === home },
    { key: "categories", label: labels.categories, Icon: LayoutGrid, href: `${home}#categories`, active: false },
    { key: "messages", label: labels.messages, Icon: MessageSquare, href: dashboard ? `${home}/messages` : `${home}/signin`, active: pathname.startsWith(`${home}/messages`) },
    { key: "orders", label: labels.orders, Icon: ClipboardList, href: account, active: pathname.startsWith(`${home}/orders`) },
    { key: "account", label: labels.account, Icon: User, href: account, active: /\/(signin|buyer|seller|admin)(\/|$)/.test(pathname) },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden" aria-label={labels.main}>
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ key, label, Icon, href, active }) => (
          <li key={key}>
            <Link href={href} prefetch={false} aria-current={active ? "page" : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[12px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="size-[22px]" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
