export const generateSlug = (title: string, id: string): string => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Combine slug with ID to ensure uniqueness and easy lookups
  return `${slug}-${id.slice(0, 8)}`;
};

export const extractIdFromSlug = (slug: string): string => {
  // Extract the last part after the last hyphen (8 character ID prefix)
  const parts = slug.split("-");
  const lastPart = parts[parts.length - 1];
  
  // If it looks like an ID fragment (8 chars), use it
  if (lastPart.length === 8) {
    return lastPart;
  }
  
  // Fallback: return the slug as-is (shouldn't happen with our format)
  return slug;
};
