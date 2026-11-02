import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { auth } from "@/lib/auth";
import { getPublicProfile } from "@/services/stats";
import { resolveUserIdByUsername, isFollowing as checkFollowing } from "@/services/user-store";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { PublicProfile } from "@/features/profile/public-profile";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — Setups Works Lab` };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  const [data, session] = await Promise.all([
    getPublicProfile(username).catch(() => null),
    auth(),
  ]);
  if (!data) notFound();

  const isOwner = session?.user?.username === data.username;
  const signedIn = !!session?.user;

  // resolve target user's _id and check follow status
  let targetUserId: string | undefined;
  let isFollowing = false;

  if (signedIn && !isOwner) {
    const resolvedId = await resolveUserIdByUsername(data.username);
    if (resolvedId) {
      targetUserId = resolvedId;
      isFollowing = await checkFollowing(session!.user.id, targetUserId);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-sm bg-background/95">
        <Logo />
        <Button asChild variant="outline" size="sm">
          <Link href={session ? "/dashboard" : "/login"}>
            <ArrowLeft className="size-4" />
            {session ? "Back to app" : "Sign in"}
          </Link>
        </Button>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <PublicProfile
          data={data}
          isOwner={isOwner}
          signedIn={signedIn}
          targetUserId={targetUserId}
          isFollowing={isFollowing}
        />
      </div>
    </div>
  );
}
