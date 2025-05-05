import { useQuery } from "@tanstack/react-query";
import { Department } from "@shared/schema";

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ['/api/departments'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}