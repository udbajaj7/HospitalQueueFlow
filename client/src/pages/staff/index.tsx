import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQueue } from '@/hooks/use-queue';
import { useDoctors } from '@/hooks/use-doctors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StatsCards from '@/components/stats-cards';
import QueueTable from '@/components/queue-table';
import { StatusEnum } from '@shared/schema';

// Define API endpoint constants
const CURRENT_TOKEN_KEY = '/api/current-token';

const StaffDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // For staff users, we want to enforce using their assigned department
  const [selectedDepartment, setSelectedDepartment] = useState<string>(user?.departmentCode || '');

  // Fetch departments
  const { data: departments = [], isLoading: loadingDepartments } = useQuery<Array<{code: string, name: string}>>({
    queryKey: ['/api/departments'],
  });

  // Fetch queues
  const { data: queues = [], isLoading: loadingQueues } = useQueue(
    selectedDepartment !== 'all' ? selectedDepartment : undefined
  );
  
  // Reference to queue items with status CALLED or ISSUED
  const queueRef = useRef<HTMLDivElement>(null);
  
  // Fetch doctors for the selected department
  const { data: doctors = [] } = useDoctors(
    selectedDepartment !== 'all' ? selectedDepartment : undefined
  );
  
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');

  // Call next token mutation
  const callNextTokenMutation = useMutation({
    mutationFn: async () => {
      try {
        // Get queue data directly from the API to ensure we have the latest data
        const allTokens = await apiRequest('GET', selectedDepartment !== 'all' 
          ? `/api/queues?department=${selectedDepartment}` 
          : '/api/queues'
        );
        
        // Find the first waiting token for the selected department
        const waitingTokens = allTokens.filter(
          (token: any) => token.status === StatusEnum.ISSUED && 
                          (selectedDepartment === 'all' || token.departmentCode === selectedDepartment)
        );
        
        if (!waitingTokens || waitingTokens.length === 0) {
          throw new Error('No waiting tokens available');
        }
        
        // Call the first waiting token
        const tokenToCall = waitingTokens[0];
        console.log('Calling token:', tokenToCall);
        
        const result = await apiRequest('PUT', `/api/tokens/${tokenToCall.id}/status`, {
          status: StatusEnum.CALLED
        });
        
        return result;
      } catch (error) {
        console.error('Error calling next token:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Call next success:', data);
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
      if (selectedDepartment !== 'all') {
        queryClient.invalidateQueries({ queryKey: [`/api/queues?department=${selectedDepartment}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/current-token?department=${selectedDepartment}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
      
      // We are also invalidating the current token query specifically
      const currentTokenKey = selectedDepartment !== 'all' 
        ? [`${CURRENT_TOKEN_KEY}?department=${selectedDepartment}`]
        : [CURRENT_TOKEN_KEY];
      queryClient.invalidateQueries({ queryKey: currentTokenKey });
      
      toast({
        title: 'Success',
        description: 'Next patient called successfully',
      });
    },
    onError: (error) => {
      console.error('Call next error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to call next patient',
        variant: 'destructive',
      });
    },
  });

  // Handle department change
  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
  };

  // Handle call next button
  const handleCallNext = () => {
    callNextTokenMutation.mutate();
  };
  
  // Auto-scroll to active tokens when queue changes or component mounts
  useEffect(() => {
    const scrollToActiveTokens = () => {
      if (queueRef.current) {
        // Find all queue items with status CALLED or ISSUED
        const calledTokens = document.querySelectorAll('[data-status="CALLED"]');
        const waitingTokens = document.querySelectorAll('[data-status="ISSUED"]');
        
        if (calledTokens.length > 0) {
          // Scroll to the first called token with smooth animation
          calledTokens[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (waitingTokens.length > 0) {
          // If no called tokens, scroll to the first waiting token
          waitingTokens[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    // Short delay to ensure DOM is updated
    const timer = setTimeout(scrollToActiveTokens, 300);
    return () => clearTimeout(timer);
  }, [queues, selectedDoctor, selectedDepartment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Queue</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage patient queue and token status</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Department selection has been removed - staff can only see their assigned department */}
          <Button
            type="button"
            className="bg-teal-600 hover:bg-teal-700"
            onClick={handleCallNext}
            disabled={callNextTokenMutation.isPending}
          >
            {callNextTokenMutation.isPending ? 'Calling...' : 'Call Next Patient'}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <StatsCards />
      
      {/* Queue Table */}
      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md" ref={queueRef}>
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Current Queue</h3>
            {selectedDepartment !== 'all' && doctors.length > 0 && (
              <div className="flex items-center">
                <Select
                  value={selectedDoctor}
                  onValueChange={(value) => setSelectedDoctor(value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Doctors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map((doctor: { id: string; name: string }) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <QueueTable 
            departmentCode={selectedDepartment} 
            doctorId={selectedDoctor !== 'all' ? selectedDoctor : undefined} 
            onCallNext={handleCallNext} 
          />
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
