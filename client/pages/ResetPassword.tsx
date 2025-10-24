import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PASSWORD_MIN_LENGTH } from "@/context/BaseListContext";

const ResetPassword = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMessage(
        "Invalid or expired reset link. Please request a new one.",
      );
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    if (newPassword.trim().length < PASSWORD_MIN_LENGTH) {
      setErrorMessage(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      );
      setIsSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords must match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Failed to reset password");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully", {
        description: "You can now sign in with your new password.",
      });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to reset password",
      );
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-muted-foreground mb-4">
              This password reset link is invalid or has expired.
            </p>
            <div className="bg-muted/50 border border-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> DoW email servers may delay email
                delivery up to 25 hours. If you didn't receive your reset email,
                check your spam/junk folder or request a new reset link.
              </p>
            </div>
            <Button
              onClick={() => navigate("/")}
              className="w-full rounded-full"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Password Reset Successful
            </h1>
            <p className="text-muted-foreground mb-6">
              Your password has been reset successfully. Redirecting you to sign
              in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Set New Password
          </h1>
          <p className="text-muted-foreground mb-6">
            Create a new password to regain access to your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="new-password"
                className="text-sm font-semibold text-foreground"
              >
                New Password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                className="h-11 rounded-full"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-password"
                className="text-sm font-semibold text-foreground"
              >
                Confirm Password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                className="h-11 rounded-full"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use {PASSWORD_MIN_LENGTH}+ characters.
              </p>
            </div>

            {errorMessage && (
              <p className="text-sm font-semibold text-destructive">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Resetting…" : "Reset Password"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Back to sign in? Go to the{" "}
            <button
              onClick={() => navigate("/")}
              className="text-primary hover:underline font-semibold"
            >
              home page
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
