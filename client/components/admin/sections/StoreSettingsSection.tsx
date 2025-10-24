import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Image as ImageIcon, Edit2 } from "lucide-react";
import { Store, StoreItem, UserProfile } from "@/types";
import { uploadImageToCloudinary } from "@/lib/cloudinaryClient";

interface StoreSettingsProps {
  user: UserProfile;
  onStoreUpdated: (store: Store) => void;
}

export const StoreSettingsSection = ({
  user,
  onStoreUpdated,
}: StoreSettingsProps) => {
  const { toast } = useToast();

  const [store, setStore] = useState<Store>({
    userId: user.id,
    name: (user as any)?.store_name || "",
    slug: (user as any)?.store_slug || "",
    enabled: (user as any)?.store_enabled || false,
    backgroundColor: (user as any)?.store_background_color || "#FFFFFF",
    textColor: (user as any)?.store_text_color || "#000000",
    logoUrl: (user as any)?.store_logo_url || undefined,
  });

  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrls: [] as string[],
  });

  // Load store items
  useEffect(() => {
    fetchStoreItems();
  }, []);

  const fetchStoreItems = async () => {
    try {
      const response = await fetch("/.netlify/functions/store/items", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching store items:", error);
    }
  };

  const handleSaveStore = async () => {
    if (!store.name.trim()) {
      toast({ title: "Error", description: "Store name is required" });
      return;
    }

    setIsSaving(true);
    console.log("[STORE SAVE] Starting...", {
      name: store.name,
      enabled: store.enabled,
    });
    try {
      const slug =
        store.slug ||
        store.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      const requestBody = {
        name: store.name,
        slug,
        enabled: store.enabled,
        backgroundColor: store.backgroundColor,
        textColor: store.textColor,
        logoUrl: store.logoUrl,
      };
      console.log("[STORE SAVE] Request body:", requestBody);

      const response = await fetch("/.netlify/functions/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      console.log(
        "[STORE SAVE] Response status:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log("[STORE SAVE] Error response body:", errorData);
        } catch (parseError) {
          console.log("[STORE SAVE] Could not parse error response");
          errorData = { error: "Unknown error" };
        }
        throw new Error(
          errorData.error || errorData.details || "Failed to save store",
        );
      }

      const data = await response.json();
      console.log("[STORE SAVE] Success! Data:", data);
      setStore(data.store);
      onStoreUpdated(data.store);
      toast({
        title: "Success",
        description: "Store settings saved successfully!",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save store";
      console.error("[STORE SAVE] Error:", message, error);
      toast({ title: "Error", description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) {
      toast({ title: "Error", description: "Name and price are required" });
      return;
    }

    setIsLoading(true);
    const operation = editingItem ? "UPDATE" : "ADD";
    console.log(`[ITEM ${operation}] Starting...`, {
      name: itemForm.name,
      price: itemForm.price,
    });

    try {
      const url = editingItem
        ? `/.netlify/functions/store/items?itemId=${editingItem.id}`
        : "/.netlify/functions/store/items";
      const method = editingItem ? "PATCH" : "POST";

      const itemData = {
        name: itemForm.name,
        description: itemForm.description,
        price: parseFloat(itemForm.price),
        imageUrls: itemForm.imageUrls,
      };
      console.log(`[ITEM ${operation}] URL:`, url);
      console.log(`[ITEM ${operation}] Method:`, method);
      console.log(`[ITEM ${operation}] Data:`, itemData);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(itemData),
      });

      console.log(
        `[ITEM ${operation}] Response status:`,
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log(`[ITEM ${operation}] Error response:`, errorData);
        } catch (parseError) {
          console.log(`[ITEM ${operation}] Could not parse error response`);
          errorData = { error: "Unknown error" };
        }
        throw new Error(
          errorData.error || errorData.details || "Failed to save item",
        );
      }

      console.log(`[ITEM ${operation}] Success! Fetching items...`);
      await fetchStoreItems();
      setItemForm({ name: "", description: "", price: "", imageUrls: [] });
      setEditingItem(null);
      setShowItemForm(false);
      toast({
        title: "Success",
        description: editingItem ? "Item updated!" : "Item added!",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save item";
      console.error(`[ITEM ${operation}] Error:`, message, error);
      toast({ title: "Error", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;

    try {
      const response = await fetch(
        `/.netlify/functions/store/items?itemId=${itemId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete item");
      }

      setItems(items.filter((i) => i.id !== itemId));
      toast({ title: "Success", description: "Item deleted" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete item";
      toast({ title: "Error", description: message });
      console.error("Item delete error:", error);
    }
  };

  const handleUploadLogo = async (file: File) => {
    try {
      const url = await uploadImageToCloudinary(file);
      setStore((prev) => ({
        ...prev,
        logoUrl: url,
      }));
      toast({ title: "Success", description: "Logo uploaded!" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload logo";
      toast({ title: "Error", description: message });
      console.error("Logo upload error:", error);
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      const url = await uploadImageToCloudinary(file);
      setItemForm((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, url],
      }));
      toast({ title: "Success", description: "Image uploaded!" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload image";
      toast({ title: "Error", description: message });
      console.error("Image upload error:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Store Settings */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Store Settings</h3>
          <Badge variant={store.enabled ? "default" : "secondary"}>
            {store.enabled ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="store-enabled"
                className="text-base font-semibold"
              >
                Enable Store
              </Label>
              <p className="text-sm text-muted-foreground">
                Make your store visible to other members
              </p>
            </div>
            <Switch
              id="store-enabled"
              checked={store.enabled}
              onCheckedChange={(checked) =>
                setStore({ ...store, enabled: checked })
              }
            />
          </div>

          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="store-name">Store Name</Label>
            <Input
              id="store-name"
              placeholder="e.g., Jared's Bakery"
              value={store.name}
              onChange={(e) => setStore({ ...store, name: e.target.value })}
              className="rounded-lg"
            />
          </div>

          {/* Store Slug */}
          <div className="space-y-2">
            <Label htmlFor="store-slug">Store URL (Optional)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/store/</span>
              <Input
                id="store-slug"
                placeholder="auto-generated from name"
                value={store.slug}
                onChange={(e) => setStore({ ...store, slug: e.target.value })}
                className="rounded-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to auto-generate from store name
            </p>
          </div>

          {/* Store Logo */}
          <div className="space-y-2">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4">
              {store.logoUrl && (
                <div className="h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted">
                  <img
                    src={store.logoUrl}
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
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) handleUploadLogo(file);
                  }}
                  className="hidden"
                />
                <Button asChild variant="outline" className="w-full rounded-lg">
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Logo
                  </label>
                </Button>
              </div>
            </div>
          </div>

          {/* Store Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="bg-color"
                  type="color"
                  value={store.backgroundColor}
                  onChange={(e) =>
                    setStore({ ...store, backgroundColor: e.target.value })
                  }
                  className="h-10 w-20 rounded border border-border cursor-pointer"
                />
                <Input
                  type="text"
                  value={store.backgroundColor}
                  onChange={(e) =>
                    setStore({ ...store, backgroundColor: e.target.value })
                  }
                  placeholder="#FFFFFF"
                  className="rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="text-color"
                  type="color"
                  value={store.textColor}
                  onChange={(e) =>
                    setStore({ ...store, textColor: e.target.value })
                  }
                  className="h-10 w-20 rounded border border-border cursor-pointer"
                />
                <Input
                  type="text"
                  value={store.textColor}
                  onChange={(e) =>
                    setStore({ ...store, textColor: e.target.value })
                  }
                  placeholder="#000000"
                  className="rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveStore}
            disabled={isSaving}
            className="w-full rounded-lg"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSaving ? "Saving..." : "Save Store Settings"}
          </Button>
        </div>
      </section>

      {/* Store Items Management */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Store Items ({items.length})
          </h3>
          <Button
            onClick={() => {
              setEditingItem(null);
              setItemForm({
                name: "",
                description: "",
                price: "",
                quantity: "1",
                imageUrls: [],
              });
              setShowItemForm(!showItemForm);
            }}
            variant="outline"
            size="sm"
            className="rounded-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Item Form */}
        {showItemForm && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <h4 className="font-semibold">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h4>

            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name *</Label>
              <Input
                id="item-name"
                placeholder="e.g., Chocolate Chip Cookies"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                placeholder="Describe your item..."
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm({ ...itemForm, description: e.target.value })
                }
                className="rounded-lg"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-price">Price (USD) *</Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                placeholder="9.99"
                value={itemForm.price}
                onChange={(e) =>
                  setItemForm({ ...itemForm, price: e.target.value })
                }
                className="rounded-lg"
              />
            </div>

            {/* Item Images */}
            <div className="space-y-2">
              <Label>Item Images</Label>
              <div className="grid grid-cols-3 gap-2">
                {itemForm.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={`Item ${idx + 1}`}
                      className="h-20 w-20 rounded object-cover border border-border"
                    />
                    <button
                      onClick={() => {
                        setItemForm({
                          ...itemForm,
                          imageUrls: itemForm.imageUrls.filter(
                            (_, i) => i !== idx,
                          ),
                        });
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
                <label className="h-20 w-20 rounded border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (file) handleUploadImage(file);
                    }}
                    className="hidden"
                  />
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddItem}
                disabled={isLoading}
                className="flex-1 rounded-lg"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? "Update Item" : "Add Item"}
              </Button>
              <Button
                onClick={() => {
                  setShowItemForm(false);
                  setEditingItem(null);
                  setItemForm({
                    name: "",
                    description: "",
                    price: "",
                    imageUrls: [],
                  });
                }}
                variant="outline"
                className="rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              {item.imageUrls?.[0] && (
                <img
                  src={item.imageUrls[0]}
                  alt={item.name}
                  className="h-32 w-full rounded object-cover"
                />
              )}
              <div>
                <h4 className="font-semibold line-clamp-2">{item.name}</h4>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-bold text-lg">
                  ${item.price.toFixed(2)}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setEditingItem(item);
                      setItemForm({
                        name: item.name,
                        description: item.description || "",
                        price: item.price.toString(),
                        imageUrls: item.imageUrls,
                      });
                      setShowItemForm(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteItem(item.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && !showItemForm && (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-muted-foreground">
              No items yet. Add your first item to get started!
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
