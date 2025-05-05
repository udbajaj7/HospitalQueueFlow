import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { User, getCurrentUser, login as apiLogin, logout as apiLogout, hasRole } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

// Query key for current user
const CURRENT_USER_QUERY_KEY = '/api/user';

// Hook for authentication state and operations
export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Query for current user
  const { 
    data, 
    isLoading, 
    error,
    refetch
  } = useQuery<{ user: User } | null>({
    queryKey: [CURRENT_USER_QUERY_KEY],
    retry: false,
    queryFn: getCurrentUser,
  });
  
  // Extract user from query data
  const user = data?.user || null;
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: (data) => {
      console.log("Login successful, user data:", data);
      
      // Update user data in cache
      queryClient.setQueryData([CURRENT_USER_QUERY_KEY], data);
      toast({
        title: "Login successful",
        description: `Welcome, ${data.user.name}!`,
      });
      
      // Redirect based on user role
      if (hasRole(data.user, ["admin"])) {
        console.log("Redirecting to admin dashboard");
        setLocation("/admin");
      } else if (hasRole(data.user, ["staff"])) {
        console.log("Redirecting to staff dashboard");
        setLocation("/staff");
      } else if (hasRole(data.user, ["kiosk"])) {
        console.log("Redirecting to kiosk mode");
        setLocation("/kiosk");
      } else {
        console.log("Redirecting to home page");
        setLocation("/");
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData([CURRENT_USER_QUERY_KEY], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      setLocation("/login");
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Function to check if user has specific role(s)
  const checkRole = (roles: string[]) => {
    return hasRole(user, roles);
  };
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginLoading: loginMutation.isPending,
    logoutLoading: logoutMutation.isPending,
    checkRole,
    refetch,
  };
}
