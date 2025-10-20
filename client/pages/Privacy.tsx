import { SEOHead } from "@/components/SEOHead";

const Privacy = (): JSX.Element => {
  return (
    <>
      <SEOHead
        title="TrustyPCS Privacy Policy - Military Marketplace Data Protection"
        description="Learn how TrustyPCS protects your data. Our privacy policy explains what information we collect, how we use it, and your rights on our military PCS marketplace."
        keywords="privacy policy, military marketplace security, DoD data protection, PCS marketplace privacy"
        canonical="https://trustypcs.com/privacy"
      />
      <section className="space-y-6">
        <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-3xl font-semibold text-foreground">
            TrustyPCS Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: January 1, 2025
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            TrustyPCS is a DoD-verified military PCS marketplace built by Active-Duty service
            members to give military families and service members a safe, private place to buy
            and sell on base.
          </p>
        </header>

        <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Information We Collect
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
            <li>Email address (for login and DoD verification)</li>
            <li>Username and selected military base</li>
            <li>Optional ratings you leave after transactions</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            We do not collect rank, unit, full name, military ID number, or payment data.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            How We Use Your Information
          </h2>
          <p className="text-sm text-muted-foreground">
            Your information is used to operate your TrustyPCS account, verify DoD affiliation,
            prevent fraud, and maintain a safe military marketplace community. We never sell or
            share your personal data with third parties.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Data Protection & Security
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
            <li>All traffic is encrypted (HTTPS) in transit.</li>
            <li>Passwords are hashed and never stored in plain text.</li>
            <li>
              Verification documents auto-delete within 24 hours of submission.
            </li>
            <li>
              Cookies are used only to keep you securely signed in ("Remember
              this device").
            </li>
          </ul>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">Your Choices</h2>
          <p className="text-sm text-muted-foreground">
            You can delete your TrustyPCS account at any time from Profile →
            Settings. Removing an account permanently deletes your listings,
            messages, and ratings.
          </p>
        </div>

        <div className="space-y-2 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
          <p className="text-sm text-muted-foreground">
            Questions or concerns about your privacy? Email
            privacy@trustypcs.com.
          </p>
        </div>
      </section>
    </>
  );
};

export default Privacy;
