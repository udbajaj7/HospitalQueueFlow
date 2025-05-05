import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { StatusEnum, PriorityEnum, DepartmentCategoryEnum } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useDoctors } from '@/hooks/use-doctors';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QueueTableProps {
  departmentCode?: string;
  doctorId?: string;
  onCallNext?: () => void;
}

const QueueTable: React.FC<QueueTableProps> = ({ departmentCode, doctorId, onCallNext }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Setup query key based on department filter
  const queryKey = departmentCode
    ? [`/api/queues?department=${departmentCode}`]
    : ['/api/queues'];
  
  // Fetch queue data
  const { data: queueData, isLoading } = useQuery<any[]>({
    queryKey,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });
  
  // Fetch doctors for department if needed for OPD Consultation department
  const { data: doctors } = useDoctors(departmentCode);
  
  // Check if department is OPD Consultation
  const isOPDConsultation = queueData && queueData.length > 0 && queueData[0]?.departmentCategory === DepartmentCategoryEnum.OPD_CONSULTATION;
  
  // Token status mutation
  const updateTokenStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${id}/status`, { status });
      } catch (error) {
        console.error('Error updating token status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
      if (departmentCode) {
        queryClient.invalidateQueries({ queryKey: [`/api/queues?department=${departmentCode}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/current-token'] });
      if (departmentCode) {
        queryClient.invalidateQueries({ queryKey: [`/api/current-token?department=${departmentCode}`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update token status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });
  
  // Doctor assignment mutation
  const assignDoctorMutation = useMutation({
    mutationFn: async ({ tokenId, doctorId }: { tokenId: string; doctorId: string }) => {
      try {
        return await apiRequest('PUT', `/api/tokens/${tokenId}/assign-doctor`, { doctorId });
      } catch (error) {
        console.error('Error assigning doctor:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/queues'] });
      if (departmentCode) {
        queryClient.invalidateQueries({ queryKey: [`/api/queues?department=${departmentCode}`] });
      }
      toast({
        title: "Doctor assigned",
        description: "Doctor has been assigned to the token successfully",
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to assign doctor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Filter data if doctor ID is provided
  const filteredData = doctorId && doctorId !== 'all'
    ? queueData?.filter(token => token.doctorId === doctorId) || []
    : queueData || [];
    
  // Handlers for token actions
  const handleCallToken = (id: string) => {
    updateTokenStatusMutation.mutate({ id, status: StatusEnum.CALLED });
  };
  
  const handleEndToken = (id: string) => {
    updateTokenStatusMutation.mutate({ id, status: StatusEnum.SERVED });
  };
  
  const handleNoShowToken = (id: string) => {
    updateTokenStatusMutation.mutate({ id, status: StatusEnum.NO_SHOW });
  };
  
  const handleAssignDoctor = (tokenId: string, doctorId: string) => {
    // If "unassign" is selected, we send an empty string to the server
    // which will unassign the doctor (set doctorId to NULL in the database)
    const actualDoctorId = doctorId === "unassign" ? "" : doctorId === "none" ? "" : doctorId;
    assignDoctorMutation.mutate({ tokenId, doctorId: actualDoctorId });
  };
  
  // Pagination logic
  const totalItems = filteredData.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const currentPageData = filteredData.slice(startIdx, endIdx) || [];
  
  // Format status for display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case StatusEnum.ISSUED:
        return <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Waiting</Badge>;
      case StatusEnum.CALLED:
        return <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Called</Badge>;
      case StatusEnum.SERVED:
        return <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Served</Badge>;
      case StatusEnum.NO_SHOW:
        return <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">No-show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Format priority for display
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case PriorityEnum.NORMAL:
        return <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">Normal</Badge>;
      case PriorityEnum.EMERGENCY:
        return <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Emergency</Badge>;
      case PriorityEnum.FOLLOW_UP:
        return <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Follow-up</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-8 w-16 rounded" />
                      <Skeleton className="h-8 w-16 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-md">
        <p className="text-muted-foreground">No tokens in queue</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead>Priority</TableHead>
              {isOPDConsultation && <TableHead>Doctor</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPageData.map((token) => (
              <TableRow 
                key={token.id} 
                className="hover:bg-gray-50 dark:hover:bg-slate-700"
                data-status={token.status}
              >
                <TableCell className="font-medium text-gray-900 dark:text-white">
                  {token.tokenNumber}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900 dark:text-white">{token.patientName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{token.patientMobile}</div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-white">{token.department}</span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(token.status)}
                </TableCell>
                <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                  {token.waitTime} min
                </TableCell>
                <TableCell>
                  {getPriorityBadge(token.priority)}
                </TableCell>
                {isOPDConsultation && (
                  <TableCell>
                    {doctors && doctors.length > 0 ? (
                      <Select
                        value={token.doctorId || ''}
                        onValueChange={(value) => handleAssignDoctor(token.id, value)}
                        disabled={assignDoctorMutation.isPending || token.status === StatusEnum.SERVED || token.status === StatusEnum.NO_SHOW}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Assign doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {token.doctorId ? (
                            <SelectItem value="unassign">Unassign</SelectItem>
                          ) : (
                            <SelectItem value="none" disabled>Select a doctor</SelectItem>
                          )}
                          {doctors.map((doctor: { id: string; name: string }) => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              {doctor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-gray-500">No doctors available</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {token.status === StatusEnum.ISSUED && (
                    <Button
                      variant="link"
                      className="text-teal-600 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 mr-3"
                      onClick={() => handleCallToken(token.id)}
                      disabled={updateTokenStatusMutation.isPending}
                    >
                      Call
                    </Button>
                  )}
                  {token.status === StatusEnum.CALLED && (
                    <Button
                      variant="link"
                      className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-3"
                      onClick={() => handleEndToken(token.id)}
                      disabled={updateTokenStatusMutation.isPending}
                    >
                      End
                    </Button>
                  )}
                  {(token.status === StatusEnum.ISSUED || token.status === StatusEnum.CALLED) && (
                    <Button
                      variant="link"
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      onClick={() => handleNoShowToken(token.id)}
                      disabled={updateTokenStatusMutation.isPending}
                    >
                      No-show
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{startIdx + 1}</span> to{' '}
                <span className="font-medium">{endIdx}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(i + 1);
                      }}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueTable;
