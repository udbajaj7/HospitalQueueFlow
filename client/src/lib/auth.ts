import { apiRequest } from "./queryClient";
import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  role: z.string(),
  departmentCode: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;

// Login credentials schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Login function
export async function login(credentials: LoginCredentials): Promise<{ user: User }> {
  return apiRequest('POST', "/api/login", credentials);
}

// Logout function
export async function logout(): Promise<void> {
  try {
    // Use fetch directly instead of apiRequest to avoid response body stream issues
    const response = await fetch("/api/logout", {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`);
    }
    
    return;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

// Get current user function
export async function getCurrentUser(): Promise<{ user: User } | null> {
  try {
    return await apiRequest('GET', "/api/user");
  } catch (error) {
    return null;
  }
}

// Role constants
export const Roles = {
  ADMIN: "admin",
  STAFF: "staff",
  KIOSK: "kiosk",
};

// Check if user has specific role
export function hasRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
