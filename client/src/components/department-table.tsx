import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Department } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DepartmentTableProps {
  onEdit: (department: Department) => void;
}

const DepartmentTable: React.FC<DepartmentTableProps> = ({ onEdit }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  
  // Fetch departments
  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });
  
  // Fetch department stats
  const { data: departmentStats } = useQuery({
    queryKey: ['/api/stats/departments'],
  });
  
  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('DELETE', `/api/departments/${code}`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      
      toast({
        title: 'Department deleted',
        description: 'The department has been deleted successfully.',
      });
      
      // Close delete dialog
      setDeletingDepartment(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete department: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });
  
  // Function to get stats for a department
  const getDepartmentStats = (code: string) => {
    if (!departmentStats) return { tokensToday: 0, avgWait: 0 };
    
    const stats = departmentStats.find(stat => stat.code === code);
    return {
      tokensToday: stats?.waitingCount || 0,
      avgWait: stats?.avgWait || 0,
    };
  };
  
  // Handle delete
  const handleDelete = (department: Department) => {
    setDeletingDepartment(department);
  };
  
  const confirmDelete = () => {
    if (deletingDepartment) {
      deleteDepartmentMutation.mutate(deletingDepartment.code);
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
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SLA Threshold</TableHead>
                <TableHead>Today's Tokens</TableHead>
                <TableHead>Avg. Wait</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-8 w-12 rounded" />
                      <Skeleton className="h-8 w-12 rounded" />
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
  if (!departments || departments.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-md">
        <p className="text-muted-foreground">No departments found. Create your first department.</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3">Code</TableHead>
                <TableHead className="px-6 py-3">Name</TableHead>
                <TableHead className="px-6 py-3">SLA Threshold</TableHead>
                <TableHead className="px-6 py-3">Today's Tokens</TableHead>
                <TableHead className="px-6 py-3">Avg. Wait</TableHead>
                <TableHead className="px-6 py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => {
                const stats = getDepartmentStats(department.code);
                
                return (
                  <TableRow 
                    key={department.code}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {department.code}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {department.name}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {department.slaThreshold} minutes
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {stats.tokensToday}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {stats.avgWait} min
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        variant="link"
                        className="text-teal-600 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 mr-3"
                        onClick={() => onEdit(department)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="link"
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        onClick={() => handleDelete(department)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDepartment} onOpenChange={() => setDeletingDepartment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the department "{deletingDepartment?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteDepartmentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DepartmentTable;
