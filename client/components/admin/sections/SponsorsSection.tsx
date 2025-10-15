import { FormEvent, useMemo, useState } from "react";
import { ExternalLink, Image as ImageIcon, Megaphone, Palette, Pencil, Plus, Trash2 } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import type { Base, SponsorPlacement } from "@/types";

interface AdminSponsorRow extends SponsorPlacement {
  baseName: string;
}

interface SponsorsSectionProps {
  placements: AdminSponsorRow[];
  bases: Base[];
  onCreate: (payload: Omit<SponsorPlacement, "id">) => void;
  onUpdate: (
    placementId: string,
    updates: Partial<Omit<SponsorPlacement, "id">>,
  ) => void;
  onDelete: (placementId: string) => void;
}

const DEFAULT_BRAND_COLOR = "#0F62FE";

const normalizeHex = (value: string): string => {
  if (!value) {
    return DEFAULT_BRAND_COLOR;
  }
  return value.startsWith("#") ? value : `#${value.replace(/^#+/, "")}`;
};

export const SponsorsSection = ({
  placements,
  bases,
  onCreate,
  onUpdate,
  onDelete,
}: SponsorsSectionProps): JSX.Element => {
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<Omit<SponsorPlacement, "id">>(() => ({
    baseId: bases[0]?.id ?? "",
    label: "",
    description: "",
    href: "",
    brandColor: DEFAULT_BRAND_COLOR,
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<SponsorPlacement, "id"> | null>(null);

  const baseOptions = useMemo(() => {
    return bases.map((base) => ({ id: base.id, label: `${base.name} • ${base.region}` }));
  }, [bases]);

  const toggleCreateForm = () => {
    setIsCreateOpen((prev) => !prev);
    setCreateForm((prev) => ({
      ...prev,
      baseId: prev.baseId || bases[0]?.id || "",
      brandColor: normalizeHex(prev.brandColor),
    }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      baseId: bases[0]?.id ?? "",
      label: "",
      description: "",
      href: "",
      brandColor: DEFAULT_BRAND_COLOR,
    });
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const baseId = createForm.baseId.trim();
    const label = createForm.label.trim();
    const description = createForm.description.trim();
    const href = createForm.href.trim();
    if (!baseId || !label || !description || !href) {
      return;
    }
    onCreate({
      baseId,
      label,
      description,
      href,
      brandColor: normalizeHex(createForm.brandColor),
    });
    resetCreateForm();
    setIsCreateOpen(false);
  };

  const openEditForm = (placement: AdminSponsorRow) => {
    setEditingId(placement.id);
    setEditForm({
      baseId: placement.baseId,
      label: placement.label,
      description: placement.description,
      href: placement.href,
      brandColor: normalizeHex(placement.brandColor),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>, placementId: string) => {
    event.preventDefault();
    if (!editForm) {
      return;
    }
    const baseId = editForm.baseId.trim();
    const label = editForm.label.trim();
    const description = editForm.description.trim();
    const href = editForm.href.trim();
    if (!baseId || !label || !description || !href) {
      return;
    }
    onUpdate(placementId, {
      baseId,
      label,
      description,
      href,
      brandColor: normalizeHex(editForm.brandColor),
    });
    cancelEdit();
  };

  const handleDelete = (placementId: string) => {
    if (confirm("Remove this sponsor placement?")) {
      onDelete(placementId);
    }
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Sponsor Placements" subtitle="Revenue" accent="Ads" />
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card"
          onClick={toggleCreateForm}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {isCreateOpen ? "Close form" : "Add sponsor"}
        </button>
      </div>
      {isCreateOpen ? (
        <form
          className="space-y-3 rounded-3xl border border-dashed border-primary/40 bg-primary/5 p-4"
          onSubmit={handleCreateSubmit}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span className="text-foreground">Base</span>
              <select
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none"
                value={createForm.baseId}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, baseId: event.target.value }))
                }
                required
              >
                <option value="" disabled>
                  Select base
                </option>
                {baseOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span className="text-foreground">Brand color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-10 w-16 rounded-lg border border-border"
                  value={normalizeHex(createForm.brandColor)}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, brandColor: event.target.value }))
                  }
                />
                <input
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none"
                  value={normalizeHex(createForm.brandColor)}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, brandColor: event.target.value }))
                  }
                  placeholder="#0F62FE"
                />
              </div>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span className="text-foreground">Title</span>
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                value={createForm.label}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="USAA Auto Insurance"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <span className="text-foreground">CTA link</span>
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                value={createForm.href}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, href: event.target.value }))}
                placeholder="https://"
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className="text-foreground">Description</span>
            <textarea
              className="min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Exclusive rates for members..."
              required
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              className="rounded-full border border-border px-4 py-2"
              onClick={() => {
                resetCreateForm();
                setIsCreateOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card"
            >
              <Megaphone className="h-4 w-4" aria-hidden />
              Save sponsor
            </button>
          </div>
        </form>
      ) : null}
      <div className="space-y-3">
        {placements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/80 p-6 text-center text-sm text-muted-foreground">
            No sponsor placements yet. Add a sponsor to highlight a base partner.
          </div>
        ) : null}
        {placements.map((placement) => {
          const isEditing = editingId === placement.id;
          return (
            <article
              key={placement.id}
              className="flex flex-col gap-3 rounded-3xl border border-border bg-background/80 p-5 shadow-soft"
              style={{ borderColor: normalizeHex(placement.brandColor) }}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Megaphone className="h-4 w-4 text-primary" aria-hidden />
                    <span>{placement.label}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {placement.baseName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{placement.description}</p>
                  <a
                    href={placement.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Visit sponsor
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
                    onClick={() => openEditForm(placement)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-destructive"
                    onClick={() => handleDelete(placement.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Palette className="h-3.5 w-3.5" aria-hidden />
                <span>Brand color </span>
                <span className="font-semibold text-foreground">{normalizeHex(placement.brandColor)}</span>
              </div>
              {isEditing && editForm ? (
                <form
                  className="space-y-3 rounded-2xl border border-dashed border-border bg-card/60 p-4"
                  onSubmit={(event) => handleEditSubmit(event, placement.id)}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                      <span className="text-foreground">Base</span>
                      <select
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none"
                        value={editForm.baseId}
                        onChange={(event) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, baseId: event.target.value } : prev,
                          )
                        }
                        required
                      >
                        <option value="" disabled>
                          Select base
                        </option>
                        {baseOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                      <span className="text-foreground">Brand color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="h-10 w-16 rounded-lg border border-border"
                          value={normalizeHex(editForm.brandColor)}
                          onChange={(event) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, brandColor: event.target.value } : prev,
                            )
                          }
                        />
                        <input
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none"
                          value={normalizeHex(editForm.brandColor)}
                          onChange={(event) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, brandColor: event.target.value } : prev,
                            )
                          }
                          placeholder="#0F62FE"
                        />
                      </div>
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                      <span className="text-foreground">Title</span>
                      <input
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                        value={editForm.label}
                        onChange={(event) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, label: event.target.value } : prev,
                          )
                        }
                        placeholder="USAA Auto Insurance"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                      <span className="text-foreground">CTA link</span>
                      <input
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                        value={editForm.href}
                        onChange={(event) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, href: event.target.value } : prev,
                          )
                        }
                        placeholder="https://"
                        required
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    <span className="text-foreground">Description</span>
                    <textarea
                      className="min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, description: event.target.value } : prev,
                        )
                      }
                      placeholder="Exclusive rates for members..."
                      required
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button type="button" className="rounded-full border border-border px-4 py-2" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Save changes
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
};
