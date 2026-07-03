"use client";

import { useState } from "react";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto mt-10 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={handleShare}
        className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
      >
        Поделиться
      </button>
      {copied && (
        <span className="text-sm text-green-500 transition-opacity">Ссылка скопирована</span>
      )}
    </div>
  );
}
