import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuthDialog } from "@/context/AuthDialogContext";
import {
  EMAIL_PATTERN,
  PASSWORD_MIN_LENGTH,
  USERNAME_PATTERN,
  isDowEmail,
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

  const aVal =
    sinLat * sinLat + sinLon * sinLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));

  return earthRadiusMiles * c;
};

type JoinStage = "hidden" | "account" | "verify" | "success";

const defaultAccountForm = {
  username: "",
  email: "",
  password: "",
  agreeRules: false,
};

const Landing = (): JSX.Element => {
  const { bases, isAuthenticated } = useBaseList();
  const { openSignIn } = useAuthDialog();
  const joinSectionRef = useRef<HTMLDivElement>(null);

  const [joinStage, setJoinStage] = useState<JoinStage>("hidden");
  const [accountForm, setAccountForm] = useState(defaultAccountForm);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [verificationCheckInterval, setVerificationCheckInterval] = useState<
    NodeJS.Timeout | null
  >(null);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes

  const trimmedUsername = accountForm.username.trim();
  const normalizedEmail = accountForm.email.trim().toLowerCase();
  const trimmedPassword = accountForm.password.trim();

  const usernameValid =
    trimmedUsername.length > 0 && USERNAME_PATTERN.test(trimmedUsername);
  const usernamePositive = usernameValid;

  const emailFormatValid =
    normalizedEmail.length > 0 && EMAIL_PATTERN.test(normalizedEmail);
  const emailDow = emailFormatValid && isDowEmail(normalizedEmail);
  const emailPositive = emailDow;

  const passwordStrong = trimmedPassword.length >= PASSWORD_MIN_LENGTH;
  const passwordPositive = trimmedPassword.length > 0 && passwordStrong;

  const canSubmitAccount =
    usernamePositive &&
    emailPositive &&
    passwordStrong &&
    accountForm.agreeRules;

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
    setVerificationCode("");
    setVerificationError(null);
    setPendingUserId(null);
    setPendingEmail("");
    setSearchTerm("");
    setSelectedBaseId(bases[0]?.id ?? "");
    setLocationStatus("idle");
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);

    if (!usernameValid) {
      setAccountError(
        "Username must be 3-20 characters using letters, numbers, or underscores.",
      );
      return;
    }

    if (!emailFormatValid) {
      setAccountError("Enter a valid email address.");
      return;
    }

    if (!emailDow) {
      setAccountError(
        "Use an approved DoW email (.mil or .defense.gov) to continue.",
      );
      return;
    }

    if (!passwordStrong) {
      setAccountError("Password must be at least 12 characters long.");
      return;
    }

    if (!accountForm.agreeRules) {
      setAccountError("Confirm the marketplace rules to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      // First, create the account
      const signupResponse = await fetch("/.netlify/functions/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          email: normalizedEmail,
          password: trimmedPassword,
          baseId: selectedBaseId,
        }),
      });

      if (!signupResponse.ok) {
        const data = await signupResponse.json();
        setAccountError(data.error || "Failed to create account");
        setIsSubmitting(false);
        return;
      }

      const signupData = await signupResponse.json();
      setPendingUserId(signupData.userId);
      setPendingEmail(signupData.email);

      // Then request a verification code for inbound verification
      const verifyResponse = await fetch(
        "/.netlify/functions/verify-status/request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        },
      );

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        setAccountError(data.error || "Failed to generate verification code");
        setIsSubmitting(false);
        return;
      }

      const verifyData = await verifyResponse.json();
      setGeneratedCode(verifyData.code);
      setTimeRemaining(1800); // 30 minutes
      setIsVerificationPending(false);
      setJoinStage("verify");

      toast.success("Account created", {
        description: "Follow the email instructions to verify your account.",
      });
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Failed to create account",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch(
        `/.netlify/functions/verify-status/status?email=${encodeURIComponent(pendingEmail)}`,
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.status === "verified") {
        setIsVerificationPending(false);
        if (verificationCheckInterval) {
          clearInterval(verificationCheckInterval);
          setVerificationCheckInterval(null);
        }
        setPendingUserId(data.userId || pendingUserId);
        setJoinStage("success");
        toast.success("Email verified", {
          description: "Your account is ready to use!",
        });
      } else if (data.status === "expired") {
        setIsVerificationPending(false);
        setVerificationError("Verification code has expired. Generate a new one.");
      }
    } catch (error) {
      console.error("Status check failed:", error);
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerificationError(null);

    setIsVerificationPending(true);

    // Start polling for verification status
    const interval = setInterval(checkVerificationStatus, 2000); // Check every 2 seconds
    setVerificationCheckInterval(interval);

    // Check immediately
    checkVerificationStatus();
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch(
        "/.netlify/functions/verify-status/resend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pendingEmail }),
        },
      );

      if (!response.ok) {
        toast.error("Failed to resend code");
        return;
      }

      const data = await response.json();
      setGeneratedCode(data.code);
      setTimeRemaining(1800); // Reset to 30 minutes
      toast.success("Code sent", {
        description: "New verification code generated.",
      });
    } catch (error) {
      toast.error("Failed to resend code");
    }
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch("/.netlify/functions/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

      if (!response.ok) {
        toast.error("Failed to resend code");
        return;
      }

      toast.success("Code sent", {
        description: "Check your email for the new verification code.",
      });
    } catch (error) {
      toast.error("Failed to resend code");
    }
  };

  const handleFinishSignup = () => {
    if (!pendingUserId || !pendingEmail) {
      return;
    }

    setJoinStage("hidden");
    setPendingUserId(null);
    setPendingEmail("");
    setAccountForm(defaultAccountForm);
    setVerificationCode("");
    setVerificationError(null);

    toast.success("Welcome to BaseList!", {
      description: "You can now post listings and message other members.",
    });

    window.location.href = "/";
  };

  useEffect(() => {
    if (joinStage !== "account" || locationStatus !== "idle") {
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
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 10 * 1000,
      },
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
      a: { base: (typeof bases)[number]; distance: number },
      b: { base: (typeof bases)[number]; distance: number },
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

  const handleExpansionSubmit = () => {
    if (!EMAIL_PATTERN.test(expansionEmail.trim())) {
      toast.error("Enter a valid email to stay informed.");
      return;
    }
    toast.success("Thanks! We'll notify you as new bases launch.");
    setExpansionEmail("");
    setShowExpansionForm(false);
  };

  const isJoinActive = joinStage !== "hidden" && !isAuthenticated;

  if (isJoinActive) {
    return (
      <section ref={joinSectionRef} className="px-4 py-6 animate-fade-in">
        <div className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
          <header className="flex flex-col gap-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {joinStage === "account"
                ? "Step 1 of 2"
                : joinStage === "verify"
                  ? "Step 2 of 2"
                  : "Complete"}
            </p>
            <h2 className="text-2xl font-semibold text-foreground">
              {joinStage === "account" && "Create your BaseList account"}
              {joinStage === "verify" && "Verify your email"}
              {joinStage === "success" && "You're all set!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {joinStage === "account"
                ? "Username only. No real names required."
                : joinStage === "verify"
                  ? "Enter the 6-digit code we sent to your email"
                  : "Your account is ready. Sign in to get started."}
            </p>
          </header>

          {joinStage === "account" ? (
            <form onSubmit={handleAccountSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="signup-username"
                  className="text-sm font-semibold text-foreground"
                >
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
                  disabled={isSubmitting}
                />
                {accountForm.username ? (
                  usernamePositive ? (
                    <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Username available.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
                      <AlertCircle className="h-4 w-4" aria-hidden />
                      {usernameValid
                        ? "That username is already taken."
                        : "Username must be 3-20 characters using letters, numbers, or underscores."}
                    </p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    3-20 characters. Letters, numbers, and underscores only.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="signup-email"
                  className="text-sm font-semibold text-foreground"
                >
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
                  placeholder="Enter your .mil or DoW email"
                  className="h-11 rounded-full"
                  required
                  disabled={isSubmitting}
                />
                {accountForm.email ? (
                  emailPositive ? (
                    <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      DoW email detected.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
                      <AlertCircle className="h-4 w-4" aria-hidden />
                      {!emailFormatValid
                        ? "Enter a valid email address."
                        : "Use an approved DoW email (.mil or .defense.gov)."}
                    </p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Use your DoW email (.mil or .defense.gov).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="signup-password"
                  className="text-sm font-semibold text-foreground"
                >
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
                  disabled={isSubmitting}
                />
                {accountForm.password ? (
                  passwordPositive ? (
                    <p className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Password meets length requirements.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-xs font-semibold text-destructive">
                      <AlertCircle className="h-4 w-4" aria-hidden />
                      {`Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`}
                    </p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Use {PASSWORD_MIN_LENGTH}+ characters. A simple phrase works
                    great.
                  </p>
                )}
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
                  disabled={isSubmitting}
                />
                <label htmlFor="rules" className="space-y-1">
                  <span className="font-semibold text-foreground">
                    I agree to the marketplace rules.
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    No weapons, counterfeit, adult content, scams, or external
                    payment demands.
                  </span>
                </label>
              </div>

              {accountError ? (
                <p className="text-sm font-semibold text-destructive">
                  {accountError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full rounded-full"
                size="lg"
                disabled={!canSubmitAccount || isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          ) : null}

          {joinStage === "verify" ? (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="verify-code"
                  className="text-sm font-semibold text-foreground"
                >
                  Verification Code
                </label>
                <Input
                  id="verify-code"
                  type="text"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="000000"
                  maxLength={6}
                  className="h-11 rounded-full text-center text-lg tracking-widest font-mono"
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold">{pendingEmail}</span>
                </p>
              </div>

              {verificationError ? (
                <p className="text-sm font-semibold text-destructive">
                  {verificationError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full rounded-full"
                size="lg"
                disabled={verificationCode.length !== 6 || isSubmitting}
              >
                {isSubmitting ? "Verifying..." : "Verify Email"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-full"
                onClick={handleResendCode}
                disabled={isSubmitting}
              >
                Didn't get the code? Resend
              </Button>
            </form>
          ) : null}

          {joinStage === "success" ? (
            <div className="space-y-5 text-center">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Account verified!
                </h3>
                <p className="text-sm text-muted-foreground">
                  You're all set. Sign in to start browsing, posting, and
                  messaging on BaseList.
                </p>
              </div>

              <Button
                className="w-full rounded-full"
                size="lg"
                onClick={handleFinishSignup}
              >
                Sign In
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-10 py-10 animate-fade-in">
      <section className="px-4">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Verified classifieds for military bases.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            Built by an Active-Duty Airman for verified DoW members and
            families. Safe, local, and private—on base only.
          </p>
          <div className="flex items-center justify-center gap-8">
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
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={handleStartJoin}
            >
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
              All data encrypted. No IDs stored. Trusted across the DoW.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Landing;
