import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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

const toRadians = (value: number): number => (value * Math.PI) / 180;

const getDistanceInMiles = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number => {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const aVal = sinLat * sinLat + sinLon * sinLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));

  return earthRadiusMiles * c;
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
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unavailable">("idle");
  const [searchTerm, setSearchTerm] = useState("");
  const [showExpansionForm, setShowExpansionForm] = useState(false);
  const [expansionEmail, setExpansionEmail] = useState("");

  const handleStartJoin = () => {
    setJoinStage("verify");
    setVerificationMethod("email");
    setSearchTerm("");
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

  useEffect(() => {
    if (joinStage !== "base" || locationStatus !== "idle") {
      return;
    }

    setLocationStatus("requesting");

    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("granted");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
        } else {
          setLocationStatus("unavailable");
        }
      },
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10 * 1000 },
    );
  }, [joinStage, locationStatus]);

  const handleExpansionSubmit = () => {
    if (!EMAIL_PATTERN.test(expansionEmail.trim())) {
      toast.error("Enter a valid email to stay informed.");
      return;
    }
    toast.success("Thanks! We’ll notify you as new bases launch.");
    setExpansionEmail("");
    setShowExpansionForm(false);
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

  const baseDistances = useMemo(
    () =>
      bases.map((base) => {
        if (
          userCoords &&
          typeof base.latitude === "number" &&
          typeof base.longitude === "number"
        ) {
          return {
            base,
            distance: getDistanceInMiles(userCoords, {
              latitude: base.latitude,
              longitude: base.longitude,
            }),
          };
        }

        return {
          base,
          distance: Number.POSITIVE_INFINITY,
        };
      }),
    [bases, userCoords],
  );

  const sortedBases = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    const filtered = baseDistances.filter(({ base }) => {
      if (!normalized) {
        return true;
      }
      return (
        base.name.toLowerCase().includes(normalized) ||
        base.abbreviation.toLowerCase().includes(normalized)
      );
    });

    const comparator = (a: { base: typeof bases[number]; distance: number }, b: { base: typeof bases[number]; distance: number }) => {
      const aFinite = Number.isFinite(a.distance);
      const bFinite = Number.isFinite(b.distance);

      if (aFinite && bFinite && userCoords) {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return a.base.name.localeCompare(b.base.name);
      }

      if (aFinite && !bFinite) {
        return -1;
      }
      if (!aFinite && bFinite) {
        return 1;
      }

      return a.base.name.localeCompare(b.base.name);
    };

    return filtered.slice().sort(comparator);
  }, [baseDistances, searchTerm, userCoords]);

  const recommendedBases = useMemo(() => {
    if (searchTerm.trim()) {
      return [];
    }

    const sorted = sortedBases.slice();
    const recommended = sorted
      .filter(({ distance }) => Number.isFinite(distance))
      .slice(0, 4);

    if (recommended.length < 4) {
      const fallback = sorted.filter(
        ({ base }) => !recommended.some((item) => item.base.id === base.id),
      );
      return [...recommended, ...fallback.slice(0, 4 - recommended.length)];
    }

    return recommended;
  }, [sortedBases, searchTerm]);

  const recommendedIds = useMemo(
    () => recommendedBases.map(({ base }) => base.id),
    [recommendedBases],
  );

  const remainingBases = useMemo(() => {
    if (searchTerm.trim()) {
      return sortedBases;
    }
    return sortedBases.filter(({ base }) => !recommendedIds.includes(base.id));
  }, [recommendedIds, sortedBases, searchTerm]);

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
                <div className="space-y-3">
                  <label htmlFor="base-search" className="text-sm font-semibold text-foreground">
                    Choose your base
                  </label>
                  <Input
                    id="base-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search your installation"
                    className="h-11 rounded-full"
                  />
                  {locationStatus === "denied" ? (
                    <p className="text-xs text-warning">
                      Location access denied. Showing alphabetical list instead.
                    </p>
                  ) : locationStatus === "unavailable" ? (
                    <p className="text-xs text-muted-foreground">
                      Location unavailable. Pick your base manually.
                    </p>
                  ) : null}
                </div>

                {recommendedBases.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nearby bases
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {recommendedBases.map(({ base, distance }) => (
                        <button
                          key={`recommended-${base.id}`}
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
                            {Number.isFinite(distance) ? ` · ${Math.round(distance)} mi` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {searchTerm.trim() ? "Matching bases" : "All bases"}
                  </p>
                  {remainingBases.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-nav-border bg-background/70 p-4 text-xs text-muted-foreground">
                      No bases match your search yet. Try a different name or abbreviation.
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {remainingBases.map(({ base, distance }) => (
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
                            {Number.isFinite(distance)
                              ? ` · ${Math.round(distance)} mi`
                              : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-dashed border-nav-border bg-background/70 p-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Don’t see your base? We’re constantly expanding.
                  </p>
                  {showExpansionForm ? (
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Input
                        type="email"
                        value={expansionEmail}
                        onChange={(event) => setExpansionEmail(event.target.value)}
                        placeholder="Your email for updates"
                        className="h-10 rounded-full"
                        required
                      />
                      <Button
                        type="button"
                        className="rounded-full px-5"
                        size="sm"
                        onClick={handleExpansionSubmit}
                      >
                        Notify me
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-semibold text-primary hover:underline"
                      onClick={() => setShowExpansionForm(true)}
                    >
                      Click here to be informed!
                    </button>
                  )}
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
