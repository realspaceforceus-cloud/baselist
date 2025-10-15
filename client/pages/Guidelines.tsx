const Guidelines = (): JSX.Element => {
  const rules = [
    "Treat every member with respect — no harassment or hate speech.",
    "Keep all listings legal and within DoW policy.",
    "Meet safely on base whenever possible and avoid sharing personal information publicly.",
    "Do not spam, post duplicates, or advertise external payment platforms.",
    "Report suspicious activity immediately.",
    "One account per person.",
    "Repeated or severe rule violations will lead to suspension or ban.",
  ];

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-3xl font-semibold text-foreground">Community Guidelines</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          BaseList exists to make buying and selling on base simple, respectful, and secure.
        </p>
      </header>

      <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Guidelines;
