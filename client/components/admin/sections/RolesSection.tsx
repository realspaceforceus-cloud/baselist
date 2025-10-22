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
        setUsers(roleUsers);

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

  const handleEditRole = (user: RoleUser) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
    setEditingBaseId(user.baseId || "");
  };

  const handleSaveRole = async () => {
    if (!editingUserId) return;

    if (!editingBaseId) {
      toast.error("Base assignment is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.updateUser(editingUserId, {
        role: editingRole as any,
        baseId: editingBaseId,
      });
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === editingUserId
            ? { ...u, role: editingRole as any, baseId: editingBaseId }
            : u,
        ),
      );
      toast.success("Role and base updated");
      setEditingUserId(null);
      setEditingRole("");
      setEditingBaseId("");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
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
                      <Select
                        value={editingBaseId}
                        onValueChange={setEditingBaseId}
                      >
                        <SelectTrigger className="w-40 rounded-xl">
                          <SelectValue placeholder="Select base" />
                        </SelectTrigger>
                        <SelectContent>
                          {bases.map((base) => (
                            <SelectItem key={base.id} value={base.id}>
                              {base.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        {bases.find((b) => b.id === user.baseId)?.name ||
                          user.baseId ||
                          "—"}
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
