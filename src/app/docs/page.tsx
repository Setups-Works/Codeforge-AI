import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SwaggerUI } from "./swagger-ui";

export const metadata: Metadata = {
  title: "API Documentation — Setups Works Lab",
  description: "Interactive OpenAPI 3.0 documentation for the Setups Works Lab REST API",
};

export default async function DocsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-primary">Setups Works Lab</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">API v1.0</span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">← Back to app</Link>
            <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-foreground font-mono text-xs">JSON spec ↗</a>
          </nav>
        </div>
      </header>
      <SwaggerUI />
    </div>
  );
}
