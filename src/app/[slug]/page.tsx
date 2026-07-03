import { AppNav } from "@/components/app-nav";
import { getEngine } from "@/engines/registry";
import { getAllSlugs, getAppsDir, getNeighbors, readManifest } from "@/lib/manifest";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

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
  const engine = getEngine(manifest.engine);
  const { prev, next } = getNeighbors(slug);
  return (
    <>
      {engine({ manifest, folder: `${getAppsDir()}/${slug}` })}
      <AppNav next={next} prev={prev} />
    </>
  );
}
