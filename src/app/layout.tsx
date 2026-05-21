import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IG AI Command Center",
  description: "Instagram data ingestion and command center for Ayres, Ava, Saifenu",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
