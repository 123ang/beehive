/**
 * Get the API base URL for client-side requests
 * 
 * In production (when NEXT_PUBLIC_API_URL is not set), use relative paths
 * which will be handled by Nginx proxy to the API backend.
 * 
 * In development, use the environment variable or default to localhost:4000
 */
export function getApiUrl(): string {
  // If NEXT_PUBLIC_API_URL is explicitly set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // If not set, use empty string (relative path)
  // Nginx will proxy /api/* to the API backend
  return "";
}

/**
 * Get the full API endpoint URL
 */
export function getApiEndpoint(path: string): string {
  const baseUrl = getApiUrl();
  // Remove leading slash from path if present
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  if (baseUrl) {
    // Absolute URL - ensure path starts with /api
    const apiPath = cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;
    return `${baseUrl}${apiPath}`;
  }
  
  // Relative path - use as-is (Nginx will handle routing)
  return cleanPath;
}

