import { useState, useEffect } from "react";
import { Building2, AlertCircle, Edit2, Plus } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AdminBaseRow {
  id: string;
  name: string;
  region: string;
  moderator: string | null;
  users: number;
  activeListings: number;
  pendingReports: number;
}

export const BasesSection = () => {
  const [bases, setBases] = useState<AdminBaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBase, setEditingBase] = useState<AdminBaseRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    region: "",
    timezone: "",
  });

  const loadBases = async () => {
    setIsLoading(true);
    try {
      const result = await (
        await import("@/lib/adminApi")
      ).adminApi.getBases();
      const baseRows: AdminBaseRow[] = (result?.bases || []).map(
        (base: any) => ({
          id: base.id,
          name: base.name || "Unknown",
          region: base.region || "Unknown",
          moderator: base.moderator || "—",
          users: base.usersCount || 0,
          activeListings: base.listingsCount || 0,
          pendingReports: base.reportsCount || 0,
        }),
      );
      setBases(baseRows);
    } catch (error) {
      console.error("Failed to load bases:", error);
      toast.error("Failed to load bases");
      setBases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBases();
  }, []);

  const handleEditBase = (base: AdminBaseRow) => {
    setEditingBase(base);
    setFormData({
      name: base.name,
      abbreviation: "",
      region: base.region,
      timezone: "",
    });
    setIsDialogOpen(true);
  };

  const handleAddBase = () => {
    setEditingBase(null);
    setFormData({
      name: "",
      abbreviation: "",
      region: "",
      timezone: "",
    });
    setIsDialogOpen(true);
  };

  const handleSaveBase = async () => {
    if (!formData.name || !formData.abbreviation || !formData.region || !formData.timezone) {
      toast.error("All fields are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const adminApi = (await import("@/lib/adminApi")).adminApi;

      if (editingBase) {
        await adminApi.updateBase(editingBase.id, {
          name: formData.name,
          abbreviation: formData.abbreviation,
          region: formData.region,
          timezone: formData.timezone,
        });
        toast.success("Base updated successfully");
      } else {
        const baseId = formData.abbreviation.toUpperCase();
        await adminApi.createBase({
          id: baseId,
          name: formData.name,
          abbreviation: formData.abbreviation,
          region: formData.region,
          timezone: formData.timezone,
          latitude: 0,
          longitude: 0,
        });
        toast.success("Base created successfully");
      }

      setIsDialogOpen(false);
      await loadBases();
    } catch (error) {
      console.error("Failed to save base:", error);
      toast.error("Failed to save base");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <AdminSectionHeader
          title="Bases"
          subtitle="Manage"
          accent={`${bases.length} total`}
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddBase} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Base
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingBase ? "Edit Base" : "Add New Base"}
              </DialogTitle>
              <DialogDescription>
                {editingBase
                  ? "Update the base information"
                  : "Create a new military base"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Base Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Vance Air Force Base"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="abbreviation">Abbreviation</Label>
                <Input
                  id="abbreviation"
                  value={formData.abbreviation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      abbreviation: e.target.value,
                    })
                  }
                  placeholder="e.g., AFB"
                  disabled={!!editingBase}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  placeholder="e.g., Oklahoma"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  placeholder="e.g., America/Chicago"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveBase} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : bases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No bases found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Base</th>
                <th className="px-4 py-3 text-left font-semibold">Region</th>
                <th className="px-4 py-3 text-left font-semibold">Moderator</th>
                <th className="px-4 py-3 text-center font-semibold">Users</th>
                <th className="px-4 py-3 text-center font-semibold">
                  Listings
                </th>
                <th className="px-4 py-3 text-center font-semibold">Reports</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bases.map((base) => (
                <tr key={base.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {base.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {base.region}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {base.moderator || "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {base.users}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {base.activeListings}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {base.pendingReports > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                        <AlertCircle className="h-3 w-3" />
                        {base.pendingReports}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBase(base)}
                      className="h-8 w-8 p-0 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
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
