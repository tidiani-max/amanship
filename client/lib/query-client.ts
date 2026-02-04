import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Automatically determines the API URL based on the environment.
 */
export function getApiUrl(): string {
  // 1. Check if the environment variable is explicitly set
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return process.env.EXPO_PUBLIC_DOMAIN.replace(/\/$/, "");
  }

  // 2. If running in a Web Browser (localhost:8081), point to your Railway backend
  // This is the most common fix for the "Network Error" you are seeing.
  if (typeof window !== 'undefined') {
    return "https://amanship-production.up.railway.app";
  }

  // 3. Fallback for local mobile development
  return "http://localhost:5000";
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    // Try to get a clean error message from the JSON response
    let errorMessage = `Error ${res.status}`;
    try {
      const data = await res.json();
      errorMessage = data.error || data.message || errorMessage;
    } catch (e) {
      // If not JSON, try plain text
      const text = await res.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
  return res;
}

// ✅ POTENTIAL FIX: query-client.ts apiRequest function
// If you're getting "body stream already read" errors, your apiRequest might be reading the body twice
// Replace your apiRequest function with this safer version:

export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const fullUrl = url.startsWith("http") 
    ? url 
    : `${process.env.EXPO_PUBLIC_DOMAIN}${url}`;

  console.log(`🌐 API Request: ${method} ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, options);
    
    // ✅ FIX: Don't read the body here - let the caller handle it
    // This prevents "body stream already read" errors
    
    console.log(`📡 API Response: ${response.status} ${response.statusText}`);
    
    return response;
  } catch (error) {
    console.error(`❌ API Request failed: ${method} ${url}`, error);
    throw error;
  }
}

// Alternative safer helper function:
export async function apiRequestJSON(
  method: string,
  url: string,
  body?: any
): Promise<any> {
  const response = await apiRequest(method, url, body);
  
  // ✅ Handle non-OK responses before trying to parse JSON
  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If JSON parsing fails, use the status text
    }
    throw new Error(errorMessage);
  }
  
  // ✅ Only parse JSON if response is OK
  return response.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const cleanRoute = queryKey.join("/");
    const url = `${baseUrl}/${cleanRoute.startsWith('/') ? cleanRoute.slice(1) : cleanRoute}`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      credentials: "omit",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    const validatedRes = await handleResponse(res);
    return await validatedRes.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});