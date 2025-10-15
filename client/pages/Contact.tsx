const Contact = (): JSX.Element => {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-3xl font-semibold text-foreground">Contact &amp; Support</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Need help verifying or reporting an issue? Reach out and we&rsquo;ll respond within 24 hours.
        </p>
      </header>

      <div className="space-y-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft text-sm text-muted-foreground">
        <p>
          📧 <span className="font-semibold text-foreground">support@baselist.app</span>
        </p>
        <p>🕓 Typical response time: within 24 hours.</p>
        <p>
          For urgent security matters or misuse, email
          <span className="font-semibold text-foreground"> security@baselist.app</span>.
        </p>
        <p>
          For general questions or partnership requests, email
          <span className="font-semibold text-foreground"> info@baselist.app</span>.
        </p>
        <p>If you prefer, message your base moderator directly inside BaseList.</p>
      </div>
    </section>
  );
};

export default Contact;
