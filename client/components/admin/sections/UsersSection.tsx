import { useState, useCallback, useEffect } from "react";
import { Ban, Edit2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { asArray } from "@/lib/api";

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

  // Modal state
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(
    null,
  );
  const [showModal, setShowModal] = useState<"edit" | "strike" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Strike form
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeDescription, setStrikeDescription] = useState("");

  // Load users
  const loadUsers = useCallback(async () => {
    if (!onFetchUsers) return;
    setIsLoading(true);
    try {
      const result = await onFetchUsers(currentPage, searchQuery);
      setUsers(asArray(result?.users) || []);
      setPagination(result?.pagination || null);
    } catch (error) {
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, onFetchUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Search handler
  const handleSearch = () => {
    setCurrentPage(1);
  };

  // Edit user
  const openEditModal = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
    setShowModal("edit");
  };

  const saveEdit = async () => {
    if (!selectedUser || !onUserUpdate) return;
    setIsSubmitting(true);
    try {
      await onUserUpdate(selectedUser.id, {
        role: editRole,
        status: editStatus,
      });
      toast.success("User updated");
      setShowModal(null);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add strike
  const openStrikeModal = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setStrikeReason("");
    setStrikeDescription("");
    setShowModal("strike");
  };

  const saveStrike = async () => {
    if (!selectedUser || !onAddStrike || !strikeReason || !strikeDescription) {
      toast.error("Fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddStrike(selectedUser.id, strikeReason, strikeDescription);
      toast.success("Strike recorded");
      setShowModal(null);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast.error("Failed to record strike");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick ban
  const quickBan = async (user: AdminUserRecord) => {
    if (!onUserUpdate) return;
    try {
      await onUserUpdate(user.id, { status: "banned" });
      toast.success(`${user.username} banned`);
      loadUsers();
    } catch (error) {
      toast.error("Failed to ban user");
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }).format(new Date(date));
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Users"
        subtitle="Manage"
        accent="25 per page"
      />

      {/* Search */}
      <div className="flex gap-2 rounded-3xl border border-border bg-card p-4">
        <Input
          placeholder="Search username, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSearch} variant="outline" className="rounded-xl">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : !users || users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Username</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
                        user.status === "active"
                          ? "bg-green-100 text-green-800"
                          : user.status === "suspended"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="h-8 w-8 p-0 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStrikeModal(user)}
                        className="h-8 w-8 p-0 rounded-lg text-warning hover:text-warning"
                        title="Add strike/warning"
                      >
                        ⚠
                      </Button>
                      {user.status !== "banned" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => quickBan(user)}
                          className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive"
                          title="Ban user"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-4">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages} ({pagination.total}{" "}
            total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(pagination.pages, currentPage + 1))
              }
              disabled={currentPage === pagination.pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal === "edit" && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">
              Edit {selectedUser.username}
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <Select value={editRole} onValueChange={setEditRole}>
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
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
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
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowModal(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={saveEdit}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Strike Modal */}
      {showModal === "strike" && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">
              Add Strike: {selectedUser.username}
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Reason</label>
                <Select value={strikeReason} onValueChange={setStrikeReason}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="inappropriate">
                      Inappropriate content
                    </SelectItem>
                    <SelectItem value="policy">Policy violation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea
                  placeholder="Describe the issue..."
                  value={strikeDescription}
                  onChange={(e) => setStrikeDescription(e.target.value)}
                  className="rounded-xl min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowModal(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={saveStrike}
                disabled={isSubmitting}
                className="rounded-xl bg-warning text-warning-foreground"
              >
                {isSubmitting ? "Saving..." : "Record Strike"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
