import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { GraduationCap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { listCertificates } from "@/services/lms-certificates";

export const metadata: Metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const certs = await listCertificates(session.user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
      {certs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-muted-foreground">
          <GraduationCap className="size-8" />
          <p className="text-sm">Finish a course to earn your first certificate.</p>
          <Button asChild size="sm"><Link href="/learn/my-courses">My courses</Link></Button>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {certs.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.courseTitle}</p>
                <p className="text-xs text-muted-foreground">
                  Issued {format(c.issuedAt, "MMM d, yyyy")} · <span className="font-mono">{c.code}</span>
                </p>
              </div>
              <Button asChild size="sm" variant="outline"><Link href={`/certificate/${c.code}`} target="_blank">View &amp; print</Link></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
