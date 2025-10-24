import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { uploadImageToCloudinary } from "@/lib/cloudinaryClient";
import { useAuth } from "@/context/AuthContext";

export default function CreateStore() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setStoreName(name);
    // Auto-generate slug from name
    if (name) {
      setStoreSlug(generateSlug(name));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setLogoUrl(url);
      toast({ title: "Success", description: "Logo uploaded!" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast({ title: "Error", description: message });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCreateStore = async () => {
    if (!storeName.trim()) {
      toast({ title: "Error", description: "Store name is required" });
      return;
    }

    setIsLoading(true);
    console.log("[CREATE STORE] Starting...", { storeName, storeSlug });

    try {
      const response = await fetch("/.netlify/functions/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: storeName,
          slug: storeSlug,
          enabled: true, // Enable immediately on creation
          backgroundColor: "#FFFFFF",
          textColor: "#000000",
          logoUrl: logoUrl || null,
        }),
      });

      console.log("[CREATE STORE] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("[CREATE STORE] Error response:", errorData);
        throw new Error(
          errorData.error || errorData.details || "Failed to create store",
        );
      }

      const data = await response.json();
      console.log("[CREATE STORE] Success! Data:", data);

      // Refresh user to get the new store fields
      await refreshUser();

      toast({
        title: "Success",
        description: "Store created! Redirecting to management...",
      });

      // Redirect to store management page
      setTimeout(() => {
        navigate("/store-management");
      }, 1000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create store";
      console.error("[CREATE STORE] Error:", message, error);
      toast({ title: "Error", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Your Store</h1>
          <p className="text-muted-foreground text-lg">
            Set up your personal store to showcase and sell items to the
            community
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateStore();
            }}
            className="space-y-6"
          >
            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor="store-name" className="text-base font-semibold">
                Store Name *
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                This is the name customers will see
              </p>
              <Input
                id="store-name"
                placeholder="e.g., Anime Comics, Tech Gadgets"
                value={storeName}
                onChange={handleNameChange}
                className="h-11"
                disabled={isLoading}
              />
            </div>

            {/* Store Slug */}
            <div className="space-y-2">
              <Label htmlFor="store-slug" className="text-base font-semibold">
                Store URL Slug *
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Your store will be accessible at /store/
                {storeSlug || "your-slug"}
              </p>
              <Input
                id="store-slug"
                placeholder="auto-generated from name"
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                className="h-11"
                disabled={isLoading}
              />
            </div>

            {/* Store Logo */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Store Logo</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Optional - Add a logo to make your store stand out
              </p>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <div className="h-32 w-32 overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={logoUrl}
                      alt="Store logo"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={isLoading || isUploadingLogo}
                  />
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11"
                    disabled={isLoading || isUploadingLogo}
                  >
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {logoUrl ? "Change Logo" : "Upload Logo"}
                        </>
                      )}
                    </label>
                  </Button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                size="lg"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading || !storeName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Store...
                  </>
                ) : (
                  "Create Store"
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              * Required fields
            </p>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 rounded-xl border border-blue-200/50 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>✓ Your store will be created and go live immediately</li>
            <li>✓ You'll be able to add items and customize your store</li>
            <li>✓ Your store URL will be shareable with the community</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
