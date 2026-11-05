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
      </head>
      <body className="antialiased bg-[#0e0e17] text-[#ececf1]">{children}</body>
    </html>
  );
}
