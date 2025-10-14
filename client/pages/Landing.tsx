import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuthDialog } from "@/context/AuthDialogContext";
import {
  EMAIL_PATTERN,
  PASSWORD_MIN_LENGTH,
  USERNAME_PATTERN,
  isDodEmail,
  useBaseList,
} from "@/context/BaseListContext";

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

type JoinStage = "hidden" | "account" | "base" | "success";

const defaultAccountForm = {
  username: "",
  email: "",
  password: "",
  agreeRules: false,
};

const Landing = (): JSX.Element => {
  const { bases, createAccount, activateAccount, isAuthenticated } =
    useBaseList();
  const { openSignIn } = useAuthDialog();

  const [joinStage, setJoinStage] = useState<JoinStage>("hidden");
  const [accountForm, setAccountForm] = useState(defaultAccountForm);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountIsDod, setAccountIsDod] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);

  const [selectedBaseId, setSelectedBaseId] = useState<string>(
    bases[0]?.id ?? "",
  );
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [searchTerm, setSearchTerm] = useState("");
  const [showExpansionForm, setShowExpansionForm] = useState(false);
  const [expansionEmail, setExpansionEmail] = useState("");

  const handleStartJoin = () => {
    setJoinStage("account");
    setAccountForm(defaultAccountForm);
    setAccountError(null);
    setAccountIsDod(false);
    setPendingAccountId(null);
    setSearchTerm("");
    setSelectedBaseId(bases[0]?.id ?? "");
    setLocationStatus("idle");
  };

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    const trimmedUsername = accountForm.username.trim();
    const trimmedEmail = accountForm.email.trim();
    const trimmedPassword = accountForm.password.trim();

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setAccountError(
        "Username must be 3-20 characters using letters, numbers, or underscores.",
      );
      return;
    }

    if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
      setAccountError("Password must be at least 12 characters long.");
      return;
    }

    if (!accountForm.agreeRules) {
      setAccountError("Confirm the marketplace rules to continue.");
      return;
    }

    if (!trimmedEmail) {
      setAccountError("Enter a valid email address.");
      return;
    }

    setAccountIsDod(isDodEmail(trimmedEmail));
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

    const comparator = (
      a: { base: typeof bases[number]; distance: number },
      b: { base: typeof bases[number]; distance: number },
    ) => {
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

  const handleBaseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedBaseId) {
      toast.error("Choose your current base to continue.");
      return;
    }

    try {
      const account = createAccount({
        username: accountForm.username,
        email: accountForm.email,
        password: accountForm.password,
        baseId: selectedBaseId,
      });
      setPendingAccountId(account.id);
      setJoinStage("success");
      setAccountIsDod(account.isDodVerified);
      toast.success("Account created", {
        description: account.isDodVerified
          ? "Your DoD email is verified automatically."
          : "Browse freely. Verify DoD access before you post or DM.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    }
  };

  const handleExpansionSubmit = () => {
    if (!EMAIL_PATTERN.test(expansionEmail.trim())) {
      toast.error("Enter a valid email to stay informed.");
      return;
    }
    toast.success("Thanks! We’ll notify you as new bases launch.");
    setExpansionEmail("");
    setShowExpansionForm(false);
  };

  const handleFinishSignup = () => {
    if (!pendingAccountId) {
      return;
    }
    activateAccount(pendingAccountId, { rememberDevice: true });
    setJoinStage("hidden");
  };

  const isJoinActive = joinStage !== "hidden" && !isAuthenticated;

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
              onClick={openSignIn}
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

      {isJoinActive ? (
        <section className="px-4">
          <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
            <header className="flex flex-col gap-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {joinStage === "account"
                  ? "Step 1 of 3"
                  : joinStage === "base"
                  ? "Step 2 of 3"
                  : "Step 3 of 3"}
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                {joinStage === "account" && "Create your BaseList account"}
                {joinStage === "base" && "Select your base"}
                {joinStage === "success" && "You’re in"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {joinStage === "account"
                  ? "Username only. No real names required."
                  : joinStage === "base"
                  ? "Pick your installation. You can switch later from your profile."
                  : accountIsDod
                  ? "Your DoD access is already verified."
                  : "Browse privately. Verify before posting or messaging."}
              </p>
            </header>

            {joinStage === "account" ? (
              <form onSubmit={handleAccountSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="signup-username" className="text-sm font-semibold text-foreground">
                    Username
                  </label>
                  <Input
                    id="signup-username"
                    value={accountForm.username}
                    onChange={(event) =>
                      setAccountForm((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    placeholder="Example: airman_421"
                    className="h-11 rounded-full"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    3–20 characters. Letters, numbers, and underscores only.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-semibold text-foreground">
                    Email
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={accountForm.email}
                    onChange={(event) =>
                      setAccountForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="Enter your .mil or personal email"
                    className="h-11 rounded-full"
                    required
                  />
                  {accountForm.email && isDodEmail(accountForm.email) ? (
                    <p className="text-xs font-semibold text-foreground">
                      DoD email detected. We’ll verify you automatically.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-semibold text-foreground">
                    Password
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={accountForm.password}
                    onChange={(event) =>
                      setAccountForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Create a password"
                    className="h-11 rounded-full"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {PASSWORD_MIN_LENGTH}+ characters. A simple phrase works great.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
                  <Checkbox
                    id="rules"
                    checked={accountForm.agreeRules}
                    onCheckedChange={(checked) =>
                      setAccountForm((prev) => ({
                        ...prev,
                        agreeRules: Boolean(checked),
                      }))
                    }
                  />
                  <label htmlFor="rules" className="space-y-1">
                    <span className="font-semibold text-foreground">I agree to the marketplace rules.</span>
                    <span className="block text-xs text-muted-foreground">
                      No weapons, counterfeit, adult content, scams, or external payment demands.
                    </span>
                  </label>
                </div>
                {accountError ? (
                  <p className="text-sm font-semibold text-destructive">{accountError}</p>
                ) : null}
                <Button type="submit" className="w-full rounded-full" size="lg">
                  Create account
                </Button>
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

            {joinStage === "success" ? (
              <div className="space-y-5 text-center">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Account ready
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {accountIsDod
                      ? "Your DoD email is verified. You can post and message right away."
                      : "Browse listings immediately. Verify DoD access from your profile before posting or messaging."}
                  </p>
                </div>
                <Button
                  className="w-full rounded-full"
                  size="lg"
                  onClick={handleFinishSignup}
                >
                  Go to listings
                </Button>
              </div>
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
