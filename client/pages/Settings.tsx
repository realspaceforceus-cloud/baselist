import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBaseList } from "@/context/BaseListContext";
import { USERNAME_PATTERN } from "@/context/BaseListContext";
import { cn } from "@/lib/utils";
import { AlertTriangle, Eye, EyeOff, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface FormState {
  username: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  notificationsEnabled: boolean;
}

interface EmailVerificationDialogState {
  isOpen: boolean;
  newEmail: string;
}

export const Settings = (): JSX.Element => {
  const { user, signOut } = useBaseList();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [emailVerificationDialog, setEmailVerificationDialog] =
    useState<EmailVerificationDialogState>({ isOpen: false, newEmail: "" });

  const [formState, setFormState] = useState<FormState>({
    username: user.name || "",
    email: user.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    notificationsEnabled: user.notificationsEnabled ?? true,
  });

  const handleInputChange = (
    field: keyof FormState,
    value: string | boolean,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmailChange = async () => {
    if (!formState.email || formState.email === user.email) {
      toast.error("Please enter a different email address");
      return;
    }

    setEmailVerificationDialog({
      isOpen: true,
      newEmail: formState.email,
    });
  };

  const handleConfirmEmailChange = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/email/request-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: emailVerificationDialog.newEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to request email change");
      }

      toast.success(
        `Verification link sent to ${emailVerificationDialog.newEmail}. Please verify to complete the change.`,
      );
      setEmailVerificationDialog({ isOpen: false, newEmail: "" });
      setFormState((prev) => ({
        ...prev,
        email: user.email || "",
      }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to request email change",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!formState.currentPassword || !formState.newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (formState.newPassword !== formState.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (formState.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      toast.success("Password changed successfully");
      setShowPasswordFields(false);
      setFormState((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = async () => {
    setUsernameError("");

    if (!formState.username || formState.username === user.name) {
      toast.error("Please enter a different username");
      return;
    }

    if (!USERNAME_PATTERN.test(formState.username)) {
      setUsernameError(
        "Username must be 3-20 characters long and contain only letters, numbers, and underscores",
      );
      toast.error("Invalid username format");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.username,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update username");
      }

      const data = await response.json();
      toast.success("Username updated successfully");
      setUsernameError("");

      // Update form state with new username
      if (data.name) {
        setFormState((prev) => ({ ...prev, username: data.name }));
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to update username";
      toast.error(errorMsg);
      setUsernameError(errorMsg);
      setFormState((prev) => ({ ...prev, username: user.name || "" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string;

          const response = await fetch("/api/user/profile/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              avatarUrl: dataUrl,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to upload avatar");
          }

          toast.success("Avatar updated successfully");

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to upload avatar",
          );
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process avatar",
      );
      setIsUploadingAvatar(false);
    }
  };

  const handleNotificationsToggle = async () => {
    setIsLoading(true);
    try {
      const newState = !formState.notificationsEnabled;
      const response = await fetch("/api/user/notifications/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: newState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update notifications");
      }

      setFormState((prev) => ({
        ...prev,
        notificationsEnabled: newState,
      }));
      toast.success(
        newState ? "Notifications enabled" : "Notifications disabled",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update notifications",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      toast.success("Account deleted successfully");
      signOut();
      navigate("/");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account",
      );
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const avatarInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "BL";

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your profile information
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground">
                Profile Picture
              </label>
              <div className="mt-3 flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                  ) : (
                    <AvatarFallback className="text-lg font-semibold">
                      {avatarInitials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Upload className="h-4 w-4 mr-2" aria-hidden />
                    {isUploadingAvatar ? "Uploading..." : "Change photo"}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground">
                Username
              </label>
              <p className="mt-1 text-xs text-muted-foreground mb-3">
                Current username:{" "}
                <span className="font-semibold text-foreground">
                  {user.name}
                </span>
              </p>
              <div className="mt-3 flex gap-2">
                <div className="flex-1">
                  <Input
                    value={formState.username}
                    onChange={(e) => {
                      handleInputChange("username", e.target.value);
                      setUsernameError("");
                    }}
                    placeholder="Enter new username"
                    className={cn(
                      "rounded-xl",
                      usernameError && "border-destructive",
                    )}
                  />
                  {usernameError && (
                    <p className="mt-2 text-xs text-destructive">
                      {usernameError}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    3-20 characters, letters, numbers, and underscores only
                  </p>
                </div>
                <Button
                  onClick={handleUsernameChange}
                  disabled={
                    isLoading ||
                    formState.username === user.name ||
                    !!usernameError
                  }
                  className="rounded-xl mt-auto"
                >
                  <Save className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground">
            Account Security
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your email and password
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground">
                Email Address
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground">
                  {user.email}
                </span>
                {user.verified && (
                  <span className="rounded-full bg-verified/10 px-3 py-1 text-xs font-semibold text-verified">
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-3">
                <Input
                  type="email"
                  value={formState.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="New email address"
                  className="rounded-xl"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                ⚠️ Changing your email will remove your DoD verification until
                the new address is verified.
              </p>
              <Button
                onClick={handleEmailChange}
                disabled={
                  isLoading ||
                  formState.email === user.email ||
                  !formState.email
                }
                className="mt-3 rounded-xl"
              >
                Request email change
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                  className="rounded-lg text-xs font-semibold text-primary"
                >
                  {showPasswordFields ? "Cancel" : "Change password"}
                </Button>
              </div>

              {showPasswordFields && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Current Password
                    </label>
                    <div className="relative mt-1.5">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={formState.currentPassword}
                        onChange={(e) =>
                          handleInputChange("currentPassword", e.target.value)
                        }
                        placeholder="Enter your current password"
                        className="rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground">
                      New Password
                    </label>
                    <div className="relative mt-1.5">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={formState.newPassword}
                        onChange={(e) =>
                          handleInputChange("newPassword", e.target.value)
                        }
                        placeholder="Enter your new password"
                        className="rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Confirm New Password
                    </label>
                    <div className="relative mt-1.5">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formState.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        placeholder="Confirm your new password"
                        className="rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handlePasswordChange}
                    disabled={isLoading}
                    className="mt-4 w-full rounded-xl"
                  >
                    Update password
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Control how you receive updates
          </p>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Email notifications
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Receive updates about messages, offers, and account activity
              </p>
            </div>
            <button
              onClick={handleNotificationsToggle}
              disabled={isLoading}
              className={cn(
                "relative inline-flex h-8 w-14 items-center rounded-full transition",
                formState.notificationsEnabled ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
                  formState.notificationsEnabled
                    ? "translate-x-7"
                    : "translate-x-1",
                )}
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            Danger Zone
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Irreversible and destructive actions
          </p>

          <div className="mt-6">
            <p className="text-sm text-foreground">
              Delete your account permanently
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <Button
              variant="destructive"
              className="mt-4 rounded-xl"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete account
            </Button>
          </div>
        </div>
      </div>

      <EmailVerificationDialog
        isOpen={emailVerificationDialog.isOpen}
        newEmail={emailVerificationDialog.newEmail}
        onConfirm={handleConfirmEmailChange}
        onCancel={() =>
          setEmailVerificationDialog({ isOpen: false, newEmail: "" })
        }
        isLoading={isLoading}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              Delete account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your account, listings, and all
              associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-semibold text-destructive">
              Are you absolutely sure? This is permanent.
            </p>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete my account"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface EmailVerificationDialogProps {
  isOpen: boolean;
  newEmail: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const EmailVerificationDialog = ({
  isOpen,
  newEmail,
  onConfirm,
  onCancel,
  isLoading,
}: EmailVerificationDialogProps): JSX.Element => {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Confirm email change</DialogTitle>
          <DialogDescription>
            Changing your email will remove your DoD verification until the new
            address is verified.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
          <p className="text-sm font-semibold text-warning">
            What happens next:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-foreground">
            <li>• Your verification status will be temporarily removed</li>
            <li>• You won't be able to post or message until verified again</li>
            <li>• A verification link will be sent to {newEmail}</li>
            <li>• Once verified, you'll regain full access</li>
          </ul>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-xl"
          >
            {isLoading ? "Sending..." : "Yes, change my email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
