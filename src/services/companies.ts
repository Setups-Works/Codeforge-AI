import { COMPANIES } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import { supabaseAdmin } from "@/lib/supabase/admin";


const COMPANY_DESCRIPTIONS: Record<string, string> = {
  Google: "Algorithm-heavy interviews with emphasis on optimal solutions and system design.",
  Amazon: "Leadership principles meet practical coding — expect arrays, trees and OOD.",
  Microsoft: "Balanced mix of DSA fundamentals, strings and dynamic programming.",
  Meta: "Speed matters — graphs, recursion and product-minded problem solving.",
  Netflix: "Senior-leaning interviews focused on real-world engineering problems.",
  Uber: "Maps, graphs and geospatial flavored questions with scaling twists.",
  Atlassian: "Collaborative coding rounds with data structures and API design.",
};

let companiesEnsured = false;

export async function ensureDefaultCompanies(): Promise<void> {
  if (companiesEnsured) return;
    const sb = supabaseAdmin();
    const rows = COMPANIES.map((name) => ({
      name,
      slug: slugify(name),
      description: COMPANY_DESCRIPTIONS[name] ?? "",
      logo: "building-2",
    }));
    // Insert only the ones not already present (no unique on name → check first).
    const { data: existing } = await sb.from("companies").select("slug");
    const have = new Set((existing ?? []).map((r) => r.slug));
    const missing = rows.filter((r) => !have.has(r.slug));
    if (missing.length) {
      const { error } = await sb.from("companies").insert(missing);
      if (error) throw new Error(error.message);
    }
    companiesEnsured = true;
    return;
}

export interface CompanyListItem {
  slug: string;
  name: string;
  description: string;
  questionCount: number;
  solvedCount: number;
}

interface SbCompanyRow {
  slug: string;
  name: string;
  description: string | null;
}

export async function listCompaniesWithProgress(
  userId?: string,
): Promise<CompanyListItem[]> {
  await ensureDefaultCompanies();
    const sb = supabaseAdmin();
    const [companiesRes, questionsRes] = await Promise.all([
      sb.from("companies").select("slug,name,description").order("name"),
      sb.from("questions").select("id,companies").eq("is_published", true),
    ]);
    if (companiesRes.error) throw new Error(companiesRes.error.message);
    if (questionsRes.error) throw new Error(questionsRes.error.message);

    // Aggregate question ids per company name (mirrors the Mongo $unwind).
    const byCompany = new Map<string, string[]>();
    for (const q of (questionsRes.data ?? []) as {
      id: string;
      companies: string[] | null;
    }[]) {
      for (const c of q.companies ?? []) {
        const arr = byCompany.get(c) ?? [];
        arr.push(q.id);
        byCompany.set(c, arr);
      }
    }

    let solvedIds = new Set<string>();
    if (userId) {
      const { data } = await sb
        .from("submissions")
        .select("question_id")
        .eq("user_id", userId)
        .eq("kind", "dsa")
        .eq("status", "Accepted")
        .not("question_id", "is", null);
      solvedIds = new Set((data ?? []).map((r) => String(r.question_id)));
    }

    return ((companiesRes.data ?? []) as SbCompanyRow[]).map((company) => {
      const ids = byCompany.get(company.name) ?? [];
      return {
        slug: company.slug,
        name: company.name,
        description: company.description ?? "",
        questionCount: ids.length,
        solvedCount: ids.filter((id) => solvedIds.has(id)).length,
      };
    });
}

export async function getCompanyBySlug(slug: string) {
  await ensureDefaultCompanies();
    const { data, error } = await supabaseAdmin()
      .from("companies")
      .select("slug,name,description,logo")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as {
      slug: string;
      name: string;
      description: string | null;
      logo: string | null;
    } | null;
}
