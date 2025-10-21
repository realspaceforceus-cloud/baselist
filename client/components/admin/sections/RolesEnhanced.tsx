import { useState, useEffect } from "react";
import { Search, Save } from "lucide-react";
import { toast } from "sonner";
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

interface UserWithRole {
  id: string;
  username: string;
  email: string;
  baseId: string;
  baseName: string;
  role: "member" | "moderator" | "admin";
  currentRole: "member" | "moderator" | "admin";
  createdAt: string;
}

interface RolesEnhancedProps {
  users?: UserWithRole[];
  onFetchUsers?: () => Promise<UserWithRole[]>;
  onUpdateUserRole?: (userId: string, newRole: "member" | "moderator" | "admin") => Promise<void>;
}

export const RolesEnhanced = ({
  users: initialUsers = [],
  onFetchUsers,
  onUpdateUserRole,
}: RolesEnhancedProps) => {
  const [users, setUsers] = useState<UserWithRole[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      if (!onFetchUsers) return;
      setIsLoading(true);
      try {
        const data = await onFetchUsers();
        setUsers(data);
      } catch (error) {
        toast.error("Failed to load users");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [onFetchUsers]);

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.baseName.toLowerCase().includes(query)
    );
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    setRoleChanges({
      ...roleChanges,
      [userId]: newRole,
    });
  };

  const handleSaveChanges = async () => {
    if (!onUpdateUserRole) return;
    
    const updates = Object.entries(roleChanges);
    if (updates.length === 0) {
      toast.error("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      for (const [userId, newRole] of updates) {
        await onUpdateUserRole(userId, newRole as "member" | "moderator" | "admin");
      }
      
      setUsers(
        users.map((user) =>
          roleChanges[user.id]
            ? { ...user, role: roleChanges[user.id] as typeof user.role }
            : user
        )
      );
      setRoleChanges({});
      setEditingUserId(null);
      toast.success("Roles updated successfully");
    } catch (error) {
      toast.error("Failed to update roles");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary/10 text-primary";
      case "moderator":
        return "bg-success/10 text-success";
      case "member":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="User Roles & Permissions"
        subtitle="Manage"
        accent="User roles"
      />

      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
        <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Search by username, email, or base..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center text-muted-foreground">
          Loading users...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-6 text-center text-muted-foreground">
          No users found
        </div>
      ) : (
        <>
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
                    Base
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    New Role
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const selectedRole = roleChanges[user.id] || user.role;
                  const hasChanges = roleChanges[user.id] !== undefined;

                  return (
                    <tr key={user.id} className={hasChanges ? "bg-warning/5" : "hover:bg-muted/20"}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.baseName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editingUserId === user.id || hasChanges ? (
                          <Select
                            value={selectedRole}
                            onValueChange={(val) =>
                              handleRoleChange(user.id, val)
                            }
                          >
                            <SelectTrigger className="rounded-lg w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="moderator">
                                Moderator
                              </SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            onClick={() => setEditingUserId(user.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Change
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground text-center">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(user.createdAt))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {Object.keys(roleChanges).length > 0 && (
            <div className="flex gap-3 rounded-3xl border border-warning/30 bg-warning/5 p-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning">
                  {Object.keys(roleChanges).length} role change
                  {Object.keys(roleChanges).length !== 1 ? "s" : ""} pending
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Review and save your changes below
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRoleChanges({});
                    setEditingUserId(null);
                  }}
                  className="rounded-xl"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="rounded-xl"
                >
                  <Save className="h-4 w-4 mr-2" aria-hidden />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
