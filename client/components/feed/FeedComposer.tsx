import { useState, useRef } from "react";
import { Image, BarChart3, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { feedApi } from "@/lib/feedApi";
import { adminApi } from "@/lib/adminApi";
import { useBaseList } from "@/context/BaseListContext";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToCloudinary } from "@/lib/cloudinaryClient";
import { MentionAutocomplete } from "./MentionAutocomplete";
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

  const [canPostPSA, setCanPostPSA] = useState(false);

  // Check if user can post PSA (admin or moderator assigned to this base)
  useEffect(() => {
    const checkPSAPermission = async () => {
      if (!user || !currentBaseId) {
        setCanPostPSA(false);
        return;
      }

      // Admins can always post PSAs
      if (user.role === "admin") {
        setCanPostPSA(true);
        return;
      }

      // For moderators, check if assigned to current base
      if (user.role === "moderator") {
        try {
          const assignedBases = await adminApi.getModeratorBases(user.id);
          setCanPostPSA(assignedBases.includes(currentBaseId));
        } catch (error) {
          console.error("Failed to fetch moderator bases:", error);
          setCanPostPSA(false);
        }
      } else {
        setCanPostPSA(false);
      }
    };

    checkPSAPermission();
  }, [user, currentBaseId]);

  const isFormValid = content.trim().length > 0;

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploadingPhoto(true);
    try {
      const newImages: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadImageToCloudinary(file);
        newImages.push(url);
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

      {/* Text Input with mention autocomplete */}
      <MentionAutocomplete
        value={content}
        onChange={setContent}
        placeholder="Share your thoughts... (type @ to mention someone)"
        className="mb-4 min-h-[100px] w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        isTextarea={true}
        userId={user?.userId}
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

      {showOptions && mode === "photo" && (
        <div className="mb-4 space-y-3 rounded-lg bg-accent/50 p-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition disabled:opacity-50"
          >
            {isUploadingPhoto ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Image className="h-4 w-4" />
                Choose photos
              </>
            )}
          </button>

          {uploadedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {uploadedImages.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt="Uploaded"
                    className="rounded-lg object-cover w-full aspect-square"
                  />
                  <button
                    onClick={() =>
                      setUploadedImages(
                        uploadedImages.filter((_, i) => i !== idx),
                      )
                    }
                    className="absolute top-1 right-1 rounded-full bg-destructive text-destructive-foreground p-1 hover:bg-destructive/90"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {mode === "photo" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="rounded p-2 text-muted-foreground hover:bg-accent transition"
            >
              <Image className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting || isUploadingPhoto}
          className="rounded-full px-6"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
