import { useState, useCallback, useEffect } from "react";
import { Copy, Trash2, Plus, Check, Edit2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/adminApi";

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

interface InvitationCode {
  id: string;
  code: string;
  baseId: string;
  maxUses?: number;
  usesCount: number;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
  description?: string;
}

interface InvitationCodesSectionProps {
  bases?: Array<{ id: string; name: string }>;
  onFetchCodes?: (baseId?: string) => Promise<InvitationCode[]>;
  onCreateCode?: (
    code: string,
    baseId: string,
    maxUses?: number,
    expiresAt?: string,
    description?: string,
  ) => Promise<InvitationCode>;
  onUpdateCode?: (
    codeId: string,
    updates: {
      code?: string;
      maxUses?: number;
      expiresAt?: string;
      description?: string;
      active?: boolean;
    },
  ) => Promise<InvitationCode>;
  onDeleteCode?: (codeId: string) => Promise<void>;
}

export const InvitationCodesSection = ({
  bases = [],
  onFetchCodes,
  onCreateCode,
  onUpdateCode,
  onDeleteCode,
}: InvitationCodesSectionProps) => {
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    maxUses: "",
    expiresAt: "",
    description: "",
  });
  const [editFormData, setEditFormData] = useState({
    code: "",
    maxUses: "",
    expiresAt: "",
    description: "",
    active: true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    if (!onFetchCodes) return;

    setIsLoading(true);
    try {
      const result = await onFetchCodes(
        selectedBase !== "all" ? selectedBase : undefined,
      );
      setCodes(result);
    } catch (error) {
      toast.error("Failed to load invitation codes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBase, onFetchCodes]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  const generateCode = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setFormData({ ...formData, code });
  };

  const handleCreateCode = async () => {
    if (!formData.code || !selectedBase) {
      toast.error("Code and base are required");
      return;
    }

    setIsCreating(true);
    try {
      if (onCreateCode) {
        await onCreateCode(
          formData.code,
          selectedBase,
          formData.maxUses ? parseInt(formData.maxUses) : undefined,
          formData.expiresAt || undefined,
          formData.description || undefined,
        );
      } else {
        await adminApi.createInvitationCode(
          formData.code,
          selectedBase,
          formData.maxUses ? parseInt(formData.maxUses) : undefined,
          formData.expiresAt || undefined,
          formData.description || undefined,
        );
      }
      toast.success("Invitation code created");
      setFormData({ code: "", maxUses: "", expiresAt: "", description: "" });
      setShowCreateForm(false);
      await loadCodes();
    } catch (error) {
      toast.error("Failed to create code");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditCode = (code: InvitationCode) => {
    setEditingId(code.id);
    setEditFormData({
      code: code.code,
      maxUses: code.maxUses?.toString() || "",
      expiresAt: code.expiresAt?.split("T")[0] || "",
      description: code.description || "",
      active: code.active,
    });
  };

  const handleUpdateCode = async () => {
    if (!editingId || !editFormData.code) {
      toast.error("Code is required");
      return;
    }

    setIsUpdating(true);
    try {
      const updateFn = onUpdateCode || adminApi.updateInvitationCode;
      await updateFn(editingId, {
        code: editFormData.code,
        maxUses: editFormData.maxUses ? parseInt(editFormData.maxUses) : undefined,
        expiresAt: editFormData.expiresAt || undefined,
        description: editFormData.description || undefined,
        active: editFormData.active,
      });
      toast.success("Code updated");
      setEditingId(null);
      await loadCodes();
    } catch (error) {
      toast.error("Failed to update code");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to delete this code?")) return;

    try {
      const deleteFn = onDeleteCode || adminApi.deleteInvitationCode;
      await deleteFn(codeId);
      toast.success("Code deleted");
      await loadCodes();
    } catch (error) {
      toast.error("Failed to delete code");
      console.error(error);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const isCodeValid = (code: InvitationCode) => {
    if (!code.active) return false;
    if (code.maxUses && code.usesCount >= code.maxUses) return false;
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return false;
    return true;
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Invitation Codes"
        subtitle="Create and manage join codes"
        accent="Unlimited uses"
      />

      {/* Base Filter */}
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <Select value={selectedBase} onValueChange={setSelectedBase}>
          <SelectTrigger className="md:max-w-xs rounded-xl">
            <SelectValue placeholder="Filter by base..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bases</SelectItem>
            {bases.map((base) => (
              <SelectItem key={base.id} value={base.id}>
                {base.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" aria-hidden />
          Create Code
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Create New Code
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="INVITE123"
                  className="rounded-xl font-mono"
                  maxLength={16}
                />
                <Button
                  onClick={generateCode}
                  variant="outline"
                  className="rounded-xl"
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Max Uses
              </label>
              <Input
                type="number"
                value={formData.maxUses}
                onChange={(e) =>
                  setFormData({ ...formData, maxUses: e.target.value })
                }
                placeholder="Leave empty for unlimited"
                className="rounded-xl"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Expires At
              </label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g., Sponsors program"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCode}
              disabled={isCreating || !formData.code || !selectedBase}
              className="rounded-xl"
            >
              {isCreating ? "Creating..." : "Create Code"}
            </Button>
          </div>
        </div>
      )}

      {/* Codes List */}
      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center text-muted-foreground">
          Loading codes...
        </div>
      ) : !Array.isArray(codes) || codes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-6 text-center text-muted-foreground">
          No invitation codes created yet
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => {
            const isValid = isCodeValid(code);
            const baseName =
              bases.find((b) => b.id === code.baseId)?.name || code.baseId;

            return (
              <div
                key={code.id}
                className="rounded-3xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold text-primary">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(code.code, code.id)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === code.id ? (
                          <>
                            <Check className="h-3 w-3" aria-hidden />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" aria-hidden />
                            Copy
                          </>
                        )}
                      </button>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          isValid
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isValid ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground md:grid-cols-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {baseName}
                        </p>
                        <p>Base</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {code.maxUses
                            ? `${code.usesCount}/${code.maxUses}`
                            : "Unlimited"}
                        </p>
                        <p>Uses</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {formatDate(code.expiresAt)}
                        </p>
                        <p>Expires</p>
                      </div>
                      {code.description && (
                        <div>
                          <p className="font-medium text-foreground">
                            {code.description}
                          </p>
                          <p>Note</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleEditCode(code)}
                      className="text-primary hover:bg-primary/10 rounded-xl"
                      disabled={editingId === code.id}
                    >
                      <Edit2 className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteCode(code.id)}
                      className="text-destructive hover:bg-destructive/10 rounded-xl"
                      disabled={editingId === code.id}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Edit Code
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Code
              </label>
              <Input
                value={editFormData.code}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="INVITE123"
                className="rounded-xl font-mono"
                maxLength={16}
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Max Uses
              </label>
              <Input
                type="number"
                value={editFormData.maxUses}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, maxUses: e.target.value })
                }
                placeholder="Leave empty for unlimited"
                className="rounded-xl"
                min="1"
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Expires At
              </label>
              <Input
                type="date"
                value={editFormData.expiresAt}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    expiresAt: e.target.value,
                  })
                }
                className="rounded-xl"
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Input
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                placeholder="e.g., Sponsors program"
                className="rounded-xl"
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={editFormData.active}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      active: e.target.checked,
                    })
                  }
                  disabled={isUpdating}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditingId(null)}
              className="rounded-xl"
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCode}
              disabled={isUpdating || !editFormData.code}
              className="rounded-xl"
            >
              <Save className="h-4 w-4 mr-2" />
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
