import { SEOHead } from "@/components/SEOHead";

const FAQ = (): JSX.Element => {
  const items: Array<{ question: string; answer: string }> = [
    {
      question: "Who can join TrustyPCS?",
      answer:
        "Anyone with a .mil email, invite code, or verified DoW connection.",
    },
    {
      question: "Do I have to share my real name or rank?",
      answer: "No — only a username is shown.",
    },
    {
      question: "Is TrustyPCS free to use?",
      answer:
        "Yes. TrustyPCS is free. Optional local sponsors help keep it running.",
    },
    {
      question: "How do I verify my military affiliation?",
      answer:
        ".mil email, invite code, or a short manual review (uploads are auto-deleted).",
    },
    {
      question: "How are PCS marketplace transactions rated?",
      answer:
        "After both sides mark the transaction complete, buyers and sellers can rate 1–5 ⭐ — no text reviews.",
    },
    {
      question: "What if I encounter a scam on TrustyPCS?",
      answer:
        'Tap "Report." Our moderators review every report within 24 hours.',
    },
    {
      question: "Is my personal data safe on the military marketplace?",
      answer:
        "Yes. All data is encrypted in transit and at rest. We never store sensitive military ID information.",
    },
    {
      question: "Can I sell military-related items?",
      answer:
        "Yes, but all listings must follow our community guidelines. Prohibited items include weapons, controlled substances, and classified materials.",
    },
    {
      question: "How do I request a new military base?",
      answer:
        "Use the 'Request your base' feature in the base selector. Our team will review and add it to TrustyPCS shortly.",
    },
  ];

  return (
    <>
      <SEOHead
        title="TrustyPCS FAQ - Military PCS Marketplace Questions Answered"
        description="Find answers to frequently asked questions about TrustyPCS, the military PCS marketplace. Learn about DoD verification, security, ratings, buying and selling on military bases."
        keywords="military PCS FAQ, PCS marketplace questions, DoD family marketplace, military base classifieds help, military relocation"
        canonical="https://trustypcs.com/faq"
      />
      <section className="space-y-6">
        <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-3xl font-semibold text-foreground">
            Frequently Asked Questions - TrustyPCS Military Marketplace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find answers to common questions about TrustyPCS, the military PCS
            marketplace for DoD families.
          </p>
        </header>

        <div className="space-y-4 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <dl className="space-y-4">
            {items.map((item) => (
              <div key={item.question} className="space-y-2">
                <dt className="text-lg font-semibold text-foreground">
                  {item.question}
                </dt>
                <dd className="text-sm text-muted-foreground">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
};

export default FAQ;
