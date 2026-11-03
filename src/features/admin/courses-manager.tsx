"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Loader2, Plus } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/plans";
import { api } from "@/lib/lms/api";
import { COURSE_LIMITS } from "@/lib/lms/constants";
import type { AdminCourse } from "@/services/lms-courses";

export const STATUS_VARIANT = { published: "default", draft: "secondary", archived: "outline" } as const;

export function CoursesManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => api<{ courses: AdminCourse[] }>("/api/admin/courses"),
  });

  const create = useMutation({
    mutationFn: () => api<{ id: string }>("/api/admin/courses", { method: "POST", json: { title } }),
    onSuccess: ({ id }) => router.push(`/admin/courses/${id}`),
    onError: (e) => toast.error(e.message),
  });

  const courses = data?.courses ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">Create and manage the courses you sell.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New course
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <GraduationCap className="size-6" />
            <p className="text-sm">No courses yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Lessons</TableHead>
                <TableHead>Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/courses/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">/{c.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{formatPrice(c.isFree ? 0 : c.priceInr)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{c.stats.lessonCount ?? 0}</TableCell>
                  <TableCell className="text-sm tabular-nums">{c.stats.students ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>Give it a working title. You can change everything later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="course-title" className="text-xs">Title</Label>
            <Input
              id="course-title"
              value={title}
              maxLength={COURSE_LIMITS.title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && title.trim().length >= 3 && create.mutate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || title.trim().length < 3}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
