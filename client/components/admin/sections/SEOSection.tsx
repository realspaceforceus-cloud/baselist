import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Save, Info } from "lucide-react";
import { toast } from "sonner";
import { SEO_ADMIN_FIELDS } from "@/components/SEOSettings";

interface SEOFormData {
  primary_tagline: string;
  secondary_tagline: string;
  homepage_meta_description: string;
  base_page_title_template: string;
  base_page_description_template: string;
  primary_keywords: string;
  local_keywords: string;
  trust_keywords: string;
}

interface SEOSectionProps {
  seoSettings: Partial<SEOFormData>;
  onSave: (data: SEOFormData) => Promise<void>;
}

export const SEOSection = ({
  seoSettings,
  onSave,
}: SEOSectionProps): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState<SEOFormData>({
    primary_tagline: seoSettings.primary_tagline || "",
    secondary_tagline: seoSettings.secondary_tagline || "",
    homepage_meta_description: seoSettings.homepage_meta_description || "",
    base_page_title_template: seoSettings.base_page_title_template || "",
    base_page_description_template:
      seoSettings.base_page_description_template || "",
    primary_keywords: seoSettings.primary_keywords || "",
    local_keywords: seoSettings.local_keywords || "",
    trust_keywords: seoSettings.trust_keywords || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await onSave(formData);
      setIsSaved(true);
      toast.success("SEO settings saved successfully!");

      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to save SEO settings";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Group fields by category
  const groupedFields = SEO_ADMIN_FIELDS.reduce(
    (acc, field) => {
      const category = field.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(field);
      return acc;
    },
    {} as Record<string, typeof SEO_ADMIN_FIELDS>,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          SEO Configuration
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your site's SEO taglines, meta descriptions, and keywords.
          These settings affect how your site appears in search results.
        </p>
      </div>

      {Object.entries(groupedFields).map(([category, fields]) => (
        <div
          key={category}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <h3 className="mb-4 font-semibold text-foreground">{category}</h3>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-semibold text-foreground">
                  {field.label}
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {field.description}
                </p>
                <div className="mt-2">
                  {field.type === "textarea" ? (
                    <Textarea
                      name={field.key}
                      value={formData[field.key as keyof SEOFormData] || ""}
                      onChange={handleChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="rounded-lg"
                      rows={3}
                    />
                  ) : (
                    <Input
                      name={field.key}
                      value={formData[field.key as keyof SEOFormData] || ""}
                      onChange={handleChange}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      className="rounded-lg"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Card className="border-blue-200/50 bg-blue-50/30 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">💡 Tips for SEO Success</p>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li>
                Use{" "}
                <code className="bg-white/50 px-1 rounded">
                  {"{"}
                  {"{"}base_name{"}"}
                  {"}"}
                </code>{" "}
                placeholder for dynamic base-specific pages
              </li>
              <li>Keep meta descriptions under 160 characters</li>
              <li>
                Include primary keywords naturally in titles and descriptions
              </li>
              <li>Update keywords quarterly based on search performance</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="rounded-xl"
        >
          <Save className="h-4 w-4 mr-2" aria-hidden />
          {isLoading ? "Saving..." : "Save SEO Settings"}
        </Button>
        {isSaved && (
          <span className="text-sm text-green-600 font-semibold">
            ✓ Saved successfully
          </span>
        )}
      </div>
    </div>
  );
};
