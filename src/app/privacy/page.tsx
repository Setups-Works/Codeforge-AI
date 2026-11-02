import { APP_NAME } from "@/lib/constants";
import { InfoLayout } from "@/components/shared/info-layout";

export const metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: "How Setups Works Lab collects, uses, and protects your data.",
};

const EFFECTIVE_DATE = "June 17, 2026";

export default function PrivacyPage() {
  return (
    <InfoLayout>
      <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Effective date: {EFFECTIVE_DATE}
      </p>

      <div className="mt-10 max-w-none space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold">1. Information We Collect</h2>
          <p className="mt-2 text-muted-foreground">
            We collect the following categories of data:
          </p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
            <li>
              <strong className="text-foreground">Account data</strong> — name,
              username, email address, hashed password (or OAuth token reference
              if you sign in with Google/GitHub).
            </li>
            <li>
              <strong className="text-foreground">Usage data</strong> — problems
              solved, submission history, streak data, XP, badges, skill
              analytics, spaced-repetition records.
            </li>
            <li>
              <strong className="text-foreground">Content you create</strong> —
              code submissions, forum posts, discussion comments, and notes.
            </li>
            <li>
              <strong className="text-foreground">Technical data</strong> — IP
              address, browser/device type, and error logs collected
              automatically for platform stability.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. How We Use Your Information</h2>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
            <li>
              Operate and personalise the platform (progress tracking, AI
              coaching, recommendations).
            </li>
            <li>
              Send transactional emails such as password resets and welcome
              messages.
            </li>
            <li>Detect abuse and maintain platform security.</li>
            <li>
              Improve the product through aggregate, anonymised analytics.
            </li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            We do <strong className="text-foreground">not</strong> sell your
            personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. Data Storage and Security</h2>
          <p className="mt-2 text-muted-foreground">
            Your data is stored on MongoDB Atlas (cloud database) hosted in
            secure data centres. Passwords are hashed with bcrypt (cost factor
            12) and never stored in plain text. We use HTTPS for all data in
            transit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. Third-Party Services</h2>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
            <li>
              <strong className="text-foreground">Google / GitHub OAuth</strong>{" "}
              — used only to authenticate you; we receive a profile token and do
              not access your other data.
            </li>
            <li>
              <strong className="text-foreground">Hostinger SMTP</strong> — used
              to deliver transactional email.
            </li>
            <li>
              <strong className="text-foreground">
                Code execution sandbox
              </strong>{" "}
              — code you submit is sent to a secure sandboxed execution service
              and is not retained beyond the session.
            </li>
            <li>
              <strong className="text-foreground">AI providers</strong> —
              prompts and your code context may be sent to AI model APIs to
              generate hints and coaching. These providers have their own
              privacy policies.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. Cookies and Sessions</h2>
          <p className="mt-2 text-muted-foreground">
            We use a single, HTTP-only session cookie to keep you logged in. We
            do not use advertising or tracking cookies. No third-party trackers
            are embedded on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. Your Rights</h2>
          <p className="mt-2 text-muted-foreground">You have the right to:</p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Export your submission history and notes.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            To exercise any of these rights, email{" "}
            <a
              href="mailto:info@setups.works"
              className="text-primary underline"
            >
              info@setups.works
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">7. Data Retention</h2>
          <p className="mt-2 text-muted-foreground">
            We retain your account data for as long as your account is active.
            If you delete your account, your personal data is removed within 30
            days. Aggregated, anonymised analytics data may be retained
            indefinitely.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">8. Children&apos;s Privacy</h2>
          <p className="mt-2 text-muted-foreground">
            The Service is not directed at children under 13. We do not
            knowingly collect data from children under 13. If we discover such
            data has been collected, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">9. Changes to This Policy</h2>
          <p className="mt-2 text-muted-foreground">
            We may update this Privacy Policy periodically. We will notify you
            by email or via a banner on the platform when material changes are
            made.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">10. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Privacy questions or requests:{" "}
            <a
              href="mailto:info@setups.works"
              className="text-primary underline"
            >
              info@setups.works
            </a>
          </p>
        </section>
      </div>
    </InfoLayout>
  );
}
