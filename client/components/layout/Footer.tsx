import { Link } from "react-router-dom";

const footerLinks: Array<{ to: string; label: string }> = [
  { to: "/faq", label: "FAQ" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/guidelines", label: "Guidelines" },
  { to: "/contact", label: "Contact" },
];

export const Footer = (): JSX.Element => {
  return (
    <footer className="border-t border-nav-border bg-nav/80 pt-4 pb-6 text-xs text-muted-foreground backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="font-semibold text-foreground">© 2025 BaseList</span>
          {footerLinks.map((link) => (
            <span key={link.to} className="flex items-center gap-2">
              <span aria-hidden>·</span>
              <Link
                to={link.to}
                className="font-semibold text-muted-foreground transition hover:text-primary"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
        <p className="font-semibold uppercase tracking-wide text-muted-foreground/80">
          Built by Active-Duty Airmen
        </p>
      </div>
    </footer>
  );
};
