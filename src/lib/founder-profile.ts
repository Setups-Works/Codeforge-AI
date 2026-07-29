/**
 * The founder's full profile.
 *
 * Facts are copied verbatim from the same record that drives
 * setups.works/about/nitheesh-rajendran — birth date, education, skills,
 * filmography, photo. Two sites stating identical *facts* about one person is
 * exactly what entity reconciliation rewards; a date or a degree that differs
 * between them is what makes Google hedge.
 *
 * The prose is deliberately NOT copied. Duplicating 4,000 characters of
 * biography across two domains asks Google to pick a winner and suppress the
 * other, which is the opposite of the goal here — both pages should rank for
 * the name. Same facts, written for this audience.
 */

export const FOUNDER_PROFILE = {
  /** Shared with setups.works on purpose: one face, one entity. */
  photo:
    "https://res.cloudinary.com/dvtsr6ch/image/upload/v1783274785/setupsworks/jtlq18stwgen5swe3dwv.jpg",

  /** Roles beyond the primary one. Google's own panel lists him as a director. */
  titles: [
    "Software Developer",
    "Web Designer",
    "Digital Marketer",
    "Film Director",
  ],

  location: "Elavur, Tamil Nadu, India",

  education: {
    institution: "Vels Institute of Science, Technology & Advanced Studies",
    alternateName: "VISTAS",
    url: "https://vistas.ac.in",
    /**
     * The university exactly as Google's own entity names it, plus the same
     * identifiers, so the Person node ties to the institution Google already
     * knows rather than to a similarly-named one.
     */
    sameAs: [
      "https://www.wikidata.org/wiki/Q7919327",
      "https://en.wikipedia.org/wiki/Vels_Institute_of_Science,_Technology_%26_Advanced_Studies",
    ],
    degree: "Bachelor of Technology (B.Tech)",
    fieldOfStudy:
      "Computer Science and Engineering (Artificial Intelligence & Machine Learning)",
    start: "2022",
    end: "2026",
    credentialCategory: "Bachelor's degree",
  },

  /** Grouped by discipline, as on setups.works. */
  skillGroups: [
    { label: "Programming languages", items: ["JavaScript", "TypeScript", "Python", "Java", "HTML", "CSS", "SQL"] },
    { label: "Frontend", items: ["React.js", "Next.js", "Flutter", "React Native", "Tailwind CSS", "Bootstrap"] },
    { label: "Backend", items: ["Node.js", "Express.js", "REST APIs"] },
    { label: "Databases", items: ["MongoDB", "PostgreSQL", "Firebase", "Supabase", "MySQL"] },
    { label: "Artificial intelligence", items: ["Generative AI", "AI Integration", "Prompt Engineering", "AI Automation", "LLM Applications"] },
    { label: "UI/UX", items: ["Figma", "Wireframing", "Prototyping", "Product Design"] },
    { label: "CMS & e-commerce", items: ["WordPress", "WooCommerce", "Shopify", "Webflow"] },
    { label: "Cloud & DevOps", items: ["Git", "GitHub", "Vercel", "Render", "Cloud Deployment"] },
    { label: "Digital marketing", items: ["SEO", "Google Ads", "Meta Ads", "Branding", "Social Media Marketing"] },
    { label: "Cybersecurity", items: ["Responsible Disclosure", "Security Research", "Secure Development Practices", "Web Security Testing"] },
  ],

  /**
   * Directing and writing credits, taken from IMDb's own title pages so the
   * strings match character for character. Google's Knowledge Panel for this
   * person is a film-industry panel sourced from IMDb; stating the same credits
   * here gives that claim a second origin.
   */
  films: [
    {
      title: "Neram",
      year: "",
      role: "Director, Writer",
      format: "Short film · Sci-Fi",
      url: "https://www.imdb.com/title/tt36239689/",
      description:
        "A boy's discovery of a time-controlling watch leads him to alter fate, risking the life of a loved one.",
    },
    {
      title: "Number Thaan Kaasu",
      year: "2024",
      role: "Director, Writer",
      format: "Short film · Drama",
      url: "https://www.imdb.com/title/tt32792683/",
      description:
        "Two friends create a virtual wallet for quick cash, unaware a web developer tracks their scam. Their meeting sparks a confrontation and police intervention.",
    },
  ],

  /** Narrative written for this site rather than copied from setups.works. */
  sections: [
    {
      heading: "Early life",
      body: "Nitheesh Rajendran is an Indian entrepreneur and software developer from Tamil Nadu, India. An early interest in computers, design and the internet moved from building websites to building complete software products, mobile applications and AI-powered tools.",
    },
    {
      heading: "Career",
      body: "He began professionally as a freelance web developer, building sites and digital products for businesses and startups, then expanded into full-stack engineering, mobile development, UI/UX design, cloud deployment and artificial intelligence. His work spans business websites, e-commerce platforms, AI applications, automation tools, custom dashboards and enterprise software.",
    },
    {
      heading: "Building CodeForge AI",
      body: "CodeForge AI grew out of a specific problem he kept seeing: strong engineers losing offers to interview format rather than ability. It pairs a deep problem bank and an instant multi-language compiler with AI mentoring, spaced repetition and skill analytics — practice that adapts to the person doing it. It is built and operated under Setups Works, the digital agency he founded and leads.",
    },
    {
      heading: "Security research",
      body: "Alongside development he researches web application security — authentication and API security, secure development practices, the OWASP Top 10 and vulnerability analysis. He follows responsible disclosure: issues found in publicly accessible applications are reported privately to the organisation concerned rather than published.",
    },
    {
      heading: "Filmmaking",
      body: "Outside software he directs and writes short films, with credits listed on IMDb. He treats creativity and engineering as complementary — the same instinct for structure and pacing that shapes a short film shapes a product.",
    },
  ],
} as const;
