import { getRazorpay,paymentsEnabled } from "@/lib/razorpay";
import { supabaseAdmin } from "@/lib/supabase/admin";


/** Best-effort: stop any live Razorpay auto-pay before removing the account. */
async function cancelSubscription(subId: string | null | undefined): Promise<void> {
  if (!paymentsEnabled() || !subId) return;
  try {
    await getRazorpay().subscriptions.cancel(subId, false);
  } catch (e) {
    console.error("[account] failed to cancel subscription on delete:", e);
  }
}

/**
 * Permanently delete a user and the data they own. Shared content (published
 * questions/challenges/contests) is intentionally left intact. Returns false if
 * the user no longer exists.
 */
export async function deleteUserAndData(userId: string): Promise<boolean> {
return deleteUserAndDataSupabase(userId);
}

/**
 * Supabase deletion. Owned data (submissions, notes, bookmarks, progress,
 * ai_*, subscriptions, follows, …) is removed by ON DELETE CASCADE when the
 * users row goes; discussions FK to users is SET NULL, so — matching the Mongo
 * behaviour — we delete the user's authored discussions explicitly first. The
 * auth identity is removed last.
 */
async function deleteUserAndDataSupabase(userId: string): Promise<boolean> {
  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("users")
    .select("id,razorpay_subscription_id")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return false;

  await cancelSubscription(
    (user as { razorpay_subscription_id: string | null }).razorpay_subscription_id,
  );

  // Discussions: SET NULL by FK, so delete authored ones to mirror Mongo.
  await sb.from("discussions").delete().eq("author_id", userId);

  // Removing the profile row cascades all ON DELETE CASCADE children.
  const { error: delErr } = await sb.from("users").delete().eq("id", userId);
  if (delErr) throw new Error(delErr.message);

  // Remove the Supabase Auth identity (email/password/OAuth links, sessions).
  const { error: authErr } = await sb.auth.admin.deleteUser(userId);
  if (authErr) {
    console.error("[account] failed to delete auth user:", authErr.message);
  }
  return true;
}
