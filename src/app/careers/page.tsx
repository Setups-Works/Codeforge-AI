import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CareerIcon } from "@/features/careers/career-icon";
import { ArrowRight, MapPin } from "@/components/icons";
import { CAREERS } from "@/content/careers";
import { APP_NAME } from "@/lib/constants";
import { PageAura } from "@/components/shared/reactbits-kit";

export const metadata: Metadata = {
  title: `Careers — ${APP_NAME}`,
  description: "Join the Setups Works Lab team. Open internship and open-source roles, remote-friendly.",
};
export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const session = await auth();

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <PageAura height={520} />
      <PublicHeader signedIn={!!session?.user} />

      <main className="relative z-10 flex-1">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-tight text-primary">
              <span className="size-1.5 rounded-full bg-primary" /> Careers
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Build Setups Works Lab with us</h1>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              We&rsquo;re a small, fast-moving team. These roles are open now — remote-friendly, high-ownership.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {CAREERS.map((c) => (
              <Link
                key={c.slug}
                href={`/careers/${c.slug}`}
                className="group flex items-center gap-5 rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <CareerIcon name={c.icon} className="size-6 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{c.type}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3" /> {c.location}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold group-hover:text-primary">{c.title}</h2>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.summary}</p>
                </div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-muted-foreground">
            Don&rsquo;t see a fit? Email us at{" "}
            <a href="mailto:info@setups.works" className="font-medium text-primary hover:underline">info@setups.works</a>.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
