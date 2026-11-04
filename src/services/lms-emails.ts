import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/mailer";
import { dripUnlockedEmailHtml, dripUnlockedEmailSubject } from "@/lib/email-templates";
import { GROWTH } from "@/lib/lms/growth";
import { dueDripLessons } from "@/lib/lms/drip";

/**
 * Scheduled learner emails (drip-unlock notices). Every send is recorded in `lms_email_log` under a
 * unique (kind, user, ref) key *before* the email goes out, so a retry or an
 * overlapping run can never email the same person twice.
 */

const sb = () => supabaseAdmin();
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.setups.works";

interface Recipient {
  id: string;
  name: string | null;
  email: string | null;
  email_opt_out: boolean;
}

async function recipients(ids: string[]): Promise<Map<string, Recipient>> {
  if (!ids.length) return new Map();
  const { data } = await sb().from("users").select("id,name,email,email_opt_out").in("id", [...new Set(ids)]);
  return new Map(((data ?? []) as Recipient[]).map((u) => [u.id, u]));
}

/** Claim the right to send; false if this exact email was already sent (or claimed). */
async function claim(kind: string, userId: string, refId: string): Promise<boolean> {
  const { error } = await sb().from("lms_email_log").insert({ kind, user_id: userId, ref_id: refId });
  return !error;
}

async function release(kind: string, userId: string, refId: string): Promise<void> {
  await sb().from("lms_email_log").delete().eq("kind", kind).eq("user_id", userId).eq("ref_id", refId);
}

async function sendOnce(kind: string, userId: string, refId: string, to: Recipient, subject: string, html: string): Promise<boolean> {
  if (!to.email || to.email_opt_out) return false;
  if (!(await claim(kind, userId, refId))) return false;
  try {
    await sendEmail({ to: to.email, subject, html });
    return true;
  } catch (e) {
    // The email didn't go out, so free the claim and let the next run try again.
    await release(kind, userId, refId);
    console.error(`[lms-email] ${kind}`, e);
    return false;
  }
}

/**
 * Run the drip job at most once per hour, however often the endpoint is hit.
 * The endpoint has no secret, so this is what stops it being used to hammer the
 * database; the per-email log already stops duplicate emails.
 */
export async function runDripJobThrottled(now: Date = new Date()): Promise<{ skipped: true } | { skipped: false; sent: number }> {
  const bucket = now.toISOString().slice(0, 13); // e.g. 2026-11-05T09
  if (!(await claim("cron_drip", "system", bucket))) return { skipped: true };
  try {
    return { skipped: false, sent: await sendDripUnlockEmails(now) };
  } catch (e) {
    await release("cron_drip", "system", bucket); // let the next hit retry
    throw e;
  }
}

/** Tell learners when a drip-scheduled lesson has just unlocked for them. */
export async function sendDripUnlockEmails(now: Date = new Date()): Promise<number> {
  const client = sb();
  const { data: lessons, error } = await client
    .from("course_lessons")
    .select("id,course_id,title,drip_days")
    .gt("drip_days", 0);
  if (error) throw new Error(error.message);
  const dripLessons = (lessons ?? []) as { id: string; course_id: string; title: string; drip_days: number }[];
  if (!dripLessons.length) return 0;

  const courseIds = [...new Set(dripLessons.map((l) => l.course_id))];
  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    client.from("courses").select("id,title,slug").in("id", courseIds).eq("status", "published"),
    client.from("course_enrollments").select("user_id,course_id,enrolled_at,expires_at").in("course_id", courseIds),
  ]);
  const courseById = new Map(((courses ?? []) as { id: string; title: string; slug: string }[]).map((c) => [c.id, c]));
  const due = dueDripLessons(
    dripLessons.map((l) => ({ lessonId: l.id, courseId: l.course_id, dripDays: l.drip_days })),
    ((enrollments ?? []) as { user_id: string; course_id: string; enrolled_at: string; expires_at: string | null }[]).map((e) => ({
      userId: e.user_id,
      courseId: e.course_id,
      enrolledAt: new Date(e.enrolled_at),
      expiresAt: e.expires_at ? new Date(e.expires_at) : null,
    })),
    now,
    GROWTH.emails.dripWindowHours,
  );
  if (!due.length) return 0;

  const people = await recipients(due.map((d) => d.userId));
  const lessonById = new Map(dripLessons.map((l) => [l.id, l]));
  let sent = 0;
  for (const d of due) {
    const person = people.get(d.userId);
    const course = courseById.get(d.courseId);
    const lesson = lessonById.get(d.lessonId);
    if (!person || !course || !lesson) continue;
    const name = person.name ?? person.email?.split("@")[0] ?? "there";
    const url = `${APP_URL}/learn/watch/${course.slug}/${lesson.id}`;
    if (await sendOnce("drip_unlock", d.userId, lesson.id, person, dripUnlockedEmailSubject(course.title, lesson.title), dripUnlockedEmailHtml({ name, courseTitle: course.title, lessonTitle: lesson.title, lessonUrl: url }))) sent++;
  }
  return sent;
}
