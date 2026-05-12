import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Sentinel",
  description:
    "A small, opinionated magazine — six writers, two registers (real and Sigma), reported on foot and edited on paper. Cover reads 'The Cedar Hollow Sentinel.'",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Crimson+Pro:ital,wght@0,300..900;1,300..900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Major+Mono+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
