import type { Manifest } from "@/lib/manifest";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function staticEngine({ manifest }: { manifest: Manifest; folder: string }): ReactNode {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 text-3xl font-bold tracking-tight sm:text-4xl">{manifest.title}</h1>
      {manifest.content !== undefined ? (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{manifest.content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-muted">{manifest.description}</p>
      )}
    </article>
  );
}
