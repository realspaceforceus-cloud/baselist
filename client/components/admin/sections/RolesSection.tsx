import { useState, useEffect } from "react";
import { Edit2, X, Check } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { adminApi } from "@/lib/adminApi";

export interface AdminRole {
  name: string;
  scope: "Global" | "Base";
  permissions: string[];
  icon?: any;
  toneClass?: string;
}

interface RoleUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "moderator" | "member";
  baseId: string;
  baseIds?: string[];
  createdAt: string;
}

interface BaseOption {
  id: string;
  name: string;
}

export const RolesSection = (): JSX.Element => {
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [bases, setBases] = useState<BaseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");
  const [editingBaseIds, setEditingBaseIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [usersResult, basesResult] = await Promise.all([
          adminApi.getUsers(1, ""),
          adminApi.getBases(),
        ]);

        const roleUsers = (usersResult?.users || [])
          .filter((u: any) => u.role === "admin" || u.role === "moderator")
          .map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            baseId: u.baseId,
            createdAt: u.createdAt,
          }));

        // Load moderator bases for display
        const usersWithBases = await Promise.all(
          roleUsers.map(async (user) => {
            if (user.role === "moderator") {
              try {
                const baseIds = await adminApi.getModeratorBases(user.id);
                return { ...user, baseIds };
              } catch (error) {
                console.error(
                  `Failed to load bases for moderator ${user.id}:`,
                  error,
                );
                return user;
              }
            }
            return user;
          }),
        );

        setUsers(usersWithBases);

        const baseOptions = (basesResult?.bases || []).map((b: any) => ({
          id: b.id,
          name: b.name,
        }));
        setBases(baseOptions);
      } catch (error) {
        console.error("Failed to load data:", error);
        toast.error("Failed to load users and bases");
        setUsers([]);
        setBases([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleEditRole = async (user: RoleUser) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);

    if (user.role === "moderator") {
      try {
        const baseIds = await adminApi.getModeratorBases(user.id);
        setEditingBaseIds(baseIds);
      } catch (error) {
        console.error("Failed to load moderator bases:", error);
        setEditingBaseIds([]);
      }
    } else {
      setEditingBaseIds([]);
    }
  };

  const handleSaveRole = async () => {
    if (!editingUserId) return;

    // Admins don't need base assignment (they have access to all)
    // Moderators must have at least one base
    if (editingRole === "moderator" && editingBaseIds.length === 0) {
      toast.error("Moderators must have at least one base assigned");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatePayload: any = {
        role: editingRole as any,
      };

      if (editingRole === "moderator") {
        updatePayload.baseIds = editingBaseIds;
      }

      await adminApi.updateUser(editingUserId, updatePayload);
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                role: editingRole as any,
                ...(editingRole === "moderator" && { baseIds: editingBaseIds }),
              }
            : u,
        ),
      );
      toast.success("Role and base assignments updated");
      setEditingUserId(null);
      setEditingRole("");
      setEditingBaseIds([]);
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBaseSelection = (baseId: string) => {
    setEditingBaseIds((prev) =>
      prev.includes(baseId)
        ? prev.filter((id) => id !== baseId)
        : [...prev, baseId],
    );
  };

  const roleUserCount = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const moderatorCount = users.filter((u) => u.role === "moderator").length;

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Elevated Roles"
        subtitle="Admin & Moderators"
        accent={`${roleUserCount} assigned`}
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Users</div>
          <div className="text-2xl font-bold">{roleUserCount}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Admins</div>
          <div className="text-2xl font-bold text-primary">{adminCount}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Moderators</div>
          <div className="text-2xl font-bold text-success">
            {moderatorCount}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No users with elevated roles found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Username</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Current Role
                </th>
                <th className="px-4 py-3 text-left font-semibold">Base</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <Select
                        value={editingRole}
                        onValueChange={setEditingRole}
                      >
                        <SelectTrigger className="w-32 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 capitalize">
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {editingUserId === user.id ? (
                      <>
                        {editingRole === "admin" ? (
                          <span className="text-xs font-medium text-success">
                            All Bases
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground mb-2">
                              Select bases for this moderator:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {bases.map((base) => (
                                <button
                                  key={base.id}
                                  onClick={() => toggleBaseSelection(base.id)}
                                  disabled={isSubmitting}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    editingBaseIds.includes(base.id)
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {editingBaseIds.includes(base.id) && (
                                    <Check className="h-3 w-3 inline mr-1" />
                                  )}
                                  {base.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {user.role === "admin" ? (
                          <span className="text-xs font-medium text-success">
                            All Bases
                          </span>
                        ) : user.role === "moderator" ? (
                          <div className="flex flex-wrap gap-1">
                            {user.baseIds && user.baseIds.length > 0 ? (
                              user.baseIds.map((baseId) => {
                                const baseName = bases.find(
                                  (b) => b.id === baseId,
                                )?.name;
                                return (
                                  <span
                                    key={baseId}
                                    className="inline-flex rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                                  >
                                    {baseName || baseId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            {bases.find((b) => b.id === user.baseId)?.name ||
                              user.baseId ||
                              "—"}
                          </>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingUserId === user.id ? (
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveRole}
                          disabled={isSubmitting}
                          className="h-8 rounded-lg text-success"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUserId(null)}
                          disabled={isSubmitting}
                          className="h-8 rounded-lg"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRole(user)}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
