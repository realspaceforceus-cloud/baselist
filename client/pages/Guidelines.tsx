import { SEOHead } from "@/components/SEOHead";

const Guidelines = (): JSX.Element => {
  const rules = [
    "Treat every member with respect — no harassment, hate speech, or discrimination.",
    "Keep all listings legal and within DoD/military community policy.",
    "Meet safely on base whenever possible. Avoid sharing personal information publicly.",
    "Do not spam, post duplicates, or advertise external payment platforms.",
    "Report suspicious activity or rule violations immediately to moderators.",
    "One account per person. Using multiple accounts to circumvent bans is prohibited.",
    "Repeated or severe rule violations will lead to suspension or permanent ban.",
  ];

  return (
    <>
      <SEOHead
        title="TrustyPCS Community Guidelines - Safe Military Marketplace Standards"
        description="TrustyPCS Community Guidelines ensure a safe and respectful military PCS marketplace. Learn our rules for buying, selling, and connecting with DoD families."
        keywords="community guidelines, military marketplace rules, PCS safety tips, DoD community standards"
        canonical="https://trustypcs.com/guidelines"
      />
      <section className="space-y-6">
        <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-3xl font-semibold text-foreground">
            TrustyPCS Community Guidelines
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            TrustyPCS exists to make buying and selling on base simple,
            respectful, secure, and safe for all military families and service
            members.
          </p>
        </header>

        <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Our Community Rules
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Why We Have These Guidelines
          </h2>
          <p className="text-sm text-muted-foreground">
            These guidelines protect TrustyPCS members and foster a trusted
            community where military families can buy, sell, and connect with
            confidence. Our moderators enforce these rules to keep the
            marketplace safe for everyone.
          </p>
        </div>

        <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Got Questions?
          </h2>
          <p className="text-sm text-muted-foreground">
            If you have questions about these guidelines or need to report a
            violation, contact our support team at support@trustypcs.com or
            reach out to your base moderator directly.
          </p>
        </div>
      </section>
    </>
  );
};

export default Guidelines;
