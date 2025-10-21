import { useState, useCallback, useEffect } from "react";
import { Trash2, Plus, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FailedLoginAttempt {
  id: string;
  identifier: string;
  ipAddress: string;
  userAgent?: string;
  attemptedAt: string;
  reason?: string;
}

interface IPBlacklistEntry {
  id: string;
  ipAddress: string;
  reason: string;
  addedBy: string;
  addedAt: string;
  notes?: string;
  active: boolean;
}

interface SecurityAuditSectionProps {
  onFetchFailedLogins?: (limit?: number) => Promise<FailedLoginAttempt[]>;
  onFetchIPBlacklist?: () => Promise<IPBlacklistEntry[]>;
  onAddIPToBlacklist?: (
    ipAddress: string,
    reason: string,
    notes?: string,
  ) => Promise<IPBlacklistEntry>;
  onRemoveIPFromBlacklist?: (entryId: string) => Promise<void>;
}

export const SecurityAuditSection = ({
  onFetchFailedLogins,
  onFetchIPBlacklist,
  onAddIPToBlacklist,
  onRemoveIPFromBlacklist,
}: SecurityAuditSectionProps) => {
  const [failedLogins, setFailedLogins] = useState<FailedLoginAttempt[]>([]);
  const [blacklistedIPs, setBlacklistedIPs] = useState<IPBlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddIPForm, setShowAddIPForm] = useState(false);
  const [ipFormData, setIPFormData] = useState({
    ipAddress: "",
    reason: "",
    notes: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (onFetchFailedLogins) {
        const logins = await onFetchFailedLogins(500);
        setFailedLogins(logins);
      }
      if (onFetchIPBlacklist) {
        const ips = await onFetchIPBlacklist();
        setBlacklistedIPs(ips);
      }
    } catch (error) {
      toast.error("Failed to load security data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [onFetchFailedLogins, onFetchIPBlacklist]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddIP = async () => {
    if (!ipFormData.ipAddress || !ipFormData.reason) {
      toast.error("IP address and reason are required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddIPToBlacklist) {
        await onAddIPToBlacklist(
          ipFormData.ipAddress,
          ipFormData.reason,
          ipFormData.notes || undefined,
        );
      }
      toast.success("IP added to blacklist");
      setIPFormData({ ipAddress: "", reason: "", notes: "" });
      setShowAddIPForm(false);
      await loadData();
    } catch (error) {
      toast.error("Failed to add IP");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveIP = async (entryId: string) => {
    if (!confirm("Remove this IP from blacklist?")) return;

    try {
      if (onRemoveIPFromBlacklist) {
        await onRemoveIPFromBlacklist(entryId);
      }
      toast.success("IP removed from blacklist");
      await loadData();
    } catch (error) {
      toast.error("Failed to remove IP");
      console.error(error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  // Group failed logins by IP
  const loginsByIP = failedLogins.reduce(
    (acc, login) => {
      if (!acc[login.ipAddress]) {
        acc[login.ipAddress] = [];
      }
      acc[login.ipAddress].push(login);
      return acc;
    },
    {} as Record<string, FailedLoginAttempt[]>,
  );

  if (isLoading) {
    return (
      <section className="space-y-4">
        <AdminSectionHeader
          title="Security & Audit"
          subtitle="Monitor threats"
          accent="Active"
        />
        <div className="rounded-3xl border border-border bg-card p-6 text-center text-muted-foreground">
          Loading security data...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Security & Audit"
        subtitle="Monitor and manage security"
        accent="Real-time"
      />

      <Tabs defaultValue="logins" className="space-y-4">
        <TabsList className="rounded-full bg-muted/60 p-1 grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="logins" className="rounded-full">
            Failed Logins ({failedLogins.length})
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="rounded-full">
            IP Blacklist ({blacklistedIPs.length})
          </TabsTrigger>
        </TabsList>

        {/* Failed Logins Tab */}
        <TabsContent value="logins" className="space-y-3">
          {Object.keys(loginsByIP).length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-background/50 p-6 text-center text-muted-foreground">
              No failed login attempts recorded
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(loginsByIP).map(([ip, logins]) => (
                <div
                  key={ip}
                  className="rounded-3xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm font-semibold text-foreground">
                          {ip}
                        </code>
                        <button
                          onClick={() => copyToClipboard(ip, `ip-${ip}`)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === `ip-${ip}` ? (
                            <CheckCircle className="h-3 w-3" aria-hidden />
                          ) : (
                            <Copy className="h-3 w-3" aria-hidden />
                          )}
                        </button>
                        <span className="inline-flex rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                          {logins.length} attempt
                          {logins.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Latest: {formatDate(logins[0]!.attemptedAt)}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setIPFormData({
                          ipAddress: ip,
                          reason: "Multiple failed login attempts",
                          notes: `${logins.length} failed attempts recorded`,
                        });
                        setShowAddIPForm(true);
                      }}
                      size="sm"
                      className="rounded-xl bg-warning text-warning-foreground"
                    >
                      Ban IP
                    </Button>
                  </div>

                  {/* Recent attempts */}
                  <div className="mt-3 max-h-[120px] overflow-y-auto space-y-1">
                    {logins.slice(0, 5).map((login) => (
                      <div
                        key={login.id}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-mono">{login.identifier}</span> -{" "}
                        {formatDate(login.attemptedAt)}
                      </div>
                    ))}
                    {logins.length > 5 && (
                      <div className="text-xs text-muted-foreground italic">
                        ... and {logins.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* IP Blacklist Tab */}
        <TabsContent value="blacklist" className="space-y-3">
          {showAddIPForm && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Add to Blacklist
              </h3>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    IP Address
                  </label>
                  <Input
                    type="text"
                    value={ipFormData.ipAddress}
                    onChange={(e) =>
                      setIPFormData({
                        ...ipFormData,
                        ipAddress: e.target.value,
                      })
                    }
                    placeholder="192.168.1.1"
                    className="rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Reason
                  </label>
                  <select
                    value={ipFormData.reason}
                    onChange={(e) =>
                      setIPFormData({ ...ipFormData, reason: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select a reason</option>
                    <option value="Brute force attacks">
                      Brute force attacks
                    </option>
                    <option value="Multiple failed logins">
                      Multiple failed logins
                    </option>
                    <option value="Suspicious activity">
                      Suspicious activity
                    </option>
                    <option value="Fraud attempt">Fraud attempt</option>
                    <option value="Spam">Spam</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Notes
                  </label>
                  <Textarea
                    value={ipFormData.notes}
                    onChange={(e) =>
                      setIPFormData({ ...ipFormData, notes: e.target.value })
                    }
                    placeholder="Additional context..."
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAddIPForm(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddIP}
                  disabled={
                    isSubmitting || !ipFormData.ipAddress || !ipFormData.reason
                  }
                  className="rounded-xl bg-warning text-warning-foreground"
                >
                  {isSubmitting ? "Adding..." : "Add to Blacklist"}
                </Button>
              </div>
            </div>
          )}

          {blacklistedIPs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-background/50 p-6 text-center text-muted-foreground">
              No IPs blacklisted
            </div>
          ) : (
            <div className="space-y-3">
              {blacklistedIPs.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-3xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm font-semibold text-destructive">
                          {entry.ipAddress}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              entry.ipAddress,
                              `blacklist-${entry.id}`,
                            )
                          }
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === `blacklist-${entry.id}` ? (
                            <CheckCircle className="h-3 w-3" aria-hidden />
                          ) : (
                            <Copy className="h-3 w-3" aria-hidden />
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground md:grid-cols-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {entry.reason}
                          </p>
                          <p>Reason</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {new Date(entry.addedAt).toLocaleDateString()}
                          </p>
                          <p>Added</p>
                        </div>
                        {entry.notes && (
                          <div>
                            <p className="font-medium text-foreground text-ellipsis overflow-hidden">
                              {entry.notes}
                            </p>
                            <p>Notes</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => handleRemoveIP(entry.id)}
                      className="text-destructive hover:bg-destructive/10 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showAddIPForm && (
            <Button
              onClick={() => setShowAddIPForm(true)}
              className="w-full rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden />
              Add IP to Blacklist
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};
