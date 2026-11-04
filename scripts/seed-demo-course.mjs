/**
 * Seeds a complete demo course into Supabase so the Learn experience can be
 * explored end to end: a Google Drive video, reading, a real coding-problem
 * lesson, and a gated quiz. Edit the course afterwards in /admin/courses.
 *
 * Dry run by default; --apply writes. --reset removes an existing demo course
 * first (it refuses if anyone has enrolled or bought it).
 *
 * Usage:
 *   node scripts/seed-demo-course.mjs
 *   node scripts/seed-demo-course.mjs --apply
 *   node scripts/seed-demo-course.mjs --apply --reset
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env, .env.local or .env).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const RESET = process.argv.includes("--reset");

const SLUG = "setups-works-lab-demo-course";
const DRIVE_FILE_ID = "1kMc6pw5laK8fXl7JKG_PbYNdKzyODW4N";
const PROBLEM_SLUG = "valid-palindrome";

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    try {
      const match = readFileSync(file, "utf8").match(new RegExp(`^${name}="?([^"\\n]+)"?`, "m"));
      if (match) return match[1];
    } catch {
      // try the next file
    }
  }
  return "";
}

const course = {
  slug: SLUG,
  title: "Setups Works Lab Demo Course",
  subtitle: "A hands-on tour of how courses work: video, reading, a real coding problem and a quiz",
  description: `This short demo course shows everything a Setups Works Lab course can do, so you can see it before you buy anything.

You will:

- **Watch** a video lesson and read a lesson written in Markdown
- **Solve a real problem** in the same coding workspace you use for practice; the lesson completes the moment your solution is accepted
- **Take a quiz** that has to be passed to unlock the final lesson
- **Take notes**, ask questions and chat with the AI mentor on any lesson
- **Earn a certificate** with a code anyone can verify

It is designed to take about half an hour.`,
  category: "Getting started",
  level: "Beginner",
  language: "en",
  tags: ["demo", "getting started", "coding interview"],
  price_inr: 199,
  compare_at_inr: 499,
  is_free: false,
  instructor_name: "Nitheesh Rajendran",
  instructor_bio: "Founder of Setups Works Lab, building tools that help developers prepare for technical interviews.",
  outcomes: [
    "Know how video, reading, coding and quiz lessons fit together",
    "Track your progress and pick up where you left off",
    "See how quizzes unlock the next lesson",
    "Understand how certificates are earned and verified",
  ],
  requirements: ["A free Setups Works Lab account", "No prior coding experience needed to follow the tour"],
  seo_title: "Setups Works Lab Demo Course — see how courses work",
  seo_description: "A short hands-on demo course: watch a lesson, solve a real coding problem, pass a quiz and earn a verifiable certificate.",
  seo_keywords: "demo course, online coding course, coding interview course, setups works lab",
};

const sections = [
  {
    title: "Welcome",
    lessons: [
      {
        title: "Welcome to the demo course",
        kind: "video",
        video: { provider: "drive", ref: DRIVE_FILE_ID },
        duration_s: 0, // Google Drive can't report length: set it in the admin editor
        is_free_preview: true,
      },
      {
        title: "How this course works",
        kind: "text",
        duration_s: 180,
        is_free_preview: true,
        body_md: `## How lessons work

Every lesson is one of four kinds:

| Kind | What you do | How it completes |
| --- | --- | --- |
| Video | Watch it | Click **Mark complete** |
| Reading | Read it | Click **Mark complete** |
| Coding problem | Solve it in the workspace | Automatically, when your solution is accepted |
| Quiz | Answer the questions | Automatically, when you pass |

## Handy things under every lesson

- **My notes** — private notes, optionally with a timestamp
- **Q&A** — ask a question; the instructor's replies are labelled
- **AI mentor** — ask about the lesson you are on (it never gives away quiz answers)

Your progress is saved, so **Continue watching** always takes you back to where you stopped.`,
      },
    ],
  },
  {
    title: "Practice",
    lessons: [
      {
        title: "Try it: solve a real problem",
        kind: "problem",
        problem_slug: PROBLEM_SLUG,
        duration_s: 600,
      },
      {
        title: "Check your understanding",
        kind: "quiz",
        duration_s: 180,
        pass_percent: 67,
        gate_next: true,
        quiz: [
          {
            prompt: "Which kinds of lessons can a course contain?",
            options: ["Video, reading, coding problems and quizzes", "Only videos", "Only quizzes", "Only downloadable files"],
            correct_index: 0,
            explanation: "Courses mix all four kinds, so you can learn an idea, read about it, practise it and then check it.",
          },
          {
            prompt: "What happens when your solution to a coding-problem lesson is accepted?",
            options: ["Nothing until you click Mark complete", "You are charged again", "The lesson completes automatically", "The course restarts"],
            correct_index: 2,
            explanation: "Problem lessons complete themselves as soon as a submission is accepted.",
          },
          {
            prompt: "What do you earn after finishing every lesson in a course?",
            options: ["A new username", "A verifiable certificate", "An automatic refund", "Admin access"],
            correct_index: 1,
            explanation: "A certificate with a unique code is issued, and anyone can check it on its public page.",
          },
        ],
      },
    ],
  },
  {
    title: "Wrap-up",
    lessons: [
      {
        title: "What's next",
        kind: "text",
        duration_s: 120,
        body_md: `## You made it

Finishing this lesson completes the course, and your **certificate** is issued automatically. Find it under **Learn → Certificates**; it has its own public page and a code anyone can use to verify it.

## Where to go from here

- Browse the rest of the catalogue under **Learn → Browse courses**
- Leave a review so other learners know what to expect
- Switch back to **Practice** for more coding problems`,
      },
    ],
  },
];

const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);
const totalSeconds = sections.flatMap((s) => s.lessons).reduce((n, l) => n + l.duration_s, 0);
console.log(`${APPLY ? "APPLY" : "DRY RUN"}: "${course.title}" (/${SLUG}) — ${sections.length} sections, ${lessonCount} lessons, ₹${course.price_inr}`);
for (const s of sections) {
  console.log(`  ${s.title}`);
  for (const l of s.lessons) console.log(`    - [${l.kind}] ${l.title}${l.is_free_preview ? " (free preview)" : ""}${l.gate_next ? " (gates next)" : ""}`);
}
if (!APPLY) {
  console.log("\nNothing written. Re-run with --apply to create it.");
  process.exit(0);
}

const url = loadEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = loadEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

const { data: existing } = await sb.from("courses").select("id").eq("slug", SLUG).maybeSingle();
if (existing) {
  if (!RESET) {
    console.log(`\n/${SLUG} already exists — left untouched. Use --reset to recreate it.`);
    process.exit(0);
  }
  const { count } = await sb.from("course_enrollments").select("id", { count: "exact", head: true }).eq("course_id", existing.id);
  const { count: orders } = await sb.from("course_orders").select("id", { count: "exact", head: true }).eq("course_id", existing.id);
  if (count || orders) {
    console.error(`\nRefusing to reset: ${count} enrolment(s) and ${orders} order(s) exist. Edit the course in the admin instead.`);
    process.exit(1);
  }
  must(await sb.from("courses").delete().eq("id", existing.id), "delete existing");
}

const { data: problem } = await sb.from("questions").select("id").eq("slug", PROBLEM_SLUG).eq("is_published", true).maybeSingle();
if (!problem) {
  console.error(`The coding problem "${PROBLEM_SLUG}" isn't published, so the problem lesson would be empty. Seed the question bank first.`);
  process.exit(1);
}

const created = must(
  await sb.from("courses").insert({ ...course, stats: { lesson_count: lessonCount, duration_s: totalSeconds }, status: "published", published_at: new Date().toISOString() }).select("id").single(),
  "course",
);

try {
  for (const [si, s] of sections.entries()) {
    const section = must(await sb.from("course_sections").insert({ course_id: created.id, title: s.title, position: si }).select("id").single(), "section");
    for (const [li, l] of s.lessons.entries()) {
      const { quiz, ...row } = l;
      const lesson = must(
        await sb.from("course_lessons").insert({ ...row, course_id: created.id, section_id: section.id, position: li }).select("id").single(),
        `lesson ${l.title}`,
      );
      if (quiz) {
        must(
          await sb.from("quiz_questions").insert(quiz.map((q, position) => ({ ...q, lesson_id: lesson.id, position }))),
          "quiz questions",
        );
      }
    }
  }
} catch (e) {
  // Don't leave a half-built course behind.
  await sb.from("courses").delete().eq("id", created.id);
  throw e;
}

console.log(`\nCreated and published /${SLUG}. Edit it at /admin/courses (set the video length, add a thumbnail).`);
