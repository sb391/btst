import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Underwriting Intelligence Workbench",
  description: "Local-first AI-assisted credit underwriting and trade verification workbench."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${plexMono.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
