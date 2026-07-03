import { appComponents } from "@/apps/app-components";
import { AppNav } from "@/components/app-nav";
import { getAllSlugs, getNeighbors, readManifest } from "@/lib/manifest";
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
  const { prev, next } = getNeighbors(slug);
  const AppComponent = appComponents[slug as keyof typeof appComponents];
  if (!AppComponent) {
    throw new Error(
      `Missing app component for "${slug}". Register it in src/apps/app-components.ts`,
    );
  }

  return (
    <>
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">{manifest.title}</h1>
        <p className="mt-3 text-lg text-muted">{manifest.description}</p>
        {manifest.tags && manifest.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {manifest.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>
      <AppComponent manifest={manifest} />
      <AppNav next={next} prev={prev} />
    </>
  );
}
