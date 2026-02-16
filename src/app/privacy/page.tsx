import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - SparkVotEDU',
  description: 'SparkVotEDU privacy policy. Learn how we protect teacher and student data.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to SparkVotEDU
      </Link>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: February 16, 2026
      </p>

      {/* Introduction */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Introduction</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          SparkVotEDU is a classroom engagement platform built for teachers and
          students. We take your privacy seriously, and we want to be upfront
          about what information we collect, how we use it, and what rights you
          have. This policy is written in plain language because we believe you
          shouldn&apos;t need a law degree to understand how your data is
          handled.
        </p>
      </section>

      {/* Information We Collect */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Information We Collect
        </h2>

        <p className="text-muted-foreground leading-relaxed mb-4">
          <strong className="text-foreground">Teacher accounts:</strong> When you
          sign up, we collect your name, email address, and a password (which we
          hash &mdash; we never store it in plain text). If you subscribe to a
          paid plan, payment is processed by Stripe. We do not store your credit
          card number.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-4">
          <strong className="text-foreground">Student participation:</strong>{' '}
          Students join sessions using a class code &mdash; no account required.
          We assign each student a random fun name (like &ldquo;Dancing
          Penguin&rdquo;). We do <strong>not</strong> collect student names,
          emails, or any personally identifiable information from students.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-4">
          <strong className="text-foreground">Device fingerprinting:</strong> We
          use anonymous device fingerprinting solely to prevent duplicate voting
          within a session. This data is not linked to any individual identity
          and is stored locally on the device.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-4">
          <strong className="text-foreground">Usage data:</strong> We collect
          standard web analytics (page views, feature usage) to help us improve
          the platform.
        </p>
      </section>

      {/* How We Use Your Information */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          How We Use Your Information
        </h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>To provide and maintain the SparkVotEDU service</li>
          <li>To process teacher account registration and subscriptions</li>
          <li>
            To prevent duplicate voting within sessions (device fingerprinting)
          </li>
          <li>To improve the platform based on usage patterns</li>
          <li>To communicate with teachers about their accounts</li>
        </ul>
      </section>

      {/* Student Privacy */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Student Privacy (COPPA &amp; FERPA)
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Student privacy is baked into how SparkVotEDU works. Here&apos;s the
          short version: students participate anonymously. No student accounts,
          no student emails, no student PII collected &mdash; period.
        </p>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            Device fingerprinting is used only for session integrity (preventing
            duplicate votes) and is never used to track or identify students.
          </li>
          <li>
            Teachers control all classroom content and participation.
          </li>
          <li>We do not sell, share, or monetize any student data.</li>
        </ul>
      </section>

      {/* Third-Party Services */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Third-Party Services
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We use a small number of trusted services to run SparkVotEDU:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            <strong className="text-foreground">Supabase</strong> &mdash;
            authentication and data storage
          </li>
          <li>
            <strong className="text-foreground">Stripe</strong> &mdash; payment
            processing for teacher subscriptions
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong> &mdash; hosting
            and content delivery
          </li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Each service has its own privacy policy. We only share the minimum data
          required for each service to do its job.
        </p>
      </section>

      {/* Data Security */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Data Security</h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            All data in transit is encrypted using industry-standard HTTPS/TLS.
          </li>
          <li>
            Teacher passwords are hashed and never stored in plain text.
          </li>
          <li>Access to data is restricted to authorized personnel.</li>
        </ul>
      </section>

      {/* Data Retention and Deletion */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Data Retention and Deletion
        </h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            Teacher account data is kept for as long as your account is active.
          </li>
          <li>
            You can request account deletion by contacting us &mdash; we&apos;ll
            remove all associated data.
          </li>
          <li>
            Anonymous student session data is retained for classroom analytics
            and can be deleted by the teacher at any time.
          </li>
        </ul>
      </section>

      {/* Your Rights */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Your Rights</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          You have the right to:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>Access, correct, or delete your personal information</li>
          <li>Cancel your subscription at any time</li>
          <li>Request a copy of your data</li>
          <li>Contact us with any privacy concerns</li>
        </ul>
      </section>

      {/* Changes to This Policy */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Changes to This Policy
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We may update this policy from time to time. If we make significant
          changes, we&apos;ll let you know via email.
        </p>
      </section>

      {/* Contact Us */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Questions about this privacy policy or how we handle data? Reach out
          at{' '}
          <a
            href="mailto:privacy@sparkvotedu.com"
            className="text-primary hover:underline"
          >
            privacy@sparkvotedu.com
          </a>
          .
        </p>
      </section>
    </main>
  )
}
