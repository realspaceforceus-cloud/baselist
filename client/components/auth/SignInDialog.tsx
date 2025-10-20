import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN_LENGTH } from "@/context/BaseListContext";
import { useAuthDialog } from "@/context/AuthDialogContext";
import { useBaseList } from "@/context/BaseListContext";

const formatPasswordHint = () => `Use ${PASSWORD_MIN_LENGTH}+ characters.`;

export const SignInDialog = (): JSX.Element => {
  const { state, close, setView, openForgot } = useAuthDialog();
  const { signInWithPassword } = useBaseList();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [state.view]);

  useEffect(() => {
    if (!state.isOpen) {
      setIdentifier("");
      setPassword("");
      setForgotEmail("");
      setRememberDevice(false);
      setErrorMessage(null);
    }
  }, [state.isOpen]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await Promise.resolve(
        signInWithPassword(identifier, password, {
          rememberDevice,
        }),
      );
      close();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/.netlify/functions/auth/reset-password/request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail.trim() }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to send reset email");
        setIsSubmitting(false);
        return;
      }

      toast.success("Reset link sent", {
        description:
          "Check your email for the password reset link. It expires in 15 minutes.",
      });
      setView("signIn");
      setForgotEmail("");
      setIsSubmitting(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send reset email",
      );
      setIsSubmitting(false);
    }
  };


  const renderSignIn = () => (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="sign-in-identifier"
          className="text-sm font-semibold text-foreground"
        >
          Email address
        </label>
        <Input
          id="sign-in-identifier"
          type="email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="name@yourunit.mil"
          className="h-11 rounded-full"
          required
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="sign-in-password"
          className="text-sm font-semibold text-foreground"
        >
          Password
        </label>
        <Input
          id="sign-in-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          className="h-11 rounded-full"
          required
        />
        <p className="text-xs text-muted-foreground">{formatPasswordHint()}</p>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={rememberDevice}
            onCheckedChange={(checked) => setRememberDevice(Boolean(checked))}
          />
          Remember this device for 30 days
        </label>
        <button
          type="button"
          className="text-sm font-semibold text-primary hover:underline"
          onClick={openForgot}
        >
          Forgot password?
        </button>
      </div>
      {errorMessage ? (
        <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
      ) : null}
      <DialogFooter>
        <Button
          type="submit"
          className="w-full rounded-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </DialogFooter>
    </form>
  );

  const renderForgot = () => (
    <form onSubmit={handleForgotSubmit} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="forgot-email"
          className="text-sm font-semibold text-foreground"
        >
          Email address
        </label>
        <Input
          id="forgot-email"
          type="email"
          value={forgotEmail}
          onChange={(event) => setForgotEmail(event.target.value)}
          placeholder="Enter the email on your account"
          className="h-11 rounded-full"
          required
        />
        <p className="text-xs text-muted-foreground">
          We’ll send a single-use link that expires in 15 minutes.
        </p>
      </div>
      {errorMessage ? (
        <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
      ) : null}
      <DialogFooter className="flex flex-col gap-3">
        <Button type="submit" className="w-full rounded-full">
          Send reset link
        </Button>
        <button
          type="button"
          className="text-sm font-semibold text-primary hover:underline"
          onClick={() => setView("signIn")}
        >
          Back to sign in
        </button>
      </DialogFooter>
    </form>
  );

  const renderBody = () => {
    switch (state.view) {
      case "forgot":
        return renderForgot();
      default:
        return renderSignIn();
    }
  };

  return (
    <Dialog
      open={state.isOpen}
      onOpenChange={(open) => (!open ? close() : undefined)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state.view === "signIn"
              ? "Welcome back"
              : state.view === "forgot"
                ? "Reset your password"
                : "Set a new password"}
          </DialogTitle>
          <DialogDescription>
            {state.view === "signIn"
              ? "Enter your credentials. We can remember this device for 30 days."
              : state.view === "forgot"
                ? "We never store your password. Reset links expire quickly for security."
                : "Create a new password to regain access."}
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
};
