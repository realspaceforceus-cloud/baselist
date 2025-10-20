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
  const idPrefix = uuidPart.split("-")[0]; // Get first part of UUID (8 chars before first -)

  // Combine slug with ID prefix to ensure uniqueness and easy lookups
  return `${slug}-${idPrefix}`;
};

export const extractIdFromSlug = (slug: string): string => {
  // Extract the last part after the last hyphen (8 character ID prefix from UUID)
  const parts = slug.split("-");
  const lastPart = parts[parts.length - 1];

  // If it looks like an ID fragment (8 alphanumeric chars), use it
  if (lastPart.length === 8 && /^[a-f0-9]{8}$/.test(lastPart)) {
    return lastPart;
  }

  // Fallback: return the slug as-is (shouldn't happen with our format)
  return slug;
};
