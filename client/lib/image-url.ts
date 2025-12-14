import { getApiUrl } from "./query-client";

export function getImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  const baseUrl = getApiUrl();
  return `${baseUrl}${path.startsWith("/") ? path.slice(1) : path}`;
}
