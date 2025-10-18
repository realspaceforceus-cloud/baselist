import { Link } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";

const footerLinks: Array<{ to: string; label: string }> = [
  { to: "/faq", label: "FAQ" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/guidelines", label: "Guidelines" },
  { to: "/contact", label: "Contact" },
];

export const Footer = (): JSX.Element => {
  const { settings } = useSettings();

  const showFooterLinks = settings.footer_show_links !== "false";
  const copyrightText = settings.footer_copyright || "© 2025 BaseList. All rights reserved.";
  const mailingAddress = settings.mailing_address;
  const supportEmail = settings.support_email;

  return (
    <footer className="border-t border-nav-border bg-nav/80 py-6 text-xs text-muted-foreground backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 space-y-4">
        {/* Main Footer Content */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Copyright and Links */}
          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-semibold text-foreground">{copyrightText}</span>
            {showFooterLinks && footerLinks.map((link) => (
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

          {/* Right: Contact Info */}
          <div className="text-right space-y-1">
            {supportEmail && (
              <p>
                <span className="font-semibold">Support:</span>{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-muted-foreground transition hover:text-primary"
                >
                  {supportEmail}
                </a>
              </p>
            )}
            {mailingAddress && (
              <p className="text-xs">
                <span className="font-semibold">Address:</span> {mailingAddress}
              </p>
            )}
          </div>
        </div>

        {/* Attribution */}
        <div className="border-t border-nav-border pt-4">
          <p className="font-semibold uppercase tracking-wide text-muted-foreground/80">
            Built by an<br />
            Active-Duty Airmen
          </p>
        </div>
      </div>
    </footer>
  );
};
