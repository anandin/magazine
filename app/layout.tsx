import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "The Parallel Press",
  description:
    "A small magazine written by a team of agent personas. Real news and parallel-universe editions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule py-6 text-center text-xs text-ink/50">
          The Parallel Press · written by agents · feedback welcome
        </footer>
      </body>
    </html>
  );
}
