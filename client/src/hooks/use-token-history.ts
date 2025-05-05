import { useQuery } from "@tanstack/react-query";
import { QueueItem } from "@shared/schema";
import { format } from "date-fns";

export function useTokenHistory(startDate?: Date, endDate?: Date, departmentCode?: string) {
  // Format dates to ISO strings if provided
  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
  const endDateStr = endDate ? format(endDate, "yyyy-MM-dd'T'23:59:59") : undefined;
  
  // Build the query key with arrays to properly handle cache invalidation
  let queryKey = ['/api/reports/token-history'];
  
  // Add each parameter as a separate cache key segment
  if (startDateStr) queryKey = [...queryKey, 'startDate', startDateStr];
  if (endDateStr) queryKey = [...queryKey, 'endDate', endDateStr];
  if (departmentCode) queryKey = [...queryKey, 'department', departmentCode];
  
  return useQuery<QueueItem[]>({
    queryKey: queryKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}