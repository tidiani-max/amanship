import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Automatically determines the API URL based on the environment.
 */
export function getApiUrl(): string {
  // 1. Check if the environment variable is explicitly set
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return process.env.EXPO_PUBLIC_DOMAIN.replace(/\/$/, "");
  }

  // 2. If running in a Web Browser (localhost:8081), point to your Railway backend
  if (typeof window !== 'undefined') {
    return "https://amanship-production.up.railway.app";
  }

  // 3. Fallback for local mobile development
  return "http://localhost:5000";
}

/**
 * Get JWT token from AsyncStorage
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem("@ZendO_token");
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Handle response errors
 */
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

/**
 * ✅ IMPROVED: Main API request function with JWT support
 */
export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  // Get JWT token
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // ✅ Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const fullUrl = url.startsWith("http") 
    ? url 
    : `${getApiUrl()}${url}`;

  console.log(`🌐 API Request: ${method} ${fullUrl}`);
  if (token) {
    console.log(`🔐 Auth: Bearer ${token.substring(0, 20)}...`);
  }

  try {
    const response = await fetch(fullUrl, options);
    
    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    // ✅ Handle 401 Unauthorized - token expired
    if (response.status === 401) {
      console.warn("⚠️ Unauthorized - clearing token");
      await AsyncStorage.removeItem("@ZendO_token");
      await AsyncStorage.removeItem("@ZendO_auth");
      // You might want to trigger a logout/redirect here
    }

    return response;
  } catch (error) {
    console.error(`❌ API Request failed: ${method} ${url}`, error);
    throw error;
  }
}

/**
 * ✅ IMPROVED: JSON helper with better error handling
 */
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
      errorMessage = errorData.error || errorData.details || errorMessage;
    } catch {
      // If JSON parsing fails, use the status text
    }
    throw new Error(errorMessage);
  }

  // ✅ Handle empty responses (204 No Content, etc.)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  // ✅ Only parse JSON if response is OK and has content
  try {
    return await response.json();
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    return null;
  }
}

/**
 * ✅ IMPROVED: Protected API request (requires auth)
 */
export async function apiRequestProtected(
  method: string,
  url: string,
  body?: any
): Promise<any> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  return apiRequestJSON(method, url, body);
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * ✅ IMPROVED: Query function with JWT support
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const cleanRoute = queryKey.join("/");
    const url = `${baseUrl}/${cleanRoute.startsWith('/') ? cleanRoute.slice(1) : cleanRoute}`;

    // Get JWT token
    const token = await getAuthToken();

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: "omit",
    });

    // Handle 401 Unauthorized
    if (res.status === 401) {
      console.warn("⚠️ Query unauthorized - clearing token");
      await AsyncStorage.removeItem("@ZendO_token");
      await AsyncStorage.removeItem("@ZendO_auth");
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    const validatedRes = await handleResponse(res);
    return await validatedRes.json();
  };

/**
 * Query Client Configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * ✅ NEW: Utility to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

/**
 * ✅ NEW: Utility to clear authentication
 */
export async function clearAuth(): Promise<void> {
  await AsyncStorage.removeItem("@ZendO_token");
  await AsyncStorage.removeItem("@ZendO_auth");
  // Invalidate all queries
  queryClient.clear();
}

/**
 * ✅ NEW: Utility to refresh token (if you implement refresh tokens later)
 */
export async function refreshAuthToken(): Promise<boolean> {
  try {
    const response = await apiRequest("POST", "/api/auth/refresh");
    const data = await response.json();
    
    if (data.token) {
      await AsyncStorage.setItem("@ZendO_token", data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return false;
  }
}