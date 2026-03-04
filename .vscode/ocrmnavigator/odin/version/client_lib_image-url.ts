import { getApiUrl } from "./query-client";

export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) return "https://placehold.co/400x400/e0e0e0/666666?text=No+Image";

  // Fix Google Drive URLs — uc?export=view is unreliable, use thumbnail instead
  if (imagePath.includes("drive.google.com")) {
    const idMatch = imagePath.match(/[-\w]{25,}/);
    if (idMatch) {
      return `https://drive.google.com/thumbnail?id=${idMatch[0]}&sz=w400`;
    }
  }

  // If it's already a full URL, return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // If it's a local file path (blob or file), return as-is
  if (imagePath.startsWith("blob:") || imagePath.startsWith("file://")) {
    return imagePath;
  }

  // Handle relative paths - ensure they start with /
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;

  // Construct full URL with your backend domain
  const baseUrl = process.env.EXPO_PUBLIC_DOMAIN || "http://localhost:3000";
  return `${baseUrl}${cleanPath}`;
}