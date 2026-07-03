"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppNav({ prev, next }: { prev: string | null; next: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && prev) router.push(`/${prev}`);
      if (e.key === "ArrowRight" && next) router.push(`/${next}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  if (prev === null && next === null) return null;
  return (
    <nav className="mx-auto flex max-w-2xl items-center justify-between border-t border-line px-6 py-10">
      {prev !== null ? (
        <Link
          aria-label="Предыдущее приложение"
          href={`/${prev}`}
          className="text-2xl text-muted transition hover:-translate-x-0.5 hover:text-accent"
        >
          ←
        </Link>
      ) : (
        <span />
      )}
      {next !== null ? (
        <Link
          aria-label="Следующее приложение"
          href={`/${next}`}
          className="text-2xl text-muted transition hover:translate-x-0.5 hover:text-accent"
        >
          →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
