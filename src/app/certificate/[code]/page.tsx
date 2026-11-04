import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Logo } from "@/components/shared/logo";
import { JsonLd } from "@/components/json-ld";
import { certificateGraph } from "@/lib/seo";
import { PrintButton } from "@/features/lms/print-button";
import { normalizeCertificateCode } from "@/lib/lms/certificate";
import { lmsEnabled } from "@/lib/lms/flag";
import { APP_NAME } from "@/lib/constants";
import { getCertificateByCode } from "@/services/lms-certificates";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

// Names are personal data and the URL is the credential: keep these out of search indexes.
export const metadata: Metadata = { title: "Certificate of completion", robots: { index: false, follow: false } };

/** Public, printable certificate. Anyone with the code can verify it is genuine. */
export default async function CertificatePage({ params }: Props) {
  if (!lmsEnabled()) notFound();
  const code = normalizeCertificateCode((await params).code);
  if (!code) notFound();
  const cert = await getCertificateByCode(code);
  if (!cert) notFound();

  return (
    <div className="min-h-svh bg-muted/30 px-4 py-8 print:bg-white print:p-0">
      <JsonLd data={certificateGraph(cert)} />
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Logo href="/" />
          <PrintButton />
        </div>

        <article className="rounded-2xl border-4 border-double bg-background p-8 text-center shadow-sm sm:p-14 print:rounded-none print:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Certificate of completion</p>
          <p className="mt-8 text-sm text-muted-foreground">This certifies that</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{cert.learnerName}</h1>
          <p className="mt-6 text-sm text-muted-foreground">has successfully completed the course</p>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">{cert.courseTitle}</h2>

          <div className="mt-10 flex flex-wrap items-end justify-center gap-x-16 gap-y-6 text-sm">
            <div>
              <p className="font-medium">{format(cert.issuedAt, "MMMM d, yyyy")}</p>
              <p className="mt-1 border-t pt-1 text-xs text-muted-foreground">Date issued</p>
            </div>
            {cert.instructorName && (
              <div>
                <p className="font-medium">{cert.instructorName}</p>
                <p className="mt-1 border-t pt-1 text-xs text-muted-foreground">Instructor</p>
              </div>
            )}
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            Issued by {APP_NAME} · Verification code <span className="font-mono font-semibold text-foreground">{cert.code}</span>
          </p>
        </article>

        <p className="text-center text-xs text-muted-foreground print:hidden">
          This certificate is genuine: it was issued by {APP_NAME} and this page is the verification.
        </p>
      </div>
    </div>
  );
}
