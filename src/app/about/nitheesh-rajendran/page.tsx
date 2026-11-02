import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { FOUNDER } from "@/lib/founder";
import { FOUNDER_PROFILE as P } from "@/lib/founder-profile";
import { InfoLayout } from "@/components/shared/info-layout";
import { JsonLd } from "@/components/json-ld";

const SITE = "https://labs.setups.works";
const PATH = "/about/nitheesh-rajendran";

/**
 * The founder's own page.
 *
 * Split out of /about deliberately. That page is visibly about the product —
 * its title, H1 and description all describe Setups Works Lab — while carrying
 * ProfilePage schema claiming a person as its subject. Google weights title and
 * H1 heavily for name queries, so a page that never states the name in either
 * will not rank for it no matter what the markup asserts.
 */

export const metadata: Metadata = {
  // Leads with the name, because that is the query this page exists to answer.
  title: { absolute: `${FOUNDER.name} — ${FOUNDER.role} of ${APP_NAME}` },
  description: `${FOUNDER.name} is an Indian entrepreneur and software developer from Tamil Nadu, founder of ${APP_NAME} and Founder & CEO of Setups Works.`,
  alternates: { canonical: PATH },
  openGraph: {
    type: "profile",
    title: `${FOUNDER.name} — ${FOUNDER.role} of ${APP_NAME}`,
    description: `${FOUNDER.name} is an Indian entrepreneur and software developer, founder of ${APP_NAME} and Setups Works.`,
    url: PATH,
    images: [P.photo],
  },
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * One @graph, so `@id` references resolve against sibling nodes. The Person
 * `@id` matches the sitewide node in layout.tsx — the same entity stated twice,
 * not two competing people.
 */
const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "@id": `${SITE}${PATH}#profilepage`,
      url: `${SITE}${PATH}`,
      name: `${FOUNDER.name} — ${FOUNDER.role} of ${APP_NAME}`,
      mainEntity: { "@id": `${SITE}/#founder` },
      isPartOf: { "@id": `${SITE}/#website` },
      breadcrumb: { "@id": `${SITE}${PATH}#breadcrumb` },
    },
    {
      "@type": "Person",
      "@id": `${SITE}/#founder`,
      name: FOUNDER.name,
      alternateName: [...FOUNDER.alternateNames],
      givenName: FOUNDER.name.split(" ")[0],
      familyName: FOUNDER.name.split(" ").slice(1).join(" "),
      // Multiple titles, because Google's own panel describes him as a
      // director as well as a founder.
      jobTitle: [FOUNDER.role, ...P.titles],
      description: FOUNDER.description,
      url: `${SITE}${PATH}`,
      image: { "@type": "ImageObject", url: P.photo },
      knowsAbout: [...FOUNDER.knowsAbout],
      worksFor: { "@id": `${SITE}/#org` },
      birthDate: FOUNDER.birthDate,
      birthPlace: { "@type": "Place", name: FOUNDER.birthPlace },
      homeLocation: { "@type": "Place", name: P.location },
      nationality: { "@type": "Country", name: "India" },
      // Carries url + sameAs so the institution resolves to the entity Google
      // already knows, rather than leaving it to string similarity.
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: P.education.institution,
        alternateName: P.education.alternateName,
        url: P.education.url,
        sameAs: [...P.education.sameAs],
      },
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: P.education.credentialCategory,
        educationalLevel: P.education.degree,
        about: P.education.fieldOfStudy,
        recognizedBy: { "@type": "CollegeOrUniversity", name: P.education.institution },
      },
      identifier: {
        "@type": "PropertyValue",
        propertyID: "Wikidata",
        value: FOUNDER.wikidataId,
        url: `https://www.wikidata.org/wiki/${FOUNDER.wikidataId}`,
      },
      sameAs: [...FOUNDER.sameAs],
    },
    // Credits as Movie nodes pointing back at the Person by @id. schema.org
    // defines the edge on the work, not on the Person.
    ...P.films.map((f) => ({
      "@type": "Movie",
      "@id": `${SITE}${PATH}#film-${slug(f.title)}`,
      name: f.title,
      // Required by Google's Movie rich result — a node without it is a
      // critical error, not a warning.
      image: f.image,
      description: f.description,
      ...(f.year ? { datePublished: f.year } : {}),
      genre: f.format,
      director: { "@id": `${SITE}/#founder` },
      author: { "@id": `${SITE}/#founder` },
      sameAs: [f.url],
    })),
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE}${PATH}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE}/about` },
        { "@type": "ListItem", position: 3, name: FOUNDER.name },
      ],
    },
  ],
};

const card = "rounded-2xl border bg-card p-6 sm:p-8";

export default function FounderPage() {
  return (
    <InfoLayout>
      <JsonLd data={graph} />

      <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
        <span>/</span>
        <span className="text-foreground">{FOUNDER.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 sm:grid-cols-[1fr_240px] sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-tight text-[#006bff]">
            <span className="size-1.5 rounded-full bg-[#006bff]" /> {FOUNDER.role} · {APP_NAME}
          </span>
          {/* The name is the H1 — this page exists to answer a name query. */}
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {FOUNDER.name}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {FOUNDER.description}
          </p>
        </div>

        <div className="order-first sm:order-none">
          {/* Same portrait as setups.works — one face for one entity. */}
          <div className="relative aspect-square w-full max-w-60 overflow-hidden rounded-2xl border">
            <Image
              src={P.photo}
              alt={`${FOUNDER.name}, ${FOUNDER.role} of ${APP_NAME}`}
              fill
              sizes="(max-width: 640px) 60vw, 240px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>

      {/* Identity facts, stated on the page as well as in the markup so the two agree. */}
      <section className={`mt-8 ${card}`}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="mt-0.5 font-medium">{[FOUNDER.role, ...P.titles].join(" · ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Based in</dt>
            <dd className="mt-0.5 font-medium">{P.location}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Born in</dt>
            <dd className="mt-0.5 font-medium">{FOUNDER.birthPlace}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Education</dt>
            <dd className="mt-0.5 font-medium">
              {P.education.degree} — {P.education.fieldOfStudy}
              <span className="block text-xs font-normal text-muted-foreground">
                {P.education.institution} · {P.education.start}–{P.education.end}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {P.sections.map((s) => (
        <section key={s.heading} className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">{s.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}

      <section className={`mt-6 ${card}`}>
        <h2 className="text-lg font-bold">Skills</h2>
        <div className="mt-4 space-y-4">
          {P.skillGroups.map((g) => (
            <div key={g.label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.items.map((i) => (
                  <span key={i} className="rounded-lg border bg-background px-2.5 py-1 text-xs">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="text-lg font-bold">Filmography</h2>
        <ul className="mt-4 space-y-4">
          {P.films.map((f) => (
            <li key={f.title} className="border-b pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-[#006bff] transition-colors"
                >
                  {f.title}
                </a>
                {f.year && <span className="text-xs text-muted-foreground">{f.year}</span>}
                <span className="rounded-md bg-[#006bff]/10 px-2 py-0.5 text-xs font-medium text-[#006bff]">
                  {f.role}
                </span>
                <span className="text-xs text-muted-foreground">{f.format}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Linking out to profiles Google already associates with this person is
          what lets a newer page borrow relevance from established ones. */}
      <section className={`mt-6 mb-4 ${card}`}>
        <h2 className="text-lg font-bold">Elsewhere</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {FOUNDER.profiles.map((p) => (
            <a
              key={p.label}
              href={p.href}
              target="_blank"
              rel="me noopener noreferrer"
              className="rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:border-[#006bff]/40 hover:text-[#006bff]"
            >
              {p.label}
            </a>
          ))}
          <a
            href="https://setups.works/about/nitheesh-rajendran"
            target="_blank"
            rel="me noopener noreferrer"
            className="rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:border-[#006bff]/40 hover:text-[#006bff]"
          >
            Setups Works
          </a>
        </div>
      </section>
    </InfoLayout>
  );
}
