import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { type Doctor, type InsertDoctor } from '@shared/schema';
import { useSocketMessage } from './use-socket';
import { WebSocketMessageTypes } from '@/lib/socket';

// Hook to fetch all doctors or doctors by department
export function useDoctors(departmentCode?: string) {
  const queryClient = useQueryClient();
  const socketMessage = useSocketMessage<{ doctors: Doctor[] }>(WebSocketMessageTypes.DOCTOR_UPDATE);

  // If we get a WebSocket message with updated doctors, update the cache
  if (socketMessage) {
    queryClient.setQueryData(['/api/doctors'], socketMessage.doctors);
    
    // If we're filtering by department, also update that cache
    if (departmentCode) {
      const filteredDoctors = socketMessage.doctors.filter(
        (doctor) => doctor.departmentCode === departmentCode
      );
      queryClient.setQueryData(['/api/doctors', departmentCode], filteredDoctors);
    }
  }

  // Fetch doctors, optionally filtered by department
  return useQuery({
    queryKey: departmentCode ? ['/api/doctors', departmentCode] : ['/api/doctors'],
    queryFn: async () => {
      const url = departmentCode 
        ? `/api/doctors?department=${encodeURIComponent(departmentCode)}` 
        : '/api/doctors';
      return apiRequest('GET', url);
    },
  });
}

// Hook to create a new doctor
export function useCreateDoctor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InsertDoctor) => {
      return apiRequest('POST', '/api/doctors', data);
    },
    onSuccess: () => {
      // Invalidate doctors queries
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
    },
  });
}

// Hook to update an existing doctor
export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Doctor> }) => {
      return apiRequest('PUT', `/api/doctors/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate doctors queries
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
    },
  });
}

// Hook to delete a doctor
export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/doctors/${id}`);
    },
    onSuccess: () => {
      // Invalidate doctors queries
      queryClient.invalidateQueries({ queryKey: ['/api/doctors'] });
    },
  });
}

// Hook to assign a doctor to a token
export function useAssignDoctor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tokenId, doctorId }: { tokenId: string; doctorId: string }) => {
      return apiRequest('PUT', `/api/tokens/${tokenId}/doctor`, { doctorId });
    },
    onSuccess: () => {
      // Invalidate queue data
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
    },
  });
}

// Hook to update token timestamps (check-in, start, end)
export function useUpdateTokenTimestamp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      tokenId, 
      field 
    }: { 
      tokenId: string; 
      field: 'checkInAt' | 'startAt' | 'endAt' 
    }) => {
      return apiRequest('PUT', `/api/tokens/${tokenId}/timestamp/${field}`);
    },
    onSuccess: () => {
      // Invalidate queue data
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
    },
  });
}