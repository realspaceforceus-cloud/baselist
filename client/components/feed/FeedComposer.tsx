import { useState, useRef } from "react";
import { Image, BarChart3, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { feedApi } from "@/lib/feedApi";
import { useBaseList } from "@/context/BaseListContext";
import { useAuth } from "@/context/AuthContext";
import { cloudinaryClient } from "@/lib/cloudinaryClient";
import type { FeedPost } from "@/types";

interface FeedComposerProps {
  onPostCreated: (post: FeedPost) => void;
  baseName: string;
}

type ComposerMode = "text" | "photo" | "poll" | "psa";

export function FeedComposer({
  onPostCreated,
  baseName,
}: FeedComposerProps): JSX.Element {
  const { user } = useAuth();
  const { currentBaseId } = useBaseList();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<ComposerMode>("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const isAdmin = user?.role === "admin" || user?.role === "moderator";
  const isFormValid = content.trim().length > 0;

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploadingPhoto(true);
    try {
      const newImages: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const signature = await cloudinaryClient.getSignature();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", "765912238265989");
        formData.append("signature", signature.signature);
        formData.append("timestamp", signature.timestamp.toString());
        formData.append("cloud_name", "dc4qnchym");

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/dc4qnchym/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const result = await response.json();
        newImages.push(result.secure_url);
      }

      setUploadedImages([...uploadedImages, ...newImages]);
      toast.success(`${newImages.length} image(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload image");
      console.error(error);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || !currentBaseId) return;

    setIsSubmitting(true);
    try {
      let pollOpts = undefined;

      if (mode === "poll") {
        pollOpts = pollOptions
          .filter((opt) => opt.trim())
          .map((opt) => ({
            id: Math.random().toString(36).substr(2, 9),
            text: opt,
            votes: [],
          }));

        if (pollOpts.length < 2) {
          toast.error("Add at least 2 poll options");
          setIsSubmitting(false);
          return;
        }
      }

      const post = await feedApi.createPost(
        currentBaseId,
        mode,
        content,
        uploadedImages,
        pollOpts,
        undefined,
      );

      onPostCreated(post);
      setContent("");
      setMode("text");
      setPollOptions(["", ""]);
      setUploadedImages([]);
      setShowOptions(false);
      toast.success("Post created!");
    } catch (error) {
      toast.error("Failed to create post");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      {/* Header */}
      <p className="mb-4 text-sm font-semibold text-muted-foreground">
        What's happening at {baseName}?
      </p>

      {/* Mode Tabs */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
        {(["text", "photo", "poll"] as ComposerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setShowOptions(true);
            }}
            className={`capitalize px-3 py-1 text-sm font-medium rounded transition ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {m}
          </button>
        ))}
        {isAdmin && (
          <button
            onClick={() => {
              setMode("psa");
              setShowOptions(true);
            }}
            className={`px-3 py-1 text-sm font-medium rounded transition flex items-center gap-1 ${
              mode === "psa"
                ? "bg-destructive text-destructive-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            PSA
          </button>
        )}
      </div>

      {/* Text Input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Share your thoughts...`}
        className="mb-4 min-h-[100px] w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Mode-specific options */}
      {showOptions && mode === "poll" && (
        <div className="mb-4 space-y-2 rounded-lg bg-accent/50 p-3">
          <p className="text-sm font-medium">Poll options</p>
          {pollOptions.map((opt, idx) => (
            <input
              key={idx}
              type="text"
              value={opt}
              onChange={(e) => {
                const newOpts = [...pollOptions];
                newOpts[idx] = e.target.value;
                setPollOptions(newOpts);
              }}
              placeholder={`Option ${idx + 1}`}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
            />
          ))}
          <button
            onClick={() => setPollOptions([...pollOptions, ""])}
            className="text-xs text-primary hover:underline"
          >
            + Add option
          </button>
        </div>
      )}

      {showOptions && mode === "event" && (
        <div className="mb-4 space-y-3 rounded-lg bg-accent/50 p-3">
          <input
            type="text"
            value={eventData.title}
            onChange={(e) =>
              setEventData({ ...eventData, title: e.target.value })
            }
            placeholder="Event title"
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
          />
          <textarea
            value={eventData.description}
            onChange={(e) =>
              setEventData({ ...eventData, description: e.target.value })
            }
            placeholder="Event description"
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="datetime-local"
            value={eventData.startDate}
            onChange={(e) =>
              setEventData({ ...eventData, startDate: e.target.value })
            }
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={eventData.endDate}
            onChange={(e) =>
              setEventData({ ...eventData, endDate: e.target.value })
            }
            placeholder="End date (optional)"
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {mode === "photo" && (
            <button className="rounded p-2 text-muted-foreground hover:bg-accent">
              <Image className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="rounded-full px-6"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
