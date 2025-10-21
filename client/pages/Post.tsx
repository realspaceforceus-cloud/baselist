import { ImagePlus, ShieldCheck, Upload, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBaseList } from "@/context/BaseListContext";
import { uploadImageToCloudinary } from "@/lib/cloudinaryClient";
import { generateSlug } from "@/lib/slugUtils";
import { LISTING_CATEGORIES } from "@/data/mock";
import type { Listing, ListingCategory } from "@/types";

type PhotoPreview = {
  id: string;
  file: File;
  preview: string;
};

type FieldErrorKey = "photos" | "title" | "price" | "category" | "description";

type FieldErrors = Partial<Record<FieldErrorKey, string>>;

type SubmissionState = "idle" | "submitting" | "success" | "error";

const MAX_PHOTOS = 6;

const Post = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentBase, currentBaseId, user, addListing, listings } = useBaseList();
  const editListingId = searchParams.get("edit");

  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [savedListingId, setSavedListingId] = useState<string | null>(null);

  // Vehicle-specific fields
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleMiles, setVehicleMiles] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load listing data if editing
  useEffect(() => {
    if (!editListingId) return;

    const listingToEdit = listings.find((l) => l.id === editListingId);
    if (!listingToEdit) return;

    setTitle(listingToEdit.title);
    setPrice(String(listingToEdit.price));
    setIsFree(listingToEdit.isFree);
    setCategory(listingToEdit.category);
    setDescription(listingToEdit.description || "");

    // Load vehicle data if available
    if (listingToEdit.category === "Vehicles") {
      const vehicleData = extractVehicleDataFromTitle(listingToEdit.title);
      if (vehicleData) {
        setVehicleYear(vehicleData.year);
        setVehicleMake(vehicleData.make);
        setVehicleModel(vehicleData.model);
        setVehicleType(vehicleData.type || "");
        setVehicleColor(vehicleData.color || "");
        setVehicleMiles(vehicleData.miles || "");
      }
    }

    // Load existing images as previews
    if (listingToEdit.imageUrls && listingToEdit.imageUrls.length > 0) {
      const existingPhotos = listingToEdit.imageUrls.map((url) => ({
        id: crypto.randomUUID(),
        file: new File([], url),
        preview: url,
      }));
      setPhotos(existingPhotos);
    }
  }, [editListingId, listings]);

  const extractVehicleDataFromTitle = (title: string) => {
    // Simple extraction: "2020 Honda Civic SUV" format
    const parts = title.split(" ");
    if (parts.length >= 3) {
      return {
        year: parts[0],
        make: parts[1],
        model: parts[2],
        type: parts[3] || "",
        color: "",
        miles: "",
      };
    }
    return null;
  };

  const buildVehicleTitle = () => {
    if (!vehicleYear || !vehicleMake || !vehicleModel) return "";
    const parts = [vehicleYear, vehicleMake, vehicleModel];
    if (vehicleType) parts.push(vehicleType);
    return parts.join(" ");
  };

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    };
  }, [photos]);

  const remainingPhotoSlots = MAX_PHOTOS - photos.length;

  const categoriesForSelect = useMemo(
    () => LISTING_CATEGORIES.map((item) => ({ label: item, value: item })),
    [],
  );

  const handlePhotoSelection = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const incoming = Array.from(files)
      .slice(0, remainingPhotoSlots)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }));

    if (!incoming.length) {
      return;
    }

    setPhotos((previous) => [...previous, ...incoming].slice(0, MAX_PHOTOS));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((previous) => {
      const target = previous.find((photo) => photo.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return previous.filter((photo) => photo.id !== photoId);
    });
  };

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {};

    if (photos.length === 0) {
      nextErrors.photos = "Add at least one photo.";
    }

    // For vehicles, validate vehicle details instead of relying solely on title
    if (category === "Vehicles") {
      if (!vehicleYear || !vehicleMake || !vehicleModel) {
        nextErrors.title = "Please fill in year, make, and model for vehicles.";
      }
    } else if (!title.trim()) {
      nextErrors.title = "Enter a clear title.";
    }

    if (!isFree) {
      const numericPrice = Number(price);
      if (!price || Number.isNaN(numericPrice) || numericPrice <= 0) {
        nextErrors.price = "Enter a valid price.";
      }
    }

    if (!category) {
      nextErrors.category = "Choose a category.";
    }

    if (!description.trim()) {
      nextErrors.description = "Add a short description.";
    }

    return nextErrors;
  };

  const resetForm = () => {
    setPhotos((previous) => {
      previous.forEach((photo) => URL.revokeObjectURL(photo.preview));
      return [];
    });
    setTitle("");
    setPrice("");
    setIsFree(false);
    setCategory("");
    setDescription("");
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setSubmissionState("submitting");
      setSubmissionError(null);

      // Upload new images to Cloudinary (skip URLs that are already Cloudinary URLs)
      const imageUrls = await Promise.all(
        photos.map(async (photo) => {
          // If it's already a URL (existing image), return it as-is
          if (photo.preview.startsWith("http")) {
            return photo.preview;
          }
          // Otherwise upload the new file
          return uploadImageToCloudinary(photo.file);
        }),
      );

      const isEditing = !!editListingId;
      const existingListing = isEditing
        ? listings.find((l) => l.id === editListingId)
        : null;

      const listingData = {
        title: title.trim(),
        price: isFree ? 0 : Number(price),
        is_free: isFree,
        category: (category || "Other") as ListingCategory,
        seller_id: user.id,
        image_urls: imageUrls,
        base_id: currentBaseId,
        status: "active",
        description: description.trim(),
      };

      // For editing, use PUT; for creating, use POST
      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing
        ? `/.netlify/functions/listings/${editListingId}`
        : "/.netlify/functions/listings";

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? listingData
            : {
                id: `listing-${crypto.randomUUID()}`,
                postedAt: new Date().toISOString(),
                ...listingData,
              }
        ),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save listing");
      }

      // Get the saved listing from backend response
      const savedListing = await response.json();

      // Update local state with the server version
      addListing(savedListing);
      setSavedListingId(savedListing.id);
      setSubmissionState("success");
      resetForm();

      // Navigate after a brief delay to show the confirmation
      const slug = generateSlug(savedListing.title, savedListing.id);
      setTimeout(() => {
        navigate(`/listing/${slug}`);
      }, 1500);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Check your files and try again.";
      setSubmissionError(errorMessage);
      setSubmissionState("error");
    }
  };

  // Show loading transition screen during submission
  if (submissionState === "submitting") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              <span className="font-normal">trusty</span>
              <span className="font-bold">PCS</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Posting your item...
            </p>
          </div>
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-100" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-200" />
          </div>
        </div>
      </div>
    );
  }

  // Show success transition screen after submission
  if (submissionState === "success") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              <span className="font-normal">trusty</span>
              <span className="font-bold">PCS</span>
            </h1>
            <p className="text-lg font-semibold text-foreground">
              Item posted!
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your listing...
            </p>
          </div>
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-100" />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-200" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (submissionState === "error") {
    return (
      <section className="space-y-8">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Unable to post item
          </h2>
          <p className="text-muted-foreground mb-4">{submissionError}</p>
          <Button
            onClick={() => setSubmissionState("idle")}
            className="rounded-full px-6"
          >
            Try again
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between md:gap-6 md:p-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Post a listing in 30 seconds.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Upload photos, add the essentials, and your post appears instantly
            for verified members at {currentBase.name}.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-3xl border border-dashed border-nav-border bg-background/70 px-5 py-4 text-sm text-muted-foreground md:mt-0">
          <ShieldCheck className="h-5 w-5 text-verified" aria-hidden />
          <span>
            Listings are auto-tagged to {currentBase.name}. Switch bases anytime
            from the header.
          </span>
        </div>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section className="space-y-4 rounded-3xl border border-border bg-background/80 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Photos</h2>
              <p className="text-sm text-muted-foreground">
                Add up to six square images. The first photo becomes the cover.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden />
              Upload
            </Button>
          </div>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handlePhotoSelection(event.target.files)}
          />

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-card shadow-card"
              >
                <img
                  src={photo.preview}
                  alt="Selected upload"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground transition hover:bg-background"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-nav-border bg-background/60 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <ImagePlus className="h-6 w-6" aria-hidden />
                Add photo
                <span className="text-xs text-muted-foreground">
                  {remainingPhotoSlots} slots left
                </span>
              </button>
            ) : null}
          </div>
          {errors.photos ? (
            <p className="text-sm text-destructive">{errors.photos}</p>
          ) : null}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor="title"
            >
              Title
            </label>
            <Input
              id="title"
              placeholder="What are you selling?"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 rounded-2xl text-base"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-semibold text-foreground"
                htmlFor="price"
              >
                Price
              </label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  id="free-toggle"
                  checked={isFree}
                  onCheckedChange={(state) => {
                    setIsFree(state);
                    if (state) {
                      setPrice("");
                    }
                  }}
                />
                <label htmlFor="free-toggle" className="cursor-pointer">
                  Mark as free
                </label>
              </div>
            </div>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="h-12 rounded-2xl text-base"
              disabled={isFree}
              aria-invalid={Boolean(errors.price)}
            />
            {errors.price ? (
              <p className="text-sm text-destructive">{errors.price}</p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor="category"
            >
              Category
            </label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as ListingCategory)}
            >
              <SelectTrigger
                id="category"
                className="h-12 rounded-2xl text-base"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoriesForSelect.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category ? (
              <p className="text-sm text-destructive">{errors.category}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor="description"
            >
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Share condition, pickup details, and extras."
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-2xl text-base"
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description}</p>
            ) : null}
          </div>
        </section>

        {category === "Vehicles" && (
          <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground">Vehicle Details</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="vehicle-year"
                >
                  Year
                </label>
                <Input
                  id="vehicle-year"
                  placeholder="2020"
                  value={vehicleYear}
                  onChange={(event) => setVehicleYear(event.target.value)}
                  className="h-10 rounded-2xl text-base"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="vehicle-make"
                >
                  Make
                </label>
                <Input
                  id="vehicle-make"
                  placeholder="Honda"
                  value={vehicleMake}
                  onChange={(event) => setVehicleMake(event.target.value)}
                  className="h-10 rounded-2xl text-base"
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="vehicle-model"
                >
                  Model
                </label>
                <Input
                  id="vehicle-model"
                  placeholder="Civic"
                  value={vehicleModel}
                  onChange={(event) => setVehicleModel(event.target.value)}
                  className="h-10 rounded-2xl text-base"
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="vehicle-type"
                >
                  Type
                </label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger id="vehicle-type" className="h-10 rounded-2xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sedan">Sedan</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Coupe">Coupe</SelectItem>
                    <SelectItem value="Hatchback">Hatchback</SelectItem>
                    <SelectItem value="Wagon">Wagon</SelectItem>
                    <SelectItem value="Convertible">Convertible</SelectItem>
                    <SelectItem value="Minivan">Minivan</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="vehicle-color"
                >
                  Color
                </label>
                <Input
                  id="vehicle-color"
                  placeholder="Blue"
                  value={vehicleColor}
                  onChange={(event) => setVehicleColor(event.target.value)}
                  className="h-10 rounded-2xl text-base"
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-foreground"
                  htmlFor="vehicle-miles"
                >
                  Miles
                </label>
                <Input
                  id="vehicle-miles"
                  placeholder="45000"
                  value={vehicleMiles}
                  onChange={(event) => setVehicleMiles(event.target.value)}
                  className="h-10 rounded-2xl text-base"
                  type="number"
                  min="0"
                />
              </div>
            </div>
          </section>
        )}

        <footer className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-card md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Posting as{" "}
            <span className="font-semibold text-foreground">{user.name}</span> •
            Base: {currentBase.name}
          </div>
          <Button
            type="submit"
            size="lg"
            className="rounded-full px-8"
            disabled={submissionState !== "idle"}
          >
            {submissionState === "submitting" ? "Posting…" : "Post"}
          </Button>
        </footer>
      </form>
    </section>
  );
};

export default Post;
