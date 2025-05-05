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
  try {
    const response = await fetch("/api/login", {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Login failed with status ${response.status}: ${errorText}`);
      throw new Error(errorText || 'Invalid credentials');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
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
    const response = await fetch("/api/user", {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('User not authenticated');
        return null;
      }
      const errorText = await response.text();
      console.error(`Get user failed with status ${response.status}: ${errorText}`);
      throw new Error(errorText || 'Failed to get current user');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Get current user error:", error);
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
