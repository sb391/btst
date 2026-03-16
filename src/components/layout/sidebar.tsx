"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCheck2,
  FolderSearch2,
  LayoutDashboard,
  Settings2
} from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "New Review", icon: LayoutDashboard },
  { href: "/reviews", label: "Review History", icon: FolderSearch2 },
  { href: "/reviews/review_demo_001", label: "Demo Invoice", icon: FileCheck2 },
  { href: "/settings", label: "Settings", icon: Settings2 }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col justify-between border-r border-border/70 bg-[#12313b]/95 px-5 py-6 text-white lg:flex">
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-100/70">
            Internal Analyst Tool
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workbench</h1>
            <p className="mt-2 text-sm text-teal-50/70">
              Invoice OCR, validation, and analyst-assist review in one local-first workspace.
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive ? "bg-white text-slate-900" : "text-teal-50/80 hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100/70">
          Warning
        </p>
        <p className="mt-2 text-sm text-teal-50/80">
          Analyst-assist system only. Outputs help review invoice quality and completeness, but do not replace analyst judgment.
        </p>
      </div>
    </aside>
  );
}
