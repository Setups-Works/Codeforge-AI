import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid } from "@/lib/lms/guard";
import { CourseEditor } from "@/features/admin/course-editor";

export const metadata: Metadata = { title: "Admin · Edit course" };

export default async function AdminCourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!lmsEnabled() || !isUuid(id)) notFound();
  return <CourseEditor courseId={id} />;
}
