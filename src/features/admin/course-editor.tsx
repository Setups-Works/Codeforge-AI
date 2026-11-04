"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
  X,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { api } from "@/lib/lms/api";
import { COURSE_LEVELS, COURSE_LIMITS, LESSON_KINDS, type CourseStatus, type LessonKind } from "@/lib/lms/constants";
import { INCLUDABLE_PLANS } from "@/lib/lms/growth";
import { STATUS_VARIANT } from "@/features/admin/courses-manager";
import type { AdminCourse, AdminCourseDetail, AdminLesson, AdminSection } from "@/services/lms-courses";
import type { AdminEnrollment } from "@/services/lms-learn";
import type { Review } from "@/services/lms-engagement";
import { Stars } from "@/features/lms/stars";
import { format } from "date-fns";

const queryKey = (id: string) => ["admin-course", id] as const;

export function CourseEditor({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey(courseId),
    queryFn: () => api<AdminCourseDetail>(`/api/admin/courses/${courseId}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: queryKey(courseId) });
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  const setStatus = useMutation({
    mutationFn: (status: CourseStatus) => api(`/api/admin/courses/${courseId}`, { method: "PATCH", json: { status } }),
    onSuccess: (_d, status) => {
      toast.success(status === "published" ? "Course published" : `Course ${status === "draft" ? "moved to draft" : status}`);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/admin/courses/${courseId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Course deleted");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      router.push("/admin/courses");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return <p className="py-24 text-center text-sm text-muted-foreground">{error?.message ?? "Course not found"}</p>;
  }

  const { course, sections } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/courses" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All courses
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{course.title}</h1>
            <Badge variant={STATUS_VARIANT[course.status]} className="capitalize">{course.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.status === "published" ? (
              <Button variant="outline" size="sm" onClick={() => setStatus.mutate("draft")} disabled={setStatus.isPending}>
                Unpublish
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStatus.mutate("published")} disabled={setStatus.isPending}>
                {setStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} Publish
              </Button>
            )}
            {course.status !== "archived" && (
              <Button variant="outline" size="sm" onClick={() => setStatus.mutate("archived")} disabled={setStatus.isPending}>
                Archive
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => confirm("Delete this course and all its lessons? This cannot be undone.") && remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="curriculum">
        <TabsList>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & SEO</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="curriculum" className="mt-4">
          <Curriculum courseId={courseId} sections={sections} onChange={refresh} />
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <DetailsForm key={course.updatedAt} course={course} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="pricing" className="mt-4">
          <PricingSeoForm key={course.updatedAt} course={course} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="learners" className="mt-4">
          <LearnersPanel courseId={courseId} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsPanel courseId={courseId} onChanged={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── shared bits ─────────────────────────────────────────────────────────

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
const orNull = (v: string) => (v.trim() ? v.trim() : null);

function useSaveCourse(courseId: string, onSaved: () => void) {
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => api(`/api/admin/courses/${courseId}`, { method: "PATCH", json: patch }),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/courses/thumbnail", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Upload failed");
      onChange(d.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
        <Button asChild variant="outline" size="sm" disabled={busy}>
          <label className="cursor-pointer">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        </Button>
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-24 rounded-lg border object-cover" />
      )}
    </Field>
  );
}

// ── Details ─────────────────────────────────────────────────────────────

function DetailsForm({ course, onSaved }: { course: AdminCourse; onSaved: () => void }) {
  const save = useSaveCourse(course.id, onSaved);
  const [f, setF] = useState({
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description,
    thumbnailUrl: course.thumbnailUrl ?? "",
    promoVideoUrl: course.promoVideoUrl ?? "",
    level: course.level ?? "",
    category: course.category ?? "",
    language: course.language,
    tags: course.tags.join(", "),
    outcomes: course.outcomes.join("\n"),
    requirements: course.requirements.join("\n"),
    instructorName: course.instructorName ?? "",
    instructorBio: course.instructorBio ?? "",
    instructorImage: course.instructorImage ?? "",
  });
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">
          <Input value={f.title} maxLength={COURSE_LIMITS.title} onChange={(e) => set("title")(e.target.value)} />
        </Field>
        <Field label="Subtitle" className="sm:col-span-2">
          <Input value={f.subtitle} maxLength={COURSE_LIMITS.subtitle} onChange={(e) => set("subtitle")(e.target.value)} />
        </Field>
        <Field label="Description (Markdown)" className="sm:col-span-2">
          <Textarea rows={8} value={f.description} onChange={(e) => set("description")(e.target.value)} />
        </Field>
        <ImageField label="Thumbnail" value={f.thumbnailUrl} onChange={set("thumbnailUrl")} />
        <Field label="Promo video (Google Drive link)" hint="Shown on the course page as the preview.">
          <Input value={f.promoVideoUrl} onChange={(e) => set("promoVideoUrl")(e.target.value)} placeholder="https://drive.google.com/file/d/…" />
        </Field>
        <Field label="Level">
          <Select value={f.level || "none"} onValueChange={(v) => set("level")(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {COURSE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Category">
          <Input value={f.category} maxLength={60} onChange={(e) => set("category")(e.target.value)} />
        </Field>
        <Field label="Language code">
          <Input value={f.language} maxLength={10} onChange={(e) => set("language")(e.target.value)} />
        </Field>
        <Field label="Tags (comma-separated)">
          <Input value={f.tags} onChange={(e) => set("tags")(e.target.value)} />
        </Field>
        <Field label="What learners will achieve (one per line)">
          <Textarea rows={5} value={f.outcomes} onChange={(e) => set("outcomes")(e.target.value)} />
        </Field>
        <Field label="Requirements (one per line)">
          <Textarea rows={5} value={f.requirements} onChange={(e) => set("requirements")(e.target.value)} />
        </Field>
        <Field label="Instructor name">
          <Input value={f.instructorName} onChange={(e) => set("instructorName")(e.target.value)} />
        </Field>
        <ImageField label="Instructor image" value={f.instructorImage} onChange={set("instructorImage")} />
        <Field label="Instructor bio" className="sm:col-span-2">
          <Textarea rows={3} value={f.instructorBio} onChange={(e) => set("instructorBio")(e.target.value)} />
        </Field>
      </div>
      <Button
        disabled={save.isPending || f.title.trim().length < 3}
        onClick={() =>
          save.mutate({
            title: f.title.trim(),
            subtitle: orNull(f.subtitle),
            description: f.description,
            thumbnailUrl: orNull(f.thumbnailUrl),
            promoVideoUrl: orNull(f.promoVideoUrl),
            level: f.level || null,
            category: orNull(f.category),
            language: f.language.trim() || "en",
            tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
            outcomes: lines(f.outcomes),
            requirements: lines(f.requirements),
            instructorName: orNull(f.instructorName),
            instructorBio: orNull(f.instructorBio),
            instructorImage: orNull(f.instructorImage),
          })
        }
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save details
      </Button>
    </div>
  );
}

// ── Pricing & SEO ───────────────────────────────────────────────────────

function PricingSeoForm({ course, onSaved }: { course: AdminCourse; onSaved: () => void }) {
  const save = useSaveCourse(course.id, onSaved);
  const [f, setF] = useState({
    slug: course.slug,
    isFree: course.isFree,
    includedInPlans: course.includedInPlans,
    priceInr: String(course.priceInr),
    compareAtInr: course.compareAtInr == null ? "" : String(course.compareAtInr),
    seoTitle: course.seoTitle ?? "",
    seoDescription: course.seoDescription ?? "",
    seoKeywords: course.seoKeywords ?? "",
  });
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="URL slug" hint="Changing this changes the public course URL.">
          <Input value={f.slug} onChange={(e) => set("slug")(e.target.value)} />
        </Field>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={f.isFree} onCheckedChange={set("isFree")} id="is-free" />
          <Label htmlFor="is-free" className="text-xs">Free course</Label>
        </div>
        {!f.isFree && (
          <>
            <Field label="Price (whole currency units)">
              <Input type="number" min={0} value={f.priceInr} onChange={(e) => set("priceInr")(e.target.value)} />
            </Field>
            <Field label="Compare-at price (optional)" hint="Shown struck through. Must be higher than the price.">
              <Input type="number" min={0} value={f.compareAtInr} onChange={(e) => set("compareAtInr")(e.target.value)} />
            </Field>
          </>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Included in subscription plans</Label>
          <div className="flex flex-wrap gap-4">
            {INCLUDABLE_PLANS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="checkbox"
                  checked={f.includedInPlans.includes(p)}
                  onChange={(e) => set("includedInPlans")(e.target.checked ? [...f.includedInPlans, p] : f.includedInPlans.filter((x) => x !== p))}
                />
                {p}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Subscribers on a ticked plan get this course without paying. Access ends when their plan does.</p>
        </div>
        <Field label="SEO title" className="sm:col-span-2">
          <Input value={f.seoTitle} maxLength={70} onChange={(e) => set("seoTitle")(e.target.value)} />
        </Field>
        <Field label="SEO description" className="sm:col-span-2">
          <Textarea rows={2} value={f.seoDescription} maxLength={200} onChange={(e) => set("seoDescription")(e.target.value)} />
        </Field>
        <Field label="SEO keywords (comma-separated)" className="sm:col-span-2">
          <Input value={f.seoKeywords} maxLength={300} onChange={(e) => set("seoKeywords")(e.target.value)} />
        </Field>
      </div>
      <Button
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            slug: f.slug.trim(),
            isFree: f.isFree,
            includedInPlans: f.includedInPlans,
            ...(f.isFree ? {} : { priceInr: Number(f.priceInr) || 0 }),
            compareAtInr: f.isFree || !f.compareAtInr ? null : Number(f.compareAtInr),
            seoTitle: orNull(f.seoTitle),
            seoDescription: orNull(f.seoDescription),
            seoKeywords: orNull(f.seoKeywords),
          })
        }
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save pricing & SEO
      </Button>
    </div>
  );
}

// ── Curriculum ──────────────────────────────────────────────────────────

function Curriculum({ courseId, sections, onChange }: { courseId: string; sections: AdminSection[]; onChange: () => void }) {
  const [newTitle, setNewTitle] = useState("");
  const base = `/api/admin/courses/${courseId}`;

  const addSection = useMutation({
    mutationFn: () => api(`${base}/sections`, { method: "POST", json: { title: newTitle } }),
    onSuccess: () => {
      setNewTitle("");
      onChange();
    },
    onError: (e) => toast.error(e.message),
  });

  const moveSection = useMutation({
    mutationFn: (ids: string[]) => api(`${base}/reorder`, { method: "POST", json: { type: "sections", ids } }),
    onSuccess: onChange,
    onError: (e) => toast.error(e.message),
  });

  const swap = (index: number, delta: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    moveSection.mutate(ids);
  };

  return (
    <div className="space-y-4">
      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          No sections yet. Add one to start building the curriculum.
        </p>
      )}
      {sections.map((section, i) => (
        <SectionCard
          key={section.id}
          courseId={courseId}
          section={section}
          sections={sections}
          canUp={i > 0}
          canDown={i < sections.length - 1}
          onMove={(d) => swap(i, d)}
          onChange={onChange}
        />
      ))}
      <div className="flex gap-2">
        <Input
          value={newTitle}
          maxLength={COURSE_LIMITS.title}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && addSection.mutate()}
          placeholder="New section title"
        />
        <Button onClick={() => addSection.mutate()} disabled={addSection.isPending || !newTitle.trim()}>
          {addSection.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add section
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  courseId,
  section,
  sections,
  canUp,
  canDown,
  onMove,
  onChange,
}: {
  courseId: string;
  section: AdminSection;
  sections: AdminSection[];
  canUp: boolean;
  canDown: boolean;
  onMove: (delta: -1 | 1) => void;
  onChange: () => void;
}) {
  const base = `/api/admin/courses/${courseId}`;
  const [title, setTitle] = useState(section.title);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const rename = useMutation({
    mutationFn: () => api(`${base}/sections/${section.id}`, { method: "PATCH", json: { title } }),
    onSuccess: () => {
      setEditing(false);
      onChange();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api(`${base}/sections/${section.id}`, { method: "DELETE" }),
    onSuccess: onChange,
    onError: (e) => toast.error(e.message),
  });
  const addLesson = useMutation({
    mutationFn: () => api(`${base}/lessons`, { method: "POST", json: { sectionId: section.id, title: lessonTitle } }),
    onSuccess: () => {
      setLessonTitle("");
      setAdding(false);
      onChange();
    },
    onError: (e) => toast.error(e.message),
  });
  const moveLesson = useMutation({
    mutationFn: (ids: string[]) => api(`${base}/reorder`, { method: "POST", json: { type: "lessons", sectionId: section.id, ids } }),
    onSuccess: onChange,
    onError: (e) => toast.error(e.message),
  });

  const swapLesson = (index: number, delta: -1 | 1) => {
    const ids = section.lessons.map((l) => l.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    moveLesson.mutate(ids);
  };

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b p-3">
        {editing ? (
          <>
            <Input value={title} maxLength={COURSE_LIMITS.title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
            <Button size="sm" onClick={() => rename.mutate()} disabled={rename.isPending || !title.trim()}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setTitle(section.title); setEditing(false); }}>Cancel</Button>
          </>
        ) : (
          <>
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{section.title}</h3>
            <span className="text-xs text-muted-foreground">{section.lessons.length} lessons</span>
            <Button size="icon" variant="ghost" className="size-8" disabled={!canUp} onClick={() => onMove(-1)} aria-label="Move section up">
              <ChevronUp className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="size-8" disabled={!canDown} onClick={() => onMove(1)} aria-label="Move section down">
              <ChevronDown className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(true)} aria-label="Rename section">
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => confirm(`Delete "${section.title}" and its ${section.lessons.length} lessons?`) && remove.mutate()}
              aria-label="Delete section"
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>

      <div className="divide-y">
        {section.lessons.map((lesson, i) => (
          <LessonRow
            key={`${lesson.id}-${lesson.title}-${lesson.videoUrl}`}
            courseId={courseId}
            lesson={lesson}
            sections={sections}
            canUp={i > 0}
            canDown={i < section.lessons.length - 1}
            onMove={(d) => swapLesson(i, d)}
            onChange={onChange}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3">
        {adding ? (
          <>
            <Input
              autoFocus
              value={lessonTitle}
              maxLength={COURSE_LIMITS.title}
              onChange={(e) => setLessonTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lessonTitle.trim() && addLesson.mutate()}
              placeholder="Lesson title"
              className="h-8 max-w-sm"
            />
            <Button size="sm" onClick={() => addLesson.mutate()} disabled={addLesson.isPending || !lessonTitle.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Add lesson
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <Video className="size-4" /> Import Drive links
            </Button>
          </>
        )}
      </div>

      <BulkImportDialog courseId={courseId} sectionId={section.id} open={bulkOpen} onOpenChange={setBulkOpen} onDone={onChange} />
    </section>
  );
}

function LessonRow({
  courseId,
  lesson,
  sections,
  canUp,
  canDown,
  onMove,
  onChange,
}: {
  courseId: string;
  lesson: AdminLesson;
  sections: AdminSection[];
  canUp: boolean;
  canDown: boolean;
  onMove: (delta: -1 | 1) => void;
  onChange: () => void;
}) {
  const base = `/api/admin/courses/${courseId}/lessons/${lesson.id}`;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: lesson.title,
    kind: lesson.kind,
    videoUrl: lesson.videoUrl,
    captions: lesson.captionsText,
    durationMin: String(lesson.durationMin),
    bodyMd: lesson.bodyMd ?? "",
    isFreePreview: lesson.isFreePreview,
    dripDays: lesson.dripDays == null ? "" : String(lesson.dripDays),
    sectionId: lesson.sectionId,
    problemSlug: lesson.problemSlug ?? "",
    gateNext: lesson.gateNext,
  });
  const set = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      api(base, {
        method: "PATCH",
        json: {
          title: f.title.trim(),
          kind: f.kind,
          videoUrl: f.kind === "video" ? f.videoUrl.trim() : "",
          captions: f.kind === "video" ? f.captions : "",
          durationMin: Number(f.durationMin) || 0,
          bodyMd: f.bodyMd || null,
          isFreePreview: f.isFreePreview,
          dripDays: f.dripDays === "" ? null : Number(f.dripDays),
          problemSlug: f.kind === "problem" ? f.problemSlug.trim() || null : null,
          gateNext: f.gateNext,
          ...(f.sectionId !== lesson.sectionId ? { sectionId: f.sectionId } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Lesson saved");
      setOpen(false);
      onChange();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => api(base, { method: "DELETE" }),
    onSuccess: onChange,
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Video className={cn("size-4 shrink-0", lesson.videoUrl ? "text-primary" : "text-muted-foreground/50")} />
          <span className="truncate text-sm">{lesson.title}</span>
          {lesson.isFreePreview && <Badge variant="outline">Preview</Badge>}
          {lesson.kind === "video" && !lesson.videoUrl && <Badge variant="secondary">No video</Badge>}
        </button>
        <span className="text-xs tabular-nums text-muted-foreground">{lesson.durationMin ? `${lesson.durationMin} min` : ""}</span>
        <Button size="icon" variant="ghost" className="size-8" disabled={!canUp} onClick={() => onMove(-1)} aria-label="Move lesson up">
          <ChevronUp className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!canDown} onClick={() => onMove(1)} aria-label="Move lesson down">
          <ChevronDown className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={() => confirm(`Delete lesson "${lesson.title}"?`) && remove.mutate()}
          aria-label="Delete lesson"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input value={f.title} maxLength={COURSE_LIMITS.title} onChange={(e) => set("title")(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={f.kind} onValueChange={(v) => set("kind")(v as LessonKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LESSON_KINDS.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Section">
            <Select value={f.sectionId} onValueChange={set("sectionId")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {f.kind === "video" && (
            <Field
              label="Video link"
              hint="A Google Drive file shared as “Anyone with the link”, or a direct .mp4/.webm link on an allowed video host (plays in the custom player with speed, resume and subtitles)."
              className="sm:col-span-2"
            >
              <Input value={f.videoUrl} onChange={(e) => set("videoUrl")(e.target.value)} placeholder="https://drive.google.com/file/d/…/view or https://cdn.example.com/lesson.mp4" />
            </Field>
          )}
          {f.kind === "video" && f.videoUrl && !f.videoUrl.includes("drive.google.com") && (
            <Field label="Subtitles (optional)" hint="One per line: Label | language code | link to a .vtt file. Example: English | en | https://cdn.example.com/lesson-en.vtt" className="sm:col-span-2">
              <Textarea rows={3} value={f.captions} onChange={(e) => set("captions")(e.target.value)} />
            </Field>
          )}
          {f.kind === "problem" && (
            <Field label="Problem slug" hint="The slug of a published problem, e.g. two-sum. Completes when the learner's solution is accepted." className="sm:col-span-2">
              <Input value={f.problemSlug} onChange={(e) => set("problemSlug")(e.target.value)} placeholder="two-sum" />
            </Field>
          )}
          {f.kind === "quiz" && (
            <div className="sm:col-span-2">
              <QuizEditor courseId={courseId} lessonId={lesson.id} passPercent={lesson.passPercent} />
            </div>
          )}
          <Field label="Duration (minutes)" hint="Drive can't report length, so enter it here.">
            <Input type="number" min={0} step="0.5" value={f.durationMin} onChange={(e) => set("durationMin")(e.target.value)} />
          </Field>
          <Field label="Drip: unlock after (days, optional)">
            <Input type="number" min={0} value={f.dripDays} onChange={(e) => set("dripDays")(e.target.value)} />
          </Field>
          <Field label="Notes / text content (Markdown)" className="sm:col-span-2">
            <Textarea rows={5} value={f.bodyMd} onChange={(e) => set("bodyMd")(e.target.value)} />
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id={`gate-${lesson.id}`} checked={f.gateNext} onCheckedChange={set("gateNext")} />
            <Label htmlFor={`gate-${lesson.id}`} className="text-xs">Must be completed before later lessons unlock</Label>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id={`preview-${lesson.id}`} checked={f.isFreePreview} onCheckedChange={set("isFreePreview")} />
            <Label htmlFor={`preview-${lesson.id}`} className="text-xs">Free preview (anyone can watch)</Label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !f.title.trim()}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save lesson
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkImportDialog({
  courseId,
  sectionId,
  open,
  onOpenChange,
  onDone,
}: {
  courseId: string;
  sectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const entries = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const run = useMutation({
    mutationFn: () => api<{ lessons: unknown[] }>(`/api/admin/courses/${courseId}/lessons`, { method: "PUT", json: { sectionId, entries } }),
    onSuccess: ({ lessons }) => {
      toast.success(`${lessons.length} lessons added`);
      setText("");
      onOpenChange(false);
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Drive links</DialogTitle>
          <DialogDescription>
            One lesson per line, either a link or <code>Title | link</code>. If any line is invalid nothing is imported.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Intro | https://drive.google.com/file/d/…/view\nhttps://drive.google.com/file/d/…/view"}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending || entries.length === 0 || entries.length > COURSE_LIMITS.bulkLessons}>
            {run.isPending && <Loader2 className="size-4 animate-spin" />} Import {entries.length || ""} lessons
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Learners (manual access) ────────────────────────────────────────────

interface FoundUser {
  id: string;
  name: string;
  email: string | null;
  username: string;
}

function LearnersPanel({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const base = `/api/admin/courses/${courseId}/enrollments`;
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");

  const enrollments = useQuery({
    queryKey: ["admin-course-enrollments", courseId],
    queryFn: () => api<{ enrollments: AdminEnrollment[] }>(base),
  });
  const found = useQuery({
    queryKey: ["admin-user-search", term],
    enabled: term.length >= 2,
    queryFn: () => api<{ users: FoundUser[] }>(`/api/admin/users?q=${encodeURIComponent(term)}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-course-enrollments", courseId] });
    qc.invalidateQueries({ queryKey: queryKey(courseId) });
  };
  const grant = useMutation({
    mutationFn: (userId: string) => api(base, { method: "POST", json: { userId } }),
    onSuccess: () => {
      toast.success("Access granted");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (userId: string) => api(`${base}?userId=${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Access revoked");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const list = enrollments.data?.enrollments ?? [];
  const enrolledIds = new Set(list.map((e) => e.userId));

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Grant access</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q.trim());
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name, username or email" />
          <Button type="submit" variant="outline" disabled={q.trim().length < 2}>Search</Button>
        </form>
        {found.isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {found.data && (
          <ul className="divide-y rounded-lg border">
            {found.data.users.length === 0 && <li className="p-3 text-sm text-muted-foreground">No users found.</li>}
            {found.data.users.slice(0, 10).map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? `@${u.username}`}</p>
                </div>
                <Button size="sm" variant="outline" disabled={enrolledIds.has(u.id) || grant.isPending} onClick={() => grant.mutate(u.id)}>
                  {enrolledIds.has(u.id) ? "Enrolled" : "Grant"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card">
        <h2 className="border-b p-4 text-sm font-semibold">Enrolled learners ({list.length})</h2>
        {enrollments.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nobody is enrolled yet.</p>
        ) : (
          <ul className="divide-y">
            {list.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.userName ?? e.userId}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.userEmail ?? "—"} · {e.source} · {format(new Date(e.enrolledAt), "MMM d, yyyy")}
                  </p>
                </div>
                {e.completedAt && <Badge variant="secondary">Completed</Badge>}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label="Revoke access"
                  onClick={() => confirm(`Revoke access for ${e.userName ?? "this learner"}? Their progress is kept.`) && revoke.mutate(e.userId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Reviews (moderation) ────────────────────────────────────────────────

function ReviewsPanel({ courseId, onChanged }: { courseId: string; onChanged: () => void }) {
  const qc = useQueryClient();
  const key = ["admin-course-reviews", courseId] as const;
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api<{ reviews: (Omit<Review, "createdAt"> & { createdAt: string })[] }>(`/api/admin/courses/${courseId}/reviews`),
  });
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "visible" | "hidden" }) =>
      api(`/api/admin/reviews/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      onChanged();
    },
    onError: (e) => toast.error(e.message),
  });

  const reviews = data?.reviews ?? [];
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="border-b p-4 text-sm font-semibold">Reviews ({reviews.length})</h2>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="divide-y">
          {reviews.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex items-center gap-2">
                  <Stars value={r.rating} /> <span className="font-medium">{r.authorName}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
                  {r.status === "hidden" && <Badge variant="secondary">Hidden</Badge>}
                </p>
                {r.body && <p className="whitespace-pre-line text-muted-foreground">{r.body}</p>}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate({ id: r.id, status: r.status === "visible" ? "hidden" : "visible" })}
              >
                {r.status === "visible" ? "Hide" : "Show"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Quiz editor ─────────────────────────────────────────────────────────

interface DraftQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const blankQuestion = (): DraftQuestion => ({ prompt: "", options: ["", ""], correctIndex: 0, explanation: "" });

function QuizEditor({ courseId, lessonId, passPercent }: { courseId: string; lessonId: string; passPercent: number }) {
  const url = `/api/admin/courses/${courseId}/lessons/${lessonId}/quiz`;
  const { data, isLoading } = useQuery({
    queryKey: ["admin-quiz", lessonId],
    queryFn: () => api<{ quiz: { passPercent: number; questions: (DraftQuestion & { id: string })[] } }>(url),
  });
  if (isLoading || !data) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  return <QuizForm url={url} lessonId={lessonId} initialPass={data.quiz.passPercent ?? passPercent} initial={data.quiz.questions} />;
}

function QuizForm({ url, lessonId, initialPass, initial }: { url: string; lessonId: string; initialPass: number; initial: DraftQuestion[] }) {
  const qc = useQueryClient();
  const [pass, setPass] = useState(String(initialPass));
  const [qs, setQs] = useState<DraftQuestion[]>(
    initial.length ? initial.map((q) => ({ ...q, explanation: q.explanation ?? "" })) : [blankQuestion()],
  );

  const patch = (i: number, p: Partial<DraftQuestion>) => setQs((all) => all.map((q, j) => (j === i ? { ...q, ...p } : q)));

  const save = useMutation({
    mutationFn: () =>
      api(url, {
        method: "PUT",
        json: {
          passPercent: Number(pass) || 70,
          questions: qs.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation || null })),
        },
      }),
    onSuccess: () => {
      toast.success("Quiz saved");
      qc.invalidateQueries({ queryKey: ["admin-quiz", lessonId] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Pass mark (%)</Label>
        <Input type="number" min={1} max={100} value={pass} onChange={(e) => setPass(e.target.value)} className="h-8 w-20" />
      </div>
      {qs.map((q, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <div className="flex items-start gap-2">
            <span className="mt-2 text-xs font-medium text-muted-foreground">{i + 1}.</span>
            <Textarea rows={2} value={q.prompt} onChange={(e) => patch(i, { prompt: e.target.value })} placeholder="Question" />
            <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label="Remove question" onClick={() => setQs((all) => all.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
          {q.options.map((o, oi) => (
            <div key={oi} className="flex items-center gap-2 pl-5">
              <input type="radio" name={`correct-${lessonId}-${i}`} checked={q.correctIndex === oi} onChange={() => patch(i, { correctIndex: oi })} aria-label={`Option ${oi + 1} is correct`} />
              <Input value={o} onChange={(e) => patch(i, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} className="h-8" />
              {q.options.length > 2 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  aria-label="Remove option"
                  onClick={() => patch(i, { options: q.options.filter((_, k) => k !== oi), correctIndex: q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex >= q.options.length - 1 ? 0 : q.correctIndex })}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pl-5">
            {q.options.length < 6 && (
              <Button size="sm" variant="ghost" onClick={() => patch(i, { options: [...q.options, ""] })}>
                <Plus className="size-3.5" /> Option
              </Button>
            )}
          </div>
          <Input value={q.explanation} onChange={(e) => patch(i, { explanation: e.target.value })} placeholder="Explanation shown after passing (optional)" className="ml-5 h-8 w-[calc(100%-1.25rem)]" />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setQs((all) => [...all, blankQuestion()])}>
          <Plus className="size-4" /> Add question
        </Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save quiz
        </Button>
      </div>
    </div>
  );
}
