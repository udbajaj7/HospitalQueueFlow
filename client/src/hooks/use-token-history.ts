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
  if (departmentCode && departmentCode !== 'all') queryKey = [...queryKey, 'department', departmentCode];
  
  // Build query URL with parameters
  let url = '/api/reports/token-history';
  const params = new URLSearchParams();
  if (startDateStr) params.append('startDate', startDateStr);
  if (endDateStr) params.append('endDate', endDateStr);
  if (departmentCode && departmentCode !== 'all') params.append('department', departmentCode);
  
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return useQuery<QueueItem[]>({
    queryKey: queryKey,
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch token history');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}