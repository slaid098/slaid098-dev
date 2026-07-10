import { readAllManifests } from "@/lib/manifest";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://slaid098.dev";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Лаборатория Slaid // slaid098.dev",
    template: "%s // slaid098.dev",
  },
  description: "Утилиты для автоматизации и цифровые эксперименты.",
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Лаборатория Slaid // slaid098.dev",
    description: "Утилиты для автоматизации и цифровые эксперименты.",
    type: "website",
    locale: "ru_RU",
    url: baseUrl,
    siteName: "slaid098.dev",
    images: [{ url: "/og-image.png", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Лаборатория Slaid // slaid098.dev",
    description: "Утилиты для автоматизации и цифровые эксперименты.",
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
        <footer className="mx-auto max-w-6xl px-6 pb-20 pt-8 text-xs">
          <div className="flex items-center justify-center gap-2 text-muted">
            <span>сделано Серёгой</span>
            <span className="text-line">·</span>
            <a
              href="https://github.com/slaid098"
              aria-label="GitHub"
              className="text-muted transition hover:text-accent"
              rel="noreferrer"
              target="_blank"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              <span className="sr-only">GitHub</span>
            </a>
            <a
              href="https://t.me/slaid098_dev"
              aria-label="Telegram"
              className="text-muted transition hover:text-accent"
              rel="noreferrer"
              target="_blank"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M14.94 2.62 12.9 12.3c-.15.68-.55.85-1.12.53l-3.1-2.29-1.5 1.44c-.17.17-.31.31-.62.31l.22-3.16L12.4 4.3c.25-.22-.05-.34-.39-.12L5.6 8.93 2.55 7.97c-.66-.21-.68-.66.14-.98l10.93-4.21c.55-.2 1.04.13.86.84Z" />
              </svg>
              <span className="sr-only">Telegram</span>
            </a>
          </div>
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
