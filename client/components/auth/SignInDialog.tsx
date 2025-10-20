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

const formatPasswordHint = () =>
  `Use ${PASSWORD_MIN_LENGTH}+ characters. A simple phrase works great.`;

export const SignInDialog = (): JSX.Element => {
  const { state, close, setView, openForgot, openReset } = useAuthDialog();
  const {
    signInWithPassword,
    requestPasswordReset,
    completePasswordReset,
    pendingPasswordReset,
  } = useBaseList();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setNewPassword("");
      setConfirmPassword("");
      setRememberDevice(false);
      setErrorMessage(null);
    }
  }, [state.isOpen]);

  const pendingResetToken = useMemo(() => {
    if (!state.resetToken) {
      return null;
    }
    if (
      !pendingPasswordReset ||
      pendingPasswordReset.token !== state.resetToken
    ) {
      return null;
    }
    return pendingPasswordReset.token;
  }, [pendingPasswordReset, state.resetToken]);

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

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const token = requestPasswordReset(forgotEmail);
    if (!token) {
      setErrorMessage("We couldn’t find an account with that email.");
      return;
    }

    toast.success("Reset link sent", {
      description: "Check your email. The link expires in 15 minutes.",
    });
    openReset(token, forgotEmail);
  };

  const handleResetSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!pendingResetToken) {
      setErrorMessage("Reset link expired. Request a new one.");
      return;
    }

    if (newPassword.trim().length < PASSWORD_MIN_LENGTH) {
      setErrorMessage(formatPasswordHint());
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords must match.");
      return;
    }

    try {
      completePasswordReset(pendingResetToken, newPassword);
      toast.success("Password updated", {
        description: "Sign in with your new password.",
      });
      setView("signIn");
      setIdentifier(state.resetEmail ?? "");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset password. Try again.",
      );
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

  const renderReset = () => (
    <form onSubmit={handleResetSubmit} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="new-password"
          className="text-sm font-semibold text-foreground"
        >
          New password
        </label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Create a new password"
          className="h-11 rounded-full"
          required
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="confirm-password"
          className="text-sm font-semibold text-foreground"
        >
          Confirm password
        </label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your password"
          className="h-11 rounded-full"
          required
        />
        <p className="text-xs text-muted-foreground">{formatPasswordHint()}</p>
      </div>
      {errorMessage ? (
        <p className="text-sm font-semibold text-destructive">{errorMessage}</p>
      ) : null}
      <DialogFooter className="flex flex-col gap-3">
        <Button type="submit" className="w-full rounded-full">
          Reset password
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
      case "reset":
        return renderReset();
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
