"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2, XCircle, Loader2, Eye, EyeOff,
  Wifi, Database, Mail, Brain, Code2, Globe, BarChart3, Lock, CreditCard
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const MASKED = "__MASKED__";

type TestStatus = { loading: boolean; ok: boolean | null; message: string };
const IDLE: TestStatus = { loading: false, ok: null, message: "" };

interface Settings {
  // SEO
  siteUrl: string; siteName: string; siteDescription: string;
  siteKeywords: string; ogImage: string; twitterHandle: string;
  // Analytics
  gaId: string; clarityId: string; gscVerification: string;
  // SMTP
  smtpHost: string; smtpPort: string; smtpUser: string; smtpPass: string; smtpFrom: string;
  // AI
  groqApiKey: string; groqModel: string;
  // Execution
  executionProvider: string; judge0Url: string; judge0ApiKey: string;
  paizaUrl: string; paizaApiKey: string; pistonUrl: string;
  // Redis
  redisUrl: string; redisToken: string;
  // OAuth
  googleClientId: string; googleClientSecret: string;
  githubClientId: string; githubClientSecret: string;
  // Razorpay
  razorpayKeyId: string; razorpayKeySecret: string;
}

const EMPTY: Settings = {
  siteUrl: "", siteName: "", siteDescription: "", siteKeywords: "", ogImage: "", twitterHandle: "",
  gaId: "", clarityId: "", gscVerification: "",
  smtpHost: "", smtpPort: "465", smtpUser: "", smtpPass: "", smtpFrom: "",
  groqApiKey: "", groqModel: "",
  executionProvider: "paiza", judge0Url: "", judge0ApiKey: "",
  paizaUrl: "", paizaApiKey: "", pistonUrl: "",
  redisUrl: "", redisToken: "",
  googleClientId: "", googleClientSecret: "",
  githubClientId: "", githubClientSecret: "",
  razorpayKeyId: "", razorpayKeySecret: "",
};

/* ── helpers ──────────────────────────────────────────────────────────────── */

function SecretInput({ id, label, hint, value, onChange }: {
  id: string; label: string; hint?: string;
  value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const isMasked = value === MASKED;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={isMasked ? "" : value}
          placeholder={isMasked ? "Saved — type to replace" : hint ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function TestBtn({ onClick, status, label = "Test connection" }: {
  onClick: () => void; status: TestStatus; label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={status.loading}>
        {status.loading ? <Loader2 className="size-3.5 animate-spin" /> : <Wifi className="size-3.5" />}
        {label}
      </Button>
      {status.ok === true && (
        <span className="flex items-center gap-1.5 text-xs text-green-500">
          <CheckCircle2 className="size-3.5" />{status.message}
        </span>
      )}
      {status.ok === false && (
        <span className="flex items-center gap-1.5 text-xs text-destructive">
          <XCircle className="size-3.5" />{status.message}
        </span>
      )}
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder, type = "text" }: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Per-service test status
  const [tSmtp, setTSmtp] = useState<TestStatus>(IDLE);
  const [tGroq, setTGroq] = useState<TestStatus>(IDLE);
  const [tMongo, setTMongo] = useState<TestStatus>(IDLE);
  const [tRedis, setTRedis] = useState<TestStatus>(IDLE);
  const [tJudge0, setTJudge0] = useState<TestStatus>(IDLE);
  const [tPiston, setTPiston] = useState<TestStatus>(IDLE);
  const [tPaiza, setTPaiza] = useState<TestStatus>(IDLE);
  const [tRazorpay, setTRazorpay] = useState<TestStatus>(IDLE);

  const set = useCallback((key: keyof Settings) => (val: string) =>
    setS((prev) => ({ ...prev, [key]: val })), []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: Partial<Settings>) => setS({ ...EMPTY, ...data }))
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (res.ok) toast.success("Settings saved");
      else toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function test(service: string, extra: Record<string, string>, setStatus: (t: TestStatus) => void) {
    setStatus({ loading: true, ok: null, message: "" });
    try {
      const res = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, ...extra }),
      });
      const data = await res.json() as { ok: boolean; message: string };
      setStatus({ loading: false, ok: data.ok, message: data.message });
    } catch {
      setStatus({ loading: false, ok: false, message: "Request failed" });
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Site Settings</h1>
          <p className="text-sm text-muted-foreground">Configure SEO, analytics, integrations and environment.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save all
        </Button>
      </div>

      <Tabs defaultValue="seo">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
          {[
            ["seo", Globe, "SEO & Meta"],
            ["analytics", BarChart3, "Analytics"],
            ["email", Mail, "Email"],
            ["ai", Brain, "AI"],
            ["execution", Code2, "Code Runner"],
            ["database", Database, "Database"],
            ["cache", Wifi, "Cache"],
            ["oauth", Lock, "OAuth"],
            ["payments", CreditCard, "Payments"],
          ].map(([val, Icon, label]) => (
            <TabsTrigger key={val as string} value={val as string} className="flex items-center gap-1.5 text-xs">
              <Icon className="size-3.5" />
              {label as string}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── SEO ─────────────────────────────────────────────────────────── */}
        <TabsContent value="seo" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">Controls Open Graph, Twitter cards, and search engine metadata.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="siteUrl" label="Site URL" value={s.siteUrl} onChange={set("siteUrl")} placeholder="https://codeforgeai.io" />
            <Field id="siteName" label="Site Name" value={s.siteName} onChange={set("siteName")} placeholder="CodeForge AI" />
          </div>
          <Field id="siteDescription" label="Meta Description" value={s.siteDescription} onChange={set("siteDescription")} placeholder="AI-powered coding interview prep…" />
          <Field id="siteKeywords" label="Keywords (comma-separated)" value={s.siteKeywords} onChange={set("siteKeywords")} placeholder="coding interview, DSA, LeetCode alternative" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ogImage" label="OG Image URL" value={s.ogImage} onChange={set("ogImage")} placeholder="https://codeforgeai.io/og.png" />
            <Field id="twitterHandle" label="Twitter Handle" value={s.twitterHandle} onChange={set("twitterHandle")} placeholder="codeforgeai" />
          </div>
        </TabsContent>

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">Tracking IDs are injected into every page client-side.</p>
          <Field id="gaId" label="Google Analytics Measurement ID" value={s.gaId} onChange={set("gaId")} placeholder="G-XXXXXXXXXX" />
          <Field id="clarityId" label="Microsoft Clarity Project ID" value={s.clarityId} onChange={set("clarityId")} placeholder="xxxxxxxxxx" />
          <Field id="gscVerification" label="Google Search Console Verification Code" value={s.gscVerification} onChange={set("gscVerification")} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          <p className="text-xs text-muted-foreground">
            For Search Console: add this as the <code className="rounded bg-muted px-1">content</code> value of the{" "}
            <code className="rounded bg-muted px-1">google-site-verification</code> meta tag. It&apos;s injected automatically once you save.
          </p>
        </TabsContent>

        {/* ── Email ───────────────────────────────────────────────────────── */}
        <TabsContent value="email" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">SMTP credentials for transactional email (welcome, password reset, feedback).</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="smtpHost" label="SMTP Host" value={s.smtpHost} onChange={set("smtpHost")} placeholder="smtp.hostinger.com" />
            <Field id="smtpPort" label="SMTP Port" value={s.smtpPort} onChange={set("smtpPort")} placeholder="465" type="number" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="smtpUser" label="SMTP Username / Email" value={s.smtpUser} onChange={set("smtpUser")} placeholder="info@setups.works" />
            <SecretInput id="smtpPass" label="SMTP Password" value={s.smtpPass} onChange={set("smtpPass")} />
          </div>
          <Field id="smtpFrom" label='From Header (e.g. "CodeForge AI <info@setups.works>")' value={s.smtpFrom} onChange={set("smtpFrom")} placeholder="CodeForge AI <info@setups.works>" />
          <TestBtn
            status={tSmtp}
            label="Send test email"
            onClick={() => test("smtp", {
              smtpHost: s.smtpHost, smtpPort: s.smtpPort,
              smtpUser: s.smtpUser, smtpPass: s.smtpPass, smtpFrom: s.smtpFrom,
            }, setTSmtp)}
          />
        </TabsContent>

        {/* ── AI ──────────────────────────────────────────────────────────── */}
        <TabsContent value="ai" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">Groq API powers all AI features — hints, coaching, pair programmer.</p>
          <SecretInput id="groqApiKey" label="Groq API Key" value={s.groqApiKey} onChange={set("groqApiKey")} hint="gsk_…" />
          <Field id="groqModel" label="Groq Model" value={s.groqModel} onChange={set("groqModel")} placeholder="openai/gpt-oss-120b" />
          <TestBtn
            status={tGroq}
            onClick={() => test("groq", { groqApiKey: s.groqApiKey, groqModel: s.groqModel }, setTGroq)}
          />
        </TabsContent>

        {/* ── Code Runner ─────────────────────────────────────────────────── */}
        <TabsContent value="execution" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">Code execution provider for running user submissions.</p>
          <div className="space-y-1.5">
            <Label htmlFor="executionProvider">Provider</Label>
            <select
              id="executionProvider"
              value={s.executionProvider}
              onChange={(e) => setS((p) => ({ ...p, executionProvider: e.target.value }))}
              className="flex h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="paiza">Paiza (default, free)</option>
              <option value="judge0">Judge0</option>
              <option value="piston">Piston</option>
            </select>
          </div>

          {(s.executionProvider === "paiza" || s.executionProvider === "") && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paiza</p>
              <Field id="paizaUrl" label="Paiza API URL" value={s.paizaUrl} onChange={set("paizaUrl")} placeholder="https://api.paiza.io" />
              <SecretInput id="paizaApiKey" label="Paiza API Key" value={s.paizaApiKey} onChange={set("paizaApiKey")} hint="guest (default)" />
              <TestBtn status={tPaiza} onClick={() => test("paiza", { paizaUrl: s.paizaUrl, paizaApiKey: s.paizaApiKey }, setTPaiza)} />
            </div>
          )}

          {s.executionProvider === "judge0" && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Judge0</p>
              <Field id="judge0Url" label="Judge0 API URL" value={s.judge0Url} onChange={set("judge0Url")} placeholder="https://judge0-ce.p.rapidapi.com" />
              <SecretInput id="judge0ApiKey" label="RapidAPI Key" value={s.judge0ApiKey} onChange={set("judge0ApiKey")} />
              <TestBtn status={tJudge0} onClick={() => test("judge0", { judge0Url: s.judge0Url, judge0ApiKey: s.judge0ApiKey }, setTJudge0)} />
            </div>
          )}

          {s.executionProvider === "piston" && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Piston</p>
              <Field id="pistonUrl" label="Piston API URL" value={s.pistonUrl} onChange={set("pistonUrl")} placeholder="https://emkc.org" />
              <TestBtn status={tPiston} onClick={() => test("piston", { pistonUrl: s.pistonUrl }, setTPiston)} />
            </div>
          )}
        </TabsContent>

        {/* ── Database ────────────────────────────────────────────────────── */}
        <TabsContent value="database" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            MongoDB URI is loaded from your server environment (<code className="rounded bg-muted px-1">MONGODB_URI</code> env var) and cannot be changed here for security. Use this to verify the connection is healthy.
          </p>
          <div className="rounded-lg border bg-muted/30 p-4 font-mono text-xs text-muted-foreground">
            MONGODB_URI = <span className="text-foreground">{"*".repeat(24)} (set via .env)</span>
          </div>
          <TestBtn status={tMongo} label="Test MongoDB connection" onClick={() => test("mongodb", {}, setTMongo)} />
        </TabsContent>

        {/* ── Cache / Redis ────────────────────────────────────────────────── */}
        <TabsContent value="cache" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">Upstash Redis for rate limiting and caching.</p>
          <Field id="redisUrl" label="Upstash Redis REST URL" value={s.redisUrl} onChange={set("redisUrl")} placeholder="https://xxxx.upstash.io" />
          <SecretInput id="redisToken" label="Upstash Redis Token" value={s.redisToken} onChange={set("redisToken")} />
          <TestBtn status={tRedis} onClick={() => test("redis", { redisUrl: s.redisUrl, redisToken: s.redisToken }, setTRedis)} />
        </TabsContent>

        {/* ── OAuth ───────────────────────────────────────────────────────── */}
        <TabsContent value="oauth" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">OAuth credentials for social sign-in. Changes require a server restart.</p>
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Google</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="googleClientId" label="Client ID" value={s.googleClientId} onChange={set("googleClientId")} />
              <SecretInput id="googleClientSecret" label="Client Secret" value={s.googleClientSecret} onChange={set("googleClientSecret")} />
            </div>
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GitHub</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="githubClientId" label="Client ID" value={s.githubClientId} onChange={set("githubClientId")} />
              <SecretInput id="githubClientSecret" label="Client Secret" value={s.githubClientSecret} onChange={set("githubClientSecret")} />
            </div>
          </div>
        </TabsContent>

        {/* ── Payments ────────────────────────────────────────────────────── */}
        <TabsContent value="payments" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">Razorpay credentials for subscription billing.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="razorpayKeyId" label="Razorpay Key ID" value={s.razorpayKeyId} onChange={set("razorpayKeyId")} placeholder="rzp_live_…" />
            <SecretInput id="razorpayKeySecret" label="Razorpay Key Secret" value={s.razorpayKeySecret} onChange={set("razorpayKeySecret")} />
          </div>
          <TestBtn status={tRazorpay} onClick={() => test("razorpay", { razorpayKeyId: s.razorpayKeyId, razorpayKeySecret: s.razorpayKeySecret }, setTRazorpay)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
