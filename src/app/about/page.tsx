import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { FOUNDER } from "@/lib/founder";
import { InfoLayout } from "@/components/shared/info-layout";
import { JsonLd } from "@/components/json-ld";
import {
  Building2,
  Code2,
  Heart,
  Mail,
  Phone,
  Rocket,
  Sparkles,
  Target,
} from "@/components/icons";

const SITE = "https://labs.setups.works";

export const metadata: Metadata = {
  title: `About Us — ${APP_NAME}`,
  description: `${APP_NAME} is an AI-powered coding interview preparation platform founded by ${FOUNDER.name}, a product of Setups Works.`,
};

/** ProfilePage + Person so Google ties the founder's entity to Setups Works Lab. */
const founderLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": "Person",
    "@id": `${SITE}/#founder`,
    name: FOUNDER.name,
    jobTitle: FOUNDER.role,
    description: `Founder and developer of ${APP_NAME} (labs.setups.works).`,
    url: `${SITE}/about`,
    worksFor: {
      "@type": "Organization",
      name: APP_NAME,
      "@id": `${SITE}/#org`,
      url: SITE,
    },
    birthDate: FOUNDER.birthDate,
    birthPlace: { "@type": "Place", name: FOUNDER.birthPlace },
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Wikidata",
      value: FOUNDER.wikidataId,
      url: `https://www.wikidata.org/wiki/${FOUNDER.wikidataId}`,
    },
    sameAs: [...FOUNDER.sameAs],
  },
};

const VALUES = [
  {
    icon: Target,
    title: "Outcome-focused",
    text: "Everything we build is aimed at one thing — getting you interview-ready faster.",
  },
  {
    icon: Sparkles,
    title: "AI-first",
    text: "We pair classic practice with AI mentoring, reviews and personalized plans.",
  },
  {
    icon: Rocket,
    title: "Always improving",
    text: "We ship fast and listen — new tools, problems and fixes land every week.",
  },
];

export default function AboutPage() {
  return (
    <InfoLayout>
      <JsonLd data={founderLd} />
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-tight text-[#006bff]">
        <span className="size-1.5 rounded-full bg-[#006bff]" /> About us
      </span>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
        Building the fastest path to your next offer
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        {APP_NAME} is an AI-powered coding interview preparation platform. We
        bring together a deep problem bank, an instant multi-language compiler,
        AI mentoring, spaced repetition, skill analytics, contests and a
        community — so you can practice smarter and walk into interviews with
        confidence.
      </p>

      {/* mission */}
      <section className="mt-12 rounded-2xl border bg-card p-6 sm:p-8">
        <h2 className="text-lg font-bold">Our mission</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Great engineering opportunities shouldn&apos;t hinge on who can afford
          the most expensive prep. We&apos;re making world-class, AI-assisted
          interview preparation accessible to everyone — with a powerful free
          tier and affordable plans for those who want more.
        </p>
      </section>

      {/* values */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {VALUES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border bg-card p-5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4.5 text-primary" />
            </span>
            <h3 className="mt-3 text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {text}
            </p>
          </div>
        ))}
      </section>

      {/* company */}
      <section className="mt-8 rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <h2 className="text-lg font-bold">The company</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {APP_NAME} (labs.setups.works) was{" "}
          <strong className="text-foreground">founded by {FOUNDER.name}</strong>{" "}
          and is a product of{" "}
          <strong className="text-foreground">Setups Works</strong>, an
          independent software studio.
          {FOUNDER.name} designs, builds and maintains the platform.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
            <Code2 className="mt-0.5 size-4 text-primary" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Founder &amp; Developer
              </dt>
              <dd className="text-sm font-medium">{FOUNDER.name}</dd>
              <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {FOUNDER.profiles.map((p) => (
                  <a
                    key={p.label}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="text-primary hover:underline"
                  >
                    {p.label}
                  </a>
                ))}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
            <Building2 className="mt-0.5 size-4 text-primary" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company
              </dt>
              <dd className="text-sm font-medium">Setups Works</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
            <Mail className="mt-0.5 size-4 text-primary" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </dt>
              <dd className="text-sm font-medium">
                <a
                  href="mailto:info@setups.works"
                  className="hover:text-primary"
                >
                  info@setups.works
                </a>
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
            <Phone className="mt-0.5 size-4 text-primary" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone
              </dt>
              <dd className="text-sm font-medium">
                <a href="tel:+916383984698" className="hover:text-primary">
                  +91 63839 84698
                </a>
              </dd>
            </div>
          </div>
        </dl>
      </section>

      {/* cta */}
      <section className="mt-8 flex flex-col items-center gap-3 rounded-2xl border bg-primary/5 p-8 text-center">
        <Heart className="size-5 fill-red-500 text-red-500" />
        <h2 className="text-lg font-bold">Want to talk to us?</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We&apos;d love to hear your feedback, partnership ideas or questions.
        </p>
        <Link
          href="/contact"
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Contact us
        </Link>
      </section>
    </InfoLayout>
  );
}
