import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { auth } from "@/lib/auth";
import { getDiscussionForView, getDiscussionTitle } from "@/services/discussions-store";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { ForumDetail } from "@/features/discussions/forum-detail";
import { JsonLd } from "@/components/json-ld";
import { APP_NAME } from "@/lib/constants";

const SITE = "https://labs.setups.works";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = await getDiscussionTitle(id);
  if (!title) return { title: "Thread" };
  const description = `${title} — join the discussion on the ${APP_NAME} community forum for coding-interview prep, DSA and career advice.`;
  return {
    title: `${title} — Forum`,
    description,
    alternates: { canonical: `/forum/${id}` },
    openGraph: { type: "article", url: `${SITE}/forum/${id}`, title: `${title} — Forum`, description },
  };
}

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const discussion = await getDiscussionForView(id);
  if (!discussion) notFound();

  const author = discussion.author;
  const threadLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": `${SITE}/forum/${id}#thread`,
    headline: discussion.title,
    url: `${SITE}/forum/${id}`,
    datePublished: discussion.createdAt,
    text: (discussion.content ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
    author: author
      ? { "@type": "Person", name: author.name || author.username, url: `${SITE}/profile/${author.username}` }
      : { "@type": "Organization", name: APP_NAME, url: SITE },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: discussion.upvotes?.length ?? 0 },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: discussion.replies?.length ?? 0 },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/ViewAction", userInteractionCount: discussion.views ?? 0 },
    ],
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
    },
  };

  return (
    <div className="min-h-svh bg-background">
      <JsonLd data={threadLd} />
      <PublicHeader signedIn={!!session?.user} />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/forum"><ArrowLeft className="size-4" /></Link>
          </Button>
          <h1 className="text-lg font-bold leading-tight">{discussion.title}</h1>
        </div>
        <ForumDetail
          discussion={JSON.parse(JSON.stringify(discussion))}
          userId={session?.user?.id}
          userRole={session?.user?.role}
          signedIn={!!session?.user}
        />
      </div>
    </div>
  );
}
