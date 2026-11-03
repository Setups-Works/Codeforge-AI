import { NextRequest,NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { requireFeature } from "@/services/feature-access";
import { supabaseAdmin } from "@/lib/supabase/admin";


interface SbCardRow {
  id: string;
  question_id: string | null;
  interval: number;
  repetitions: number;
  ease_factor: number;
  next_review: string | null;
  last_review: string | null;
}

/** Reshape SR rows + populate questions into the Mongo-compatible card shape. */
async function attachCardQuestions(rows: SbCardRow[]) {
  const ids = [...new Set(rows.map((r) => r.question_id).filter(Boolean))] as string[];
  const qMap = new Map<string, { _id: string; slug: string; title: string; difficulty: string; category: string }>();
  if (ids.length) {
    const { data } = await supabaseAdmin()
      .from("questions")
      .select("id,slug,title,difficulty,category")
      .in("id", ids);
    for (const q of (data ?? []) as { id: string; slug: string; title: string; difficulty: string; category: string }[]) {
      qMap.set(q.id, { _id: q.id, slug: q.slug, title: q.title, difficulty: q.difficulty, category: q.category });
    }
  }
  return rows.map((c) => ({
    _id: c.id,
    question: c.question_id ? qMap.get(c.question_id) ?? null : null,
    interval: c.interval,
    repetitions: c.repetitions,
    easeFactor: c.ease_factor,
    nextReview: c.next_review,
    lastReview: c.last_review,
  }));
}

const SR_COLS = "id,question_id,interval,repetitions,ease_factor,next_review,last_review";

function sm2(quality: number, repetitions: number, easeFactor: number, interval: number) {
  let ef = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  let reps = repetitions;
  let newInterval = interval;

  if (quality >= 3) {
    if (reps === 0) newInterval = 1;
    else if (reps === 1) newInterval = 6;
    else newInterval = Math.round(interval * ef);
    reps++;
  } else {
    reps = 0;
    newInterval = 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return { interval: newInterval, repetitions: reps, easeFactor: ef, nextReview };
}

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const gate = await requireFeature(session.user.plan, "spacedRepetition");
  if (gate) return gate;

  const now = new Date();
    const sb = supabaseAdmin();
    const nowIso = now.toISOString();
    const [dueRes, upRes] = await Promise.all([
      sb.from("spaced_repetition").select(SR_COLS).eq("user_id", session.user.id)
        .lte("next_review", nowIso).order("next_review", { ascending: true }).limit(20),
      sb.from("spaced_repetition").select(SR_COLS).eq("user_id", session.user.id)
        .gt("next_review", nowIso).order("next_review", { ascending: true }).limit(10),
    ]);
    const due = await attachCardQuestions((dueRes.data ?? []) as SbCardRow[]);
    const upcoming = await attachCardQuestions((upRes.data ?? []) as SbCardRow[]);
    return NextResponse.json({ due, upcoming, dueCount: due.length });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;
  const gate = await requireFeature(session.user.plan, "spacedRepetition");
  if (gate) return gate;

  const { questionId, quality } = await req.json();
  if (!questionId || quality === undefined) {
    return NextResponse.json({ error: "questionId and quality required" }, { status: 400 });
  }
    const sb = supabaseAdmin();
    const { data: existing } = await sb
      .from("spaced_repetition")
      .select(SR_COLS)
      .eq("user_id", session.user.id)
      .eq("question_id", questionId)
      .maybeSingle();
    const prev = existing as SbCardRow | null;
    const { interval, repetitions, easeFactor, nextReview } = sm2(
      quality,
      prev?.repetitions ?? 0,
      prev?.ease_factor ?? 2.5,
      prev?.interval ?? 0,
    );
    const row = {
      interval,
      repetitions,
      ease_factor: easeFactor,
      next_review: nextReview.toISOString(),
      last_review: new Date().toISOString(),
    };
    const saved = prev
      ? await sb.from("spaced_repetition").update(row).eq("id", prev.id).select(SR_COLS).single()
      : await sb
          .from("spaced_repetition")
          .insert({ user_id: session.user.id, question_id: questionId, ...row })
          .select(SR_COLS)
          .single();
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 500 });
    const [card] = await attachCardQuestions([saved.data as SbCardRow]);
    return NextResponse.json({ card });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireUser();
  if (error) return error;
  const gate = await requireFeature(session.user.plan, "spacedRepetition");
  if (gate) return gate;

  const { questionId } = await req.json();
  if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });
    const sb = supabaseAdmin();
    const { data: existing } = await sb
      .from("spaced_repetition")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("question_id", questionId)
      .maybeSingle();
    if (!existing) {
      await sb
        .from("spaced_repetition")
        .insert({ user_id: session.user.id, question_id: questionId });
    }
    return NextResponse.json({ ok: true });
}
