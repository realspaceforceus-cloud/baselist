import { useEffect, useState } from "react";
import { Check, Clock, MessageSquare, Trash2, X } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SponsorRequest {
  id: string;
  familyMemberId: string;
  username: string;
  email: string;
  avatarUrl?: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
  expiresAt: string;
}

interface ActiveFamily {
  id: string;
  familyMemberId: string;
  username: string;
  email: string;
  avatarUrl?: string;
  linkedAt: string;
}

interface Cooldown {
  until: string;
}

interface SponsorDashboard {
  requests: SponsorRequest[];
  activeFamily: ActiveFamily | null;
  cooldown: Cooldown | null;
}

export const FamilyVerificationSection = ({
  userId,
}: {
  userId?: string;
}): JSX.Element => {
  const [dashboard, setDashboard] = useState<SponsorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [denialReason, setDenialReason] = useState<string | null>(null);
  const [denialRequestId, setDenialRequestId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      try {
        const response = await fetch(
          `/.netlify/functions/sponsor/requests?sponsorId=${userId}`,
        );

        if (!response.ok) {
          console.error("Failed to fetch sponsor dashboard");
          return;
        }

        const data: SponsorDashboard = await response.json();
        setDashboard(data);
      } catch (error) {
        console.error("Error fetching sponsor dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [userId]);

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);

    try {
      const response = await fetch(
        "/.netlify/functions/sponsor/approve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId }),
        },
      );

      if (response.ok && dashboard) {
        setDashboard({
          ...dashboard,
          requests: dashboard.requests.map((r) =>
            r.id === requestId ? { ...r, status: "approved" } : r,
          ),
        });
      }
    } catch (error) {
      console.error("Error approving request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (requestId: string, reason?: string) => {
    setActionLoading(requestId);

    try {
      const response = await fetch(
        "/.netlify/functions/sponsor/deny",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, reason }),
        },
      );

      if (response.ok && dashboard) {
        setDashboard({
          ...dashboard,
          requests: dashboard.requests.map((r) =>
            r.id === requestId ? { ...r, status: "denied" } : r,
          ),
        });
        setDenialRequestId(null);
        setDenialReason(null);
      }
    } catch (error) {
      console.error("Error denying request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!dashboard?.activeFamily) return;

    if (
      !confirm(
        "Are you sure you want to revoke this family member link? They will immediately lose verified status.",
      )
    ) {
      return;
    }

    setActionLoading("revoke");

    try {
      const response = await fetch(
        "/.netlify/functions/sponsor/revoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkId: dashboard.activeFamily.id }),
        },
      );

      if (response.ok) {
        setDashboard({
          ...dashboard,
          activeFamily: null,
        });
      }
    } catch (error) {
      console.error("Error revoking link:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests = dashboard?.requests.filter(
    (r) => r.status === "pending",
  ) ?? [];
  const processedRequests = dashboard?.requests.filter(
    (r) => r.status !== "pending",
  ) ?? [];

  if (loading) {
    return (
      <section className="space-y-4">
        <AdminSectionHeader
          title="Family Verification"
          subtitle="Sponsor Approval System"
          accent="Verification"
        />
        <div className="rounded-3xl border border-dashed border-border bg-card/80 p-6 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="space-y-4">
        <AdminSectionHeader
          title="Family Verification"
          subtitle="Sponsor Approval System"
          accent="Verification"
        />
        <div className="rounded-3xl border border-dashed border-border bg-card/80 p-6 text-center text-sm text-muted-foreground">
          Not authenticated. Sign in to view your sponsor dashboard.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <AdminSectionHeader
        title="Family Verification"
        subtitle="Sponsor Approval System"
        accent="Verification"
      />

      {/* Active Family Member */}
      {dashboard?.activeFamily ? (
        <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
                <Check className="h-5 w-5" aria-hidden />
                Active Family Member
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                {dashboard.activeFamily.username} ({dashboard.activeFamily.email})
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Linked on{" "}
                {new Date(dashboard.activeFamily.linkedAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevoke}
              disabled={actionLoading === "revoke"}
              className="self-start"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Revoke
            </Button>
          </div>
        </div>
      ) : null}

      {/* Cooldown Status */}
      {dashboard?.cooldown ? (
        <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                Cooldown Period Active
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                You can approve a new family member on{" "}
                {new Date(dashboard.cooldown.until).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Pending Requests */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">
          Pending Approval Requests ({pendingRequests.length})
        </h3>
        {pendingRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/80 p-6 text-center text-sm text-muted-foreground">
            No pending approval requests
          </div>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-foreground">
                      {request.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested{" "}
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {denialRequestId === request.id ? (
                  <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                      <span className="text-foreground">
                        Reason for denial (optional)
                      </span>
                      <textarea
                        className="min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none"
                        value={denialReason || ""}
                        onChange={(e) => setDenialReason(e.target.value)}
                        placeholder="Explain why you're denying this request..."
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDenialRequestId(null);
                          setDenialReason(null);
                        }}
                        disabled={actionLoading === request.id}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleDeny(request.id, denialReason || undefined)
                        }
                        disabled={actionLoading === request.id}
                      >
                        Confirm Denial
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={
                        actionLoading !== null ||
                        dashboard?.cooldown !== null ||
                        dashboard?.activeFamily !== null
                      }
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDenialRequestId(request.id)}
                      disabled={actionLoading !== null}
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Deny
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed Requests */}
      {processedRequests.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">History</h3>
          <div className="space-y-2">
            {processedRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card/50 p-3 opacity-75"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {request.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.email}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      request.status === "approved"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                    }`}
                  >
                    {request.status === "approved" ? "Approved" : "Denied"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
