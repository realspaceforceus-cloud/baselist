import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBaseList } from "@/context/BaseListContext";

const ICON_STEPS = [
  {
    label: "Verify",
    icon: ShieldCheck,
  },
  {
    label: "Choose Base",
    icon: MapPin,
  },
  {
    label: "Post & Message",
    icon: MessageCircle,
  },
] as const;

const ALLOWED_DOD_DOMAINS = [
  ".mil",
  ".defense.gov",
  ".disa.mil",
  ".dia.mil",
  ".dla.mil",
  ".dcma.mil",
  ".js.mil",
  ".osd.mil",
  ".ng.mil",
  ".spaceforce.mil",
  ".usmc.mil",
  ".army.mil",
  ".af.mil",
  ".navy.mil",
  ".uscg.mil",
  ".va.gov",
  ".us.af.mil",
] as const;

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

const isDodEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(trimmed)) {
    return false;
  }
  return ALLOWED_DOD_DOMAINS.some((domain) => trimmed.endsWith(domain));
};

const Landing = (): JSX.Element => {
  const { signIn, bases, setCurrentBaseId } = useBaseList();

  const [joinStage, setJoinStage] = useState<"hidden" | "verify" | "base" | "handle">("hidden");
  const [verificationMethod, setVerificationMethod] = useState<"email" | "invite" | "manual">("email");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [selectedBaseId, setSelectedBaseId] = useState<string>(bases[0]?.id ?? "");
  const [username, setUsername] = useState("");
  const [acceptRules, setAcceptRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartJoin = () => {
    setJoinStage("verify");
    setVerificationMethod("email");
  };

  const handleManualFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setManualFile(file ?? null);
  };

  const handleVerificationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (verificationMethod === "email") {
      if (!isDodEmail(email)) {
        toast.error("Enter an approved DoD or .gov email to continue.");
        return;
      }
      toast.success("Verification link sent", {
        description: "Check your inbox. One-time link expires in 15 minutes.",
      });
    } else if (verificationMethod === "invite") {
      if (!inviteCode.trim()) {
        toast.error("Enter the invite code you received.");
        return;
      }
      toast.success("Invite accepted", {
        description: "We confirmed your invite. Finish setting up your account.",
      });
    } else {
      if (!manualFile) {
        toast.error("Upload a redacted DoD ID or supporting document.");
        return;
      }
      toast.success("Manual review requested", {
        description: "We will confirm within 24 hours and auto-delete your upload.",
      });
    }

    setJoinStage("base");
  };

  const handleBaseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBaseId) {
      toast.error("Choose your current base to continue.");
      return;
    }
    setJoinStage("handle");
  };

  const handleHandleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!USERNAME_PATTERN.test(username.trim())) {
      toast.error("Choose a username using 3-20 letters, numbers, or underscores.");
      return;
    }

    if (!acceptRules) {
      toast.error("Confirm you agree to the marketplace rules.");
      return;
    }

    setIsSubmitting(true);
    try {
      setCurrentBaseId(selectedBaseId);
      signIn();
      toast.success("Welcome to BaseList", {
        description: "You're verified. Start browsing and posting right away.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = useMemo(() => {
    switch (joinStage) {
      case "verify":
        return 1;
      case "base":
        return 2;
      case "handle":
        return 3;
      default:
        return 0;
    }
  }, [joinStage]);

  return (
    <div className="space-y-10 py-10">
      <section className="px-4">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Verified classifieds for military bases.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            Built by an Active-Duty Airman for verified DoD members and families. Safe, local, and private—on base only.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-foreground/80">
            {ICON_STEPS.map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="rounded-full px-8" onClick={handleStartJoin}>
              Join Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8"
              type="button"
              onClick={signIn}
            >
              Sign In
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span role="img" aria-hidden>
                🔒
              </span>
              All data encrypted. No IDs stored. Trusted across the DoD.
            </span>
          </p>
        </div>
      </section>

      {joinStage !== "hidden" ? (
        <section className="px-4">
          <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
            <header className="flex flex-col gap-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Step {currentStep} of 3
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                {joinStage === "verify" && "Verify DoD access"}
                {joinStage === "base" && "Select your base"}
                {joinStage === "handle" && "Create your handle"}
              </h2>
              {joinStage === "verify" ? (
                <p className="text-sm text-muted-foreground">
                  We use one-time links so you never need a password. Your email stays private.
                </p>
              ) : joinStage === "base" ? (
                <p className="text-sm text-muted-foreground">
                  Pick the installation you belong to. You can switch later from your profile.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keep your identity private. Choose a handle your teammates will recognize.
                </p>
              )}
            </header>

            {joinStage === "verify" ? (
              <form onSubmit={handleVerificationSubmit} className="space-y-5">
                {verificationMethod === "email" ? (
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-foreground">
                      .mil or approved email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@yourunit.mil"
                      className="h-12 rounded-full"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Allowed domains include {ALLOWED_DOD_DOMAINS.slice(0, 5).join(", ")}, and more DoD-issued email endings.
                    </p>
                  </div>
                ) : verificationMethod === "invite" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="invite-code" className="text-sm font-semibold text-foreground">
                        Invite code
                      </label>
                      <Input
                        id="invite-code"
                        value={inviteCode}
                        onChange={(event) => setInviteCode(event.target.value)}
                        placeholder="Enter your invite code"
                        className="h-12 rounded-full"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="invite-email" className="text-sm font-semibold text-foreground">
                        Email to send the link
                      </label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="Any email you actively use"
                        className="h-12 rounded-full"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="manual-note" className="text-sm font-semibold text-foreground">
                        Share a quick note
                      </label>
                      <Textarea
                        id="manual-note"
                        value={manualNote}
                        onChange={(event) => setManualNote(event.target.value)}
                        rows={3}
                        placeholder="Tell us how you access the installation (sponsor, contractor, etc.)."
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="manual-upload" className="text-sm font-semibold text-foreground">
                        Upload redacted proof (auto-deleted within 24 hours)
                      </label>
                      <Input
                        id="manual-upload"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleManualFileChange}
                        className="rounded-full"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                  {verificationMethod !== "email" && (
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => setVerificationMethod("email")}
                    >
                      Use .mil email instead
                    </button>
                  )}
                  {verificationMethod !== "invite" && (
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => setVerificationMethod("invite")}
                    >
                      Use invite code instead
                    </button>
                  )}
                  {verificationMethod !== "manual" && (
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => setVerificationMethod("manual")}
                    >
                      Request manual check
                    </button>
                  )}
                </div>

                <Button type="submit" className="w-full rounded-full" size="lg">
                  Continue
                </Button>
                <p className="text-xs text-muted-foreground">
                  We use one-time links. No passwords. Your contact info stays private.
                </p>
              </form>
            ) : null}

            {joinStage === "base" ? (
              <form onSubmit={handleBaseSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="base" className="text-sm font-semibold text-foreground">
                    Choose your base
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {bases.map((base) => (
                      <button
                        key={base.id}
                        type="button"
                        onClick={() => setSelectedBaseId(base.id)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          selectedBaseId === base.id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="font-semibold text-foreground">{base.name}</span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {base.abbreviation}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-full" size="lg">
                  Continue
                </Button>
                <p className="text-xs text-muted-foreground">
                  We show listings by base so meetups stay local and trusted.
                </p>
              </form>
            ) : null}

            {joinStage === "handle" ? (
              <form onSubmit={handleHandleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-semibold text-foreground">
                    Username
                  </label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Example: airman_421"
                    className="h-12 rounded-full"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    3-20 characters. Letters, numbers, and underscores only. No PII.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
                  <Checkbox
                    id="rules"
                    checked={acceptRules}
                    onCheckedChange={(checked) => setAcceptRules(Boolean(checked))}
                  />
                  <label htmlFor="rules" className="space-y-1">
                    <span className="font-semibold text-foreground">I agree to the marketplace rules.</span>
                    <span className="block text-xs text-muted-foreground">
                      No weapons, counterfeit, adult content, scams, or external payment demands.
                    </span>
                  </label>
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Finishing…" : "Finish and enter BaseList"}
                </Button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      <footer className="px-4 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>© 2025 BaseList</span>
          <span>·</span>
          <a className="hover:text-foreground" href="#">
            Privacy
          </a>
          <span>·</span>
          <a className="hover:text-foreground" href="#">
            Terms
          </a>
          <span>·</span>
          <a className="hover:text-foreground" href="#">
            Contact
          </a>
          <span>·</span>
          <span>Built by Active-Duty Airmen</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
