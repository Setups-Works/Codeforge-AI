"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Send, Sparkles, Upload, Users, Eye } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { cn } from "@/lib/utils";

type Mode = "all" | "single" | "test";

export function NewsletterManager() {
  const [mode, setMode] = useState<Mode>("test");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/newsletter")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRecipients(d.recipients))
      .catch(() => {});
  }, []);

  async function generate() {
    if (aiPrompt.trim().length < 3) return toast.error("Describe what to write about.");
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/newsletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubject(data.generated.subject);
      setBody(data.generated.body);
      toast.success("Draft generated — review and edit before sending.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/newsletter/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageUrl(data.url);
      toast.success("Image uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!subject.trim()) return toast.error("Add a subject.");
    if (!body.trim()) return toast.error("Write a body.");
    if (mode === "single" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return toast.error("Enter a valid recipient email.");
    }
    if (mode === "all" && !window.confirm(`Send this newsletter to all ${recipients ?? ""} subscribers?`)) {
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email: email.trim(), subject, heading, body, imageUrl, ctaLabel, ctaUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        mode === "all"
          ? `Sent to ${data.sent} of ${data.total}${data.failed ? ` (${data.failed} failed)` : ""}.`
          : `Sent to ${data.to}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const sendLabel =
    mode === "all" ? `Send to ${recipients ?? "…"} subscribers` : mode === "test" ? "Send test to myself" : "Send to address";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Mail className="size-5 text-primary" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Newsletter</h1>
          <p className="text-sm text-muted-foreground">
            Compose and broadcast an email to your users — or send a single test.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* composer */}
        <div className="space-y-5">
          {/* AI draft */}
          <div className="rounded-xl border bg-card p-4">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" /> Draft with AI
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), generate())}
                placeholder="e.g. Announce the new AI pair programmer and weekly contest"
              />
              <Button onClick={generate} disabled={generating} className="gap-1.5 whitespace-nowrap">
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nl-subject">Subject</Label>
            <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" maxLength={200} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nl-heading">Heading <span className="text-muted-foreground">(optional, shown at top)</span></Label>
            <Input id="nl-heading" value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Big heading inside the email" maxLength={140} />
          </div>

          <div className="space-y-1.5">
            <Label>Body</Label>
            <RichTextEditor value={body} onChange={setBody} />
          </div>

          {/* image — paste a URL or upload (upload needs blob storage configured) */}
          <div className="space-y-1.5">
            <Label>Header image <span className="text-muted-foreground">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste an image URL, or upload →"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-1.5 whitespace-nowrap"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Upload
              </Button>
            </div>
            {/^https?:\/\//.test(imageUrl) && (
              <div className="flex items-center gap-3 pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-16 w-28 rounded-md object-cover" />
                <Button variant="ghost" size="sm" onClick={() => setImageUrl("")}>Remove</Button>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nl-cta-label">Button label <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="nl-cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Open Setups Works Lab" maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-cta-url">Button URL</Label>
              <Input id="nl-cta-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://labs.setups.works/…" />
            </div>
          </div>
        </div>

        {/* right rail: recipients + preview */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border bg-card p-4">
            <Label className="text-xs font-medium">Send to</Label>
            <div className="mt-2 space-y-2">
              {([
                { id: "test", label: "A test to myself", icon: Eye },
                { id: "single", label: "A single address", icon: Mail },
                { id: "all", label: `All subscribers${recipients !== null ? ` (${recipients})` : ""}`, icon: Users },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    mode === opt.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <opt.icon className="size-4" /> {opt.label}
                </button>
              ))}
            </div>
            {mode === "single" && (
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recipient@email.com"
                type="email"
                className="mt-2"
              />
            )}
            <Button onClick={send} disabled={sending} size="lg" className="mt-4 w-full gap-2">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Sending…" : sendLabel}
            </Button>
            {mode === "all" && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Opted-out and banned users are automatically excluded. Every email includes a one-click unsubscribe link.
              </p>
            )}
          </div>

          {/* live preview */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
            <div className="rounded-lg border bg-[#f2f2f2] p-4">
              <div className="rounded-xl border bg-white p-5">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="mb-3 w-full rounded-lg object-cover" />
                )}
                {heading && <h2 className="mb-2 text-lg font-semibold text-neutral-900">{heading}</h2>}
                <div
                  className="text-sm leading-relaxed text-neutral-700 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h2]:font-semibold [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc"
                  // Admin-authored preview only; the server sanitizes before sending.
                  dangerouslySetInnerHTML={{ __html: body || "<p style='color:#9ca3af'>Your content preview…</p>" }}
                />
                {ctaLabel && (
                  <div className="mt-4">
                    <span className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">{ctaLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
