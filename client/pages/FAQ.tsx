const FAQ = (): JSX.Element => {
  const items: Array<{ question: string; answer: string }> = [
    {
      question: "Who can join?",
      answer: "Anyone with a .mil email, invite code, or verified DoW connection.",
    },
    {
      question: "Do I have to share my real name or rank?",
      answer: "No — only a username is shown.",
    },
    {
      question: "Is BaseList free?",
      answer: "Yes. Optional local sponsors keep it running.",
    },
    {
      question: "How do I verify?",
      answer: ".mil email, invite code, or a short manual review (uploads are auto-deleted).",
    },
    {
      question: "How are transactions rated?",
      answer: "After both sides mark the transaction complete, tap 1–5 ⭐ — no text reviews.",
    },
    {
      question: "What if I see a scam?",
      answer: "Tap “Report.” Mods review every report within 24 hours.",
    },
    {
      question: "Is my data safe?",
      answer: "All data is encrypted in transit and at rest; we never store sensitive ID info.",
    },
  ];

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-3xl font-semibold text-foreground">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Friendly, plain-English answers to the most common questions about BaseList.
        </p>
      </header>

      <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
        <dl className="space-y-4">
          {items.map((item) => (
            <div key={item.question} className="space-y-2">
              <dt className="text-lg font-semibold text-foreground">{item.question}</dt>
              <dd className="text-sm text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default FAQ;
