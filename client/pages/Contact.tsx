import { SEOHead } from "@/components/SEOHead";

const Contact = (): JSX.Element => {
  return (
    <>
      <SEOHead
        title="Contact TrustyPCS - Support for Military PCS Marketplace"
        description="Contact TrustyPCS support for help with verification, reporting issues, or general inquiries about our military PCS marketplace. We respond within 24 hours."
        keywords="contact support, customer service, military marketplace help, PCS support"
        canonical="https://trustypcs.com/contact"
      />
      <section className="space-y-6">
        <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-3xl font-semibold text-foreground">
            Contact &amp; Support
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Need help verifying your military affiliation, reporting an issue,
            or have questions? Reach out and we&rsquo;ll respond within 24
            hours.
          </p>
        </header>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft text-sm text-muted-foreground">
          <p>
            📧{" "}
            <span className="font-semibold text-foreground">
              support@trustypcs.com
            </span>
          </p>
          <p>
            General support, verification help, and account questions. Typical
            response time: within 24 hours.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft text-sm text-muted-foreground">
          <p>
            🔒{" "}
            <span className="font-semibold text-foreground">
              security@trustypcs.com
            </span>
          </p>
          <p>
            For urgent security matters, suspected fraud, account compromise, or
            abuse reporting. Mark urgent security concerns as "URGENT" in your
            subject line.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft text-sm text-muted-foreground">
          <p>
            💼{" "}
            <span className="font-semibold text-foreground">
              info@trustypcs.com
            </span>
          </p>
          <p>
            For general questions, partnership requests, or media inquiries
            about our military PCS marketplace.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft text-sm text-muted-foreground">
          <p>💬 In-App Support</p>
          <p>
            Have a question about a listing or need to report another member?
            You can also message your base moderator directly through TrustyPCS
            for faster assistance on local issues.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft text-sm text-muted-foreground">
          <p>🕓 Expected Response Times:</p>
          <ul className="list-disc space-y-1 pl-6 mt-2">
            <li>Standard support: within 24 hours</li>
            <li>Security issues: within 1–2 hours during business hours</li>
            <li>Weekend responses: within 48 hours</li>
          </ul>
        </div>
      </section>
    </>
  );
};

export default Contact;
