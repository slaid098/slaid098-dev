import { appComponents } from "@/apps/app-components";
import { AppNav } from "@/components/app-nav";
import { ShareButton } from "@/components/share-button";
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
  const isShowcase = manifest.type === "showcase";
  const AppComponent = appComponents[slug as keyof typeof appComponents];
  if (!isShowcase && !AppComponent) {
    throw new Error(
      `Missing app component for "${slug}". Register it in src/apps/app-components.ts`,
    );
  }
  const App = AppComponent as NonNullable<typeof AppComponent>;

  return (
    <>
      <section className="mx-auto max-w-2xl px-6 pt-10 pb-4 sm:pt-16 sm:pb-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{manifest.title}</h1>
        <p className="mt-2 sm:mt-3 text-base sm:text-lg text-muted">{manifest.description}</p>
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

      {isShowcase ? (
        <section className="mx-auto max-w-2xl px-6 py-8">
          {manifest.features && manifest.features.length > 0 && (
            <div className="mb-10">
              <h2 className="mb-4 text-center text-sm font-mono uppercase tracking-wider text-muted">
                возможности
              </h2>
              <ul className="space-y-3">
                {manifest.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-base text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {manifest.releaseUrl && (
            <div className="text-center">
              <a
                href={manifest.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                Скачать последнюю версию
              </a>
            </div>
          )}
        </section>
      ) : (
        <App manifest={manifest} />
      )}

      <ShareButton title={manifest.title} url={`${baseUrl}/${manifest.slug}`} />
      <AppNav next={next} prev={prev} />
    </>
  );
}
