export const FOUNDER = {
  name: "Nitheesh Rajendran",

  role: "Founder",
  jobTitle: "Founder",

  description:
    "Founder of CodeForge AI and Setups Works. Passionate about Artificial Intelligence, software engineering, and building developer tools that help programmers prepare for coding interviews.",

  url: "https://codeforgeai.io/about",

  image: "https://codeforgeai.io/nitheesh.jpg",

  organization: {
    name: "CodeForge AI",
    parentOrganization: "Setups Works",
  },

  knowsAbout: [
    "Artificial Intelligence",
    "Software Engineering",
    "Competitive Programming",
    "Data Structures and Algorithms",
    "Technical Interview Preparation",
    "Frontend Development",
    "React",
    "Next.js",
    "TypeScript",
    "Machine Learning",
    "Web Development",
  ],

  /**
   * Google already holds a Knowledge Panel for this person, built largely from
   * IMDb. Without the identifiers that resolve to that entity, the Person node
   * here reads as a different individual who happens to share the name — so
   * these are the difference between joining an existing entity and inventing
   * a second one.
   *
   * The founder's own page on the parent company's site is listed too: same
   * person, stated from a second domain we control.
   */
  sameAs: [
    "https://www.linkedin.com/in/nitheeshdr/",
    "https://github.com/nitheeshdr",
    "https://www.imdb.com/name/nm16304237/",
    "https://www.youtube.com/@nitheeshrajendran",
    // Entity anchors — the same values the parent company's Person node uses.
    "https://www.wikidata.org/wiki/Q140500455",
    "https://www.crunchbase.com/person/nitheesh-rajendran",
    // Google Knowledge Panel share link, which helps Google reconcile this
    // node with the panel it already serves.
    "https://share.google/R49gz3hj0ZA74MmQt",
    "https://setups.works/about/nitheesh-rajendran",
  ],

  /**
   * Stated because they match IMDb exactly. A birth date that agrees across
   * independent sources is one of the strongest reconciliation signals there
   * is; one that disagrees is worse than none, so these are copied rather than
   * approximated.
   */
  birthDate: "2005-06-20",
  birthPlace: "Elavur, Tamil Nadu, India",

  /** Wikidata Q-id, emitted as a typed identifier rather than only a sameAs. */
  wikidataId: "Q140500455",

  profiles: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/nitheeshdr/",
    },
    {
      label: "GitHub",
      href: "https://github.com/nitheeshdr",
    },
    {
      label: "IMDb",
      href: "https://www.imdb.com/name/nm16304237/",
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/@nitheeshrajendran",
    },
  ],
} as const;
