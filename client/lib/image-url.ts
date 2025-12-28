import { getApiUrl } from "./query-client";

export function getImageUrl(path: string | null | undefined): string | undefined {
  if (!path || path.trim() === "") return undefined;
  
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  const baseUrl = getApiUrl();
  
  // Remove trailing slash from base if exists
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  
  // Ensure path starts with exactly one slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  const finalUrl = `${cleanBase}${cleanPath}`;
  
  // Log this once to your terminal to see the actual URL being generated
  // console.log("Generated Image URL:", finalUrl); 
  
  return finalUrl;
}