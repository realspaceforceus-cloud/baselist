import { useState, useEffect } from "react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Announcement } from "@/types";

export const AnnouncementsSection = (): JSX.Element => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: "#3b82f6",
    backgroundColor: "#dbeafe",
    textColor: "#1e40af",
    isVisible: true,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/announcements/admin");
      if (!response.ok) throw new Error("Failed to fetch announcements");
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to fetch announcements";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const inputElement = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? inputElement.checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);

      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `/api/announcements/${editingId}`
        : "/api/announcements";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save announcement");

      toast.success(
        editingId ? "Announcement updated!" : "Announcement created!",
      );
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to save announcement";
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      color: announcement.color,
      backgroundColor: announcement.backgroundColor,
      textColor: announcement.textColor,
      isVisible: announcement.isVisible,
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?"))
      return;

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete announcement");

      toast.success("Announcement deleted!");
      fetchAnnouncements();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to delete announcement";
      toast.error(errorMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      color: "#3b82f6",
      backgroundColor: "#dbeafe",
      textColor: "#1e40af",
      isVisible: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Announcements"
        subtitle="Manage website-wide announcements"
        accent={`${announcements.length} total`}
      />

      <div className="flex justify-end">
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Announcement
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit Announcement" : "Create New Announcement"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetForm}
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Title *
              </label>
              <Input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Announcement title"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Content *
              </label>
              <Textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Announcement content"
                rows={4}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Border Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <span className="text-xs text-muted-foreground">
                    {formData.color}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="backgroundColor"
                    value={formData.backgroundColor}
                    onChange={handleInputChange}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <span className="text-xs text-muted-foreground">
                    {formData.backgroundColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    name="textColor"
                    value={formData.textColor}
                    onChange={handleInputChange}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <span className="text-xs text-muted-foreground">
                    {formData.textColor}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVisible"
                name="isVisible"
                checked={formData.isVisible}
                onChange={handleInputChange}
                className="h-4 w-4 cursor-pointer rounded border"
              />
              <label
                htmlFor="isVisible"
                className="text-sm font-medium cursor-pointer"
              >
                Visible to users
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Announcement"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No announcements yet. Create one to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="border p-4"
              style={{
                borderColor: announcement.color,
                backgroundColor: announcement.backgroundColor,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4
                    className="font-semibold"
                    style={{ color: announcement.textColor }}
                  >
                    {announcement.title}
                  </h4>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: announcement.textColor, opacity: 0.9 }}
                  >
                    {announcement.content}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {!announcement.isVisible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-yellow-800">
                        <AlertCircle className="h-3 w-3" />
                        Hidden
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      Created {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(announcement)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(announcement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
