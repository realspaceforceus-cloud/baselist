export const generateSlug = (title: string, id: string): string => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Extract UUID part from listing ID (remove "listing-" prefix if present)
  const uuidPart = id.startsWith("listing-") ? id.slice(8) : id;

  // Use first 8 characters of UUID for clean, readable URL
  const shortId = uuidPart.split("-")[0];

  // Combine slug with short ID for clean SEO URLs
  return `${slug}-${shortId}`;
};

export const extractIdFromSlug = (slug: string): string => {
  // Extract the last part after the last hyphen (8-char UUID prefix)
  const parts = slug.split("-");
  const lastPart = parts[parts.length - 1];

  // Return it as-is - we'll search by ID in the backend
  return lastPart;
};
