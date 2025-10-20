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

  // Combine slug with full UUID for SEO and guaranteed uniqueness
  return `${slug}-${uuidPart}`;
};

export const extractIdFromSlug = (slug: string): string => {
  // UUID format: 8-4-4-4-12 characters (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  // Look for the UUID pattern at the end of the slug
  const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
  const match = slug.match(uuidPattern);

  if (match) {
    return match[1];
  }

  // Fallback: return the slug as-is
  return slug;
};
