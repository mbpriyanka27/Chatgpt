import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatGPT Pro - Hosted Multi-User AI Platform",
  description: "Next.js + FastAPI + PostgreSQL ChatGPT-Style Platform with RAG and Hosted LLM Inference",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/tailwind.css" />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="antialiased font-sans m-0 p-0 overflow-hidden">{children}</body>
    </html>
  );
}
