import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { InfoLayout } from "@/components/shared/info-layout";
import {
  Building2,
  Code2,
  Mail,
  MessageSquare,
  Phone,
} from "@/components/icons";

export const metadata: Metadata = {
  title: `Contact Us — ${APP_NAME}`,
  description: "Get in touch with the Setups Works Lab team at Setups Works.",
};

export default function ContactPage() {
  return (
    <InfoLayout>
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-tight text-[#006bff]">
        <span className="size-1.5 rounded-full bg-[#006bff]" /> Contact us
      </span>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
        Get in touch
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Questions, feedback or partnership ideas? Reach the {APP_NAME} team at
        Setups Works — we usually reply within one business day.
      </p>

      {/* contact methods */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:info@setups.works"
          className="group flex items-start gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="size-5 text-primary" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Email</h2>
            <p className="text-sm text-primary">info@setups.works</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Best for support and detailed questions.
            </p>
          </div>
        </a>

        <a
          href="tel:+916383984698"
          className="group flex items-start gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <Phone className="size-5 text-primary" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Phone</h2>
            <p className="text-sm text-primary">+91 63839 84698</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mon–Sat, 10am–7pm IST.
            </p>
          </div>
        </a>
      </section>

      {/* feedback CTA */}
      <section className="mt-4 flex items-start gap-4 rounded-2xl border bg-card p-6">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare className="size-5 text-primary" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Feedback &amp; bug reports</h2>
          <p className="text-sm text-muted-foreground">
            Have a feature request or found a bug? Use our{" "}
            <Link
              href="/feedback"
              className="font-medium text-primary hover:underline"
            >
              feedback form
            </Link>{" "}
            and it lands straight in our inbox.
          </p>
        </div>
      </section>

      {/* company details */}
      <section className="mt-8 rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Company details</h2>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Building2 className="size-4 text-muted-foreground" />
            <dt className="w-24 text-muted-foreground">Company</dt>
            <dd className="font-medium">Setups Works</dd>
          </div>
          <div className="flex items-center gap-3">
            <Code2 className="size-4 text-muted-foreground" />
            <dt className="w-24 text-muted-foreground">Developer</dt>
            <dd className="font-medium">Nitheesh Rajendran</dd>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground" />
            <dt className="w-24 text-muted-foreground">Email</dt>
            <dd className="font-medium">
              <a
                href="mailto:info@setups.works"
                className="hover:text-primary"
              >
                info@setups.works
              </a>
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="size-4 text-muted-foreground" />
            <dt className="w-24 text-muted-foreground">Phone</dt>
            <dd className="font-medium">
              <a href="tel:+916383984698" className="hover:text-primary">
                +91 63839 84698
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </InfoLayout>
  );
}
