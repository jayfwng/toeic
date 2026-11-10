"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, ChartIcon, HomeIcon, XCircleIcon } from "./Icons";

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/study/", label: "학습", Icon: BookIcon },
  { href: "/wrong/", label: "오답", Icon: XCircleIcon },
  { href: "/stats/", label: "통계", Icon: ChartIcon },
];

export default function BottomTabs() {
  const path = usePathname() || "/";
  const norm = path.endsWith("/") ? path : path + "/";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 safe-bottom">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? norm === "/" : norm.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
