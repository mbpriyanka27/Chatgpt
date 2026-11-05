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
      <body className="antialiased">{children}</body>
    </html>
  );
}
