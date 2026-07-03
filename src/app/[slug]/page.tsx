import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appComponents } from "@/apps/app-components";
import { AppNav } from "@/components/app-nav";
import { getAllSlugs, getAppsDir, getNeighbors, readManifest } from "@/lib/manifest";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://slaid098.dev";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  return params.then((p) => {
    const m = readManifest(p.slug);
    if (m === null) return {};
    const ogImage =
      m.ogImage === undefined
        ? undefined
        : m.ogImage.startsWith("http")
          ? m.ogImage
          : `${baseUrl}/apps/${m.slug}/cover`;
    return {
      title: m.title,
      description: m.description,
      alternates: { canonical: `/${m.slug}` },
      openGraph: {
        title: m.title,
        description: m.description,
        images: ogImage !== undefined ? [{ url: ogImage }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: m.title,
        description: m.description,
        images: ogImage !== undefined ? [ogImage] : undefined,
      },
    };
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manifest = readManifest(slug);
  if (manifest === null) {
    notFound();
  }
  const { prev, next } = getNeighbors(slug);
  const AppComponent = appComponents[slug as keyof typeof appComponents];
  if (!AppComponent) {
    throw new Error(
      `Missing app component for "${slug}". Register it in src/apps/app-components.ts`,
    );
  }

  const contentPath = join(getAppsDir(), slug, "content.md");
  if (!existsSync(contentPath)) {
    throw new Error(`Missing src/apps/${slug}/content.md — required for every app`);
  }
  const contentMd = readFileSync(contentPath, "utf-8");

  return (
    <>
      <AppComponent manifest={manifest} folder={`${getAppsDir()}/${slug}`} />
      <article className="prose-invert mx-auto max-w-2xl px-6 py-12">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentMd}</ReactMarkdown>
      </article>
      <AppNav next={next} prev={prev} />
    </>
  );
}
