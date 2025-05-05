import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowRightToLine, Check, Clock, UserCircle, Phone, Tag, UserCheck, Info } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';
import { StatusEnum } from '@shared/schema';

interface CurrentPatientProps {
  token: {
    id: string;
    tokenNumber: string;
    departmentCode: string;
    patientName: string | null;
    patientMobile: string | null;
    priority: string;
    status: string;
    waitTime: number;
    issuedAt: string;
    department?: string | null;
    isWalkIn?: boolean;
  } | null;
  isLoading?: boolean;
  doctor?: { id: string; name: string } | null;
}

export function CurrentPatient({ token, isLoading = false, doctor }: CurrentPatientProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${id}/status`, { status });
      } catch (error) {
        console.error('Error updating token status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
      
      toast({
        title: 'Status Updated',
        description: 'Patient status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update patient status.',
        variant: 'destructive',
      });
    },
  });
  
  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${id}/timestamp`, { field: 'checkInAt' });
      } catch (error) {
        console.error('Error checking in patient:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Check-in Recorded',
        description: 'Patient has been checked in successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check in patient.',
        variant: 'destructive',
      });
    },
  });
  
  // Start service mutation
  const startServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${id}/timestamp`, { field: 'startAt' });
      } catch (error) {
        console.error('Error starting service:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Service Started',
        description: 'Patient service has been started.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start service.',
        variant: 'destructive',
      });
    },
  });
  
  // End service mutation
  const endServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${id}/timestamp`, { field: 'endAt' });
      } catch (error) {
        console.error('Error ending service:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Service Ended',
        description: 'Patient service has been completed.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to end service.',
        variant: 'destructive',
      });
    },
  });
  
  // Mark as served mutation
  const markAsServedMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${id}/status`, { status: StatusEnum.SERVED });
      } catch (error) {
        console.error('Error marking patient as served:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
      
      toast({
        title: 'Patient Served',
        description: 'Patient has been marked as served.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark patient as served.',
        variant: 'destructive',
      });
    },
  });
  
  // Mark as no-show mutation
  const markAsNoShowMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${id}/status`, { status: StatusEnum.NO_SHOW });
      } catch (error) {
        console.error('Error marking patient as no-show:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
      
      toast({
        title: 'No-Show Recorded',
        description: 'Patient has been marked as no-show.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark patient as no-show.',
        variant: 'destructive',
      });
    },
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center">
            <Skeleton className="h-5 w-5 mr-2 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!token) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <UserCircle className="h-5 w-5 mr-2 opacity-50" />
            <span className="text-sm">No patient currently being served</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const waitTime = formatDistance(
    new Date(token.issuedAt),
    new Date(),
    { addSuffix: false }
  );
  
  return (
    <Card className="border border-blue-200 dark:border-blue-800">
      <CardHeader className="bg-blue-50 dark:bg-blue-900/20 py-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center text-base">
              <span>{token.tokenNumber}</span>
              {token.isWalkIn !== undefined && (
                <Badge className={token.isWalkIn ? "ml-2 bg-amber-500 text-xs" : "ml-2 bg-indigo-500 text-xs"}>
                  {token.isWalkIn ? "Walk-in" : "Appt"}
                </Badge>
              )}
              <Badge className="ml-2" variant={token.priority === 'HIGH' ? 'destructive' : 'outline'}>
                {token.priority === 'HIGH' ? 'Priority' : 'Regular'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              {token.departmentCode}
              {doctor && <span className="ml-1">• Dr. {doctor.name}</span>}
            </CardDescription>
          </div>
          <div className="flex items-center text-xs space-x-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span>{waitTime}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UserCircle className="h-4 w-4 mr-1 text-blue-500" />
            <span className="font-medium text-sm">{token.patientName}</span>
          </div>
          
          {token.patientMobile && (
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-sm">{token.patientMobile}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1 justify-between border-t pt-2 pb-2">
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => checkInMutation.mutate(token.id)}
            disabled={checkInMutation.isPending}
          >
            <ArrowRightToLine className="h-3 w-3 mr-1" />
            Check In
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => startServiceMutation.mutate(token.id)}
            disabled={startServiceMutation.isPending}
          >
            <Info className="h-3 w-3 mr-1" />
            Start
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => endServiceMutation.mutate(token.id)}
            disabled={endServiceMutation.isPending}
          >
            <UserCheck className="h-3 w-3 mr-1" />
            End
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs"
            onClick={() => markAsNoShowMutation.mutate(token.id)}
            disabled={markAsNoShowMutation.isPending}
          >
            <Tag className="h-3 w-3 mr-1" />
            No Show
          </Button>
          
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
            onClick={() => markAsServedMutation.mutate(token.id)}
            disabled={markAsServedMutation.isPending}
          >
            <Check className="h-3 w-3 mr-1" />
            Complete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}