import { readAllManifests } from "@/lib/manifest";
import Link from "next/link";

export default function Home() {
  const apps = readAllManifests();
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Витрина</h1>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <li key={app.slug}>
            <Link
              href={`/${app.slug}`}
              className="block rounded-lg border border-gray-800 p-5 transition hover:border-gray-600 hover:bg-gray-900"
            >
              <h2 className="mb-1 text-lg font-medium">{app.title}</h2>
              <p className="text-sm text-gray-400">{app.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
