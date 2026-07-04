"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AppNav({
  prev,
  next,
  title,
  url,
}: {
  prev: string | null;
  next: string | null;
  title: string;
  url: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

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

  const handleShare = async () => {
    if (navigator.share && navigator.maxTouchPoints > 0) {
      await navigator.share({ title, url });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showNav = prev !== null || next !== null;

  return (
    <nav className="sticky bottom-0 z-10 border-t border-line bg-base/90 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
        {prev !== null ? (
          <Link
            aria-label="Предыдущее приложение"
            href={`/${prev}`}
            className="text-xl text-muted transition hover:-translate-x-0.5 hover:text-accent"
          >
            ←
          </Link>
        ) : showNav ? (
          <span className="w-5" />
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-lg border border-line bg-surface px-4 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
          >
            Поделиться
          </button>
          {copied && (
            <span className="text-xs text-green-500 transition-opacity">Скопировано!</span>
          )}
        </div>

        {next !== null ? (
          <Link
            aria-label="Следующее приложение"
            href={`/${next}`}
            className="text-xl text-muted transition hover:translate-x-0.5 hover:text-accent"
          >
            →
          </Link>
        ) : showNav ? (
          <span className="w-5" />
        ) : null}
      </div>
    </nav>
  );
}
