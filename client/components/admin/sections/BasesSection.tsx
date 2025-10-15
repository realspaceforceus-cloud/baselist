import { FormEvent, useState } from "react";
import { Building2, MapPin, Pencil, Plus, Users } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface AdminBaseRow {
  id: string;
  name: string;
  region: string;
  moderator: string;
  users: number;
  activeListings: number;
  pendingReports: number;
}

interface BasesSectionProps {
  bases: AdminBaseRow[];
  onAddBase: (base: { name: string; region: string; timezone: string }) => void;
  onEditBase: (baseId: string, updates: { name?: string; region?: string; timezone?: string }) => void;
  onArchiveBase: (baseId: string) => void;
  onAssignModerator: (baseId: string, moderator: string) => void;
  onViewStats: (baseId: string) => void;
}

export const BasesSection = ({
  bases,
  onAddBase,
  onEditBase,
  onArchiveBase,
  onAssignModerator,
  onViewStats,
}: BasesSectionProps): JSX.Element => {
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{ name: string; region: string; timezone: string }>(
    () => ({ name: "", region: "", timezone: "CT" }),
  );
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; region: string; timezone: string }>(() => ({
    name: "",
    region: "",
    timezone: "",
  }));
  const [moderatorBaseId, setModeratorBaseId] = useState<string | null>(null);
  const [moderatorDrafts, setModeratorDrafts] = useState<Record<string, string>>({});

  const toggleCreateForm = () => {
    setIsCreateOpen((prev) => !prev);
  };

  const resetCreateForm = () => {
    setCreateForm({ name: "", region: "", timezone: "CT" });
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = createForm.name.trim();
    const trimmedRegion = createForm.region.trim();
    const trimmedTimezone = createForm.timezone.trim() || "CT";
    if (!trimmedName || !trimmedRegion) {
      return;
    }
    onAddBase({ name: trimmedName, region: trimmedRegion, timezone: trimmedTimezone.toUpperCase() });
    resetCreateForm();
    setIsCreateOpen(false);
  };

  const openEditForm = (base: AdminBaseRow) => {
    setEditingBaseId(base.id);
    setEditForm({ name: base.name, region: base.region, timezone: "" });
  };

  const cancelEditForm = () => {
    setEditingBaseId(null);
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>, base: AdminBaseRow) => {
    event.preventDefault();
    const updates: { name?: string; region?: string; timezone?: string } = {};
    const trimmedName = editForm.name.trim();
    const trimmedRegion = editForm.region.trim();
    const trimmedTimezone = editForm.timezone.trim();

    if (trimmedName && trimmedName !== base.name) {
      updates.name = trimmedName;
    }
    if (trimmedRegion && trimmedRegion !== base.region) {
      updates.region = trimmedRegion;
    }
    if (trimmedTimezone) {
      updates.timezone = trimmedTimezone.toUpperCase();
    }

    if (Object.keys(updates).length === 0) {
      setEditingBaseId(null);
      return;
    }

    onEditBase(base.id, updates);
    setEditingBaseId(null);
  };

  const openModeratorForm = (base: AdminBaseRow) => {
    setModeratorBaseId(base.id);
    setModeratorDrafts((prev) => ({ ...prev, [base.id]: base.moderator === "Unassigned" ? "" : base.moderator }));
  };

  const cancelModeratorForm = () => {
    setModeratorBaseId(null);
  };

  const handleModeratorSubmit = (event: FormEvent<HTMLFormElement>, baseId: string) => {
    event.preventDefault();
    const draft = moderatorDrafts[baseId]?.trim();
    if (!draft) {
      return;
    }
    onAssignModerator(baseId, draft);
    setModeratorBaseId(null);
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Base Management" subtitle="Bases" accent="Hubs" />
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card"
          onClick={toggleCreateForm}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {isCreateOpen ? "Close form" : "Add base"}
        </button>
      </div>
      {isCreateOpen ? (
        <form
          className="space-y-3 rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-4"
          onSubmit={handleCreateSubmit}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span className="text-foreground">Base name</span>
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Joint Base Lewis-McChord"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span className="text-foreground">Region</span>
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                value={createForm.region}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, region: event.target.value }))}
                placeholder="Pacific Northwest"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span className="text-foreground">Timezone</span>
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                value={createForm.timezone}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, timezone: event.target.value }))}
                placeholder="PT"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button type="button" className="rounded-full border border-border px-4 py-2" onClick={() => {
              resetCreateForm();
              setIsCreateOpen(false);
            }}>
              Cancel
            </button>
            <button type="submit" className="rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card">
              Save base
            </button>
          </div>
        </form>
      ) : null}
      <div className="space-y-3">
        {bases.map((base) => (
          <article
            key={base.id}
            className="flex flex-col gap-3 rounded-3xl border border-border bg-background/90 p-4 shadow-soft"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" aria-hidden />
                  <span>{base.name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    Active
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <MapPin className="mr-1 inline h-3.5 w-3.5 text-muted-foreground/80" aria-hidden />
                  {base.region}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Moderator {base.moderator}</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {base.users} members
                  </span>
                  <span>{base.activeListings} listings</span>
                  <span>{base.pendingReports} reports</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
                  onClick={() => openEditForm(base)}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit details
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1"
                  onClick={() => openModeratorForm(base)}
                >
                  Assign moderator
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1"
                  onClick={() => onViewStats(base.id)}
                >
                  View stats
                </button>
                <button
                  type="button"
                  className="rounded-full border border-destructive px-3 py-1 text-destructive"
                  onClick={() => onArchiveBase(base.id)}
                >
                  Archive
                </button>
              </div>
            </div>
            {editingBaseId === base.id ? (
              <form
                className="space-y-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4"
                onSubmit={(event) => handleEditSubmit(event, base)}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    <span className="text-foreground">Base name</span>
                    <input
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                      value={editForm.name}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    <span className="text-foreground">Region</span>
                    <input
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                      value={editForm.region}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, region: event.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    <span className="text-foreground">Timezone (optional)</span>
                    <input
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                      value={editForm.timezone}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, timezone: event.target.value }))}
                      placeholder="PT"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <button type="button" className="rounded-full border border-border px-4 py-2" onClick={cancelEditForm}>
                    Cancel
                  </button>
                  <button type="submit" className="rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card">
                    Save changes
                  </button>
                </div>
              </form>
            ) : null}
            {moderatorBaseId === base.id ? (
              <form
                className="space-y-3 rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4"
                onSubmit={(event) => handleModeratorSubmit(event, base.id)}
              >
                <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
                  <span className="text-foreground">Moderator name</span>
                  <input
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                    value={moderatorDrafts[base.id] ?? ""}
                    onChange={(event) =>
                      setModeratorDrafts((prev) => ({ ...prev, [base.id]: event.target.value }))
                    }
                    placeholder="Capt Logan Pierce"
                    required
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <button type="button" className="rounded-full border border-border px-4 py-2" onClick={cancelModeratorForm}>
                    Cancel
                  </button>
                  <button type="submit" className="rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card">
                    Assign moderator
                  </button>
                </div>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
};
