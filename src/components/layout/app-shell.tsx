import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,163,102,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(35,166,213,0.14),_transparent_26%),linear-gradient(180deg,_#f7f3eb_0%,_#eef2f4_52%,_#f8fbfc_100%)] text-foreground">
      <div className="mx-auto flex max-w-[1700px]">
        <Sidebar />
        <main className="min-h-screen flex-1 px-5 py-5 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
