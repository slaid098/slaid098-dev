import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена",
  description: "Запрашиваемая страница не существует.",
  openGraph: {
    title: "Страница не найдена // slaid098.dev",
    description: "Запрашиваемая страница не существует.",
  },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-accent">404</h1>
      <p className="mt-4 text-lg text-muted">Страница не найдена.</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
      >
        На главную
      </Link>
    </div>
  );
}
