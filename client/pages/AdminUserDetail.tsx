import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Eye,
  Lock,
  AlertCircle,
  Trash2,
  Plus,
  Copy,
  Check,
  Shield,
  ShoppingCart,
  Star,
  LogIn,
  MapPin,
  UserCheck,
  Edit2,
  Save,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { adminApi } from "@/lib/adminApi";

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
};

export const AdminUserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>({
    successfulLogins: [],
    failedLogins: [],
    uniqueIps: [],
    strikes: [],
    listings: [],
    ratings: [],
  });
  const [bases, setBases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showStrikeModal, setShowStrikeModal] = useState(false);
  const [passwordAction, setPasswordAction] = useState<"temp" | "link" | null>(
    null,
  );
  const [copiedText, setCopiedText] = useState("");
  const [strikeForm, setStrikeForm] = useState({
    type: "spam",
    description: "",
    severity: "warning",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editable fields
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    username: "",
    email: "",
    role: "member",
    status: "active",
    baseId: "",
    avatarUrl: "",
  });

  useEffect(() => {
    const loadUserDetail = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const result = await adminApi.getUserDetail(userId);
        setUser(result);
        setEditData({
          username: result.user.username,
          email: result.user.email,
          role: result.user.role,
          status: result.user.status,
          baseId: result.user.baseId,
          avatarUrl: result.user.avatarUrl || "",
        });

        // Load bases for dropdown
        const basesResult = await adminApi.getBases();
        setBases(
          (basesResult?.bases || []).map((b: any) => ({
            id: b.id,
            name: b.name,
          })),
        );
      } catch (error) {
        console.error("Failed to load user detail:", error);
        toast.error("Failed to load user details");
        navigate("/admin");
      } finally {
        setIsLoading(false);
      }
    };
    loadUserDetail();
  }, [userId, navigate]);

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedText(""), 2000);
  };

  const handlePasswordReset = async () => {
    setIsSubmitting(true);
    try {
      const result = await adminApi.resetUserPassword(userId!, {
        generateTemp: passwordAction === "temp",
        sendEmail: passwordAction === "link",
      });

      if (result.tempPassword) {
        handleCopyToClipboard(result.tempPassword, "Temporary Password");
      } else if (result.resetLink) {
        handleCopyToClipboard(result.resetLink, "Reset Link");
      }

      toast.success(result.message);
      setShowPasswordModal(false);
      setPasswordAction(null);
    } catch (error) {
      console.error("Failed to reset password:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStrike = async () => {
    if (!strikeForm.description.trim()) {
      toast.error("Strike description is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const newStrike = await adminApi.addStrike(
        userId!,
        strikeForm.type,
        strikeForm.description,
        strikeForm.severity,
      );

      setUser((prev: any) => ({
        ...prev,
        strikes: [newStrike, ...prev.strikes],
      }));

      setStrikeForm({ type: "spam", description: "", severity: "warning" });
      setShowStrikeModal(false);
      toast.success("Strike added");
    } catch (error) {
      console.error("Failed to add strike:", error);
      toast.error("Failed to add strike");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStrike = async (strikeId: string) => {
    try {
      await adminApi.removeStrike(userId!, strikeId);
      setUser((prev: any) => ({
        ...prev,
        strikes: prev.strikes.filter((s: any) => s.id !== strikeId),
      }));
      toast.success("Strike removed");
    } catch (error) {
      console.error("Failed to remove strike:", error);
      toast.error("Failed to remove strike");
    }
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    try {
      const updatePayload: any = {};
      if (editData.username !== user.user.username)
        updatePayload.username = editData.username;
      if (editData.email !== user.user.email)
        updatePayload.email = editData.email;
      if (editData.role !== user.user.role) updatePayload.role = editData.role;
      if (editData.status !== user.user.status)
        updatePayload.status = editData.status;
      if (editData.baseId !== user.user.baseId)
        updatePayload.baseId = editData.baseId;
      if (editData.avatarUrl !== (user.user.avatarUrl || ""))
        updatePayload.avatarUrl = editData.avatarUrl;

      if (Object.keys(updatePayload).length === 0) {
        toast.info("No changes made");
        setEditMode(false);
        return;
      }

      await adminApi.updateUserProfile(userId!, updatePayload);
      setUser((prev: any) => ({
        ...prev,
        user: {
          ...prev.user,
          ...updatePayload,
          baseId: updatePayload.baseId || prev.user.baseId,
        },
      }));
      toast.success("User profile updated");
      setEditMode(false);
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">User not found</p>
          <Button
            onClick={() => navigate("/admin")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  const userInfo = user.user;

  return (
    <div className="min-h-screen bg-background/50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="rounded-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">User Details</h1>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button
                onClick={handleSaveChanges}
                disabled={isSubmitting}
                className="rounded-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditMode(false)}
                disabled={isSubmitting}
                className="rounded-full"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => setEditMode(true)}
              className="rounded-full"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6 max-w-6xl mx-auto">
        {/* User Profile Card */}
        <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={
                  editMode
                    ? editData.avatarUrl || userInfo.avatarUrl
                    : userInfo.avatarUrl
                }
                alt={userInfo.username}
              />
              <AvatarFallback>
                {(editMode ? editData.username : userInfo.username).charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {editMode ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold uppercase">
                          Username
                        </Label>
                        <Input
                          value={editData.username}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              username: e.target.value,
                            })
                          }
                          className="rounded-lg mt-1"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase">
                          Avatar URL
                        </Label>
                        <Input
                          value={editData.avatarUrl}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              avatarUrl: e.target.value,
                            })
                          }
                          className="rounded-lg mt-1"
                          placeholder="https://..."
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold">
                        {userInfo.username}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        ID: {userInfo.id}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Dialog
                    open={showPasswordModal}
                    onOpenChange={setShowPasswordModal}
                  >
                    <DialogTrigger asChild>
                      <Button className="rounded-full">
                        <Lock className="h-4 w-4 mr-2" />
                        Password Reset
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Choose how to reset the user's password
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setPasswordAction("temp")}
                          disabled={isSubmitting}
                        >
                          Generate Temporary Password
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setPasswordAction("link")}
                          disabled={isSubmitting}
                        >
                          Generate Reset Link
                        </Button>
                        {passwordAction && (
                          <Button
                            className="w-full"
                            onClick={handlePasswordReset}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Generating..." : "Confirm"}
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <div>
                      <Label className="text-xs font-semibold uppercase">
                        Email
                      </Label>
                      <Input
                        value={editData.email}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                        className="rounded-lg mt-1"
                        type="email"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase">
                        Status
                      </Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) =>
                          setEditData({ ...editData, status: value })
                        }
                      >
                        <SelectTrigger className="mt-1 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="banned">Banned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase">
                        Role
                      </Label>
                      <Select
                        value={editData.role}
                        onValueChange={(value) =>
                          setEditData({ ...editData, role: value })
                        }
                      >
                        <SelectTrigger className="mt-1 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase">
                        Base
                      </Label>
                      <Select
                        value={editData.baseId}
                        onValueChange={(value) =>
                          setEditData({ ...editData, baseId: value })
                        }
                      >
                        <SelectTrigger className="mt-1 rounded-lg">
                          <SelectValue placeholder="Select a base" />
                        </SelectTrigger>
                        <SelectContent>
                          {bases.map((base) => (
                            <SelectItem key={base.id} value={base.id}>
                              {base.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Email
                      </p>
                      <p className="flex items-center gap-2 mt-1">
                        <span className="font-medium">{userInfo.email}</span>
                        <button
                          onClick={() =>
                            handleCopyToClipboard(userInfo.email, "Email")
                          }
                          className="hover:text-primary"
                        >
                          {copiedText === "Email" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            userInfo.status === "active"
                              ? "bg-success/10 text-success"
                              : userInfo.status === "suspended"
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {userInfo.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Role
                      </p>
                      <p className="mt-1 capitalize font-medium">
                        {userInfo.role}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Base
                      </p>
                      <p className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {userInfo.baseName || userInfo.baseId || "—"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="border-t border-border pt-6 grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Calendar className="h-4 w-4 inline mr-1" />
                Joined
              </p>
              <p className="mt-1 text-sm">{formatDate(userInfo.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <LogIn className="h-4 w-4 inline mr-1" />
                Last Login
              </p>
              <p className="mt-1 text-sm">{formatDate(userInfo.lastLoginAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Eye className="h-4 w-4 inline mr-1" />
                Join Method
              </p>
              <p className="mt-1 text-sm capitalize">
                {userInfo.joinMethod === "sponsor" && userInfo.sponsorInfo
                  ? `Sponsor: ${userInfo.sponsorInfo.sponsorUsername}`
                  : userInfo.joinMethod}
              </p>
              {userInfo.joinMethod === "sponsor" && userInfo.sponsorInfo && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2"
                  onClick={() =>
                    navigate(
                      `/admin/user-detail/${userInfo.sponsorInfo.sponsorId}`,
                    )
                  }
                >
                  View Sponsor Profile →
                </Button>
              )}
            </div>
            {userInfo.dowVerifiedAt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <UserCheck className="h-4 w-4 inline mr-1" />
                  DoD Verified
                </p>
                <p className="mt-1 text-sm">
                  {formatDate(userInfo.dowVerifiedAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShoppingCart className="h-4 w-4 inline mr-1" />
              Items Sold
            </p>
            <p className="text-2xl font-bold mt-2">{user.soldCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShoppingCart className="h-4 w-4 inline mr-1" />
              Total Listings
            </p>
            <p className="text-2xl font-bold mt-2">{user.listings.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Star className="h-4 w-4 inline mr-1" />
              Rating
            </p>
            <p className="text-2xl font-bold mt-2">
              {user.avgRating ? `${user.avgRating} ⭐` : "N/A"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Strikes
            </p>
            <p className="text-2xl font-bold mt-2">{user.strikes.length}</p>
          </div>
        </div>

        {/* Account Notes */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Admin Notes
          </h3>
          {user.strikes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No admin notes on file
            </p>
          ) : (
            <div className="space-y-3">
              {user.strikes.map((note: any) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {note.reason || note.type}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {note.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        note.severity === "critical"
                          ? "bg-destructive/10 text-destructive"
                          : note.severity === "warning"
                            ? "bg-warning/10 text-warning"
                            : "bg-info/10 text-info"
                      }`}
                    >
                      {note.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Strikes */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Account Strikes
            </h3>
            <Dialog open={showStrikeModal} onOpenChange={setShowStrikeModal}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Strike
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Account Strike</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Strike Type</Label>
                    <Select
                      value={strikeForm.type}
                      onValueChange={(value) =>
                        setStrikeForm({ ...strikeForm, type: value })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="fraud">Fraud</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="inappropriate_content">
                          Inappropriate Content
                        </SelectItem>
                        <SelectItem value="policy_violation">
                          Policy Violation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Severity</Label>
                    <Select
                      value={strikeForm.severity}
                      onValueChange={(value) =>
                        setStrikeForm({ ...strikeForm, severity: value })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={strikeForm.description}
                      onChange={(e) =>
                        setStrikeForm({
                          ...strikeForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Details about the strike..."
                      className="rounded-xl"
                    />
                  </div>
                  <Button
                    onClick={handleAddStrike}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? "Adding..." : "Add Strike"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {user.strikes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No strikes</p>
          ) : (
            <div className="space-y-3">
              {user.strikes.map((strike: any) => (
                <div
                  key={strike.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          strike.severity === "critical"
                            ? "bg-destructive/10 text-destructive"
                            : strike.severity === "warning"
                              ? "bg-warning/10 text-warning"
                              : "bg-info/10 text-info"
                        }`}
                      >
                        {strike.reason || strike.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(strike.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{strike.description}</p>
                    {strike.expiresAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {formatDate(strike.expiresAt)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStrike(strike.id)}
                    className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Listings */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Listings ({user.listings.length})
          </h3>
          {user.listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listings</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {user.listings.map((listing: any) => (
                <div
                  key={listing.id}
                  className="p-3 rounded-lg border border-border bg-muted/50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(listing.createdAt)} •{" "}
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          listing.status === "active"
                            ? "bg-success/10 text-success"
                            : listing.status === "sold"
                              ? "bg-muted/70 text-muted-foreground"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {listing.status}
                      </span>
                    </p>
                  </div>
                  <p className="font-semibold">${listing.price}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ratings */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5" />
            Ratings ({user.ratings.length})
          </h3>
          {user.ratings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ratings</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {user.ratings.map((rating: any) => (
                <div
                  key={rating.id}
                  className="p-3 rounded-lg border border-border bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {"⭐".repeat(rating.score)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {rating.isFromSeller ? "As Seller" : "As Buyer"}
                        </span>
                      </div>
                      {rating.comment && (
                        <p className="text-sm mt-2">{rating.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(rating.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Login History */}
        <div className="grid grid-cols-2 gap-6">
          {/* Successful Logins */}
          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Successful Logins</h3>
            {user.successfulLogins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No login history</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {user.successfulLogins.map((login: any) => (
                  <div
                    key={login.id}
                    className="p-3 rounded-lg border border-border bg-success/5 text-xs"
                  >
                    <p className="font-semibold text-foreground">
                      {login.ipAddress}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {formatDate(login.loggedInAt)}
                    </p>
                    {login.userAgent && (
                      <p className="text-muted-foreground mt-1 break-all text-xs">
                        {login.userAgent.substring(0, 60)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Failed Logins */}
          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Failed Logins</h3>
            {user.failedLogins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No failed attempts
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {user.failedLogins.map((login: any) => (
                  <div
                    key={login.id}
                    className="p-3 rounded-lg border border-border bg-destructive/5 text-xs"
                  >
                    <p className="font-semibold text-foreground">
                      {login.ipAddress}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {formatDate(login.attemptedAt)}
                    </p>
                    {login.reason && (
                      <p className="text-destructive mt-1 text-xs">
                        {login.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* IP Addresses */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">IP Addresses Used</h3>
          {user.uniqueIps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No IPs tracked</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.uniqueIps.map((ip: string) => (
                <div
                  key={ip}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted border border-border"
                >
                  <span className="font-mono text-sm">{ip}</span>
                  <button
                    onClick={() => handleCopyToClipboard(ip, ip)}
                    className="hover:text-primary"
                  >
                    {copiedText === ip ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
