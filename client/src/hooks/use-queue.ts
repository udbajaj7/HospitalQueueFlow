import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketMessages } from './use-socket';
import { WebSocketMessageTypes } from '@/lib/socket';
import { QueueItem, DepartmentStat } from '@shared/schema';

// Query keys
const QUEUE_QUERY_KEY = '/api/queues';
const DEPARTMENT_STATS_KEY = '/api/stats/departments';
const DASHBOARD_STATS_KEY = '/api/stats/dashboard';
const CURRENT_TOKEN_KEY = '/api/current-token';

// Hook to get queue data for a specific department
export function useQueue(departmentCode?: string) {
  const queryClient = useQueryClient();
  
  // Setup the query key based on whether a department is specified
  const queryKey = departmentCode 
    ? [`${QUEUE_QUERY_KEY}?department=${departmentCode}`]
    : [QUEUE_QUERY_KEY];
  
  // Query for fetching queue data
  const query = useQuery<QueueItem[]>({
    queryKey,
    refetchInterval: 30000, // Refetch every 30 seconds as a fallback
  });
  
  // Subscribe to WebSocket events for real-time updates
  const socketMessage = useSocketMessages<any>([
    WebSocketMessageTypes.TOKEN_CREATED,
    WebSocketMessageTypes.TOKEN_CALLED,
    WebSocketMessageTypes.TOKEN_SERVED,
    WebSocketMessageTypes.TOKEN_NO_SHOW,
    WebSocketMessageTypes.QUEUE_UPDATE,
  ]);
  
  // When socket message is received, invalidate queue queries
  if (socketMessage) {
    queryClient.invalidateQueries({ queryKey: [QUEUE_QUERY_KEY] });
    if (departmentCode) {
      queryClient.invalidateQueries({ 
        queryKey: [`${QUEUE_QUERY_KEY}?department=${departmentCode}`] 
      });
    }
  }
  
  return query;
}

// Hook to get department stats for the current queue status
export function useDepartmentStats() {
  const queryClient = useQueryClient();
  
  // Query for fetching department stats
  const query = useQuery<DepartmentStat[]>({
    queryKey: [DEPARTMENT_STATS_KEY],
    refetchInterval: 30000, // Refetch every 30 seconds as a fallback
  });
  
  // Subscribe to WebSocket events for real-time updates
  const socketMessage = useSocketMessages<any>([
    WebSocketMessageTypes.TOKEN_CREATED,
    WebSocketMessageTypes.TOKEN_CALLED,
    WebSocketMessageTypes.TOKEN_SERVED,
    WebSocketMessageTypes.TOKEN_NO_SHOW,
    WebSocketMessageTypes.DEPARTMENT_UPDATE,
  ]);
  
  // When socket message is received, invalidate department stats
  if (socketMessage) {
    queryClient.invalidateQueries({ queryKey: [DEPARTMENT_STATS_KEY] });
  }
  
  return query;
}

// Hook to get dashboard stats
export function useDashboardStats() {
  const queryClient = useQueryClient();
  
  // Query for fetching dashboard stats
  const query = useQuery({
    queryKey: [DASHBOARD_STATS_KEY],
    refetchInterval: 60000, // Refetch every minute as a fallback
  });
  
  // Subscribe to WebSocket events for real-time updates
  const socketMessage = useSocketMessages<any>([
    WebSocketMessageTypes.TOKEN_CREATED,
    WebSocketMessageTypes.TOKEN_CALLED,
    WebSocketMessageTypes.TOKEN_SERVED,
    WebSocketMessageTypes.TOKEN_NO_SHOW,
  ]);
  
  // When socket message is received, invalidate dashboard stats
  if (socketMessage) {
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_STATS_KEY] });
  }
  
  return query;
}

// Hook to get current token (the one with CALLED status)
export function useCurrentToken(departmentCode?: string) {
  const queryClient = useQueryClient();
  
  // Setup the query key based on whether a department is specified
  const queryKey = departmentCode 
    ? [`${CURRENT_TOKEN_KEY}?department=${departmentCode}`]
    : [CURRENT_TOKEN_KEY];
  
  // Query for fetching current token data
  const query = useQuery<QueueItem | null>({
    queryKey,
    refetchInterval: 30000, // Refetch every 30 seconds as a fallback
  });
  
  // Subscribe to WebSocket events for real-time updates
  const socketMessage = useSocketMessages<any>([
    WebSocketMessageTypes.TOKEN_CALLED,
    WebSocketMessageTypes.TOKEN_SERVED,
    WebSocketMessageTypes.TOKEN_NO_SHOW,
    WebSocketMessageTypes.CURRENT_TOKEN_UPDATE,
  ]);
  
  // When socket message is received, invalidate current token query
  if (socketMessage) {
    queryClient.invalidateQueries({ queryKey: [CURRENT_TOKEN_KEY] });
    if (departmentCode) {
      queryClient.invalidateQueries({ 
        queryKey: [`${CURRENT_TOKEN_KEY}?department=${departmentCode}`] 
      });
    }
  }
  
  return query;
}
