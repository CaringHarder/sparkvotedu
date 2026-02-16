import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - SparkVotEDU',
  description:
    'SparkVotEDU terms of service. Read the terms governing use of our classroom engagement platform.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to SparkVotEDU
      </Link>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: February 16, 2026
      </p>

      {/* Agreement to Terms */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Agreement to Terms
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          By using SparkVotEDU, you agree to these terms. If you don&apos;t
          agree, please don&apos;t use the service. Pretty straightforward.
        </p>
      </section>

      {/* Description of Service */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          What SparkVotEDU Is
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          SparkVotEDU is a web-based classroom engagement platform that lets
          teachers create interactive brackets, polls, and tournaments. Students
          participate anonymously using a class code &mdash; no accounts needed.
        </p>
      </section>

      {/* Account Registration */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Teacher Accounts
        </h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            Please provide accurate information when creating your account.
          </li>
          <li>
            You&apos;re responsible for keeping your login credentials secure.
          </li>
          <li>
            You must be at least 18 years old (or have parental/guardian consent)
            to create a teacher account.
          </li>
          <li>One person per account &mdash; no sharing accounts.</li>
        </ul>
      </section>

      {/* Student Participation */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Student Participation
        </h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            Students join sessions using class codes provided by their teacher.
          </li>
          <li>
            No student account is required. Students get random anonymous
            identifiers.
          </li>
          <li>
            Teachers are responsible for appropriate use of the platform in their
            classrooms.
          </li>
        </ul>
      </section>

      {/* Subscription and Billing */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Subscription and Billing
        </h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            SparkVotEDU offers Free, Pro ($12/month), and Pro Plus ($20/month)
            plans.
          </li>
          <li>Paid subscriptions are billed monthly through Stripe.</li>
          <li>
            You can cancel anytime. Your subscription stays active through the
            end of your current billing period.
          </li>
          <li>
            We&apos;ll give existing subscribers at least 30 days notice before
            any pricing changes.
          </li>
        </ul>
      </section>

      {/* Acceptable Use */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Acceptable Use</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We trust our teachers to use SparkVotEDU responsibly. Please
          don&apos;t:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>Upload harmful, offensive, or illegal content</li>
          <li>Attempt to circumvent security measures</li>
          <li>Use the platform for anything other than educational engagement</li>
          <li>Automate access or scrape content</li>
          <li>Interfere with other users&apos; access to the service</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Teachers are responsible for the content they create &mdash; bracket
          names, entrants, poll options, and so on.
        </p>
      </section>

      {/* Intellectual Property */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Intellectual Property
        </h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            SparkVotEDU&apos;s platform, design, and features are owned by
            SparkVotEDU.
          </li>
          <li>
            Content you create (brackets, polls, tournaments) stays yours.
          </li>
          <li>
            By using the service, you give us permission to host and display your
            content as needed to run the platform.
          </li>
        </ul>
      </section>

      {/* Disclaimer of Warranties */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Disclaimer of Warranties
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          SparkVotEDU is provided &ldquo;as is&rdquo; without warranties of any
          kind, express or implied. We work hard to keep things running smoothly,
          but we can&apos;t guarantee the service will be uninterrupted or
          error-free at all times.
        </p>
      </section>

      {/* Limitation of Liability */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Limitation of Liability
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          SparkVotEDU is not liable for any indirect, incidental, special, or
          consequential damages arising from your use of the service. Our total
          liability won&apos;t exceed what you&apos;ve paid us in the 12 months
          before the claim.
        </p>
      </section>

      {/* Termination */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Termination</h2>
        <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-2">
          <li>
            We may suspend or terminate accounts that violate these terms.
          </li>
          <li>You can delete your account at any time.</li>
          <li>
            If your account is terminated, your right to use the service ends
            immediately.
          </li>
        </ul>
      </section>

      {/* Changes to Terms */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">
          Changes to These Terms
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We may update these terms from time to time. If we make significant
          changes, we&apos;ll send registered teachers an email. Continuing to
          use SparkVotEDU after changes means you accept the updated terms.
        </p>
      </section>

      {/* Governing Law */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Governing Law</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          These terms are governed by the laws of the United States.
        </p>
      </section>

      {/* Contact Us */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Questions about these terms? Reach out at{' '}
          <a
            href="mailto:support@sparkvotedu.com"
            className="text-primary hover:underline"
          >
            support@sparkvotedu.com
          </a>
          .
        </p>
      </section>
    </main>
  )
}
