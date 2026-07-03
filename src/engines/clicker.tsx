import { ClickerApp } from "@/components/clicker-app";
import type { Manifest } from "@/lib/manifest";
import type { ReactNode } from "react";

export function clickerEngine({
  manifest,
  folder,
}: { manifest: Manifest; folder: string }): ReactNode {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-center">{manifest.title}</h1>
      <ClickerApp manifest={manifest} folder={folder} />
    </article>
  );
}
