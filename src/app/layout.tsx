import { readAllManifests } from "@/lib/manifest";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://slaid098.dev";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "slaid098.dev",
  description: "Микро-приложения на одном домене.",
  openGraph: {
    title: "slaid098.dev",
    description: "Микро-приложения на одном домене.",
    type: "website",
    siteName: "slaid098.dev",
    images: [{ url: "/og-image.png", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "slaid098.dev",
    description: "Микро-приложения на одном домене.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const count = readAllManifests().length;
  return (
    <html lang="ru" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-base font-sans text-fg">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
            slaid098.dev
          </Link>
          <span className="font-mono text-xs text-muted">
            {count} {plural(count)}
          </span>
        </header>
        <main>{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-8 text-xs">
          <a
            href="https://github.com/slaid098/slaid098-dev"
            className="text-accent hover:underline"
            rel="noreferrer"
            target="_blank"
          >
            сделано Серёгой
          </a>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

function plural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "приложение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "приложения";
  return "приложений";
}
