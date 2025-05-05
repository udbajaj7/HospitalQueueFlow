import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrBody?: string | any,
  body?: any
): Promise<any> {
  let method = 'GET';
  let url: string;
  let requestBody: any = null;
  
  // Count arguments manually instead of using arguments.length
  const argCount = body !== undefined ? 3 : (urlOrBody !== undefined ? 2 : 1);
  
  // Handle different argument patterns
  if (argCount === 1) {
    // apiRequest('/api/endpoint')
    url = methodOrUrl;
  } else if (argCount === 2) {
    if (methodOrUrl === 'GET' || methodOrUrl === 'DELETE') {
      // apiRequest('GET', '/api/endpoint') or apiRequest('DELETE', '/api/endpoint')
      method = methodOrUrl;
      url = urlOrBody as string;
    } else {
      // apiRequest('/api/endpoint', { data })
      url = methodOrUrl;
      requestBody = urlOrBody;
    }
  } else {
    // apiRequest('POST', '/api/endpoint', { data })
    method = methodOrUrl;
    url = urlOrBody as string;
    requestBody = body;
  }
  
  // Prepare fetch options
  const fetchOptions: RequestInit = { 
    method,
    credentials: "include",
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Add body if needed
  if (requestBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(requestBody);
  }
  
  console.log('API Request:', method, url, fetchOptions);
  
  // Make the request
  console.log('Sending request:', method, url);
  
  const res = await fetch(url, fetchOptions);
  console.log('Response status:', res.status);
  
  await throwIfResNotOk(res);
  
  // Handle successful responses
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    console.log('No content to parse, returning empty object');
    return {}; // Return empty object instead of null for consistency
  }
  
  // Check if content type is JSON before attempting to parse
  const contentType = res.headers.get('content-type');
  console.log('Response content type:', contentType);
  
  if (contentType && contentType.includes('application/json')) {
    try {
      const jsonData = await res.json();
      console.log('Parsed JSON response:', jsonData);
      return jsonData;
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      // Return empty object instead of null to prevent .json() being called on it later
      return {};
    }
  } else {
    try {
      // Try parsing as JSON anyway (some APIs don't set correct content type)
      const jsonData = await res.json();
      console.log('Parsed JSON response despite content type:', jsonData);
      return jsonData;
    } catch (e) {
      // If that fails, handle as text
      const textData = await res.text();
      console.log('Text response:', textData);
      // For empty responses, return empty object instead of empty string
      return textData || {};
    }
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Handle no content
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return {};
    }
    
    // Try to parse as JSON
    try {
      return await res.json();
    } catch (e) {
      // Return empty object if JSON parsing fails
      console.error('Failed to parse response in queryFn:', e);
      return {};
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
