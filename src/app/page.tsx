import { readAllManifests } from "@/lib/manifest";
import Link from "next/link";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://slaid098.dev";

export default function Home() {
  const apps = readAllManifests();
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: apps.map((app, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${baseUrl}/${app.slug}`,
      name: app.title,
    })),
  };
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Заходи, если что<span className="text-accent">?</span>
      </h1>
      {apps.length === 0 ? (
        <p className="mt-6 text-muted">Пока пусто. Загляни позже.</p>
      ) : (
        <ul className="mt-12 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <li key={app.slug}>
              <Link
                href={`/${app.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[0_12px_40px_-8px_var(--color-accent)]"
              >
                <div className="aspect-square overflow-hidden bg-base">
                  <img
                    alt={app.title}
                    src={`/apps/${app.slug}/cover`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {app.created !== undefined && (
                    <time
                      dateTime={app.created}
                      className="mb-2 block font-mono text-xs text-muted"
                    >
                      {app.created}
                    </time>
                  )}
                  <h2 className="mb-1 line-clamp-1 text-lg font-medium">{app.title}</h2>
                  <p className="line-clamp-2 text-sm text-muted">{app.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
    </div>
  );
}
