import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CareerIcon } from "@/features/careers/career-icon";
import { ApplyForm } from "@/features/careers/apply-form";
import { ArrowLeft, Check, MapPin } from "@/components/icons";
import { CAREERS, getCareer } from "@/content/careers";
import { APP_NAME } from "@/lib/constants";
import { JsonLd } from "@/components/json-ld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CAREERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const role = getCareer(slug);
  if (!role) return { title: `Careers — ${APP_NAME}` };
  return {
    title: `${role.title} — Careers — ${APP_NAME}`,
    description: role.summary,
    openGraph: { title: `${role.title} at ${APP_NAME}`, description: role.summary, type: "website" },
  };
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CareerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const role = getCareer(slug);
  if (!role) notFound();

  const session = await auth();

  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: role.title,
    description: role.about,
    employmentType: role.type === "Internship" ? "INTERN" : "VOLUNTEER",
    hiringOrganization: { "@type": "Organization", name: APP_NAME, sameAs: "https://labs.setups.works" },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: "Anywhere" },
    datePosted: "2026-06-26",
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <JsonLd data={jobLd} />
      <PublicHeader signedIn={!!session?.user} />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Link href="/careers" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All roles
          </Link>

          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CareerIcon name={role.icon} className="size-6 text-primary" />
            </span>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{role.type}</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="size-3" /> {role.location}
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{role.title}</h1>
            </div>
          </div>

          <p className="mt-6 text-base leading-relaxed text-muted-foreground">{role.about}</p>

          <List title="What you'll do" items={role.responsibilities} />
          <List title="What we're looking for" items={role.requirements} />
          {role.niceToHave && <List title="Nice to have" items={role.niceToHave} />}

          <div id="apply" className="mt-12">
            <ApplyForm role={role.slug} roleTitle={role.title} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
