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

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  // Ensure the route starts with a slash
  const cleanRoute = route.startsWith("/") ? route : `/${route}`;
  const url = `${baseUrl}${cleanRoute}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Accept": "application/json",
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    // Note: Use "omit" or "same-origin" if you aren't using cookie-based sessions
    // to avoid some strict CORS preflight issues.
    credentials: "omit", 
  });

  return await handleResponse(res);
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