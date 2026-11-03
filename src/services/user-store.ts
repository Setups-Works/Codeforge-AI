import { supabaseAdmin } from "@/lib/supabase/admin";


/** Whether the user finished onboarding (platform layout + onboarding gate). */
export async function getOnboardingComplete(userId: string): Promise<boolean> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("onboarding")
      .eq("id", userId)
      .maybeSingle();
    return Boolean((data as { onboarding?: { completed?: boolean } } | null)?.onboarding?.completed);
}

/** Onboarding completion + display name (onboarding page). */
export async function getOnboardingWithName(
  userId: string,
): Promise<{ completed: boolean; name: string } | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("onboarding,name")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    const u = data as { onboarding?: { completed?: boolean }; name: string };
    return { completed: Boolean(u.onboarding?.completed), name: u.name };
}

/** The user's current plan (pricing page). */
export async function getUserPlan(userId: string): Promise<string> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    return (data as { plan?: string } | null)?.plan ?? "free";
}

export interface EditorPreferences {
  editorFontSize: number;
  editorTheme: string;
  vimMode: boolean;
  defaultLanguage: string;
}
const DEFAULT_PREFS: EditorPreferences = {
  editorFontSize: 14,
  editorTheme: "vs-dark",
  vimMode: false,
  defaultLanguage: "javascript",
};

export interface SettingsProfile {
  name: string;
  username: string;
  email: string | null;
  providers: string[];
  bio: string;
  location: string;
  website: string;
  githubUrl: string;
  linkedinUrl: string;
  image: string | null;
  coverImage: string | null;
  emailOptOut: boolean;
  preferences: EditorPreferences;
  plan: string;
  planExpiresAt: Date | null;
  trialEndsAt: Date | null;
  billingCycle: string | null;
}

/** Full profile for the settings page. */
export async function getUserSettings(userId: string): Promise<SettingsProfile | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("name,username,email,providers,bio,location,website,github_url,linkedin_url,image,cover_image,email_opt_out,preferences,plan,plan_expires_at,trial_ends_at,billing_cycle")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    const u = data as {
      name: string; username: string; email: string | null; providers: string[] | null;
      bio: string | null; location: string | null;
      website: string | null; github_url: string | null; linkedin_url: string | null;
      image: string | null; cover_image: string | null; email_opt_out: boolean | null;
      preferences: Partial<EditorPreferences> | null; plan: string;
      plan_expires_at: string | null; trial_ends_at: string | null; billing_cycle: string | null;
    };
    return {
      name: u.name, username: u.username, email: u.email, providers: u.providers ?? [],
      bio: u.bio ?? "", location: u.location ?? "",
      website: u.website ?? "", githubUrl: u.github_url ?? "", linkedinUrl: u.linkedin_url ?? "",
      image: u.image, coverImage: u.cover_image, emailOptOut: Boolean(u.email_opt_out),
      preferences: { ...DEFAULT_PREFS, ...(u.preferences ?? {}) },
      plan: u.plan ?? "free",
      planExpiresAt: u.plan_expires_at ? new Date(u.plan_expires_at) : null,
      trialEndsAt: u.trial_ends_at ? new Date(u.trial_ends_at) : null,
      billingCycle: u.billing_cycle,
    };
}

export interface ProfilePatch {
  name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  githubUrl: string;
  linkedinUrl: string;
  image?: string | null;
  coverImage?: string | null;
}

/** Whether a username is taken by someone other than `excludeUserId`. */
export async function isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .neq("id", excludeUserId)
      .maybeSingle();
    return Boolean(data);
}

/** Save the editable public-profile fields. */
export async function updateUserProfile(userId: string, patch: ProfilePatch): Promise<void> {
    const row: Record<string, unknown> = {
      name: patch.name,
      username: patch.username.toLowerCase(),
      bio: patch.bio,
      location: patch.location,
      website: patch.website,
      github_url: patch.githubUrl,
      linkedin_url: patch.linkedinUrl,
    };
    if (patch.image !== undefined) row.image = patch.image;
    if (patch.coverImage !== undefined) row.cover_image = patch.coverImage;
    const { error } = await supabaseAdmin().from("users").update(row).eq("id", userId);
    if (error) throw new Error(error.message);
    return;
}

/** Save the editor/workspace preferences jsonb. */
export async function updateUserPreferences(userId: string, prefs: EditorPreferences): Promise<void> {
    const { error } = await supabaseAdmin().from("users").update({ preferences: prefs }).eq("id", userId);
    if (error) throw new Error(error.message);
    return;
}

/** Toggle marketing/newsletter email opt-out. */
export async function setEmailOptOut(userId: string, optOut: boolean): Promise<void> {
    const { error } = await supabaseAdmin().from("users").update({ email_opt_out: optOut }).eq("id", userId);
    if (error) throw new Error(error.message);
    return;
}

export interface CheckoutProfile {
  name: string;
  email: string;
  billing: Record<string, string> | null;
  trialEndsAt: Date | null;
}

/** Name/email/billing/trial for the checkout page prefill. */
export async function getUserCheckout(userId: string): Promise<CheckoutProfile | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("name,email,billing,trial_ends_at")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    const u = data as { name: string; email: string | null; billing: Record<string, string> | null; trial_ends_at: string | null };
    return { name: u.name, email: u.email ?? "", billing: u.billing, trialEndsAt: u.trial_ends_at ? new Date(u.trial_ends_at) : null };
}

/** Resolve a username to its user id (public profile). */
export async function resolveUserIdByUsername(username: string): Promise<string | null> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
}

/** Count non-banned members (community stats). */
export async function countActiveMembers(): Promise<number> {
    const { count } = await supabaseAdmin()
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("banned", false);
    return count ?? 0;
}

/** Whether followerId already follows followingId. */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabaseAdmin()
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
    return Boolean(data);
}

// ── Admin ────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  image: string | null;
  role: string;
  banned: boolean;
  xp: number;
  level: number;
  solved: number;
  solvedBreakdown: { easy: number; medium: number; hard: number };
  streak: number;
  longestStreak: number;
  providers: string[];
  plan: string;
  planExpiresAt: Date | null;
  trialEndsAt: Date | null;
  billingCycle: string | null;
  betaUser: boolean;
  /** /join offer code this user claimed (e.g. LAUNCH30), null if organic. */
  campaign: string | null;
  createdAt: Date;
}

interface AdminUserStats {
  xp?: number; level?: number;
  solved?: { total?: number; easy?: number; medium?: number; hard?: number };
  streak?: { current?: number; longest?: number };
}

function shapeAdminUser(u: {
  id: string; name: string; username: string; email: string | null; image: string | null;
  role: string; banned: boolean; stats: AdminUserStats | null; providers: string[] | null;
  plan: string | null; planExpiresAt: Date | null; trialEndsAt: Date | null;
  billingCycle: string | null; betaUser: boolean | null; campaign?: string | null; createdAt: Date;
}): AdminUser {
  const s = u.stats ?? {};
  return {
    id: u.id, name: u.name, username: u.username, email: u.email, image: u.image,
    role: u.role, banned: u.banned,
    xp: s.xp ?? 0, level: s.level ?? 1, solved: s.solved?.total ?? 0,
    solvedBreakdown: { easy: s.solved?.easy ?? 0, medium: s.solved?.medium ?? 0, hard: s.solved?.hard ?? 0 },
    streak: s.streak?.current ?? 0, longestStreak: s.streak?.longest ?? 0,
    providers: u.providers ?? [], plan: u.plan ?? "free",
    planExpiresAt: u.planExpiresAt, trialEndsAt: u.trialEndsAt, billingCycle: u.billingCycle,
    betaUser: Boolean(u.betaUser), campaign: u.campaign ?? null, createdAt: u.createdAt,
  };
}

/** Admin: search/filter users. */
export async function adminListUsers(filter: { q?: string; plan?: string }): Promise<AdminUser[]> {
    let query = supabaseAdmin()
      .from("users")
      .select("id,name,username,email,image,role,banned,stats,providers,plan,plan_expires_at,trial_ends_at,billing_cycle,beta_user,campaign,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter.q) {
      const like = `%${filter.q}%`;
      query = query.or(`name.ilike.${like},email.ilike.${like},username.ilike.${like}`);
    }
    if (filter.plan && filter.plan !== "all") {
      if (filter.plan === "beta") query = query.eq("beta_user", true);
      else query = query.eq("plan", filter.plan);
    }
    const { data } = await query;
    return ((data ?? []) as Record<string, unknown>[]).map((u) => shapeAdminUser({
      id: u.id as string, name: u.name as string, username: u.username as string, email: (u.email as string) ?? null,
      image: (u.image as string) ?? null, role: u.role as string, banned: Boolean(u.banned),
      stats: (u.stats as AdminUserStats) ?? null, providers: (u.providers as string[]) ?? null,
      plan: (u.plan as string) ?? null, planExpiresAt: u.plan_expires_at ? new Date(u.plan_expires_at as string) : null,
      trialEndsAt: u.trial_ends_at ? new Date(u.trial_ends_at as string) : null,
      billingCycle: (u.billing_cycle as string) ?? null, betaUser: (u.beta_user as boolean) ?? null,
      campaign: (u.campaign as string) ?? null,
      createdAt: new Date(u.created_at as string),
    }));
}

export interface AdminUserPatch {
  role?: string;
  banned?: boolean;
  plan?: string;
  billingCycle?: string | null;
  planExpiresAt?: Date | null;
  trialEndsAt?: Date | null;
  betaUser?: boolean;
}

const ADMIN_USER_MAP: Record<keyof AdminUserPatch, string> = {
  role: "role", banned: "banned", plan: "plan", billingCycle: "billing_cycle",
  planExpiresAt: "plan_expires_at", trialEndsAt: "trial_ends_at", betaUser: "beta_user",
};

/** Admin: update a user's role/ban/plan fields. Returns false if not found. */
export async function adminUpdateUser(id: string, patch: AdminUserPatch): Promise<boolean> {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      row[ADMIN_USER_MAP[k as keyof AdminUserPatch]] = v instanceof Date ? v.toISOString() : v;
    }
    // Role changes must reach the JWT/claims via app_metadata too.
    if (patch.role !== undefined) {
      try { await supabaseAdmin().auth.admin.updateUserById(id, { app_metadata: { role: patch.role } }); } catch { /* best-effort */ }
    }
    if (!Object.keys(row).length) return true;
    const { data, error } = await supabaseAdmin().from("users").update(row).eq("id", id).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
}

/** Count opted-in, non-banned users (newsletter reach). */
export async function countNewsletterRecipients(): Promise<number> {
    const { count } = await supabaseAdmin()
      .from("users")
      .select("id", { count: "exact", head: true })
      .neq("email_opt_out", true)
      .neq("banned", true);
    return count ?? 0;
}

/** List opted-in, non-banned recipients (email + name) for a broadcast. */
export async function listNewsletterRecipients(): Promise<{ email: string; name?: string }[]> {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("email,name")
      .neq("email_opt_out", true)
      .neq("banned", true);
    return ((data ?? []) as { email: string | null; name: string | null }[])
      .filter((u) => u.email)
      .map((u) => ({ email: u.email as string, name: u.name ?? undefined }));
}


/** Update only the avatar/cover image fields (immediate save on upload). */
export async function updateUserMedia(
  userId: string,
  patch: { image?: string | null; coverImage?: string | null },
): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.image !== undefined) row.image = patch.image;
    if (patch.coverImage !== undefined) row.cover_image = patch.coverImage;
    if (!Object.keys(row).length) return;
    const { error } = await supabaseAdmin().from("users").update(row).eq("id", userId);
    if (error) throw new Error(error.message);
    return;
}
