import { SEOHead } from "@/components/SEOHead";

const Terms = (): JSX.Element => {
  return (
    <>
      <SEOHead
        title="TrustyPCS Terms of Use - Military PCS Marketplace Agreement"
        description="Read TrustyPCS Terms of Use. Learn about eligibility, acceptable use policies, and community standards for our military PCS marketplace."
        keywords="terms of use, military marketplace rules, PCS marketplace terms, DoD community standards"
        canonical="https://trustypcs.com/terms"
      />
      <section className="space-y-6">
        <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-3xl font-semibold text-foreground">
            TrustyPCS Terms of Use
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: January 1, 2025
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Welcome to TrustyPCS, the military PCS marketplace. By using this
            site, you agree to these simple rules.
          </p>
        </header>

        <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">Eligibility</h2>
          <p className="text-sm text-muted-foreground">
            Users must be DoD-affiliated and 18 years or older to use
            TrustyPCS.
          </p>
        </div>

        <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Acceptable Use Policy
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
            <li>No weapons, ammunition, or restricted/controlled items.</li>
            <li>No adult or explicit content.</li>
            <li>No counterfeit goods or scams.</li>
            <li>No external payment links or sharing of personal information.</li>
            <li>No harassment, abuse, or hateful behavior.</li>
            <li>
              No spam or duplicate postings of the same item.
            </li>
          </ul>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Listings &amp; Transactions
          </h2>
          <p className="text-sm text-muted-foreground">
            TrustyPCS provides a platform only; we don&rsquo;t own, inspect, or
            guarantee items listed. Always meet in safe, public, on-base areas
            whenever possible. Buyers and sellers transact at their own risk.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">Ratings</h2>
          <p className="text-sm text-muted-foreground">
            1&ndash;5 star ratings must reflect genuine transactions. Abuse or
            fake ratings may lead to account suspension or ban.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Violation &amp; Enforcement
          </h2>
          <p className="text-sm text-muted-foreground">
            Repeated or severe rule violations will lead to warning, suspension,
            or permanent ban from TrustyPCS at our discretion.
          </p>
        </div>
      </section>
    </>
  );
};

export default Terms;
