import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Ban,
  Check,
  Gavel,
  Search,
  ShieldCheck,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface AdminUserRecord {
  id: string;
  username: string;
  email: string;
  role: "member" | "moderator" | "admin";
  status: "active" | "suspended" | "banned";
  baseId: string;
  createdAt: string;
  dowVerifiedAt?: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  joinMethod?: "email" | "code" | "sponsor";
}

interface UsersSectionProps {
  onUserUpdate?: (userId: string, updates: any) => Promise<void>;
  onAddStrike?: (
    userId: string,
    type: string,
    description: string,
  ) => Promise<void>;
  onFetchUsers?: (
    page: number,
    search: string,
  ) => Promise<{ users: AdminUserRecord[]; pagination: any }>;
}

export const UsersSection = ({
  onUserUpdate,
  onAddStrike,
  onFetchUsers,
}: UsersSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(
    null,
  );
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<AdminUserRecord>>(
    {},
  );
  const [strikeForm, setStrikeForm] = useState({ type: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users with pagination
  const loadUsers = useCallback(async () => {
    if (!onFetchUsers) return;

    setIsLoading(true);
    try {
      const result = await onFetchUsers(currentPage, searchQuery);
      setUsers(result.users);
      setPagination(result.pagination);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, onFetchUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleEditUser = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setEditFormData({
      role: user.role,
      status: user.status,
    });
    setIsEditingModal(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedUser || !onUserUpdate) return;

    setIsSubmitting(true);
    try {
      await onUserUpdate(selectedUser.id, editFormData);
      toast.success("User updated successfully");
      setIsEditingModal(false);
      await loadUsers();
    } catch (error) {
      toast.error("Failed to update user");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStrike = async () => {
    if (
      !selectedUser ||
      !onAddStrike ||
      !strikeForm.type ||
      !strikeForm.description
    ) {
      toast.error("Please fill in all strike fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddStrike(
        selectedUser.id,
        strikeForm.type,
        strikeForm.description,
      );
      toast.success("Strike recorded");
      setStrikeForm({ type: "", description: "" });
      await loadUsers();
    } catch (error) {
      toast.error("Failed to record strike");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const getJoinMethodLabel = (method?: string) => {
    switch (method) {
      case "code":
        return "Invitation code";
      case "sponsor":
        return "Sponsor verified";
      default:
        return "Email verification";
    }
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="User Controls"
        subtitle="Manage users"
        accent="25 per page"
      />

      {/* Search Bar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <label className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2 md:max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Search username, email, or base"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-success">
            <Check className="h-3 w-3" aria-hidden />
            Verified
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-warning">
            Active
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-destructive">
            <Ban className="h-3 w-3" aria-hidden />
            Suspended
          </span>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center text-muted-foreground">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-6 text-center text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Joined
                </th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {user.username}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
                        user.status === "active"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="rounded-full"
                    >
                      <Edit2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-4 shadow-soft">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages} ({pagination.total}{" "}
            total users)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(pagination.pages, currentPage + 1))
              }
              disabled={currentPage === pagination.pages}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditingModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Edit User: {selectedUser.username}
            </h2>

            <div className="space-y-4 mb-6">
              {/* User Info */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Email:</span>{" "}
                  {selectedUser.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Member since:
                  </span>{" "}
                  {formatDate(selectedUser.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Last active:
                  </span>{" "}
                  {formatDate(selectedUser.lastLoginAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Verified:</span>{" "}
                  {selectedUser.dowVerifiedAt
                    ? formatDate(selectedUser.dowVerifiedAt)
                    : "Not verified"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Joined via:
                  </span>{" "}
                  {getJoinMethodLabel(selectedUser.joinMethod)}
                </p>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Role
                </label>
                <Select
                  value={editFormData.role || ""}
                  onValueChange={(val) =>
                    setEditFormData({ ...editFormData, role: val as any })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Status
                </label>
                <Select
                  value={editFormData.status || ""}
                  onValueChange={(val) =>
                    setEditFormData({ ...editFormData, status: val as any })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Add Strike */}
              <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 space-y-3">
                <h3 className="font-semibold text-warning">Add Strike</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Reason
                  </label>
                  <Select
                    value={strikeForm.type}
                    onValueChange={(val) =>
                      setStrikeForm({ ...strikeForm, type: val })
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="fraud">Fraud</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="inappropriate_content">
                        Inappropriate content
                      </SelectItem>
                      <SelectItem value="policy_violation">
                        Policy violation
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Description
                  </label>
                  <Textarea
                    placeholder="Document the behavior and any references..."
                    value={strikeForm.description}
                    onChange={(e) =>
                      setStrikeForm({
                        ...strikeForm,
                        description: e.target.value,
                      })
                    }
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
                <Button
                  onClick={handleAddStrike}
                  disabled={
                    isSubmitting || !strikeForm.type || !strikeForm.description
                  }
                  className="w-full bg-warning text-warning-foreground rounded-xl"
                >
                  <Gavel className="h-4 w-4 mr-2" aria-hidden />
                  Record Strike
                </Button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditingModal(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
