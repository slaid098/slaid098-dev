import { readAllManifests } from "@/lib/manifest";
import Link from "next/link";

export default function Home() {
  const apps = readAllManifests();
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Заходи, если что<span className="text-accent">?</span>
      </h1>
      {apps.length === 0 ? (
        <p className="mt-6 text-muted">Пока пусто. Загляни позже.</p>
      ) : (
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <li key={app.slug}>
              <Link
                href={`/${app.slug}`}
                className="group block overflow-hidden rounded-xl border border-line bg-surface transition duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[0_12px_40px_-8px_var(--color-accent)]"
              >
                <div className="aspect-[16/9] overflow-hidden bg-base">
                  <img
                    alt={app.title}
                    src={`/apps/${app.slug}/cover`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h2 className="mb-1 text-lg font-medium">{app.title}</h2>
                  <p className="text-sm text-muted">{app.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
