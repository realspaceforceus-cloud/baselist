/**
 * Share a post or listing with native sharing or fallback UI
 */
export async function shareContent(options: {
  title: string;
  text: string;
  url: string;
}): Promise<boolean> {
  // Try native Web Share API first (mobile and some desktop)
  if (navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch (error: any) {
      // User cancelled share or error occurred
      if (error.name === "AbortError") {
        return false;
      }
      // Fall through to fallback
    }
  }

  // Fallback: copy to clipboard and return true (UI can show message)
  try {
    await navigator.clipboard.writeText(options.url);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Generate share URLs for different platforms
 */
export const generateShareUrls = (url: string, text: string) => ({
  messenger: `https://www.facebook.com/dialog/send?app_id=123456&link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
  email: `mailto:?subject=Check this out&body=${encodeURIComponent(text + "\n" + url)}`,
  twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
});

/**
 * Get the current app base URL
 */
export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://trustypcs.com";
}

/**
 * Generate a shareable URL for a post
 */
export function generatePostShareUrl(postId: string): string {
  return `${getAppBaseUrl()}/feed/${postId}`;
}

/**
 * Generate a shareable URL for a listing
 */
export function generateListingShareUrl(
  listingId: string,
  slug: string,
): string {
  return `${getAppBaseUrl()}/listing/${slug}-${listingId}`;
}
