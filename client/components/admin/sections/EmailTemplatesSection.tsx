import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Edit2,
  Trash2,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  templateKey: string;
  subject: string;
  htmlContent: string;
  description?: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export const EmailTemplatesSection = (): JSX.Element => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    templateKey: "",
    subject: "",
    htmlContent: "",
    description: "",
    variables: "" as string | string[],
    isActive: true,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/.netlify/functions/email-templates", {
        headers: {
          "user-id": "admin",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        toast.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Error loading templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.templateKey ||
      !formData.subject ||
      !formData.htmlContent
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const variables = Array.isArray(formData.variables)
        ? formData.variables
        : formData.variables
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v);

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/.netlify/functions/email-templates/${editingId}`
        : "/.netlify/functions/email-templates";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "user-id": "admin",
        },
        body: JSON.stringify({
          name: formData.name,
          templateKey: formData.templateKey,
          subject: formData.subject,
          htmlContent: formData.htmlContent,
          description: formData.description,
          variables,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success(
          editingId
            ? "Template updated successfully"
            : "Template created successfully",
        );
        resetForm();
        loadTemplates();
      } else {
        toast.error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Error saving template");
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setFormData({
      name: template.name,
      templateKey: template.templateKey,
      subject: template.subject,
      htmlContent: template.htmlContent,
      description: template.description || "",
      variables: template.variables.join(", "),
      isActive: template.isActive,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/email-templates/${id}`,
        {
          method: "DELETE",
          headers: {
            "user-id": "admin",
          },
        },
      );

      if (response.ok) {
        toast.success("Template deleted successfully");
        loadTemplates();
      } else {
        toast.error("Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error deleting template");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      templateKey: "",
      subject: "",
      htmlContent: "",
      description: "",
      variables: "",
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage email templates for notifications, verification codes, and
            newsletters
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={18} />
          New Template
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit Template" : "Create New Template"}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Template Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Verification Code"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Template Key (identifier) *
                </label>
                <Input
                  value={formData.templateKey}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      templateKey: e.target.value.toLowerCase(),
                    })
                  }
                  placeholder="e.g., verify_email"
                  required
                  disabled={!!editingId}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Subject *
              </label>
              <Input
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Email subject"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What is this template for?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Variables (comma-separated)
              </label>
              <Input
                value={
                  typeof formData.variables === "string"
                    ? formData.variables
                    : ""
                }
                onChange={(e) =>
                  setFormData({ ...formData, variables: e.target.value })
                }
                placeholder="e.g., code, userName, expiresIn"
              />
              <p className="text-xs text-gray-600 mt-1">
                Use these in your HTML as {"{"}"{"{"}variableName{"}"}
                {"}"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                HTML Content *
              </label>
              <Textarea
                value={formData.htmlContent}
                onChange={(e) =>
                  setFormData({ ...formData, htmlContent: e.target.value })
                }
                placeholder="Enter HTML email content"
                rows={10}
                required
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active (use this template for sending emails)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="gap-2">
                <CheckCircle2 size={18} />
                {editingId ? "Update Template" : "Create Template"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No email templates yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Create your first template to get started
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-6 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    {template.isActive ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Key:</strong>{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {template.templateKey}
                    </code>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Subject:</strong> {template.subject}
                  </p>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {template.description}
                    </p>
                  )}
                  {template.variables.length > 0 && (
                    <p className="text-sm text-gray-600">
                      <strong>Variables:</strong>{" "}
                      {template.variables.join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="gap-2"
                  >
                    <Edit2 size={16} />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="gap-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
