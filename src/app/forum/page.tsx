import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Plus, TrendingUp, Users } from "@/components/icons";
import { auth } from "@/lib/auth";
import { countDiscussions } from "@/services/discussions-store";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { ForumList } from "@/features/discussions/forum-list";
import { JsonLd } from "@/components/json-ld";
import { BRAND_KEYWORDS, SITE_URL, graph, mergeKeywords, pageNodes } from "@/lib/seo";

const DESCRIPTION =
  "Join the Setups Works Lab community forum — discuss DSA problems, share interview experiences and get coding-interview and career advice.";

export const metadata: Metadata = {
  title: "Community Forum — Setups Works Lab",
  description: DESCRIPTION,
  keywords: mergeKeywords(BRAND_KEYWORDS, ["coding interview forum", "DSA discussion", "interview experiences", "programming community", "career advice for developers"]),
  alternates: { canonical: "/forum" },
};
export const dynamic = "force-dynamic";

export default async function ForumPage() {
  const session = await auth();
  const signedIn = !!session?.user;

  const [total, todayCount] = await Promise.all([
    countDiscussions(),
    countDiscussions({ sinceToday: true }),
  ]);

  const ld = graph(
    ...pageNodes({
      url: "/forum",
      name: "Community Forum",
      description: DESCRIPTION,
      type: "CollectionPage",
      breadcrumb: [
        { name: "Home", url: SITE_URL },
        { name: "Community Forum", url: "/forum" },
      ],
    }),
  );

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={ld} />
      <PublicHeader signedIn={signedIn} />

      {/* hero banner */}
      <div className="border-b bg-linear-to-br from-primary/5 via-background to-background">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquare className="size-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Community Forum</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-lg">
                Discuss algorithms, share solutions, ask questions and learn together. Open to everyone.
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-primary" />
                  <strong className="text-foreground">{total.toLocaleString()}</strong> threads
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  <strong className="text-foreground">{todayCount}</strong> posted today
                </span>
              </div>
            </div>
            {signedIn ? (
              <Button asChild>
                <Link href="/forum/new"><Plus className="size-4" /> New Thread</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/login?callbackUrl=/forum/new"><Plus className="size-4" /> Sign in to post</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <ForumList signedIn={signedIn} />
      </div>
    </div>
  );
}
