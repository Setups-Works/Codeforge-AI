import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateCertificateCode } from "@/lib/lms/certificate";

/**
 * Completion certificates. Name and course title are snapshotted at issue time
 * so a certificate stays valid and verifiable if either is edited later.
 */

const sb = () => supabaseAdmin();

export interface Certificate {
  id: string;
  code: string;
  userId: string;
  courseId: string;
  learnerName: string;
  courseTitle: string;
  instructorName: string | null;
  issuedAt: Date;
}

interface CertRow {
  id: string;
  code: string;
  user_id: string;
  course_id: string;
  learner_name: string;
  course_title: string;
  instructor_name: string | null;
  issued_at: string;
}

const COLS = "id,code,user_id,course_id,learner_name,course_title,instructor_name,issued_at";

const fromRow = (r: CertRow): Certificate => ({
  id: r.id,
  code: r.code,
  userId: r.user_id,
  courseId: r.course_id,
  learnerName: r.learner_name,
  courseTitle: r.course_title,
  instructorName: r.instructor_name,
  issuedAt: new Date(r.issued_at),
});

/** Issue a certificate once per (user, course). Safe to call repeatedly. */
export async function issueCertificate(userId: string, courseId: string): Promise<Certificate | null> {
  const client = sb();
  const { data: existing } = await client.from("course_certificates").select(COLS).eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (existing) return fromRow(existing as CertRow);

  const [{ data: user }, { data: course }] = await Promise.all([
    client.from("users").select("name,username").eq("id", userId).maybeSingle(),
    client.from("courses").select("title,instructor_name").eq("id", courseId).maybeSingle(),
  ]);
  const c = course as { title: string; instructor_name: string | null } | null;
  if (!c) return null;
  const u = user as { name: string | null; username: string | null } | null;
  const learnerName = u?.name?.trim() || u?.username || "Learner";

  // A code collision is astronomically unlikely, but retry rather than fail a completion.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client
      .from("course_certificates")
      .insert({ code: generateCertificateCode(), user_id: userId, course_id: courseId, learner_name: learnerName, course_title: c.title, instructor_name: c.instructor_name })
      .select(COLS)
      .single();
    if (!error) return fromRow(data as CertRow);
    if (error.code === "23505") {
      // Either the code collided or a concurrent call already issued this user's certificate.
      const { data: raced } = await client.from("course_certificates").select(COLS).eq("user_id", userId).eq("course_id", courseId).maybeSingle();
      if (raced) return fromRow(raced as CertRow);
      continue;
    }
    throw new Error(error.message);
  }
  return null;
}

export async function listCertificates(userId: string): Promise<Certificate[]> {
  const { data, error } = await sb().from("course_certificates").select(COLS).eq("user_id", userId).order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CertRow[]).map(fromRow);
}

export async function getCertificateByCode(code: string): Promise<Certificate | null> {
  const { data, error } = await sb().from("course_certificates").select(COLS).eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as CertRow) : null;
}
