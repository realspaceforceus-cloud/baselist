const CLOUDINARY_CLOUD_NAME = "dc4qnchym";
const CLOUDINARY_API_KEY = "765912238265989";

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  try {
    // Get signature from backend
    const sigResponse = await fetch("/api/cloudinary-signature", {
      method: "POST",
      credentials: "include",
    });

    if (!sigResponse.ok) {
      throw new Error("Failed to get upload signature");
    }

    const { timestamp, signature } = await sigResponse.json();

    // Prepare form data for signed upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", CLOUDINARY_API_KEY);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);

    // Upload to Cloudinary using signed upload
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || "Failed to upload image to Cloudinary",
      );
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to upload image",
    );
  }
};
