import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArchFlow",
  description: "Multi-agent system design powered by AG-UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}