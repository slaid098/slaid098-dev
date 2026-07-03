import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "slaid098.dev",
  description: "Витрина микро-приложений.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-gray-950 text-white">
        <header className="px-6 py-4 text-xs text-gray-500">slaid098.dev</header>
        <main>{children}</main>
        <footer />
      </body>
    </html>
  );
}
