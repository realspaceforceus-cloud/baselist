import { useState, useEffect } from "react";
import {
  Building2,
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { useBaseList } from "@/context/BaseListContext";
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

// Mapping of regions to timezones
const REGION_TIMEZONE_MAP: Record<string, string> = {
  // US States
  Alabama: "America/Chicago",
  Alaska: "America/Anchorage",
  Arizona: "America/Phoenix",
  Arkansas: "America/Chicago",
  California: "America/Los_Angeles",
  Colorado: "America/Denver",
  Connecticut: "America/New_York",
  Delaware: "America/New_York",
  Florida: "America/New_York",
  Georgia: "America/New_York",
  Hawaii: "Pacific/Honolulu",
  Idaho: "America/Boise",
  Illinois: "America/Chicago",
  Indiana: "America/Indiana/Indianapolis",
  Iowa: "America/Chicago",
  Kansas: "America/Chicago",
  Kentucky: "America/Kentucky/Louisville",
  Louisiana: "America/Chicago",
  Maine: "America/New_York",
  Maryland: "America/New_York",
  Massachusetts: "America/New_York",
  Michigan: "America/Detroit",
  Minnesota: "America/Chicago",
  Mississippi: "America/Chicago",
  Missouri: "America/Chicago",
  Montana: "America/Denver",
  Nebraska: "America/Chicago",
  Nevada: "America/Los_Angeles",
  "New Hampshire": "America/New_York",
  "New Jersey": "America/New_York",
  "New Mexico": "America/Denver",
  "New York": "America/New_York",
  "North Carolina": "America/New_York",
  "North Dakota": "America/Chicago",
  Ohio: "America/New_York",
  Oklahoma: "America/Chicago",
  Oregon: "America/Los_Angeles",
  Pennsylvania: "America/New_York",
  "Rhode Island": "America/New_York",
  "South Carolina": "America/New_York",
  "South Dakota": "America/Chicago",
  Tennessee: "America/Chicago",
  Texas: "America/Chicago",
  Utah: "America/Denver",
  Vermont: "America/New_York",
  Virginia: "America/New_York",
  Washington: "America/Los_Angeles",
  "West Virginia": "America/New_York",
  Wisconsin: "America/Chicago",
  Wyoming: "America/Denver",
  // International Regions
  Germany: "Europe/Berlin",
  "United Kingdom": "Europe/London",
  Italy: "Europe/Rome",
  Spain: "Europe/Madrid",
  France: "Europe/Paris",
  Japan: "Asia/Tokyo",
  "South Korea": "Asia/Seoul",
  Qatar: "Asia/Qatar",
  "United Arab Emirates": "Asia/Dubai",
  Turkey: "Europe/Istanbul",
  "Saudi Arabia": "Asia/Riyadh",
  Kuwait: "Asia/Kuwait",
  Bahrain: "Asia/Bahrain",
  Oman: "Asia/Muscat",
  Jordan: "Asia/Amman",
  Iraq: "Asia/Baghdad",
  Afghanistan: "Asia/Kabul",
  India: "Asia/Kolkata",
  Philippines: "Asia/Manila",
  Thailand: "Asia/Bangkok",
  Singapore: "Asia/Singapore",
  Australia: "Australia/Sydney",
  Guam: "Pacific/Guam",
  "Puerto Rico": "America/Puerto_Rico",
  "Diego Garcia": "Indian/Chagos",
};

function getTimezoneForRegion(region: string): string {
  // Try exact match first
  if (REGION_TIMEZONE_MAP[region]) {
    return REGION_TIMEZONE_MAP[region];
  }

  // Try case-insensitive match
  const lowerRegion = region.toLowerCase();
  for (const [key, tz] of Object.entries(REGION_TIMEZONE_MAP)) {
    if (key.toLowerCase() === lowerRegion) {
      return tz;
    }
  }

  // Default to America/New_York if not found
  return "America/New_York";
}

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
  const { refreshBases: refreshBasesContext } = useBaseList();
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
      const result = await (await import("@/lib/adminApi")).adminApi.getBases();
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
      abbreviation: base.id, // Show the abbreviation from base ID
      region: base.region,
      timezone: "", // Will need to fetch actual timezone from API
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

  const handleRegionChange = (region: string) => {
    setFormData({
      ...formData,
      region,
      // Auto-default timezone based on region if it's new
      timezone: !editingBase ? getTimezoneForRegion(region) : formData.timezone,
    });
  };

  const handleSaveBase = async () => {
    if (!formData.name || !formData.abbreviation || !formData.region) {
      toast.error("Name, abbreviation, and region are required");
      return;
    }

    // Auto-set timezone if empty
    let timezone = formData.timezone;
    if (!timezone) {
      timezone = getTimezoneForRegion(formData.region);
    }

    setIsSubmitting(true);
    try {
      const adminApi = (await import("@/lib/adminApi")).adminApi;

      if (editingBase) {
        await adminApi.updateBase(editingBase.id, {
          name: formData.name,
          abbreviation: formData.abbreviation,
          region: formData.region,
          timezone,
        });
        toast.success("Base updated successfully");
      } else {
        const baseId = formData.abbreviation.toUpperCase();
        await adminApi.createBase({
          id: baseId,
          name: formData.name,
          abbreviation: formData.abbreviation,
          region: formData.region,
          timezone,
          latitude: 0,
          longitude: 0,
        });
        toast.success("Base created successfully");
        // Refresh bases in the global context so new base appears in selector
        await refreshBasesContext();
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

  const handleDeleteBase = async (baseId: string, baseName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${baseName}"? This action moves the base to deleted bases and can be revived later.`,
      )
    ) {
      return;
    }

    try {
      const adminApi = (await import("@/lib/adminApi")).adminApi;
      await adminApi.deleteBase(baseId);
      toast.success("Base deleted successfully");
      await loadBases();
    } catch (error) {
      console.error("Failed to delete base:", error);
      toast.error("Failed to delete base");
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  placeholder="e.g., Oklahoma or Germany"
                  list="regions"
                />
                <datalist id="regions">
                  {Object.keys(REGION_TIMEZONE_MAP).map((region) => (
                    <option key={region} value={region} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  placeholder="e.g., America/Chicago (auto-filled from region)"
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
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBase(base)}
                        className="h-8 w-8 p-0 rounded-lg"
                        title="Edit base"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBase(base.id, base.name)}
                        className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                        title="Delete base"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
