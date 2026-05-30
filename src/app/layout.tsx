import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neural News Curation",
  description: "Interactive neural network news curation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased dark">
        {children}
      </body>
    </html>
  );
}
