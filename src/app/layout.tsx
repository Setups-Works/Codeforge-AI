import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { AnalyticsScripts } from "@/components/analytics";
import { PWARegister } from "@/components/pwa-register";
import { GoogleOneTap } from "@/components/google-one-tap";
import { getEffectiveConfig } from "@/lib/site-config";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { FOUNDER } from "@/lib/founder";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";

// Font Awesome inserts its own CSS at runtime by default; we import the
// stylesheet above and disable auto-insertion to avoid a flash of oversized
// icons and keep it CSP-friendly.
config.autoAddCss = false;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Display face for marketing headlines — geometric/technical, pairs with Geist.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getEffectiveConfig();
  const name = cfg.siteName || APP_NAME;
  const desc = cfg.siteDescription || APP_DESCRIPTION;
  const url = cfg.siteUrl || "https://labs.setups.works";
  const ogImg = cfg.ogImage || undefined;

  return {
    metadataBase: new URL(url),
    title: {
      default: `${name} — AI Coding Interview Prep & Online Compiler`,
      template: `%s | ${name}`,
    },
    description: desc,
    keywords: cfg.siteKeywords
      ? cfg.siteKeywords.split(",").map((k) => k.trim()).filter(Boolean)
      : [
          // Brand
          "Setups Works Lab", "Setups Works", "setupsworkslab", "labs.setups.works", "setups works lab",
          // Primary
          "AI coding mentor", "coding interview preparation", "DSA practice",
          "online compiler", "LeetCode alternative", "algorithm practice",
          "data structures and algorithms", "AI pair programmer",
          "coding practice platform", "technical interview prep", "competitive programming",
          "mock interview", "spaced repetition coding", "FAANG interview prep",
        ],
    authors: [{ name: "Setups Works" }],
    creator: "Setups Works",
    applicationName: name,
    appleWebApp: { capable: true, statusBarStyle: "default", title: name },
    icons: {
      icon: "/icon.svg",
      apple: "/apple-touch-icon.png",
    },
    // No global canonical — each page is self-canonical by default. (A hardcoded
    // "/" here made every page, including /login, claim the homepage as its
    // canonical, so Google showed "Sign in" as the homepage title.)
    verification: cfg.gscVerification ? { google: cfg.gscVerification } : undefined,
    openGraph: {
      type: "website",
      url,
      siteName: name,
      title: `${name} — Master Coding Interviews`,
      description: desc,
      images: ogImg ? [{ url: ogImg, width: 1200, height: 630, alt: name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Master Coding Interviews`,
      description: desc,
      site: cfg.twitterHandle ? `@${cfg.twitterHandle.replace(/^@/, "")}` : undefined,
      // Leave images unset when there's no custom override so each route's
      // opengraph-image.tsx (per-page card) drives the Twitter/X card too.
      images: ogImg ? [ogImg] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cfg = await getEffectiveConfig();
  const name = cfg.siteName || APP_NAME;
  const desc = cfg.siteDescription || APP_DESCRIPTION;
  const url = cfg.siteUrl || "https://labs.setups.works";

  const ogImage = cfg.ogImage || `${url}/opengraph-image`;
  const twitter = cfg.twitterHandle ? cfg.twitterHandle.replace(/^@/, "") : "";
  const sameAs = [
    "https://github.com/CodeForgeAI-io/Codeforge-AI",
    "https://www.linkedin.com/company/codeforge-ai/",
    "https://www.instagram.com/codeforgeai.io/",
    "https://dev.to/codeforgeai-io",
    ...(twitter ? [`https://twitter.com/${twitter}`, `https://x.com/${twitter}`] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#org`,
        name,
        legalName: name,
        alternateName: [
          "Setups Works Lab",
          "Setups Works",
          "setupsworkslab",
          "labs.setups.works",
          "setups works lab",
        ],
        url,
        description: desc,
        slogan: "Master coding interviews with AI.",
        brand: { "@type": "Brand", name: "Setups Works Lab" },
        email: "info@setups.works",
        telephone: "+91-6383984698",
        foundingDate: "2026-06-17",
        founder: { "@id": `${url}/#founder` },
        /**
         * The parent was a bare name string, which asserts a relationship to
         * nothing resolvable — a consumer cannot tell whether "Setups Works"
         * is the agency Google already knows or a coincidence of naming. The
         * @id matches the Organization node setups.works publishes, and the
         * sameAs entries are that entity's own registry identifiers, so the
         * two graphs describe one company rather than two.
         */
        parentOrganization: {
          "@type": "Organization",
          "@id": "https://setups.works/#organization",
          name: "Setups Works",
          url: "https://setups.works",
          sameAs: [
            "https://www.wikidata.org/wiki/Q140500419",
            "https://www.crunchbase.com/organization/setups-works",
          ],
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Chennai",
          addressRegion: "Tamil Nadu",
          addressCountry: "IN",
        },
        foundingLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Chennai",
            addressRegion: "Tamil Nadu",
            addressCountry: "IN",
          },
        },
        areaServed: "Worldwide",
        knowsAbout: [
          "Coding interview preparation",
          "Data structures and algorithms",
          "Online code compiler",
          "Competitive programming",
          "AI coding assistant",
          "Technical interviews",
        ],
        logo: {
          "@type": "ImageObject",
          "@id": `${url}/#logo`,
          url: `${url}/icon-512.png`,
          width: 512,
          height: 512,
          caption: name,
        },
        image: { "@id": `${url}/#logo` },
        contactPoint: {
          "@type": "ContactPoint",
          email: "info@setups.works",
          telephone: "+91-6383984698",
          contactType: "customer support",
          availableLanguage: "en",
        },
        sameAs,
      },
      {
        "@type": "Person",
        "@id": `${url}/#founder`,
        name: FOUNDER.name,
        alternateName: [...FOUNDER.alternateNames],
        jobTitle: FOUNDER.role,
        description: FOUNDER.description,
        knowsAbout: [...FOUNDER.knowsAbout],
        worksFor: { "@id": `${url}/#org` },
        url: `${url}/about/nitheesh-rajendran`,
        ...(FOUNDER.image ? { image: FOUNDER.image } : {}),
        // Birth facts match IMDb exactly, which is what lets Google merge this
        // node with the Person entity it already holds a panel for.
        birthDate: FOUNDER.birthDate,
        birthPlace: { "@type": "Place", name: FOUNDER.birthPlace },
        // Wikidata as a typed identifier, not only a sameAs link: sameAs says
        // "this is also me", identifier says "this is my ID in that registry".
        identifier: {
          "@type": "PropertyValue",
          propertyID: "Wikidata",
          value: FOUNDER.wikidataId,
          url: `https://www.wikidata.org/wiki/${FOUNDER.wikidataId}`,
        },
        sameAs: [...FOUNDER.sameAs],
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name,
        alternateName: ["Setups Works Lab", "Setups Works", "setupsworkslab"],
        description: desc,
        publisher: { "@id": `${url}/#org` },
        inLanguage: "en",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${url}/problems?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": ["WebApplication", "SoftwareApplication"],
        "@id": `${url}/#app`,
        name,
        url,
        description: desc,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript and a modern web browser.",
        inLanguage: "en",
        isAccessibleForFree: true,
        brand: { "@type": "Brand", name: "Setups Works Lab" },
        keywords: [
          "coding interview",
          "leetcode",
          "dsa",
          "competitive programming",
          "ai coding assistant",
          "frontend interview",
          "online compiler",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        featureList: [
          "AI coding mentor and pair programmer",
          "Online compiler for 12 languages",
          "LeetCode-style data-structures & algorithms problems",
          "Spaced-repetition revision (SM-2)",
          "Coding contests and leaderboards",
          "Company-specific interview preparation",
        ],
        potentialAction: {
          "@type": "UseAction",
          target: `${url}/`,
        },
        hasPart: [
          { "@type": "WebPage", name: "Practice Problems", url: `${url}/problems` },
          { "@type": "WebPage", name: "Online Compiler", url: `${url}/compiler` },
          { "@type": "WebPage", name: "Pricing", url: `${url}/pricing` },
          { "@type": "WebPage", name: "Documentation", url: `${url}/help` },
          { "@type": "WebPage", name: "Blog", url: `${url}/blog` },
        ],
        screenshot: ogImage,
        image: { "@id": `${url}/#logo` },
        publisher: { "@id": `${url}/#org` },
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd data={jsonLd} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <Providers>
          {children}
          {/* Google One Tap for signed-out visitors (client id is public by design) */}
          {process.env.GOOGLE_CLIENT_ID && (
            <Suspense>
              <GoogleOneTap clientId={process.env.GOOGLE_CLIENT_ID} />
            </Suspense>
          )}
        </Providers>
        <AnalyticsScripts />
        <SpeedInsights />
        <Analytics />
        <PWARegister />
        {/* AdSense — loaded after the page is interactive so it never blocks
            first paint or competes for the main thread during navigation. */}
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6621171335214437"
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
