const Terms = (): JSX.Element => {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-3xl font-semibold text-foreground">Terms of Use</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective Date: January 1, 2025</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Welcome to BaseList. By using this site, you agree to these simple rules.
        </p>
      </header>

      <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Eligibility</h2>
        <p className="text-sm text-muted-foreground">Users must be DoW-affiliated and 18 or older.</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Acceptable Use</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          <li>No weapons, ammunition, or restricted items.</li>
          <li>No adult or explicit content.</li>
          <li>No counterfeit goods or scams.</li>
          <li>No external payment links or personal information.</li>
          <li>No harassment or abusive behavior.</li>
        </ul>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Listings &amp; Transactions</h2>
        <p className="text-sm text-muted-foreground">
          BaseList provides a platform only; we don&rsquo;t own, inspect, or guarantee items listed. Meet in safe,
          public, on-base areas whenever possible.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Ratings</h2>
        <p className="text-sm text-muted-foreground">
          1&ndash;5 star ratings must reflect genuine transactions. Abuse may lead to suspension.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Account Actions</h2>
        <p className="text-sm text-muted-foreground">
          Moderators may hide listings or suspend accounts that break the rules. Severe or repeated violations result
          in permanent bans.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Liability</h2>
        <p className="text-sm text-muted-foreground">
          Use BaseList at your own risk. We are not liable for losses, damages, or disputes between users.
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-foreground">Changes</h2>
        <p className="text-sm text-muted-foreground">
          Terms may update periodically; continued use means acceptance of new terms.
        </p>
      </div>
    </section>
  );
};

export default Terms;
