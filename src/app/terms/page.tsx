import { APP_NAME } from "@/lib/constants";
import { InfoLayout } from "@/components/shared/info-layout";

export const metadata = {
  title: `Terms & Conditions — ${APP_NAME}`,
  description: "Read the Terms and Conditions for using Setups Works Lab.",
};

const EFFECTIVE_DATE = "June 17, 2026";

export default function TermsPage() {
  return (
    <InfoLayout>
      <h1 className="text-3xl font-black tracking-tight">
        Terms &amp; Conditions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <div className="mt-10 max-w-none space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold">1. Acceptance of Terms</h2>
          <p className="mt-2 text-muted-foreground">
            By accessing or using {APP_NAME} (&quot;the Service&quot;), you
            agree to be bound by these Terms and Conditions. If you do not
            agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. Description of Service</h2>
          <p className="mt-2 text-muted-foreground">
            {APP_NAME} is an AI-powered coding interview preparation platform
            that provides coding problems, AI-assisted learning tools, spaced
            repetition, skill analytics, contests, a community forum, and
            related features. The core platform is offered free of charge;
            optional premium features may be available under a paid plan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. Eligibility</h2>
          <p className="mt-2 text-muted-foreground">
            You must be at least 13 years old to use the Service. By creating an
            account, you represent that you meet this requirement and that all
            information you provide is accurate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. User Accounts</h2>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
            <li>
              You are responsible for maintaining the confidentiality of your
              account credentials.
            </li>
            <li>
              You may not share your account with others or use another
              person&apos;s account.
            </li>
            <li>
              You must notify us immediately at{" "}
              <a
                href="mailto:info@setups.works"
                className="text-primary underline"
              >
                info@setups.works
              </a>{" "}
              if you suspect unauthorized access.
            </li>
            <li>
              We reserve the right to suspend or terminate accounts that violate
              these Terms.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. Acceptable Use</h2>
          <p className="mt-2 text-muted-foreground">You agree not to:</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
            <li>
              Publish, share, or distribute solutions to problems in ways that
              harm the community.
            </li>
            <li>
              Attempt to reverse-engineer, scrape, or otherwise extract data
              from the platform at scale.
            </li>
            <li>
              Use the Service for any illegal purpose or in violation of any
              applicable law.
            </li>
            <li>
              Harass, abuse, or harm other users through the forum or discussion
              features.
            </li>
            <li>
              Attempt to gain unauthorized access to any part of the Service or
              its infrastructure.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. Intellectual Property</h2>
          <p className="mt-2 text-muted-foreground">
            All content on the platform — including problems, AI-generated
            hints, UI design, and branding — is the property of {APP_NAME} /
            Setups Works or its licensors. You may not reproduce or redistribute
            it without written permission. Code you write in the editor remains
            yours; by submitting it you grant us a limited, non-exclusive
            licence to store and display it within the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">7. AI-Generated Content</h2>
          <p className="mt-2 text-muted-foreground">
            The platform uses AI models to generate hints, feedback, and
            coaching. AI output may occasionally be incorrect. You should
            independently verify any AI suggestions before relying on them in
            production code or interviews. We are not liable for decisions made
            based on AI output.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">8. Disclaimers</h2>
          <p className="mt-2 text-muted-foreground">
            The Service is provided &quot;as is&quot; without warranties of any
            kind. We do not guarantee that the Service will be uninterrupted,
            error-free, or that it will help you pass any specific interview.
            Use the Service at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">9. Limitation of Liability</h2>
          <p className="mt-2 text-muted-foreground">
            To the fullest extent permitted by law, {APP_NAME} and its operators
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the
            Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">10. Changes to Terms</h2>
          <p className="mt-2 text-muted-foreground">
            We may update these Terms at any time. We will post the revised
            version with a new effective date. Continued use of the Service
            after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">11. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions? Email us at{" "}
            <a
              href="mailto:info@setups.works"
              className="text-primary underline"
            >
              info@setups.works
            </a>
            .
          </p>
        </section>
      </div>
    </InfoLayout>
  );
}
