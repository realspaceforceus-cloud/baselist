import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SEOHead } from "@/components/SEOHead";
import { getSEOConfig } from "@/components/SEOSettings";
import { useSettings } from "@/context/SettingsContext";
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
  const {
    bases,
    isAuthenticated,
    signInWithPassword,
    registerNewAccount,
    completeDowVerification,
  } = useBaseList();
  const { openSignIn } = useAuthDialog();
  const { settings } = useSettings();
  const seoConfig = getSEOConfig(settings as Record<string, string>);
  const navigate = useNavigate();
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
  const [verificationCheckInterval, setVerificationCheckInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [hasShownSuccessNotification, setHasShownSuccessNotification] =
    useState(false);
  const [pendingPassword, setPendingPassword] = useState<string>("");
  const [pendingUsername, setPendingUsername] = useState<string>("");
  const [pendingBaseId, setPendingBaseId] = useState<string>("");
  const [proceedCountdown, setProceedCountdown] = useState(0);
  const [isProceedingToAccount, setIsProceedingToAccount] = useState(false);
  const countdownStartedRef = useRef(false);
  const verificationPollingStartedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const verificationCompleteRef = useRef(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    setHasShownSuccessNotification(false);
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
      // Reset verification polling flag for new signup
      verificationPollingStartedRef.current = false;
      countdownStartedRef.current = false;
      confettiFiredRef.current = false;
      verificationCompleteRef.current = false;
      setHasShownSuccessNotification(false);

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
      setPendingPassword(trimmedPassword);
      setPendingUsername(trimmedUsername);
      setPendingBaseId(selectedBaseId);

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
        // Only process once - skip if verification already complete
        if (verificationCompleteRef.current) {
          return;
        }
        verificationCompleteRef.current = true;

        setIsVerificationPending(false);
        if (verificationCheckInterval) {
          clearInterval(verificationCheckInterval);
          setVerificationCheckInterval(null);
        }

        const userId = data.userId || pendingUserId;
        setPendingUserId(userId);

        // Mark the account as verified - account should already be in context by now
        // But ensure it's there in case verification happens quickly
        if (userId) {
          try {
            completeDowVerification(userId);
          } catch (error) {
            console.error("Failed to mark account as verified:", error);
            // Account not found in context yet, that's OK - it will be registered in handleFinishSignup
          }
        }

        // Mark success notification as shown BEFORE updating state
        setHasShownSuccessNotification(true);

        // Fire confetti only once
        if (!confettiFiredRef.current) {
          confettiFiredRef.current = true;
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }

        // Only set these once
        setJoinStage("success");

        // Start countdown with independent timer
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        let count = 5;
        setProceedCountdown(5);
        countdownTimerRef.current = setInterval(() => {
          count--;
          setProceedCountdown(count);
          if (count <= 0) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
          }
        }, 1000);
      } else if (data.status === "expired") {
        setIsVerificationPending(false);
        setVerificationError(
          "Verification code has expired. Generate a new one.",
        );
      }
    } catch (error) {
      console.error("Status check failed:", error);
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerificationError(null);

    // Only start polling once
    if (verificationPollingStartedRef.current) {
      return;
    }
    verificationPollingStartedRef.current = true;

    setIsVerificationPending(true);

    // Check immediately
    checkVerificationStatus();

    // Start polling for verification status
    const interval = setInterval(checkVerificationStatus, 2000); // Check every 2 seconds
    setVerificationCheckInterval(interval);
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch("/.netlify/functions/verify-status/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

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

  const handleFinishSignup = async () => {
    if (
      !pendingUserId ||
      !pendingEmail ||
      !pendingPassword ||
      !pendingUsername ||
      !pendingBaseId
    ) {
      return;
    }

    if (isProceedingToAccount) {
      return; // Prevent double-clicks
    }

    setIsProceedingToAccount(true);

    if (verificationCheckInterval) {
      clearInterval(verificationCheckInterval);
      setVerificationCheckInterval(null);
    }

    try {
      // Register the account in the local context so signInWithPassword can find it
      registerNewAccount(
        pendingUserId,
        pendingUsername,
        pendingEmail,
        pendingPassword,
        pendingBaseId,
      );

      // Mark the account as verified since they've completed email verification
      // This happens synchronously - account is now in context and marked verified
      completeDowVerification(pendingUserId);

      // Auto-login with the email and password from signup
      // The account is now in context and verified, so this should find it properly
      await signInWithPassword(pendingEmail, pendingPassword);

      setJoinStage("hidden");
      setPendingUserId(null);
      setPendingEmail("");
      setPendingPassword("");
      setPendingUsername("");
      setPendingBaseId("");
      setAccountForm(defaultAccountForm);
      setVerificationCode("");
      setVerificationError(null);
      setGeneratedCode("");
      setIsVerificationPending(false);
      setTimeRemaining(1800);

      navigate("/");
    } catch (error) {
      console.error("Auto-login failed:", error);
      setIsProceedingToAccount(false); // Allow retry
      navigate("/");
    }
  };

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (verificationCheckInterval) {
        clearInterval(verificationCheckInterval);
      }
    };
  }, [verificationCheckInterval]);

  // Countdown timer for verification code expiration
  useEffect(() => {
    if (joinStage !== "verify" || !isVerificationPending) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (verificationCheckInterval) {
            clearInterval(verificationCheckInterval);
            setVerificationCheckInterval(null);
          }
          setIsVerificationPending(false);
          setVerificationError(
            "Verification code expired. Please generate a new one.",
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [joinStage, isVerificationPending, verificationCheckInterval]);

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
              {joinStage === "verify" && "Verify your .mil email"}
              {joinStage === "success" && "You're all set!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {joinStage === "account"
                ? "Username only. No real names required."
                : joinStage === "verify"
                  ? "Send a verification code from your .mil email to confirm your identity"
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
                    Use {PASSWORD_MIN_LENGTH}+ characters.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="signup-base"
                  className="text-sm font-semibold text-foreground"
                >
                  Select your base
                </label>
                <select
                  id="signup-base"
                  value={selectedBaseId}
                  onChange={(event) => setSelectedBaseId(event.target.value)}
                  className="h-11 w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Choose your base...</option>
                  {bases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name} ({base.abbreviation})
                    </option>
                  ))}
                </select>
                {!selectedBaseId ? (
                  <p className="text-xs text-muted-foreground">
                    Select the military base where you're stationed.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowExpansionForm(true)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  My base isn't listed → Request your base
                </button>
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
              <div className="space-y-4 rounded-lg border border-border bg-card/50 p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    Verify your .mil email
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Send your verification code from your .mil email account.
                  </p>
                </div>

                <div className="space-y-3 rounded bg-background p-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Your verification code:
                    </p>
                    <code
                      className="block rounded bg-muted px-4 py-4 font-[monospace] text-4xl font-bold text-foreground text-center tracking-[0.3em] select-all"
                      style={{
                        fontFamily: "monospace",
                        letterSpacing: "0.3em",
                      }}
                    >
                      {generatedCode}
                    </code>
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCode);
                          toast.dismiss("copy-code");
                          toast.success("Code copied!", {
                            id: "copy-code",
                          });
                        }}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </Button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Copy this 5-character code. Uses only:{" "}
                      <span className="font-mono font-semibold">A-Z, 2-9</span>{" "}
                      (no O, I, L, or 1)
                    </p>
                  </div>

                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 font-semibold text-primary">
                        1
                      </span>
                      <span>
                        Send an email to{" "}
                        <code className="rounded bg-muted px-2 py-1 font-mono text-foreground">
                          verify@trustypcs.com
                        </code>
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 font-semibold text-primary">
                        2
                      </span>
                      <div className="space-y-1">
                        <span>
                          Put the code in the subject line and leave the body
                          blank
                        </span>
                        <span className="text-xs text-yellow-600 font-semibold block">
                          ⚠️ The code is case sensitive
                        </span>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 font-semibold text-primary">
                        3
                      </span>
                      <span>We'll verify immediately</span>
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs text-blue-900">
                    ⚠️ <strong>Important:</strong> Send from your DoW email
                    account (your .mil email). Personal email accounts won't
                    verify.
                  </p>
                </div>
              </div>

              {verificationError ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  {verificationError}
                </p>
              ) : null}

              {isVerificationPending ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Waiting for verification...
                  </p>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${(timeRemaining / 1800) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Code expires in {Math.floor(timeRemaining / 60)}:
                    {String(timeRemaining % 60).padStart(2, "0")}
                  </p>
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full rounded-full"
                size="lg"
                disabled={isVerificationPending || isSubmitting}
              >
                {isVerificationPending
                  ? "Waiting for verification..."
                  : "I've sent the email"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-full"
                onClick={handleResendCode}
                disabled={isVerificationPending || isSubmitting}
              >
                Generate a new code
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
                  You're all set. Start browsing, posting, and messaging on
                  BaseList.
                </p>
              </div>

              <Button
                className="w-full rounded-full"
                size="lg"
                onClick={handleFinishSignup}
                disabled={isProceedingToAccount || proceedCountdown > 0}
              >
                {isProceedingToAccount
                  ? "Logging in..."
                  : proceedCountdown > 0
                    ? `Please wait... (${proceedCountdown}s)`
                    : "Proceed to your account"}
              </Button>
            </div>
          ) : null}
        </div>

        {showExpansionForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-foreground">
                  Request your base
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowExpansionForm(false);
                    setExpansionEmail("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!expansionEmail.trim()) {
                    toast.error("Please enter a base name");
                    return;
                  }
                  try {
                    const response = await fetch("/api/email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "base_request",
                        baseName: expansionEmail,
                        email: accountForm.email || "unknown",
                      }),
                    });

                    if (response.ok) {
                      toast.success("Base request sent!", {
                        description:
                          "Admins will review and add your base soon.",
                      });
                      setShowExpansionForm(false);
                      setExpansionEmail("");
                    } else {
                      const errorData = await response.json();
                      toast.error(
                        errorData.error || "Failed to send request. Try again.",
                      );
                    }
                  } catch (error) {
                    console.error("Base request error:", error);
                    toast.error(
                      "Failed to send request. Please try again later.",
                    );
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    Base name
                  </label>
                  <Input
                    value={expansionEmail}
                    onChange={(e) => setExpansionEmail(e.target.value)}
                    placeholder="e.g., Joint Base San Antonio"
                    className="mt-2 h-11 rounded-full"
                    required
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tell us the name of your military base. We'll add it
                    shortly.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 rounded-full">
                    Send request
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 rounded-full"
                    onClick={() => {
                      setShowExpansionForm(false);
                      setExpansionEmail("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <SEOHead
        title={`TrustyPCS - ${seoConfig.primary_tagline}`}
        description={seoConfig.homepage_meta_description}
        keywords={seoConfig.primary_keywords}
        canonical="https://trustypcs.com/"
      />
      <div className="space-y-10 py-10 animate-fade-in">
        <section className="px-4">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              {seoConfig.primary_tagline.includes("—") ? (
                <>
                  {seoConfig.primary_tagline.split("—")[0].trim()}
                  <br />
                  {seoConfig.primary_tagline.split("—")[1].trim()}
                </>
              ) : (
                seoConfig.primary_tagline
              )}
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
              {seoConfig.secondary_tagline}
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
    </>
  );
};

export default Landing;
