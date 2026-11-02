/**
 * Open roles for the Careers page (/careers). Framework-free so it can be used
 * on the server (pages, sitemap, apply validation) and the client.
 */
export interface Career {
  slug: string;
  title: string;
  type: string; // "Internship" | "Open Source"
  location: string;
  summary: string;
  about: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
  icon: string; // resolves in @/components/icons
}

export const CAREERS: Career[] = [
  {
    slug: "open-source-contributor",
    title: "Open Source Contributor Program",
    type: "Open Source",
    location: "Remote",
    icon: "Code2",
    summary: "Help build Setups Works Lab in the open — ship features, fix bugs and grow your portfolio.",
    about:
      "Join the Setups Works Lab Open Source Contributor Program and work on a real, production product used by developers preparing for interviews. You will collaborate with the team on GitHub, pick up issues that match your level, and get your contributions credited.",
    responsibilities: [
      "Contribute features and bug fixes to the platform",
      "Open clear pull requests and respond to review feedback",
      "Help triage issues and improve documentation",
      "Collaborate with the team on GitHub",
    ],
    requirements: [
      "Comfortable with Git and GitHub",
      "Familiarity with TypeScript, React or Next.js (or eagerness to learn)",
      "Self-driven and communicative",
    ],
    niceToHave: ["Prior open-source contributions", "Experience with MongoDB or Tailwind CSS"],
  },
  {
    slug: "business-development",
    title: "Business Development Intern",
    type: "Internship",
    location: "Remote",
    icon: "TrendingUp",
    summary: "Drive growth, partnerships and go-to-market for Setups Works Lab.",
    about:
      "We are looking for a Business Development Intern to help Setups Works Lab reach more learners. You will work directly with the founder on outreach, partnerships and growth experiments — a high-ownership role with real impact.",
    responsibilities: [
      "Identify and reach out to potential partners and communities",
      "Run outreach and growth experiments",
      "Help shape go-to-market and pricing strategy",
      "Gather user and market feedback",
    ],
    requirements: [
      "Strong written and verbal communication",
      "Self-starter who can work independently",
      "Interest in startups, edtech or developer tools",
    ],
    niceToHave: ["Prior internship or community-building experience", "Basic understanding of SaaS metrics"],
  },
  {
    slug: "qa-testing",
    title: "QA Testing Intern",
    type: "Internship",
    location: "Remote",
    icon: "ShieldCheck",
    summary: "Keep Setups Works Lab rock-solid by finding bugs before users do.",
    about:
      "As a QA Testing Intern you will help us ship a polished, reliable product. You will write and run test cases across the platform, report issues clearly, and help raise the quality bar on every release.",
    responsibilities: [
      "Write and execute manual test cases",
      "Find, reproduce and document bugs",
      "Verify fixes and run regression checks",
      "Help define QA checklists for releases",
    ],
    requirements: [
      "An eye for detail and edge cases",
      "Clear, structured bug reports",
      "Basic understanding of web apps and browsers",
    ],
    niceToHave: ["Exposure to test automation (Playwright/Cypress)", "Basic JavaScript knowledge"],
  },
];

export function getCareer(slug: string): Career | undefined {
  return CAREERS.find((c) => c.slug === slug);
}
