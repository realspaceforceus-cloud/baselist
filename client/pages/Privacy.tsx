const Privacy = (): JSX.Element => {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective Date: January 1, 2025</p>
        <p className="mt-4 text-sm text-muted-foreground">
          BaseList is a DoW-verified classifieds platform built by an Active-Duty Airman to give service
          members, families, and civilian teammates a safe, private place to buy and sell on base.
        </p>
      </header>

      <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          <li>Email address (for login and verification)</li>
          <li>Username and selected base</li>
          <li>Optional ratings you leave after transactions</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          We do not collect rank, unit, name, ID number, or payment data.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">How We Use It</h2>
        <p className="text-sm text-muted-foreground">
          To operate your account, verify DoW affiliation, and maintain a safe community. We never sell or
          share personal data.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Data Protection</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          <li>All traffic is encrypted (HTTPS).</li>
          <li>Passwords are hashed; verification uploads auto-delete within 24 hours.</li>
          <li>Cookies are used only to keep you signed in (&ldquo;Remember this device&rdquo;).</li>
        </ul>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Your Choices</h2>
        <p className="text-sm text-muted-foreground">
          You can delete your account at any time from Profile → Settings. Removing an account deletes your
          listings and ratings.
        </p>
      </div>

      <div className="space-y-2 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Contact</h2>
        <p className="text-sm text-muted-foreground">Questions or concerns? Email privacy@baselist.app.</p>
      </div>
    </section>
  );
};

export default Privacy;
