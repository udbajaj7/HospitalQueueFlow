import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import DepartmentTable from '@/components/department-table';
import DepartmentForm from '@/components/department-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';

const AdminDepartments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (department: any) => {
      return await apiRequest('POST', '/api/departments', department);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      setIsDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Department created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create department: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ code, data }: { code: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/departments/${code}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/departments'] });
      setIsDialogOpen(false);
      setEditingDepartment(null);
      toast({
        title: 'Success',
        description: 'Department updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update department: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const handleSubmit = (data: any) => {
    if (editingDepartment) {
      updateDepartmentMutation.mutate({ code: editingDepartment.code, data });
    } else {
      createDepartmentMutation.mutate(data);
    }
  };

  // Open dialog for creating a new department
  const handleAddNew = () => {
    setEditingDepartment(null);
    setIsDialogOpen(true);
  };

  // Open dialog for editing a department
  const handleEdit = (department: any) => {
    setEditingDepartment(department);
    setIsDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Department Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add, edit or remove departments</p>
        </div>
        <Button 
          onClick={handleAddNew}
          className="mt-4 sm:mt-0 bg-teal-600 hover:bg-teal-700"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Department
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Manage hospital departments and their SLA thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <DepartmentTable onEdit={handleEdit} />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Create New Department'}
            </DialogTitle>
          </DialogHeader>
          <DepartmentForm 
            department={editingDepartment} 
            onSubmit={handleSubmit}
            isLoading={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDepartments;
