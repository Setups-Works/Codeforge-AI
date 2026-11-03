import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CourseGrid } from "@/features/lms/course-card";
import { getSession } from "@/lib/session";
import { listWishlist } from "@/services/lms-engagement";

export const metadata: Metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const courses = await listWishlist(session.user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
      {courses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-muted-foreground">
          <Bookmark className="size-8" />
          <p className="text-sm">Courses you save for later will show up here.</p>
          <Button asChild size="sm"><Link href="/learn/courses">Browse courses</Link></Button>
        </div>
      ) : (
        <CourseGrid courses={courses} basePath="/learn/courses" />
      )}
    </div>
  );
}
